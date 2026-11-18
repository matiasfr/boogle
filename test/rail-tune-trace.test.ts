// Admission/results stay explicit after the classic transport oracle is retired.
import test from 'node:test';
import assert from 'node:assert/strict';
import { RAIL_TUNABLES, serializeTune } from '../src/sim/tune.ts';
import { serverWorld } from './helpers/server-world.ts';

test('server bounds, repeats, commit revision and malformed refusal', () => {
  const { key, min, max, def } = RAIL_TUNABLES[0];
  const host = serverWorld();
  const set = (v: unknown) => host.run('alice', { op: 'tune.set', key, v });
  const commit = (v: unknown, expectedRevision: unknown, requestId: unknown = 'commit') =>
    host.run('alice', { op: 'tune.commit', key, v, expectedRevision, requestId });
  for (const v of [min, min]) assert.deepEqual(set(v), { status: 'accepted', result: { key, v }, durable: false });
  assert.equal(host.railTune.tune.revision, 2, 'equal accepted values advance the revision');
  assert.deepEqual(commit(max, 2), {
    status: 'accepted',
    durable: true,
    result: { requestId: 'commit', status: 'applied', key, v: max, revision: 3 },
  });
  const before = serializeTune(host.railTune.tune);
  for (const v of [min - 1, max + 1, min + 0.5, String(def), null]) assert.equal(set(v).status, 'rejected');
  for (const revision of [2, '3', null]) assert.equal(commit(def, revision).status, 'rejected');
  for (const request of ['', 'x'.repeat(81), null]) assert.equal(commit(def, 3, request).status, 'rejected');
  assert.deepEqual(serializeTune(host.railTune.tune), before, 'refusals cannot mutate tuning');
  assert.equal(commit(def, 3, 'x'.repeat(80)).status, 'accepted');
  assert.equal(commit(min, 4).status, 'accepted');
  assert.equal(commit(max, 4).status, 'rejected', 'the second same-revision writer loses');
  assert.equal(host.railTune.get(key), min);
});

test('every tunable is admitted at its bounds and replicates to a joining peer', () => {
  const host = serverWorld();
  for (const { key, min, max } of RAIL_TUNABLES) {
    assert.equal(host.run('alice', { op: 'tune.set', key, v: min }).status, 'accepted', key);
    assert.equal(host.run('alice', { op: 'tune.set', key, v: max }).status, 'accepted', key);
  }
  const read = host.join('peer');
  host.flush();
  assert.deepEqual(serializeTune(read.tune.tune), serializeTune(host.railTune.tune));
});

test('server tuning requires explicit controller and a proto room', () => {
  const host = serverWorld();
  for (const [protoRoom, controlled] of [
    [false, true],
    [true, false],
  ]) {
    const result = host.ops.run(
      'alice',
      { op: 'tune.set', key: 'railFeedMs', v: 80 },
      {
        from: 'alice',
        tick: 0,
        protoRoom: protoRoom!,
        tuneController: () => controlled!,
        actor: { reach: () => true, height: () => true, cadence: () => true },
      },
    );
    assert.equal(result.status, 'rejected');
    assert.equal(host.railTune.get('railFeedMs'), 70);
  }
});

test('raw JSON negative zero becomes canonical zero before replication', () => {
  for (const { key, min } of RAIL_TUNABLES) {
    if (min !== 0) continue;
    const host = serverWorld();
    const mirror = host.join('peer');
    const edit = JSON.parse(`{"op":"tune.set","key":"${key}","v":-0}`) as Record<string, unknown>;
    assert.ok(Object.is(edit.v, -0));
    assert.equal(host.run('alice', edit).status, 'accepted');
    assert.equal(Object.is(host.railTune.get(key), -0), false);
    host.flush();
    assert.equal(mirror.tune.get(key), 0);
    assert.deepEqual(serializeTune(mirror.tune.tune), serializeTune(host.railTune.tune));
  }
});

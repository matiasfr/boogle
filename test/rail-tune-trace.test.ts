// Authority moved; rule results did not. Compare every rail key with the frozen pre-cutover registration used by
// classic-trace, without replacing its recorded inputs or SHA pins. The receipt's durable bit is new authority.
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  RAIL_TUNABLES,
  HAUL_TUNABLES,
  createTune,
  serializeTune,
  loadTune,
  hashTune,
  setTune,
  type TuneJson,
} from '../src/sim/tune.ts';
import { createSync } from '../src/world/sync.ts';
import { createServerOps } from '../src/world/server-ops.ts';
import { createReplicator } from '../src/world/replicate-server.ts';
import { installRailTune } from '../src/world/rules/tune.ts';
import { CLASSIC_SCHEMAS, createClassicMirror, projectRailTune } from '../src/world/classic-replicate.ts';
import { createMirror } from '../src/world/replicate-client.ts';
import { recordTrace, type TraceInput, type TraceStep } from './helpers/classic-trace.ts';

function server() {
  const sync = createSync();
  const ops = createServerOps();
  const replication = createReplicator();
  const api = installRailTune(sync, ops, replication);
  projectRailTune(replication, api);
  return {
    api,
    replication,
    run(input: TraceInput, tick = 0) {
      return ops.run(input.from, input.edit, {
        from: input.from,
        tick,
        env: {},
        actor: { reach: () => true, height: () => true, cadence: () => true },
        protoRoom: true,
        tuneController: () => input.controlled !== false,
      });
    },
  };
}

function railState(step: TraceStep): TuneJson {
  const state = step.state.tune as TuneJson;
  return {
    revision: state.revision,
    values: Object.fromEntries(RAIL_TUNABLES.map(({ key }) => [key, state.values[key]])) as TuneJson['values'],
  };
}

for (const { key, min, max, def } of RAIL_TUNABLES) {
  test(`${key}: server commands equal the classic oracle for bounds, repeats, commits and refusals`, () => {
    const set = (v: unknown, controlled = true): TraceInput => ({
      from: 'alice',
      controlled,
      edit: { op: 'tune.set', i: 0, j: 0, key, v },
    });
    const commit = (v: unknown, expectedRevision: unknown, requestId: unknown = 'commit'): TraceInput => ({
      from: 'alice',
      edit: { op: 'tune.commit', i: 0, j: 0, key, v, expectedRevision, requestId },
    });
    const inputs = [
      set(min),
      set(min), // Equal values still advance revision, as before.
      commit(max, 2),
      set(min - 1),
      set(max + 1),
      set(min + 0.5),
      set(String(def)),
      set(def, false),
      { ...commit(def, 3), controlled: false },
      commit(def, 2),
      commit(def, '3'),
      commit(def, 3, ''),
      commit(def, 3, 'x'.repeat(81)),
      commit(def, 3, null),
      commit(def, 3, 'x'.repeat(80)),
      commit(def, 4),
      commit(def, 4),
    ];
    const trace = recordTrace(0x51a7e, inputs);
    const boundaries = trace.steps.flatMap((step, i) => (step.phase === 'admit' ? [i] : []));
    assert.equal(boundaries.length, inputs.length);
    const host = server();
    inputs.forEach((input, i) => {
      const start = boundaries[i]!;
      const end = boundaries[i + 1] ?? trace.steps.length;
      const span = trace.steps.slice(start, end);
      const admitted = span[0]!;
      const applied = span.find((step) => step.phase === 'apply');
      const actual = host.run(input, admitted.tick);
      assert.equal(actual.status === 'accepted', admitted.accepted, `admission ${i}`);
      assert.deepEqual(actual.result, applied?.result ?? null, `result ${i}`);
      assert.equal(actual.durable, actual.status === 'accepted' && input.edit.op === 'tune.commit', `durable ${i}`);
      assert.deepEqual(serializeTune(host.api.tune), railState(span.at(-1)!), `values and revision ${i}`);
    });
  });
}

test('a same-tick commit race moves stale rejection from classic apply to server admission, with identical values', () => {
  for (const { key, min, max } of RAIL_TUNABLES) {
    const first: TraceInput = {
      from: 'alice',
      wait: 0,
      edit: { op: 'tune.commit', i: 0, j: 0, key, v: min, expectedRevision: 0, requestId: 'first' },
    };
    const second: TraceInput = {
      from: 'bob',
      edit: { ...first.edit, v: max, requestId: 'race' },
    };
    const trace = recordTrace(0x51a7e, [first, second]);
    assert.deepEqual(
      trace.steps.filter((step) => step.phase === 'admit').map((step) => step.accepted),
      [true, true],
    );
    const results = trace.steps.filter((step) => step.phase === 'apply').map((step) => step.result);
    assert.deepEqual(results[1], { requestId: 'race', status: 'rejected', revision: 1 });
    const host = server();
    assert.deepEqual(host.run(first), { status: 'accepted', result: results[0], durable: true });
    assert.deepEqual(host.run(second), { status: 'rejected', result: null, durable: false });
    assert.deepEqual(serializeTune(host.api.tune), railState(trace.steps.at(-1)!), key);
  }
});

test('raw JSON negative zero is accepted as zero and remains valid through the replica projection', () => {
  for (const { key, min } of RAIL_TUNABLES) {
    if (min !== 0) continue;
    const host = server();
    const mirror = createMirror(CLASSIC_SCHEMAS);
    const read = createClassicMirror(mirror);
    host.replication.addClient('peer');
    const edit = JSON.parse(`{"op":"tune.set","key":"${key}","v":-0}`) as Record<string, unknown>;
    assert.ok(Object.is(edit.v, -0), 'raw JSON may preserve negative zero at admission');
    const result = host.run({ from: 'alice', edit });
    assert.deepEqual(result, { status: 'accepted', result: { key, v: 0 }, durable: false });
    assert.equal(Object.is(host.api.get(key), -0), false, key);
    assert.doesNotThrow(() => host.replication.commit(1), 'every accepted value must satisfy its wire schema');
    host.replication.flush(1, (_cid, packet) => assert.equal(mirror.apply(packet), true));
    assert.equal(read.get(key), 0);
    assert.equal(read.tune.revision, 1);
    assert.deepEqual(serializeTune(read.tune), serializeTune(host.api.tune));
  }
});

test('haul and rail tune subsets round-trip independently; rail edits never enter the haul hash', () => {
  const haul = createTune(HAUL_TUNABLES);
  const rail = createTune(RAIL_TUNABLES);
  assert.equal(Object.keys(haul.v).length, 8);
  assert.deepEqual(
    Object.keys(haul.v),
    HAUL_TUNABLES.map(({ key }) => key),
  );
  assert.deepEqual(
    Object.keys(rail.v),
    RAIL_TUNABLES.map(({ key }) => key),
  );
  const haulBefore = hashTune(haul);
  for (const { key, max } of RAIL_TUNABLES) setTune(rail, key, max);
  assert.equal(hashTune(haul), haulBefore);
  for (const { key, min } of HAUL_TUNABLES) setTune(haul, key, min);
  assert.notEqual(hashTune(haul), haulBefore);
  for (const [state, specs] of [
    [haul, HAUL_TUNABLES],
    [rail, RAIL_TUNABLES],
  ] as const) {
    const copy = createTune(specs);
    loadTune(copy, serializeTune(state));
    assert.deepEqual(serializeTune(copy), serializeTune(state));
    assert.equal(hashTune(copy), hashTune(state));
    assert.throws(() => loadTune(copy, serializeTune(createTune())), /incomplete or invalid values/);
  }
  assert.throws(() => loadTune(haul, serializeTune(rail)), /incomplete or invalid values/);
  assert.throws(() => loadTune(rail, serializeTune(haul)), /incomplete or invalid values/);
});

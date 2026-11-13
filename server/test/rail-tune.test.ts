// Real host and actual client session contract tests, with no browser or socket.
import test from 'node:test';
import assert from 'node:assert/strict';
import { setImmediate } from 'node:timers/promises';
import { RAILWAY_WINDOW } from '../../src/sim/railway.ts';
import type { RecoveryEnvelope } from '../../src/world/sync.ts';
import { fixture } from './helpers/rail-tune.ts';

const commit = (revision: number, value = 44) => ({
  key: 'railRegrowMinutes',
  v: value,
  expectedRevision: revision,
  requestId: `commit-${revision}-${value}`,
});

test('rail tune: two mirrors, late join, stale revision and wrong controller', async (t) => {
  const f = await fixture(t);
  const a = f.join('alice');
  const b = f.join('bob');
  f.run(3);
  assert.equal(a.adapter.read.ready(), true);
  assert.equal(a.adapter.act('tune.commit', commit(0)), 1);
  f.run();
  await f.settled();
  assert.equal(a.accepted.length, 1);
  assert.equal(a.mirror.tune.get('railRegrowMinutes'), 44);
  assert.deepEqual(a.mirror.tune.tune.v, b.mirror.tune.tune.v);
  assert.equal(a.mirror.tune.tune.revision, 1);
  const late = f.join('late');
  f.run(3);
  assert.equal(late.mirror.tune.get('railRegrowMinutes'), 44, 'whole snapshot includes tuned values');
  assert.deepEqual(late.mirror.tune.tune.v, a.mirror.tune.tune.v);
  assert.equal(a.adapter.act('tune.commit', commit(0, 45)), 2);
  assert.equal(b.adapter.act('tune.set', { key: 'railRegrowMinutes', v: 46 }), 1);
  f.run(2);
  assert.equal(a.refused.at(-1)?.reason, 'refused');
  assert.equal(b.refused.at(-1)?.reason, 'refused');
  assert.equal(f.host.rules.railTune.get('railRegrowMinutes'), 44);
  const hashes = f.host.sync.stateHashes();
  assert.equal(Object.hasOwn(hashes, 'railTune'), false);
  assert.equal(Object.keys(f.host.rules.tune.tune.v).length, 8);
});

test('rail tune: reconnect retains a pending commit and waits for its durable receipt', async (t) => {
  const f = await fixture(t);
  const a = f.join('alice');
  f.run(3);
  const hold = f.holdNextWrite();
  assert.equal(a.adapter.act('tune.commit', commit(0)), 1);
  f.run();
  await hold.entered.promise;
  assert.equal(a.accepted.length, 0, 'in-memory value is not an accepted durable receipt');
  a.disconnect();
  a.reconnect();
  f.run(2);
  assert.equal(a.accepted.length, 0, 'r:open during the write cannot settle the commit');
  hold.gate.resolve();
  await f.settled();
  f.run(40); // the existing session probe interval; same epoch resends its exact request
  await f.settled();
  assert.equal(a.accepted.length, 1);
  assert.equal(a.accepted[0]?.request, 1);
  assert.equal(a.refused.length, 0);
  assert.equal(f.host.rules.railTune.tune.revision, 1, 'resend applies once');
  assert.equal(a.mirror.tune.get('railRegrowMinutes'), 44);
  assert.ok(a.edits.filter((e) => e.request === 1).length >= 2, 'same identity was retried');
  const saved = (await f.store.read(f.roomId))!.data as RecoveryEnvelope;
  assert.equal((saved.checkpoint.data.railTune as { revision: number }).revision, 1);
});

test('rail tune: duplicate requests and stale packets cannot apply twice; request gaps are refused', async (t) => {
  const f = await fixture(t);
  const a = f.join('alice');
  f.run(3);
  const oldPacket = a.packets.at(-1)!;
  assert.equal(a.adapter.act('tune.set', { key: 'railRegrowMinutes', v: 41 }), 1);
  f.run(2);
  f.host.deliver({ t: 'r:edit', e: a.edits[0] }, 'alice');
  f.run();
  assert.equal(f.host.rules.railTune.tune.revision, 1);
  assert.equal(a.accepted.length, 1);
  assert.equal(a.adapter.act('tune.set', { key: 'railRegrowMinutes', v: 42 }), 2);
  f.run(2);
  a.hear(oldPacket);
  a.hear(a.packets.at(-1)!);
  assert.equal(a.mirror.tune.get('railRegrowMinutes'), 42);
  assert.equal(a.accepted.length, 2);
  f.host.deliver({ t: 'r:edit', e: { ...a.edits.at(-1), request: 4, v: 43 } }, 'alice');
  f.run();
  assert.ok(a.packets.some((p) => p.rej?.some(([, r, why]) => r === 4 && why === 'order')));
  assert.equal(f.host.rules.railTune.tune.revision, 2);
});

test('rail tune and predicted actions use one bounded request window', async (t) => {
  const f = await fixture(t);
  const a = f.join('alice');
  f.run(3);
  assert.equal(a.adapter.wake(), true);
  for (let k = 1; k < RAILWAY_WINDOW; k++)
    assert.equal(a.adapter.act('tune.set', { key: 'railRegrowMinutes', v: 30 + k }), k + 1);
  assert.equal(a.adapter.act('tune.set', { key: 'railRegrowMinutes', v: 50 }), false);
  f.run(2);
  assert.deepEqual(
    a.edits.map((e) => e.request),
    Array.from({ length: RAILWAY_WINDOW }, (_, i) => i + 1),
  );
  assert.equal(a.accepted.length, RAILWAY_WINDOW - 1);
  assert.equal(a.adapter.act('tune.set', { key: 'railRegrowMinutes', v: 50 }), RAILWAY_WINDOW + 1);
  f.run(2);
  assert.equal(a.mirror.tune.get('railRegrowMinutes'), 50);
});

test('rail tune: failed durable write reports unknown and never checkpoints the fatal state', async (t) => {
  const f = await fixture(t);
  const a = f.join('alice');
  f.run(3);
  const before = await f.store.read(f.roomId);
  const hold = f.holdNextWrite();
  assert.equal(a.adapter.act('tune.commit', commit(0)), 1);
  f.run();
  await hold.entered.promise;
  hold.gate.reject(new Error('disk unavailable'));
  await setImmediate();
  await setImmediate();
  assert.equal(a.accepted.length, 0);
  assert.equal(a.refused.at(-1)?.reason, 'storage');
  assert.equal(f.host.status().ready, false);
  const writes = f.writes.length;
  f.run(200);
  f.host.pause();
  await assert.rejects(f.host.close(), /storage/);
  assert.equal(f.writes.length, writes, 'periodic, pause and close paths never start another write');
  assert.deepEqual(await f.store.read(f.roomId), before, 'last good file is intact');
});

test('rail tune readiness is notified when the session arrives after its whole snapshot', async (t) => {
  const f = await fixture(t);
  const a = f.join('alice', true);
  let ready = 0;
  a.adapter.onReady(() => ready++);
  f.run(3);
  assert.equal(a.mirror.synced(), true);
  assert.equal(a.adapter.read.ready(), false);
  assert.equal(ready, 0);
  a.releaseSession();
  assert.equal(a.adapter.read.ready(), true);
  assert.equal(ready, 1, 'session arrival unblocks a command waiting for both authorities');
  f.run(3);
  assert.equal(ready, 1, 'ordinary packets do not repeat readiness');
});

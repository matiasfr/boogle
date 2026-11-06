// Opt-in recovery uses the real sync pipeline: publication is downstream of the atomic replacement promise.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createSync, MAX_RECOVERY_BYTES, type RecoveryEnvelope, type RecoveryStore } from '../src/world/sync.ts';
import { makeNet, run, type FakeNet } from './helpers/net.ts';

const copy = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

function disk() {
  let saved: unknown = null;
  let release: (() => void) | null = null;
  let wait: Promise<void> | null = null;
  let failure: string | null = null;
  let writes = 0;
  const recovery: RecoveryStore = {
    namespace: 'rail-test-v1',
    catalog: 'T1-v0',
    read: () => copy(saved),
    async write(envelope) {
      await wait;
      if (failure) throw new Error(failure);
      saved = copy(envelope);
      writes++;
    },
  };
  return {
    recovery,
    saved: () => copy(saved) as RecoveryEnvelope,
    replace: (value: unknown) => (saved = copy(value)),
    writes: () => writes,
    fail: (reason: string) => (failure = reason),
    pause() {
      wait = new Promise<void>((resolve) => (release = resolve));
    },
    resume() {
      release?.();
      wait = null;
      release = null;
    },
  };
}

function peer(net: FakeNet, id: string, recovery?: RecoveryStore, large = false) {
  const s = createSync();
  let count = 0;
  s.registerState('count', {
    serialize: () => (large ? 'x'.repeat(MAX_RECOVERY_BYTES) : count),
    load: (v) => {
      if (typeof v !== 'number' || !Number.isSafeInteger(v) || v < 0) throw new Error('invalid count');
      count = v;
    },
    hash: () => count,
  });
  s.registerOp<{ n: number }>('add', {
    validate: (e) => Number.isSafeInteger(e.n) && e.n > 0 && e.n <= 8,
    apply: (e) => (count += e.n),
  });
  const p = net.add(id, !!recovery);
  s.attachWorld(p.room, { host: !!recovery, roomId: 'rail-test', recovery, now: () => 1000 });
  return { s, p, count: () => count };
}

test('initial ready, stamps, clock and snapshots wait for durable replacement', async () => {
  const net = makeNet();
  const store = disk();
  store.pause();
  const host = peer(net, 'host', store.recovery);
  const client = peer(net, 'client');
  await run(net, [host, client], 4);
  assert.equal(host.s.worldStatus().ready, false);
  assert.equal(host.s.world.tick, 0);
  assert.equal(client.s.worldStatus().ready, false);
  assert.equal(store.writes(), 0);
  store.resume();
  await host.s.whenDurable();
  await run(net, [host, client], 50);
  assert.equal(client.s.worldStatus().ready, true);

  store.pause();
  const tick = host.s.world.tick;
  assert.equal(host.s.submitEdit({ op: 'add', i: 0, j: 0, n: 4 }), true);
  net.queue = [];
  await run(net, [host], 10);
  assert.equal(host.s.world.tick, tick);
  assert.equal(host.count(), 0);
  assert.equal(client.count(), 0);
  assert.equal(host.s.worldStatus().recoveryPending, true);
  assert.equal(host.s.submitEdit({ op: 'add', i: 0, j: 0, n: 4 }), false, 'bounded backpressure');
  assert.equal(store.saved().tail.length, 0, 'the previous checkpoint is intact');
  store.resume();
  await host.s.whenDurable();
  assert.equal(store.saved().tail.length, 1, 'future stamp is already on disk before publication');
  assert.ok(net.queue.some(({ m }) => (m as { t: string }).t === 'w:edits'));
  net.flush();
  await run(net, [host, client], 80);
  assert.equal(host.count(), 4);
  assert.equal(client.count(), 4);
  assert.deepEqual(client.s.stateHashes(), host.s.stateHashes());
  assert.equal(client.s.worldStatus().hashBad, 0);
});

test('crash after publication before application restores the queue exactly once', async () => {
  const store = disk();
  const net = makeNet();
  const host = peer(net, 'host', store.recovery);
  await host.s.whenDurable();
  for (const n of [1, 2, 4]) assert.equal(host.s.submitEdit({ op: 'add', i: 0, j: 0, n }), true);
  await host.s.whenDurable();
  assert.equal(host.count(), 0);
  assert.equal(store.saved().tail.length, 3);
  assert.ok(net.queue.some(({ m }) => (m as { t: string }).t === 'w:edits'));
  host.s.detachWorld(); // no graceful checkpoint

  const restored = peer(makeNet(), 'restart', store.recovery);
  await restored.s.whenDurable();
  assert.equal(restored.count(), 7);
  assert.equal(store.saved().tail.length, 0);
  const hash = restored.s.worldHash();
  const tick = restored.s.world.tick;
  restored.s.detachWorld();
  const again = peer(makeNet(), 'restart-again', store.recovery);
  await again.s.whenDurable();
  assert.equal(again.count(), 7);
  assert.equal(again.s.world.tick, tick);
  assert.equal(again.s.worldHash(), hash);
});

test('a reentrant tick submission stops the clock before its durability barrier', async () => {
  const net = makeNet();
  const store = disk();
  const host = peer(net, 'host', store.recovery);
  await host.s.whenDurable();
  let triggered = false;
  host.s.onTick((tick) => {
    if (tick !== 2 || triggered) return;
    triggered = true;
    assert.equal(host.s.submitEdit({ op: 'add', i: 0, j: 0, n: 2 }), true);
    assert.equal(host.s.saveNow(true), false, 'never checkpoint a partially processed tick');
  });
  host.s.submitEdit({ op: 'add', i: 0, j: 0, n: 1 });
  await host.s.whenDurable();
  net.queue = [];
  store.pause();
  host.s.updateWorld(0.5);
  assert.equal(host.s.world.tick, 2);
  assert.equal(host.count(), 0);
  assert.equal(net.queue.length, 0, 'no clock/hash runs ahead of reentrant unpublished work');
  await Promise.resolve();
  host.s.updateWorld(0.5);
  assert.equal(host.s.world.tick, 2);
  store.resume();
  await host.s.whenDurable();
  host.s.updateWorld(0.5);
  assert.equal(host.count(), 3);
});

test('refused replacement pauses mutation and publication without replacing the last save', async () => {
  const net = makeNet();
  const store = disk();
  const host = peer(net, 'host', store.recovery);
  await host.s.whenDurable();
  const before = store.saved();
  store.fail('507 room limit');
  assert.equal(host.s.submitEdit({ op: 'add', i: 0, j: 0, n: 4 }), true);
  await assert.rejects(host.s.whenDurable(), /507 room limit/);
  host.s.updateWorld(1);
  assert.equal(host.s.world.tick, 0);
  assert.equal(host.count(), 0);
  assert.equal(host.s.worldStatus().ready, false);
  assert.equal(host.s.submitEdit({ op: 'add', i: 0, j: 0, n: 1 }), false);
  assert.equal(host.s.saveNow(true), false);
  assert.deepEqual(store.saved(), before);
  assert.equal(net.queue.length, 0, 'no accepted stamp or clock was published');
});

test('checkpoint replacement can crash without dropping an already-published future tail', async () => {
  const store = disk();
  const host = peer(makeNet(), 'host', store.recovery);
  await host.s.whenDurable();
  host.s.submitEdit({ op: 'add', i: 0, j: 0, n: 3 });
  await host.s.whenDurable();
  store.pause();
  assert.equal(host.s.saveNow(true), true);
  const saved = store.saved();
  assert.equal(saved.tail.length, 1);
  host.s.detachWorld();
  // The replacement may or may not finish when a process dies: either complete file must recover the same edit.
  const other = disk();
  other.replace(saved);
  const restored = peer(makeNet(), 'restart', other.recovery);
  await restored.s.whenDurable();
  assert.equal(restored.count(), 3);
  store.resume();
  await host.s.whenDurable();
});

test('corrupt, wrong-schema, wrong-catalog and modified-tail saves never become healthy fallback', async () => {
  const original = disk();
  const host = peer(makeNet(), 'host', original.recovery);
  await host.s.whenDurable();
  host.s.submitEdit({ op: 'add', i: 0, j: 0, n: 3 });
  await host.s.whenDurable();
  const saved = original.saved();
  const cases = [
    { nonsense: true },
    { ...saved, version: 2 },
    { ...saved, catalog: 'T2' },
    { ...saved, checkpoint: { ...saved.checkpoint, data: { count: 12 } } },
    { ...saved, tail: [{ ...saved.tail[0]!, e: { ...saved.tail[0]!.e, n: 4 } }] },
    { ...saved, tail: [{ ...saved.tail[0]!, tick: 999999 }] },
    { ...saved, checkpoint: { ...saved.checkpoint, data: { unexpected: 0 } } },
  ];
  for (const bad of cases) {
    const store = disk();
    store.replace(bad);
    const net = makeNet();
    const failed = peer(net, 'failed', store.recovery);
    const client = peer(net, 'client');
    await assert.rejects(failed.s.whenDurable());
    await run(net, [failed, client], 50);
    assert.equal(failed.s.worldStatus().badSave, true);
    assert.equal(failed.s.worldStatus().ready, false);
    assert.equal(failed.s.submitEdit({ op: 'add', i: 0, j: 0, n: 1 }), false);
    assert.equal(client.s.worldStatus().ready, false);
    assert.equal(store.writes(), 0);
    assert.deepEqual(store.recovery.read(), bad);
  }
});

test('the recovery envelope has an explicit byte bound and refuses oversized state before publication', async () => {
  const store = disk();
  const net = makeNet();
  const host = peer(net, 'host', store.recovery, true);
  await assert.rejects(host.s.whenDurable(), /budget/);
  assert.equal(host.s.worldStatus().ready, false);
  assert.equal(store.writes(), 0);
  assert.equal(net.queue.length, 0);
});

test('ordinary bad-load guards suppress serving as well as saving the failed fallback', async () => {
  const net = makeNet();
  const host = peer(net, 'host');
  host.s.detachWorld();
  host.s.attachWorld(host.p.room, {
    host: true,
    storage: { getItem: () => '{bad json', setItem: () => assert.fail('must not save bad fallback') },
  });
  const client = peer(net, 'client');
  await run(net, [host, client], 50);
  assert.equal(host.s.worldStatus().badSave, true);
  assert.equal(host.s.worldStatus().snapsSent, 0);
  assert.equal(client.s.worldStatus().ready, false);
  assert.equal(host.s.saveNow(true), false);
});

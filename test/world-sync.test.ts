// The remaining sync contract: authoritative clock and verified Server-kind checkpoints.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createSync, type RecoveryEnvelope, type RecoveryStore } from '../src/world/sync.ts';
import { SERVER_ID } from '../src/net/ids.ts';
import { serverWorld } from './helpers/server-world.ts';
import { makeNet } from './helpers/net.ts';

function store(initial: unknown = null) {
  let saved = structuredClone(initial);
  let writes = 0;
  const recovery: RecoveryStore = {
    namespace: 'test-v40',
    catalog: 'test',
    read: () => structuredClone(saved),
    async write(value) {
      saved = structuredClone(value);
      writes++;
    },
  };
  return { recovery, saved: () => saved as RecoveryEnvelope, writes: () => writes };
}
function attach(s: ReturnType<typeof createSync>, recovery: RecoveryStore) {
  const net = makeNet();
  s.attachWorld(net.add(SERVER_ID, true).room, { host: true, recovery, now: () => 1000 });
}

test('server checkpoint restores roster, rail tuning and railway state exactly', async () => {
  const disk = store();
  const host = serverWorld();
  attach(host.sync, disk.recovery);
  await host.sync.whenDurable();
  host.run('alice', { op: 'who.set', n: 'Alice', c: 2 });
  host.run('alice', { op: 'tune.set', key: 'railFeedMs', v: 80 });
  host.sync.stepWorld(300);
  assert.equal(host.sync.saveNow(true), true);
  await host.sync.whenDurable();
  const expected = structuredClone(host.sync.snapshot());
  const restored = serverWorld();
  attach(restored.sync, disk.recovery);
  await restored.sync.whenDurable();
  assert.deepEqual(restored.sync.snapshot(), expected);
  assert.equal(restored.sync.worldHash(), host.sync.worldHash());
  for (let i = 0; i < 20; i++) {
    host.sync.stepWorld(100);
    restored.sync.stepWorld(100);
    assert.deepEqual(restored.sync.snapshot(), host.sync.snapshot());
  }
  assert.equal('tail' in disk.saved(), false);
  assert.equal('seq' in disk.saved(), false);
});

test('checkpoint checksum corruption never replaces the last good file', async () => {
  const disk = store();
  const host = serverWorld();
  attach(host.sync, disk.recovery);
  await host.sync.whenDurable();
  const bad = structuredClone(disk.saved());
  bad.checksum ^= 1;
  const broken = store(bad);
  const restored = serverWorld();
  attach(restored.sync, broken.recovery);
  await assert.rejects(restored.sync.whenDurable(), /checksum/);
  assert.equal(restored.sync.worldStatus().badSave, true);
  assert.equal(restored.sync.saveNow(true), false);
  assert.equal(broken.writes(), 0);
  assert.deepEqual(broken.saved(), bad);
});

test('a failed state load blocks every later checkpoint of its fresh fallback', async () => {
  const disk = store();
  const host = createSync();
  host.registerState('x', { serialize: () => 1, load() {}, hash: () => 1 }, { server: true });
  attach(host, disk.recovery);
  await host.whenDurable();
  const writes = disk.writes();
  const restored = createSync();
  restored.registerState(
    'x',
    {
      serialize: () => 0,
      load(v) {
        if (v === 1) throw new Error('broken');
      },
      hash: () => 0,
    },
    { server: true },
  );
  const warn = console.warn;
  console.warn = () => {};
  try {
    attach(restored, disk.recovery);
  } finally {
    console.warn = warn;
  }
  await assert.rejects(restored.whenDurable(), /load|hash/);
  restored.stepWorld(300);
  assert.equal(restored.saveNow(true), false);
  assert.equal(disk.writes(), writes);
  const freshDisk = store();
  attach(restored, freshDisk.recovery);
  await restored.whenDurable();
  assert.equal(restored.worldStatus().badSave, true, 'reattaching cannot bless the failed-load fallback');
  assert.equal(restored.worldStatus().ready, false);
  assert.equal(restored.saveNow(true), false);
  assert.equal(freshDisk.writes(), 0);
});

test('an outstanding checkpoint owns an immutable state copy', async () => {
  const disk = store();
  const host = serverWorld();
  attach(host.sync, disk.recovery);
  await host.sync.whenDurable();
  host.run('alice', { op: 'who.set', n: 'Before', c: 2 });
  const expected = structuredClone(host.sync.snapshot());
  host.sync.saveNow(true);
  host.run('alice', { op: 'who.set', n: 'After', c: 3 });
  await host.sync.whenDurable();
  assert.deepEqual(disk.saved().checkpoint, expected);
  assert.notDeepEqual(host.sync.snapshot(), expected);
});

test('clients follow only the server clock and never run server ticks', () => {
  const net = makeNet();
  const server = net.add(SERVER_ID, true);
  const peer = net.add('client');
  const s = createSync();
  let calls = 0;
  s.onTick(() => calls++);
  s.attachWorld(peer.room);
  const forged = net.add('forged');
  forged.room.send({ t: 'w:c', ht: 100 });
  net.flush();
  assert.equal(s.roomStep(), -1);
  server.room.send({ t: 'w:c', ht: 10 });
  net.flush();
  assert.equal(s.roomStep(), 60);
  s.updateWorld(0.1);
  assert.ok(s.roomStep() >= 60);
  assert.equal(calls, 0);
  for (const t of ['w:edit', 'w:edits', 'w:hash', 'w:need', 'w:snap', 'w:rejected']) server.room.send({ t, ht: 10000 });
  net.flush();
  assert.ok(s.roomStep() < 100);
  net.setUp(peer, false);
  net.setUp(peer, true);
  assert.equal(s.roomStep(), -1, 'reconnect forgets the previous server estimate');
});

test('server state keys are unique', () => {
  const sync = createSync();
  const state = { serialize: () => 0, load() {}, hash: () => 0 };
  sync.registerState('one', state, { server: true });
  assert.throws(() => sync.registerState('one', state, { server: true }), /duplicate state/);
  assert.deepEqual(sync.registry().states, ['one']);
});

test('the checkpoint hash covers every Server-kind state after loading', async () => {
  const disk = store();
  const host = createSync();
  host.registerState('x', { serialize: () => 7, load() {}, hash: () => 7 }, { server: true });
  attach(host, disk.recovery);
  await host.whenDurable();
  const writes = disk.writes();
  const restored = createSync();
  // A changed loader silently canonicalizes the saved value differently. The envelope checksum is still valid.
  restored.registerState('x', { serialize: () => 8, load() {}, hash: () => 8 }, { server: true });
  attach(restored, disk.recovery);
  await assert.rejects(restored.whenDurable(), /hash/);
  assert.equal(restored.saveNow(true), false);
  assert.equal(disk.writes(), writes);
});

test('checkpoint write failure stops readiness and subsequent writes', async () => {
  let writes = 0;
  const sync = serverWorld().sync;
  attach(sync, {
    namespace: 'test-v40',
    catalog: 'test',
    read: () => null,
    async write() {
      writes++;
      throw new Error('disk full');
    },
  });
  await assert.rejects(sync.whenDurable(), /disk full/);
  const tick = sync.world.tick;
  sync.stepWorld(500);
  assert.equal(sync.world.tick, tick);
  assert.equal(sync.worldStatus().ready, false);
  assert.equal(sync.saveNow(true), false);
  assert.equal(writes, 1);
});

// Ordinary rooms retain the server clock and guarded checkpoint, without classic game state or commands.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createWorldHost } from '../src/host/world-host.ts';
import { createStore } from '../src/store.ts';
import { worldRoomId } from '../../src/world/namespace.ts';

test('an ordinary room saves the server clock and resumes with no classic state', async (t) => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'boogle-world-'));
  const store = createStore({ dataDir: dir, maxRooms: 10 });
  await store.init();
  const roomId = worldRoomId('beach');
  let host = createWorldHost({ roomId, store, tick: false });
  t.after(async () => {
    await host.close({ save: false });
    await fs.rm(dir, { recursive: true, force: true });
  });
  assert.deepEqual(host.sync.registry().states, []);
  assert.deepEqual(host.sync.snapshot().data, {});
  for (let i = 0; i < 10; i++) host.step(0.1);
  const tick = host.sync.world.tick;
  assert.equal(tick, 10);
  await host.close({ save: true });
  assert.equal(store.readSync(roomId)!.writerId, 'server');
  assert.equal(store.readSync(roomId)!.tick, tick);
  host = createWorldHost({ roomId, store, tick: false });
  assert.equal(host.sync.world.tick, tick);
  for (let i = 0; i < 10; i++) host.step(0.1);
  await host.close({ save: true });
  host = createWorldHost({ roomId, store, tick: false });
  assert.equal(host.sync.world.tick, tick + 10, 'unchanged state still saves the advancing clock on close');
});

test('an ordinary room ignores every retired client message and never serves a snapshot', async (t) => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'boogle-world-retired-'));
  const store = createStore({ dataDir: dir, maxRooms: 10 });
  await store.init();
  const host = createWorldHost({ roomId: worldRoomId('retired'), store, tick: false });
  t.after(async () => {
    await host.close({ save: false });
    await fs.rm(dir, { recursive: true, force: true });
  });
  const sent: Record<string, unknown>[] = [];
  host.onSend((m) => sent.push(m));
  for (const type of ['w:edit', 'w:edits', 'w:hash', 'w:need', 'w:snap', 'w:rejected']) {
    assert.doesNotThrow(() => host.deliver({ t: type, e: { op: { toString: 0 } }, tick: 1_000_000 }, 'client'));
    assert.doesNotThrow(() => host.deliver({ t: type, e: { op: 'who.set', n: 'No longer admitted', c: 2 } }, 'client'));
  }
  assert.equal(sent.length, 0);
  assert.deepEqual(host.sync.snapshot().data, {});
  host.step(0.2);
  assert.equal(host.status().ready, true);
  assert.equal(host.sync.world.tick, 2);
  assert.deepEqual(
    sent.map((m) => m.t),
    ['w:c'],
  );
});

test('an invalid current checkpoint is never overwritten by a failed-load fallback', async (t) => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'boogle-world-bad-'));
  const roomId = worldRoomId('bad');
  const file = path.join(dir, `${roomId}.json`);
  const original = JSON.stringify({ tick: 1, writerId: 'server', data: { tick: -1, data: {} }, updatedAt: 'fixture' });
  await fs.writeFile(file, original);
  const store = createStore({ dataDir: dir, maxRooms: 10 });
  await store.init();
  const host = createWorldHost({ roomId, store, tick: false });
  t.after(async () => {
    await host.close({ save: false });
    await fs.rm(dir, { recursive: true, force: true });
  });
  assert.equal(host.status().badSave, true);
  await assert.rejects(host.close({ save: true }), /saved state did not load cleanly/);
  assert.equal(await fs.readFile(file, 'utf8'), original);
});

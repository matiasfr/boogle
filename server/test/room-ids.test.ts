import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { currentRoomId, roomNamespaces } from '../src/room-ids.ts';
import { classify, assertNotCurrent, inventorySaves } from '../src/save-inventory.ts';
import { createStore } from '../src/store.ts';
import { createService, loadConfig } from '../src/server.ts';
import { worldRoomId } from '../../src/world/namespace.ts';
import { railwayRoomId } from '../../src/world/railway-namespace.ts';

test('all supported room writers produce files inventory and cleanup protect, including their temp writes', async (t) => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'boogle-room-ids-'));
  t.after(() => fs.rm(dir, { recursive: true, force: true }));
  const ns = roomNamespaces();
  const store = createStore({ dataDir: dir, maxRooms: 100 });
  await store.init();
  const ids = [
    worldRoomId('boogle'),
    worldRoomId('proto-place'),
    worldRoomId('rail-demo'),
    worldRoomId('x'.repeat(200)),
    railwayRoomId('boogle'),
    railwayRoomId('proto-tuning'),
    railwayRoomId('x'.repeat(200)),
    'wsabcdef',
    'beach',
    'default',
    'test',
    'proto-tunables',
    'one',
    'manifest',
    'garden-1',
    't1v01-room',
  ];
  for (const id of ids) {
    assert.ok(currentRoomId(id, ns), id);
    assert.equal((await store.write(id, { tick: 7, writerId: 'server', data: {}, updatedAt: '' })).status, 200);
    assert.equal(classify(`${id}.json`, ns), 'current', id);
    assert.throws(() => assertNotCurrent(`${id}.json`, ns));
    assert.throws(() => assertNotCurrent(`${id}.json.12.abcdef01.tmp`, ns));
    await fs.writeFile(path.join(dir, `${id}.json.12.abcdef01.tmp`), 'orphan');
    await fs.utimes(path.join(dir, `${id}.json.12.abcdef01.tmp`), new Date(0), new Date(0));
  }
  const inv = await inventorySaves(dir, { ns });
  assert.equal(inv.current.count, ids.length);
  assert.deepEqual(inv.files, []);
  assert.deepEqual(inv.legacyFiles, []);
});

test('Store cannot write a file cleanup calls obsolete, unless the current service explicitly hosts it', async (t) => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'boogle-room-ids-'));
  t.after(() => fs.rm(dir, { recursive: true, force: true }));
  const store = createStore({ dataDir: dir, maxRooms: 10 });
  await store.init();
  const doc = { tick: 7, writerId: 'server', data: {}, updatedAt: '' };
  for (const id of ['v01-retired', 'rail-v02-retired', '../outside']) {
    await assert.rejects(store.write(id, doc), /Cannot write obsolete or invalid room/);
  }
  assert.deepEqual(await fs.readdir(dir), []);
  const listed = ['v01-configured', 'rail-v02-configured'];
  const configured = createStore({ dataDir: dir, maxRooms: 10, serverRooms: listed });
  const ns = roomNamespaces(listed);
  for (const id of listed) {
    assert.equal((await configured.write(id, doc)).status, 200);
    assert.equal(classify(`${id}.json`, ns), 'current');
    assert.throws(() => assertNotCurrent(`${id}.json`, ns));
  }
  const inv = await inventorySaves(dir, { ns });
  assert.deepEqual(inv.currentRooms, listed);
  assert.equal(inv.current.count, 2);
  assert.deepEqual(inv.files, []);
});

test('wildcard admission and boot cleanup share the same supported room names', async (t) => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'boogle-room-ids-'));
  const service = createService(loadConfig({ DATA_DIR: dir, SERVER_ROOMS: '*' }, { log: () => {} }));
  t.after(async () => {
    await service.close({ save: false });
    await fs.rm(dir, { recursive: true, force: true });
  });
  await service.listen(0);
  const host = service.roomHost()!;
  for (const id of ['wsabcdef', 'beach', worldRoomId('boogle'), railwayRoomId('boogle')]) assert.ok(host.hosts(id));
  for (const id of ['v01-retired', 'rail-v02-retired']) assert.equal(host.hosts(id), false);
});

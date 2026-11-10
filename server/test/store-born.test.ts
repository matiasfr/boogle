// A room's world id (`born`, server/src/store.ts): what tells a client its room started over.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createService, loadConfig } from '../src/server.ts';
import { createStore, type RoomDoc } from '../src/store.ts';
import { worldRoomId } from '../../src/world/namespace.ts';

const room = worldRoomId('born');
const doc = (tick: number, born?: string): RoomDoc => ({
  tick,
  writerId: 'w',
  data: { tick },
  updatedAt: new Date(0).toISOString(),
  ...(born === undefined ? {} : { born }),
});
async function open(dataDir?: string) {
  dataDir ??= await fs.mkdtemp(path.join(os.tmpdir(), 'boogle-born-'));
  const store = createStore({ dataDir, maxRooms: 10, serverRooms: ['*'] });
  await store.init();
  return { store, dataDir, file: path.join(dataDir, `${room}.json`) };
}

test('a fresh world keeps one id: the one its first save records, and no later write changes it', async () => {
  const { store, dataDir } = await open();
  const born = store.born(room)!;
  assert.match(born, /^[a-z0-9]{1,16}$/);
  assert.equal(store.born(room), born, 'the same until it is written');
  await store.write(room, doc(1));
  await store.write(room, doc(2, 'other'));
  assert.equal(store.born(room), born);
  assert.equal((await open(dataDir)).store.born(room), born, 'and after a restart');
});

test('a save from before the id reads 0 and stays 0, so a restart starts nobody over', async () => {
  const { store, dataDir, file } = await open();
  await fs.writeFile(file, JSON.stringify(doc(1)));
  assert.equal(store.born(room), '0');
  await store.write(room, doc(2));
  assert.equal((await open(dataDir)).store.born(room), '0');
});

test('forgetting a world that never saved gives the next one a new id', async () => {
  const { store } = await open();
  const born = store.born(room);
  store.forget(room);
  assert.notEqual(store.born(room), born);
});

test('a first save takes its own id (a backup put back), unless it is malformed', async () => {
  const a = await open();
  await a.store.write(room, doc(1, 'abc123'));
  assert.equal(a.store.born(room), 'abc123');
  const b = await open();
  await b.store.write(room, { ...doc(1), born: 7 } as unknown as RoomDoc);
  assert.match(b.store.born(room)!, /^[a-f0-9]{12}$/);
});

test('an unreadable save has no id and is left alone', async () => {
  const { store, file } = await open();
  await fs.writeFile(file, '{"tick": 12, "data": {');
  assert.equal(store.born(room), null);
  assert.equal(await fs.readFile(file, 'utf8'), '{"tick": 12, "data": {');
});

test('a join to a room whose save is unreadable is welcomed without an id, and the file stays', async () => {
  const dataDir = await fs.mkdtemp(path.join(os.tmpdir(), 'boogle-born-'));
  const file = path.join(dataDir, `${room}.json`);
  await fs.writeFile(file, '{"tick": 12, "data": {');
  const svc = createService(loadConfig({ DATA_DIR: dataDir, SERVER_ROOMS: '*' }, { log: () => {} }));
  const port = await svc.listen(0);
  try {
    const ws = new WebSocket(`ws://127.0.0.1:${port}/room/${room}?self=aaa&pid=aaapid&key=aaapidkey0000000000&b=test`, [
      'boogle.1',
    ]);
    const first = await new Promise<Record<string, unknown>>((resolve) => {
      ws.onmessage = (e) => resolve(JSON.parse(String(e.data)));
      ws.onclose = (e) => resolve({ t: `closed ${e.code}` });
    });
    assert.equal(first.t, 'welcome');
    assert.ok(!('born' in first));
    assert.equal(await fs.readFile(file, 'utf8'), '{"tick": 12, "data": {');
    ws.close();
  } finally {
    await svc.close({ save: false });
  }
});

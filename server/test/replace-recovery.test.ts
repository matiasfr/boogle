import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createStore, type RoomDoc } from '../src/store.ts';
import { createReplacements } from '../src/replacements.ts';
import { railwayRoomId } from '../../src/world/railway-namespace.ts';
import { createRoomHost } from '../src/host/rooms.ts';
import { buildSeedDoc } from '../src/seeds/build.ts';
import { createService, loadConfig } from '../src/server.ts';
import type { RailwayWorldHost } from '../src/host/world-host.ts';

const id = railwayRoomId('replace-recovery');
const doc = (tick: number): RoomDoc => ({ tick, writerId: 'server', updatedAt: 'fixture', data: { tick } });
async function fixture(t: test.TestContext, replaceFailAt?: 'backup' | 'save' | 'record') {
  const dataDir = await fs.mkdtemp(path.join(os.tmpdir(), 'boogle-replace-'));
  t.after(() => fs.rm(dataDir, { recursive: true, force: true }));
  const store = createStore({ dataDir, maxRooms: 10 });
  await store.init();
  await store.write(id, doc(100));
  const cfg = { dataDir, build: 'test', log: () => {}, replaceFailAt };
  const replacements = createReplacements(cfg, store);
  await replacements.init();
  return { dataDir, store, cfg, replacements };
}

test('replacement pins the old birth and atomically installs a lower tick; restore restores that birth', async (t) => {
  const { store, replacements, dataDir } = await fixture(t);
  const before = await store.read(id);
  const record = await replacements.replace(id, doc(3), { stage: 'ring-joined', players: 2, docHash: 'seed' });
  assert.notEqual(record.born, before!.born);
  assert.equal(store.readSync(id)!.tick, 3);
  const backup = JSON.parse(await fs.readFile(path.join(dataDir, '.backups/pinned', record.backup), 'utf8')) as RoomDoc;
  assert.deepEqual(backup, before);
  await store.withLock(id, () => store.replace(id, backup, { restoreBorn: true }));
  assert.deepEqual(store.readSync(id), before);
  assert.equal(replacements.read(id)!.stage, 'ring-joined');
  assert.match(record.restore, /restore/);
});

for (const point of ['backup', 'save', 'record'] as const) {
  test(`recovery after ${point} failure leaves a complete save and retains the pin`, async (t) => {
    const { store, replacements, cfg } = await fixture(t, point);
    const before = await store.read(id);
    await assert.rejects(replacements.replace(id, doc(3), { stage: 'ring-joined', players: 0, docHash: 'seed' }));
    const recovered = createReplacements({ ...cfg, replaceFailAt: undefined }, store);
    await recovered.init();
    assert.equal(store.readSync(id)!.tick, point === 'record' ? 3 : 100);
    assert.equal(recovered.read(id)?.stage, point === 'record' ? 'ring-joined' : undefined);
    assert.equal((await recovered.pins()).length, point === 'backup' ? 0 : 1);
    if (point !== 'record') assert.deepEqual(await store.read(id), before);
    await recovered.init();
  });
}

test('reservation is process-local, pins persist until explicit release', async (t) => {
  const { store, replacements, cfg } = await fixture(t);
  assert.equal(replacements.begin(id), true);
  assert.equal(replacements.begin(id), false);
  const restarted = createReplacements(cfg, store);
  await restarted.init();
  assert.equal(restarted.busy(id), false);
  assert.equal(store.readSync(id)!.tick, 100);
  const record = await restarted.replace(id, doc(3), { stage: 'ring-joined', players: 0, docHash: 'seed' });
  await restarted.release(record.backup);
  assert.equal((await restarted.pins()).length, 0);
});

test('a pinned replacement backup survives 31 ordinary backups', async (t) => {
  const { dataDir, replacements } = await fixture(t);
  const record = await replacements.replace(id, doc(3), { stage: 'ring-joined', players: 0, docHash: 'seed' });
  const svc = createService(loadConfig({ DATA_DIR: dataDir, REPORT_TOKEN: 'report' }, { log: () => {} }));
  const port = await svc.listen(0);
  try {
    for (let n = 0; n < 31; n++) {
      const result = await fetch(`http://127.0.0.1:${port}/admin/rooms/${id}/backup`, {
        method: 'POST',
        headers: { authorization: 'Bearer report' },
      });
      assert.equal(result.status, 200);
      await result.arrayBuffer();
    }
    assert.equal((await replacements.pins())[0]!.name, record.backup);
    assert.equal(
      (await fs.readdir(path.join(dataDir, '.backups'))).filter((name) => name.endsWith('.json')).length,
      30,
    );
  } finally {
    await svc.close({ save: false });
  }
});

test('offline save refuses a failed checkpoint and a failed-load fallback without running replacement', async (t) => {
  const { dataDir, store } = await fixture(t);
  const seed = await buildSeedDoc('awake');
  await store.withLock(id, () =>
    store.replace(id, { ...doc(seed.tick), ...seed, updatedAt: new Date().toISOString() }),
  );
  const rooms = createRoomHost(
    {
      serverRooms: [id],
      maxHostedRooms: 2,
      maxPlayers: 8,
      roomIdleMs: 100000,
      roomCloseMs: 1000,
      upgradesPerMin: 100,
      allowedOrigins: ['*'],
      trustProxy: false,
      serverSaveMs: 100000,
      reconnectGraceMs: 0,
      deadMs: 100000,
      housekeepMs: 100,
      log: () => {},
    },
    store,
  );
  try {
    const host = rooms.room(id)!.world as RailwayWorldHost;
    await host.whenReady();
    const before = await fs.readFile(path.join(dataDir, `${id}.json`), 'utf8');
    const write = store.write;
    store.write = () => Promise.reject(new Error('disk failed'));
    let ran = false;
    await assert.rejects(
      rooms.offline(
        id,
        async () => {
          ran = true;
        },
        { save: true },
      ),
      /verified close failed/,
    );
    assert.equal(ran, false);
    assert.equal(await fs.readFile(path.join(dataDir, `${id}.json`), 'utf8'), before);
    store.write = write;
    // Closing a corrupt checkpoint must not let the fresh fallback become the backup.
    await rooms.offline(id, async () => {
      await store.withLock(id, () => store.replace(id, doc(99)));
    });
    assert.equal(rooms.room(id)!.world.status().badSave, true);
    await assert.rejects(
      rooms.offline(
        id,
        async () => {
          ran = true;
        },
        { save: true },
      ),
      /verified close failed/,
    );
    assert.equal(ran, false);
    assert.equal(store.readSync(id)!.tick, 99);
  } finally {
    await rooms.close({ save: false }).catch(() => {});
  }
});

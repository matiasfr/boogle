// L1's real checkpoint path: a loaded non-wagon survives store close/reopen and finishes its delivery.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createStore } from '../src/store.ts';
import { createRailwayWorldHost } from '../src/host/world-host.ts';
import { railwayRoomId } from '../../src/world/railway-namespace.ts';
import { buildSeedWorld } from '../../src/sim/railway-seeds.ts';
import { railwayCheck } from '../../src/sim/railway-check.ts';
import { trains, works } from '../../src/sim/railway-rows.ts';
import { footingTotal } from '../../src/sim/railway-queries-works.ts';
import { aboard } from '../../src/sim/railway-queries.ts';

const seed = buildSeedWorld('yard-wagon');
test('loader: verified checkpoint reload retains a non-wagon load and completes without loss or duplication', async (t) => {
  const now = 1800000000000;
  t.mock.method(Date, 'now', () => now);
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'boogle-loader-save-'));
  let store = createStore({ dataDir: dir, maxRooms: 1 });
  await store.init();
  const roomId = railwayRoomId('loader-save');
  const make = () => createRailwayWorldHost({ roomId, store, tick: false, now: () => now, pidOf: () => 'a' });
  let host = make();
  t.after(async () => {
    await host.close({ save: false });
    await fs.rm(dir, { recursive: true, force: true });
  });
  await host.whenReady();
  // Same accepted-seed installation as server/src/seeds/build.ts, into a real host before saving.
  while (host.sync.world.tick <= seed.t) host.step(0.1);
  await host.sync.whenDurable();
  host.rules.railway.world().load(JSON.parse(JSON.stringify(seed.w.snapshot())), railwayCheck);
  host.rules.railway.touchAll();
  const world = () => host.rules.railway.world();
  for (let n = 0; !trains(world()).some((r) => !r.wagon && r.foot > 0); n++) {
    assert.ok(n < 2000, 'a non-wagon loads');
    host.step(0.1);
  }
  const before = trains(world()).map((r) => ({ ...r })),
    hash = world().hash();
  await host.close({ save: true });
  // New store instance reads disk, not the old store's cache.
  store = createStore({ dataDir: dir, maxRooms: 1 });
  await store.init();
  host = make();
  await host.whenReady();
  assert.equal(host.status().badSave, false);
  assert.equal(world().hash(), hash);
  assert.deepEqual(trains(world()), before);
  assert.ok(trains(world()).some((r) => !r.wagon && r.foot > 0));
  for (let n = 0; n < 1800; n++) {
    host.step(0.1);
    assert.equal(footingTotal(world()), works(world()).poured);
  }
  assert.equal(works(world()).pierRack, 12);
  assert.equal(aboard(world(), 'foot'), 0);
  assert.doesNotThrow(() => railwayCheck(world()));
  await host.close({ save: true });
});

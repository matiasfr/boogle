// POST /jump and the guarded seed (server/src/jump.ts, docs/plans/playtest-jump-in.md): a seeded room loads through the
// normal recovery path, and the shared `boogle` world, a room with a save and a loaded room are never seeded.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createService, loadConfig, type ServerConfig } from '../src/server.ts';
import { createStore } from '../src/store.ts';
import { createRailwayWorldHost } from '../src/host/world-host.ts';
import { buildSeedDoc } from '../src/seeds/build.ts';
import { prebuild } from '../src/seeds/prebuild.ts';
import { RAILWAY_PLAY_NS, railwayRoomId } from '../../src/world/railway-namespace.ts';
import { JUMP_ROOM_RE } from '../../src/world/railway-jump.ts';
import { DEFAULT_ROOM } from '../../src/constants.ts';
import type { SeedStage } from '../../src/sim/railway-seeds.ts';

const ns = RAILWAY_PLAY_NS;
const shared = railwayRoomId(DEFAULT_ROOM);

async function start(overrides: Partial<ServerConfig> = {}, dataDir?: string) {
  dataDir ??= await fs.mkdtemp(path.join(os.tmpdir(), 'boogle-jump-'));
  const svc = createService(loadConfig({ DATA_DIR: dataDir }, { log: () => {}, jumpBuild: 'any', ...overrides }));
  const base = `http://127.0.0.1:${await svc.listen(0)}`;
  const jump = (body: unknown) =>
    fetch(`${base}/jump`, { method: 'POST', headers: { 'content-type': 'text/plain' }, body: JSON.stringify(body) });
  let stopped: Promise<void> | null = null;
  return { base, dataDir, svc, jump, stop: () => (stopped ??= svc.close()) };
}
const roomFiles = async (dir: string) => (await fs.readdir(dir)).filter((f) => f.startsWith('rail-')).sort();

/** The shared room's save, written by a short real host run. */
async function writeShared(dataDir: string) {
  const store = createStore({ dataDir, maxRooms: 10 });
  await store.init();
  const host = createRailwayWorldHost({ roomId: shared, store, tick: false, pidOf: () => 'a' });
  await host.whenReady();
  for (let i = 0; i < 20; i++) host.step(0.1);
  await host.close({ save: true });
  return fs.readFile(path.join(dataDir, `${shared}.json`));
}
/** The railway a save loads as, through a real host. */
async function loadedRailway(dataDir: string, roomId: string) {
  const store = createStore({ dataDir, maxRooms: 10 });
  await store.init();
  const host = createRailwayWorldHost({ roomId, store, tick: false, pidOf: () => 'a' });
  await host.whenReady();
  const railway = host.rules.railway.railway;
  const line2 = railway.line2 ? railway.line2.jobs.map((j) => j.completion) : null;
  await host.close({ save: false });
  return { line2 };
}

test('a jump seeds a fresh private room that loads at its stage, and shows its seed', async () => {
  const s = await start();
  try {
    const r = await s.jump({ stage: 'q1-done', ns });
    assert.equal(r.status, 200);
    const { room, stage } = (await r.json()) as { room: string; stage: string };
    assert.equal(stage, 'q1-done');
    assert.match(room, JUMP_ROOM_RE);
    assert.ok(room.startsWith('q1-done-'));
    const id = railwayRoomId(room);
    assert.deepEqual(await roomFiles(s.dataDir), [`${id}.json`]);
    const host = (await (await fetch(`${s.base}/rooms/${id}/host`)).json()) as { seed?: { stage: string } };
    assert.equal(host.seed?.stage, 'q1-done');
    const other = (await (await fetch(`${s.base}/rooms/${shared}/host`)).json()) as { seed?: unknown };
    assert.equal(other.seed, undefined);
    await s.stop();
    assert.equal((await loadedRailway(s.dataDir, id)).line2?.[0], 1);
  } finally {
    await s.stop();
  }
});

test('a second jump to a stage reuses the built seed', async () => {
  let builds = 0;
  const s = await start({
    jumpBuildDoc: (stage: SeedStage) => {
      builds++;
      return buildSeedDoc(stage);
    },
  });
  try {
    const a = await s.jump({ stage: 'awake', ns });
    const b = await s.jump({ stage: 'awake', ns });
    assert.equal(a.status, 200);
    assert.equal(b.status, 200);
    assert.notEqual(((await a.json()) as { room: string }).room, ((await b.json()) as { room: string }).room);
    assert.equal(builds, 1);
  } finally {
    await s.stop();
  }
});

test('the shared world, a room with a save and a loaded room are never seeded', async () => {
  const dataDir = await fs.mkdtemp(path.join(os.tmpdir(), 'boogle-jump-'));
  const before = await writeShared(dataDir);
  const saved = railwayRoomId('awake-abc123');
  const loaded = railwayRoomId('awake-zzz999');
  await fs.writeFile(path.join(dataDir, `${saved}.json`), JSON.stringify({ tick: 1, writerId: 'x', data: 1 }));
  const savedBefore = await fs.readFile(path.join(dataDir, `${saved}.json`));
  const s = await start({ serverRooms: ['*', loaded] }, dataDir);
  try {
    assert.ok(s.svc.roomHost()?.room(loaded), 'the listed room is loaded');
    for (const stage of ['awake', 'start'] as const) {
      assert.equal((await s.svc.jumps.seedRoom(shared, stage)).status, 409);
      assert.equal((await s.svc.jumps.seedRoom(saved, stage)).status, 409);
      assert.equal((await s.svc.jumps.seedRoom(loaded, stage)).status, 409);
    }
    assert.equal((await s.svc.jumps.seedRoom(`${ns}-${DEFAULT_ROOM}-abc123`, 'awake')).status, 200);
    assert.deepEqual(await fs.readFile(path.join(dataDir, `${shared}.json`)), before);
    assert.deepEqual(await fs.readFile(path.join(dataDir, `${saved}.json`)), savedBefore);
    // A jump never lands on the shared room's name either.
    const r = await s.jump({ stage: 'awake', ns });
    assert.notEqual(railwayRoomId(((await r.json()) as { room: string }).room), shared);
  } finally {
    await s.stop();
  }
  assert.deepEqual(await fs.readFile(path.join(dataDir, `${shared}.json`)), before);
});

test('a jump refuses a named room, an unknown stage, another world and a flood', async () => {
  const s = await start({ jumpRatePerMin: 4 });
  try {
    assert.equal((await s.jump({ stage: 'awake', ns, room: DEFAULT_ROOM })).status, 400);
    assert.equal((await s.jump({ stage: 'nope', ns })).status, 400);
    assert.equal((await s.jump(['awake'])).status, 400);
    const stale = await s.jump({ stage: 'awake', ns: 'rail-v1' });
    assert.equal(stale.status, 409);
    assert.equal(((await stale.json()) as { ns: string }).ns, ns);
    assert.equal((await s.jump({ stage: 'awake', ns })).status, 429);
    assert.deepEqual(await roomFiles(s.dataDir), []);
  } finally {
    await s.stop();
  }
});

test('production builds nothing: a stage with no prebuilt seed is refused, a prebuilt one is served', async () => {
  const seeds = await fs.mkdtemp(path.join(os.tmpdir(), 'boogle-seeds-'));
  let s = await start({ jumpBuild: 'prebuilt', jumpSeedsDir: seeds });
  try {
    assert.equal((await s.jump({ stage: 'awake', ns })).status, 503);
    assert.deepEqual(await roomFiles(s.dataDir), []);
  } finally {
    await s.stop();
  }
  await prebuild(seeds, ['awake']);
  s = await start({ jumpBuild: 'prebuilt', jumpSeedsDir: seeds });
  try {
    assert.equal((await s.jump({ stage: 'awake', ns })).status, 200);
    assert.equal((await s.jump({ stage: 'q1-done', ns })).status, 503);
    assert.equal((await roomFiles(s.dataDir)).length, 1);
  } finally {
    await s.stop();
  }
});

test('from the beginning: a sidecar and no save; a join makes an ordinary fresh room', async () => {
  const s = await start();
  try {
    const r = await s.jump({ stage: 'start', ns });
    assert.equal(r.status, 200);
    const id = railwayRoomId(((await r.json()) as { room: string }).room);
    assert.deepEqual(await roomFiles(s.dataDir), []);
    assert.ok(await fs.stat(path.join(s.dataDir, 'jumps', `${id}.json`)));
    const host = (await (await fetch(`${s.base}/rooms/${id}/host`)).json()) as { seed?: { stage: string } };
    assert.equal(host.seed?.stage, 'start');
    await s.stop();
    assert.notEqual((await loadedRailway(s.dataDir, id)).line2?.[0], 1);
  } finally {
    await s.stop();
  }
});

test('boot drops old-world sidecars and idle test rooms, and never the shared room', async () => {
  const dataDir = await fs.mkdtemp(path.join(os.tmpdir(), 'boogle-jump-'));
  const before = await writeShared(dataDir);
  const jumps = path.join(dataDir, 'jumps');
  await fs.mkdir(jumps);
  const old = 'rail-v1-awake-abc123';
  const idle = railwayRoomId('awake-old111');
  const fresh = railwayRoomId('awake-new222');
  const long = new Date(Date.now() - 4 * 86_400_000);
  for (const id of [old, idle, fresh])
    await fs.writeFile(path.join(jumps, `${id}.json`), JSON.stringify({ stage: 'awake', at: long.toISOString() }));
  // A sidecar naming the shared room is never honoured.
  await fs.writeFile(path.join(jumps, `${shared}.json`), JSON.stringify({ stage: 'awake', at: long.toISOString() }));
  await fs.writeFile(path.join(dataDir, `${idle}.json`), '{}');
  await fs.writeFile(path.join(dataDir, `${fresh}.json`), '{}');
  await fs.utimes(path.join(dataDir, `${idle}.json`), long, long);
  await fs.utimes(path.join(dataDir, `${shared}.json`), long, long);
  const s = await start({}, dataDir);
  try {
    assert.deepEqual((await fs.readdir(jumps)).sort(), [`${fresh}.json`, `${shared}.json`]);
    assert.deepEqual(await roomFiles(dataDir), [`${fresh}.json`, `${shared}.json`].sort());
    assert.equal(s.svc.jumps.seedOf(shared), null);
    assert.equal(s.svc.jumps.seedOf(fresh)?.stage, 'awake');
  } finally {
    await s.stop();
  }
  assert.deepEqual(await fs.readFile(path.join(dataDir, `${shared}.json`)), before);
});

test('at most jumpMaxRooms test rooms at once', async () => {
  const s = await start({ jumpMaxRooms: 1 });
  try {
    assert.equal((await s.jump({ stage: 'start', ns })).status, 200);
    assert.equal((await s.jump({ stage: 'start', ns })).status, 507);
  } finally {
    await s.stop();
  }
});

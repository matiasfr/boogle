// A railway seed as a room's save (docs/plans/playtest-jump-in.md): the world src/sim/railway-seeds.ts builds from
// accepted ops, saved through a real railway host into a throwaway store and read back. The recovery envelope holds
// version, namespace, catalog and checkpoint, with no room id, so one doc serves any room under this RAILWAY_PLAY_NS.
// Synchronous CPU work of up to ~6 s: the server runs it in ./worker.ts or at image build (./prebuild.ts), never on the
// room thread. Look, playthrough and checkpoints use the same path (dev/look/rail-seed.ts).
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createStore } from '../store.ts';
import { createRailwayWorldHost } from '../host/world-host.ts';
import { railwayRoomId } from '../../../src/world/railway-namespace.ts';
import { railwayCheck } from '../../../src/sim/railway-check.ts';
import { buildSeedWorld, type SeedStage } from '../../../src/sim/railway-seeds.ts';
import { worldOf } from '../../../src/sim/railway-live.ts';

export type SeedDoc = { tick: number; data: unknown };

export async function buildSeedDoc(stage: SeedStage): Promise<SeedDoc> {
  const w = buildSeedWorld(stage);
  const dataDir = await fs.mkdtemp(path.join(os.tmpdir(), 'boogle-seed-'));
  try {
    const roomId = railwayRoomId('seed');
    const store = createStore({ dataDir, maxRooms: 1 });
    await store.init();
    const host = createRailwayWorldHost({ roomId, store, tick: false, now: () => Date.now(), pidOf: () => 'a' });
    try {
      await host.whenReady();
      while (host.sync.world.tick <= w.t) host.step(0.1);
      await host.sync.whenDurable();
      host.rules.railway.world().load(JSON.parse(JSON.stringify(worldOf(w.s).snapshot())), railwayCheck);
      host.rules.railway.touchAll();
      await host.close({ save: true });
    } finally {
      await host.close({ save: false });
    }
    const doc = await store.read(roomId);
    if (!doc) throw new Error(`seed ${stage}: the host saved nothing`);
    return { tick: doc.tick, data: doc.data };
  } finally {
    await fs.rm(dataDir, { recursive: true, force: true });
  }
}

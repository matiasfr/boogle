// A railway save part-way up the ring's bents, for looks (docs/plans/ring-island-build1.md, R4b): `--rail-seed ring-set-7`
// is `deck-laid` with seven of the fourteen bent footings set, by accepted ops at the railhead jib, the wagon bringing
// each load (as src/sim/railway-seed-ring.ts's stages are built). The save goes through the real host as
// server/src/seeds/build.ts does; the stages themselves stay src/sim's.
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createStore } from '../../server/src/store.ts';
import { createRailwayWorldHost } from '../../server/src/host/world-host.ts';
import { railwayRoomId } from '../../src/world/railway-namespace.ts';
import { railwayCheck } from '../../src/sim/railway-check.ts';
import { railwayAtRing } from '../../src/sim/railway-seed-ring.ts';
import { act, type Seed } from '../../src/sim/railway-seed-route.ts';
import { advanceWorks } from '../../src/sim/railway-seed-works.ts';
import { aperture } from '../../src/sim/railway-rows.ts';
import { need } from '../../src/sim/railway-drive.ts';

export const ringMidStage = (stage: string) => /^ring-set-(\d|1[0-4])$/.exec(stage)?.[1] ?? null;

export async function buildRingMidDoc(set: number) {
  const seed = railwayAtRing('deck-laid');
  for (let guard = 0; aperture(seed.w).set < set; guard++) {
    need(guard < 30000, 'ring footings set');
    if (aperture(seed.w).rack > 0) {
      need(act(seed, 'a', 'rail.footTake', { rack: 2 }) === 1, 'a footing off the railhead rack');
      need(act(seed, 'a', 'rail.footSet', { site: 3 }) === 1, 'a footing set at the jib');
    } else advanceWorks(seed, 1);
  }
  return seedDoc(seed);
}

/** A seed's world as the save the real host writes (as server/src/seeds/build.ts does for the catalog's stages). */
export async function seedDoc(seed: Seed) {
  const dataDir = await fs.mkdtemp(path.join(os.tmpdir(), 'boogle-seed-'));
  try {
    const roomId = railwayRoomId('seed');
    const store = createStore({ dataDir, maxRooms: 1 });
    await store.init();
    const host = createRailwayWorldHost({ roomId, store, tick: false, now: () => Date.now(), pidOf: () => 'a' });
    try {
      await host.whenReady();
      while (host.sync.world.tick <= seed.t) host.step(0.1);
      await host.sync.whenDurable();
      host.rules.railway.world().load(JSON.parse(JSON.stringify(seed.w.snapshot())), railwayCheck);
      host.rules.railway.touchAll();
      await host.close({ save: true });
    } finally {
      await host.close({ save: false });
    }
    const doc = await store.read(roomId);
    if (!doc) throw new Error('ring-set: the host saved nothing');
    return { tick: doc.tick, data: doc.data };
  } finally {
    await fs.rm(dataDir, { recursive: true, force: true });
  }
}

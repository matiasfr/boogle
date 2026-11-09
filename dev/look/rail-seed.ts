// Accepted railway beats written through the real host's save path before a look opens its room.
import { pathToFileURL } from 'node:url';
import { createStore } from '../../server/src/store.ts';
import { createRailwayWorldHost } from '../../server/src/host/world-host.ts';
import { railwayRoomId } from '../../src/world/railway-namespace.ts';
import { railwayCheck } from '../../src/sim/railway-world.ts';
import { railwayAtQ5, type RailSeedStage } from '../../test/helpers/railway-q2.ts';
import { worldOf } from '../../test/railway-live.ts';

export async function writeRailSeed(dataDir: string, room: string, stage: string) {
  if (!['q4-done', 'sea-open', 'q5-stocked', 'q5-finishing', 'q5-done'].includes(stage))
    throw new Error(`Unknown railway seed: ${stage}`);
  const w = railwayAtQ5(stage as RailSeedStage);
  const store = createStore({ dataDir, maxRooms: 2 });
  await store.init();
  const host = createRailwayWorldHost({
    roomId: railwayRoomId(room),
    store,
    tick: false,
    now: () => Date.now(),
    pidOf: () => 'a',
  });
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
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = process.argv.slice(2);
  const stage = args[0],
    dataDir = args[args.indexOf('--data-dir') + 1],
    room = args[args.indexOf('--room') + 1];
  if (!stage || !args.includes('--data-dir') || !dataDir || !args.includes('--room') || !room)
    throw new Error('Use rail-seed.ts <stage> --data-dir <dir> --room <name>');
  await writeRailSeed(dataDir, room, stage);
}

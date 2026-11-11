// Accepted railway beats written through the real host's save path before a look opens its room: the same seed doc the
// server's jump-ins write (server/src/seeds/build.ts, from src/sim/railway-seeds.ts), into the look stack's store.
import { pathToFileURL } from 'node:url';
import { createStore } from '../../server/src/store.ts';
import { buildSeedDoc } from '../../server/src/seeds/build.ts';
import { railwayRoomId } from '../../src/world/railway-namespace.ts';
import { isSeedStage } from '../../src/sim/railway-seeds.ts';
import { SERVER_ID } from '../../src/net/ids.ts';
import { buildRingMidDoc, ringMidStage } from './ring-mid-seed.ts';

export async function writeRailSeed(dataDir: string, room: string, stage: string) {
  const mid = ringMidStage(stage);
  if (mid === null && !isSeedStage(stage)) throw new Error(`Unknown railway seed: ${stage}`);
  const doc = mid !== null ? await buildRingMidDoc(Number(mid)) : await buildSeedDoc(stage as never);
  const store = createStore({ dataDir, maxRooms: 2 });
  await store.init();
  const result = await store.write(railwayRoomId(room), {
    ...doc,
    writerId: SERVER_ID,
    updatedAt: new Date().toISOString(),
  });
  if (result.status !== 200) throw new Error(`rail seed ${stage}: the store refused it (${result.status})`);
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

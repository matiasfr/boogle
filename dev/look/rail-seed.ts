// Accepted railway beats written through the real host's save path before a look opens its room.
import { pathToFileURL } from 'node:url';
import { createStore } from '../../server/src/store.ts';
import { createRailwayWorldHost } from '../../server/src/host/world-host.ts';
import { railwayRoomId } from '../../src/world/railway-namespace.ts';
import { railwayCheck } from '../../src/sim/railway-world.ts';
import {
  act,
  advance,
  logs,
  rails,
  railwayAtQ2,
  railwayAtQ4,
  railwayAtQ5,
  type RailSeedStage,
} from '../../test/helpers/railway-q2.ts';
import { line2Schedule } from '../../src/sim/railway-line2.ts';
import { CART_PHASE, cartCycleTicks } from '../../src/sim/railway-cart.ts';
import { createRailway, railSession, railApply, railTick, worldOf } from '../../test/railway-live.ts';

export async function writeRailSeed(dataDir: string, room: string, stage: string) {
  if (
    ![
      'awake',
      'q1-done',
      'q3-done',
      'hook-earned',
      'q2-stocked',
      'q3-stocked',
      'q4-stocked',
      'q5-carry',
      'q4-done',
      'sea-open',
      'q5-stocked',
      'q5-finishing',
      'q5-done',
    ].includes(stage)
  )
    throw new Error(`Unknown railway seed: ${stage}`);
  const w =
    stage === 'awake'
      ? { s: createRailway(), t: 40 }
      : stage === 'q1-done' || stage === 'q2-stocked' || stage === 'q3-stocked'
        ? railwayAtQ2()
        : stage === 'q3-done' || stage === 'q4-stocked' || stage === 'hook-earned'
          ? railwayAtQ4()
          : railwayAtQ5(stage === 'q5-carry' ? 'q5-stocked' : (stage as RailSeedStage));
  if (stage === 'hook-earned') act(w, 'a', 'rail.hook');
  if (stage === 'awake') {
    railSession(w.s, 'a', 1);
    railApply(w.s, 'a', { op: 'rail.wake', epoch: 1, request: 1 }, 0);
    for (let tick = 1; tick <= w.t; tick++) railTick(w.s, tick);
  }
  if (stage === 'q3-stocked') {
    logs(w, 'a', 'Q2', 24);
    rails(w, 'b', 'Q2', 12);
    advance(w, line2Schedule(1, w.s.line2!.jobs[1]!).totalTicks);
  }
  if (stage === 'q4-stocked') act(w, 'a', 'rail.lever');
  if (['q2-stocked', 'q3-stocked', 'q4-stocked'].includes(stage)) {
    const k = stage === 'q2-stocked' ? 1 : stage === 'q3-stocked' ? 2 : 3;
    let waited = 0;
    while (!(
      w.s.line2!.depot > 0 &&
      w.s.line2!.cart.phase === CART_PHASE.DROP &&
      (k < 3 || w.s.line2!.depotRails > 0)
    )) {
      if (waited++ > 3 * cartCycleTicks(k)) throw new Error(`${stage}: cart never unloaded`);
      advance(w, 1);
    }
  }
  // The rail bill is full while the log bill remains open: a log deposit must leave carried rails visible.
  if (stage === 'q5-carry') rails(w, 'b', 'Q5', 24);
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

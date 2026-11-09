// Accepted railway beats written through the real host's save path before a look opens its room.
import { railwayAtTrains, TRAIN_STAGES, type TrainStage } from '../../test/helpers/railway-trains.ts';
import { chopTo, railwayAtWorks, WORKS_STAGES, type WorksStage } from '../../test/helpers/railway-works.ts';
import { WORKS, WORKS_ROCKS } from '../../src/sim/railway-works-layout.ts';
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
import { CART_PHASE, CART_ROAD, cartCycleTicks } from '../../src/sim/railway-cart.ts';
import { createRailway, railSession, railApply, railTick, worldOf } from '../../test/railway-live.ts';

export async function writeRailSeed(dataDir: string, room: string, stage: string) {
  // B5-B8 stages stay separate from the earlier/depot fixture blocks.
  const trainStage = TRAIN_STAGES.includes(stage as TrainStage);
  // Split-rock Works and the Roundhouse (J3f), built on `q6-done`.
  // `works-stocked` (look only, J4): `works-open` with the kiln a few stone short and those left in rock 3, so a
  // look's bot can chop it, fill the kiln and see it light live.
  const stocked = stage === 'works-stocked';
  const worksStage = stocked || WORKS_STAGES.includes(stage as WorksStage);
  if (
    !trainStage &&
    !worksStage &&
    ![
      'awake',
      'q1-done',
      'q3-done',
      'hook-earned',
      'q2-stocked',
      'q2-arriving',
      'q3-stocked',
      'q4-stocked',
      'q4-arriving',
      'q5-carry',
      'q4-done',
      'sea-open',
      'q5-stocked',
      'q5-finishing',
      'q5-done',
    ].includes(stage)
  )
    throw new Error(`Unknown railway seed: ${stage}`);
  const w = worksStage
    ? railwayAtWorks(stocked ? 'works-open' : (stage as WorksStage))
    : trainStage
      ? railwayAtTrains(stage as TrainStage)
      : stage === 'awake'
        ? { s: createRailway(), t: 40 }
        : stage === 'q1-done' || stage === 'q2-stocked' || stage === 'q2-arriving' || stage === 'q3-stocked'
          ? railwayAtQ2()
          : stage === 'q3-done' || stage === 'q4-stocked' || stage === 'q4-arriving' || stage === 'hook-earned'
            ? railwayAtQ4()
            : railwayAtQ5(stage === 'q5-carry' ? 'q5-stocked' : (stage as RailSeedStage));
  if (stocked) {
    chopTo(w, 'a', WORKS.kilnLogs);
    if (act(w, 'a', 'rail.kiln') !== WORKS.kilnLogs) throw new Error('works-stocked: logs');
    for (const rock of WORKS_ROCKS) {
      const keep = rock.id === WORKS_ROCKS[0].id ? 3 : 0;
      while (w.s.line!.rocks[rock.id]! > keep) act(w, 'b', 'rail.mine', { id: rock.id });
    }
    const left = w.s.line!.rocks[WORKS_ROCKS[0].id]!;
    if (left < 1) throw new Error('works-stocked: stone left in rock 3');
    if (act(w, 'b', 'rail.kiln') !== WORKS.kilnStone - left) throw new Error('works-stocked: stone');
  }
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
  if (stage === 'q4-stocked' || stage === 'q4-arriving') act(w, 'a', 'rail.lever');
  if (stage === 'q2-arriving' || stage === 'q4-arriving') {
    const k = stage === 'q2-arriving' ? 1 : 3;
    let waited = 0;
    // Q4 can inherit a timber-only cart already en route; its later steel delivery exercises the shelf flight.
    while (!(
      w.s.line2!.cart.phase === CART_PHASE.RUN &&
      w.s.line2!.cart.to === CART_ROAD.rackCm(k) &&
      (k < 3 || w.s.line2!.cart.rails > 0)
    )) {
      if (waited++ > 3 * cartCycleTicks(k)) throw new Error(`${stage}: cart never approached`);
      advance(w, 1);
    }
  }
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

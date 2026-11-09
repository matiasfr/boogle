// Railway seeds: worlds at a stage of the route, built from accepted sim ops only (no direct state writes), for the
// server's jump-ins (server/src/seeds/, docs/plans/playtest-jump-in.md), look's --rail-seed and the rule tests
// (test/helpers/railway-*.ts re-export them; the builders are in ./railway-seed-route.ts and ./railway-seed-works.ts). Never imported by the game, rules or adapters. The state is an E world
// behind ./railway-live.ts's read-only view.
//
// Adding a stage, as content lands:
// 1. Add the id to SEED_STAGES (route order) and its case to buildSeedWorld, using accepted ops only.
// 2. If the owner should be able to jump there, add a JUMPS row with a label (src/world/railway-jump.ts); its wording
//    goes to the designer, and the call is logged in docs/agent-calls.md.
// 3. Run `npm run checkpoints -- <stage>`. With no arguments, checkpoints builds the routed stages and every JUMPS stage.
import { createRailway, need, railApply, railSession, railTick } from './railway-live.ts';
import { line2Schedule } from './railway-line2.ts';
import { CART_PHASE, CART_ROAD, cartCycleTicks } from './railway-cart.ts';
import { WORKS, WORKS_ROCKS } from './railway-works-layout.ts';
import {
  act,
  advance,
  logs,
  rails,
  railwayAtHook,
  railwayAtQ2,
  railwayAtQ4,
  railwayAtQ5,
  railwayAtTrains,
  TRAIN_STAGES,
  type RailSeedStage,
  type TrainStage,
  type World,
} from './railway-seed-route.ts';
import { chopTo, railwayAtWorks, WORKS_STAGES, type WorksStage } from './railway-seed-works.ts';

export * from './railway-seed-route.ts';

/** Every stage a seed can be built at, in route order (test/railway-jump.test.ts checks it holds TRAIN_STAGES and
 * WORKS_STAGES). */
export const SEED_STAGES = [
  'awake',
  'q1-done',
  'q2-stocked',
  'q2-arriving',
  'hook-taken',
  'q3-stocked',
  'q3-done',
  'q4-stocked',
  'q4-arriving',
  'hook-earned',
  'q4-done',
  'q5-arriving',
  'q5-shelved',
  'sea-open',
  'q5-stocked',
  'q5-carry',
  'q5-finishing',
  'q5-done',
  'glide-earned',
  'boiler',
  'boiler-camp',
  'trains-on',
  'q6-stocked',
  'q6-finishing',
  'q6-done',
  'works-arrive',
  'works-open',
  'works-stocked',
  'works-lit',
  'stall-done',
  'cradle-fitted',
  'wagon-on',
  'crossing-finishing',
  'crossing-done',
] as const;
export type SeedStage = (typeof SEED_STAGES)[number];
const Q5_STAGES: readonly string[] = ['q4-done', 'sea-open', 'q5-stocked', 'q5-finishing', 'q5-done'];
export const isSeedStage = (stage: string): stage is SeedStage => (SEED_STAGES as readonly string[]).includes(stage);

/** The world at a seed stage: what the host saves for a jump-in or a look's --rail-seed. */
export function buildSeedWorld(stage: SeedStage): World {
  if (stage === 'awake') {
    const w = { s: createRailway(), t: 40 };
    railSession(w.s, 'a', 1);
    railApply(w.s, 'a', { op: 'rail.wake', epoch: 1, request: 1 }, 0);
    for (let tick = 1; tick <= w.t; tick++) railTick(w.s, tick);
    return w;
  }
  if (stage === 'hook-taken') return railwayAtHook();
  if ((TRAIN_STAGES as readonly string[]).includes(stage)) return railwayAtTrains(stage as TrainStage);
  if (stage === 'works-stocked') {
    // Look only (J4): `works-open` with the kiln a few stone short and those left in rock 3, so a look's bot can chop
    // it, fill the kiln and see it light live.
    const w = railwayAtWorks('works-open');
    chopTo(w, 'a', WORKS.kilnLogs);
    need(act(w, 'a', 'rail.kiln') === WORKS.kilnLogs, 'works-stocked: logs');
    for (const rock of WORKS_ROCKS) {
      const keep = rock.id === WORKS_ROCKS[0].id ? 3 : 0;
      while (w.s.line!.rocks[rock.id]! > keep) act(w, 'b', 'rail.mine', { id: rock.id });
    }
    const left = w.s.line!.rocks[WORKS_ROCKS[0].id]!;
    need(left >= 1, 'works-stocked: stone left in rock 3');
    need(act(w, 'b', 'rail.kiln') === WORKS.kilnStone - left, 'works-stocked: stone');
    return w;
  }
  if ((WORKS_STAGES as readonly string[]).includes(stage)) return railwayAtWorks(stage as WorksStage);
  if (stage === 'q1-done' || stage === 'q2-stocked' || stage === 'q2-arriving' || stage === 'q3-stocked') {
    const w = railwayAtQ2();
    if (stage === 'q3-stocked') {
      logs(w, 'a', 'Q2', 24);
      rails(w, 'b', 'Q2', 12);
      advance(w, line2Schedule(1, w.s.line2!.jobs[1]!).totalTicks);
    }
    if (stage === 'q2-arriving') cartApproaches(w, stage, 1);
    if (stage === 'q2-stocked' || stage === 'q3-stocked') cartUnloads(w, stage, stage === 'q2-stocked' ? 1 : 2);
    return w;
  }
  if (stage === 'q3-done' || stage === 'q4-stocked' || stage === 'q4-arriving' || stage === 'hook-earned') {
    const w = railwayAtQ4();
    if (stage === 'hook-earned') act(w, 'a', 'rail.hook');
    if (stage === 'q4-stocked' || stage === 'q4-arriving') act(w, 'a', 'rail.lever');
    if (stage === 'q4-arriving') cartApproaches(w, stage, 3);
    if (stage === 'q4-stocked') cartUnloads(w, stage, 3);
    return w;
  }
  // Glider piece B: the room has taken the glider (the dev grant's replacement); and, look only, Q5's single 24-rail
  // shipment on its way and on the shelf.
  if (stage === 'glide-earned') {
    const w = railwayAtQ5('q5-done');
    need(act(w, 'a', 'rail.glide') === 1, 'glide-earned: the take');
    return w;
  }
  if (stage === 'q5-arriving' || stage === 'q5-shelved') {
    const w = railwayAtQ5('q4-done');
    if (stage === 'q5-arriving') cartApproaches(w, stage, 4);
    else {
      let waited = 0;
      while (!(w.s.line2!.cart.phase === CART_PHASE.DROP && w.s.line2!.depotRails === 24)) {
        need(waited++ <= 3 * cartCycleTicks(4), 'q5-shelved: cart never unloaded 24 rails');
        advance(w, 1);
      }
    }
    return w;
  }
  const q5 = stage === 'q5-carry' ? 'q5-stocked' : stage;
  need(Q5_STAGES.includes(q5 as RailSeedStage), `Unknown railway seed: ${stage}`);
  const w = railwayAtQ5(q5 as RailSeedStage);
  // The rail bill is full while the log bill remains open: a log deposit must leave carried rails visible.
  if (stage === 'q5-carry') rails(w, 'b', 'Q5', 24);
  return w;
}
// Q4 can inherit a timber-only cart already en route; its later steel delivery exercises the shelf flight. Q5's one
// shipment carries all 24 of its rails.
function cartApproaches(w: World, stage: string, k: number) {
  let waited = 0;
  while (!(
    w.s.line2!.cart.phase === CART_PHASE.RUN &&
    w.s.line2!.cart.to === CART_ROAD.rackCm(k) &&
    (k < 3 || w.s.line2!.cart.rails >= (k === 4 ? 24 : 1))
  )) {
    need(waited++ <= 3 * cartCycleTicks(k), `${stage}: cart never approached`);
    advance(w, 1);
  }
}
function cartUnloads(w: World, stage: string, k: number) {
  let waited = 0;
  while (!(w.s.line2!.depot > 0 && w.s.line2!.cart.phase === CART_PHASE.DROP && (k < 3 || w.s.line2!.depotRails > 0))) {
    need(waited++ <= 3 * cartCycleTicks(k), `${stage}: cart never unloaded`);
    advance(w, 1);
  }
}

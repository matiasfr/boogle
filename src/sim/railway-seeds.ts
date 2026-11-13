// Railway seeds: worlds at a stage of the route, built from accepted sim ops only (no direct state writes), for the
// server's jump-ins (server/src/seeds/, docs/plans/playtest-jump-in.md), look's --rail-seed and the rule tests
// (test/helpers/rail.ts re-exports them; the builders are in ./railway-seed-route.ts, ./railway-seed-works.ts, ./railway-seed-ring.ts, ./railway-seed-steel.ts and ./railway-seed-trade.ts). Never
// imported by the game, rules or adapters. A seed is an E world and its tick, driven by ./railway-drive.ts.
//
// Adding a stage, as content lands:
// 1. Add the id to SEED_STAGES (route order) and its case to buildSeedWorld, using accepted ops only.
// 2. If the owner should be able to jump there, add a JUMPS row with a label (src/world/railway-jump.ts); its wording
//    goes to the designer, and the call is logged in docs/agent-calls.md.
// 3. Run `npm run checkpoints -- <stage>`. With no arguments, checkpoints builds the routed stages and every JUMPS stage.
import { apply, createRailway, need } from './railway-drive.ts';
import { railTick } from './railway-systems.ts';
import { railSession } from './railway-sys-core.ts';
import { cart, rail, rock } from './railway-rows.ts';
import { CART_PHASE, CART_ROAD, cartCycleTicks } from './railway-cart.ts';
import { WORKS, WORKS_ROCKS } from './railway-works-layout.ts';
import {
  act,
  advance,
  layTicks,
  logs,
  rails,
  railwayAtHook,
  railwayAtQ2,
  railwayAtQ4,
  railwayAtQ5,
  railwayAtTrains,
  TRAIN_STAGES,
  type RailSeedStage,
  type Seed,
  type TrainStage,
} from './railway-seed-route.ts';
import { chopTo, railwayAtWorks, WORKS_STAGES, type WorksStage } from './railway-seed-works.ts';
import { railwayAtRing, RING_STAGES, type RingStage } from './railway-seed-ring.ts';
import { railwayAtTrade, TRADE_STAGES, type TradeStage } from './railway-seed-trade.ts';
import { railwayAtSteel, STEEL_STAGES, type SteelStage } from './railway-seed-steel.ts';
import { LEG_STAGES, railwayAtLegs, type LegStage } from './railway-seed-legs.ts';

export * from './railway-seed-route.ts';

/** Every stage a seed can be built at, in route order (test/railway-jump.test.ts checks it holds TRAIN_STAGES,
 * WORKS_STAGES, RING_STAGES, STEEL_STAGES and LEG_STAGES; test/railway-trade.test.ts that it holds TRADE_STAGES). */
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
  // Slice 5 (./railway-seed-trade.ts): trains-on with the first timber home; then the first fares.
  'freight-running',
  'fares-running',
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
  'deck-laid',
  'gap-footed',
  'leaf-raised',
  'ring-joined',
  // Ring Island build 2 (./railway-seed-steel.ts): the steel works and the install.
  'steel-kit',
  'steel-lit',
  'steel-home',
  'boiler-long',
  // The greybox route's leg 1 (./railway-seed-legs.ts): the stack line to High Gorge.
  'gorge-open',
  'gorge-mid',
  'gorge-reached',
] as const;
export type SeedStage = (typeof SEED_STAGES)[number];
const Q5_STAGES: readonly string[] = ['q4-done', 'sea-open', 'q5-stocked', 'q5-finishing', 'q5-done'];
export const isSeedStage = (stage: string): stage is SeedStage => (SEED_STAGES as readonly string[]).includes(stage);

/** The world at a seed stage: what the host saves for a jump-in or a look's --rail-seed. */
export function buildSeedWorld(stage: SeedStage): Seed {
  if (stage === 'awake') {
    const s = { w: createRailway(), t: 40 };
    railSession(s.w, 'a', 1);
    apply(s.w, 'a', { op: 'rail.wake', epoch: 1, request: 1 }, 0);
    for (let tick = 1; tick <= s.t; tick++) railTick(s.w, tick);
    return s;
  }
  if (stage === 'hook-taken') return railwayAtHook();
  if ((TRAIN_STAGES as readonly string[]).includes(stage)) return railwayAtTrains(stage as TrainStage);
  if (stage === 'works-stocked') {
    // Look only (J4): `works-open` with the kiln a few stone short and those left in rock 3, so a look's bot can chop
    // it, fill the kiln and see it light live.
    const s = railwayAtWorks('works-open');
    chopTo(s, 'a', WORKS.kilnLogs);
    need(act(s, 'a', 'rail.kiln') === WORKS.kilnLogs, 'works-stocked: logs');
    for (const spot of WORKS_ROCKS) {
      const keep = spot.id === WORKS_ROCKS[0].id ? 3 : 0;
      while (rock(s.w, spot.id).left > keep) act(s, 'b', 'rail.mine', { id: spot.id });
    }
    const left = rock(s.w, WORKS_ROCKS[0].id).left;
    need(left >= 1, 'works-stocked: stone left in rock 3');
    need(act(s, 'b', 'rail.kiln') === WORKS.kilnStone - left, 'works-stocked: stone');
    return s;
  }
  if ((WORKS_STAGES as readonly string[]).includes(stage)) return railwayAtWorks(stage as WorksStage);
  if ((RING_STAGES as readonly string[]).includes(stage)) return railwayAtRing(stage as RingStage);
  if ((TRADE_STAGES as readonly string[]).includes(stage)) return railwayAtTrade(stage as TradeStage);
  if ((STEEL_STAGES as readonly string[]).includes(stage)) return railwayAtSteel(stage as SteelStage);
  if ((LEG_STAGES as readonly string[]).includes(stage)) return railwayAtLegs(stage as LegStage);
  if (stage === 'q1-done' || stage === 'q2-stocked' || stage === 'q2-arriving' || stage === 'q3-stocked') {
    const s = railwayAtQ2();
    if (stage === 'q3-stocked') {
      logs(s, 'a', 'Q2', 24);
      rails(s, 'b', 'Q2', 12);
      advance(s, layTicks(s.w, 1));
    }
    if (stage === 'q2-arriving') cartApproaches(s, stage, 1);
    if (stage === 'q2-stocked' || stage === 'q3-stocked') cartUnloads(s, stage, stage === 'q2-stocked' ? 1 : 2);
    return s;
  }
  if (stage === 'q3-done' || stage === 'q4-stocked' || stage === 'q4-arriving' || stage === 'hook-earned') {
    const s = railwayAtQ4();
    if (stage === 'hook-earned') act(s, 'a', 'rail.hook');
    if (stage === 'q4-stocked' || stage === 'q4-arriving') act(s, 'a', 'rail.lever');
    if (stage === 'q4-arriving') cartApproaches(s, stage, 3);
    if (stage === 'q4-stocked') cartUnloads(s, stage, 3);
    return s;
  }
  // Glider piece B: the room has taken the glider (the dev grant's replacement); and, look only, Q5's single 24-rail
  // shipment on its way and on the shelf.
  if (stage === 'glide-earned') {
    const s = railwayAtQ5('q5-done');
    need(act(s, 'a', 'rail.glide') === 1, 'glide-earned: the take');
    return s;
  }
  if (stage === 'q5-arriving' || stage === 'q5-shelved') {
    const s = railwayAtQ5('q4-done');
    if (stage === 'q5-arriving') cartApproaches(s, stage, 4);
    else {
      let waited = 0;
      while (!(cart(s.w).phase === CART_PHASE.DROP && rail(s.w).depotRails === 24)) {
        need(waited++ <= 3 * cartCycleTicks(4), 'q5-shelved: cart never unloaded 24 rails');
        advance(s, 1);
      }
    }
    return s;
  }
  const q5 = stage === 'q5-carry' ? 'q5-stocked' : stage;
  need(Q5_STAGES.includes(q5 as RailSeedStage), `Unknown railway seed: ${stage}`);
  const s = railwayAtQ5(q5 as RailSeedStage);
  // The rail bill is full while the log bill remains open: a log deposit must leave carried rails visible.
  if (stage === 'q5-carry') rails(s, 'b', 'Q5', 24);
  return s;
}
// Q4 can inherit a timber-only cart already en route; its later steel delivery exercises the shelf flight. Q5's one
// shipment carries all 24 of its rails.
function cartApproaches(s: Seed, stage: string, k: number) {
  let waited = 0;
  while (!(
    cart(s.w).phase === CART_PHASE.RUN &&
    cart(s.w).to === CART_ROAD.rackCm(k) &&
    (k < 3 || cart(s.w).rails >= (k === 4 ? 24 : 1))
  )) {
    need(waited++ <= 3 * cartCycleTicks(k), `${stage}: cart never approached`);
    advance(s, 1);
  }
}
function cartUnloads(s: Seed, stage: string, k: number) {
  let waited = 0;
  while (!(rail(s.w).depot > 0 && cart(s.w).phase === CART_PHASE.DROP && (k < 3 || rail(s.w).depotRails > 0))) {
    need(waited++ <= 3 * cartCycleTicks(k), `${stage}: cart never unloaded`);
    advance(s, 1);
  }
}

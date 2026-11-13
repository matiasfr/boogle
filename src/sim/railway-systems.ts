// The railway's rules as E systems (docs/plans/ecs-e.md, section 4; docs/plans/ecs-migration-railway.md, section 2):
// the index. The systems live by domain in ./railway-sys-core.ts, -line1, -line2, -trains, -works, -away and -trade, the
// facts they share in ./railway-queries.ts. This file holds the dispatch and the order: the `OPS` table (line one's
// system first, then line two's when line one moved nothing, as railLineApply || railLine2Apply did), the tick
// schedule and `RAIL_SYSTEMS`. Pure; the server runs them on arrival and a client's prediction runs the very same ones
// on a clone of its mirror. The other entry points live beside their systems and are imported from there (M3b):
// railSession and railSettle (-core), the beam's (-line1), the boiler's (-line2), the footing's (-works), railResume
// and railSupplyPulse (-away), railLine2Active (./railway-queries.ts).
//
//   railApply(w, pid, e, tick, timing)   one action: receipt, the op, remember (the request history)
//   railOutcome(w, pid, epoch, request)  the receipt: a request's recorded result, snapshot-required, or null
//   railTick(w, tick, headPct, ...)      the rule tick, a schedule: line one's job, line two's forge and job, the depot
//                                        cart's trip (./railway-cart.ts), the yards' crates (./railway-sys-trade.ts),
//                                        every line's trains (./railway-trains.ts) with their yard freight and
//                                        line 2's kit and footing wagon, the Works kiln's casts
//                                        (./railway-works.ts), the steel works' casts (./railway-sys-steel.ts),
//                                        the job clocks, the greybox route's lay clock (./railway-sys-route.ts)
import { createSchedule, type System, type World } from '../ecs/index.ts';
import { LINE_TIMING } from './railway-line.ts';
import type { LineTiming } from './railway-line-schedule.ts';
import { TRAIN_HEAD_PCT, TRAIN_HOLD, type TrainHold } from './railway-trains.ts';
import type { RailAction } from './railway.ts';
import type { RailResult } from './railway.ts';
import { Account } from './railway-components.ts';
import { jobClock, receipt, remember, session, wake, type Act } from './railway-sys-core.ts';
import {
  axe,
  beamChop,
  beamDeposit,
  beamDrop,
  beamPutDown,
  beamRelease,
  beamStood,
  beamTake,
  chop,
  deposit,
  drop,
  jump,
  lineTick,
  mine,
  rackTake,
  take,
} from './railway-sys-line1.ts';
import {
  boilerDrop,
  boilerFit,
  boilerPutDown,
  boilerStood,
  boilerTake,
  cartTick,
  deposit2,
  depotRailTake,
  depotTake,
  forgeTake,
  glide,
  hook,
  lever,
  line2Tick,
  pack,
  seaSwitch,
} from './railway-sys-line2.ts';
import { call, trainTick } from './railway-sys-trains.ts';
import { breaker, cradle, footRelease, footSet, footTake, kiln, strike, turn, worksTick } from './railway-sys-works.ts';
import { legKitRelease } from './railway-sys-route-kit.ts';
import { resume, supply } from './railway-sys-away.ts';
import { brace, ringFootSet, ringFootTake, ringStrike } from './railway-sys-ring.ts';
import { tradeTick, yardTick } from './railway-sys-trade.ts';
import { TRADE_PCT, type TradePct } from './railway-trade-layout.ts';
import { install, steelFeed, steelTake, steelTick } from './railway-sys-steel.ts';
import { arrive, gate, grant, legStock, legTick } from './railway-sys-route.ts';

/** The systems for each op, in the order they are tried: the first that moves something answers. */
// An op system that reads no action (the axe, the jump, the lever, the hook, the glider) takes it all the same.
const OPS: Record<string, readonly System<never, number>[]> = {
  'rail.wake': [wake],
  'rail.chop': [chop],
  'rail.mine': [mine],
  'rail.deposit': [deposit, deposit2],
  'rail.drop': [drop],
  'rail.take': [take],
  'rail.rackTake': [rackTake],
  'rail.axe': [axe],
  'rail.beamChop': [beamChop],
  'rail.beamTake': [beamTake],
  'rail.beamDrop': [beamDrop],
  'rail.beamDeposit': [beamDeposit],
  'rail.jump': [jump],
  'rail.forgeTake': [forgeTake],
  'rail.depotTake': [depotTake],
  'rail.lever': [lever],
  'rail.seaSwitch': [seaSwitch],
  'rail.hook': [hook],
  'rail.glide': [glide],
  'rail.depotRailTake': [depotRailTake],
  'rail.pack': [pack],
  'rail.boilerTake': [boilerTake],
  'rail.boilerDrop': [boilerDrop],
  'rail.boilerFit': [boilerFit],
  'rail.call': [call],
  'rail.breaker': [breaker],
  'rail.strike': [strike, ringStrike],
  'rail.kiln': [kiln],
  'rail.footTake': [footTake, ringFootTake],
  'rail.footSet': [footSet, ringFootSet],
  'rail.cradle': [cradle],
  'rail.turn': [turn],
  // Ring Island (v27, ./railway-sys-ring.ts): the rivet, the railhead rack and jib above, and the leaf's brace.
  'rail.brace': [brace],
  // Ring Island build 2 (./railway-sys-steel.ts): the kit off the island yard, and the steel works' bill.
  'rail.steelTake': [steelTake],
  'rail.steel': [steelFeed],
  // The longer boiler for line 2, once steel is home (R3).
  'rail.install': [install],
  // The greybox route (./railway-sys-route.ts): a leg's frame, a pickup, a barrier, the meeting.
  'rail.legStock': [legStock],
  'rail.grant': [grant],
  'rail.gate': [gate],
  'rail.arrive': [arrive],
};

export function railOutcome(w: World, pid: string, epoch: number, request: number): RailResult | null {
  return w.run(receipt, { pid, epoch, request });
}
/** All transfers recheck capacity at application, after preceding actions. */
export function railApply(w: World, pid: string, e: RailAction, tick: number, timing: LineTiming = LINE_TIMING) {
  const previous = railOutcome(w, pid, e.epoch, e.request);
  // A pid with no account never gets past here: the server refuses its action as 'session' before applying it, and
  // the receipt answers 'snapshot-required' to any other caller.
  if (previous) return previous;
  const a = w.lookup(Account, pid)!;
  let n = 0;
  for (const sys of Object.hasOwn(OPS, e.op) ? OPS[e.op]! : [])
    if ((n = w.run(sys as System<Act, number>, { a, e, tick, timing }))) break;
  return w.run(remember, { a, e, n, rejected: e.op === 'rail.reject' });
}

/** The rule tick's systems, run by (order, name): the order `railTick` ran them in by hand before M3. */
export const RAIL_TICK: readonly System<never, unknown>[] = [
  lineTick,
  line2Tick,
  cartTick,
  // Slice 5's yards (./railway-sys-trade.ts), between the cart and the trains.
  yardTick,
  trainTick,
  // Slice 5 R3's riders, after the trains.
  tradeTick,
  worksTick,
  steelTick,
  jobClock,
  // The greybox route's lay clock (order 1.5: after line two's, before the trains).
  legTick,
];
const TICK = createSchedule(RAIL_TICK);
/** The rule tick; `headPct` is the room's railTrainHeadPct (the trains' headway hold), `trade` its railFarePct and
 * railRiderPct (slice 5 R3), `hold` its railTrainHoldCap and railTrainHoldPct (the Ring Island hold). */
export function railTick(
  w: World,
  tick: number,
  headPct = TRAIN_HEAD_PCT,
  trade: TradePct = TRADE_PCT,
  hold: TrainHold = TRAIN_HOLD,
) {
  TICK.run(w, 'tick', {
    tick,
    headPct,
    farePct: trade.farePct,
    riderPct: trade.riderPct,
    holdCap: hold.cap,
    holdPct: hold.pct,
  });
}
/** The systems the server and the host call by name (lifecycle, the request history and absent carriers). The job
 * clock is the tick's, and also runs after an applied action (railSettle) and a resume. */
export const RAIL_ENTRIES: readonly System<never, unknown>[] = [
  receipt,
  remember,
  resume,
  session,
  supply,
  beamRelease,
  beamStood,
  beamPutDown,
  boilerStood,
  boilerPutDown,
  footRelease,
  legKitRelease,
];
/** The op table, by op name. */
export const RAIL_OPS: Readonly<Record<string, readonly System<never, number>[]>> = OPS;
/** Every railway system: the op table's, the tick's and the entry points' (each once: test/railway-census.test.ts). */
export const RAIL_SYSTEMS: readonly System<never, unknown>[] = [
  ...Object.values(OPS).flat(),
  ...RAIL_TICK,
  ...RAIL_ENTRIES,
];

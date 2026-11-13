// The trains' systems (docs/plans/ecs-migration-railway.md, section 2): a stop request, and the trains' step
// (./railway-trains.ts) with the world's side of it: line 2's kits (Q6's to Far Head, Q7's to the Pier, then the steel
// works' to Ring Island and its steel home: ./railway-sys-steel.ts), the footing wagon (the pier's twelve to the Pier,
// then Ring Island's to the Railhead) and the cart's hold on line 1.
import { defineSystem, type World } from '../ecs/index.ts';
import { LINE2_KIT } from './railway-line2-layout.ts';
import { CART_PHASE } from './railway-cart.ts';
import { TRAIN, TRAIN_PHASE, reqAdd, reqHas, trainDir, trainPassesBy, type ServiceStop } from './railway-train.ts';
import { LINE2, RAIL_HALTS, RAIL_LINES, RAIL_TRAINS } from './railway-lines.ts';
import { LINE_SLOTS, atEnd, trainStepLine, type TrainHold, type TrainIO, type TrainMoveIO } from './railway-trains.ts';
import { WORKS } from './railway-works-layout.ts';
import { railInt } from './railway.ts';
import {
  Account,
  Aperture,
  Cart,
  DEPOT_OUT,
  Forge,
  Line,
  QJob,
  Rail,
  Shed,
  Town,
  Steel,
  Train,
  Works,
  Yard,
  Till,
  Leg,
} from './railway-components.ts';
import {
  apertureId,
  cartId,
  depotNeed,
  footingsOwed,
  footOwed,
  forgeId,
  kitJob,
  kitOwed,
  kitStop,
  lineId,
  q7Laid,
  qjobId,
  railId,
  ringJoined,
  shedId,
  stopsOf,
  trainId,
  wagonSlot,
  worksId,
  type Row,
} from './railway-queries.ts';
import type { Act, Tick } from './railway-sys-core.ts';
import { freightArrives, freightLoads, ridersArrive, ridersBoard } from './railway-sys-trade.ts';
import { freightStop } from './railway-queries-trade.ts';
import type { TradePct } from './railway-trade-layout.ts';
import { boilerAdopt, steelArrives, steelLoads, steelService } from './railway-sys-steel.ts';
import { legKitArrive, legKitLoad, legKitService } from './railway-sys-route-kit.ts';
import { fleetOf } from './railway-train.ts';
import { legKitWaiting, legsLaid } from './railway-queries-route.ts';

/** A stop request (docs/plans/works-late-game.md, step 1; docs/plans/generic-lines.md, 7): one digit per halt per way,
 * so a repeat (or a friend's same ask) moves nothing. From a halt's lever it is the line's (`Line.req`), served by the
 * next train that way that can still brake for it (trainServes); aboard (`train`, the rider's slot) it is that train's
 * own, for a middle halt its way. Never an open end's way in: no train stands at that platform. A train standing at
 * that halt, leaving the way asked, waits a full dwell from now. Never a way the halt refuses (the homeward-only Pier's
 * up way once Q7 is laid: trainPassesBy). */
export const call = defineSystem(
  'rail.call',
  { reads: [Rail, QJob, Aperture, Leg], writes: [Train, Line], phase: 'act', order: 32 },
  (w, { e, tick }: Act) => {
    const halt = railInt(e.id, RAIL_HALTS.length - 1) ? RAIL_HALTS[e.id] : undefined;
    if (!halt || (e.dir !== -1 && e.dir !== 1) || w.get(Rail, railId(w))!.trains < 0) return 0;
    // The pier halt is there once Q6 is laid.
    const stops = stopsOf(w, halt.line),
      n = stops.length,
      dir = e.dir;
    if (halt.stop >= n || (halt.stop === 0 && dir < 0) || (halt.stop === n - 1 && dir > 0)) return 0;
    if (trainPassesBy(halt.line, halt.stop, dir, n)) return 0;
    const wait = (slot: number) => {
      const r = w.get(Train, trainId(w, slot))!;
      // A shed train (the greybox route's fleet) is not in service: never at a platform.
      if (r.phase === TRAIN_PHASE.STAND && r.at === halt.stop && trainDir(r) === dir && tick > r.depart)
        w.mut(Train, trainId(w, slot))!.depart = tick;
    };
    if (e.train !== undefined) {
      if (!railInt(e.train, RAIL_TRAINS.length - 1) || RAIL_TRAINS[e.train]!.line !== halt.line) return 0;
      const r = w.get(Train, trainId(w, e.train))!;
      if (r.phase === TRAIN_PHASE.SHED) return 0;
      if (atEnd(halt.stop, stops) || trainDir(r) !== dir || reqHas(r.req, halt.stop, dir, n)) return 0;
      w.mut(Train, trainId(w, e.train))!.req = reqAdd(r.req, halt.stop, dir, n);
      wait(e.train);
      return 1;
    }
    const l = w.get(Line, lineId(w, halt.line))!;
    if (reqHas(l.req, halt.stop, dir, n)) return 0;
    w.mut(Line, lineId(w, halt.line))!.req = reqAdd(l.req, halt.stop, dir, n);
    LINE_SLOTS[halt.line]!.forEach(wait);
    return 1;
  },
);
/** Line 2's wagon train arriving: at the quarry it loads what the Works rack has and the pier (then, once Q7 is laid,
 * the ring) still needs; at the Pier, until Q7 is laid, it unloads everything onto the pier rack; at the Railhead it
 * unloads onto the railhead rack, up to the rack's room (the rest rides on). One apply each. No ring footing ever
 * reaches the pier rack (call 65): the wagon loads none before Q7 is laid, and unloads none at the Pier after. */
function wagonArrives(w: World, row: Row<typeof Train>) {
  if (!row.wagon) return;
  if (row.at === 1) {
    const works = w.get(Works, worksId(w))!;
    const need = footOwed(w, row.foot);
    const n = Math.min(WORKS.wagonCap - row.foot, works.rack, need);
    if (n <= 0) return;
    w.mut(Works, worksId(w))!.rack -= n;
    row.foot += n;
  } else if (row.at === 3 && row.foot && !q7Laid(w)) {
    w.mut(Works, worksId(w))!.pierRack += row.foot;
    row.foot = 0;
  } else if (row.at === 4 && row.foot) {
    const id = apertureId(w),
      n = Math.min(row.foot, WORKS.wagonCap - w.get(Aperture, id)!.rack);
    if (n <= 0) return;
    w.mut(Aperture, id)!.rack += n;
    row.foot -= n;
  }
}
/** The stops a line 2 train makes with no request (docs/plans/works-late-game.md, step 1): the village going home
 * while the active train-fed job's kit is owed and not aboard, and that job's halt (`kitStop`: Q6's Far Head, Q7's
 * the Pier, call 62) while it is aboard; the quarry going out while its wagon has room and footings are owed; the Pier
 * while its wagon carries the pier's footings (before Q7), the Railhead going out while it carries the ring's. Slice 5's
 * freight clause comes first, on any line (R2b, freightStop): a yard at a middle halt, once its `after` is met, for a
 * homeward train that is empty and on no build errand when a whole trainload waits (never while the wagon is owed
 * footings). Riders add no stop (the ruling of 12 November): they board and step off where a train already stands.
 * Trains run end to end on their track since v26, so no ask can turn one back short of an errand. */
function serviceOf(w: World, slot: number, r: Readonly<Row<typeof Train>>): ServiceStop {
  // Slice 5 R2b: a yard's full-load stop, on any line from its TRADE.yards row (freightStop); the greybox route's kit
  // at its rack, on any line with an open leg (legKitService).
  const route = legKitService(w, slot, r);
  const freight: ServiceStop = (k, dir) => freightStop(w, slot, r, k, dir) || route(k, dir);
  if (RAIL_TRAINS[slot]!.line !== LINE2) return freight;
  return (k, dir) =>
    freight(k, dir) ||
    (k === 0 && dir < 0 && kitOwed(w, r)) ||
    (k === kitStop(w) && r.logs + r.rails > 0) ||
    (k === 1 && dir > 0 && r.wagon && r.foot < WORKS.wagonCap && footOwed(w, r.foot) > 0) ||
    (k === 3 && r.wagon && r.foot > 0 && !q7Laid(w)) ||
    (k === 4 && dir > 0 && r.wagon && r.foot > 0) ||
    steelService(w, r, k, dir);
}
/** The rows a moved end or stop rewrites (endMoved, stopMoved in ./railway-trains.ts), over the world's Train rows and
 * open stops (read after the change that moved them). */
export function trainMoveIO(w: World): TrainMoveIO {
  return {
    row: (slot) => w.get(Train, trainId(w, slot))!,
    set: (slot, patch) => void Object.assign(w.mut(Train, trainId(w, slot))!, patch),
    stops: (line) => stopsOf(w, line),
  };
}
/** The world's side of the trains' step (./railway-trains.ts): rows, stops, every line's yard freight (slice 5,
 * ./railway-sys-trade.ts), and line 2's cargo, wagon and the cart's hold on line 1. Transfers and phase changes are
 * atomic inside this tick apply. */
function trainIO(w: World, headPct: number, pct: TradePct, hold: TrainHold): TrainIO {
  const row = (slot: number) => w.get(Train, trainId(w, slot))!;
  const line2 = (slot: number) => RAIL_TRAINS[slot]!.line === LINE2;
  return {
    row,
    set: (slot, patch) => void Object.assign(w.mut(Train, trainId(w, slot))!, patch),
    line: (line) => w.get(Line, lineId(w, line))!,
    setLine: (line, patch) => void Object.assign(w.mut(Line, lineId(w, line))!, patch),
    stops: (line) => stopsOf(w, line),
    awake: w.get(Rail, railId(w))!.trains,
    headPct,
    hold,
    service: (slot) => serviceOf(w, slot, row(slot)),
    arrive(slot) {
      freightArrives(w, slot);
      ridersArrive(w, slot, pct);
      // The greybox route: a leg's kit off at its rack (none while a Q job's kit is owed: one open leg comes after Q7).
      legKitArrive(w, slot);
      if (!line2(slot)) return;
      const r = w.mut(Train, trainId(w, slot))!;
      // A kit unloads at its job's halt (Q6's at Far Head, Q7's at the Pier: call 62).
      if (r.at === kitStop(w) && (r.logs || r.rails)) {
        const rail = w.mut(Rail, railId(w))!;
        rail.depot += r.logs;
        rail.depotRails += r.rails;
        r.logs = r.rails = 0;
      }
      wagonArrives(w, r);
      steelArrives(w, r);
    },
    standing(slot, tick) {
      // A train standing at its line's yard heading home loads, whatever it stopped for (slice 5; R2b's full-load stop
      // in serviceOf is the one stop freight adds).
      freightLoads(w, slot);
      // R3: riders waiting here to ride its way board, whatever it stopped for.
      ridersBoard(w, slot);
      if (!line2(slot)) {
        if (legKitLoad(w, slot, tick) === 'hold') return 'hold';
        return w.get(Cart, cartId(w))!.phase !== CART_PHASE.REST ? 'hold' : 'on';
      }
      const r = row(slot);
      // A train standing at the Village takes line 2's boiler fit (ring-island-build2, R3): standing, so no leg in
      // flight changes speed.
      if (r.at === 0) boilerAdopt(w, trainId(w, slot));
      // The footing wagon couples to the first line 2 train standing at the village once it has rolled out; a train
      // standing there when it is due holds its departure for it (at most WORKS.rollTicks).
      if (r.at === 0 && wagonSlot(w) < 0) {
        const due = w.get(Shed, shedId(w))!.ready;
        if (due >= 0 && tick >= due) {
          w.mut(Train, trainId(w, slot))!.wagon = true;
          return 'again';
        }
        if (due >= 0) return 'hold';
      }
      // The active train-fed job's kit (its bill, up to the kit car's LINE2_KIT) loads onto whichever line 2 train
      // stands at the village while it is owed.
      const kit = kitJob(w);
      if (r.at === 0 && kit >= 0 && w.get(QJob, qjobId(w, kit))!.start < 0) {
        const need = depotNeed(w, kit, w.get(QJob, qjobId(w, kit))!);
        const n = Math.min(LINE2_KIT.logs - r.logs, need.logs);
        const rails = Math.min(LINE2_KIT.rails - r.rails, need.rails, w.get(Forge, forgeId(w))!.rack);
        if (n || rails) {
          const rail = w.mut(Rail, railId(w))!,
            m = w.mut(Train, trainId(w, slot))!;
          rail[DEPOT_OUT[kit]!] += n;
          rail.depotProduced += n;
          m.logs += n;
          rail.shelfOut += rails;
          m.rails += rails;
          if (rails) w.mut(Forge, forgeId(w))!.rack -= rails;
        }
        if (
          depotNeed(w, kit, w.get(QJob, qjobId(w, kit))!).rails > 0 &&
          w.get(Forge, forgeId(w))!.lit >= 0 &&
          tick < r.depart + TRAIN.dwellTicks + TRAIN.kitWaitTicks
        )
          return 'hold';
      }
      // After the rivet the kit car is the steel works' (ring-island-build2, R2): its kit's need loads here.
      if (r.at === 0 && kit < 0 && ringJoined(w)) steelLoads(w, trainId(w, slot));
      // The greybox route: the open leg's kit loads at the kit halt (never alongside a Q job's: legs open after Q7).
      return legKitLoad(w, slot, tick);
    },
    // The footing wagon's train is never held for headway (nor by the balanced hold) while the pier or the ring still
    // owes footings (design review, 9; ring-island-build1, R3).
    headExempt: (slot) => row(slot).wagon && footingsOwed(w, RAIL_TRAINS[slot]!.line),
    // The greybox route: the trains a line runs at its legs' stage (its fleet).
    fleet: (line) => fleetOf(line, legsLaid(w)),
    // The Ring Island hold is off while the line owes footings (the wagon's errand) and for a train on a kit errand (a
    // kit aboard that can unload now, a kit owed), as the train-spacing sheets ran it (candidate B's errand list,
    // short-turn's ruling call 7). The wagon's train with no footings owed is on no errand.
    controlOff(line, slot) {
      if (footingsOwed(w, line)) return true;
      const r = row(slot);
      return (r.logs + r.rails > 0 && !legKitWaiting(w, line, r)) || kitOwed(w, r, line);
    },
  };
}
function trainStep(w: World, tick: number, headPct: number, pct: TradePct, hold: TrainHold) {
  if (w.get(Rail, railId(w))!.trains < 0) return;
  const io = trainIO(w, headPct, pct, hold);
  for (let line = 0; line < RAIL_LINES.length; line++) trainStepLine(io, line, tick);
}
export const trainTick = defineSystem(
  'rail.trainTick',
  {
    reads: [QJob, Cart, Account],
    writes: [Train, Line, Rail, Forge, Works, Aperture, Yard, Town, Till, Steel, Shed, Leg],
    phase: 'tick',
    order: 3,
  },
  (w, { tick, headPct, farePct, riderPct, holdCap, holdPct }: Tick) =>
    trainStep(w, tick, headPct, { farePct, riderPct }, { cap: holdCap, pct: holdPct }),
);

// Line two's systems (docs/plans/ecs-migration-railway.md, section 2): the unique boiler, its ops (the forge, the
// depot, the pack, the lever, the sea switch, the hook, the glider), its laying and forge tick, the depot cart's trip
// (./railway-cart.ts), and the boiler's absent-hauler paths.
import { defineSystem, type World } from '../ecs/index.ts';
import {
  LINE2_FORGE as FORGE,
  LINE2_STATIONS,
  LINE2_BOILER,
  Q6,
  Q7,
  line2BoilerGround,
  RAILS,
} from './railway-line2-layout.ts';
import { layProgress, type LineTiming } from './railway-line-schedule.ts';
import { CART, CART_PHASE, CART_ROAD, cartEnd } from './railway-cart.ts';
import { TRAIN, TRAIN_PHASE, TRAIN_STOPS } from './railway-train.ts';
import { LINE2, RAIL_LINES, trainPlaces } from './railway-lines.ts';
import { LINE_SLOTS, endMoved } from './railway-trains.ts';
import { trainMoveIO } from './railway-sys-trains.ts';
import { legKitLifted } from './railway-sys-route-kit.ts';
import { WORKS } from './railway-works-layout.ts';
import { railInt, RAILWAY_MAX_INT } from './railway.ts';
import {
  Account,
  Aperture,
  Beam,
  Boiler,
  Cart,
  DEPOT_OUT,
  Forge,
  ForgeClock,
  Job,
  QJob,
  QJobRun,
  Rail,
  Shed,
  Train,
  Works,
  Leg,
} from './railway-components.ts';
import {
  aboard,
  boilerHeld,
  boilerId,
  carried,
  cartId,
  cartServing,
  cartWants,
  depotNeed,
  forgeId,
  free,
  gateDown,
  held,
  jobId,
  LINE2_SLOTS,
  qActive,
  qCompleted,
  qjobId,
  railId,
  scheduleOf,
  shedId,
  stopsOf,
  timingOf,
  trainId,
  trainOwed,
  worksId,
} from './railway-queries.ts';
import type { Act, Tick } from './railway-sys-core.ts';

// ---------------------------------------------------------------- the unique boiler (Server kind; effects belong to accepted events)
export function boilerPedestal(w: World) {
  const b = w.mut(Boiler, boilerId(w))!;
  Object.assign(b, {
    state: 'pedestal',
    holder: '',
    epoch: 0,
    age: 0,
    x: LINE2_BOILER.x,
    y: LINE2_BOILER.y,
    z: LINE2_BOILER.z,
  });
  b.revision++;
}
function boilerReleasable(w: World, pid: string, epoch: number, revision: number) {
  const b = w.get(Boiler, boilerId(w))!;
  return (
    b.state === 'held' && b.holder === pid && b.epoch === epoch && b.revision === revision && revision < RAILWAY_MAX_INT
  );
}
export const boilerTake = defineSystem(
  'rail.boilerTake',
  { reads: [Account, Beam], writes: [Boiler], phase: 'act', order: 29 },
  (w, { a: aid, e }: Act) => {
    const a = w.get(Account, aid)!,
      b = w.get(Boiler, boilerId(w))!;
    if (
      (b.state !== 'pedestal' && b.state !== 'ground') ||
      e.revision !== b.revision ||
      b.revision >= RAILWAY_MAX_INT ||
      carried(a) ||
      a.foot ||
      held(w, a.pid)
    )
      return 0;
    Object.assign(w.mut(Boiler, boilerId(w))!, {
      state: 'held',
      holder: a.pid,
      epoch: a.epoch,
      age: 0,
      revision: b.revision + 1,
    });
    return 1;
  },
);
export const boilerDrop = defineSystem(
  'rail.boilerDrop',
  { reads: [Account], writes: [Boiler], phase: 'act', order: 30 },
  (w, { a: aid, e }: Act) => {
    const a = w.get(Account, aid)!;
    if (!boilerReleasable(w, a.pid, a.epoch, e.revision!)) return 0;
    boilerPedestal(w);
    if (
      railInt(e.x, 200000, -200000) &&
      railInt(e.y, 200000, -200000) &&
      railInt(e.z, 200000, -200000) &&
      line2BoilerGround(e.x, e.y, e.z)
    )
      Object.assign(w.mut(Boiler, boilerId(w))!, { state: 'ground', x: e.x, y: e.y, z: e.z });
    return 1;
  },
);
export const boilerFit = defineSystem(
  'rail.boilerFit',
  { reads: [Account, QJob, Works, Aperture, Leg], writes: [Boiler, Rail, Train], phase: 'act', order: 31 },
  (w, { a: aid, e, tick }: Act) => {
    const a = w.get(Account, aid)!;
    if (w.get(Rail, railId(w))!.trains >= 0 || !boilerReleasable(w, a.pid, a.epoch, e.revision!)) return 0;
    const b = w.mut(Boiler, boilerId(w))!;
    Object.assign(b, { state: 'fitted', holder: '', epoch: 0, age: 0, revision: b.revision + 1 });
    w.mut(Rail, railId(w))!.trains = tick;
    // Each line's trains spread round its circuit (docs/plans/generic-lines.md, "Starting"): line 2's at the Village
    // (up) and Far Head (down); they wake together.
    // A line's fleet rows past its first stage stay in the shed (the greybox route): the first `trains` slots wake.
    RAIL_LINES.forEach((_l, line) => {
      const places = trainPlaces(line, stopsOf(w, line));
      LINE_SLOTS[line]!.slice(0, places.length).forEach((slot, k) => {
        const { stop, track } = places[k]!,
          s = TRAIN_STOPS[line]![stop]!;
        Object.assign(w.mut(Train, trainId(w, slot))!, {
          phase: TRAIN_PHASE.STAND,
          at: stop,
          to: stop,
          track,
          depart: tick + TRAIN.wakeTicks,
          req: 0,
          from: s,
          v0: 0,
          dest: s,
        });
      });
    });
    return 1;
  },
);
// ---------------------------------------------------------------- line two's ops
function fundQ(w: World, k: number, tick: number, timing: LineTiming) {
  const spec = LINE2_STATIONS[k]!;
  const id = qjobId(w, k);
  const j = w.get(QJob, id)!;
  if (j.start >= 0 || !gateDown(w, spec) || j.stock !== spec.bill[0] || j.railStock !== spec.bill[1]) return;
  const jm = w.mut(QJob, id)!,
    run = w.mut(QJobRun, id)!;
  jm.stock = jm.railStock = 0;
  run.allocation = spec.bill[0];
  run.railAllocation = spec.bill[1];
  jm.start = run.lastTick = tick;
  // Rails still on the shelf or aboard the cart go back to the forge rack: they only ever wait for an unfunded
  // stretch.
  const rail = w.get(Rail, railId(w))!,
    onCart = w.get(Cart, cartId(w))!.rails,
    trainRails = aboard(w, 'rails');
  if (spec.shelf && (rail.depotRails || rail.shelfOut || onCart || trainRails)) {
    w.mut(Forge, forgeId(w))!.rack += rail.depotRails + onCart + trainRails;
    Object.assign(w.mut(Rail, railId(w))!, { depotRails: 0, shelfOut: 0 });
    if (onCart) w.mut(Cart, cartId(w))!.rails = 0;
    for (const k of LINE2_SLOTS) if (w.get(Train, trainId(w, k))!.rails) w.mut(Train, trainId(w, k))!.rails = 0;
  }
  // Each stretch pins the room's timing when funded; Q2/Q3 lay faster, as in Place.
  Object.assign(jm, timingOf(timing), {
    cruiseCmPerTick: Math.max(1, Math.floor((timing.cruiseCmPerTick * spec.speed) / 100)),
  });
}
export const deposit2 = defineSystem(
  'rail.deposit2',
  {
    reads: [Boiler, Beam, Job, Works],
    writes: [Rail, Forge, ForgeClock, QJob, QJobRun, Account, Cart, Train],
    phase: 'act',
    order: 20,
  },
  (w, { a: aid, e, tick, timing }: Act) => {
    const a = w.mut(Account, aid)!;
    const fid = forgeId(w);
    if (boilerHeld(w, a.pid)) return 0;
    if (e.station === 'F' && (e.kind ?? 0) === 0 && w.get(Job, jobId(w, 2))!.completion) {
      const f = w.get(Forge, fid)!;
      const n = Math.min(e.n!, a.carry, FORGE.logs - f.used);
      if (n <= 0) return 0;
      a.carry -= n;
      const fm = w.mut(Forge, fid)!;
      fm.used += n;
      if (fm.used === FORGE.logs) fm.lit = w.mut(ForgeClock, fid)!.lastPour = tick;
      return n;
    }
    const k = qActive(w);
    if (k < 0 || e.station !== LINE2_STATIONS[k]!.id || tick < w.get(Forge, fid)!.lit + FORGE.turnTicks) return 0;
    const j = w.get(QJob, qjobId(w, k))!,
      spec = LINE2_STATIONS[k]!;
    // A gate holds the machine, not deliveries to its frame.
    if (j.start >= 0 || trainOwed(w)) return 0;
    const rails = e.kind === RAILS;
    if (e.kind !== undefined && e.kind !== 0 && !rails) return 0;
    const n = Math.min(e.n!, rails ? a.rails : a.carry, spec.bill[rails ? 1 : 0] - (rails ? j.railStock : j.stock));
    if (n <= 0) return 0;
    const jm = w.mut(QJob, qjobId(w, k))!;
    if (rails) {
      a.rails -= n;
      jm.railStock += n;
      jm.railDelivered += n;
    } else {
      a.carry -= n;
      jm.stock += n;
      jm.delivered += n;
    }
    fundQ(w, k, tick, timing);
    return n;
  },
);
export const forgeTake = defineSystem(
  'rail.forgeTake',
  { reads: [Boiler, Rail, Beam, QJob, Shed, Works], writes: [Forge, Account], phase: 'act', order: 21 },
  (w, { a: aid }: Act) => {
    if (trainOwed(w)) return 0;
    const a = w.mut(Account, aid)!;
    let room = free(w, a);
    // Once no Q station takes rails, the cradle is the rack's only use: take just what it still needs, so a full
    // back of spare rails never stands between you and the footings (which need an empty back). Once the cradle is
    // fitted nothing uses rails, so the rack gives none.
    const h = w.get(Shed, shedId(w))!;
    if (qActive(w) < 0) room = h.fitted >= 0 ? 0 : Math.min(room, WORKS.cradleRails - h.cradleRails - a.rails);
    if (room <= 0) return 0;
    const f = w.mut(Forge, forgeId(w))!;
    const n = Math.min(f.rack, room);
    f.rack -= n;
    a.rails += n;
    return n;
  },
);
export const depotTake = defineSystem(
  'rail.depotTake',
  { reads: [Boiler, Beam, Aperture], writes: [Rail, Account, Leg], phase: 'act', order: 22 },
  (w, { a: aid }: Act) => {
    const a = w.mut(Account, aid)!;
    const room = free(w, a);
    if (room <= 0) return 0;
    const rail = w.mut(Rail, railId(w))!;
    const n = Math.min(rail.depot, room);
    rail.depot -= n;
    a.carry += n;
    // Off an open leg's rack: held on this back until fed or put down (the step 3 review's P2-2).
    legKitLifted(w, n, 0);
    return n;
  },
);
/** Rails from the shelf by a `shelf` stretch's rack (moved there from the forge; railValid checks the stretch). */
export const depotRailTake = defineSystem(
  'rail.depotRailTake',
  { reads: [Boiler, Beam, Aperture], writes: [Rail, Account, Leg], phase: 'act', order: 25 },
  (w, { a: aid }: Act) => {
    const a = w.mut(Account, aid)!;
    const room = free(w, a);
    if (room <= 0) return 0;
    const rail = w.mut(Rail, railId(w))!;
    const n = Math.min(rail.depotRails, room);
    rail.depotRails -= n;
    a.rails += n;
    legKitLifted(w, 0, n);
    return n;
  },
);
/** The pack chest: there once the forge has its first bill; one open gives every back LINE2_PACK.carry. */
export const pack = defineSystem('rail.pack', { reads: [Forge], writes: [Rail], phase: 'act', order: 26 }, (w) => {
  if (w.get(Forge, forgeId(w))!.used < FORGE.bills[0] || w.get(Rail, railId(w))!.pack) return 0;
  w.mut(Rail, railId(w))!.pack = true;
  return 1;
});
// Before Q3 the drive is uncoupled: a pull does nothing, even from a jump onto the apron.
export const lever = defineSystem(
  'rail.lever',
  { writes: [Rail, QJob, QJobRun, Forge, Cart, Train], phase: 'act', order: 23 },
  (w, { tick, timing }: Act) => {
    if (qCompleted(w) < 3 || w.get(Rail, railId(w))!.lever) return 0;
    w.mut(Rail, railId(w))!.lever = true;
    fundQ(w, 3, tick, timing);
    return 1;
  },
);
export const hook = defineSystem('rail.hook', { reads: [QJob], writes: [Rail], phase: 'act', order: 24 }, (w) => {
  if (qCompleted(w) < 2 || w.get(Rail, railId(w))!.hook) return 0;
  w.mut(Rail, railId(w))!.hook = true;
  return 1;
});
// The glider on Needle Bell's summit (glider piece B): sealed until Q5 is laid, then one shared take for the room.
// Order 40: after the Works block (33-39).
export const glide = defineSystem('rail.glide', { reads: [QJob], writes: [Rail], phase: 'act', order: 40 }, (w) => {
  if (qCompleted(w) < 5 || w.get(Rail, railId(w))!.glide) return 0;
  w.mut(Rail, railId(w))!.glide = true;
  return 1;
});
export const seaSwitch = defineSystem(
  'rail.seaSwitch',
  { writes: [Rail, QJob, QJobRun, Forge, Cart, Train], phase: 'act', order: 28 },
  (w, { tick, timing }: Act) => {
    if (w.get(Rail, railId(w))!.sea) return 0;
    w.mut(Rail, railId(w))!.sea = true;
    fundQ(w, 4, tick, timing);
    return 1;
  },
);
// The cart's three transfers, each one atomic: logs minted onto it at the camp (counted production), rails moved onto
// it off the forge rack at the forge stop, and everything aboard onto the rack and shelf at the rack. `depot` and
// `depotRails` change only at the unload.
export function cartMint(w: World, k: number, n: number) {
  if (n <= 0) return;
  const rm = w.mut(Rail, railId(w))!;
  rm.depotProduced += n;
  rm[DEPOT_OUT[k]!] += n;
  w.mut(Cart, cartId(w))!.logs += n;
}
export function cartTakeRails(w: World, n: number) {
  if (n <= 0) return;
  w.mut(Forge, forgeId(w))!.rack -= n;
  w.mut(Rail, railId(w))!.shelfOut += n;
  w.mut(Cart, cartId(w))!.rails += n;
}
export function cartUnload(w: World) {
  const c = w.get(Cart, cartId(w))!;
  if (!c.logs && !c.rails) return;
  const rm = w.mut(Rail, railId(w))!;
  rm.depot += c.logs;
  rm.depotRails += c.rails;
  Object.assign(w.mut(Cart, cartId(w))!, { logs: 0, rails: 0 });
}
/** The cart's trip at `tick`: each phase ends on its clock (or, at rest and at the forge, on a condition), and the next
 * starts where it ended, so the pose stays continuous and the server sends the cart only at a phase change. */
function cartStep(w: World, tick: number) {
  const id = cartId(w);
  const P = CART_PHASE;
  for (let guard = 0; guard < 16; guard++) {
    const c = w.get(Cart, id)!;
    const k = cartServing(w);
    const end = cartEnd(c);
    const next = (phase: number, depart: number, more: { from?: number; to?: number } = {}) =>
      Object.assign(w.mut(Cart, id)!, { phase, depart, ...more });
    switch (c.phase) {
      case P.REST: {
        if (k < 0) return;
        const need = depotNeed(w, k, w.get(QJob, qjobId(w, k))!);
        if (!need.logs && !need.rails) return;
        next(P.LOAD, tick, { from: 0, to: CART_ROAD.rackCm(k) });
        cartMint(w, k, Math.min(CART.load, need.logs));
        continue;
      }
      case P.FORGE: {
        const want = cartWants(w, k);
        if (want > 0 && w.get(Forge, forgeId(w))!.rack > 0) {
          cartTakeRails(w, Math.min(want, w.get(Forge, forgeId(w))!.rack));
          w.mut(Cart, id)!.depart = tick; // the leave clock starts at the last rails aboard
        }
        if (cartWants(w, k) > 0) return; // waiting for the forge
        const now = w.get(Cart, id)!;
        const dwell = now.rails > 0 ? CART.leaveTicks : 0;
        if (tick < now.depart + dwell) return;
        if (k < 0 && !now.logs && !now.rails) next(P.HOME, tick);
        else next(P.RUN, tick, { from: CART_ROAD.forgeCm, to: k >= 0 ? CART_ROAD.rackCm(k) : now.to });
        continue;
      }
      default:
        if (tick < end) return;
        if (c.phase === P.LOAD) next(P.OUT, end);
        else if (c.phase === P.OUT) next(P.FORGE, end);
        else if (c.phase === P.RUN) {
          // Its stretch funded on the way and the next one's rack is further on: the load goes on there.
          if (k >= 0 && CART_ROAD.rackCm(k) > c.to && c.logs + c.rails > 0)
            next(P.RUN, end, { from: c.to, to: CART_ROAD.rackCm(k) });
          else {
            next(P.DROP, end);
            cartUnload(w);
          }
        } else if (c.phase === P.DROP) next(P.BACK, end);
        else if (c.phase === P.BACK) next(P.HOME, end);
        else next(P.REST, end);
    }
  }
}
export function layLine2(w: World, tick: number) {
  const fid = forgeId(w);
  const f = w.get(Forge, fid)!;
  if (f.lit >= 0) {
    if (f.rack < FORGE.rackMax && tick - w.get(ForgeClock, fid)!.lastPour >= FORGE.pourTicks) {
      const fm = w.mut(Forge, fid)!,
        cm = w.mut(ForgeClock, fid)!;
      while (fm.rack < FORGE.rackMax && tick - cm.lastPour >= FORGE.pourTicks) {
        fm.rack++;
        fm.poured++;
        cm.lastPour += FORGE.pourTicks;
      }
    }
    if (w.get(Forge, fid)!.rack >= FORGE.rackMax) w.mut(ForgeClock, fid)!.lastPour = tick;
  }
  const k = qActive(w);
  if (k < 0) return;
  const id = qjobId(w, k);
  const j = w.get(QJob, id)!,
    spec = LINE2_STATIONS[k]!;
  if (j.start < 0 || j.completion) return;
  const schedule = scheduleOf(spec, j);
  const run = w.mut(QJobRun, id)!;
  run.elapsed = Math.min(schedule.totalTicks, run.elapsed + Math.max(0, tick - run.lastTick));
  run.lastTick = tick;
  const lay = layProgress(spec, schedule, run.elapsed);
  [run.used, run.allocation, run.railUsed, run.railAllocation] = [lay.used, lay.allocation, lay.used2, lay.allocation2];
  if (run.elapsed === schedule.totalTicks) {
    w.mut(QJob, id)!.completion = 1;
    if (k === 4 && w.get(Boiler, boilerId(w))!.state === 'none') boilerPedestal(w);
    // The forge's third made thing: Q6 laid casts the breaker on the boiler's old pedestal.
    if (k === Q6 && w.get(Works, worksId(w))!.breaker === 0) w.mut(Works, worksId(w))!.breaker = 1;
    // The pier opens: a train already bound for Far Head (halt 2) as its end still makes that stop. One whose nose is
    // on the crossover has crossed: it turns back there as at an end (`turn`; review of v26, P2-2). One short of it
    // stops there once, as if a rider had asked, then runs on to the pier (review of 4a, P3a). endMoved
    // (./railway-trains.ts) is that hunk, row for row (test/railway-trains.test.ts).
    if (k === Q6) endMoved(trainMoveIO(w), LINE2, 2, tick);
    // Q7 laid opens the Railhead: a train running up to the Pier as its end whose nose is past the stub's turnout turns
    // back there; one short of it runs on to the Railhead with no Pier stop (the Pier is homeward-only from now).
    if (k === Q7) endMoved(trainMoveIO(w), LINE2, 3, tick);
  }
}
export const line2Tick = defineSystem(
  'rail.line2Tick',
  { reads: [Aperture, Leg], writes: [Forge, ForgeClock, QJob, QJobRun, Boiler, Works, Train], phase: 'tick', order: 1 },
  (w, { tick }: Tick) => layLine2(w, tick),
);
/** The depot cart, after the forge has poured this tick (so a waiting cart takes a rail the tick it lands). */
export const cartTick = defineSystem(
  'rail.cartTick',
  { reads: [QJob, Train, Works], writes: [Cart, Rail, Forge], phase: 'tick', order: 2 },
  (w, { tick }: Tick) => cartStep(w, tick),
);
export const boilerStood = defineSystem(
  'rail.boilerStood',
  { writes: [Boiler], phase: 'boiler', order: 1 },
  (w, q: { pid: string; x: number; y: number; z: number }) => {
    const b = w.get(Boiler, boilerId(w))!;
    // The point comes from presence: the same bounds as rail.boilerDrop, and never -0 (off the int schema).
    if (!railInt(q.x, 200000, -200000) || !railInt(q.y, 200000, -200000) || !railInt(q.z, 200000, -200000))
      return false;
    if (b.state !== 'held' || b.holder !== q.pid || (b.x === q.x && b.y === q.y && b.z === q.z)) return false;
    Object.assign(w.mut(Boiler, boilerId(w))!, { x: q.x, y: q.y, z: q.z });
    return true;
  },
);
/** Where the boiler's hauler stands (cm, at their feet), kept on the held boiler as the beam's is
 * (docs/plans/boiler-first-choice.md, Part 3), so an absence past its grace puts it down there. Returns whether it
 * moved. */
export const railBoilerStood = (w: World, pid: string, x: number, y: number, z: number): boolean =>
  w.run(boilerStood, { pid, x, y, z });
export const boilerPutDown = defineSystem(
  'rail.boilerPutDown',
  { writes: [Boiler], phase: 'boiler', order: 2 },
  (w, pid: string) => {
    const b = w.get(Boiler, boilerId(w))!;
    const { x, y, z } = b;
    if (!boilerReleasable(w, pid, b.epoch, b.revision)) return 0;
    // Never stood (no presence reached the server since the take): it is still where it was taken from, and one taken
    // off the pedestal goes back onto it rather than lying at its foot.
    const unmoved = x === LINE2_BOILER.x && y === LINE2_BOILER.y && z === LINE2_BOILER.z;
    boilerPedestal(w);
    if (!unmoved && line2BoilerGround(x, y, z))
      Object.assign(w.mut(Boiler, boilerId(w))!, { state: 'ground', x, y, z });
    return 1;
  },
);
/** The hauler stayed away past the grace: the boiler goes down where they last stood, or, off the haul area, back to
 * the pedestal (the beam's rule; owner, 6 November). Never while they hold it in a live session. */
export const railBoilerPutDown = (w: World, pid: string): number => w.run(boilerPutDown, pid);

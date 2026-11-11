// Line two's shapes, read helpers and invariants on the read model: the forge, its rails, Q1-Q6, the depot rack and
// rails shelf, the pack, the quarry lever and the hook device. Its rules are systems in ./railway-sys-line2.ts.
import { trainStopsOf } from './railway-train.ts';
import { LINE2 } from './railway-lines.ts';
import { railTrainsOf } from './railway-trains.ts';
import type { Railway } from './railway.ts';
import { RAILWAY_T1 as T1 } from './railway-layout.ts';
import { LINE2_FORGE as FORGE, LINE2_PACK, LINE2_STATIONS, RAILS, pierLaid } from './railway-line2-layout.ts';
import { lineSchedule, type LineTiming } from './railway-line-schedule.ts';
import { CART, CART_PHASE, CART_PHASES, CART_ROAD, type RailCart } from './railway-cart.ts';

export type RailForge = { used: number; lit: number; rack: number; poured: number; lastPour: number };
export type RailQJob = {
  stock: number;
  railStock: number;
  allocation: number;
  railAllocation: number;
  used: number;
  railUsed: number;
  delivered: number;
  railDelivered: number;
  start: number;
  elapsed: number;
  lastTick: number;
  completion: number;
  timing: LineTiming;
};
export type RailBoiler = {
  state: string;
  holder: string;
  epoch: number;
  revision: number;
  x: number;
  y: number;
  z: number;
  age: number;
};
export type RailLine2 = {
  boiler: RailBoiler;
  trains: number;
  forge: RailForge;
  jobs: RailQJob[];
  depot: number;
  /** Total minted by the depot; always the sum of `depotOut`. */
  depotProduced: number;
  /** Depot logs minted for each stretch, in station order; never more than that stretch's log bill. */
  depotOut: number[];
  lever: boolean;
  sea: boolean;
  hook: boolean;
  /** The room has the glider (piece B): taken on Needle Bell's summit once Q5 is laid; never before. */
  glide: boolean;
  /** The pack is open: everyone's back carries LINE2_PACK.carry. */
  pack: boolean;
  /** Rails on the shelf by a `shelf` stretch's rack, moved there from the forge rack (never minted). */
  depotRails: number;
  /** Rails the cart has taken off the forge rack for the active stretch (aboard or on the shelf); never past its rail
   * bill, reset when it funds. */
  shelfOut: number;
  /** The depot cart (./railway-cart.ts): its phase on the trip, and the logs and rails aboard. */
  cart: RailCart;
};
/** The first path (T3) is open: the forge frame takes logs. */
export const line2Open = (s: Railway) => !!s.line?.jobs[1].completion;
export const line2Lit = (s: Railway) => !!s.line2 && s.line2.forge.lit >= 0;
/** What a back carries: RAILWAY_T1.carry, or LINE2_PACK.carry once the pack is open (shared, like the axe). */
export const railCarryMax = (s: Railway) => (s.line2?.pack ? LINE2_PACK.carry : T1.carry);
/** The pack chest is there: the forge has taken its first bill. */
export const line2PackReady = (s: Railway) => (s.line2?.forge.used ?? 0) >= FORGE.bills[0];
/** Completed Q stretches, 0-6. */
export const line2Completed = (s: Railway) => s.line2?.jobs.filter((j) => j.completion).length ?? 0;
/** The Q station that takes materials now, or -1 before the forge is lit / after the last. */
export const line2Active = (s: Railway) => {
  if (!line2Lit(s)) return -1;
  const k = s.line2!.jobs.findIndex((j) => !j.completion);
  return k;
};
/** The quarry gate is down only with Q3 complete and the lever pulled. */
export const line2GateOpen = (s: Railway) => line2Completed(s) >= 3 && !!s.line2?.lever;
/** The summit pull opens the sea gate immediately; active-stretch order still guards Q5 construction. */
export const line2SeaOpen = (s: Railway) => !!s.line2?.sea;
export const line2GateDown = (s: Railway, k: number) => {
  const g = LINE2_STATIONS[k]?.gate;
  return !g || (g === 'quarry' ? line2GateOpen(s) : line2SeaOpen(s));
};
export const line2Schedule = (k: number, job: RailQJob) => lineSchedule(LINE2_STATIONS[k]!, job.timing);
/** The stretch the depot cart serves (a depot stretch not yet funded), or -1. */
export const line2Served = (s: Railway) => {
  const k = line2Active(s);
  return k >= 0 && LINE2_STATIONS[k]!.depot && s.line2!.jobs[k]!.start < 0 ? k : -1;
};
/** The rails the cart still wants aboard for stretch k at the forge stop (the systems' rule, on the read model). */
export function line2CartWants(s: Railway, k: number) {
  const l = s.line2!,
    spec = LINE2_STATIONS[k];
  if (!spec?.shelf || spec.feed === 'train') return 0;
  const owed = Math.min(spec.bill[1] - l.jobs[k]!.railStock - l.depotRails - l.cart.rails, spec.bill[1] - l.shelfOut);
  return Math.max(0, Math.min(CART.rails - l.cart.rails, owed));
}
/** What the rack's tag says (Place's depot service): off when nothing is owed and nothing is aboard. */
export function line2CartStatus(s: Railway): 'off' | 'loading' | 'travelling' | 'unloading' | 'waiting' {
  const l = s.line2!,
    c = l.cart,
    k = line2Served(s);
  if (k >= 0 && LINE2_STATIONS[k]!.feed === 'train' && !c.logs && !c.rails) return 'off';
  // A full bill is waiting for its gate/confirmation, not another delivery. The frame shows what starts it.
  if (k >= 0) {
    const spec = LINE2_STATIONS[k]!,
      j = l.jobs[k]!;
    if (j.stock === spec.bill[0] && j.railStock === spec.bill[1]) return 'off';
  }
  if (c.phase === CART_PHASE.DROP) return 'unloading';
  const aboard = c.logs + c.rails > 0;
  if (k < 0 && !aboard) return 'off';
  if (c.phase === CART_PHASE.FORGE) return line2CartWants(s, k) > 0 && l.forge.rack === 0 ? 'waiting' : 'loading';
  if (c.phase === CART_PHASE.LOAD) return 'loading';
  if (c.phase === CART_PHASE.OUT || c.phase === CART_PHASE.RUN) return 'travelling';
  // Home or heading there: more is coming only while the stretch still needs some.
  const spec = LINE2_STATIONS[k]!,
    j = l.jobs[k]!;
  const logs = Math.min(spec.bill[0] - j.stock - l.depot, spec.bill[0] - l.depotOut[k]!);
  return logs > 0 || line2CartWants(s, k) > 0 ? (c.phase === CART_PHASE.REST ? 'loading' : 'travelling') : 'off';
}
/** Line 2's trains' cargo: the Q6 kit aboard any of them. */
export const line2Aboard = (s: Railway, key: 'logs' | 'rails' | 'foot') =>
  railTrainsOf(s, LINE2).reduce((n, r) => n + r[key], 0);
export const line2Logs = (s: Railway) => {
  const l = s.line2!;
  return (
    l.forge.used +
    l.depot +
    l.cart.logs +
    line2Aboard(s, 'logs') +
    l.jobs.reduce((n, j) => n + j.stock + j.allocation + j.used, 0)
  );
};
export const line2Rails = (s: Railway) =>
  (s.line2?.forge.rack ?? 0) +
  (s.line2?.depotRails ?? 0) +
  (s.line2?.cart.rails ?? 0) +
  (s.trains ? line2Aboard(s, 'rails') : 0) +
  s.accounts.reduce((n, a) => n + (a.rails ?? 0), 0) +
  s.piles.reduce((n, p) => n + (p.kind === RAILS ? p.n : 0), 0) +
  (s.line2?.jobs.reduce((n, j) => n + j.railStock + j.railAllocation + j.railUsed, 0) ?? 0) +
  (s.shed?.cradleRails ?? 0);
/** The stops line k serves now (TRAIN_STOPS; line 2's pier opens once Q6 is laid). */
export const trainStops = (s: Railway, k: number) => trainStopsOf(k, pierLaid(line2Completed(s)));

// ---------------------------------------------------------------- invariants on the read model
const JOB_FIELDS = [
  'stock',
  'railStock',
  'allocation',
  'railAllocation',
  'used',
  'railUsed',
  'delivered',
  'railDelivered',
  'start',
  'elapsed',
  'lastTick',
  'completion',
] as const;
const int = (v: unknown, max = 2147483647, min = 0): v is number =>
  typeof v === 'number' && Number.isSafeInteger(v) && v >= min && v <= max && !Object.is(v, -0);
/** Whole-document invariants; throws before any live state is replaced. */
export function validateRailLine2(s: Railway) {
  const l = s.line2!;
  const f = l.forge;
  if ((f.used > 0 || f.lit >= 0) && !line2Open(s)) throw new Error('railway: forge before path');
  if (f.lit >= 0 !== (f.used === FORGE.logs)) throw new Error('railway: forge lit');
  if (f.lit < 0 && (f.rack || f.poured || f.lastPour)) throw new Error('railway: unlit pour');
  if (f.lit >= 0 && f.lastPour < f.lit) throw new Error('railway: pour clock');
  l.jobs.forEach((job, k) => {
    const spec = LINE2_STATIONS[k]!;
    for (const key of JOB_FIELDS)
      if (!int(job[key], key === 'completion' ? 1 : 2147483647, key === 'start' ? -1 : 0))
        throw new Error('railway: line2 job bounds');
    const schedule = line2Schedule(k, job);
    if (job.elapsed > schedule.totalTicks || job.stock > spec.bill[0] || job.railStock > spec.bill[1])
      throw new Error('railway: line2 job bounds');
    const before = k === 0 ? f.lit >= 0 : !!l.jobs[k - 1]!.completion;
    if (!before && (job.start >= 0 || job.delivered > 0 || job.railDelivered > 0))
      throw new Error('railway: line2 ordered stations');
    if (job.start < 0) {
      if (
        job.allocation ||
        job.used ||
        job.railAllocation ||
        job.railUsed ||
        job.elapsed ||
        job.completion ||
        job.stock !== job.delivered ||
        job.railStock !== job.railDelivered ||
        (job.stock === spec.bill[0] && job.railStock === spec.bill[1] && line2GateDown(s, k))
      )
        throw new Error('railway: line2 unfunded job');
    } else {
      const fraction = Math.max(0, job.elapsed - schedule.depositTicks - schedule.feedTicks) / schedule.layTicks;
      if (
        !line2GateDown(s, k) ||
        job.start < f.lit ||
        job.lastTick < job.start ||
        job.stock ||
        job.railStock ||
        job.delivered !== spec.bill[0] ||
        job.railDelivered !== spec.bill[1] ||
        job.used !== Math.min(spec.bill[0], Math.floor(fraction * spec.bill[0])) ||
        job.railUsed !== Math.min(spec.bill[1], Math.floor(fraction * spec.bill[1])) ||
        job.allocation + job.used !== spec.bill[0] ||
        job.railAllocation + job.railUsed !== spec.bill[1] ||
        job.completion !== Number(job.elapsed === schedule.totalTicks)
      )
        throw new Error('railway: line2 funded job');
    }
  });
  if ((l.depot || l.depotProduced) && !l.jobs[0]!.completion) throw new Error('railway: early depot');
  if (
    l.depotOut.length !== LINE2_STATIONS.length ||
    l.depotOut.some((n, k) => !int(n, LINE2_STATIONS[k]!.bill[0]) || (n > 0 && !LINE2_STATIONS[k]!.depot)) ||
    l.depotOut.reduce((a, b) => a + b, 0) !== l.depotProduced
  )
    throw new Error('railway: depot output');
  if (l.depot + l.cart.logs + line2Aboard(s, 'logs') > l.depotProduced) throw new Error('railway: depot stock');
  const c = l.cart;
  const road = CART_ROAD.rackCm(LINE2_STATIONS.length - 1);
  if (
    !int(c.phase, CART_PHASES - 1) ||
    !int(c.depart) ||
    !int(c.to, road) ||
    !int(c.from, c.to) ||
    !int(c.logs, CART.load) ||
    !int(c.rails, CART.rails) ||
    ((c.phase === CART_PHASE.RUN || c.phase === CART_PHASE.DROP || c.phase === CART_PHASE.BACK) &&
      (c.to < CART_ROAD.forgeCm || c.from < CART_ROAD.forgeCm))
  )
    throw new Error('railway: cart');
  if (l.lever && line2Completed(s) < 3) throw new Error('railway: lever before Q3');
  if (l.hook && line2Completed(s) < 2) throw new Error('railway: hook before Q2');
  if (l.glide && line2Completed(s) < 5) throw new Error('railway: glide before Q5');
  if (l.pack && f.used < FORGE.bills[0]) throw new Error('railway: pack before the forge bill');
  // The shelf holds rails only for the active, unfunded `shelf` stretch (funding sends what is left back to the forge
  // rack), and never more than its rail bill.
  if (
    !int(l.depotRails, 64) ||
    !int(l.shelfOut, 64) ||
    l.depotRails + l.cart.rails + line2Aboard(s, 'rails') > l.shelfOut
  )
    throw new Error('railway: shelf bounds');
  if (l.shelfOut) {
    const k = line2Active(s);
    const spec = LINE2_STATIONS[k],
      job = l.jobs[k];
    if (!spec?.shelf || !job || job.start >= 0 || l.shelfOut > spec.bill[1])
      throw new Error('railway: shelf outside its stretch');
  }
  const b = l.boiler;
  if (
    !['none', 'pedestal', 'held', 'ground', 'fitted'].includes(b.state) ||
    !int(b.epoch) ||
    !int(b.revision) ||
    !int(b.age, 21) ||
    !int(b.x, 200000, -200000) ||
    !int(b.y, 200000, -200000) ||
    !int(b.z, 200000, -200000) ||
    (b.state === 'none') !== line2Completed(s) < 5 ||
    (b.state === 'fitted') !== l.trains >= 0 ||
    (b.holder !== '') !== (b.state === 'held') ||
    (b.state === 'held' &&
      !s.accounts.some((a) => a.pid === b.holder && a.epoch === b.epoch && !a.carry && !a.stone && !a.rails)) ||
    (b.state === 'held' && s.line!.beam.state === 'held' && s.line!.beam.holder === b.holder) ||
    !int(l.trains, 2147483647, -1)
  )
    throw new Error('railway: boiler');
  if (line2Rails(s) !== f.poured) throw new Error('railway: rail conservation');
}

export const line2Trains = (s: Railway) => (s.line2?.trains ?? -1) >= 0;
/** Remaining kit to source, counting the rack, frame and both vehicles; production caps avoid replacing carried cargo. */
export function line2KitOwed(s: Railway) {
  const l = s.line2!,
    j = l.jobs[5]!;
  if (line2Active(s) !== 5 || j.start >= 0) return { logs: 0, rails: 0 };
  return {
    logs: Math.max(0, Math.min(32 - j.stock - l.depot - l.cart.logs - line2Aboard(s, 'logs'), 32 - l.depotOut[5]!)),
    rails: Math.max(
      0,
      Math.min(32 - j.railStock - l.depotRails - l.cart.rails - line2Aboard(s, 'rails'), 32 - l.shelfOut),
    ),
  };
}

// Line two's derived facts on the world, and the conserved counts (docs/plans/ecs-migration-railway.md, M8): the world
// twins of the read model's helpers in ./railway-line2.ts and ./railway.ts, same names, a world first and the same
// arithmetic (where a system's own twin differs, as cartWants and gateDown do, the read model's is kept here). Pure
// reads; `at` is the job clock's tick (./railway-queries.ts, jobProgress), absent for the run rows.
//
//   line2Open, line2Lit, line2PackReady, line2Completed, line2Active, line2GateOpen, line2SeaOpen, line2GateDown,
//   line2Trains                            the forge, the stretches and the gates
//   line2Served, line2CartWants, line2CartStatus, line2KitOwed   the depot cart and a train-fed job's kit
//   line2Aboard, line2Logs, line2Rails     line two's cargo and its conserved logs and rails
//   railCounts(w, at?)                     every conserved total and the score
import type { World } from '../ecs/index.ts';
import { RAILWAY_T1 as T1 } from './railway-layout.ts';
import { LINE2_FORGE as FORGE, LINE2_STATIONS, RAILS } from './railway-line2-layout.ts';
import { CART, CART_PHASE } from './railway-cart.ts';
import {
  Account,
  Beam,
  Cart,
  DEPOT_OUT,
  Forge,
  Hardwood,
  Job,
  Pile,
  QJob,
  Rail,
  Rock,
  Shed,
  Tree,
  Works,
} from './railway-components.ts';
import {
  aboard,
  beamId,
  cartId,
  forgeId,
  jobId,
  kitJob,
  line2Jobs,
  qActive,
  qjobId,
  railId,
  railJobs,
  shedId,
  worksId,
} from './railway-queries.ts';

/** The first path (T3) is open: the forge frame takes logs. */
export const line2Open = (w: World) => !!w.get(Job, jobId(w, 2))!.completion;
export const line2Lit = (w: World) => w.get(Forge, forgeId(w))!.lit >= 0;
/** The pack chest is there: the forge has taken its first bill. */
export const line2PackReady = (w: World) => w.get(Forge, forgeId(w))!.used >= FORGE.bills[0];
/** Completed Q stretches, 0-7. */
export const line2Completed = (w: World) =>
  LINE2_STATIONS.filter((_s, k) => w.get(QJob, qjobId(w, k))!.completion).length;
/** Q5 (slot 4) is laid: Far Head's show plays, and the room's story turns to Act 2 (./railway-queries-story.ts). */
export const farHeadLaid = (w: World) => w.get(QJob, qjobId(w, 4))!.completion === 1;
/** The Q station that takes materials now, or -1 before the forge is lit / after the last (qActive). */
export const line2Active = qActive;
/** The quarry gate is down only with Q3 complete and the lever pulled. */
export const line2GateOpen = (w: World) => line2Completed(w) >= 3 && w.get(Rail, railId(w))!.lever;
/** The summit pull opens the sea gate immediately. */
export const line2SeaOpen = (w: World) => w.get(Rail, railId(w))!.sea;
export const line2GateDown = (w: World, k: number) => {
  const g = LINE2_STATIONS[k]?.gate;
  return !g || (g === 'quarry' ? line2GateOpen(w) : line2SeaOpen(w));
};
export const line2Trains = (w: World) => w.get(Rail, railId(w))!.trains >= 0;
/** The stretch the depot cart serves (a depot stretch not yet funded), or -1. */
export const line2Served = (w: World) => {
  const k = qActive(w);
  return k >= 0 && LINE2_STATIONS[k]!.depot && w.get(QJob, qjobId(w, k))!.start < 0 ? k : -1;
};
/** The rails the cart still wants aboard for stretch k at the forge stop (the read model's rule: rails aboard a train
 * are not counted, unlike the system's cartWants). */
export function line2CartWants(w: World, k: number) {
  const spec = LINE2_STATIONS[k];
  if (!spec?.shelf || spec.feed === 'train') return 0;
  const rail = w.get(Rail, railId(w))!,
    cart = w.get(Cart, cartId(w))!;
  const owed = Math.min(
    spec.bill[1] - w.get(QJob, qjobId(w, k))!.railStock - rail.depotRails - cart.rails,
    spec.bill[1] - rail.shelfOut,
  );
  return Math.max(0, Math.min(CART.rails - cart.rails, owed));
}
/** What the rack's tag says: off when nothing is owed and nothing is aboard. */
export function line2CartStatus(w: World): 'off' | 'loading' | 'travelling' | 'unloading' | 'waiting' {
  const c = w.get(Cart, cartId(w))!,
    k = line2Served(w);
  if (k >= 0 && LINE2_STATIONS[k]!.feed === 'train' && !c.logs && !c.rails) return 'off';
  // A full bill is waiting for its gate/confirmation, not another delivery.
  if (k >= 0) {
    const spec = LINE2_STATIONS[k]!,
      j = w.get(QJob, qjobId(w, k))!;
    if (j.stock === spec.bill[0] && j.railStock === spec.bill[1]) return 'off';
  }
  if (c.phase === CART_PHASE.DROP) return 'unloading';
  if (k < 0 && c.logs + c.rails <= 0) return 'off';
  if (c.phase === CART_PHASE.FORGE)
    return line2CartWants(w, k) > 0 && w.get(Forge, forgeId(w))!.rack === 0 ? 'waiting' : 'loading';
  if (c.phase === CART_PHASE.LOAD) return 'loading';
  if (c.phase === CART_PHASE.OUT || c.phase === CART_PHASE.RUN) return 'travelling';
  // Home or heading there: more is coming only while the stretch still needs some.
  const rail = w.get(Rail, railId(w))!;
  const spec = LINE2_STATIONS[k]!,
    j = w.get(QJob, qjobId(w, k))!;
  const logs = Math.min(spec.bill[0] - j.stock - rail.depot, spec.bill[0] - rail[DEPOT_OUT[k]!]);
  return logs > 0 || line2CartWants(w, k) > 0 ? (c.phase === CART_PHASE.REST ? 'loading' : 'travelling') : 'off';
}
/** Line 2's trains' cargo: a train-fed job's kit aboard any of them (aboard). */
export const line2Aboard = aboard;
/** The active train-fed job's (Q6's or Q7's) kit still to source, counting the rack, frame and both vehicles: its
 * bill (call 63). */
export function line2KitOwed(w: World) {
  const k = kitJob(w);
  if (k < 0) return { logs: 0, rails: 0 };
  const j = w.get(QJob, qjobId(w, k))!,
    [logs, rails] = LINE2_STATIONS[k]!.bill;
  if (j.start >= 0) return { logs: 0, rails: 0 };
  const rail = w.get(Rail, railId(w))!,
    cart = w.get(Cart, cartId(w))!;
  return {
    logs: Math.max(
      0,
      Math.min(logs - j.stock - rail.depot - cart.logs - aboard(w, 'logs'), logs - rail[DEPOT_OUT[k]!]),
    ),
    rails: Math.max(
      0,
      Math.min(rails - j.railStock - rail.depotRails - cart.rails - aboard(w, 'rails'), rails - rail.shelfOut),
    ),
  };
}
/** Line two's logs, wherever they are (conserved with the line-one totals in railCounts). */
export function line2Logs(w: World, at?: number) {
  const f = w.get(Forge, forgeId(w))!,
    rail = w.get(Rail, railId(w))!;
  return (
    f.used +
    rail.depot +
    w.get(Cart, cartId(w))!.logs +
    aboard(w, 'logs') +
    line2Jobs(w, at).reduce((n, { job: j, run }) => n + j.stock + run.allocation + run.used, 0)
  );
}
const sumAccounts = (w: World, key: 'carry' | 'stone' | 'rails' | 'foot') => {
  let n = 0;
  w.each([Account], (_id, a) => (n += a[key]));
  return n;
};
const sumPiles = (w: World, kind: (k: number) => boolean) => {
  let n = 0;
  w.each([Pile], (_id, p) => (n += kind(p.kind) ? p.n : 0));
  return n;
};
/** Every rail poured, wherever it is: equals the forge's `poured`. */
export function line2Rails(w: World, at?: number) {
  const rail = w.get(Rail, railId(w))!;
  return (
    w.get(Forge, forgeId(w))!.rack +
    rail.depotRails +
    w.get(Cart, cartId(w))!.rails +
    aboard(w, 'rails') +
    sumAccounts(w, 'rails') +
    sumPiles(w, (k) => k === RAILS) +
    line2Jobs(w, at).reduce((n, { job: j, run }) => n + j.railStock + run.railAllocation + run.railUsed, 0) +
    w.get(Shed, shedId(w))!.cradleRails
  );
}
/** Conserved totals, including the depot cart and the line-2 kit train through line2Logs and line2Rails, and the
 * Works kiln's logs and stone; and the score. */
export function railCounts(w: World, at?: number) {
  const sum = (c: typeof Tree | typeof Hardwood | typeof Rock) => {
    let n = 0;
    w.each([c], (_id, r) => (n += r.left));
    return n;
  };
  const rail = w.get(Rail, railId(w))!,
    forge = w.get(Forge, forgeId(w))!,
    works = w.get(Works, worksId(w))!;
  const source = sum(Tree) + sum(Hardwood);
  const carry = sumAccounts(w, 'carry');
  const loose = sumPiles(w, (k) => !k);
  const line2 = line2Logs(w, at) + works.logs;
  const jobs = railJobs(w, at);
  const total = (f: (j: (typeof jobs)[number]) => number) => jobs.reduce((n, j) => n + f(j), 0);
  const stock = total((j) => j.job.stock),
    allocation = total((j) => j.run.allocation);
  const used = total((j) => j.run.used),
    delivered = total((j) => j.job.delivered);
  const completion = total((j) => j.job.completion);
  const stone = {
    source: sum(Rock),
    carry: sumAccounts(w, 'stone'),
    loose: sumPiles(w, (k) => k === 1),
    stock: total((j) => j.job.stoneStock),
    allocation: total((j) => j.run.stoneAllocation),
    used: total((j) => j.run.stoneUsed),
    rack: rail.stoneRack,
    kiln: works.stone,
    produced: rail.stoneProduced,
    delivered: total((j) => j.job.stoneDelivered),
    total: 0,
  };
  stone.total =
    stone.source + stone.carry + stone.loose + stone.stock + stone.allocation + stone.used + stone.rack + stone.kiln;
  const qjobs = line2Jobs(w, at);
  const rails = {
    forge: forge.rack,
    shelf: rail.depotRails,
    carry: sumAccounts(w, 'rails'),
    loose: sumPiles(w, (k) => k === RAILS),
    stations: qjobs.reduce((n, { job: j, run }) => n + j.railStock + run.railAllocation + run.railUsed, 0),
    poured: forge.poured,
    total: line2Rails(w, at),
    delivered: qjobs.reduce((n, { job: j }) => n + j.railDelivered, 0),
  };
  const line2Delivered = forge.used + qjobs.reduce((n, { job: j }) => n + j.delivered, 0);
  const beam = w.get(Beam, beamId(w))!.state;
  return {
    source,
    carry,
    loose,
    stock,
    allocation,
    used,
    line2,
    rack: rail.rack,
    produced: rail.produced + rail.depotProduced,
    total: source + carry + loose + stock + allocation + used + line2 + rail.rack,
    delivered,
    score:
      (delivered + line2Delivered) * T1.deliveryScore +
      rails.delivered * 40 +
      qjobs.reduce((n, { job: j }) => n + j.completion, 0) * T1.completionScore +
      completion * T1.completionScore +
      stone.delivered * 25 +
      (beam === 'allocated' || beam === 'used' ? 1500 : 0),
    completion,
    starterRails: T1.starterRails,
    stone,
    rails,
  };
}

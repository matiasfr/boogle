// The railway while nobody plays (docs/plans/ecs-migration-railway.md, section 2): offline resume with the producers'
// away credit (./railway-away.ts), and the supply pulse (regrowth and recovery, ./railway-supply.ts).
import { defineSystem, type World } from '../ecs/index.ts';
import { RAILWAY_SUPPLY, RAILWAY_T1 as T1 } from './railway-layout.ts';
import { LINE1_GREAT_TREE, LINE1_STATIONS } from './railway-line-layout.ts';
import { LINE2_FORGE as FORGE, LINE2_STATIONS, RAILS } from './railway-line2-layout.ts';
import { CART, CART_PHASE, cartCycleTicks } from './railway-cart.ts';
import {
  railGrows,
  railGrowthAllowed,
  RECOVERY_MINUTES,
  REGROW_MINUTES,
  type SupplyIntervals,
  type SupplyPulse,
} from './railway-supply.ts';
import { RAILWAY_MAX_INT } from './railway.ts';
import {
  Aperture,
  Beam,
  Boiler,
  Cart,
  Forge,
  ForgeClock,
  Job,
  JobRun,
  Pile,
  QJob,
  QJobRun,
  Rail,
  RailClock,
  Rock,
  Train,
  Tree,
  Works,
  Yard,
  YardClock,
} from './railway-components.ts';
import {
  activeStation,
  beamId,
  boilerId,
  cartId,
  cartServing,
  depotNeed,
  FOOT,
  forgeId,
  jobId,
  qActive,
  qjobId,
  railId,
  scheduleOf,
  worksId,
} from './railway-queries.ts';
import { jobClock } from './railway-sys-core.ts';
import { layLine1 } from './railway-sys-line1.ts';
import { boilerPedestal, cartMint, cartTakeRails, cartUnload, layLine2 } from './railway-sys-line2.ts';
import { yardsAway } from './railway-sys-trade.ts';

// ---------------------------------------------------------------- offline catch-up, sessions, supply, the beam
/** The away credit's producers (./railway-away.ts): `ticks` of production for the forge's rack and the depot cart, as
 * the rule tick would make them, never past the rack or the stretch's need, then slice 5's crate yards (the Yard rows,
 * yardsAway). Counted like a tick: poured and the depot's output grow with what is made. Applied before the funded job
 * finishes, so nothing is made for a stretch not yet reached. Returns the forge's and the cart's count (no caller reads
 * it). */
function awayCredit(w: World, ticks: number, tick: number) {
  if (ticks <= 0) return 0;
  let made = 0;
  const fid = forgeId(w);
  if (w.get(Forge, fid)!.lit >= 0) {
    const f = w.mut(Forge, fid)!;
    const n = Math.min(FORGE.rackMax - f.rack, Math.floor(ticks / FORGE.pourTicks));
    if (n > 0) {
      f.rack += n;
      f.poured += n;
      made += n;
    }
    if (f.rack >= FORGE.rackMax) {
      const c = w.mut(ForgeClock, fid)!;
      c.lastPour = Math.max(c.lastPour, tick);
    }
  }
  const k = cartServing(w);
  const trips = k >= 0 ? Math.floor(ticks / cartCycleTicks(k)) : 0;
  if (trips > 0) {
    // The cart's trips while away, each transfer as the tick would make it: the load under way lands, then whole trips
    // mint logs at the camp and move rails off the (credited) forge rack, and land them. It is home again after.
    cartUnload(w);
    const { logs, rails } = depotNeed(w, k, w.get(QJob, qjobId(w, k))!);
    const n = Math.min(logs, trips * CART.load);
    cartMint(w, k, n);
    cartTakeRails(w, Math.min(rails, trips * CART.rails, w.get(Forge, fid)!.rack));
    cartUnload(w);
    Object.assign(w.mut(Cart, cartId(w))!, { phase: CART_PHASE.REST, depart: tick, from: 0 });
    made += n;
  }
  // Slice 5's crate yards (R2): their own counter is Yard.made.
  yardsAway(w, ticks, tick);
  return made;
}
/** Bounded catch-up for the funded stretch only (the producers' credit comes first, from awayCredit). */
export const resume = defineSystem(
  'rail.resume',
  {
    reads: [Aperture],
    writes: [
      Rail,
      RailClock,
      Job,
      JobRun,
      QJob,
      QJobRun,
      Beam,
      Forge,
      ForgeClock,
      Cart,
      Boiler,
      Train,
      Works,
      Yard,
      YardClock,
    ],
    phase: 'resume',
    order: 0,
  },
  (w, { ticks, marker, tick, yard }: { ticks: number; marker: number; tick: number; yard: number }) => {
    const clock = w.mut(RailClock, railId(w))!;
    if (marker <= clock.resumeMarker) return 0;
    clock.resumeMarker = marker;
    awayCredit(w, yard, tick);
    const slot = activeStation(w),
      id = jobId(w, slot);
    const j = w.get(Job, id)!;
    if (j.start < 0 || j.completion) {
      const k = qActive(w);
      if (k < 0) return 0;
      const q = w.get(QJob, qjobId(w, k))!;
      if (q.start < 0 || q.completion) return 0;
      const run = w.mut(QJobRun, qjobId(w, k))!;
      const n = Math.min(ticks, scheduleOf(LINE2_STATIONS[k]!, q).totalTicks - run.elapsed);
      run.elapsed += n;
      layLine2(w, tick);
      return n;
    }
    const run = w.mut(JobRun, id)!;
    const n = Math.min(ticks, scheduleOf(LINE1_STATIONS[slot]!, j).totalTicks - run.elapsed);
    run.elapsed += n;
    layLine1(w, tick);
    return n;
  },
);
/** One away credit, consumed once per absolute marker: `yard` production ticks for the producers first (the forge, the
 * depot and slice 5's crate yards), then up to `ticks` for the funded job. Returns the job ticks advanced. */
export function railResume(w: World, ticks: number, marker: number, tick: number, yard = 0): number {
  const n = w.run(resume, { ticks, marker, tick, yard });
  w.run(jobClock, undefined);
  return n;
}
const DEFAULT_INTERVALS: SupplyIntervals = { regrow: REGROW_MINUTES, recover: RECOVERY_MINUTES };
/** Keep the saved 31/21 progress units and stage codes unchanged. The global minute phase supplies a deterministic
 * fractional remainder without more per-source state. Clamp elapsed time before multiplying. */
const progressUnits = (marker: number, minutes: number, interval: number, units: number) => {
  const phase = marker % interval;
  return (
    Math.floor(((phase + Math.min(minutes, interval)) * units) / interval) - Math.floor((phase * units) / interval)
  );
};
/** Idempotent accepted event. Nearby/unknown players are excluded by the host before it stamps recover ids. */
export const supply = defineSystem(
  'rail.supply',
  { writes: [Rail, RailClock, Pile, Forge, Tree, Rock, Beam, Boiler, Works], phase: 'supply', order: 0 },
  (w, { e, intervals }: { e: SupplyPulse; intervals: SupplyIntervals }) => {
    const rid = railId(w);
    const clock = w.get(RailClock, rid)!;
    if (e.marker < clock.supplyMarker) return 0;
    const marker = clock.supplyMarker;
    const minutes = marker ? Math.min(1440, e.marker - marker) : 0;
    const regrow = progressUnits(marker, minutes, intervals.regrow, REGROW_MINUTES);
    const recover = progressUnits(marker, minutes, intervals.recover, RECOVERY_MINUTES);
    w.mut(RailClock, rid)!.supplyMarker = e.marker;
    const rail = w.mut(Rail, rid)!;
    let moved = 0;
    w.each(
      [Pile],
      (id, pile) => {
        pile.age = Math.min(RECOVERY_MINUTES, pile.age + recover);
        if (pile.age === RECOVERY_MINUTES && e.recover.includes(id)) {
          if (pile.kind === 1) rail.stoneRack += pile.n;
          // Abandoned rails return to the forge's rack; logs to the recovery rack.
          else if (pile.kind === RAILS) w.mut(Forge, forgeId(w))!.rack += pile.n;
          // An abandoned footing goes back to the Works rack (past its cap if it must).
          else if (pile.kind === FOOT) w.mut(Works, worksId(w))!.rack += pile.n;
          else rail.rack += pile.n;
          moved += pile.n;
          pile.n = 0;
          w.despawn(id);
        }
      },
      [Pile],
    );
    w.each(
      [Tree],
      (_id, t) => {
        if (t.left !== 0) return;
        const age = t.age;
        if (age < REGROW_MINUTES) t.age = Math.min(REGROW_MINUTES, age + regrow);
        // Each visible stage takes a separate accepted minute, even after a long offline gap.
        if (
          age < REGROW_MINUTES ||
          !minutes ||
          !railGrows(e.grow, t.slot) ||
          !railGrowthAllowed(t.slot, true) ||
          rail.produced > 2147483647 - RAILWAY_SUPPLY - 30 - 15
        )
          return;
        t.age = age + 1;
        if (t.age !== 35) return;
        const yieldCount = rail.axe ? 15 : T1.sourceYield;
        Object.assign(t, { left: yieldCount, big: rail.axe, work: 0, yaw: 0, fell: false });
        rail.produced += yieldCount;
      },
      [Tree],
    );
    const b = w.get(Beam, beamId(w))!;
    if (b.state === 'ground') {
      w.mut(Beam, beamId(w))!.age = Math.min(RECOVERY_MINUTES, b.age + recover);
      // Back to the tree: an abandoned beam recovers once its minutes are up (railBeamRecover).
      const g = w.get(Beam, beamId(w))!;
      if (e.beam !== undefined && g.revision === e.beam && g.age === 21 && g.revision < 2147483647) {
        Object.assign(w.mut(Beam, beamId(w))!, { state: 'available', x: LINE1_GREAT_TREE.x, y: 3000, age: 0 });
        const bm = w.mut(Beam, beamId(w))!;
        bm.z = LINE1_GREAT_TREE.z;
        bm.revision++;
        moved += 1;
      }
    }
    const boiler = w.get(Boiler, boilerId(w))!;
    if (boiler.state === 'ground') {
      const row = w.mut(Boiler, boilerId(w))!;
      row.age = Math.min(RECOVERY_MINUTES, row.age + recover);
      if (e.boiler === row.revision && row.age === 21 && row.revision < RAILWAY_MAX_INT) {
        boilerPedestal(w);
        moved++;
      }
    }
    w.each([Rock], (id, r) => {
      if (r.left !== 0) return;
      const rm = w.mut(Rock, id)!;
      rm.age = Math.min(REGROW_MINUTES, rm.age + regrow);
      if (rm.age === REGROW_MINUTES && rail.stoneProduced <= 2147483647 - 32) {
        Object.assign(rm, { left: 8, work: 0, age: 0 });
        rail.stoneProduced += 8;
      }
    });
    return moved;
  },
);
export function railSupplyPulse(w: World, e: SupplyPulse, intervals: SupplyIntervals = DEFAULT_INTERVALS) {
  return w.run(supply, { e, intervals });
}

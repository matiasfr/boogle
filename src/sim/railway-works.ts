// Split-rock Works and the smallest Roundhouse (docs/plans/split-rock-roundhouse.md, "The rules"): the read model's
// shapes, read helpers and invariants. Pure and integer only; the rules are systems in ./railway-sys-works.ts.
//
//   footingTotal(s)        every footing's home: Works rack, backs, ground piles, the wagon, pier rack, stall, cradle, sea
//   pierNeed(s)            footings the pier still wants that are not already set, racked there or aboard the wagon
//   worksStage(s)          a label for views and the bot
//   validateRailWorks(s)   the invariants (railwayCheck runs them on every load)
import type { Railway } from './railway.ts';
import { WORKS } from './railway-works-layout.ts';
import { line2Completed } from './railway-line2.ts';
import { LINE2, RAIL_TRAINS } from './railway-lines.ts';

export type RailWorks = {
  /** 0 none, 1 on the pedestal, 2 taken. */
  breaker: number;
  /** Bit 1 the stall slab, bit 2 the throat. */
  seams: number;
  logs: number;
  stone: number;
  /** The tick the kiln lit, or -1. */
  lit: number;
  rack: number;
  poured: number;
  pierRack: number;
  pierSet: number;
  /** The tick the twelfth footing was set, or -1. */
  crossing: number;
  /** Not replicated: the last cast's tick (the server's clock). */
  lastCast: number;
};
export type RailShed = {
  stall: number;
  cradle: number;
  cradleRails: number;
  fitted: number;
  /** 0 the stall road, 1 line 2's road. */
  table: number;
  tableRev: number;
  /** The tick the wagon reaches its wait on line 2 (it rolled out), or -1. */
  ready: number;
};
export const WORKS_STAGES = ['dormant', 'breaker', 'open', 'lit', 'stall', 'fitted', 'wagon', 'crossing'] as const;
export type WorksStage = (typeof WORKS_STAGES)[number];
export const SEAM_STALL = 1;
export const SEAM_THROAT = 2;

const wagonFoot = (s: Railway) => s.trains.reduce((n, r) => n + r.foot, 0);
export function footingTotal(s: Railway) {
  const w = s.works,
    h = s.shed;
  return (
    (w ? w.rack + w.pierRack + w.pierSet : 0) +
    (h ? h.stall + h.cradle : 0) +
    s.accounts.reduce((n, a) => n + (a.foot ?? 0), 0) +
    s.piles.reduce((n, p) => n + (p.kind === 3 ? p.n : 0), 0) +
    wagonFoot(s) +
    (s.ring ? s.ring.rack + s.ring.set + s.ring.cw : 0) // Ring Island's (v27)
  );
}
/** Footings the pier still wants (never below 0: after Q7 the wagon carries the ring's). */
export const pierNeed = (s: Railway) =>
  Math.max(0, WORKS.pier - (s.works?.pierSet ?? 0) - (s.works?.pierRack ?? 0) - wagonFoot(s));
export function worksStage(s: Railway): WorksStage {
  const w = s.works,
    h = s.shed;
  if (!w || !h || w.breaker === 0) return 'dormant';
  if (w.crossing >= 0) return 'crossing';
  if (s.trains.some((r) => r.wagon)) return 'wagon';
  if (h.fitted >= 0) return 'fitted';
  if (h.stall === WORKS.stall) return 'stall';
  if (w.lit >= 0) return 'lit';
  if (w.seams & SEAM_THROAT) return 'open';
  return 'breaker';
}

const int = (v: unknown, max = 2147483647, min = 0): v is number =>
  typeof v === 'number' && Number.isSafeInteger(v) && v >= min && v <= max && !Object.is(v, -0);
/** Whole-document invariants; throws before any live state is replaced. */
export function validateRailWorks(s: Railway) {
  const w = s.works,
    h = s.shed,
    l2 = s.line2;
  if (!w || !h || !l2) throw new Error('railway: works missing');
  const done = line2Completed(s) >= 6;
  if (
    !int(w.breaker, 2) ||
    !int(w.seams, 3) ||
    !int(w.logs, WORKS.kilnLogs) ||
    !int(w.stone, WORKS.kilnStone) ||
    !int(w.lit, 2147483647, -1) ||
    !int(w.rack, WORKS.total) ||
    !int(w.poured, WORKS.total) ||
    !int(w.pierRack, WORKS.pier) ||
    !int(w.pierSet, WORKS.pier) ||
    !int(w.crossing, 2147483647, -1) ||
    !int(w.lastCast)
  )
    throw new Error('railway: works bounds');
  if (
    !int(h.stall, WORKS.stall) ||
    !int(h.cradle, WORKS.cradle) ||
    !int(h.cradleRails, WORKS.cradleRails) ||
    !int(h.fitted, 2147483647, -1) ||
    !int(h.table, 1) ||
    !int(h.tableRev) ||
    !int(h.ready, 2147483647, -1)
  )
    throw new Error('railway: shed bounds');
  // Works: the breaker comes with Q6; every seam and the kiln after it.
  if (w.breaker > 0 !== done) throw new Error('railway: breaker');
  if (w.seams > 0 && w.breaker !== 2) throw new Error('railway: seam before the breaker');
  if (w.lit >= 0 !== (w.logs === WORKS.kilnLogs && w.stone === WORKS.kilnStone)) throw new Error('railway: kiln lit');
  if ((w.logs || w.stone) && !(w.seams & SEAM_THROAT)) throw new Error('railway: kiln before the throat');
  if (w.lit >= 0 && w.lastCast < w.lit) throw new Error('railway: cast clock');
  if (w.lit < 0 && (w.poured || w.lastCast)) throw new Error('railway: unlit cast');
  if (w.pierRack + w.pierSet > WORKS.pier) throw new Error('railway: pier');
  if (w.pierRack + w.pierSet > 0 && !done) throw new Error('railway: pier before Q6');
  if (w.crossing >= 0 !== (w.pierSet === WORKS.pier)) throw new Error('railway: crossing');
  // The shed: the stall on the slab's footings, the cradle after it, fitted with both footings and every rail.
  if (h.stall > 0 && !(w.seams & SEAM_STALL)) throw new Error('railway: stall before the slab');
  if ((h.cradle > 0 || h.cradleRails > 0 || h.table === 1 || h.tableRev > 0) && h.stall !== WORKS.stall)
    throw new Error('railway: cradle before the stall');
  if (h.fitted >= 0 !== (h.cradle === WORKS.cradle && h.cradleRails === WORKS.cradleRails))
    throw new Error('railway: fitted');
  // The table turns once, only when ready: after the fit, to line 2's road, sending the wagon out.
  if (h.tableRev !== h.table || (h.table === 1 && h.fitted < 0)) throw new Error('railway: table turned early');
  // The wagon couples to one line 2 train and stays on it (docs/plans/generic-lines.md, v26).
  if (s.trains.some((r) => typeof r.wagon !== 'boolean' || !int(r.foot))) throw new Error('railway: wagon');
  const coupled = s.trains.filter((r) => r.wagon);
  if (coupled.length > 1) throw new Error('railway: two wagons');
  if (h.ready >= 0 && h.fitted < 0) throw new Error('railway: ready before fitted');
  // Before it couples the wagon is on its way out exactly while the cradle is fitted and the table points at line 2;
  // once coupled it stays, and the table is a toy.
  if (coupled.length ? h.ready < 0 : h.ready >= 0 !== (h.fitted >= 0 && h.table === 1))
    throw new Error('railway: wagon rollout');
  if (
    s.trains.some(
      (r, slot) =>
        (r.wagon && RAIL_TRAINS[slot]!.line !== LINE2) ||
        r.foot > WORKS.wagonCap ||
        (r.foot > 0 && !r.wagon) ||
        (r.wagon && h.fitted < 0),
    )
  )
    throw new Error('railway: wagon');
  // Footings: one fills a back, alone.
  for (const a of s.accounts) {
    const foot = a.foot ?? 0;
    if (!int(foot, 1)) throw new Error('railway: foot');
    if (
      foot &&
      (a.carry ||
        a.stone ||
        a.rails ||
        (s.line?.beam.state === 'held' && s.line.beam.holder === a.pid) ||
        (l2.boiler.state === 'held' && l2.boiler.holder === a.pid))
    )
      throw new Error('railway: foot on a full back');
  }
  if (s.piles.some((p) => p.kind === 3 && p.n !== 1)) throw new Error('railway: footing pile');
  if (w.poured > 0 && w.lit < 0) throw new Error('railway: unlit cast');
  if (footingTotal(s) !== w.poured) throw new Error('railway: footing conservation');
}

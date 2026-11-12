// The Works and the Roundhouse's systems (docs/plans/ecs-migration-railway.md, section 2; ./railway-works.ts): the
// breaker, the seams, the kiln and its casting tick, the footings, the cradle and the turntable, and a footing's
// absent-carrier path.
import { defineSystem, type World } from '../ecs/index.ts';
import { pierLaid } from './railway-line2-layout.ts';
import { WORKS } from './railway-works-layout.ts';
import { SEAM_STALL, SEAM_THROAT } from './railway-works.ts';
import { railInt, RAILWAY_MAX_INT } from './railway.ts';
import { Account, Aperture, Beam, Boiler, Leg, QJob, Shed, Train, Works, WorksClock } from './railway-components.ts';
import { legKitPut } from './railway-sys-route-kit.ts';
import { aboard, boilerHeld, FOOT, qCompleted, roomFor, shedId, wagonSlot, worksId } from './railway-queries.ts';
import type { Act, Tick } from './railway-sys-core.ts';

// ---------------------------------------------------------------- the Works and the Roundhouse (./railway-works.ts)
// Server kind: every op is judged from the actor's own position by railValid; each transfer is one apply.
/** The breaker on the boiler's old pedestal: the forge's third made thing, cast when Q6 is laid. A room-wide rung.
 * Not while you haul the boiler (docs/plans/boiler-first-choice.md, Part 2): a guard for worlds where the two met. */
export const breaker = defineSystem(
  'rail.breaker',
  { reads: [Account, Boiler], writes: [Works], phase: 'act', order: 33 },
  (w, { a: aid }: Act) => {
    if (w.get(Works, worksId(w))!.breaker !== 1 || boilerHeld(w, w.get(Account, aid)!.pid)) return 0;
    w.mut(Works, worksId(w))!.breaker = 2;
    return 1;
  },
);
/** One generous strike opens a seam (0 the stall slab, 1 the throat); a repeat strike moves nothing. Not while you
 * haul the boiler. */
export const strike = defineSystem(
  'rail.strike',
  { reads: [Account, Boiler], writes: [Works], phase: 'act', order: 34 },
  (w, { a: aid, e }: Act) => {
    const works = w.get(Works, worksId(w))!;
    if (!railInt(e.id, 1) || works.breaker !== 2 || boilerHeld(w, w.get(Account, aid)!.pid)) return 0;
    const bit = e.id ? SEAM_THROAT : SEAM_STALL;
    if (works.seams & bit) return 0;
    w.mut(Works, worksId(w))!.seams = works.seams | bit;
    return 1;
  },
);
/** Logs and stone off your back into the kiln's bills; it lights the moment both are full. */
export const kiln = defineSystem(
  'rail.kiln',
  { reads: [Aperture], writes: [Works, WorksClock, Account, Leg], phase: 'act', order: 35 },
  (w, { a: aid, tick }: Act) => {
    const id = worksId(w),
      works = w.get(Works, id)!;
    if (!(works.seams & SEAM_THROAT) || works.lit >= 0) return 0;
    const a = w.get(Account, aid)!;
    const logs = Math.min(a.carry, WORKS.kilnLogs - works.logs),
      stone = Math.min(a.stone, WORKS.kilnStone - works.stone);
    if (logs + stone <= 0) return 0;
    const am = w.mut(Account, aid)!,
      wm = w.mut(Works, id)!;
    am.carry -= logs;
    am.stone -= stone;
    wm.logs += logs;
    wm.stone += stone;
    if (wm.logs === WORKS.kilnLogs && wm.stone === WORKS.kilnStone) wm.lit = w.mut(WorksClock, id)!.lastCast = tick;
    legKitPut(w, aid, logs, 0); // a leg rack's logs fed here are owed again (the step 3 review's P2-2)
    return logs + stone;
  },
);
/** The wagon rolls out to wait on line 2 once the cradle is fitted and the table points at line 2 (any op that makes
 * that true calls this); it couples to the first line 2 train that stands at the village after it is ready. Every
 * train runs end to end since v26, so none needs calling back for it. */
function commission(w: World, tick: number) {
  const h = w.get(Shed, shedId(w))!;
  if (h.fitted >= 0 && h.table === 1 && h.ready < 0 && wagonSlot(w) < 0)
    w.mut(Shed, shedId(w))!.ready = tick + WORKS.rollTicks;
}
/** Shoulder a footing (rack 0 the Works rack, 1 the pier rack): it fills an empty back. */
export const footTake = defineSystem(
  'rail.footTake',
  { reads: [Beam, Boiler], writes: [Works, Account], phase: 'act', order: 36 },
  (w, { a: aid, e }: Act) => {
    const a = w.get(Account, aid)!,
      works = w.get(Works, worksId(w))!;
    if (!railInt(e.rack, 1) || roomFor(w, a, FOOT) < 1) return 0;
    const key = e.rack ? 'pierRack' : 'rack';
    if (works[key] <= 0) return 0;
    w.mut(Works, worksId(w))![key]--;
    w.mut(Account, aid)!.foot = 1;
    return 1;
  },
);
/** Set the footing on your back: 0 the stall (after the slab), 1 the cradle (after the stall), 2 the pier (after
 * Q6, while the pier still needs one that is not already racked there or aboard the wagon). */
export const footSet = defineSystem(
  'rail.footSet',
  { reads: [QJob], writes: [Works, Shed, Account, Train], phase: 'act', order: 37 },
  (w, { a: aid, e, tick }: Act) => {
    const a = w.get(Account, aid)!;
    if (a.foot !== 1 || !railInt(e.site, 2)) return 0;
    const works = w.get(Works, worksId(w))!,
      h = w.get(Shed, shedId(w))!;
    if (e.site === 0) {
      if (!(works.seams & SEAM_STALL) || h.stall >= WORKS.stall) return 0;
      w.mut(Shed, shedId(w))!.stall++;
    } else if (e.site === 1) {
      if (h.stall !== WORKS.stall || h.cradle >= WORKS.cradle) return 0;
      w.mut(Shed, shedId(w))!.cradle++;
      fit(w, tick);
    } else {
      if (!pierLaid(qCompleted(w)) || works.pierSet + works.pierRack + aboard(w, 'foot') >= WORKS.pier) return 0;
      const wm = w.mut(Works, worksId(w))!;
      wm.pierSet++;
      if (wm.pierSet === WORKS.pier) wm.crossing = tick;
    }
    w.mut(Account, aid)!.foot = 0;
    return 1;
  },
);
/** Whichever op completes the cradle (its eight rails; WORKS.cradle footings, none since 10 November) fits it. */
function fit(w: World, tick: number) {
  const h = w.get(Shed, shedId(w))!;
  if (h.fitted >= 0 || h.cradle !== WORKS.cradle || h.cradleRails !== WORKS.cradleRails) return;
  w.mut(Shed, shedId(w))!.fitted = tick;
  commission(w, tick);
}
/** Rails off your back onto the cradle, up to its eight, once the stall stands. */
export const cradle = defineSystem(
  'rail.cradle',
  { writes: [Shed, Account, Train, Leg], reads: [QJob, Aperture], phase: 'act', order: 38 },
  (w, { a: aid, tick }: Act) => {
    const h = w.get(Shed, shedId(w))!;
    if (h.stall !== WORKS.stall) return 0;
    const n = Math.min(w.get(Account, aid)!.rails, WORKS.cradleRails - h.cradleRails);
    if (n <= 0) return 0;
    w.mut(Account, aid)!.rails -= n;
    w.mut(Shed, shedId(w))!.cradleRails += n;
    legKitPut(w, aid, 0, n);
    fit(w, tick);
    return n;
  },
);
/** Turn the table to a road, on the revision the actor saw. Only when ready (owner, 10 November): once the cradle is
 * fitted and before the wagon rolls out, so the one turn there is sends the wagon out. Earlier, while it rolls out or
 * waits for its train, and after it couples, a turn is refused: no press is accepted and silent. */
export const turn = defineSystem(
  'rail.turn',
  { reads: [QJob], writes: [Shed, Train], phase: 'act', order: 39 },
  (w, { e, tick }: Act) => {
    const h = w.get(Shed, shedId(w))!;
    if (h.stall !== WORKS.stall || !railInt(e.to, 1) || e.revision !== h.tableRev || e.to === h.table) return 0;
    if (h.tableRev >= RAILWAY_MAX_INT) return 0;
    if (h.fitted < 0 || h.ready >= 0 || wagonSlot(w) >= 0) return 0;
    const hm = w.mut(Shed, shedId(w))!;
    hm.table = e.to;
    hm.tableRev++;
    commission(w, tick);
    return 1;
  },
);
/** The Works kiln: once lit with the throat open, one footing down the rollers every castTicks while the rack has
 * room, WORKS.total in all. A full rack waits; the next cast comes as soon as there is room. */
export const worksTick = defineSystem(
  'rail.worksTick',
  { writes: [Works, WorksClock], phase: 'tick', order: 4 },
  (w, { tick }: Tick) => {
    const id = worksId(w),
      works = w.get(Works, id)!;
    if (
      works.lit < 0 ||
      !(works.seams & SEAM_THROAT) ||
      works.poured >= WORKS.total ||
      works.rack >= WORKS.rackCap ||
      tick - w.get(WorksClock, id)!.lastCast < WORKS.castTicks
    )
      return;
    const wm = w.mut(Works, id)!;
    wm.rack++;
    wm.poured++;
    w.mut(WorksClock, id)!.lastCast = tick;
  },
);
export const footRelease = defineSystem(
  'rail.footRelease',
  { writes: [Account, Works], phase: 'foot', order: 0 },
  (w, q: { pid: string; epoch: number }) => {
    const id = w.lookup(Account, q.pid);
    const a = id === undefined ? undefined : w.get(Account, id)!;
    if (!a || a.foot !== 1 || a.epoch !== q.epoch) return 0;
    w.mut(Account, id!)!.foot = 0;
    w.mut(Works, worksId(w))!.rack++;
    return 1;
  },
);
/** A footing's carrier stayed away past the grace: it goes back to the Works rack, so the kiln's sixteen always reach
 * their sites. What keeps it on a returned carrier's back is the host's live-session check: `r:open` makes the session
 * active and bumps the account epoch in one synchronous step. `epoch` only refuses a release for a session that has
 * since changed; the host passes the current one, so in practice it never does. */
export const railFootRelease = (w: World, pid: string, epoch: number): number => w.run(footRelease, { pid, epoch });
/** Who carries a footing, and in which session (the host's leaver check; accepted state only). */
export function railFootHolders(w: World) {
  const out: { pid: string; epoch: number }[] = [];
  w.each([Account], (_id, a) => void (a.foot > 0 && out.push({ pid: a.pid, epoch: a.epoch })));
  return out;
}

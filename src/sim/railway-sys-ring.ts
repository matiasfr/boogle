// Ring Island's gap (docs/plans/ring-island-build1.md, R3, v27): the bents footed out from the pier head, the railhead
// rack, the counterweight, the raised leaf's brace and the rivet, on the `Aperture` row (./railway-components.ts).
// Server kind; pure integers and ticks. Each op is judged from the actor's own position by the server's reach check
// (src/world/railway-server.ts); the rules here gate on state only. The queries they share (ringHead, ringOpen,
// ringOwed, q7Laid) are ./railway-queries.ts's.
//
//   ringFootTake   rail.footTake { rack: 2 }   a footing off the railhead rack onto an empty back
//   ringFootSet    rail.footSet { site: 3 }    the railhead jib: the next bent's footing (after Q7), then the
//                                              counterweight's four; a bent's second footing moves the Railhead on
//   brace          rail.brace { revision: 1 }  knock the raised leaf's pawl out, once the gap is footed
//   ringStrike     rail.strike { id: 2 }       the rivet, once the leaf is down: the line runs on to Ring Island
import { defineSystem } from '../ecs/index.ts';
import { WORKS } from './railway-works-layout.ts';
import { LINE2 } from './railway-lines.ts';
import { endMoved, stopMoved } from './railway-trains.ts';
import { railInt } from './railway.ts';
import { Account, Aperture, Beam, Boiler, Leg, QJob, Train, Works } from './railway-components.ts';
import { apertureId, boilerHeld, FOOT, q7Laid, roomFor, worksId } from './railway-queries.ts';
import { trainMoveIO } from './railway-sys-trains.ts';
import type { Act } from './railway-sys-core.ts';

/** Line 2's Railhead halt (its index in the line): the stop that moves with `head`. */
export const RAILHEAD = 4;
/** The brace's states (the brief's encoding). */
export const BRACE = { DOWN: 0, RAISED: 1, BRACED: 2 } as const;
const FOOTED = WORKS.ring;

/** Shoulder a footing off the railhead rack (rack 2): it fills an empty back. */
export const ringFootTake = defineSystem(
  'rail.ringFootTake',
  { reads: [Beam, Boiler], writes: [Aperture, Account], phase: 'act', order: 50 },
  (w, { a: aid, e }: Act) => {
    if (e.rack !== 2 || roomFor(w, w.get(Account, aid)!, FOOT) < 1) return 0;
    const id = apertureId(w);
    if (w.get(Aperture, id)!.rack <= 0) return 0;
    w.mut(Aperture, id)!.rack--;
    w.mut(Account, aid)!.foot = 1;
    return 1;
  },
);
/** The railhead jib (site 3), its meaning by state (call 7): once Q7 is laid, the next bent's footing while the gap is
 * not footed (a bent's second footing moves the Railhead on a bent: stopMoved); then a counterweight footing while
 * fewer than four hang, and the fourth with the leaf braced brings it down. */
export const ringFootSet = defineSystem(
  'rail.ringFootSet',
  { reads: [QJob, Leg], writes: [Aperture, Account, Train], phase: 'act', order: 51 },
  (w, { a: aid, e, tick }: Act) => {
    if (e.site !== 3 || w.get(Account, aid)!.foot !== 1 || !q7Laid(w)) return 0;
    const id = apertureId(w),
      a = w.get(Aperture, id)!;
    if (a.set < FOOTED) {
      const m = w.mut(Aperture, id)!;
      m.set++;
      // Each bent's second footing: the railhead (and its stop and end block) is a bent further on.
      if (m.set % 2 === 0) stopMoved(trainMoveIO(w), LINE2, RAILHEAD, tick);
    } else if (a.cw < WORKS.counterweight) {
      const m = w.mut(Aperture, id)!;
      m.cw++;
      if (m.cw === WORKS.counterweight && m.brace === BRACE.BRACED) m.brace = BRACE.DOWN;
    } else return 0;
    w.mut(Account, aid)!.foot = 0;
    return 1;
  },
);
/** Knock out the pawl on the brace the actor saw (revision 1, raised): only once the gap is footed. With the
 * counterweight already hung the leaf comes down; otherwise it is braced and waits for it (call 9). */
export const brace = defineSystem('rail.brace', { writes: [Aperture], phase: 'act', order: 52 }, (w, { e }: Act) => {
  const id = apertureId(w),
    a = w.get(Aperture, id)!;
  if (e.revision !== 1 || a.set !== FOOTED || a.brace !== BRACE.RAISED) return 0;
  w.mut(Aperture, id)!.brace = a.cw === WORKS.counterweight ? BRACE.DOWN : BRACE.BRACED;
  return 1;
});
/** Strike the gold rivet (id 2) once the leaf is down: the line is joined, Ring Island opens, and the Railhead stops
 * being the end (endMoved). A repeat strike moves nothing; not while you haul the boiler (the seams' rule). */
export const ringStrike = defineSystem(
  'rail.ringStrike',
  { reads: [Account, Boiler, Works, QJob, Leg], writes: [Aperture, Train], phase: 'act', order: 53 },
  (w, { a: aid, e, tick }: Act) => {
    if (!railInt(e.id, 2) || e.id !== 2 || boilerHeld(w, w.get(Account, aid)!.pid)) return 0;
    const id = apertureId(w),
      a = w.get(Aperture, id)!;
    if (w.get(Works, worksId(w))!.breaker !== 2 || a.brace !== BRACE.DOWN || a.joined >= 0) return 0;
    w.mut(Aperture, id)!.joined = tick;
    endMoved(trainMoveIO(w), LINE2, RAILHEAD, tick);
    return 1;
  },
);

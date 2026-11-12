// The greybox route's systems (docs/plans/greybox-route.md, step 3): a leg's frame fed, a section laying over its lay
// clock and the railhead moving on, a pickup taken, a barrier opened and the arrival, on the `Leg` and `Route` rows
// (./railway-components.ts). Server kind; pure integers and ticks. Each op is judged from the actor's own position by
// the server's reach check (src/world/railway-server.ts); the rules here gate on state only, so a client can open
// nothing out of turn. The kit's side on the trains is ./railway-sys-route-kit.ts; the facts are
// ./railway-queries-route.ts's.
//
//   legStock   rail.legStock { leg }   what you carry into the open leg's current frame, up to its bill; a full bill
//                                      starts the section laying (its `start` tick)
//   legTick    the rule tick           a section laid LEG_TUNE.layTicks after its start: the railhead moves on, the
//                                      last section opens the leg's destination (endMoved, stopMoved)
//   grant      rail.grant { id }       a pickup (RAIL_GRANTS[id]) for the room, once its leg is complete; once
//   gate       rail.gate { id }        a barrier (RAIL_GATES[id]), once the room holds its grant and its leg is open; once
//   arrive     rail.arrive {}          the meeting, once the route's last leg is laid and a train stands at its end; once
import { defineSystem, type World } from '../ecs/index.ts';
import { RAIL_GATES, RAIL_GRANTS, RAIL_LEGS, LEG_TUNE } from './railway-route.ts';
import { RAIL_LINES, RAIL_TRAINS } from './railway-lines.ts';
import { TRAIN_PHASE } from './railway-train.ts';
import { LINE_SLOTS, endMoved } from './railway-trains.ts';
import { reqAdd, reqDrop, reqOnly } from './railway-train.ts';
import { railInt } from './railway.ts';
import { Account, Aperture, Boiler, Leg, Line, QJob, Route, Train } from './railway-components.ts';
import { boilerHeld, stopsOf } from './railway-queries.ts';
import { gateLeg, legDone, legId, legKitStop, legOpen, legRow, routeId, routeRow } from './railway-queries-route.ts';
import { trainMoveIO } from './railway-sys-trains.ts';
import type { Act, Tick } from './railway-sys-core.ts';

const bit = (k: number) => 1 << k;
/** Put what you carry into the open leg's current frame (`leg`, a RAIL_LEGS index): logs and rails, each up to what the
 * section's bill still lacks. Refused when the leg is not open (not built, its `after` incomplete, or complete), the
 * section is already laying, its barrier is shut, the back holds nothing the bill lacks, or you haul the boiler. The
 * last unit starts the section laying. Returns the units taken. */
export const legStock = defineSystem(
  'rail.legStock',
  { reads: [Aperture, Route, Boiler], writes: [Leg, Account], phase: 'act', order: 60 },
  (w, { a: aid, e, tick }: Act) => {
    if (!railInt(e.leg, RAIL_LEGS.length - 1) || !legOpen(w, e.leg)) return 0;
    const k = e.leg,
      row = legRow(w, k),
      sec = RAIL_LEGS[k]!.sections[row.laid]!;
    if (row.start >= 0 || (sec.gate !== undefined && !(routeRow(w).gates & bit(sec.gate)))) return 0;
    const a = w.get(Account, aid)!;
    if (boilerHeld(w, a.pid)) return 0;
    const logs = Math.min(a.carry, sec.logs - row.logs),
      rails = Math.min(a.rails, sec.rails - row.rails);
    if (logs + rails <= 0) return 0;
    const am = w.mut(Account, aid)!,
      m = w.mut(Leg, legId(w, k))!;
    am.carry -= logs;
    am.rails -= rails;
    m.logs += logs;
    m.rails += rails;
    if (m.logs === sec.logs && m.rails === sec.rails) m.start = tick;
    return logs + rails;
  },
);
/** Leg k's section is laid: its fed bill is spent and the line runs on (the stops read `laid`). Its first section moves
 * the line's end from the leg's first halt to its railhead; the next move the railhead on a section; the last opens the
 * destination past it (with one section, the first halt's end moves straight there). */
function lay(w: World, k: number, tick: number) {
  const leg = RAIL_LEGS[k]!,
    n = leg.sections.length,
    from = legKitStop(w, k); // the rack's halt before this section: the line's end
  const m = w.mut(Leg, legId(w, k))!;
  m.laid++;
  m.logs = m.rails = 0;
  m.start = -1;
  // The line runs on past the old end (its first halt, then each head), which stays a stop (call 88): a train running
  // up to it stops there once (endMoved), and the line's up-way ask there brings the first up train after the lay to
  // it, so whoever stands at the old head rides on to the new one.
  const io = trainMoveIO(w);
  endMoved(io, leg.line, from, tick);
  // A train standing at an old head (a stub: its two tracks are one) runs on rather than home (call 88: "that train
  // runs on"): it had turned onto the down track on arriving at the end, and turns back up.
  const end = RAIL_LINES[leg.line]!.halts[from]!.end;
  if (end?.kind === 'stub')
    for (const slot of LINE_SLOTS[leg.line]!) {
      const r = io.row(slot);
      if (r.phase === TRAIN_PHASE.STAND && r.at === from && r.track === 1)
        io.set(slot, { track: 0, req: reqOnly(r.req, stopsOf(w, leg.line).length, 1) });
    }
  const lid = w.lookup(Line, leg.line)!,
    stops = stopsOf(w, leg.line).length;
  w.mut(Line, lid)!.req = reqAdd(w.get(Line, lid)!.req, from, 1, stops);
  // A head closing behind with this lay (`closesAt`): a train standing there stands at a signal, as at a moved stop,
  // and every ask there goes (no lever, no rider stop: the halt passes both ways from now).
  RAIL_LINES[leg.line]!.halts.forEach((h, j) => {
    if (h.closesAt !== stops) return;
    for (const slot of LINE_SLOTS[leg.line]!) {
      const r = io.row(slot);
      if (r.phase === TRAIN_PHASE.STAND && r.at === j) io.set(slot, { at: -1, to: -1 });
      const req = reqDrop(reqDrop(io.row(slot).req, j, 1, stops), j, -1, stops);
      if (req !== io.row(slot).req) io.set(slot, { req });
    }
    w.mut(Line, lid)!.req = reqDrop(reqDrop(w.get(Line, lid)!.req, j, 1, stops), j, -1, stops);
  });
  void n;
}
/** The lay clock: a section laying since `start` is laid LEG_TUNE.layTicks later (about 30 s whatever its length;
 * ruling 1.3). Reads the tick against the row's `start`, so nothing is written until it lays. */
export const legTick = defineSystem(
  'rail.legTick',
  { reads: [Aperture, Route, QJob], writes: [Leg, Train, Line], phase: 'tick', order: 1.5 },
  (w, { tick }: Tick) => {
    for (let k = 0; k < RAIL_LEGS.length; k++) {
      const start = legRow(w, k).start;
      if (start >= 0 && tick >= start + LEG_TUNE.layTicks) lay(w, k, tick);
    }
  },
);
/** Take a pickup (`id`, a RAIL_GRANTS index) for the room: refused until its leg's last section is laid, and once
 * taken. */
export const grant = defineSystem(
  'rail.grant',
  { reads: [Leg], writes: [Route], phase: 'act', order: 61 },
  (w, { e }: Act) => {
    if (!railInt(e.id, RAIL_GRANTS.length - 1)) return 0;
    const g = RAIL_GRANTS[e.id]!,
      r = routeRow(w);
    if (r.grants & bit(e.id) || !legDone(w, g.leg)) return 0;
    w.mut(Route, routeId(w))!.grants = r.grants | bit(e.id);
    return 1;
  },
);
/** Open a barrier (`id`, a RAIL_GATES index): refused unless the room holds its `needs` grant and the leg whose frame
 * it shuts is open (built and its `after` complete: the Notch's waits for the Wall though the room holds the cloth),
 * and once open. */
export const gate = defineSystem(
  'rail.gate',
  { reads: [Leg, Aperture], writes: [Route], phase: 'act', order: 62 },
  (w, { e }: Act) => {
    if (!railInt(e.id, RAIL_GATES.length - 1)) return 0;
    const r = routeRow(w),
      at = gateLeg(e.id);
    if (r.gates & bit(e.id) || !(r.grants & bit(RAIL_GATES[e.id]!.needs)) || !at || !legOpen(w, at.leg)) return 0;
    w.mut(Route, routeId(w))!.gates = r.gates | bit(e.id);
    return 1;
  },
);
/** The route's last leg (the causeway) and its destination halt on its line. */
const LAST = RAIL_LEGS.length - 1;
const LAST_HALT = RAIL_LINES[RAIL_LEGS[LAST]!.line]!.halts.findIndex(
  (h) => h.leg?.slot === LAST && h.leg.section === RAIL_LEGS[LAST]!.sections.length - 1 && !h.heads,
);
/** The meeting (`rail.arrive`, no fields): refused until the route's last leg is laid and a train of its line stands at
 * its destination halt; sets `arrived` once. */
export const arrive = defineSystem(
  'rail.arrive',
  { reads: [Leg, Train], writes: [Route], phase: 'act', order: 63 },
  (w, { tick }: Act) => {
    if (routeRow(w).arrived >= 0 || LAST_HALT < 0 || !legDone(w, LAST)) return 0;
    const line = RAIL_LEGS[LAST]!.line;
    const standing = RAIL_TRAINS.some((t, slot) => {
      if (t.line !== line) return false;
      const r = w.get(Train, w.lookup(Train, slot)!)!;
      return r.phase === TRAIN_PHASE.STAND && r.at === LAST_HALT;
    });
    if (!standing) return 0;
    w.mut(Route, routeId(w))!.arrived = tick;
    return 1;
  },
);

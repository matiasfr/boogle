// Ring Island's steel works (docs/plans/ring-island-build2.md, R1; design review ruling B: logs and rails, no footings):
// the kit taken where it lies in the island yard, the bill fed by hand, and the casts onto the works' rack, on the
// `Steel` row (./railway-components.ts). The kiln's model (./railway-sys-works.ts: kiln, worksTick). Server kind; pure
// integers and ticks. Each op is judged from the actor's own position by the server's reach check (R4); the rules here
// gate on state only. A train fills the yard and takes the rack's steel (R2, ./railway-sys-trains.ts).
//
//   steelTake   rail.steelTake { kind }   logs (0) or rails (1) off the yard onto your back, up to its room
//   steelFeed   rail.steel                logs and rails off your back into the bill; it lights the moment it is full
//   steelTick   the cast tick             once lit, one steel to the rack every castTicks while it has room
import { defineSystem } from '../ecs/index.ts';
import { STEEL } from './railway-ring-layout.ts';
import { railInt } from './railway.ts';
import { Account, Aperture, Beam, Boiler, Rail, Steel, SteelClock } from './railway-components.ts';
import { free, ringJoined, steelId } from './railway-queries.ts';
import type { Act, Tick } from './railway-sys-core.ts';

/** Take logs (kind 0) or rails (kind 1) off the island yard, up to your back's room, once the rivet is struck. */
export const steelTake = defineSystem(
  'rail.steelTake',
  { reads: [Aperture, Beam, Boiler, Rail], writes: [Steel, Account], phase: 'act', order: 54 },
  (w, { a: aid, e }: Act) => {
    if (!railInt(e.kind, 1) || !ringJoined(w)) return 0;
    const id = steelId(w),
      s = w.get(Steel, id)!;
    const n = Math.min(free(w, w.get(Account, aid)!), e.kind ? s.yardRails : s.yardLogs);
    if (n <= 0) return 0;
    const am = w.mut(Account, aid)!,
      sm = w.mut(Steel, id)!;
    if (e.kind) {
      sm.yardRails -= n;
      am.rails += n;
    } else {
      sm.yardLogs -= n;
      am.carry += n;
    }
    return n;
  },
);
/** Logs and rails off your back into the works' bill (the kiln's shape): whichever feed fills it lights it. Any logs and
 * rails count, not only the yard's. */
export const steelFeed = defineSystem(
  'rail.steel',
  { reads: [Aperture], writes: [Steel, SteelClock, Account], phase: 'act', order: 55 },
  (w, { a: aid, tick }: Act) => {
    const id = steelId(w),
      s = w.get(Steel, id)!;
    if (!ringJoined(w) || s.lit >= 0) return 0;
    const a = w.get(Account, aid)!;
    const logs = Math.min(a.carry, STEEL.logs - s.logs),
      rails = Math.min(a.rails, STEEL.rails - s.rails);
    if (logs + rails <= 0) return 0;
    const am = w.mut(Account, aid)!,
      sm = w.mut(Steel, id)!;
    am.carry -= logs;
    am.rails -= rails;
    sm.logs += logs;
    sm.rails += rails;
    if (sm.logs === STEEL.logs && sm.rails === STEEL.rails) sm.lit = w.mut(SteelClock, id)!.lastCast = tick;
    return logs + rails;
  },
);
/** The works' cast: once lit, one steel to the rack every castTicks while the rack has room, STEEL.total in all. A full
 * rack waits; the next cast comes as soon as there is room. */
export const steelTick = defineSystem(
  'rail.steelTick',
  { writes: [Steel, SteelClock], phase: 'tick', order: 5 },
  (w, { tick }: Tick) => {
    const id = steelId(w),
      s = w.get(Steel, id)!;
    if (
      s.lit < 0 ||
      s.poured >= STEEL.total ||
      s.rack >= STEEL.rackCap ||
      tick - w.get(SteelClock, id)!.lastCast < STEEL.castTicks
    )
      return;
    const sm = w.mut(Steel, id)!;
    sm.rack++;
    sm.poured++;
    w.mut(SteelClock, id)!.lastCast = tick;
  },
);

// Ring Island's steel works (docs/plans/ring-island-build2.md, R1; design review ruling B: logs and rails, no footings):
// the kit taken where it lies in the island yard, the bill fed by hand, and the casts onto the works' rack, on the
// `Steel` row (./railway-components.ts). The kiln's model (./railway-sys-works.ts: kiln, worksTick). Server kind; pure
// integers and ticks. Each op is judged from the actor's own position by the server's reach check (R4); the rules here
// gate on state only. Line 2's trains carry the kit out and steel home (R2): the trains' step calls the three
// functions below from ./railway-sys-trains.ts.
//
//   steelTake      rail.steelTake { kind }   logs (0) or rails (1) off the yard onto your back, up to its room
//   steelFeed      rail.steel                logs and rails off your back into the bill; it lights once it is full
//   steelTick      the cast tick             once lit, one steel to the rack every castTicks while it has room
//   steelLoads     standing at the Village   the kit's need onto the kit car
//   steelArrives   arriving                  the kit into the island yard and the rack's steel aboard; steel into the
//                                            Roundhouse bay at the Village
//   steelService   serviceOf                 the stops those errands ask for
import { defineSystem, type World } from '../ecs/index.ts';
import { STEEL } from './railway-ring-layout.ts';
import { LINE2_KIT } from './railway-line2-layout.ts';
import { railInt } from './railway.ts';
import { Account, Aperture, Beam, Boiler, Forge, Rail, Shed, Steel, SteelClock, Train } from './railway-components.ts';
import { forgeId, free, railId, ringJoined, shedId, steelId, steelNeed, type Row } from './railway-queries.ts';
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
// ---------------------------------------------------------------- the train's side (R2; ./railway-sys-trains.ts calls)
/** Line 2's Ring Island halt (its index in the line; open once the rivet is struck). */
export const RING_ISLAND = 5;
/** A line 2 train standing at the Village loads what the works' kit still needs (steelNeed, finding 2), up to the kit
 * car's LINE2_KIT: logs made there (`outLogs`, counted as produced), rails off the forge rack (`outRails`). After the
 * rivet no stretch is train-fed (Q7 is laid), so the kit car is the works'. */
export function steelLoads(w: World, id: number) {
  const need = steelNeed(w),
    r = w.get(Train, id)!;
  const logs = Math.min(LINE2_KIT.logs - r.logs, need.logs),
    rails = Math.min(LINE2_KIT.rails - r.rails, need.rails, w.get(Forge, forgeId(w))!.rack);
  if (logs <= 0 && rails <= 0) return;
  const sm = w.mut(Steel, steelId(w))!;
  sm.outLogs += logs;
  sm.outRails += rails;
  const m = w.mut(Train, id)!;
  m.logs += logs;
  m.rails += rails;
  if (rails) w.mut(Forge, forgeId(w))!.rack -= rails;
}
/** What the bill still lacks of each kind for a train's kit to fill (none once lit): the bill less fed and in the yard. */
function lacks(w: World) {
  const s = w.get(Steel, steelId(w))!;
  if (s.lit >= 0) return { logs: 0, rails: 0 };
  return {
    logs: Math.max(0, STEEL.logs - s.logs - s.yardLogs),
    rails: Math.max(0, STEEL.rails - s.rails - s.yardRails),
  };
}
/** A line 2 train arriving: at Ring Island its kit goes into the yard (up to what the bill still lacks; any more rides
 * on) and its kit car takes the rack's steel, up to STEEL.trip. At the Village its steel goes into the Roundhouse bay,
 * and kit the bill can no longer use (it was fed from backs while the kit rode, or the works is lit) goes home: logs
 * onto the depot, rails back onto the forge rack, where they were made (review of R1-R2, P2-1). */
export function steelArrives(w: World, r: Row<typeof Train>) {
  if (!ringJoined(w)) return;
  if (r.at === 0) {
    if (r.steel > 0) {
      w.mut(Shed, shedId(w))!.steel += r.steel;
      r.steel = 0;
    }
    const lack = lacks(w),
      logs = r.logs - Math.min(r.logs, lack.logs),
      rails = r.rails - Math.min(r.rails, lack.rails);
    if (logs > 0) {
      w.mut(Rail, railId(w))!.depot += logs;
      r.logs -= logs;
    }
    if (rails > 0) {
      w.mut(Forge, forgeId(w))!.rack += rails;
      r.rails -= rails;
    }
  } else if (r.at === RING_ISLAND) {
    const id = steelId(w),
      s = w.get(Steel, id)!,
      lack = lacks(w);
    const logs = Math.min(r.logs, lack.logs),
      rails = Math.min(r.rails, lack.rails),
      steel = Math.min(STEEL.trip - r.steel, s.rack);
    if (logs <= 0 && rails <= 0 && steel <= 0) return;
    const sm = w.mut(Steel, id)!;
    sm.yardLogs += logs;
    sm.yardRails += rails;
    r.logs -= logs;
    r.rails -= rails;
    sm.rack -= steel;
    r.steel += steel;
  }
}
/** The steel works' errands for a line 2 train (serviceOf): home to the Village while the kit is owed and none is
 * aboard, with steel aboard, or with kit the bill can no longer use; out to Ring Island with kit the bill lacks, or while
 * steel waits and the kit car has room. */
export function steelService(w: World, r: Readonly<Row<typeof Train>>, k: number, dir: number) {
  if (!ringJoined(w)) return false;
  const lack = lacks(w),
    usable = Math.min(r.logs, lack.logs) + Math.min(r.rails, lack.rails);
  if (k === 0 && dir < 0) {
    const need = steelNeed(w);
    return r.steel > 0 || usable < r.logs + r.rails || (r.logs + r.rails === 0 && need.logs + need.rails > 0);
  }
  if (k !== RING_ISLAND || dir < 0) return false;
  return usable > 0 || (w.get(Steel, steelId(w))!.rack > 0 && r.steel < STEEL.trip);
}
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

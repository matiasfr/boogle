// Ring Island's part of the load check (docs/plans/ring-island-build1.md, R3, v27): the Aperture row's bounds and
// order, on the rows and the world queries. Run by railwayCheck (./railway-check.ts). The ring's footings are in the
// Works' footing conservation (footingTotal, ./railway-check-works.ts); a train standing at the Railhead stands at its
// current head by the trains' check (its stop is the open stops').
//
//   checkRingStop(w, tick)  the trains' Railhead (`stop`, docs/plans/railhead-reroute.md), before the trains' check
//                  reads it through stopsOf: its bounds; never past the build head; at a known rule tick (the one the
//                  world stands at; RAILWAY_MAX_INT when unknown) never ahead of the deck, and at the head once the
//                  haul has settled
//   checkRing(w)   bounds; nothing before Q7 is laid; the counterweight and the brace only once the gap is footed;
//                  the leaf down only with the counterweight hung, and always down once a braced leaf has it; the
//                  rivet only with the leaf down
// Both throw on the first broken one.
import type { World } from '../ecs/index.ts';
import { RAILWAY_MAX_INT, railInt } from './railway.ts';
import { WORKS } from './railway-works-layout.ts';
import { aperture } from './railway-rows.ts';
import { q7Laid } from './railway-queries.ts';
import { RING_HEAD } from './railway-ring-layout.ts';
import { haulHead, haulSettled, haulTarget, haulU } from './railway-ring-haul.ts';

const bad = (what: string): never => {
  throw new Error(`railway: ${what}`);
};
/** The trains' Railhead at rule tick `tick`; throws on the first broken one. A haul row out of its own bounds is
 * left to checkRing (the footings' conservation sees set first), so only a sane haul is compared with the stop. */
export function checkRingStop(w: World, tick = RAILWAY_MAX_INT) {
  const a = aperture(w);
  if (!railInt(a.stop, RING_HEAD.length - 1)) bad('ring bounds');
  if (!railInt(a.set, WORKS.ring) || !railInt(a.moved, RAILWAY_MAX_INT, -1) || !railInt(a.from, RAILWAY_MAX_INT))
    return;
  if (a.stop > haulHead(a)) bad('ring stop past the head');
  // With no tick the deck's pose is unknown: only the bound above.
  if (tick >= RAILWAY_MAX_INT) return;
  if (RING_HEAD[a.stop]!.u > haulU(a, tick)) bad('ring stop ahead of the deck');
  if (haulSettled(a, tick) && a.stop !== haulHead(a)) bad('ring stop behind a settled haul');
}
/** The gap's whole-world invariants; throws on the first broken one. */
export function checkRing(w: World) {
  const a = aperture(w);
  if (
    !railInt(a.set, WORKS.ring) ||
    !railInt(a.rack, WORKS.wagonCap) ||
    !railInt(a.cw, WORKS.counterweight) ||
    !railInt(a.brace, 2) ||
    !railInt(a.joined, RAILWAY_MAX_INT, -1) ||
    !railInt(a.moved, RAILWAY_MAX_INT, -1) ||
    !railInt(a.from, RAILWAY_MAX_INT)
  )
    bad('ring bounds');
  if (a.moved >= 0 !== a.set >= 2) bad('ring haul stamp');
  if (a.moved < 0 ? a.from !== 0 : a.from < RING_HEAD[0]!.u || a.from > haulTarget(a)) bad('ring haul origin');
  if ((a.set || a.rack || a.cw) && !q7Laid(w)) bad('ring before Q7');
  // No counterweight and no brace before the gap is footed.
  if ((a.cw > 0 || a.brace !== 1) && a.set !== WORKS.ring) bad('counterweight before the gap');
  // Down only with all four hung; all four hung on a driven brace is always down.
  if ((a.brace === 0) !== (a.cw === WORKS.counterweight && a.brace !== 1)) bad('leaf');
  if (a.joined >= 0 && a.brace !== 0) bad('rivet before the leaf');
}

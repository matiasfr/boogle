// Ring Island's part of the load check (docs/plans/ring-island-build1.md, R3, v27): the Aperture row's bounds and
// order, on the rows and the world queries. Run by railwayCheck (./railway-check.ts). The ring's footings are in the
// Works' footing conservation (footingTotal, ./railway-check-works.ts); a train standing at the Railhead stands at its
// current head by the trains' check (its stop is the open stops').
//
//   checkRing(w)   bounds; nothing before Q7 is laid; the counterweight and the brace only once the gap is footed;
//                  the leaf down only with the counterweight hung, and always down once a braced leaf has it; the
//                  rivet only with the leaf down (throws on the first broken one)
import type { World } from '../ecs/index.ts';
import { RAILWAY_MAX_INT, railInt } from './railway.ts';
import { WORKS } from './railway-works-layout.ts';
import { aperture } from './railway-rows.ts';
import { q7Laid } from './railway-queries.ts';

const bad = (what: string): never => {
  throw new Error(`railway: ${what}`);
};
/** The gap's whole-world invariants; throws on the first broken one. */
export function checkRing(w: World) {
  const a = aperture(w);
  if (
    !railInt(a.set, WORKS.ring) ||
    !railInt(a.rack, WORKS.wagonCap) ||
    !railInt(a.cw, WORKS.counterweight) ||
    !railInt(a.brace, 2) ||
    !railInt(a.joined, RAILWAY_MAX_INT, -1)
  )
    bad('ring bounds');
  if ((a.set || a.rack || a.cw) && !q7Laid(w)) bad('ring before Q7');
  // No counterweight and no brace before the gap is footed.
  if ((a.cw > 0 || a.brace !== 1) && a.set !== WORKS.ring) bad('counterweight before the gap');
  // Down only with all four hung; all four hung on a driven brace is always down.
  if ((a.brace === 0) !== (a.cw === WORKS.counterweight && a.brace !== 1)) bad('leaf');
  if (a.joined >= 0 && a.brace !== 0) bad('rivet before the leaf');
}

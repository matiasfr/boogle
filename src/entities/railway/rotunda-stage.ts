// Which stage of the rotunda a room has earned (docs/plans/roundhouse-rotunda.md, section c), derived from the shed's
// accepted row: no new shared state. 0 at arrival (the ruin arc), 1 once the stall's footings are set (three bays),
// 2 once the first steel has landed at Home (five). Stage 3 is held: it needs its own brief.
import { WORKS } from '../../sim/railway-works-layout.ts';
import { shed, type ReadWorld } from '../../sim/railway-rows.ts';

export function rotundaStage(w: ReadWorld): 0 | 1 | 2 {
  const sh = shed(w);
  if (sh.stall < WORKS.stall) return 0;
  return sh.steel >= 1 ? 2 : 1;
}

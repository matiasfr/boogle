// Railway saves along the stack line, for looks (docs/plans/greybox-route.md, leg 1 step 4): `--rail-seed stack-laid-<n>`
// is `ring-joined` with n of the leg's four sections laid (4: High Gorge open, the pick not taken), and
// `stack-pick` is that with the pickup taken; `stack-fresh-<n>` is `stack-laid-<n>` on the tick its last section was
// laid, with no running time after (step 4b's looks: the shed trains have still to join, the new rack is empty). Accepted ops only, as test/railway-route-rules.test.ts feeds the leg:
// every tick players `a` and `b` take what the leg's rack holds and feed the frame, each section lays over its lay
// clock, and the trains bring the kit meanwhile. Looks only (one to three laid, the pick taken): the catalog's stages
// `gorge-open`, `gorge-mid` and `gorge-reached` are src/sim/railway-seed-legs.ts, which owns the feeding.
import { railwayAtRing } from '../../src/sim/railway-seed-ring.ts';
import { act, advance } from '../../src/sim/railway-seed-route.ts';
import { laySection } from '../../src/sim/railway-seed-legs.ts';
import { need } from '../../src/sim/railway-drive.ts';
import { RAIL_LEGS } from '../../src/sim/railway-route.ts';
import { legRow } from '../../src/sim/railway-queries-route.ts';
import { seedDoc } from './ring-mid-seed.ts';

const LEG = 0;
export function stackStage(stage: string): { laid: number; pick: boolean; fresh?: boolean } | null {
  if (stage === 'stack-pick') return { laid: RAIL_LEGS[LEG]!.sections.length, pick: true };
  const m = /^stack-(laid|fresh)-([0-4])$/.exec(stage);
  return m ? { laid: Number(m[2]), pick: false, fresh: m[1] === 'fresh' } : null;
}
export function buildStackDoc({ laid, pick, fresh }: { laid: number; pick: boolean; fresh?: boolean }) {
  const seed = railwayAtRing('ring-joined');
  while (legRow(seed.w, LEG).laid < laid) laySection(seed);
  // A little running time, so trains stand along the line and kit lies on the rack as they would.
  if (!fresh) advance(seed, 900);
  if (pick) need(act(seed, 'a', 'rail.grant', { id: 0 }) === 1, 'the pick taken');
  return seedDoc(seed);
}

// Railway saves along the stack line, for looks (docs/plans/greybox-route.md, leg 1 step 4): `--rail-seed stack-laid-<n>`
// is `ring-joined` with n of the leg's four sections laid (4: High Gorge open, the pick not taken), and
// `stack-pick` is that with the pickup taken. Accepted ops only, as test/railway-route-rules.test.ts feeds the leg:
// every tick players `a` and `b` take what the leg's rack holds and feed the frame, each section lays over its lay
// clock, and the trains bring the kit meanwhile. Looks only: step 5's `gorge-open`, `gorge-mid` and `gorge-reached`
// are the catalog's stages (src/sim/railway-seed-legs.ts) and replace this.
import { railwayAtRing } from '../../src/sim/railway-seed-ring.ts';
import { advance, type Seed } from '../../src/sim/railway-seed-route.ts';
import { account } from '../../src/sim/railway-rows.ts';
import { apply, invariant, need } from '../../src/sim/railway-drive.ts';
import { RAIL_LEGS } from '../../src/sim/railway-route.ts';
import { legRow } from '../../src/sim/railway-queries-route.ts';
import { seedDoc } from './ring-mid-seed.ts';

const LEG = 0;
export function stackStage(stage: string): { laid: number; pick: boolean } | null {
  if (stage === 'stack-pick') return { laid: RAIL_LEGS[LEG]!.sections.length, pick: true };
  const n = /^stack-laid-([0-4])$/.exec(stage)?.[1];
  return n === undefined ? null : { laid: Number(n), pick: false };
}
function act(s: Seed, pid: string, op: string, fields: Record<string, unknown> = {}) {
  const a = account(s.w, pid)!;
  return apply(s.w, pid, { op, epoch: a.epoch, request: a.request + 1, ...fields } as never, s.t).accepted;
}
/** Feeds the open section's frame off its rack until it starts to lay, then runs its lay clock out. */
function laySection(s: Seed) {
  const k = legRow(s.w, LEG).laid;
  for (let guard = 0; legRow(s.w, LEG).start < 0; guard++) {
    need(guard < 8000, `section ${k + 1} fed`);
    for (const pid of ['a', 'b'])
      for (const op of ['rail.depotTake', 'rail.depotRailTake', 'rail.legStock'])
        act(s, pid, op, op === 'rail.legStock' ? { leg: LEG } : {});
    if (legRow(s.w, LEG).start < 0) advance(s, 1);
  }
  for (let guard = 0; legRow(s.w, LEG).laid === k; guard++) {
    need(guard < 1000, `section ${k + 1} laid`);
    advance(s, 1);
  }
  need(invariant(s.w) === null, `section ${k + 1}: invariant`);
}

export function buildStackDoc({ laid, pick }: { laid: number; pick: boolean }) {
  const seed = railwayAtRing('ring-joined');
  while (legRow(seed.w, LEG).laid < laid) laySection(seed);
  // A little running time, so trains stand along the line and kit lies on the rack as they would.
  advance(seed, 900);
  if (pick) need(act(seed, 'a', 'rail.grant', { id: 0 }) === 1, 'the pick taken');
  return seedDoc(seed);
}

// Seeds for the greybox route's leg 1, the stack line to High Gorge (docs/plans/greybox-route.md, step 5), on
// ./railway-seed-ring.ts's `ring-joined` (./railway-seeds.ts is the catalog and how to add a stage). Accepted sim ops
// and ticks only, no direct state writes: players `a` and `b` take what the leg's rack holds and feed the frame, as
// test/railway-route-rules.test.ts feeds the leg, and each section lays over its lay clock while the trains bring the
// kit. Dev data: a stage changes no rule and needs no WORLD_NS bump.
//
//   gorge-open      the leg open, nothing fed: the first section's kit on Ring Island's rack
//   gorge-mid       two sections laid, the next kit aboard a train
//   gorge-reached   four sections laid: High Gorge open, the powered pick not taken
import { act, advance, type Seed } from './railway-seed-route.ts';
import { invariant, need, restore } from './railway-drive.ts';
import { railwayAtRing } from './railway-seed-ring.ts';
import { rail, trains } from './railway-rows.ts';
import { legRow } from './railway-queries-route.ts';
import { RAIL_LEGS } from './railway-route.ts';

export type LegStage = 'gorge-open' | 'gorge-mid' | 'gorge-reached';
export const LEG_STAGES: readonly LegStage[] = ['gorge-open', 'gorge-mid', 'gorge-reached'];

/** The stack leg's slot in RAIL_LEGS. */
const LEG = 0;

// Share only a serialized source fixture through restore, never a mutable world between callers.
const cache = new Map<LegStage, Seed>();
/** The railway at a leg 1 stage (`ring-joined` first). */
export function railwayAtLegs(stage: LegStage): Seed {
  let base = cache.get(stage);
  if (!base) {
    base = build(railwayAtRing('ring-joined'), stage);
    need(invariant(base.w) === null, stage);
    cache.set(stage, base);
  }
  return { w: restore(base.w), t: base.t };
}

/** Feeds the open section's frame off its rack until it starts to lay, then runs its lay clock out. */
export function laySection(s: Seed) {
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
}

/** Advances until `ok`, at most `max` ticks. */
function until(s: Seed, ok: () => boolean, max: number, what: string) {
  for (let guard = 0; !ok(); guard++) {
    need(guard < max, what);
    advance(s, 1);
  }
}

function build(s: Seed, stage: LegStage): Seed {
  const w = s.w,
    sections = RAIL_LEGS[LEG]!.sections;
  switch (stage) {
    case 'gorge-open':
      until(
        s,
        () => rail(w).depot >= sections[0]!.logs && rail(w).depotRails >= sections[0]!.rails,
        6000,
        'the first kit on the rack',
      );
      need(legRow(w, LEG).laid === 0 && legRow(w, LEG).logs + legRow(w, LEG).rails === 0, 'nothing fed');
      break;
    case 'gorge-mid':
      while (legRow(w, LEG).laid < 2) laySection(s);
      until(s, () => trains(w).some((t) => t.legKit && t.logs + t.rails > 0), 3000, 'a kit aboard a train');
      break;
    case 'gorge-reached':
      while (legRow(w, LEG).laid < sections.length) laySection(s);
      // A little running time, so trains stand along the line and the Gorge halt is served.
      advance(s, 900);
      break;
  }
  return s;
}

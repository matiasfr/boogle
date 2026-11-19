// Seeds for the greybox route's legs 1 and 2 (docs/plans/greybox-route.md, step 5; docs/plans/greybox-leg2.md, step 3):
// the stack line to High Gorge on ./railway-seed-ring.ts's `ring-joined`, then the incline to Bell Rock and the bay cut
// back to Home on `gorge-reached` (./railway-seeds.ts is the catalog and how to add a stage). Accepted sim ops and ticks
// only, no direct state writes: players `a` and `b` take what the open leg's rack holds and feed its frame, as
// test/railway-route-rules.test.ts feeds the leg, and each section lays over its lay clock while the trains bring the
// kit. Dev data: a stage changes no rule and needs no WORLD_NS bump.
//
//   gorge-open      the leg open, nothing fed: the first section's kit on Ring Island's rack
//   gorge-mid       two sections laid, the next kit aboard a train
//   gorge-reached   four sections laid: High Gorge open, the powered pick not taken
//   incline-open    the pick taken, the incline's barrier open, its first section's kit on the Gorge rack
//   incline-mid     the incline's first section laid, the next kit aboard an `ns` train
//   bell-reached    the incline laid to Bell Rock, the crystal seeds not taken
//   bay-open        the seeds taken, the West landing's rack stocked (the stand-in)
//   bay-mid         the bay cut's first section laid, the next kit aboard a `bay` train
//   bay-reached     the bay cut laid: both stage 4 lines run trains
import { act, advance, type Seed } from './railway-seed-route.ts';
import { invariant, need, restore } from './railway-drive.ts';
import { railwayAtRing } from './railway-seed-ring.ts';
import { account, rail } from './railway-rows.ts';
import { LOGS, roomOf } from './railway-queries.ts';
import { RAILS } from './railway-line2-layout.ts';
import { legKitCarriers, legRow } from './railway-queries-route.ts';
import { RAIL_GATES, RAIL_GRANTS, RAIL_LEGS } from './railway-route.ts';

export const LEG_STAGES = [
  'gorge-open',
  'gorge-mid',
  'gorge-reached',
  'incline-open',
  'incline-mid',
  'bell-reached',
  'bay-open',
  'bay-mid',
  'bay-reached',
] as const;
export type LegStage = (typeof LEG_STAGES)[number];

/** The legs' slots in RAIL_LEGS. */
const STACK = RAIL_LEGS.findIndex((l) => l.id === 'stack'),
  INCLINE = RAIL_LEGS.findIndex((l) => l.id === 'incline'),
  BAY = RAIL_LEGS.findIndex((l) => l.id === 'bay-cut');

// Share only a serialized source fixture through restore, never a mutable world between callers.
const cache = new Map<LegStage, Seed>();
/** The railway at a leg stage, built on the stage before it in LEG_STAGES (`ring-joined` for the first). */
export function railwayAtLegs(stage: LegStage): Seed {
  let base = cache.get(stage);
  if (!base) {
    const before = LEG_STAGES[LEG_STAGES.indexOf(stage) - 1];
    base = build(before ? railwayAtLegs(before) : railwayAtRing('ring-joined'), stage);
    const broken = invariant(base.w);
    need(broken === null, `${stage}: ${broken}`);
    cache.set(stage, base);
  }
  return { w: restore(base.w), t: base.t };
}

/** Feeds leg `k`'s open section's frame off its rack until it starts to lay, then runs its lay clock out. */
export function laySection(s: Seed, k = STACK) {
  const at = legRow(s.w, k).laid;
  for (let guard = 0; legRow(s.w, k).start < 0; guard++) {
    need(guard < 8000, `${RAIL_LEGS[k]!.id} section ${at + 1} fed`);
    for (const pid of ['a', 'b']) {
      // Travel loads stay comfortable; mixed overfill has its own deliberate regression workload.
      for (const [op, kind] of [
        ['rail.depotTake', LOGS],
        ['rail.depotRailTake', RAILS],
      ] as const)
        if (roomOf(s.w, account(s.w, pid)!, kind) > 0) act(s, pid, op);
      act(s, pid, 'rail.legStock', { leg: k });
    }
    if (legRow(s.w, k).start < 0) advance(s, 1);
  }
  for (let guard = 0; legRow(s.w, k).laid === at; guard++) {
    need(guard < 1000, `${RAIL_LEGS[k]!.id} section ${at + 1} laid`);
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
/** The first kit of leg `k`'s current section is on its rack. */
const racked = (s: Seed, k: number) => {
  const sec = RAIL_LEGS[k]!.sections[legRow(s.w, k).laid]!;
  return rail(s.w).depot >= sec.logs && rail(s.w).depotRails >= sec.rails;
};
/** A train of leg `k`'s line carries its kit. */
const aboard = (s: Seed, k: number) => legKitCarriers(s.w, RAIL_LEGS[k]!.line) > 0;

function build(s: Seed, stage: LegStage): Seed {
  const w = s.w;
  switch (stage) {
    case 'gorge-open':
      until(s, () => racked(s, STACK), 6000, 'the first kit on the rack');
      need(legRow(w, STACK).laid === 0 && legRow(w, STACK).logs + legRow(w, STACK).rails === 0, 'nothing fed');
      break;
    case 'gorge-mid':
      while (legRow(w, STACK).laid < 2) laySection(s);
      until(s, () => aboard(s, STACK), 3000, 'a kit aboard a train');
      break;
    case 'gorge-reached':
      while (legRow(w, STACK).laid < RAIL_LEGS[STACK]!.sections.length) laySection(s);
      // A little running time, so trains stand along the line and the Gorge halt is served.
      advance(s, 900);
      break;
    case 'incline-open':
      need(act(s, 'a', 'rail.grant', { id: RAIL_GRANTS.findIndex((g) => g.id === 'pick') }), 'the pick taken');
      need(act(s, 'a', 'rail.gate', { id: RAIL_GATES.findIndex((g) => g.id === 'incline') }), 'the barrier open');
      until(s, () => racked(s, INCLINE), 6000, "the incline's first kit on the Gorge rack");
      need(legRow(w, INCLINE).laid === 0 && legRow(w, INCLINE).logs + legRow(w, INCLINE).rails === 0, 'nothing fed');
      break;
    case 'incline-mid':
      laySection(s, INCLINE);
      until(s, () => aboard(s, INCLINE), 3000, 'the next kit aboard an ns train');
      break;
    case 'bell-reached':
      while (legRow(w, INCLINE).laid < RAIL_LEGS[INCLINE]!.sections.length) laySection(s, INCLINE);
      advance(s, 900);
      break;
    case 'bay-open':
      need(act(s, 'a', 'rail.grant', { id: RAIL_GRANTS.findIndex((g) => g.id === 'seeds') }), 'the seeds taken');
      until(s, () => racked(s, BAY), 6000, "the West landing's rack stocked");
      break;
    case 'bay-mid':
      laySection(s, BAY);
      until(s, () => aboard(s, BAY), 3000, 'the next kit aboard a bay train');
      break;
    case 'bay-reached':
      while (legRow(w, BAY).laid < RAIL_LEGS[BAY]!.sections.length) laySection(s, BAY);
      advance(s, 900);
      break;
  }
  return s;
}

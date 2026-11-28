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
import { account } from './railway-rows.ts';
import { LOGS, roomOf } from './railway-queries.ts';
import { RAILS } from './railway-line2-layout.ts';
import { LINE2, RAIL_HALTS, RAIL_LINES } from './railway-lines.ts';
import { gorgeStop } from './railway-lap.ts';
import { railTrainsOf } from './railway-queries-trains.ts';
import { trainAlong } from './railway-train.ts';
import { legKitCarriers, legRow, routeRow } from './railway-queries-route.ts';
import { RAIL_GATES, RAIL_GRANTS, RAIL_LEGS } from './railway-route.ts';

export const LEG_STAGES = [
  'gorge-open',
  'stack-rails',
  'gorge-mid',
  'gorge-reached',
  'incline-open',
  'incline-mid',
  'bell-reached',
  'bay-open',
  'bay-mid',
  'bay-reached',
  'canopy-open',
  'canopy-mid',
  'canopy-reached',
  'cave-open',
  'cave-mid',
  'port-reached',
  'wall-mid',
  'wall-deep',
  'wall-closed',
  'lap-ride',
  'notch-open',
  'notch-reached',
  'causeway-open',
  'island-reached',
  'arrived',
  'cave-first-open',
  'cave-first-reached',
] as const;
export type LegStage = (typeof LEG_STAGES)[number];

/** The legs' slots in RAIL_LEGS. */
const STACK = RAIL_LEGS.findIndex((l) => l.id === 'stack'),
  INCLINE = RAIL_LEGS.findIndex((l) => l.id === 'incline'),
  BAY = RAIL_LEGS.findIndex((l) => l.id === 'bay-cut'),
  CANOPY = RAIL_LEGS.findIndex((l) => l.id === 'bell-canopy'),
  CAVE = RAIL_LEGS.findIndex((l) => l.id === 'cave'),
  WALL = RAIL_LEGS.findIndex((l) => l.id === 'wall');

// Share only a serialized source fixture through restore, never a mutable world between callers.
const cache = new Map<LegStage, Seed>();
function previousStage(stage: LegStage) {
  if (stage === 'cave-first-open') return 'bay-reached';
  if (stage === 'gorge-mid') return 'gorge-open';
  if (stage === 'notch-open') return 'wall-closed'; // The through ride is a side trip.
  return LEG_STAGES[LEG_STAGES.indexOf(stage) - 1];
}
/** The railway at a leg stage, built on its predecessor (`ring-joined` for the first). */
export function railwayAtLegs(stage: LegStage): Seed {
  let base = cache.get(stage);
  if (!base) {
    const before = previousStage(stage);
    base = build(before ? railwayAtLegs(before) : railwayAtRing('ring-joined'), stage);
    const broken = invariant(base.w);
    need(broken === null, `${stage}: ${broken}`);
    cache.set(stage, base);
  }
  return { w: restore(base.w), t: base.t };
}

/** Feeds leg `k`'s open section's frame off its rack until it starts to lay, then runs its lay clock out. */
export function laySection(s: Seed, k = STACK, step = advance) {
  const at = legRow(s.w, k).laid;
  for (let guard = 0; legRow(s.w, k).start < 0; guard++) {
    need(guard < 8000, `${RAIL_LEGS[k]!.id} section ${at + 1} fed`);
    for (const pid of ['a', 'b']) {
      // Travel loads stay comfortable; mixed overfill has its own deliberate regression workload.
      for (const [op, kind, stock] of [
        ['rail.depotTake', LOGS, 'rackLogs'],
        ['rail.depotRailTake', RAILS, 'rackRails'],
      ] as const)
        if (legRow(s.w, k)[stock] && roomOf(s.w, account(s.w, pid)!, kind) > 0)
          need(act(s, pid, op, { leg: k }) > 0, op);
      const a = account(s.w, pid)!,
        row = legRow(s.w, k),
        bill = RAIL_LEGS[k]!.sections[at]!;
      if ((a.carry && row.logs < bill.logs) || (a.rails && row.rails < bill.rails))
        need(act(s, pid, 'rail.legStock', { leg: k }) > 0, 'kit fed');
    }
    if (legRow(s.w, k).start < 0) step(s, 1);
  }
  for (let guard = 0; legRow(s.w, k).laid === at; guard++) {
    need(guard < 1000, `${RAIL_LEGS[k]!.id} section ${at + 1} laid`);
    step(s, 1);
  }
}
/** The leg stages after `from` up to `to` run on `s`, any seed in `from`'s state (garage step 4's tests start them
 * from worlds they already hold, such as High Gorge reached with steel home). Changes `s` in place and returns it. */
export function legStagesOn(s: Seed, from: LegStage, to: LegStage): Seed {
  const stages: LegStage[] = [];
  let at: LegStage | undefined = to;
  while (at !== undefined && at !== from) {
    stages.push(at);
    at = previousStage(at);
  }
  need(at === from && stages.length > 0, `${from} to ${to}`);
  for (const stage of stages.reverse()) build(s, stage);
  const broken = invariant(s.w);
  need(broken === null, `${to}: ${broken}`);
  return s;
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
  const row = legRow(s.w, k);
  return row.rackLogs >= sec.logs && row.rackRails >= sec.rails;
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
    case 'stack-rails':
      // Only the Stack rail bill should call for Village timber in this jump-in.
      need(act(s, 'b', 'rail.steelTake', { kind: 0 }) > 0, 'lift the steel timber');
      need(act(s, 'b', 'rail.steel') > 0, 'feed the steel timber');
      while (legRow(w, STACK).logs < RAIL_LEGS[STACK]!.sections[0]!.logs) {
        need(act(s, 'b', 'rail.depotTake', { leg: STACK }) > 0, 'lift Stack timber');
        need(act(s, 'b', 'rail.legStock', { leg: STACK }) > 0, 'feed Stack timber');
      }
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
    case 'canopy-open':
      need(act(s, 'a', 'rail.gate', { id: RAIL_GATES.findIndex((g) => g.id === 'canopy') }), 'Canopy barrier open');
      until(s, () => racked(s, CANOPY), 6000, 'first Canopy kit on Bell Rock rack');
      break;
    case 'canopy-mid':
      laySection(s, CANOPY);
      until(s, () => aboard(s, CANOPY), 6000, 'second Canopy kit aboard');
      break;
    case 'canopy-reached':
      while (legRow(w, CANOPY).laid < RAIL_LEGS[CANOPY]!.sections.length) laySection(s, CANOPY);
      break;
    case 'cave-first-open':
      need(act(s, 'a', 'rail.gate', { id: RAIL_GATES.findIndex((g) => g.id === 'plug') }) === 1, 'plug opened first');
      until(s, () => racked(s, CANOPY) && racked(s, CAVE), 6000, 'both first racks stocked');
      break;
    case 'cave-first-reached':
      while (legRow(w, CAVE).laid < RAIL_LEGS[CAVE]!.sections.length) laySection(s, CAVE);
      advance(s, 900);
      break;
    case 'cave-open':
      need(act(s, 'a', 'rail.grant', { id: RAIL_GRANTS.findIndex((g) => g.id === 'cloth') }) === 1, 'cloth taken');
      need(act(s, 'a', 'rail.gate', { id: RAIL_GATES.findIndex((g) => g.id === 'plug') }) === 1, 'plug open');
      until(s, () => racked(s, CAVE), 6000, 'first cave kit on the West landing rack');
      break;
    case 'cave-mid':
      laySection(s, CAVE);
      until(s, () => aboard(s, CAVE), 3000, 'second cave kit aboard');
      break;
    case 'port-reached':
      while (legRow(w, CAVE).laid < RAIL_LEGS[CAVE]!.sections.length) laySection(s, CAVE);
      advance(s, 900);
      break;
    case 'wall-mid':
      while (legRow(w, WALL).laid < 2) laySection(s, WALL);
      until(s, () => aboard(s, WALL), 8000, 'third Wall kit aboard');
      break;
    case 'wall-deep':
      while (legRow(w, WALL).laid < 5) laySection(s, WALL);
      break;
    case 'wall-closed':
      need(act(s, 'a', 'rail.gate', { id: RAIL_GATES.findIndex((g) => g.id === 'deep-span') }) === 1, 'deep span open');
      laySection(s, WALL);
      break;
    case 'lap-ride': {
      const gorge = RAIL_LINES[LINE2]!.halts[gorgeStop]!.s;
      until(
        s,
        () =>
          railTrainsOf(w, LINE2).some(
            (r) => r.from > gorge && r.dest < gorge && trainAlong(r, LINE2, s.t) <= gorge + 9500,
          ),
        8000,
        'a through train from the Wall is within 95 m of High Gorge',
      );
      // Call the train while it can brake so the arriving player has its ordinary boarding stop.
      const id = RAIL_HALTS.findIndex((h) => h.line === LINE2 && h.stop === gorgeStop);
      need(act(s, 'a', 'rail.call', { id, dir: -1 }) === 1, 'the Gorge calls the incoming Wall train');
      break;
    }
    case 'notch-open':
      until(s, () => racked(s, 6), 8000, 'Notch kit delivered at Canopy');
      break;
    case 'notch-reached':
      need(act(s, 'a', 'rail.gate', { id: 4 }) === 1, 'cloth opens the Notch frame');
      laySection(s, 6);
      break;
    case 'causeway-open':
      need(act(s, 'a', 'rail.grant', { id: 3 }) === 1, 'lantern taken');
      need(act(s, 'a', 'rail.gate', { id: 5 }) === 1, 'lantern opens the causeway');
      until(s, () => racked(s, 7), 8000, 'causeway kit delivered at Bell Rock');
      break;
    case 'island-reached':
      laySection(s, 7);
      until(s, () => routeRow(w).reached >= 0, 8000, 'first train stood at the island');
      break;
    case 'arrived':
      need(act(s, 'a', 'rail.arrive', {}) === 1, 'meeting accepted');
      break;
  }
  return s;
}

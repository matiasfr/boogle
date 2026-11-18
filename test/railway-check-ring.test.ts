// The load check's ring part (src/sim/railway-check-ring.ts, checkRing and checkRingStop): the Aperture row's bounds
// and order are refused, each with its message, and the trains' Railhead stop's three invariants. Ported from the
// review of M8b (archive/review/m8b), whose fuzz found these refusals only in the world check; no other test breaks the
// Aperture row and asks for a refusal (test/fixtures/railway-bad-worlds.ts lists the old validators' sites, which
// predate it). A corrupt or hostile save must not load with a leaf down without its weights, or a rivet before the
// leaf. The set, rack and cw bounds are caught first by footing conservation (those fields are footings), so only
// brace, joined and stop reach 'ring bounds' here.
import test from 'node:test';
import assert from 'node:assert/strict';
import type { World } from '../src/ecs/index.ts';
import { Aperture } from '../src/sim/railway-components.ts';
import { stageWorld, worldVerdict } from './helpers/railway-check.ts';
import type { SeedStage } from '../src/sim/railway-seeds.ts';
import { RAILWAY_MAX_INT } from '../src/sim/railway.ts';
import { RING_HEAD } from '../src/sim/railway-ring-layout.ts';
import { haulEnd } from '../src/sim/railway-ring-haul.ts';
import { checkRingStop } from '../src/sim/railway-check-ring.ts';

const STAGES = ['deck-laid', 'gap-footed', 'ring-joined'] as const;
type Fields = Partial<Record<'set' | 'rack' | 'cw' | 'brace' | 'joined' | 'moved' | 'from' | 'stop', number>>;
// Built at module scope, outside the 5 s test timeout (as the golden shards do).
const bases = new Map<SeedStage, World>(STAGES.map((s) => [s, stageWorld(s)]));
const verdict = (stage: SeedStage, fields: Fields, tick?: number) => {
  const w = bases.get(stage)!.clone();
  Object.assign(w.mut(Aperture, w.ids(Aperture)[0]!)!, fields);
  return worldVerdict(w, tick);
};

// The ring stages' own acceptance is the golden shards' ("seed stage X: the world check accepts it").
test('a driven brace before the weights is legal (either order)', () => {
  assert.equal(verdict('gap-footed', { brace: 2 }), null);
});

test('a brace or rivet out of its bounds is refused', () => {
  assert.equal(verdict('gap-footed', { brace: 3 }), 'railway: ring bounds');
  assert.equal(verdict('gap-footed', { joined: -2 }), 'railway: ring bounds');
});

test('no counterweight and no brace before the gap is footed', () => {
  assert.equal(verdict('deck-laid', { brace: 2 }), 'railway: counterweight before the gap');
});

test('the leaf is down only with all four weights hung, and a braced leaf with them is always down', () => {
  assert.equal(verdict('gap-footed', { brace: 0 }), 'railway: leaf', 'down without the weights');
  assert.equal(verdict('ring-joined', { brace: 2 }), 'railway: leaf', 'weights hung, brace driven, not down');
});

test('the rivet comes only with the leaf down', () => {
  assert.equal(verdict('gap-footed', { joined: 3 }), 'railway: rivet before the leaf');
});

test('haul ticks and origins outside integer bounds are refused', () => {
  for (const moved of [-2, RAILWAY_MAX_INT + 1, 1.5, NaN, Infinity])
    assert.equal(verdict('gap-footed', { moved }), 'railway: ring bounds', `moved ${moved}`);
  for (const from of [-1, RAILWAY_MAX_INT + 1, 1.5, NaN, Infinity])
    assert.equal(verdict('gap-footed', { from }), 'railway: ring bounds', `from ${from}`);
});

test('a haul is stamped if and only if a pair is set', () => {
  assert.equal(verdict('gap-footed', { moved: -1 }), 'railway: ring haul stamp');
  assert.equal(verdict('deck-laid', { moved: 0 }), 'railway: ring haul stamp');
  assert.equal(verdict('gap-footed', { moved: 0 }), null, 'tick zero is valid');
  assert.equal(verdict('gap-footed', { moved: RAILWAY_MAX_INT }), null, 'maximum tick is valid');
});

test('haul origin is zero before any pair, otherwise between the first head and the target', () => {
  assert.equal(verdict('deck-laid', { from: 1 }), 'railway: ring haul origin');
  assert.equal(verdict('gap-footed', { from: RING_HEAD[0]!.u - 1 }), 'railway: ring haul origin');
  assert.equal(verdict('gap-footed', { from: RING_HEAD[7]!.u + 1 }), 'railway: ring haul origin');
  for (const from of [RING_HEAD[0]!.u, RING_HEAD[7]!.u]) assert.equal(verdict('gap-footed', { from }), null);
});

// The trains' Railhead (docs/plans/railhead-reroute.md): `stop` follows the build head once the haul has settled.
// Refusals go through the whole check (the stop's comes before the trains', which read it); an accepted stop that
// moves a standing train's stop by hand would then fail the trains' check, so acceptance asks checkRingStop alone.
const stopVerdict = (stage: SeedStage, fields: Fields, tick?: number) => {
  const w = bases.get(stage)!.clone();
  Object.assign(w.mut(Aperture, w.ids(Aperture)[0]!)!, fields);
  try {
    checkRingStop(w, tick);
    return null;
  } catch (e) {
    return (e as Error).message;
  }
};

test("the trains' stop past the build head, or out of its bents, is refused", () => {
  assert.equal(verdict('deck-laid', { stop: 1 }), 'railway: ring stop past the head');
  assert.equal(verdict('gap-footed', { stop: 8 }), 'railway: ring bounds');
  assert.equal(verdict('gap-footed', { stop: -1 }), 'railway: ring bounds');
  assert.equal(verdict('gap-footed', { stop: 1.5 }), 'railway: ring bounds');
  assert.equal(verdict('gap-footed', { stop: 7 }), null, 'at the head (the seed as built)');
});

test("the trains' stop ahead of the deck is refused at the world's tick", () => {
  // A haul from head 5 told at tick 1000 (set 14, target head 7): until the deck moves it stands at head 5.
  const haul = { moved: 1000, from: RING_HEAD[5]!.u };
  assert.equal(verdict('gap-footed', { ...haul, stop: 6 }, 1000), 'railway: ring stop ahead of the deck');
  assert.equal(stopVerdict('gap-footed', { ...haul, stop: 5 }, 1000), null, 'the stop with the deck');
  assert.equal(stopVerdict('gap-footed', { ...haul, stop: 6 }), null, 'no tick: the pose is unknown, not refused');
});

test("the trains' stop behind a settled haul is refused at the world's tick", () => {
  const haul = { moved: 1000, from: RING_HEAD[6]!.u },
    end = haulEnd({ set: 14, ...haul });
  assert.equal(stopVerdict('gap-footed', { ...haul, stop: 6 }, end - 1), null, 'chocking: the stop still behind');
  assert.equal(verdict('gap-footed', { ...haul, stop: 6 }, end), 'railway: ring stop behind a settled haul');
  assert.equal(stopVerdict('gap-footed', { ...haul, stop: 7 }, end), null);
});

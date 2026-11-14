// The load check's ring part (src/sim/railway-check-ring.ts, checkRing): the Aperture row's bounds and order are
// refused, each with its message. Ported from the review of M8b (archive/review/m8b), whose fuzz found these refusals
// only in the world check; no other test breaks the Aperture row and asks for a refusal (test/fixtures/
// railway-bad-worlds.ts lists the old validators' sites, which predate it). A corrupt or hostile save must not load
// with a leaf down without its weights, or a rivet before the leaf. The set, rack and cw bounds are caught first by
// footing conservation (those fields are footings), so only brace and joined reach 'ring bounds' here.
import test from 'node:test';
import assert from 'node:assert/strict';
import type { World } from '../src/ecs/index.ts';
import { Aperture } from '../src/sim/railway-components.ts';
import { stageWorld, worldVerdict } from './helpers/railway-check.ts';
import type { SeedStage } from '../src/sim/railway-seeds.ts';
import { RAILWAY_MAX_INT } from '../src/sim/railway.ts';
import { RING_HEAD } from '../src/sim/railway-ring-layout.ts';

const STAGES = ['deck-laid', 'gap-footed', 'ring-joined'] as const;
type Fields = Partial<Record<'set' | 'rack' | 'cw' | 'brace' | 'joined' | 'moved' | 'from', number>>;
// Built at module scope, outside the 5 s test timeout (as the golden shards do).
const bases = new Map<SeedStage, World>(STAGES.map((s) => [s, stageWorld(s)]));
const verdict = (stage: SeedStage, fields: Fields) => {
  const w = bases.get(stage)!.clone();
  Object.assign(w.mut(Aperture, w.ids(Aperture)[0]!)!, fields);
  return worldVerdict(w);
};

test('the ring stages are accepted, and a driven brace before the weights is legal (either order)', () => {
  for (const s of STAGES) assert.equal(verdict(s, {}), null, s);
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

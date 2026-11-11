// R4c, the leaf (docs/plans/ring-island-build1.md, step 4c): the leaf's pose over time (src/entities/railway/leaf-shape.ts),
// driven by the Aperture row's brace, counterweight and rivet as leaf-view.ts reads them. Raised before the join, dipping
// a quarter per hung footing once braced, swinging down in 2.5 s with one landing, flat after; a view that first reads
// a joined world (a late joiner) is flat at once.
import test from 'node:test';
import assert from 'node:assert/strict';
import { railwayAtRing } from '../src/sim/railway-seed-ring.ts';
import { aperture } from '../src/sim/railway-rows.ts';
import { BRACE as SIM_BRACE } from '../src/sim/railway-sys-ring.ts';
import {
  BRACE,
  DIP_S,
  LEAF_UP,
  SWING_S,
  TOE_SPEED,
  TOE_U,
  braceOffered,
  createLeafMotion,
  jibOffered,
  leafRest,
  toeShove,
} from '../src/entities/railway/leaf-shape.ts';

const DT = 1 / 60;
/** Runs `s` seconds toward `rest`; returns the degrees seen each frame and the frames that reported a landing. */
function run(m: ReturnType<typeof createLeafMotion>, rest: number, s: number) {
  const degs: number[] = [];
  let landings = 0;
  m.aim(rest);
  for (let t = 0; t < s; t += DT) {
    if (m.step(DT)) landings++;
    degs.push(m.deg);
  }
  return { degs, landings };
}

test("the view's brace encoding is the sim's", () => assert.deepEqual(BRACE, SIM_BRACE));

test('the rests: raised on the pawl, a quarter per footing once braced, down on the last or the rivet', () => {
  assert.equal(leafRest(1, 0, -1), LEAF_UP);
  assert.equal(leafRest(1, 4, -1), LEAF_UP, 'four hung but the pawl still in');
  for (let k = 0; k < 4; k++) assert.equal(leafRest(2, k, -1), (LEAF_UP * (4 - k)) / 4);
  assert.equal(leafRest(0, 4, -1), 0);
  assert.equal(leafRest(2, 0, 100), 0, 'a struck rivet means down whatever the rows say');
});

test("the seeds' rows give the rests the plan names", () => {
  const raised = aperture(railwayAtRing('leaf-raised').w);
  assert.equal(leafRest(raised.brace, raised.cw, raised.joined), LEAF_UP);
  const joined = aperture(railwayAtRing('ring-joined').w);
  assert.equal(leafRest(joined.brace, joined.cw, joined.joined), 0);
});

test('raised before the join, swinging 2.5 s ease-in with one landing, flat after', () => {
  const m = createLeafMotion();
  const before = run(m, LEAF_UP, 3);
  assert.ok(before.degs.every((d) => d === LEAF_UP) && before.landings === 0, 'raised and still before the join');
  const { degs, landings } = run(m, 0, SWING_S + 1);
  assert.equal(landings, 1, 'one landing');
  const at = (s: number) => degs[Math.round(s / DT) - 1]!;
  assert.ok(at(0.5) > LEAF_UP * 0.9, 'slow to start (ease-in)');
  assert.ok(at(SWING_S / 2) > LEAF_UP * 0.7 && at(SWING_S / 2) < LEAF_UP * 0.8, 'a quarter of the way at the half');
  for (let i = 1; i < degs.length; i++) assert.ok(degs[i]! <= degs[i - 1]!, 'never rising on the way down');
  assert.equal(at(SWING_S + 0.1), 0, 'flat after the 2.5 s');
  assert.equal(degs.at(-1), 0);
  const again = run(m, 0, 1);
  assert.deepEqual([again.landings, again.degs.at(-1)], [0, 0], 'no second landing');
});

test('braced footings dip it a quarter each without a landing, then the last swings it down', () => {
  const m = createLeafMotion();
  for (let k = 1; k <= 3; k++) {
    const r = run(m, leafRest(2, k, -1), DIP_S + 0.1);
    assert.equal(r.landings, 0);
    assert.equal(m.deg, (LEAF_UP * (4 - k)) / 4);
  }
  assert.equal(run(m, 0, SWING_S + 0.1).landings, 1);
});

test('a late joiner after the join sees it flat at once, with no swing', () => {
  const m = createLeafMotion();
  m.snap(leafRest(0, 4, 100));
  assert.equal(m.deg, 0);
  assert.equal(m.moving, false);
  const r = run(m, leafRest(0, 4, 100), 1);
  assert.deepEqual([r.landings, r.degs[0], r.degs.at(-1)], [0, 0, 0]);
});

test('the brace prompt is offered exactly once the gap is footed with the pawl in, and at no other state', () => {
  for (let set = 0; set <= 14; set++)
    for (let brace = 0; brace <= 2; brace++)
      assert.equal(braceOffered(set, brace), set === 14 && brace === 1, `set ${set} brace ${brace}`);
});

test("the jib's prompt is the bent's footing, then a counterweight footing until four hang, then none", () => {
  for (let set = 0; set <= 14; set++)
    for (let cw = 0; cw <= 4; cw++) assert.equal(jibOffered(set, cw), set < 14 || cw < 4, `set ${set} cw ${cw}`);
});

test('at each ring seed the windows are the plan names', () => {
  const at = (stage: Parameters<typeof railwayAtRing>[0]) => aperture(railwayAtRing(stage).w);
  const deck = at('deck-laid'),
    gap = at('gap-footed'),
    leaf = at('leaf-raised'),
    joined = at('ring-joined');
  assert.deepEqual([braceOffered(deck.set, deck.brace), jibOffered(deck.set, deck.cw)], [false, true], 'deck-laid');
  assert.deepEqual([braceOffered(gap.set, gap.brace), jibOffered(gap.set, gap.cw)], [true, true], 'gap-footed');
  assert.deepEqual([braceOffered(leaf.set, leaf.brace), jibOffered(leaf.set, leaf.cw)], [true, true], 'leaf-raised');
  assert.deepEqual(
    [braceOffered(joined.set, joined.brace), jibOffered(joined.set, joined.cw)],
    [false, false],
    'joined',
  );
});

test('the toe shove: only under the landing, only while the leaf is coming down, walking back and never up', () => {
  const deg = 20;
  assert.equal(toeShove(259.5, 0, deg, true), TOE_SPEED, 'under the toe');
  assert.equal(toeShove(258.7, 0, deg, true), TOE_SPEED, 'inside the margin');
  assert.equal(toeShove(258.5, 0, deg, true), 0, 'clear of it');
  assert.equal(toeShove(255, 0, deg, true), 0, 'the deck end is not touched');
  assert.equal(toeShove(262, 0, deg, true), 0, 'on the plate stays put');
  assert.equal(toeShove(259.5, 0, 70, true), 0, 'the leaf is still high');
  assert.equal(toeShove(259.5, 0, 0, false), 0, 'settled: someone stepping onto the plate is left alone');
  assert.equal(toeShove(259.5, 8, deg, true), 0, 'in the air above is not the deck');
  // A counterweight's dip (39 to 19.5 degrees) moves the leaf but is not its landing: nobody under the toe is walked.
  const dip = createLeafMotion(39);
  dip.aim(19.5);
  dip.step(DIP_S / 2);
  assert.deepEqual([dip.moving, dip.falling], [true, false]);
  assert.equal(toeShove(259.5, 0, dip.deg, dip.falling), 0, 'a dip is not the landing');
  // Walked at its speed through the swing, anyone from the toe's edge is clear before it lands.
  const m = createLeafMotion();
  m.aim(0);
  let u = 260.9;
  for (let t = 0; t < SWING_S + 0.2; t += DT) {
    m.step(DT);
    u -= toeShove(u, 0, m.deg, m.falling) * DT;
  }
  assert.ok(u <= TOE_U - 1, `cleared to ${u.toFixed(2)}`);
});

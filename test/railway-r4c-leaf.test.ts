// R4c, the leaf (docs/plans/ring-island-build1.md, step 4c): the leaf's pose over time (src/entities/railway/leaf-shape.ts),
// driven by the Aperture row's brace, counterweight and rivet as leaf-view.ts reads them. Raised before the join, dipping
// a quarter per hung footing once braced, swinging down in 2.5 s with one landing, flat after; a view that first reads
// a joined world (a late joiner) is flat at once.
import test from 'node:test';
import assert from 'node:assert/strict';
import { railwayAtRing } from '../src/sim/railway-seed-ring.ts';
import { aperture } from '../src/sim/railway-rows.ts';
import { BRACE as SIM_BRACE } from '../src/sim/railway-sys-ring.ts';
import { BRACE, DIP_S, LEAF_UP, SWING_S, createLeafMotion, leafRest } from '../src/entities/railway/leaf-shape.ts';

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

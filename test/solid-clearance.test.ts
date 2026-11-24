// src/place/clearance.ts with the engine's real Rapier overlap query (src/physics/engine.ts capsuleOverlaps): solids
// switching on where a player can be lift the body straight up onto them or wait, as one set, undrawn, until it is
// clear; never a push sideways, never a solid switched off (rule 67; build skill step 9). Shared safety code for every
// owner that switches solids on near players (the canyon kit's mount, leg 3's lays and standing pieces), so it has its
// own file: three branches took 2 to 5 review rounds each on this class on 24 November.
import '../dev/sim/hooks.ts';
import test from 'node:test';
import assert from 'node:assert/strict';
import { HEAD_OFFSET, PLAYER_R } from '../src/constants.ts';
import { createLiftOrWait, STEP, type Solid } from '../src/place/clearance.ts';
import type { Body, Shape } from '../src/physics/engine.ts';

const physics = await import('../src/physics/engine.ts');
await physics.physicsReady;
const liftOrWait = createLiftOrWait(physics.capsuleOverlaps);

class Vec {
  x: number;
  y: number;
  z: number;
  constructor(x = 0, y = 0, z = 0) {
    this.x = x;
    this.y = y;
    this.z = z;
  }
  set(x: number, y: number, z: number) {
    this.x = x;
    this.y = y;
    this.z = z;
    return this;
  }
}
/** A body standing with its feet (the bottom sphere's lowest point) at `feet`, far from anything else built. */
const bodyAt = (x: number, feet: number, z: number) => ({
  position: new Vec(x, feet + PLAYER_R, z),
  velocity: new Vec(0, -3, 0),
  interpolatedPosition: new Vec(x, feet + PLAYER_R, z),
});
const box = (x: number, top: number, z: number, hx = 2, hy = 1, hz = 2): Shape => ({
  kind: 'box',
  hx,
  hy,
  hz,
  offset: { x, y: top - hy, z },
});
/** A closed six-sided prism, a trimesh as the kits' rocks are: from (x0, z0) to (x1, z1), from y0 up to y1. */
function prism(x0: number, z0: number, x1: number, z1: number, y0: number, y1: number): Shape {
  const v = [x0, y0, z0, x1, y0, z0, x1, y0, z1, x0, y0, z1, x0, y1, z0, x1, y1, z0, x1, y1, z1, x0, y1, z1];
  // Outward-facing triangles (counter-clockwise seen from outside).
  const f = [
    0, 1, 2, 0, 2, 3, 4, 6, 5, 4, 7, 6, 0, 4, 5, 0, 5, 1, 1, 5, 6, 1, 6, 2, 2, 6, 7, 2, 7, 3, 3, 7, 4, 3, 4, 0,
  ];
  return { kind: 'trimesh', vertices: v, indices: f };
}
/** Solids that record when they switch on (solid and drawn together): `on` is the only switch there is. */
function solids(...shapes: Shape[][]) {
  const switched: number[] = [];
  const list: (Solid & { i: number })[] = shapes.map((s, i) => ({ i, shapes: s, on: () => switched.push(i) }));
  return { list, switched };
}
/** A static roof built in the world, for headroom; removed after. */
function built(shape: Shape) {
  const body = physics.createBody({ type: 'static', shapes: [shape] });
  physics.addBody(body);
  physics.stepFixed(); // into the broad phase
  return () => physics.removeBody(body);
}
const asBody = (b: ReturnType<typeof bodyAt>) => b as unknown as Body;

test('feet within a step of the top: lifted straight up onto it, and the solid switches on', () => {
  const b = bodyAt(1000, 0, 1000);
  const { list, switched } = solids([box(1000, 0.2, 1000)]);
  const c = liftOrWait(list, asBody(b), { lift: true });
  assert.equal(c.kind, 'lifted');
  assert.deepEqual(switched, [0]);
  assert.ok(Math.abs(b.position.y - (0.2 + PLAYER_R)) < 0.005, `stands at ${b.position.y}`);
  assert.equal(b.interpolatedPosition.y, b.position.y);
  assert.deepEqual([b.position.x, b.position.z], [1000, 1000], 'moved sideways');
  assert.equal(b.velocity.y, 0);
});

test('a trimesh prism lifts too, and a body wholly inside a tall one waits', () => {
  const low = bodyAt(1100, 0, 1000);
  const step = solids([prism(1098, 998, 1102, 1002, -1, 0.25)]);
  assert.equal(liftOrWait(step.list, asBody(low), { lift: true }).kind, 'lifted');
  assert.ok(Math.abs(low.position.y - (0.25 + PLAYER_R)) < 0.005);
  const inside = bodyAt(1100, 0, 1010);
  const tall = solids([prism(1095, 1005, 1105, 1015, -2, 5)]);
  const c = liftOrWait(tall.list, asBody(inside), { lift: true });
  assert.equal(c.kind, 'wait');
  assert.deepEqual(tall.switched, [], 'a waiting solid is neither solid nor drawn');
  assert.equal(inside.position.y, PLAYER_R);
});

test('a lift into a roof waits instead, the body unmoved', () => {
  const b = bodyAt(1200, 0, 1000);
  // The roof's underside is 0.1 m over the head now: clear where it stands, not where it would stand on the slab.
  const head = PLAYER_R + HEAD_OFFSET + PLAYER_R;
  const remove = built(box(1200, head + 0.1 + 0.5, 1000, 2, 0.25, 2));
  try {
    const { list, switched } = solids([box(1200, 0.2, 1000)]);
    const c = liftOrWait(list, asBody(b), { lift: true });
    assert.equal(c.kind, 'wait');
    assert.deepEqual(switched, []);
    assert.equal(b.position.y, PLAYER_R);
    assert.equal(c.waiting.length, 1);
  } finally {
    remove();
  }
});

test('the step is STEP exactly: a top 0.29 m over the feet lifts, 0.31 m waits', () => {
  const under = bodyAt(1250, 0, 1000);
  assert.equal(liftOrWait(solids([box(1250, STEP - 0.01, 1000)]).list, asBody(under), { lift: true }).kind, 'lifted');
  const over = bodyAt(1250, 0, 1010);
  assert.equal(liftOrWait(solids([box(1250, STEP + 0.01, 1010)]).list, asBody(over), { lift: true }).kind, 'wait');
  assert.equal(over.position.y, PLAYER_R);
});

test('a top more than a step over the feet waits; lift: false (a mount) only ever waits', () => {
  const high = bodyAt(1300, 0, 1000);
  const tall = solids([box(1300, STEP + 0.1, 1000)]);
  assert.equal(liftOrWait(tall.list, asBody(high), { lift: true }).kind, 'wait');
  assert.equal(high.position.y, PLAYER_R);
  const mount = bodyAt(1300, 0, 1010);
  const low = solids([box(1300, 0.1, 1010)]);
  assert.equal(liftOrWait(low.list, asBody(mount), { lift: false }).kind, 'wait');
  assert.equal(mount.position.y, PLAYER_R);
  assert.deepEqual(low.switched, []);
});

test('an overhang that holds only the head waits: nobody is lifted to where there is no ground under them', () => {
  const b = bodyAt(1350, 0, 1000);
  const overhang = solids([box(1350, PLAYER_R + HEAD_OFFSET + 0.3, 1000, 2, 0.2, 2)]);
  assert.equal(liftOrWait(overhang.list, asBody(b), { lift: true }).kind, 'wait');
  assert.equal(b.position.y, PLAYER_R);
});

test('two overlapping solids wait as one set; a partial exit keeps both off; clear of both, both come back together', () => {
  const b = bodyAt(1400, 0, 1000);
  // A and B overlap around x = 1400; each is too tall to be lifted onto.
  const { list, switched } = solids(
    [box(1399, 2, 1000, 1.5, 3, 2)],
    [box(1401, 2, 1000, 1.5, 3, 2)],
    [box(1450, 0.1, 1000)],
  );
  const c = liftOrWait(list, asBody(b), { lift: true });
  assert.equal(c.kind, 'wait');
  assert.deepEqual(switched, [2], 'the solid that holds nobody switches on at once');
  assert.deepEqual(
    c.waiting.map((s) => s.i),
    [0, 1],
  );
  b.position.set(1402, PLAYER_R, 1000); // out of A, still in B
  assert.equal(c.retry(asBody(b)), true);
  assert.deepEqual(switched, [2], 'A switched on while the body was still in B');
  b.position.set(1398, PLAYER_R, 1000); // back in A: still one set
  assert.equal(c.retry(asBody(b)), true);
  assert.deepEqual(switched, [2]);
  b.position.set(1420, PLAYER_R, 1000);
  assert.equal(c.retry(asBody(b)), false);
  assert.deepEqual(switched, [2, 0, 1], 'both return in the same retry');
  assert.deepEqual([b.position.x, b.position.z], [1420, 1000], 'the helper never moves a body sideways');
});

test('never sideways: a body grazing a tall solid from beside it waits where it is', () => {
  const b = bodyAt(1500, 0, 1000);
  const side = solids([box(1500 + PLAYER_R + 1.9, 3, 1000)]); // 0.1 m into its side face
  const c = liftOrWait(side.list, asBody(b), { lift: true });
  assert.equal(c.kind, 'wait');
  assert.deepEqual([b.position.x, b.position.y, b.position.z], [1500, PLAYER_R, 1000]);
});

test('resting on a top is not in it; once on, a landing or contact never switches a solid off', () => {
  const b = bodyAt(1600, 0.5, 1000); // feet on the box's top, within the solver's contact sink
  b.position.y -= 0.005;
  const { list, switched } = solids([box(1600, 0.5, 1000)]);
  const c = liftOrWait(list, asBody(b), { lift: true });
  assert.equal(c.kind, 'clear');
  assert.deepEqual(switched, [0]);
  b.position.set(1600, 0, 1000); // sunk into it (a hard landing): nothing waits, nothing is switched again
  assert.equal(c.retry(asBody(b)), false);
  assert.deepEqual(switched, [0]);
  assert.equal(c.waiting.length, 0);
  assert.equal(b.position.y, 0);
});

test('a retried set lifts the body once its feet come within a step of the top', () => {
  const b = bodyAt(1700, -1, 1000);
  const { list, switched } = solids([box(1700, 0.2, 1000)]);
  const c = liftOrWait(list, asBody(b), { lift: true });
  assert.equal(c.kind, 'wait');
  b.position.set(1700, PLAYER_R, 1000);
  assert.equal(c.retry(asBody(b)), false);
  assert.deepEqual(switched, [0]);
  assert.ok(Math.abs(b.position.y - (0.2 + PLAYER_R)) < 0.005);
});

test('no body: everything switches on', () => {
  const { list, switched } = solids([box(1800, 0.2, 1000)], [box(1810, 3, 1000)]);
  assert.equal(liftOrWait(list, null, { lift: true }).kind, 'clear');
  assert.deepEqual(switched, [0, 1]);
});

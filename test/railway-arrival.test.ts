// Owner-requested regression: a returning pose must not trust Rapier's stale broad phase.
// Existing sim hooks load the real physics backend; no browser, renderer or replacement harness.
import '../dev/sim/hooks.ts';
import test from 'node:test';
import assert from 'node:assert/strict';
import { createPoseReadiness } from '../src/entities/railway/pose-readiness.ts';

test('return-pose validation waits for a physics step after initial and replacement scenery', async () => {
  const physics = await import('../src/physics/engine.ts');
  const { createPosePolicy } = await import('../src/place/pose.ts');
  const { GROUP } = await import('../src/physics/physics.ts');
  await physics.physicsReady;
  const point = { x: 1000, z: 500, yaw: 0, ground: 10 };
  const policy = createPosePolicy(
    () => 10,
    () => true,
    () => false,
  );
  const scenery = createPoseReadiness(physics.physicsTime);
  let reads = 0;
  const restore = () => {
    if (!scenery.ready()) return undefined;
    reads++;
    return policy.safe(point);
  };
  for (const reconstruction of ['initial', 'snapshot']) {
    const deck = physics.createBody({
      type: 'static',
      group: GROUP.SCENERY,
      position: { x: point.x, y: 12, z: point.z },
      shapes: [{ kind: 'box', hx: 3, hy: 0.15, hz: 3 }],
    });
    physics.addBody(deck);
    scenery.rebuilt();
    try {
      // This is the original failure: the partner's newly constructed deck is still
      // absent from Rapier's broad phase, so an immediate safety query accepts ground below it.
      assert.ok(policy.safe(point), `${reconstruction}: unguarded stale query wrongly accepts the pose`);
      const before = reads;
      assert.equal(restore(), undefined, `${reconstruction}: do not validate before stepping`);
      physics.stepPhysics(0);
      assert.equal(restore(), undefined, `${reconstruction}: a zero-delta frame is not readiness`);
      assert.equal(reads, before, 'no stale safety query was made');
      physics.stepFixed();
      assert.equal(restore(), false, `${reconstruction}: the indexed deck rejects the saved ground pose`);
    } finally {
      physics.removeBody(deck);
      physics.stepFixed();
    }
    assert.ok(restore(), 'ordinary clear ground remains a valid return pose');
  }
});

test('standing surfaces include decks and stacked slabs, with headroom and current colliders', async () => {
  const physics = await import('../src/physics/engine.ts');
  const { createPosePolicy } = await import('../src/place/pose.ts');
  const { GROUP } = await import('../src/physics/physics.ts');
  await physics.physicsReady;
  const policy = createPosePolicy(
    () => 10,
    () => true,
    () => false,
    physics,
  );
  const bodies: import('../src/physics/engine.ts').Body[] = [];
  const slab = (x: number, y: number, z = 1000, hx = 2) => {
    const body = physics.createBody({
      type: 'static',
      group: GROUP.SCENERY,
      position: { x, y: y - 0.1, z },
      shapes: [{ kind: 'box', hx, hy: 0.1, hz: 2 }],
    });
    physics.addBody(body);
    bodies.push(body);
    return body;
  };
  slab(1000, 10);
  const deck = slab(1010, 22);
  slab(1020, 10);
  slab(1020, 12);
  slab(1030, 10);
  slab(1030, 11);
  slab(1043, 22, 1000, 0.5);
  slab(1050, 1); // terrain at sea level is refused; a distinct low deck is allowed.
  try {
    physics.stepFixed();
    assert.ok(policy.standableAt(1000, 10, 1000), 'open ground');
    assert.ok(policy.standableAt(1010, 22, 1000), 'deck 12m over ground');
    assert.ok(policy.standableAt(1020, 10, 1000), '2m headroom');
    assert.equal(policy.standableAt(1030, 10, 1000), false, '1m ceiling');
    assert.equal(policy.standableAt(1000, 15, 1000), false, 'midair');
    assert.ok(policy.standableNear(1040, 22, 1000, [1.4, 3, 6]), 'deck 3m aside');
    assert.ok(policy.standableNear(1020, 10, 1000, [1.4]), 'nearby floor beneath a slab 2m above');
    const sea = createPosePolicy(
      () => 1,
      () => true,
      () => false,
      physics,
    );
    assert.equal(sea.standableAt(1050, 1, 1000), false, 'sea-level terrain');
    assert.ok(policy.standableAt(1050, 1, 1000), 'low deck distinct from terrain');
    physics.removeBody(deck);
    bodies.splice(bodies.indexOf(deck), 1);
    physics.stepFixed();
    assert.equal(policy.standableAt(1010, 22, 1000), false, 'removed deck');
  } finally {
    for (const body of bodies) physics.removeBody(body);
    physics.stepFixed();
  }
});

// Owner-requested regression: a returning pose must not trust Rapier's stale broad phase.
// Existing sim hooks load the real physics backend; no browser, renderer or replacement harness.
import '../dev/sim/hooks.ts';
import test from 'node:test';
import assert from 'node:assert/strict';
import { createPoseReadiness } from '../src/entities/railway/pose-readiness.ts';

test('return-pose validation waits for a physics step after initial and replacement scenery', async () => {
  const physics = await import('../src/physics/engine.ts');
  const { createPosePolicy } = await import('../src/proto/place/pose.ts');
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
    return policy.read(point);
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
      assert.ok(policy.read(point), `${reconstruction}: unguarded stale query wrongly accepts the pose`);
      const before = reads;
      assert.equal(restore(), undefined, `${reconstruction}: do not validate before stepping`);
      physics.stepPhysics(0);
      assert.equal(restore(), undefined, `${reconstruction}: a zero-delta frame is not readiness`);
      assert.equal(reads, before, 'no stale safety query was made');
      physics.stepFixed();
      assert.equal(restore(), null, `${reconstruction}: the indexed deck rejects the saved ground pose`);
    } finally {
      physics.removeBody(deck);
      physics.stepFixed();
    }
    assert.ok(restore(), 'ordinary clear ground remains a valid return pose');
  }
});

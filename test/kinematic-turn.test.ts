// src/physics/backend-rapier.ts: a kinematic body turns about its origin (a measured physics regression). Every mover
// sets its velocity for its origin (src/entities/railway/car.ts moveCar) and the carry turns riders about it
// (src/physics/platforms.ts carryStep); Rapier turned a massive compound about its centre of mass, so the engine (its
// boiler and cab off-centre) slid every rider sideways by that offset times each turn on line 2.
import '../dev/sim/hooks.ts';
import test from 'node:test';
import assert from 'node:assert/strict';

test('a kinematic compound with off-centre shapes turns about its origin, and a dynamic body keeps its mass', async () => {
  const physics = await import('../src/physics/engine.ts');
  await physics.physicsReady;
  const deck = physics.createBody({
    type: 'kinematic',
    position: { x: 300, y: 80, z: 300 },
    mask: 0,
    shapes: [
      { kind: 'box', hx: 1, hy: 0.5, hz: 2 },
      { kind: 'box', hx: 0.6, hy: 0.6, hz: 1.3, offset: { x: 0, y: 1, z: 1.2 } },
    ],
  });
  physics.addBody(deck);
  try {
    // A radian in place: before the fix the origin swung 0.37 m round the boxes' centre of mass.
    for (let i = 0; i < 60; i++) {
      deck.velocity.set(0, 0, 0);
      deck.angularVelocity.set(0, 1, 0);
      physics.stepFixed();
    }
    assert.ok(Math.hypot(deck.position.x - 300, deck.position.z - 300) < 1e-3, `origin moved: ${deck.position.x}`);
    // Turned dynamic it falls as a body of its own mass at its shapes' centre, as before.
    physics.setMotion(deck, 'dynamic', true, 5);
    deck.angularVelocity.set(0, 0, 0);
    physics.stepFixed();
    assert.ok(deck.velocity.y < 0, 'a dynamic body falls');
  } finally {
    physics.removeBody(deck);
  }
});

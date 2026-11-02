// The smallest headless run: Rapier in Node, a ball dropped on a floor. No game code but the physics facade.
import assert from 'node:assert/strict';
import { addBody, createBody, physicsReady, stepFixed } from '../../src/physics/engine.ts';

await physicsReady;
addBody(createBody({ position: { x: 0, y: -1, z: 0 }, shapes: [{ kind: 'box', hx: 50, hy: 1, hz: 50 }] }));
const ball = createBody({ mass: 1, position: { x: 0, y: 10, z: 0 }, shapes: [{ kind: 'sphere', r: 0.5 }] });
addBody(ball);

const t0 = performance.now();
for (let step = 0; step < 300; step++) stepFixed();
const ms = performance.now() - t0;

console.log(
  `after 5 s of physics: y ${ball.position.y.toFixed(3)} m, ${ms.toFixed(1)} ms, ${(5000 / ms).toFixed(0)}x real time`,
);
assert.ok(Math.abs(ball.position.y - 0.5) < 0.01, 'the ball rests on the floor');

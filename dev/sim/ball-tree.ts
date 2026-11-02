// The ball thrown at a palm headless: the trunk's colliders come from pure data (src/blueprints/), so they're here with no
// render code. It must bounce back off the trunk rather than fly through.
import assert from 'node:assert/strict';
import { frame, headless, virtualClock } from './world.ts';
import { ball, grabBall, throwBall } from '../../src/entities/ball/state.ts';
import { trees } from '../../src/entities/props/state.ts';

const SPEED = 14; // m/s
const RUN_UP = 4; // m from the trunk

await headless();
virtualClock();
const tree = trees[0]!;
grabBall();
throwBall({ x: tree.x - RUN_UP, y: tree.h + 2, z: tree.z }, { x: SPEED, y: 0, z: 0 });

let furthest = -Infinity;
let back = 0;
for (let step = 0; step < 30; step++) {
  frame();
  furthest = Math.max(furthest, ball.body.position.x);
  back = ball.body.velocity.x;
}
const past = furthest - tree.x;
console.log(
  `palm at ${tree.x.toFixed(2)}, ${tree.z.toFixed(2)}: the ball got ${past.toFixed(2)} m past its centre, then ${back.toFixed(2)} m/s`,
);
assert.ok(past < 0, 'the ball stops at the trunk');
assert.ok(back < 0, 'the ball bounces back');
process.exit(0);

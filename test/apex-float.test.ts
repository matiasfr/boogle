// P1 on live v24: a double jump while the first was still rising, with Jump held, floated up for good. The controller's
// held-apex float and the air jump's own both lifted by half gravity, and together they cancelled it. Holding Jump must
// never gain height without bound, glider or not; the glide still only spends height.
import test from 'node:test';
import assert from 'node:assert/strict';
import { FIXED, GRAVITY, PLAYER_MASS } from '../src/constants.ts';
import { APEX_GRAVITY, airJumpApexForce } from '../src/entities/player/apex-float.ts';
import { closeGlide, createGlide, openGlide, rearmGlide, stepGlide } from '../src/entities/railway/glide-step.ts';
import { MOVE } from '../src/proto/place/tech-layout.ts';

const W = PLAYER_MASS * GRAVITY;
const APEX_SPEED = 1.6; // JUMP.apexSpeed and railJumpApexSpeed's default (160 cm/s)
const AIR_JUMP = 8; // a generous second-jump impulse, m/s

/** The controller's extra vertical force for a first jump still rising with Jump held (shapeJump). */
const controller = (vy: number) => (vy < APEX_SPEED ? -W * (APEX_GRAVITY - 1) : 0);

/** A second jump fired while the first still rises, Jump held throughout; the air jump's float runs after the controller. */
function heldAirJump(air: (force: number) => number, seconds: number) {
  let y = 0,
    vy = AIR_JUMP,
    top = 0;
  for (let k = 0; k < seconds / FIXED; k++) {
    let force = controller(vy);
    if (vy > 0 && vy < APEX_SPEED) force = air(force);
    vy += (force / PLAYER_MASS - GRAVITY) * FIXED;
    y += vy * FIXED;
    top = Math.max(top, y);
  }
  return { y, vy, top };
}

test('the old stacked floats hang weightless and climb for as long as Jump is held', () => {
  const stacked = heldAirJump((f) => f + W * 0.5, 30);
  assert.ok(stacked.vy > 0, 'still rising after 30 s');
  assert.ok(stacked.top > 40, `climbed ${stacked.top.toFixed(1)} m`);
});

test('holding Jump after a double jump tops out and comes back down', () => {
  const fixed = heldAirJump((f) => airJumpApexForce(f, W), 30);
  assert.ok(fixed.vy < 0, 'falling again');
  // An 8 m/s launch under full gravity reaches 3.3 m; the apex float adds a little, never a climb.
  assert.ok(fixed.top < 4, `topped out at ${fixed.top.toFixed(2)} m`);
});

test("the air jump's float is unchanged when the controller has none, and a released jump still cuts", () => {
  assert.equal(airJumpApexForce(0, W), W * 0.5, 'its own half-gravity float, held or not');
  assert.equal(airJumpApexForce(W * 0.5, W), W * 0.5, "never on top of the controller's");
  const cut = -W * 1.5; // cutGravity 2.5 after Jump is let go
  assert.equal(airJumpApexForce(cut, W), cut + W * 0.5, 'the short hop keeps its arc');
  for (const force of [-2 * W, -W, 0, W * 0.5, W, 3 * W]) {
    assert.ok(airJumpApexForce(force, W) < W, `gravity wins while rising (force ${force})`);
  }
});

test('with the glider rearmed by the air jump, the canopy catches you at the top and only spends height', () => {
  const g = createGlide();
  openGlide(g);
  rearmGlide(g);
  let y = 0,
    top = 0;
  const v = { x: 0, y: AIR_JUMP, z: 0 };
  for (let k = 0; k < 20 / FIXED; k++) {
    const before = { x: v.x, z: v.z };
    if (stepGlide(g, before, v, { x: 0, z: 1 }, MOVE)) {
      y += v.y * FIXED; // the glide cancels gravity and sets the velocity itself
    } else {
      let force = controller(v.y);
      if (v.y > 0 && v.y < APEX_SPEED) force = airJumpApexForce(force, W);
      v.y += (force / PLAYER_MASS - GRAVITY) * FIXED;
      y += v.y * FIXED;
    }
    top = Math.max(top, y);
  }
  assert.ok(g.holding && g.flights === 1, 'the canopy took you from the apex');
  assert.ok(top < 4, `topped out at ${top.toFixed(2)} m`);
  assert.ok(y < top - 40, `20 s on, ${(top - y).toFixed(1)} m below the top`);
  closeGlide(g);
});

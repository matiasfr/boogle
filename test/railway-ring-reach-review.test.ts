// Review of R1 (docs/plans/ring-island-build1.md, step 1): an independent stepping of the late double jump, in the
// controller's own order at its own rate (FIXED): shapeJump (order 30, src/entities/player/state.ts), steerPlayer (40),
// the railway air jump (43, src/entities/railway/tools.ts airJump), then Rapier's semi-implicit Euler. Not the author's
// dev/level/ring.ts stepper. The second test is the defect: a braking train's carry is kept through the air
// (src/physics/platforms.ts carryStep: "left a deck: keep its speed through the air"), and the report checks the cab
// roof only at the end stop, standing.
import test from 'node:test';
import assert from 'node:assert/strict';
import { FIXED, GRAVITY, JUMP_SPEED, PLAYER_R, WALKABLE_NY } from '../src/constants.ts';
import { APEX_GRAVITY } from '../src/entities/player/apex-float.ts';
import { ENGINE_CAB } from '../src/entities/railway/engine.ts';
import { TRAIN_OFFSETS } from '../src/entities/railway/cars.ts';
import {
  RING_BRACE_PLATFORM,
  RING_END_APPROACH,
  RING_END_BRAKE_CMS2,
  RING_FORMATION,
  RING_GAP,
  RING_HEAD,
  RING_S_HEAD,
  ringDeckY,
} from '../src/sim/railway-ring-layout.ts';

// src/entities/player/state.ts (JUMP, MAX_FALL, the sprint), src/sim/tune.ts (railJumpImpulse, railJumpApexSpeed defaults)
const FALL = 1.7,
  APEX_V = 1.6,
  CAP = 20,
  AIR = 6.8,
  SPRINT = 9.5,
  COYOTE_STEPS = 6; // me.coyote = 0.1, less FIXED before each test: six steps still > 0
// A sphere on a box corner still counts as ground while its contact normal's y exceeds WALKABLE_NY: the centre up to
// r * sqrt(1 - ny^2) past the take-off edge, or short of the landing edge.
const CORNER = PLAYER_R * Math.sqrt(1 - WALKABLE_NY * WALKABLE_NY);
const RAIL_TOP = 0.22;
const m = (cm: number) => cm / 100;

/** Seconds from the take-off step until the feet are `drop` m below the take-off, the air jump at step `press`. */
function flight(drop: number, press: number, preFall = 0, onDeck = false) {
  let y = 0,
    vy = 0;
  for (let k = 0; k < preFall; k++) {
    vy -= GRAVITY * (vy < 0 ? FALL : 1) * FIXED;
    y += vy * FIXED;
  }
  let jumpActive = true,
    second = false;
  for (let n = 0; n < 2000; n++) {
    if (n > 0 && vy <= 0) jumpActive = false;
    let g = 1;
    if (vy < 0 || (vy === 0 && jumpActive && !onDeck)) g = FALL;
    else if (jumpActive && vy < APEX_V) g = APEX_GRAVITY; // held for the whole rise: the longest arc
    let f = -(g - 1) * GRAVITY;
    if (vy < -CAP) vy = -CAP;
    if (n === 0) vy = Math.min(Math.max(vy, 0), 6) + JUMP_SPEED;
    if (n === press) {
      vy = Math.max(vy, AIR);
      second = true;
    }
    if (second) {
      if (vy <= 0) second = false;
      else if (vy < APEX_V) f = Math.min(f + (1 - APEX_GRAVITY) * GRAVITY, (1 - APEX_GRAVITY) * GRAVITY);
    }
    const vy1 = vy + (f - GRAVITY) * FIXED,
      y1 = y + vy1 * FIXED;
    if (y1 <= -drop && vy1 < 0) return n * FIXED + (FIXED * (y + drop)) / (y - y1);
    vy = vy1;
    y = y1;
  }
  return Infinity;
}
/** The longest flight over every press step. */
function longest(drop: number, preFall = 0, onDeck = false) {
  let t = 0;
  for (let p = 1; p < 300; p++) t = Math.max(t, flight(drop, p, preFall, onDeck));
  return t;
}

const B = RING_BRACE_PLATFORM,
  head = RING_HEAD[7]!;

test('review: the late double jump off the railhead platform end falls at least 1.5 m short (1/60, grace, corners)', () => {
  const drop = m(ringDeckY(head.u) + 90 - B.y),
    near = m(B.u0 - head.u);
  let reach = 0;
  for (let k = 0; k <= COYOTE_STEPS; k++) reach = Math.max(reach, SPRINT * (longest(drop, k) + k * FIXED));
  reach += 2 * CORNER;
  assert.ok(reach <= near - 1.5, `reach ${reach.toFixed(2)} m against ${near.toFixed(2)} m`);
});

test("review: a late double jump off a braking train's cab roof falls at least 1.5 m short of the brace platform", () => {
  // The railhead's end stop eases in (src/sim/railway-ring-layout.ts; R3a's end-stop leg), not the line's 3.5 m/s^2.
  const accel = m(RING_END_BRAKE_CMS2),
    vMax = Math.min(20, m(RING_END_APPROACH));
  const stopU = m(head.s - RING_S_HEAD) + TRAIN_OFFSETS[0]! + ENGINE_CAB.roofZ[1];
  // The raised leaf (78 degrees, as dev/level/ring.ts) stands over the formation: pass east of it by its toe.
  const toe = m(RING_GAP.hinge) - m(RING_GAP.leaf) * Math.cos((78 * Math.PI) / 180) - 0.4,
    clearLat = m(RING_FORMATION.right) + PLAYER_R;
  let worst = { spare: -Infinity, v: 0, u: 0, reach: 0, need: 0 };
  for (let v = 0; v <= vMax; v += 0.25) {
    const d = (v * v) / (2 * accel),
      u = stopU - d,
      roofY = m(ringDeckY(Math.round(u * 100))) + RAIL_TOP + ENGINE_CAB.roofTop;
    const t = longest(roofY - m(B.y), 0, true);
    // The kept carry: CARRY.skid (9 m/s^2) for CARRY.departureSkidS (0.1 s), then kept to the landing.
    const kept = Math.max(0, v - 0.9),
      carried = kept * t;
    // A straight world path from the roof to the platform's near edge that clears the leaf's toe on the east side.
    const landU = m(B.u0),
      lat = Math.max(m(B.lat0), (clearLat * (landU - u)) / Math.max(0.1, toe - u));
    const need = Math.hypot(landU - u - carried, lat),
      // The report's own allowance for the roof (dev/level/ring.ts lateDouble: coyote grace + PLAYER_R), at 1/60.
      reach = SPRINT * (t + 0.1) + PLAYER_R;
    if (reach - need > worst.spare) worst = { spare: reach - need, v, u, reach, need };
  }
  assert.ok(
    worst.spare <= -1.5,
    `train at ${worst.v} m/s, roof front at u ${worst.u.toFixed(1)}: ${worst.reach.toFixed(1)} m of own reach against ${worst.need.toFixed(1)} m still needed after the carry (${worst.spare.toFixed(1)} m spare)`,
  );
});

// Prototype: the soapbox cart (?proto=soapbox; docs/game-design/soapbox.md, docs/plans/find-the-fun.md step 5).
// Asks "is driving a vehicle fun?" with feel only: no rewards. Serves DESIGN.md 1 (toys before chores), with 2 and 10.
//
// The cart is an arcade vehicle on one physics body: a frictionless sphere that gravity rolls downhill, with grip,
// steering and drag added by hand each fixed step (vehicles.md rule 1: fake the stability, keep the physics). The mesh
// is posed on top: tilted to the ground, leaning into turns, bouncing on a spring. Owner kind: the driver publishes the
// pose as presence `soapbox`; everyone else smooths it with createSnaps.
//
// Seated, your own body leaves the physics world and is put on the seat each frame, so the camera, your avatar and
// your presence follow the cart. A hard hit throws you out.
import * as THREE from 'three/webgpu';
import { FIXED, INTERP_MS, PLAYER_R, reducedMotion } from '../../constants.ts';
import { clamp, lerp, angleLerp, finiteArr, r2, r3 } from '../../math.ts';
import { groundHeight } from '../../adapters/terrain.ts';
import { waterField } from '../../physics/water-field.ts';
import { GROUP } from '../../physics/physics.ts';
import {
  createBody,
  material,
  addBody,
  removeBody,
  setMotion,
  teleport,
  onPreStep,
  onPostStep,
  raycastClosest,
  rayHit,
  physicsTime,
} from '../../physics/engine.ts';
import { scene, camera } from '../../render/scene.ts';
import { emit } from '../../render/particles.ts';
import { me, cam } from '../../player/player.ts';
import { input } from '../../player/input.ts';
import { registerInteractable } from '../../player/hands.ts';
import { heldId } from '../../player/inventory.ts';
import { describeControl, wrapAction } from '../../player/controls.ts';
import { remotes, addPresenceField, onRemotePresence, sendPresence } from '../../netplay/net.ts';
import { createSnaps } from '../../netplay/snaps.ts';
import { onFrame, onStart } from '../../loop.ts';
import site from '../../pois/lighthouse/site.ts';
import { makeCart, poseCart, SEAT, TRACK, AXLE_Z, WHEEL_R } from './cart-mesh.ts';
import { createRunHud, type RunHud } from './run-hud.ts';

// ---------------------------------------------------------------- tuning (window.__soapbox.T in the console)
const T = {
  mass: 120, // kg: bulldozes the ball (0.6) and players (70)
  r: 0.5, // m: the rolling sphere under the cart
  push: 5, // m/s²: kicking along with forward held, up to pushMax
  pushMax: 5, // m/s
  brake: 10, // m/s²: back held
  rolling: 0.35, // m/s²: rolling resistance
  drag: 0.014, // 1/m: air drag (a = drag·v²); about 22 m/s on the steepest part of the hill
  grip: 36, // m/s²: most sideways acceleration the wheels give before they slide
  driftGrip: 6, // m/s²: the same with the handbrake on
  keepSlide: 0.6, // share of the sideways speed the grip removes that turns into forward speed (arcade momentum)
  steerLow: 0.55, // rad of front-wheel angle below 4 m/s
  steerHigh: 0.17, // rad at steerFade m/s and over
  steerFade: 16, // m/s
  steerEase: 9, // 1/s: how fast the wheel follows the stick
  wheelbase: 1.44, // m
  maxYaw: 3.2, // rad/s
  driftYaw: 1.4, // x turn rate with the handbrake on
  driftAngle: 1.0, // rad: the most the nose swings out from where you are going while drifting (no spin-outs)
  handbrake: 1.6, // m/s² it costs
  airYaw: 1.0, // rad/s of turn in the air
  coastBrake: 2.5, // m/s² that stops a cart nobody drives
  crashDv: 7, // m/s of speed knocked off by hits within a few steps (a leaky sum) that throws you out
  crashLand: 15, // m/s of upward change in one step (a landing) that throws you out
  crashMin: 6, // m/s: slower than this nothing throws you
  throwUp: 11, // m/s up when thrown
  throwKeep: 0.55, // share of the cart's speed you keep when thrown (over whatever you hit, not into it)
  returnAfter: 3.5, // s an empty cart waits before it rolls itself back to the top
};
const MAX_FALL = 22; // m/s, as physics.ts: no continuous collision against the heightfield

// ---------------------------------------------------------------- the route
const TOWER = { x: site.x, z: site.z };
const pathDir = (ax: number, az: number, bx: number, bz: number) => {
  const l = Math.hypot(bx - ax, bz - az);
  return { x: (bx - ax) / l, z: (bz - az) / l };
};
const D1 = pathDir(0, 7, 2, 22); // the lighthouse path's first leg (site.ts)
const D2 = pathDir(2, 22, 4, 34);
const yawOf = (d: { x: number; z: number }) => Math.atan2(-d.x, -d.z); // forward = (-sin, -cos), as me.yaw
const START = { x: TOWER.x + D1.x * 13, z: TOWER.z + 7 + D1.z * 6, h: yawOf(D1) }; // on the shoulder, before the drop
const START_R = 14.5; // m from the tower: crossing it starts the clock
// Across the flats at the bottom, short of home: the hill gives the speed, the flats ask you to keep it.
const FINISH = { x: 12.5, z: 4, half: 8, h: yawOf(pathDir(10, -24, 12.5, 4)) };
const startY = () => groundHeight(START.x, START.z) + T.r + 0.05;
const flat = (ax: number, az: number, bx: number, bz: number) => Math.hypot(ax - bx, az - bz);

// ---------------------------------------------------------------- body and state
const cartMat = material('soapbox', { friction: 0, restitution: 0.15 });
const body = createBody({
  mass: T.mass,
  material: cartMat,
  fixedRotation: true,
  position: { x: START.x, y: startY(), z: START.z },
  shapes: [{ kind: 'sphere', r: T.r }],
});
addBody(body);
setMotion(body, 'kinematic', true); // parked: a solid thing you walk into

type Mode = 'parked' | 'driving' | 'loose';
const S = {
  mode: 'parked' as Mode,
  seated: false,
  heading: START.h,
  steer: 0, // -1..1, smoothed input (+ is right)
  wheel: 0, // the front wheels' angle (rad, + is left), for the mesh
  grounded: false,
  wasGrounded: false,
  drifting: false,
  slip: 0, // m/s sideways
  vf: 0, // m/s forward
  yawRate: 0,
  looseAt: 0,
  tumble: 0, // s left of the thrown-out spin
  tumbleAngle: 0,
  landKick: 0, // m/s of fall speed at the last landing, for the mesh bounce
  camDist: 0, // the zoom you had before you got in
};
const n = new THREE.Vector3(0, 1, 0); // ground normal under the cart
const pre = new THREE.Vector3(); // velocity after this module's own push each step (the solver's change is a hit)
const fast = new THREE.Vector3(); // the velocity at the recent top speed: what a crash throws you with
const impact = { hit: 0, top: 0 };
const ray = { to: { x: 0, y: 0, z: 0 }, hit: rayHit() };

function readInput() {
  const k = input.keys;
  const steer = (k.has('KeyD') || k.has('ArrowRight') ? 1 : 0) - (k.has('KeyA') || k.has('ArrowLeft') ? 1 : 0);
  const fwd = (k.has('KeyW') || k.has('ArrowUp') ? 1 : 0) - (k.has('KeyS') || k.has('ArrowDown') ? 1 : 0);
  return { steer: clamp(steer + input.stickX, -1, 1), throttle: clamp(fwd - input.stickY, -1, 1) };
}

// ---------------------------------------------------------------- the vehicle model (every fixed step)
onPreStep(() => {
  if (S.mode === 'parked') return;
  const p = body.position,
    v = body.velocity;
  ray.to.x = p.x;
  ray.to.y = p.y - T.r - 0.3;
  ray.to.z = p.z;
  S.wasGrounded = S.grounded;
  S.grounded =
    raycastClosest(p, ray.to, { mask: GROUP.SCENERY | GROUP.CAVE, skipBackfaces: true }, ray.hit) &&
    ray.hit.distance < T.r + 0.12;
  if (S.grounded) n.set(ray.hit.hitNormalWorld.x, ray.hit.hitNormalWorld.y, ray.hit.hitNormalWorld.z);
  if (S.grounded && !S.wasGrounded) S.landKick = Math.max(S.landKick, -v.y);
  if (v.y < -MAX_FALL) v.y = -MAX_FALL;

  const ctl = S.seated ? readInput() : { steer: 0, throttle: 0 };
  S.steer += (ctl.steer - S.steer) * (1 - Math.exp(-FIXED * T.steerEase));
  let fx = -Math.sin(S.heading),
    fz = -Math.cos(S.heading);
  let vf = v.x * fx + v.z * fz;
  const speed = Math.abs(vf);
  S.drifting = S.seated && me.jumpHeld && S.grounded && speed > 4;
  const angle = S.steer * lerp(T.steerLow, T.steerHigh, clamp((speed - 4) / (T.steerFade - 4), 0, 1));
  S.wheel = -angle;

  if (S.grounded) {
    // bicycle model: turn rate = v·tan(wheel angle) / wheelbase; + steer is right, which lowers the heading
    let yaw = clamp((-vf * Math.tan(angle)) / T.wheelbase, -T.maxYaw, T.maxYaw);
    if (S.drifting) {
      yaw *= T.driftYaw;
      // the nose may swing out up to driftAngle from the direction of travel, no further
      const out = Math.atan2(
        Math.sin(S.heading - Math.atan2(-v.x, -v.z)),
        Math.cos(S.heading - Math.atan2(-v.x, -v.z)),
      );
      if (Math.abs(out) > T.driftAngle && Math.sign(yaw) === Math.sign(out)) yaw = 0;
    }
    S.yawRate = yaw;
    S.heading += yaw * FIXED;
    fx = -Math.sin(S.heading);
    fz = -Math.cos(S.heading);
    const rx = -fz,
      rz = fx;
    vf = v.x * fx + v.z * fz;
    const vl = v.x * rx + v.z * rz;
    // grip: the wheels cancel sideways speed up to a limit; past it you slide. Part of what they cancel carries on
    // forward (energy-wise), so turning keeps your speed.
    const lim = (S.drifting ? T.driftGrip : T.grip) * FIXED;
    const vl2 = vl + clamp(-vl, -lim, lim);
    const keep = T.keepSlide * (vl * vl - vl2 * vl2);
    vf = Math.sign(vf || 1) * Math.sqrt(vf * vf + keep);
    S.slip = vl2;
    // along: rolling resistance, drag, the handbrake, a kick-along push and the brake
    const sgn = Math.sign(vf);
    let a = -T.rolling * sgn - T.drag * vf * Math.abs(vf);
    if (S.drifting) a -= T.handbrake * sgn;
    if (!S.seated) a -= T.coastBrake * sgn;
    if (ctl.throttle > 0 && vf < T.pushMax) a += T.push * ctl.throttle;
    if (ctl.throttle < 0) a += vf > 0.3 ? T.brake * ctl.throttle : vf > -2 ? T.push * 0.5 * ctl.throttle : 0;
    const nvf = vf + a * FIXED;
    vf = ctl.throttle === 0 && Math.sign(nvf) !== sgn ? 0 : nvf; // friction stops you, never reverses you
    v.x = fx * vf + rx * vl2;
    v.z = fz * vf + rz * vl2;
  } else {
    S.yawRate = -S.steer * T.airYaw;
    S.heading += S.yawRate * FIXED;
    S.slip = 0;
    const h = Math.hypot(v.x, v.z);
    const k = 1 - T.drag * h * FIXED;
    v.x *= k;
    v.z *= k;
  }
  S.vf = vf;
  pre.set(v.x, v.y, v.z);
});

onPostStep(() => {
  if (S.mode === 'parked') return;
  const p = body.position,
    v = body.velocity;
  const g = groundHeight(p.x, p.z);
  if (p.y < g + T.r - 0.15) {
    teleport(body, p.x, g + T.r, p.z); // through the heightfield: back on top (physics.ts, catchFallThrough)
    if (v.y < 0) v.y = 0;
  }
  if (!S.seated) return;
  // What the solver took off this step is a hit (this module's own changes are in `pre`). Summed with a leak, so a
  // hit spread over a few steps (a glancing trunk) counts; judged against the speed you had just before.
  const was = Math.hypot(pre.x, pre.z);
  if (was >= impact.top) fast.copy(pre);
  impact.top = Math.max(was, impact.top * 0.92);
  impact.hit = impact.hit * 0.6 + Math.hypot(v.x - pre.x, v.z - pre.z);
  const up = v.y - pre.y;
  if (impact.top > T.crashMin && (impact.hit > T.crashDv || up > T.crashLand)) crash();
  else if (waterField.surfaceAt(p.x, p.z) > p.y + 0.2) getOut(false);
});

// ---------------------------------------------------------------- getting in and out
const runHud: RunHud = createRunHud();

function board() {
  if (!me.body || S.seated) return;
  S.seated = true;
  removeBody(me.body); // put on the seat each frame from now on
  if (S.mode === 'parked') {
    setMotion(body, 'dynamic', true, T.mass);
    body.velocity.set(0, 0, 0);
  }
  S.mode = 'driving';
  S.tumble = 0;
  S.camDist = cam.dist;
  cam.dist = 8.5;
  if (flat(body.position.x, body.position.z, START.x, START.z) < 4) runHud.ready();
  else runHud.off();
  sendPresence();
}

const left = new THREE.Vector3();
function getOut(thrown: boolean) {
  if (!S.seated || !me.body) return;
  S.seated = false;
  S.mode = 'loose';
  S.looseAt = performance.now();
  const p = body.position,
    v = body.velocity;
  left.set(-Math.cos(S.heading), 0, Math.sin(S.heading));
  const b = me.body;
  if (thrown) {
    teleport(b, p.x, p.y + 1.6, p.z);
    const side = (Math.random() < 0.5 ? -1 : 1) * 2.5; // tumble off to one side
    b.velocity.set(
      fast.x * T.throwKeep + left.x * side,
      Math.max(fast.y, 0) + T.throwUp,
      fast.z * T.throwKeep + left.z * side,
    );
    impact.hit = impact.top = 0;
    S.tumble = 1.3;
  } else {
    const x = p.x + left.x * 1.2,
      z = p.z + left.z * 1.2;
    teleport(b, x, Math.max(p.y, groundHeight(x, z) + PLAYER_R) + 0.4, z);
    b.velocity.set(v.x * 0.5, 2, v.z * 0.5);
  }
  addBody(b);
  cam.dist = S.camDist || 6.5;
  runHud.leave(thrown);
  sendPresence();
}

function crash() {
  const p = body.position;
  puff(p.x, p.y - T.r * 0.5, p.z, 26, 6, DUST, 0.2);
  for (let k = 0; k < 10; k++) spark(p.x, p.y, p.z, 7);
  getOut(true);
}

function park() {
  teleport(body, START.x, startY(), START.z);
  body.velocity.set(0, 0, 0);
  S.heading = START.h;
  S.steer = 0;
  S.slip = 0;
  S.vf = 0;
  n.set(0, 1, 0);
}

function backToTop() {
  const p = body.position;
  puff(p.x, p.y, p.z, 12, 3, DUST, 0.15);
  park();
  puff(START.x, startY(), START.z, 12, 3, DUST, 0.15);
  if (S.seated) runHud.ready();
  else {
    setMotion(body, 'kinematic', true);
    S.mode = 'parked';
  }
}

// One button: get in near the cart; seated, get out, or (stopped away from the top) ride back up.
const promptAt = new THREE.Vector3();
registerInteractable(() => {
  if (!me.body) return [];
  const p = body.interpolatedPosition;
  if (S.seated) {
    const slow = Math.hypot(body.velocity.x, body.velocity.z) < 1.5;
    const away = flat(p.x, p.z, START.x, START.z) > 4;
    const top = slow && away;
    promptAt.set(p.x, p.y + 1.9, p.z);
    return [
      {
        id: top ? 'soapbox-top' : 'soapbox-out',
        verb: top ? 'Back to the top' : 'Get out',
        at: promptAt,
        run: top ? backToTop : () => getOut(false),
      },
    ];
  }
  const mp = me.body.interpolatedPosition;
  if (Math.hypot(mp.x - p.x, mp.y - p.y, mp.z - p.z) > 2.6) return [];
  promptAt.set(p.x, p.y + 1.2, p.z);
  return [{ id: 'soapbox-in', verb: 'Get in', at: promptAt, r: 0.8, run: board }];
});

onStart(() => {
  // Clicking (to grab the mouse) with empty hands would get you out: seated, an empty-handed click does nothing.
  wrapAction('use', { down: (next) => (S.seated && !heldId() ? undefined : next()) });
  describeControl('soapbox-steer', {
    label: 'Steer the cart; forward kicks off, back brakes',
    keys: [
      ['KeyW', 'KeyA', 'KeyS', 'KeyD'],
      ['ArrowUp', 'ArrowLeft', 'ArrowDown', 'ArrowRight'],
    ],
    pad: 'ls',
    touch: 'Drag on the left',
    group: 'move',
    order: 10,
    context: 'driving',
  });
  describeControl('soapbox-drift', {
    label: 'Handbrake drift; stopped, hop out',
    keys: ['Space'],
    pad: 'a',
    touch: 'Jump',
    group: 'move',
    order: 11,
    context: 'driving',
  });
});

// ---------------------------------------------------------------- the cart's pose (shared by the mesh and the seat)
const UP = new THREE.Vector3(0, 1, 0);
const pose = { p: new THREE.Vector3(), q: new THREE.Quaternion() };
const nView = new THREE.Vector3(0, 1, 0);
const qa = new THREE.Quaternion(),
  qb = new THREE.Quaternion(),
  eul = new THREE.Euler(0, 0, 0, 'YXZ');
const spring = { y: 0, vy: 0, roll: 0, pitch: 0 };
let lastVf = 0;
function updatePose(dt: number) {
  const ip = body.interpolatedPosition;
  nView.lerp(S.grounded || S.mode === 'parked' ? n : UP, 1 - Math.exp(-dt * 10)).normalize();
  // suspension: a spring kicked by landings, so bumps read
  if (S.landKick > 0) {
    spring.vy -= Math.min(S.landKick, 14) * 0.35;
    S.landKick = 0;
  }
  spring.vy += (-180 * spring.y - 12 * spring.vy) * dt;
  spring.y = clamp(spring.y + spring.vy * dt, -0.2, 0.2);
  // body roll out of a turn and pitch on braking: slapstick, not truth
  const lat = S.vf * S.yawRate;
  const acc = dt > 0 ? (S.vf - lastVf) / dt : 0;
  lastVf = S.vf;
  const e = 1 - Math.exp(-dt * 8);
  spring.roll += (clamp(lat * 0.014 + S.slip * 0.03, -0.3, 0.3) - spring.roll) * e;
  spring.pitch += (clamp(-acc * 0.012, -0.15, 0.15) - spring.pitch) * e;
  qa.setFromUnitVectors(UP, nView);
  qb.setFromAxisAngle(UP, S.heading);
  pose.q.copy(qa).multiply(qb);
  eul.set(spring.pitch, 0, spring.roll);
  pose.q.multiply(qb.setFromEuler(eul));
  pose.p.set(ip.x, ip.y, ip.z).addScaledVector(nView, -(T.r - WHEEL_R) + spring.y);
}
const toWorld = (out: THREE.Vector3, x: number, y: number, z: number) =>
  out.set(x, y, z).applyQuaternion(pose.q).add(pose.p);

// ---------------------------------------------------------------- dust and sparks (the shared particle pool)
const DUST = new THREE.Color(0xd9c49a);
const SPARK = new THREE.Color(0xffb02e);
const HOT = new THREE.Color(0xfff1a8);
function puff(x: number, y: number, z: number, count: number, spread: number, color: THREE.Color, size: number) {
  if (reducedMotion) return;
  for (let k = 0; k < count; k++)
    emit({
      x,
      y,
      z,
      vx: (Math.random() - 0.5) * spread,
      vy: 0.5 + Math.random() * 1.5,
      vz: (Math.random() - 0.5) * spread,
      life: 0.4 + Math.random() * 0.4,
      size,
      alpha: 0.8,
      color,
      gravity: 4,
      drag: 1.5,
      grow: [1, 2.2],
      fade: 0.5,
    });
}
function spark(x: number, y: number, z: number, speed: number) {
  if (reducedMotion) return;
  emit({
    x,
    y,
    z,
    vx: (Math.random() - 0.5) * speed,
    vy: 1.5 + Math.random() * speed * 0.5,
    vz: (Math.random() - 0.5) * speed,
    life: 0.2 + Math.random() * 0.25,
    size: 0.07,
    color: Math.random() < 0.4 ? HOT : SPARK,
    gravity: 14,
    shrink: 0.5,
  });
}
const wp = new THREE.Vector3();
function wheelFx(dt: number) {
  const v = body.velocity;
  const speed = Math.hypot(v.x, v.z);
  if (!S.grounded) return;
  for (const side of [-1, 1]) {
    toWorld(wp, side * TRACK, -WHEEL_R * 0.8, AXLE_Z);
    if (speed > 3 && Math.random() < dt * speed * 1.6)
      emit({
        x: wp.x,
        y: wp.y,
        z: wp.z,
        vx: -v.x * 0.15 + (Math.random() - 0.5),
        vy: 0.4 + Math.random() * 0.8,
        vz: -v.z * 0.15 + (Math.random() - 0.5),
        life: 0.5 + Math.random() * 0.4,
        size: 0.14,
        alpha: 0.7,
        color: DUST,
        gravity: 2,
        drag: 2,
        grow: [1, 2.5],
        fade: 0.6,
      });
    if ((S.drifting || Math.abs(S.slip) > 3) && Math.abs(S.slip) > 1.5)
      for (let k = 0; k < 2; k++) if (Math.random() < dt * 40) spark(wp.x, wp.y + 0.05, wp.z, 4);
  }
}

// ---------------------------------------------------------------- frame: seat, run, camera
const seat = new THREE.Vector3();
const baseFov = camera.fov;
onFrame(
  ({ dt, now }) => {
    if (S.seated && (!me.entered || !me.body)) S.seated = false;
    if (S.mode === 'loose' && now - S.looseAt > T.returnAfter * 1000) backToTop();
    updatePose(dt);
    if (S.seated && me.body) {
      toWorld(seat, 0, SEAT.y, SEAT.z);
      teleport(me.body, seat.x, seat.y, seat.z);
      me.body.velocity.set(0, 0, 0);
      me.yaw = S.heading;
      me.coyote = 0.1;
      // hop out once stopped; moving, the same button is the handbrake
      const v = body.velocity;
      const speed = Math.hypot(v.x, v.z);
      if (me.jumpQueued > 0 && speed < 1) {
        me.jumpQueued = 0;
        getOut(false);
      }
      if (S.seated) {
        // the camera swings in behind where the cart is going (velocity when fast, so a drift shows from outside)
        const travel = speed > 3 ? Math.atan2(-v.x, -v.z) : S.heading;
        cam.yaw = angleLerp(cam.yaw, travel, 1 - Math.exp(-dt * 3.2));
        cam.pitch = lerp(cam.pitch, -0.33, 1 - Math.exp(-dt * 2));
        runHud.tick(body.position.x, body.position.z, physicsTime());
      }
      wheelFx(dt);
    }
    if (S.tumble > 0) S.tumble -= dt;
  },
  { phase: 'world', order: 10 },
);

// The run: from the start circle to the line at the path's foot. Lives in run-hud.ts; told where the cart is here.
runHud.configure({
  started: (x, z) => flat(x, z, TOWER.x, TOWER.z) > START_R,
  finished: (px, pz, x, z) => {
    // crossed the finish line (perpendicular to the path's second leg) this frame, within its width
    const along = (ax: number, az: number) => (ax - FINISH.x) * D2.x + (az - FINISH.z) * D2.z;
    const across = Math.abs((x - FINISH.x) * D2.z - (z - FINISH.z) * D2.x);
    return along(px, pz) < 0 && along(x, z) >= 0 && across < FINISH.half;
  },
});

// ---------------------------------------------------------------- meshes: my cart, gates, remote carts
const mine = makeCart();
scene.add(mine);
const lastP = new THREE.Vector3().copy(body.position);
onFrame(
  ({ dt }) => {
    mine.position.copy(pose.p);
    mine.quaternion.copy(pose.q);
    const ip = body.interpolatedPosition;
    const d = Math.hypot(ip.x - lastP.x, ip.z - lastP.z) * Math.sign(S.vf || 1);
    lastP.set(ip.x, ip.y, ip.z);
    S.wheel = S.mode === 'parked' ? 0 : S.wheel;
    poseCart(mine, S.wheel, d);
    // thrown out: a flip on the way, after feel.ts's spring (order 20) has set the lean
    if (S.tumble > 0 && me.avatar) {
      S.tumbleAngle += dt * 13;
      me.avatar.rotation.x += S.tumbleAngle;
    } else S.tumbleAngle = 0;
    // a little more field of view with speed
    const v = body.velocity;
    const want = S.seated ? baseFov + clamp((Math.hypot(v.x, v.z) - 6) * 0.6, 0, 9) : baseFov;
    if (Math.abs(camera.fov - want) > 0.05) {
      camera.fov = lerp(camera.fov, want, 1 - Math.exp(-dt * 4));
      camera.updateProjectionMatrix();
    }
  },
  { phase: 'update', order: 25 },
);

function gate(x: number, z: number, h: number, color: string) {
  const g = new THREE.Group();
  const post = new THREE.MeshStandardMaterial({ color: '#8a6a45', roughness: 0.9 });
  const flag = new THREE.MeshStandardMaterial({ color, roughness: 0.7 });
  const postGeo = new THREE.BoxGeometry(0.16, 2.6, 0.16);
  const w = 5.2;
  for (const s of [-1, 1]) {
    const m = new THREE.Mesh(postGeo, post);
    const px = x + Math.cos(h) * s * (w / 2),
      pz = z - Math.sin(h) * s * (w / 2);
    m.position.set(px, groundHeight(px, pz) + 1.2, pz);
    m.castShadow = true;
    g.add(m);
  }
  const banner = new THREE.Mesh(new THREE.BoxGeometry(w, 0.42, 0.06), flag);
  banner.position.set(
    x,
    Math.max(
      groundHeight(x, z),
      ...[-1, 1].map((s) => groundHeight(x + Math.cos(h) * s * 2.6, z - Math.sin(h) * s * 2.6)),
    ) + 2.45,
    z,
  );
  banner.rotation.y = h;
  banner.castShadow = true;
  g.add(banner);
  scene.add(g);
}
gate(TOWER.x + D1.x * START_R, TOWER.z + D1.z * START_R, START.h, '#f4f1e6');
gate(FINISH.x, FINISH.z, FINISH.h, '#e2483d');

// Owner sync: the cart you sit in, as [x, y, z, qx, qy, qz, qw, front wheel angle, speed]. Null when you are not in
// it (an empty cart is local only: it rolls back to the top by itself).
type Wire = number[];
type Snap = { w: Wire };
addPresenceField('soapbox', (): Wire | null => {
  if (!S.seated) return null;
  const { p, q } = pose;
  const v = body.velocity;
  return [
    r2(p.x),
    r2(p.y),
    r2(p.z),
    r3(q.x),
    r3(q.y),
    r3(q.z),
    r3(q.w),
    r2(S.wheel),
    r2(Math.hypot(v.x, v.z) * Math.sign(S.vf || 1)),
  ];
});
type Theirs = { snaps: ReturnType<typeof createSnaps<Snap>>; mesh: ReturnType<typeof makeCart> | null };
const theirs = new Map<string, Theirs>();
onRemotePresence((r, pr, time) => {
  const w = pr.soapbox;
  let t = theirs.get(r.peer);
  if (!finiteArr(w, 9)) {
    t?.snaps.clear();
    return;
  }
  if (!t) theirs.set(r.peer, (t = { snaps: createSnaps<Snap>(), mesh: null }));
  t.snaps.push(time, { w });
});
const tq = new THREE.Quaternion(),
  tq2 = new THREE.Quaternion();
onFrame(
  ({ dt, now }) => {
    for (const [peer, t] of theirs) {
      if (!remotes.has(peer)) {
        if (t.mesh) scene.remove(t.mesh);
        theirs.delete(peer);
        continue;
      }
      const s = t.snaps.length ? t.snaps.sample(now - INTERP_MS) : null;
      if (!s) {
        if (t.mesh) t.mesh.visible = false;
        continue;
      }
      if (!t.mesh) scene.add((t.mesh = makeCart()));
      const { a, b, u } = s;
      const A = a.w,
        B = b.w;
      t.mesh.visible = true;
      t.mesh.position.set(lerp(A[0], B[0], u), lerp(A[1], B[1], u), lerp(A[2], B[2], u));
      tq.set(A[3], A[4], A[5], A[6]).normalize();
      tq2.set(B[3], B[4], B[5], B[6]).normalize();
      t.mesh.quaternion.slerpQuaternions(tq, tq2, u);
      poseCart(t.mesh, lerp(A[7], B[7], u), B[8] * dt);
    }
  },
  { phase: 'update', order: 26 },
);

// Console and scripted runs (dev/look/evals/soapbox-*.js): the tuning, the state, and a teleport to the start.
window.__soapbox = {
  T,
  S,
  body,
  START,
  FINISH,
  board,
  getOut,
  backToTop,
  get run() {
    return runHud.state;
  },
};

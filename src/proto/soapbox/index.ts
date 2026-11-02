// Prototype: the soapbox cart (?proto=soapbox; docs/game-design/soapbox.md, docs/plans/find-the-fun.md step 5).
// Asks "is driving a vehicle fun?" with feel only: no rewards. Serves DESIGN.md 1 (toys before chores), with 2 and 10.
//
// The cart drives like an RC car (research/vehicle-feel.md, "RC cars"): a motor on analog throttle (RT, W, stick
// forward), brake and reverse (LT, S, stick back), and a sprung body you can see work. The physics is one body: a
// frictionless sphere with grip, steering, motor and drag added by hand each fixed step (vehicles.md rule 1: fake the
// stability, keep the physics), so it cannot flip and stall the run. On top, a raycast suspension: a ray per wheel finds
// the ground, a spring-damper per wheel holds up a chassis that heaves, pitches and rolls with the cart's own
// accelerations (body roll in a turn, squat on throttle, dive on the brake, a squash on landing), and the wheels follow
// the ground on their own. Throttle in the air lifts the nose, brake drops it (real RC jumping). Owner kind: the driver
// publishes the pose as presence `soapbox` and the ride as `soapboxRide`; everyone else smooths them with createSnaps.
//
// Seated, your own body leaves the physics world and is put on the seat each frame, so the camera, your avatar and
// your presence follow the cart. A hard hit throws you out.
//
// Silent for now: the rumble, rattle, wind, drift ticks, boost and crash sounds were cut in the sound audit
// (2026-11-02); better ones come later.
import * as THREE from 'three/webgpu';
import { FIXED, GRAVITY, INTERP_MS, PLAYER_R, reducedMotion } from '../../constants.ts';
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
import { canopies, type Sphere } from '../../render/props.ts';
import { me, cam, camConstraints, camForward } from '../../player/player.ts';
import { input, setSeated } from '../../player/input.ts';
import { registerInteractable } from '../../player/hands.ts';
import { heldId } from '../../player/inventory.ts';
import { describeControl, wrapAction } from '../../player/controls.ts';
import { remotes, addPresenceField, onRemotePresence, sendPresence } from '../../netplay/net.ts';
import { createSnaps } from '../../netplay/snaps.ts';
import { onFrame, onStart } from '../../loop.ts';
import {
  makeCart,
  poseCart,
  chassisPoint,
  SEAT,
  TRACK,
  AXLE_Z,
  WHEEL_R,
  MOUNT_Y,
  WHEELS,
  type Ride,
} from './cart-mesh.ts';
import { createRunHud, type RunHud } from './run-hud.ts';
import { createGhost } from './ghost.ts';
import { protoMark, protoActivity } from '../mark.ts';
import { LINE, START, START_GO, FINISH, crossedFinish, buildMarkers } from './course.ts';
import { onVariant, protoV } from '../flags.ts';

// ---------------------------------------------------------------- tuning (window.__soapbox.T in the console)
const T = {
  mass: 120, // kg: bulldozes the ball (0.6) and players (70)
  r: 0.5, // m: the rolling sphere under the cart
  motor: 12, // m/s² of drive at full throttle from a standstill, falling to nothing at `top`
  top: 13, // m/s: the motor's top speed (the hill can take you past it)
  reverse: 5, // m/s: backing up, at 0.6x the motor
  brake: 16, // m/s²: full brake (enough to hold the cart on the massif's steep face)
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
  crashDv: 9, // m/s of speed knocked off by hits within a few steps (a leaky sum) that throws you out
  crashLand: 15, // m/s of upward change in one step (a landing) that throws you out
  crashMin: 6, // m/s: slower than this nothing throws you
  throwUp: 11, // m/s up when thrown
  throwKeep: 0.55, // share of the cart's speed you keep when thrown (over whatever you hit, not into it)
  returnAfter: 2, // s an empty cart waits before it rolls itself back to the top
  // grip as a curve of slip ratio |vl| / (|vl| + |vf|) (vehicle-feel.md 2, Rocket League): full up to slipFull, down
  // to slipLoose x grip at slipLet and flat after; times a slope term, slopeGrip x at n.y 0.8 (1 from 0.95). The
  // research's first guesses (0.15, 0.55, 0.7) let a landing on the massif's face snowball into a slide you could not
  // steer out of (braking raised the ratio further); these let go later and less.
  slipFull: 0.25,
  slipLet: 0.5,
  slipLoose: 0.65,
  slopeGrip: 0.85,
  // drift charge (vehicle-feel.md 3, Mario Kart's counter scaled to a short run): per fixed step drifting, chargeInto
  // with the stick held hard into the slide, chargeOut otherwise. Tiers: sparks, ready (a boost), big (a bigger one).
  // Released by letting go of the handbrake, whenever: no timing window.
  chargeInto: 5,
  chargeOut: 2,
  chargeSparks: 60, // 0.2 s at best
  chargeReady: 120, // 0.4 s
  chargeBig: 240, // 0.8 s
  boostReady: 3, // m/s forward, spread over boostReadyS (as acceleration: drag takes it back)
  boostReadyS: 0.35,
  boostBig: 5, // m/s over boostBigS
  boostBigS: 0.6,
  boostScale: 0.75, // x both boosts: the others get a milder one, drift the full
  // the chase camera (vehicle-feel.md 4)
  camDist: 8.5, // m behind, nearly fixed
  camPull: 0.5, // m more at speed, at most
  lookAhead: 0.3, // s of velocity the camera aims ahead of the cart
  lookAheadMax: 4, // m
  camLead: 0.25, // rad of yaw toward the way you steer
  camLeadS: 0.3, // s to fade it in
  fovPerMs: 0.6, // degrees per m/s over 6 m/s
  fovMax: 12, // degrees over the base, speed and boost kick together
  // trauma shake (vehicle-feel.md 4, Eiserloh): shake = trauma², rotational only, from smooth noise
  traumaLand: 0.25, // a landing from over 6 m/s of fall
  traumaCrash: 0.6,
  traumaDecay: 1.5, // per second
  hitStop: 70, // ms the crash frame holds before you fly (vehicle-feel.md 6)
  // the suspension (vehicle-feel.md, RC cars 1-3; per wheel, per unit of the chassis' mass): spring k (1/s²) and damper
  // c (1/s), how far a wheel hangs below its rest height, and how hard the cart's accelerations throw the body
  springK: 30, // 4 springs: about 1.7 Hz bounce, 15 cm of sag
  springC: 2.2, // damping ratio about 0.4: one or two visible overshoots
  droop: 0.2, // m a wheel hangs below rest unloaded (over the sag: a rolled body keeps its inside wheels down)
  rollGain: 1.5, // rad/s² of roll per m/s² of sideways grip (about 9° in a hard turn, 13° at the grip limit)
  pitchGain: 2, // rad/s² of pitch per m/s² of speeding up or slowing down (squat and dive)
  jolt: 0.6, // share of the frame's sudden vertical speed changes (landings, dips) the body takes
  landMax: 5, // m/s: the most of one jolt
  contactGrip: 0.55, // x grip with no wheel on the ground (a bounce after a landing is briefly loose)
  airPitch: 3.5, // rad/s² of nose-up from full throttle in the air (brake: nose down)
  airDamp: 2.5, // 1/s: the air rotation's damping, so it never tumbles (Re-Volt's angular air resistance)
};
// Handling variants for comparing in one sitting, each changing one thing: &v=bouncy (soft, long-travel springs: big
// roll and bounce), &v=tight (stiff, short springs and more grip) and &v=drift (a loose rear, long drifts, the full
// drift boost). No &v: the tuning above. All of them charge drifts the same way.
const VARIANTS: Record<string, Partial<typeof T>> = {
  bouncy: { springK: 16, springC: 0.9, droop: 0.34, landMax: 7 },
  tight: { springK: 70, springC: 5, droop: 0.09, landMax: 4, grip: 46, driftGrip: 9, contactGrip: 0.8 },
  drift: {
    grip: 32,
    driftGrip: 3,
    driftYaw: 1.7,
    driftAngle: 1.35,
    keepSlide: 0.75,
    handbrake: 1.0,
    slipLoose: 0.8, // loose under the handbrake, not on the face: its grip lets go less than the default's
    boostScale: 1,
  },
};
// They switch live from the prototype bar (src/proto/flags.ts): back to the tuning above, then the variant's changes.
const BASE = { ...T };
const handling = (v: string) => Object.assign(T, BASE, VARIANTS[v] ?? {});
handling(protoV('soapbox'));
onVariant('soapbox', ['', 'bouncy', 'tight', 'drift'], handling);
const MAX_FALL = 22; // m/s, as physics.ts: no continuous collision against the heightfield

// ---------------------------------------------------------------- the route
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
  charge: 0, // drift charge (T.chargeInto / chargeOut per step)
  driftDir: 0, // the side this drift slides to (-1 left, 1 right), set by the first steer in it; 0 until then
  tier: 0, // 0 none, 1 sparks, 2 ready, 3 big: what letting go would give now
  boostLeft: 0, // s left of the boost's push
  boostAcc: 0, // m/s² of it
  boosted: 0, // the boost just fired (2 ready, 3 big), for its burst and FOV kick (cleared by the frame hook)
  boostTier: 2, // the boost running now, for its jet's colour
  fall: 0, // m/s: fastest fall since leaving the ground
  hold: 0, // performance.now() a crash's hit-stop ends (0: none)
  watchUntil: 0, // thrown: the camera stays on you until then
  againUntil: 0, // after a wipeout, Interact takes you back to the top until then
  tumble: 0, // s left of the thrown-out spin
  tumbleAngle: 0,
  throttle: 0, // -1..1: this step's drive (+) or brake / reverse (-), for the air pitch
  aLong: 0, // m/s²: how fast the cart is speeding up along its heading (smoothed), for squat and dive
  aLat: 0, // m/s²: the wheels' sideways grip (+ toward the right; smoothed), for body roll
  contact: 1, // 0..1: share of the wheels on the ground (eased), from the suspension
  camDist: 0, // the zoom you had before you got in
};
protoActivity(() => (S.seated ? 'driving' : null)); // for the playtest trace
let trauma = 0; // camera shake, 0..1 (shake = trauma²)
const addTrauma = (t: number) => (trauma = Math.min(1, trauma + t));
const n = new THREE.Vector3(0, 1, 0); // ground normal under the cart
const pre = new THREE.Vector3(); // velocity after this module's own push each step (the solver's change is a hit)
const fast = new THREE.Vector3(); // the velocity at the recent top speed: what a crash throws you with
const impact = { hit: 0, top: 0 };
const ray = { to: { x: 0, y: 0, z: 0 }, hit: rayHit() };

// A stick pulled back brakes only past this share of its travel (a bowtie dead zone, research/cross-device-input.md
// rec 7): a thumb that drifts down while steering does not stop the cart. Steering keeps the stick's own small one.
const BRAKE_DEAD = 0.35;
// Throttle is the most of W, the stick pushed forward and RT; brake (and reverse) the most of S, the stick pulled
// back and LT (vehicle-feel.md, RC cars 4: analog triggers). Both held: they cancel.
function readInput() {
  const k = input.keys;
  const steer = (k.has('KeyD') || k.has('ArrowRight') ? 1 : 0) - (k.has('KeyA') || k.has('ArrowLeft') ? 1 : 0);
  const sy = input.stickY > 0 ? Math.max(0, input.stickY - BRAKE_DEAD) / (1 - BRAKE_DEAD) : input.stickY;
  const gas = Math.max(k.has('KeyW') || k.has('ArrowUp') ? 1 : 0, -Math.min(0, sy), input.triggerR);
  const brake = Math.max(k.has('KeyS') || k.has('ArrowDown') ? 1 : 0, Math.max(0, sy), input.triggerL);
  return { steer: clamp(steer + input.stickX, -1, 1), throttle: clamp(gas - brake, -1, 1) };
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
  if (!S.grounded) S.fall = Math.max(S.fall, -v.y);
  else if (!S.wasGrounded) {
    const fall = Math.max(S.fall, -v.y);
    if (fall > 6 && S.seated) addTrauma(T.traumaLand);
    S.fall = 0;
  }
  if (v.y < -MAX_FALL) v.y = -MAX_FALL;

  const ctl = S.seated ? readInput() : { steer: 0, throttle: 0 };
  S.throttle = ctl.throttle;
  S.steer += (ctl.steer - S.steer) * (1 - Math.exp(-FIXED * T.steerEase));
  let fx = -Math.sin(S.heading),
    fz = -Math.cos(S.heading);
  let vf = v.x * fx + v.z * fz;
  const speed = Math.abs(vf);
  // The handbrake held: a drift on the ground, kept (not charging) over a bump. Letting go fires what it charged.
  const held = S.seated && me.jumpHeld && Math.hypot(v.x, v.z) > 4 && !S.hold;
  S.drifting = held && S.grounded;
  if (S.drifting) {
    if (!S.driftDir && Math.abs(S.steer) > 0.2) S.driftDir = Math.sign(S.steer);
    S.charge += S.driftDir && S.steer * S.driftDir >= 0.7 ? T.chargeInto : T.chargeOut;
    const tier = S.charge >= T.chargeBig ? 3 : S.charge >= T.chargeReady ? 2 : S.charge >= T.chargeSparks ? 1 : 0;
    S.tier = tier;
  } else if (!held && S.charge > 0) {
    if (S.tier >= 2) {
      const big = S.tier === 3;
      const dur = big ? T.boostBigS : T.boostReadyS;
      S.boostLeft = dur;
      S.boostAcc = ((big ? T.boostBig : T.boostReady) * T.boostScale) / dur;
      S.boosted = S.tier;
    }
    S.charge = S.tier = S.driftDir = 0;
  }
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
    // ... and the limit falls once you are properly sideways (not under the handbrake), and on a steep slope
    const ratio = Math.abs(vl) / (Math.abs(vl) + Math.abs(vf) + 1e-6);
    const slide = lerp(1, T.slipLoose, clamp((ratio - T.slipFull) / (T.slipLet - T.slipFull), 0, 1));
    const slope = lerp(T.slopeGrip, 1, clamp((n.y - 0.8) / 0.15, 0, 1));
    const touch = lerp(T.contactGrip, 1, S.contact); // fewer wheels down (a bounce), less grip
    const lim = (S.drifting ? T.driftGrip : T.grip * slide) * slope * touch * FIXED; // the handbrake has its own grip
    const vl2 = vl + clamp(-vl, -lim, lim);
    S.aLat += (clamp((vl2 - vl) / FIXED, -25, 25) - S.aLat) * (1 - Math.exp(-FIXED * 14));
    const keep = T.keepSlide * (vl * vl - vl2 * vl2);
    vf = Math.sign(vf || 1) * Math.sqrt(vf * vf + keep);
    S.slip = vl2;
    // along: rolling resistance, drag, the handbrake, a kick-along push and the brake
    const sgn = Math.sign(vf);
    let a = -T.rolling * sgn - T.drag * vf * Math.abs(vf);
    if (S.drifting) a -= T.handbrake * sgn;
    if (!S.seated || runHud.state.state === 'done') a -= T.coastBrake * 2 * sgn; // empty, or past the finish: stop
    // the motor: strong off the line, nothing left at its top speed; the brake, then reverse from a crawl
    if (ctl.throttle > 0) a += T.motor * ctl.throttle * clamp(1 - vf / T.top, 0, 1);
    if (ctl.throttle < 0) a += vf > 0.3 ? T.brake * ctl.throttle : vf > -T.reverse ? T.motor * 0.6 * ctl.throttle : 0;
    const nvf = vf + a * FIXED;
    vf = ctl.throttle === 0 && Math.sign(nvf) !== sgn ? 0 : nvf; // friction stops you, never reverses you
    if (S.boostLeft > 0) vf += S.boostAcc * FIXED * (sgn || 1);
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
  S.boostLeft = Math.max(0, S.boostLeft - FIXED);
  // squat and dive: how fast the forward speed changed over the step (the hill, the motor, the brake, a hit)
  const along = S.grounded ? clamp((vf - S.vf) / FIXED, -30, 30) : 0;
  S.aLong += (along - S.aLong) * (1 - Math.exp(-FIXED * 10));
  if (!S.grounded) S.aLat *= 1 - FIXED * 8;
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
  if (!S.seated || S.hold) return;
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
  setSeated(true, 'Drift / Brake');
  removeBody(me.body); // put on the seat each frame from now on
  if (S.mode === 'parked') {
    setMotion(body, 'dynamic', true, T.mass);
    body.velocity.set(0, 0, 0);
  }
  S.mode = 'driving';
  S.tumble = 0;
  if (!S.watchUntil) S.camDist = cam.dist; // still watching your own wipeout: keep the zoom from before it
  S.watchUntil = S.againUntil = 0;
  cam.dist = T.camDist;
  if (flat(body.position.x, body.position.z, START.x, START.z) < 4) runHud.ready();
  else runHud.off();
  sendPresence();
}

const left = new THREE.Vector3();
function getOut(thrown: boolean) {
  if (!S.seated || !me.body) return;
  S.seated = false;
  setSeated(false);
  S.mode = 'loose';
  S.looseAt = performance.now();
  const p = body.position,
    v = body.velocity;
  left.set(-Math.cos(S.heading), 0, Math.sin(S.heading));
  const b = me.body;
  if (thrown) {
    teleport(b, pose.p.x, pose.p.y + 1.6, pose.p.z); // from where the hit-stop held you
    const side = (Math.random() < 0.5 ? -1 : 1) * 2.5; // tumble off to one side
    b.velocity.set(
      fast.x * T.throwKeep + left.x * side,
      Math.max(fast.y, 0) + T.throwUp,
      fast.z * T.throwKeep + left.z * side,
    );
    impact.hit = impact.top = 0;
    S.tumble = 1.3;
    S.watchUntil = performance.now() + 2400;
    S.againUntil = performance.now() + 20000;
  } else {
    const x = p.x + left.x * 1.2,
      z = p.z + left.z * 1.2;
    teleport(b, x, Math.max(p.y, groundHeight(x, z) + PLAYER_R) + 0.4, z);
    b.velocity.set(v.x * 0.5, 2, v.z * 0.5);
  }
  addBody(b);
  if (!thrown) cam.dist = S.camDist || 6.5; // thrown: after the camera has watched you land
  runHud.leave(thrown);
  sendPresence();
}

// A crash is a show (vehicle-feel.md 6): the frame holds for T.hitStop ms (the cart, you on it and the camera; the
// physics runs on), a wheel pops off, planks splinter, then you fly. The frame hook throws you when the hold ends.
function crash() {
  if (S.hold) return;
  S.hold = performance.now() + T.hitStop;
  protoMark('crash');
  addTrauma(T.traumaCrash);
  const p = pose.p;
  puff(p.x, p.y, p.z, 26, 6, DUST, 0.2);
  for (let k = 0; k < 10; k++) spark(p.x, p.y + 0.3, p.z, 7);
  for (let k = 0; k < 14; k++) splinter(p.x, p.y + 0.4, p.z);
  popWheel();
}

function park() {
  fixWheel();
  teleport(body, START.x, startY(), START.z);
  body.velocity.set(0, 0, 0);
  S.heading = START.h;
  S.steer = 0;
  S.slip = 0;
  S.vf = 0;
  S.aLong = S.aLat = 0;
  n.set(0, 1, 0);
  air.pitch = air.v = 0;
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

function again() {
  if (!me.body || S.seated) return;
  backToTop();
  teleport(me.body, START.x + 1.5, startY() + 0.5, START.z);
  board();
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
  // after a wipeout, once you have landed: straight back to the top in the cart, no walk up the hill
  if (S.againUntil > performance.now() && S.tumble <= 0 && !S.hold) {
    promptAt.set(mp.x, mp.y + 1.9, mp.z);
    return [{ id: 'soapbox-again', verb: 'Back to the top', at: promptAt, run: again }];
  }
  if (Math.hypot(mp.x - p.x, mp.y - p.y, mp.z - p.z) > 2.6) return [];
  promptAt.set(p.x, p.y + 1.2, p.z);
  return [{ id: 'soapbox-in', verb: 'Get in', at: promptAt, r: 0.8, run: board }];
});

onStart(() => {
  // Clicking (to grab the mouse) with empty hands would get you out: seated, an empty-handed click does nothing.
  wrapAction('use', { down: (next) => (S.seated && !heldId() ? undefined : next()) });
  // RT and LT are the throttle and brake while seated (vehicle-feel.md, RC cars 4), read as analog values from
  // input.triggerR / triggerL; their own actions (Bump, the guest's crouch) wait until you get out.
  wrapAction('bump', { down: (next) => (S.seated ? undefined : next()) });
  wrapAction('guest-crouch', { down: (next) => (S.seated ? undefined : next()) });
  describeControl('soapbox-steer', {
    label: 'Steer the cart',
    keys: [
      ['KeyA', 'KeyD'],
      ['ArrowLeft', 'ArrowRight'],
    ],
    pad: 'ls',
    touch: 'Drag left and right',
    group: 'move',
    order: 10,
    context: 'driving',
  });
  describeControl('soapbox-gas', {
    label: 'Throttle (in the air: nose up)',
    detail: { pad: 'Squeeze for more' },
    keys: ['KeyW', 'ArrowUp'],
    pad: 'rt',
    touch: 'Drag up',
    group: 'move',
    order: 10.1,
    context: 'driving',
  });
  describeControl('soapbox-brake', {
    label: 'Brake, then reverse (in the air: nose down)',
    keys: ['KeyS', 'ArrowDown'],
    pad: 'lt',
    touch: 'Drag down',
    group: 'move',
    order: 10.2,
    context: 'driving',
  });
  describeControl('soapbox-drift', {
    label: 'Handbrake drift; stopped, hop out',
    keys: ['Space'],
    pad: 'a',
    touch: 'Drift / Brake',
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
// The frame (`pose`): on the ground under the sphere, facing the heading, tilted to the ground (and pitched by the
// throttle in the air). The chassis (`chassis`) rides on it: `ride` is its heave, pitch and roll from rest.
const chassis = { p: new THREE.Vector3(), q: new THREE.Quaternion() };
const ride: Ride = { heave: 0, pitch: 0, roll: 0 };
const rideV: Ride = { heave: 0, pitch: 0, roll: 0 };
const drops = [0, 0, 0, 0]; // each wheel centre's height in the frame (0 at rest)
const groundAt = [0, 0, 0, 0]; // the height each wheel centre would sit at on the ground below it (-9: nothing)
const lastLen = [0, 0, 0, 0];
const air = { pitch: 0, v: 0 }; // the nose's angle in the air from the throttle, and its rate
let lastVy = 0;
const I_PITCH = AXLE_Z * AXLE_Z * 0.7, // the chassis' moments of inertia per unit mass (the weight sits inboard)
  I_ROLL = TRACK * TRACK * 0.7;
const STOP = 0.06; // m: the bump stop, the shortest a strut gets
const LIMITS: [keyof Ride, number][] = [
  ['heave', 0.35],
  ['pitch', 0.4],
  ['roll', 0.32],
];
const wRay = { from: new THREE.Vector3(), to: new THREE.Vector3(), hit: rayHit() };

// A ray per wheel, straight down the frame from above its mount: where the ground is under each wheel.
function probeGround() {
  for (let i = 0; i < 4; i++) {
    const [x, z] = WHEELS[i];
    toWorld(wRay.from, x, 1.2, z);
    toWorld(wRay.to, x, -1.6, z);
    const hit = raycastClosest(wRay.from, wRay.to, { mask: GROUP.SCENERY | GROUP.CAVE, skipBackfaces: true }, wRay.hit);
    groundAt[i] = hit ? 1.2 - wRay.hit.distance + WHEEL_R : -9;
  }
}

// The ground's slope under the four wheels (not just under the sphere), from a straight-down ray at each: the frame
// tilts to it, so the springs carry only the bumps and the body's own motion, not the difference between the ground
// under the sphere and under the wheels. The sphere's own normal when a ray misses.
const plane = { n: new THREE.Vector3(), pts: [0, 1, 2, 3].map(() => new THREE.Vector3()), a: new THREE.Vector3() };
function wheelPlane(c: { x: number; y: number; z: number }) {
  const sh = Math.sin(S.heading),
    ch = Math.cos(S.heading);
  for (let i = 0; i < 4; i++) {
    const [x, z] = WHEELS[i];
    const wx = c.x + x * ch + z * sh,
      wz = c.z - x * sh + z * ch;
    wRay.from.set(wx, c.y + 2, wz);
    wRay.to.set(wx, c.y - 3, wz);
    if (!raycastClosest(wRay.from, wRay.to, { mask: GROUP.SCENERY | GROUP.CAVE, skipBackfaces: true }, wRay.hit))
      return n;
    plane.pts[i].set(wx, c.y + 2 - wRay.hit.distance, wz);
  }
  const [fl, fr, rl, rr] = plane.pts;
  plane.a.subVectors(fr, rl); // one diagonal, then the other: their cross is the plane's normal
  plane.n.subVectors(fl, rr).cross(plane.a).normalize();
  if (plane.n.y < 0) plane.n.negate();
  return plane.n.y > 0.8 ? plane.n : n; // steeper: a wheel is on a rock or a trunk, not the ground
}

// The suspension (vehicle-feel.md, RC cars 1-2): a spring-damper per wheel holds up a chassis with three degrees of
// freedom, in the frame. What the frame does the chassis feels the other way: a landing's jolt squashes it, the cart's
// speeding up and slowing down pitch it (squat, dive), the wheels' sideways grip rolls it out of a turn. With no wheel
// down it eases back to rest while the wheels hang.
function suspend(dt: number) {
  const L0 = MOUNT_Y + GRAVITY / (4 * T.springK); // the springs' free length: at rest they sit at MOUNT_Y
  const Lmax = MOUNT_Y + T.droop;
  const vy = body.velocity.y;
  const jolt = S.mode === 'parked' ? 0 : clamp((vy - lastVy) * T.jolt, -T.landMax, T.landMax);
  lastVy = vy;
  rideV.heave -= jolt;
  const n = Math.min(8, Math.ceil(dt * 120));
  const h = dt / n;
  let touching = 0;
  for (let k = 0; k < n; k++) {
    let fh = -GRAVITY,
      fp = S.aLong * T.pitchGain,
      fr = S.aLat * T.rollGain;
    touching = 0;
    for (let i = 0; i < 4; i++) {
      const [x, z] = WHEELS[i];
      const mount = MOUNT_Y + ride.heave - ride.pitch * z + ride.roll * x;
      const len = mount - groundAt[i];
      if (len <= Lmax) {
        touching++;
        const L = Math.max(len, 0);
        let f = T.springK * (L0 - L) - (T.springC * (L - lastLen[i])) / h;
        if (L < STOP) f += 900 * (STOP - L) - (40 * (L - lastLen[i])) / h; // the bump stop: stiff, and soaks it up
        f = Math.max(0, f);
        drops[i] = Math.min(groundAt[i], mount - STOP);
        lastLen[i] = L;
        fh += f;
        fp -= (f * z) / I_PITCH;
        fr += (f * x) / I_ROLL;
      } else {
        drops[i] = mount - Lmax;
        lastLen[i] = Lmax;
      }
    }
    if (!touching) {
      // nothing under the wheels: the body settles back to rest over them
      fh += -40 * ride.heave - 6 * rideV.heave;
      fp += -40 * ride.pitch - 6 * rideV.pitch;
      fr += -40 * ride.roll - 6 * rideV.roll;
    }
    rideV.heave += fh * h;
    rideV.pitch += fp * h;
    rideV.roll += fr * h;
    ride.heave += rideV.heave * h;
    ride.pitch += rideV.pitch * h;
    ride.roll += rideV.roll * h;
    for (const [key, lim] of LIMITS)
      if (Math.abs(ride[key]) > lim) {
        ride[key] = Math.sign(ride[key]) * lim;
        rideV[key] = 0;
      }
  }
  S.contact += (touching / 4 - S.contact) * (1 - Math.exp(-dt * 12));
}

const XAXIS = new THREE.Vector3(1, 0, 0);
function updatePose(dt: number) {
  if (S.hold) return; // a crash's hit-stop: the cart (and you on it) hold the frame of the hit
  const ip = body.interpolatedPosition;
  nView.lerp(S.grounded || S.mode === 'parked' ? wheelPlane(ip) : UP, 1 - Math.exp(-dt * 10)).normalize();
  // the RC car's own air control: throttle lifts the nose, brake drops it, damped so it never tumbles; on landing the
  // angle goes into the springs (nose-first slams the front)
  if (!S.grounded && S.mode === 'driving') {
    air.v += S.throttle * T.airPitch * dt;
    air.v *= Math.exp(-T.airDamp * dt);
    air.pitch = clamp(air.pitch + air.v * dt, -0.8, 0.8);
  } else if (air.pitch || air.v) {
    ride.pitch += air.pitch;
    rideV.pitch += air.v;
    air.pitch = air.v = 0;
  }
  qa.setFromUnitVectors(UP, nView);
  qb.setFromAxisAngle(UP, S.heading);
  pose.q.copy(qa).multiply(qb);
  pose.q.multiply(qb.setFromAxisAngle(XAXIS, air.pitch));
  pose.p.set(ip.x, ip.y, ip.z).addScaledVector(nView, -(T.r - WHEEL_R));
  probeGround();
  suspend(Math.min(dt, 0.05));
  chassisPoint(chassis.p, ride, 0, 0, 0).applyQuaternion(pose.q).add(pose.p);
  chassis.q.copy(pose.q).multiply(qb.setFromEuler(eul.set(ride.pitch, 0, ride.roll, 'YXZ')));
}
// A point on the chassis (the seat), in the world.
const onChassis = (out: THREE.Vector3, x: number, y: number, z: number) =>
  out.set(x, y, z).applyQuaternion(chassis.q).add(chassis.p);
const toWorld = (out: THREE.Vector3, x: number, y: number, z: number) =>
  out.set(x, y, z).applyQuaternion(pose.q).add(pose.p);

// ---------------------------------------------------------------- dust, sparks and debris (the shared particle pool)
const DUST = new THREE.Color(0xd9c49a);
const SPARK = new THREE.Color(0xffb02e);
const HOT = new THREE.Color(0xfff1a8);
const PLANK = new THREE.Color(0xd9a35b);
// the drift charge's tiers by spark colour (Mario Kart's blue, then a hotter pink): sparks, ready, big
const TIER = [SPARK, SPARK, new THREE.Color(0x45b6ff), new THREE.Color(0xff4fcf)];
const WHITE = new THREE.Color(0xffffff);
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
function spark(x: number, y: number, z: number, speed: number, hot = false, color?: THREE.Color, size = 0.07) {
  if (reducedMotion) return;
  emit({
    x,
    y,
    z,
    vx: (Math.random() - 0.5) * speed,
    vy: 1.5 + Math.random() * speed * 0.5,
    vz: (Math.random() - 0.5) * speed,
    life: 0.2 + Math.random() * 0.25,
    size,
    color: color ? (Math.random() < 0.25 ? WHITE : color) : hot || Math.random() < 0.4 ? HOT : SPARK,
    gravity: 14,
    shrink: 0.5,
  });
}
function splinter(x: number, y: number, z: number) {
  if (reducedMotion) return;
  emit({
    x,
    y,
    z,
    vx: fast.x * 0.3 + (Math.random() - 0.5) * 7,
    vy: 3 + Math.random() * 5,
    vz: fast.z * 0.3 + (Math.random() - 0.5) * 7,
    life: 0.8 + Math.random() * 0.6,
    size: 0.09 + Math.random() * 0.07,
    color: PLANK,
    gravity: 16,
    drag: 0.4,
  });
}
const wp = new THREE.Vector3();
function wheelFx(dt: number) {
  const v = body.velocity;
  const speed = Math.hypot(v.x, v.z);
  if (!S.grounded) return;
  // dust from the rear wheels: more, bigger and longer-lived with speed, trailing behind you from 12 m/s
  const streak = clamp((speed - 12) / 6, 0, 1);
  for (const side of [-1, 1]) {
    toWorld(wp, side * TRACK, -WHEEL_R * 0.8, AXLE_Z);
    if (speed > 3 && Math.random() < dt * speed * (1.2 + speed * 0.12))
      emit({
        x: wp.x,
        y: wp.y,
        z: wp.z,
        vx: -v.x * (0.15 + 0.2 * streak) + (Math.random() - 0.5),
        vy: 0.4 + Math.random() * 0.8,
        vz: -v.z * (0.15 + 0.2 * streak) + (Math.random() - 0.5),
        life: 0.5 + speed * 0.025 + Math.random() * 0.4,
        size: 0.1 + speed * 0.012,
        alpha: 0.7,
        color: DUST,
        gravity: 2,
        drag: 2,
        grow: [1, 2.5 + streak],
        fade: 0.6,
      });
    // sparks while the rear slides; drifting, their colour and count tell the charge: let go for a boost
    if ((S.drifting || Math.abs(S.slip) > 3) && Math.abs(S.slip) > 1.5) {
      const tier = S.drifting ? S.tier : 0;
      for (let k = 0; k < [2, 2, 4, 6][tier]; k++)
        if (Math.random() < dt * 40)
          spark(wp.x, wp.y + 0.05, wp.z, 4, false, tier ? TIER[tier] : undefined, [0.07, 0.08, 0.14, 0.19][tier]);
    }
    // boosting: a jet of sparks out of the back
    if (S.boostLeft > 0 && Math.random() < dt * 80) {
      toWorld(wp, side * 0.4, 0.2, AXLE_Z + 0.5);
      spark(wp.x, wp.y, wp.z, 3, false, TIER[S.boostTier], S.boostTier === 3 ? 0.22 : 0.16);
    }
  }
}

// A wheel pops off in a crash and bounces away (cosmetic; back on when the cart goes back to the top).
const loose = { wheel: null as THREE.Object3D | null, from: null as THREE.Object3D | null, v: new THREE.Vector3() };
const out = new THREE.Vector3();
function popWheel() {
  fixWheel();
  if (reducedMotion) return;
  const from = mine.userData.wheels[2 + (Math.random() < 0.5 ? 0 : 1)]; // a rear one
  mine.updateMatrixWorld(true);
  const w = from.clone();
  from.getWorldPosition(w.position);
  from.getWorldQuaternion(w.quaternion);
  from.visible = false;
  scene.add(w);
  out.set(from.position.x > 0 ? 1 : -1, 0, 0).applyQuaternion(pose.q); // away from the cart, sideways
  loose.wheel = w;
  loose.from = from;
  loose.v.set(fast.x * 0.5 + out.x * 3, 5 + Math.random() * 2, fast.z * 0.5 + out.z * 3);
}
function fixWheel() {
  if (loose.wheel) scene.remove(loose.wheel);
  if (loose.from) loose.from.visible = true;
  loose.wheel = loose.from = null;
}
function stepWheel(dt: number) {
  const w = loose.wheel;
  if (!w) return;
  loose.v.y -= 20 * dt;
  w.position.addScaledVector(loose.v, dt);
  const g = groundHeight(w.position.x, w.position.z) + WHEEL_R * 0.8;
  if (w.position.y < g) {
    w.position.y = g;
    if (loose.v.y < -1.5) {
      loose.v.y *= -0.45;
      loose.v.x *= 0.75;
      loose.v.z *= 0.75;
      puff(w.position.x, g - 0.2, w.position.z, 4, 2, DUST, 0.14);
    } else {
      loose.v.y = 0;
      loose.v.x *= Math.exp(-dt * 2);
      loose.v.z *= Math.exp(-dt * 2);
    }
  }
  w.rotateX((-Math.hypot(loose.v.x, loose.v.z) / WHEEL_R) * dt);
}

// Camera shake from trauma (vehicle-feel.md 4): smooth value noise, one stream per axis, rotation only.
const hash = (i: number) => {
  const x = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  return (x - Math.floor(x)) * 2 - 1;
};
function noise(t: number, seed: number) {
  const i = Math.floor(t),
    f = t - i,
    u = f * f * (3 - 2 * f);
  return lerp(hash(i + seed * 101), hash(i + 1 + seed * 101), u);
}
const SHAKE = { yaw: 0.035, pitch: 0.035, roll: 0.0175, hz: 12 }; // 2°, 2°, 1° at full trauma
function shakeCamera(dt: number, now: number) {
  if (trauma <= 0) return;
  trauma = Math.max(0, trauma - T.traumaDecay * dt);
  if (reducedMotion || !me.entered) return;
  const k = trauma * trauma,
    t = (now / 1000) * SHAKE.hz;
  camera.rotateY(SHAKE.yaw * k * noise(t, 1));
  camera.rotateX(SHAKE.pitch * k * noise(t, 2));
  camera.rotateZ(SHAKE.roll * k * noise(t, 3));
}

// ---------------------------------------------------------------- frame: seat, run, camera
const seat = new THREE.Vector3();
const baseFov = camera.fov;
let fovKick = 0;

// Seated: the rider tilts with the cart, sits low in the tub and leans back a little, with no walk cycle (this runs
// after animateAvatar and feel.ts's spring and overrides both).
function sit(avatar: THREE.Object3D, q: THREE.Quaternion) {
  avatar.quaternion.copy(q);
  avatar.scale.set(1.06, 0.82, 1.06);
  const inner = (avatar.userData as { inner?: THREE.Object3D }).inner;
  if (!inner) return;
  inner.position.y = -0.12;
  inner.rotation.x = 0.22;
  inner.scale.set(1, 1, 1);
}

// Seated, world labels (work-site rings and plaques, signs: canvas sprites straight under the scene) hide, so the run
// reads; they come back when you get out. Enforced every frame, after their own hooks.
const hidden = new Map<THREE.Object3D, boolean>();
let scanAt = 0;
onFrame(
  ({ now }) => {
    if (!S.seated) {
      if (hidden.size) {
        for (const [o, was] of hidden) o.visible = was;
        hidden.clear();
      }
      return;
    }
    if (now > scanAt) {
      scanAt = now + 500;
      for (const o of scene.children) {
        const map = (o as THREE.Sprite).isSprite ? ((o as THREE.Sprite).material as THREE.SpriteMaterial).map : null;
        if (map?.image instanceof HTMLCanvasElement && !hidden.has(o)) hidden.set(o, o.visible);
      }
    }
    for (const o of hidden.keys()) o.visible = false;
  },
  { phase: 'late', order: 1500 },
);

// The chase camera (vehicle-feel.md 4): aims ahead of the cart along its velocity (where it will be, Lonely Mountains),
// leads its yaw into the steering (Nesky: turn where the player turns), keeps its distance nearly fixed (distance lag
// is what hurts) and stays on this side of rocks and trunks, pulled in short of whatever is in the way.
const camRay = { hit: rayHit() };
const ahead = new THREE.Vector3(); // the smoothed look-ahead offset
const aheadWant = new THREE.Vector3();
const camFwd = new THREE.Vector3();
const camFrom = new THREE.Vector3();
let camLead = 0;
let canopyD = 99, // the camera distance the canopies allow, eased (in fast, back out slowly)
  canopyAt = 0,
  duck = 0; // 0..1: how far the camera has dropped to pass under a crown
const low = new THREE.Vector3();
// The canopy spheres near the course (src/render/props.ts), gathered once the props exist.
let nearCanopies: Sphere[] | null = null;
function courseCanopies() {
  if (nearCanopies || !canopies.length) return nearCanopies ?? [];
  const off = (c: Sphere) => {
    let best = Infinity;
    for (let k = 0; k < LINE.length - 1; k++) {
      const [ax, az] = LINE[k],
        [bx, bz] = LINE[k + 1];
      const lx = bx - ax,
        lz = bz - az;
      const u = clamp(((c.x - ax) * lx + (c.z - az) * lz) / (lx * lx + lz * lz), 0, 1);
      best = Math.min(best, Math.hypot(c.x - ax - lx * u, c.z - az - lz * u) - c.r);
    }
    return best;
  };
  return (nearCanopies = canopies.filter((c) => off(c) < 16));
}
const CANOPY_PAD = 0.9; // m around each crown: the lens keeps this clear of leaves
const CANOPY_MIN = 3; // m: never closer than this for a crown (a close-up hurts more than a leaf at the edge)
// How far from `a` toward `b` (length `len`) the camera can go before a canopy; `len` (or more) when clear. A cart
// under a crown's rim (`a` inside it) cannot be helped by pulling in, so that crown is skipped.
function canopyGap(a: THREE.Vector3, b: THREE.Vector3, len: number) {
  let gap = 99;
  if (len < 1e-3) return gap;
  const dx = (b.x - a.x) / len,
    dy = (b.y - a.y) / len,
    dz = (b.z - a.z) / len;
  for (const c of courseCanopies()) {
    const ox = a.x - c.x,
      oy = a.y - c.y,
      oz = a.z - c.z;
    const r = c.r + CANOPY_PAD;
    const cc = ox * ox + oy * oy + oz * oz - r * r;
    if (cc < 0) continue;
    const bb = ox * dx + oy * dy + oz * dz;
    const disc = bb * bb - cc;
    if (disc < 0 || bb > 0) continue;
    const t = -bb - Math.sqrt(disc);
    if (t < len) gap = Math.min(gap, Math.max(CANOPY_MIN, t));
  }
  return gap;
}
camConstraints.push((look, pos) => {
  if (!S.seated) return false;
  camFrom.copy(look);
  look.add(ahead);
  const v = body.velocity;
  const dist = T.camDist + T.camPull * clamp((Math.hypot(v.x, v.z) - 6) / 10, 0, 1);
  pos.copy(look).addScaledVector(camForward(camFwd), -dist);
  if (raycastClosest(camFrom, pos, { mask: GROUP.SCENERY }, camRay.hit)) {
    const d = camFrom.distanceTo(pos);
    pos.lerp(camFrom, Math.min(1, (d - Math.max(1.2, camRay.hit.distance - 0.4)) / d));
  }
  // Leafy crowns have no colliders. With one in the way, the camera first ducks under it (crowns are overhead: a
  // lower camera often clears them), then pulls in short of whatever is still in the way; both eased, so it glides as
  // a tree passes instead of popping.
  const t = performance.now();
  const dt = Math.min(0.1, (t - canopyAt) / 1000);
  canopyAt = t;
  let d = camFrom.distanceTo(pos);
  const high = canopyGap(camFrom, pos, d);
  low.copy(pos);
  low.y = Math.max(groundHeight(low.x, low.z) + 0.9, camFrom.y + 0.1);
  let duckWant = 0;
  if (high < d && low.y < pos.y - 0.3) duckWant = canopyGap(camFrom, low, camFrom.distanceTo(low)) > high + 0.5 ? 1 : 0;
  duck = lerp(duck, duckWant, 1 - Math.exp(-dt * (duckWant > duck ? 8 : 2.5)));
  pos.lerp(low, duck);
  d = camFrom.distanceTo(pos);
  const goal = Math.min(canopyGap(camFrom, pos, d), d);
  canopyD = Math.min(canopyD, d);
  canopyD = lerp(canopyD, goal, 1 - Math.exp(-dt * (goal < canopyD ? 8 : 3.5)));
  if (canopyD < d) pos.lerp(camFrom, (d - canopyD) / d);
  pos.y = Math.max(pos.y, groundHeight(pos.x, pos.z) + 0.45);
  return true;
});
onFrame(
  ({ dt, now }) => {
    if (S.seated && (!me.entered || !me.body)) {
      S.seated = false;
      setSeated(false);
    }
    if (S.hold && now >= S.hold) {
      S.hold = 0;
      getOut(true); // the hit-stop is over: fly
    }
    if (S.mode === 'loose' && now - S.looseAt > T.returnAfter * 1000) backToTop();
    updatePose(dt);
    stepWheel(dt);
    const v = body.velocity;
    const speed = Math.hypot(v.x, v.z);
    if (S.seated && me.body) {
      onChassis(seat, 0, SEAT.y, SEAT.z);
      teleport(me.body, seat.x, seat.y, seat.z);
      me.body.velocity.set(0, 0, 0);
      me.yaw = S.heading;
      me.coyote = 0.1;
      // hop out once stopped; moving, the same button is the handbrake
      if (me.jumpQueued > 0 && speed < 1) {
        me.jumpQueued = 0;
        getOut(false);
      }
      if (S.seated && !S.hold) {
        // behind where the cart is going (velocity when fast, so a drift shows from outside), plus the lead
        const travel = speed > 3 ? Math.atan2(-v.x, -v.z) : S.heading;
        const base = angleLerp(cam.yaw - camLead, travel, 1 - Math.exp(-dt * 3.2));
        const lead = speed > 3 && S.grounded ? -S.steer * T.camLead : 0;
        camLead += (lead - camLead) * (1 - Math.exp(-dt / T.camLeadS));
        cam.yaw = base + camLead;
        cam.pitch = lerp(cam.pitch, -0.33, 1 - Math.exp(-dt * 2));
        const la = speed > 0.1 ? Math.min(T.lookAhead, T.lookAheadMax / speed) : 0;
        aheadWant.set(v.x * la, 0, v.z * la);
        ahead.lerp(aheadWant, 1 - Math.exp(-dt * 4));
        runHud.tick(body.position.x, body.position.z, physicsTime());
      }
      wheelFx(dt);
      if (S.boosted > 0) {
        const big = S.boosted === 3;
        S.boostTier = S.boosted;
        toWorld(wp, 0, 0.1, AXLE_Z + 0.4);
        for (let k = 0; k < (big ? 40 : 24); k++)
          spark(wp.x, wp.y, wp.z, big ? 9 : 7, false, TIER[S.boosted], big ? 0.2 : 0.15);
        puff(wp.x, wp.y, wp.z, big ? 14 : 8, 4, TIER[S.boosted], big ? 0.4 : 0.3);
        fovKick = big ? 9 : 5;
        S.boosted = 0;
      }
    } else {
      ahead.set(0, 0, 0);
      camLead = 0;
      // thrown: the camera stays back and turns after you, so you see the flight and the landing
      if (S.watchUntil && me.body) {
        if (now < S.watchUntil) {
          const bv = me.body.velocity;
          if (Math.hypot(bv.x, bv.z) > 2)
            cam.yaw = angleLerp(cam.yaw, Math.atan2(-bv.x, -bv.z), 1 - Math.exp(-dt * 2.5));
          cam.pitch = lerp(cam.pitch, -0.4, 1 - Math.exp(-dt * 2));
        } else {
          cam.dist = S.camDist || 6.5;
          S.watchUntil = 0;
        }
      }
    }
    if (S.tumble > 0) S.tumble -= dt;
  },
  { phase: 'world', order: 10 },
);

// The run: from the start circle to the line at the path's foot. Lives in run-hud.ts; told where the cart is here.
const ghost = createGhost();
runHud.configure({
  started: (x, z) => flat(x, z, START.x, START.z) > START_GO,
  finished: crossedFinish,
  begun: () => ghost.begin(),
  done: (t) => ghost.finish(t),
});

// ---------------------------------------------------------------- meshes: my cart, gates, remote carts
const mine = makeCart();
scene.add(mine);
const lastP = new THREE.Vector3().copy(body.position);
onFrame(
  ({ dt, now }) => {
    mine.position.copy(pose.p);
    mine.quaternion.copy(pose.q);
    const ip = body.interpolatedPosition;
    const d = Math.hypot(ip.x - lastP.x, ip.z - lastP.z) * Math.sign(S.vf || 1);
    lastP.set(ip.x, ip.y, ip.z);
    S.wheel = S.mode === 'parked' ? 0 : S.wheel;
    poseCart(mine, S.wheel, d, ride, drops);
    // your best run, on the run clock (recorded while it runs; shown seated, from Ready to a second past its finish)
    const clock = S.seated ? runHud.clock(physicsTime()) : null;
    if (clock !== null && runHud.state.state === 'running') ghost.record(clock, chassis.p, chassis.q, S.wheel);
    ghost.show(clock, dt);
    if (S.seated && me.avatar) sit(me.avatar, chassis.q);
    // thrown out: a flip on the way, after feel.ts's spring (order 20) has set the lean
    if (S.tumble > 0 && me.avatar) {
      S.tumbleAngle += dt * 13;
      me.avatar.rotation.x += S.tumbleAngle;
    } else S.tumbleAngle = 0;
    // more field of view with speed and a kick for a boost, capped; it opens faster (4/s) than it closes (2/s)
    const v = body.velocity;
    if (S.boostLeft <= 0) fovKick *= Math.exp(-dt * 2);
    const widen = clamp((Math.hypot(v.x, v.z) - 6) * T.fovPerMs, 0, T.fovMax);
    const want = S.seated ? baseFov + Math.min(T.fovMax, widen + fovKick) : baseFov;
    if (Math.abs(camera.fov - want) > 0.05) {
      camera.fov = lerp(camera.fov, want, 1 - Math.exp(-dt * (want > camera.fov ? 4 : 2)));
      camera.updateProjectionMatrix();
    }
    shakeCamera(dt, now);
  },
  { phase: 'update', order: 25 },
);

buildMarkers();

// Owner sync: the cart you sit in, as [x, y, z, qx, qy, qz, qw, front wheel angle, speed]. Null when you are not in
// it (an empty cart is local only: it rolls back to the top by itself).
type Wire = number[];
type Snap = { w: Wire; r: Wire | null };
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
// The ride on top, as [heave, pitch, roll, then the four wheels' heights]: a separate key, so a build without it still
// draws the cart (stiffly).
addPresenceField('soapboxRide', (): Wire | null =>
  S.seated ? [r3(ride.heave), r3(ride.pitch), r3(ride.roll), ...drops.map(r3)] : null,
);
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
  const ridden = pr.soapboxRide;
  t.snaps.push(time, { w, r: finiteArr(ridden, 7) ? ridden : null });
});
const tq = new THREE.Quaternion(),
  tq2 = new THREE.Quaternion();
const theirRide: Ride = { heave: 0, pitch: 0, roll: 0 };
const theirDrops = [0, 0, 0, 0];
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
      const RA = a.r ?? b.r,
        RB = b.r ?? a.r;
      if (RA && RB) {
        theirRide.heave = lerp(RA[0], RB[0], u);
        theirRide.pitch = lerp(RA[1], RB[1], u);
        theirRide.roll = lerp(RA[2], RB[2], u);
        for (let i = 0; i < 4; i++) theirDrops[i] = lerp(RA[3 + i], RB[3 + i], u);
        poseCart(t.mesh, lerp(A[7], B[7], u), B[8] * dt, theirRide, theirDrops);
      } else poseCart(t.mesh, lerp(A[7], B[7], u), B[8] * dt);
      const r = remotes.get(peer);
      if (r?.avatar) sit(r.avatar, tq.copy(t.mesh.quaternion).multiply(t.mesh.userData.body.quaternion));
    }
  },
  { phase: 'update', order: 26 },
);

// Console and scripted runs (dev/look/evals/soapbox-*.js): the tuning, the state, and a teleport to the start.
window.__soapbox = {
  T,
  S,
  ride,
  drops,
  air,
  body,
  START,
  FINISH,
  LINE,
  ghost,
  board,
  getOut,
  backToTop,
  get run() {
    return runHud.state;
  },
};

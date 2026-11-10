// The three moves of ?proto=place: a second jump, a hook shot and a glider (docs/research/movement-abilities.md, section 3;
// docs/research/botw-glide-target.md). One movement mode decides what the body does each fixed step: hook, then glide, then the
// jump as ever. They live here, on top of the player's controller and through its body, rather than in it: this is a prototype,
// and src/entities/player/state.ts doesn't change. Owner: physics is yours, and a partner sees it through `placeMove`.
//
// How they sit round the controller: a step at order 22, before the jump's shape (30) and the controller (40), notes your velocity
// and lets a jump cancel a pull. A step at order 42, after them, takes over from the controller when a mode is on: it writes the
// body's velocity and cancels gravity once with a force. Nothing teleports and the colliders stay on.
//
// Serves DESIGN.md 1 (Toys before chores): moving around is the toy. The glide spends height and never gives it back: no boost,
// no lift, and toggling it can never beat keeping it open.
import * as THREE from 'three/webgpu';
import { GRAVITY, PLAYER_MASS, PLAYER_R, FIXED } from '../../constants.ts';
import { onFrame } from '../../loop.ts';
import { getMask, onPreStep, raycastClosest, rayHit, sweepSphere } from '../../physics/engine.ts';
import { GROUP } from '../../physics/physics.ts';
import { camForward, me } from '../../player/player.ts';
import { registerAction, wrapAction } from '../../player/controls.ts';
import { inputState } from '../../player/input-state.ts';
import { fallArrival } from '../../fall/arrival.ts';
import { airJumpApexForce } from '../../entities/player/apex-float.ts';
import { camera } from '../../render/scene.ts';
import { protoCount } from '../count.ts';
import { playMark } from '../mark.ts';
import { job } from './job.ts';
import { MOVE, PADS, ringAt, type Pad } from './tech-layout.ts';
import { ORIGIN } from './layout.ts';

export type Ring = { pad: Pad; at: THREE.Vector3; land: THREE.Vector3 };
const ox = ORIGIN.x,
  oz = ORIGIN.z;
export const RINGS: Ring[] = PADS.filter((p) => p.ring).map((pad) => {
  const r = ringAt(pad);
  return {
    pad,
    at: new THREE.Vector3(r.x + ox, r.y, r.z + oz),
    land: new THREE.Vector3(pad.x + ox, pad.top + PLAYER_R + 0.2, pad.z + oz),
  };
});

type Pull = {
  ring: Ring;
  pts: THREE.Vector3[]; // the path, a soft curve up and over the landing's lip
  lens: number[]; // metres along it at each point
  total: number;
  s: number;
  v: number;
  stall: number;
};
/** What the moves are doing, read by ./moves-view.ts and ./tech.ts. */
export const move = {
  charge: true, // the second jump's there: back when you stand on something
  second: false, // rising on it
  open: false, // the canopy's out; it holds you once you're coming down
  holding: false, // and it's holding you
  deployT: 0,
  deployV0: 0,
  armUntil: 0, // pressed just before you left the ground
  pull: null as Pull | null,
  pick: null as Ring | null, // the ring a press would take
  range: new Set<Ring>(), // the rings in range, for how they're drawn
  jumps: 0, // ever: ./moves-view.ts puffs on a change
  pulls: 0,
  flights: 0,
  opened: 0,
  denied: 0,
  ended: 0, // pulls that have ended, for the tug
};
const vp = { x: 0, z: 0 };

const grounded = () => me.coyote > 0;
const canAct = () =>
  !fallArrival.active && !me.swimming && !inputState.seated && !inputState.held && !me.down && !!me.body;

// ---------------------------------------------------------------- the second jump
function secondJump() {
  const b = me.body!;
  move.charge = false;
  move.second = true;
  me.jumpQueued = 0;
  b.velocity.y = Math.max(b.velocity.y, MOVE.second);
  // It corrects a slightly wrong heading too: "an extra vertical kick with weak steering is only half the reward".
  const wl = Math.hypot(me.wish.x, me.wish.z);
  if (wl > 0.1) {
    const sp = Math.hypot(b.velocity.x, b.velocity.z);
    const tx = (me.wish.x / wl) * Math.max(sp, 5.6 * wl),
      tz = (me.wish.z / wl) * Math.max(sp, 5.6 * wl);
    b.velocity.x += (tx - b.velocity.x) * MOVE.secondTurn;
    b.velocity.z += (tz - b.velocity.z) * MOVE.secondTurn;
  }
  move.jumps++;
  protoCount('second jumps');
  if (move.jumps === 1) playMark('double jumped');
}

// ---------------------------------------------------------------- the glide
export function toggleGlide() {
  if (!job.tech.glide || !canAct()) return;
  if (move.pull) return;
  if (move.open) return closeGlide();
  if (grounded()) {
    move.armUntil = performance.now() + 180; // a press as you step off still counts
    return;
  }
  openGlide();
}
function openGlide() {
  move.open = true;
  move.holding = false;
  move.opened++;
  move.armUntil = 0;
  protoCount('glides');
  if (move.opened === 1) playMark('glide opened');
}
export function closeGlide() {
  move.open = move.holding = false;
}
const TAU = Math.PI * 2;
const wrap = (a: number) => a - TAU * Math.round(a / TAU);
function stepGlide() {
  const b = me.body!;
  // Rising: it stays armed, and the jump you earned keeps its height.
  if (!move.holding) {
    if (b.velocity.y > 0) return;
    move.holding = true;
    move.flights++;
    move.deployT = 0;
    move.deployV0 = b.velocity.y;
  }
  // Down: over deployS from whatever you were falling at, with no overshoot. Reopening starts from where you are, so it
  // never beats staying open.
  move.deployT += FIXED;
  const q = Math.min(1, move.deployT / MOVE.glideDeploy);
  const sink = -MOVE.glideSink;
  // Already slower than the sink (off the apex): no quicker fall than gravity's, and never a lift.
  b.velocity.y = move.deployV0 + (sink - move.deployV0) * (q * q * (3 - 2 * q));
  // Across: a heading and a speed. The controller's steering this step is thrown away, from the velocity noted before it.
  let vx = vp.x,
    vz = vp.z;
  let sp = Math.hypot(vx, vz);
  const u = Math.min(1, Math.hypot(me.wish.x, me.wish.z));
  let th = Math.atan2(vx, vz);
  const want = MOVE.glideSpeed * u;
  if (u > 0.05) {
    const goal = Math.atan2(me.wish.x, me.wish.z);
    if (sp < 0.3) th = goal;
    else {
      const e = wrap(goal - th);
      th += Math.max(-MOVE.glideTurnMax, Math.min(MOVE.glideTurnMax, e / MOVE.glideTurnTau)) * FIXED;
    }
  }
  if (sp < want) sp = Math.min(want, sp + MOVE.glideAccel * FIXED);
  else if (u <= 0.05) sp = Math.max(0, sp - MOVE.glideBrake * FIXED);
  else sp = Math.max(want, sp - (sp > MOVE.glideSpeed ? MOVE.glideOver : MOVE.glideBrake) * FIXED);
  vx = Math.sin(th) * sp;
  vz = Math.cos(th) * sp;
  b.velocity.x = vx;
  b.velocity.z = vz;
  b.force.y = PLAYER_MASS * GRAVITY; // gravity's taken out once, and nothing else has a say
}

// ---------------------------------------------------------------- the hook
const v1 = new THREE.Vector3(),
  v2 = new THREE.Vector3(),
  v3 = new THREE.Vector3();
/** A point above the near edge of the landing, seen from (x, z): you come onto it from there, never through it. */
function overLip(ring: Ring, x: number, z: number, out: THREE.Vector3) {
  const c = ring.land,
    fromX = x - c.x,
    fromZ = z - c.z,
    far = Math.hypot(fromX, fromZ) || 1;
  const ux = fromX / far,
    uz = fromZ / far;
  const edge = Math.min(
    far,
    Math.min(ring.pad.hx / Math.max(Math.abs(ux), 0.01), ring.pad.hz / Math.max(Math.abs(uz), 0.01)) + 0.7,
  );
  return out.set(c.x + ux * edge, c.y + 0.6, c.z + uz * edge);
}
const cr = (a: number, b: number, c: number, d: number, t: number) =>
  0.5 * (2 * b + (c - a) * t + (2 * a - 5 * b + 4 * c - d) * t * t + (3 * b - a - 3 * c + d) * t * t * t);
function buildPull(ring: Ring): Pull {
  const b = me.body!;
  const a = new THREE.Vector3(b.position.x, b.position.y, b.position.z),
    c = ring.land.clone();
  // A smooth line through: off the floor, clear of what's beside you; over the lip; down onto the landing.
  const via = [a, new THREE.Vector3(a.x, a.y + 0.7, a.z), overLip(ring, a.x, a.z, new THREE.Vector3()), c];
  const pts: THREE.Vector3[] = [],
    lens: number[] = [];
  let total = 0;
  for (let k = 0; k < via.length - 1; k++) {
    const p0 = via[Math.max(0, k - 1)]!,
      p1 = via[k]!,
      p2 = via[k + 1]!,
      p3 = via[Math.min(via.length - 1, k + 2)]!;
    const n = Math.max(2, Math.ceil(p1.distanceTo(p2) / 0.5));
    for (let i = k ? 1 : 0; i <= n; i++) {
      const t = i / n;
      const p = new THREE.Vector3(
        cr(p0.x, p1.x, p2.x, p3.x, t),
        cr(p0.y, p1.y, p2.y, p3.y, t),
        cr(p0.z, p1.z, p2.z, p3.z, t),
      );
      if (pts.length) total += p.distanceTo(pts.at(-1)!);
      pts.push(p);
      lens.push(total);
    }
  }
  return { ring, pts, lens, total, s: 0, v: 0, stall: 0 };
}
function pathAt(p: Pull, s: number, out: THREE.Vector3) {
  let k = 1;
  while (k < p.lens.length - 1 && p.lens[k]! < s) k++;
  const a = p.lens[k - 1]!,
    b = p.lens[k]!;
  return out.lerpVectors(p.pts[k - 1]!, p.pts[k]!, b > a ? Math.min(1, (s - a) / (b - a)) : 1);
}
/** Can the whole body get along it? Both spheres, to the near edge of the landing. */
function clearFor(ring: Ring) {
  const b = me.body!;
  const mask = getMask(b) & GROUP.SCENERY;
  const lift = overLip(ring, b.position.x, b.position.z, v3);
  for (const dy of [0, 0.8]) {
    v1.set(b.position.x, b.position.y + dy + 1.3, b.position.z); // from over your head: what's underfoot doesn't count
    v2.set(lift.x, lift.y + dy, lift.z);
    if (sweepSphere(v1, v2, PLAYER_R * 0.8, { mask, thin: 'skip' }) >= 0) return false;
  }
  return true;
}
export function fireHook(ring: Ring | null = move.pick) {
  if (!job.tech.hook || !canAct()) return false;
  if (move.pull) {
    cancelPull();
    return true;
  }
  if (!ring) {
    move.denied++;
    return false;
  }
  closeGlide();
  move.pull = buildPull(ring);
  me.jumpQueued = 0;
  move.pulls++;
  protoCount('hooks');
  if (move.pulls === 1) playMark('hook pulled');
  return true;
}
function endPull() {
  move.pull = null;
  move.ended++;
}
/** Let go part way: you keep what you had, within reason. No hidden slingshot. */
export function cancelPull() {
  const b = me.body;
  if (b) {
    const h = Math.hypot(b.velocity.x, b.velocity.z);
    if (h > MOVE.hookExitH) {
      b.velocity.x *= MOVE.hookExitH / h;
      b.velocity.z *= MOVE.hookExitH / h;
    }
    if (b.velocity.y > MOVE.hookExitUp) b.velocity.y = MOVE.hookExitUp;
  }
  endPull();
}
function stepPull(p: Pull) {
  const b = me.body!;
  const left = p.total - p.s;
  p.v = Math.min(MOVE.hookCruise, p.v + MOVE.hookAccel * FIXED, Math.sqrt(2 * MOVE.hookBrake * Math.max(0, left)));
  p.s = Math.min(p.total, p.s + Math.max(p.v, 1) * FIXED);
  pathAt(p, p.s, v1);
  v2.set(v1.x - b.position.x, v1.y - b.position.y, v1.z - b.position.z);
  const err = v2.length();
  // Held up by something: a pull never pushes through, it lets go.
  p.stall = err > 1.1 ? p.stall + FIXED : 0;
  if (p.stall > 0.18) return cancelPull();
  v2.divideScalar(FIXED);
  const most = MOVE.hookCruise * 1.4;
  if (v2.length() > most) v2.setLength(most);
  b.velocity.set(v2.x, v2.y, v2.z);
  b.force.y = PLAYER_MASS * GRAVITY;
  me.wish.set(0, 0, 0);
  if (p.total - p.s < 0.05) {
    b.velocity.set(0, 0, 0);
    endPull();
  }
}

// ---------------------------------------------------------------- the step
onPreStep(
  () => {
    const b = me.body;
    if (!b) return;
    vp.x = b.velocity.x;
    vp.z = b.velocity.z;
    if (move.pull) {
      // Jump lets go, into the second jump if you've got it. Anything that takes the body from you ends it.
      if (me.jumpQueued > 0 || !canAct()) cancelPull();
      else me.coyote = 0;
    }
  },
  { order: 22 },
);
onPreStep(
  () => {
    const b = me.body;
    if (!b) return;
    if (!canAct()) {
      closeGlide();
      move.second = false;
      return;
    }
    if (move.pull) return stepPull(move.pull);
    if (grounded()) {
      if (b.velocity.y < 1.5) move.charge = true;
      move.second = false;
      if (move.open) closeGlide();
      return;
    }
    if (move.armUntil && performance.now() < move.armUntil) openGlide();
    if (me.jumpQueued > 0 && job.tech.jump && move.charge) {
      secondJump();
      if (move.open) move.holding = false; // stays armed, and catches you again when you come down
    }
    if (move.second) {
      if (b.velocity.y <= 0) move.second = false;
      else {
        // The same family as the first jump: a little float at the top, whether you held it or not.
        // Never on top of the controller's float for a still-rising first jump (apex-float.ts).
        if (b.velocity.y < MOVE.apexSpeed) b.force.y = airJumpApexForce(b.force.y, PLAYER_MASS * GRAVITY);
        // And more steering through it.
        const dx = me.wish.x * (me.sprint ? 9.5 : 5.6) - b.velocity.x,
          dz = me.wish.z * (me.sprint ? 9.5 : 5.6) - b.velocity.z,
          dl = Math.hypot(dx, dz),
          most = (MOVE.secondSteer - 14) * FIXED;
        if (dl > 0.01) {
          const k = Math.min(1, most / dl);
          b.velocity.x += dx * k;
          b.velocity.z += dz * k;
        }
      }
    }
    if (move.open) stepGlide();
  },
  { order: 42 },
);

// ---------------------------------------------------------------- which ring a press would take
const COS = Math.cos((MOVE.hookCone * Math.PI) / 180);
const fwd = new THREE.Vector3(),
  to = new THREE.Vector3();
const hit = rayHit();
let rival: Ring | null = null,
  rivalAt = 0;
const scoreOf = (r: Ring) => {
  const b = me.body!;
  to.set(r.at.x - camera.position.x, r.at.y - camera.position.y, r.at.z - camera.position.z).normalize();
  const dot = to.dot(fwd);
  if (dot < COS) return -1;
  const d = Math.hypot(r.at.x - b.position.x, r.at.y - b.position.y, r.at.z - b.position.z);
  return Math.acos(Math.min(1, dot)) * 1.4 + d / 90 + 0.001;
};
/** For the bot's log: why a press wouldn't take this ring. */
export function whyNot(r: Ring) {
  const b = me.body!;
  camForward(fwd);
  const d = Math.hypot(r.at.x - b.position.x, r.at.y - b.position.y, r.at.z - b.position.z);
  if (d > MOVE.hookRange) return `too far, ${d.toFixed(1)} m`;
  if (scoreOf(r) < 0) return 'off the middle of the view';
  v1.set(b.position.x, b.position.y + 0.8, b.position.z);
  v2.subVectors(r.at, v1);
  v2.setLength(Math.max(0, v2.length() - 1.2)).add(v1);
  if (raycastClosest(v1, v2, { mask: getMask(b) & GROUP.SCENERY, skipBackfaces: true }, hit))
    return `something in the way at ${hit.distance.toFixed(1)} of ${v1.distanceTo(v2).toFixed(1)} m`;
  return clearFor(r) ? 'nothing' : 'no room for the body';
}
function pickRing(now: number) {
  const b = me.body;
  move.range.clear();
  if (!b || !job.tech.hook || move.pull) return void (move.pick = null);
  camForward(fwd);
  let best: Ring | null = null,
    bestScore = Infinity,
    currentScore = Infinity;
  for (let k = 0; k < RINGS.length; k++) {
    const r = RINGS[k]!;
    const d = Math.hypot(r.at.x - b.position.x, r.at.y - b.position.y, r.at.z - b.position.z);
    if (d > MOVE.hookRange) continue;
    // Not the one you're standing under.
    if (
      Math.hypot(r.land.x - b.position.x, r.land.z - b.position.z) < r.pad.hx + 0.6 &&
      Math.abs(r.pad.top + 1 - b.position.y) < 2.2
    )
      continue;
    move.range.add(r);
    const sc = scoreOf(r);
    if (sc < 0) continue;
    v1.set(b.position.x, b.position.y + 0.8, b.position.z);
    // What's in the way, between you and the ring. The ring's own post doesn't count: stop short of it.
    v2.subVectors(r.at, v1);
    const len = v2.length();
    v2.setLength(Math.max(0, len - 1.2)).add(v1);
    if (raycastClosest(v1, v2, { mask: getMask(b) & GROUP.SCENERY, skipBackfaces: true }, hit)) continue;
    if (!clearFor(r)) continue;
    if (r === move.pick) currentScore = sc;
    if (sc < bestScore) {
      bestScore = sc;
      best = r;
    }
  }
  // A better one has to be better for a moment: the pick doesn't flicker between two near each other.
  if (move.pick && currentScore < Infinity && best !== move.pick) {
    if (bestScore > currentScore * 0.8) return void (rival = null);
    if (rival !== best) {
      rival = best;
      rivalAt = now;
      return;
    }
    if (now - rivalAt < 150) return;
  }
  rival = null;
  move.pick = best;
}
onFrame(({ now }) => pickRing(now), { phase: 'update', order: 11 });

// ---------------------------------------------------------------- the buttons
// Off the guide and the touch layout until you've found the thing. RB/F and LB/Q, checked free against `npm run registry -- --json`
// on 2 November: the core game claims no shoulder button, and src/proto's claims don't count against the one that has to stay free.
const registered = { hook: false, glide: false };
export function syncControls() {
  const owned = (id: 'hook' | 'glide') => job.tech[id];
  if (owned('hook') && !registered.hook) {
    registered.hook = true;
    registerAction('hook', {
      pad: 'rb',
      key: 'KeyF',
      label: 'Hook shot, at a ring',
      touch: { label: 'Hook', className: 'place-hook-btn' },
      group: 'move',
      order: 2,
      down: () => void fireHook(),
    });
  }
  if (owned('glide') && !registered.glide) {
    registered.glide = true;
    registerAction('glide', {
      pad: 'lb',
      key: 'KeyQ',
      label: 'Open or close the glider, in the air',
      touch: { label: 'Glide', className: 'place-glide-btn' },
      group: 'move',
      order: 3,
      down: toggleGlide,
    });
  }
  document.body.classList.toggle('place-has-hook', owned('hook'));
  document.body.classList.toggle('place-has-glide', owned('glide'));
}
// The Back button lets go of a pull too.
wrapAction('back', {
  down: (next) => {
    if (move.pull) cancelPull();
    else next();
  },
});

/** Start over, or put somewhere by the panel. */
export function resetMoves() {
  move.pull = null;
  move.pick = null;
  move.charge = true;
  move.second = false;
  closeGlide();
}

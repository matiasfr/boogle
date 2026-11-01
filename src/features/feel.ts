// Controller feel pass. The body setup stays as it is (dynamic physics body, steered horizontal
// velocity, ledge grace, jump buffer); this file reshapes what happens around it:
//   - jump: heavier fall, a short hop when you let go early, a little float at the apex while held, and jumps add to
//     an upward bounce instead of replacing it (src/physics/physics.ts), so mushroom bounces chain
//   - ground snap: running over a crest no longer launches you (recently grounded, ground just below, no jump)
//   - braking: a harder brake than turn (src/physics/physics.ts) with a dust skid
//   - a spring layer on every avatar (render only): landing squash scaled by fall speed, takeoff stretch, lean toward
//     acceleration (braking rocks back, turns bank)
//   - canned flops synced as one presence field `fl: [kind, ms]`: hard-landing splat, head-stomp squash, sprint bonk
// Serves DESIGN.md 10 (slapstick over precision) and 1 (moving around is a toy). Authority: you, for your own body.
import * as THREE from 'three';
import { onFrame } from '../loop.ts';
import { clamp } from '../math.ts';
import { emit } from '../render/particles.ts';
import { GROUP } from '../physics/physics.ts';
import { onPreStep, raycastClosest, rayHit, getMask, type Body } from '../physics/engine.ts';
import { GRAVITY, PLAYER_MASS, PLAYER_R, reducedMotion } from '../constants.ts';
import { waterField } from '../physics/water-field.ts';
import { carry } from '../physics/platforms.ts';
import { me } from '../player/player.ts';
import { remotes, addPresenceField, onRemotePresence } from '../netplay/net.ts';

// ---------------------------------------------------------------- tunables (starting points)
const JUMP = {
  fallGravity: 1.7, // x gravity while falling
  cutGravity: 2.5, // x gravity while rising after the jump button was released (short hop)
  apexGravity: 0.5, // x gravity near the top while the button is held
  apexSpeed: 1.6, // m/s: "near the top"
};
const MOVE = {
  snapMaxGap: 0.45, // m: ground this close below the feet pulls you back down after a crest
  skidSpeed: 4, // m/s: braking faster than this kicks up dust
};
const SPRING = {
  k: 260, // stiffness of the squash spring (1/s²)
  damp: 14, // damping (1/s)
  landK: 0.45, // squash-spring velocity per m/s of fall speed (a normal landing squashes ~15%)
  takeoffK: 3, // stretch kick on takeoff
  maxSquash: 0.45,
  leanK: 0.022, // radians per m/s² of acceleration
  maxLean: 0.35,
  leanEase: 12, // 1/s
};
const FLOP = {
  splatSpeed: 13.5, // m/s fall speed for a hard-landing splat
  splatMs: 700,
  stompMs: 550,
  bonkDrop: 6.5, // m/s of horizontal speed lost in one frame while sprinting on the ground
  bonkMs: 650,
};
const KINDS = ['splat', 'stomp', 'bonk'];

// ---------------------------------------------------------------- physics: jump shape, snap
const ray = { to: { x: 0, y: 0, z: 0 }, hit: rayHit() };
const floorGap = (b: Body) => {
  ray.to.x = b.position.x;
  ray.to.y = b.position.y - PLAYER_R - MOVE.snapMaxGap;
  ray.to.z = b.position.z;
  const mask = getMask(b) & (GROUP.SCENERY | GROUP.CAVE); // static floors only, never your own body
  return raycastClosest(b.position, ray.to, { mask, skipBackfaces: true }, ray.hit)
    ? ray.hit.distance - PLAYER_R
    : Infinity;
};
let jumpActive = false; // a player-made jump is rising (only those get the short-hop cut)
onPreStep(() => {
  const b = me.body;
  if (!b) return;
  const vy = b.velocity.y;
  const surf = waterField.surfaceAt(b.position.x, b.position.z);
  const under = surf - (b.position.y + 0.35) > 0;
  // Clear first, then set: the jump's velocity lands later this step (the controller), so vy is still <= 0 here.
  if (vy <= 0) jumpActive = false;
  if (me.jumpQueued > 0 && me.coyote > 0 && !under) jumpActive = true; // the jump happens this step
  if (!under) {
    let g = 1;
    if (vy < 0) g = JUMP.fallGravity;
    else if (jumpActive && !me.jumpHeld) g = JUMP.cutGravity;
    else if (jumpActive && vy < JUMP.apexSpeed) g = JUMP.apexGravity;
    b.force.y -= PLAYER_MASS * GRAVITY * (g - 1);
    // ground snap: just left the ground over a crest without jumping, ground right below: stay on it. The gap is to
    // whatever floor is under you (stairs, decks, cave floors), not the terrain: walking up a ramp is not a crest.
    if (!jumpActive && me.coyote > 0 && vy > 0.4) {
      const gap = floorGap(b);
      if (gap > 0.06 && gap < MOVE.snapMaxGap) b.velocity.y = 0;
    }
  }
});

// ---------------------------------------------------------------- my flops
type Flop = { kind: string; until: number };
let flop: Flop | null = null;
let seenTumbles = 0;
const startFlop = (kind: string, ms: number) => {
  if (!flop || flop.until < performance.now()) flop = { kind, until: performance.now() + ms };
};
addPresenceField('fl', () =>
  flop && flop.until > performance.now()
    ? [KINDS.indexOf(flop.kind), Math.round(flop.until - performance.now())]
    : null,
);
onRemotePresence((r, pr) => {
  const f = pr.fl;
  // Temporary: same stale-repeat guard as kd in impact.js (old-build tabs never clear fl). Remove once every tab
  // runs b0a3a7b or later.
  const left: number | undefined = Array.isArray(f) ? f[1] : undefined;
  if (left !== undefined && left === r.flLast) return;
  r.flLast = left;
  if (Array.isArray(f) && KINDS[f[0]] && Number.isFinite(f[1]) && f[1] > 0 && f[1] <= 2000)
    r.flop = { kind: KINDS[f[0]], until: performance.now() + f[1] };
});

// ---------------------------------------------------------------- dust (skids, splats; the shared pool, src/render/particles.ts)
const DUST = new THREE.Color(0xe8d6a6);
function puff(x: number, y: number, z: number, n: number, spread: number) {
  if (reducedMotion) return;
  for (let k = 0; k < n; k++)
    emit({
      x,
      y,
      z,
      vx: (Math.random() - 0.5) * spread,
      vy: 0.6 + Math.random() * 1.2,
      vz: (Math.random() - 0.5) * spread,
      life: 0.35 + Math.random() * 0.3,
      size: 0.12,
      alpha: 0.8,
      color: DUST,
      gravity: 6,
    });
}

// ---------------------------------------------------------------- spring layer (every avatar)
type SpringState = {
  px: number;
  py: number;
  pz: number;
  vx: number;
  vy: number;
  vz: number;
  sq: number;
  sqv: number;
  lx: number;
  lz: number;
};
const states = new WeakMap<THREE.Object3D, SpringState>();
function stateOf(a: THREE.Object3D) {
  let s = states.get(a);
  if (!s) {
    s = { px: a.position.x, py: a.position.y, pz: a.position.z, vx: 0, vy: 0, vz: 0, sq: 0, sqv: 0, lx: 0, lz: 0 };
    a.rotation.order = 'YXZ';
    states.set(a, s);
  }
  return s;
}

function spring(a: THREE.Object3D, dt: number, t: number, flopOf: () => Flop | null | undefined, isMe: boolean) {
  const s = stateOf(a);
  const k = 1 - Math.exp(-dt * 20); // smooth the velocity estimate (remote positions are interpolated)
  const nvx = (a.position.x - s.px) / dt,
    nvy = (a.position.y - s.py) / dt,
    nvz = (a.position.z - s.pz) / dt;
  const ax = (nvx - s.vx) / dt,
    az = (nvz - s.vz) / dt;
  const prevVy = s.vy;
  const prevH = Math.hypot(s.vx, s.vz);
  s.vx += (nvx - s.vx) * k;
  s.vy += (nvy - s.vy) * k;
  s.vz += (nvz - s.vz) * k;
  s.px = a.position.x;
  s.py = a.position.y;
  s.pz = a.position.z;
  // landing and takeoff kicks
  if (prevVy < -3 && s.vy > -1) {
    s.sqv += -prevVy * SPRING.landK;
    if (isMe && -prevVy > FLOP.splatSpeed) {
      startFlop('splat', FLOP.splatMs);
      puff(a.position.x, a.position.y - PLAYER_R, a.position.z, 14, 3);
    }
  } else if (prevVy < 2 && s.vy > 4) s.sqv -= SPRING.takeoffK;
  s.sqv += (-SPRING.k * s.sq - SPRING.damp * s.sqv) * dt;
  s.sq = clamp(s.sq + s.sqv * dt, -SPRING.maxSquash, SPRING.maxSquash);
  // lean toward acceleration, in the avatar's own frame (it faces -Z at yaw 0)
  const yaw = a.rotation.y;
  const fx = -Math.sin(yaw),
    fz = -Math.cos(yaw);
  const aF = ax * fx + az * fz,
    aS = ax * -fz + az * fx;
  const e = 1 - Math.exp(-dt * SPRING.leanEase);
  s.lx += (clamp(-aF * SPRING.leanK, -SPRING.maxLean, SPRING.maxLean) - s.lx) * e;
  s.lz += (clamp(-aS * SPRING.leanK, -SPRING.maxLean, SPRING.maxLean) - s.lz) * e;
  // flops
  let fy = 1,
    fxz = 1,
    wob = 0;
  const f = flopOf();
  const left = f ? (f.until - performance.now()) / 1000 : 0;
  if (f && left > 0) {
    const u = Math.min(1, left * 4); // ease out over the last quarter second
    if (f.kind === 'splat') {
      fy = 1 - 0.62 * u;
      fxz = 1 + 0.5 * u;
    } else if (f.kind === 'stomp') {
      fy = 1 - 0.5 * u;
      fxz = 1 + 0.35 * u;
    } else wob = Math.sin(t * 32) * 0.3 * u;
  }
  const sq = s.sq;
  a.scale.set((1 + sq * 0.5) * fxz, (1 - sq) * fy, (1 + sq * 0.5) * fxz);
  a.rotation.x = s.lx;
  a.rotation.z = s.lz + wob;
  // my own: bonk (a sprint stopped dead) and head-stomps from players landing on me
  if (isMe && me.body) {
    const h = Math.hypot(s.vx, s.vz);
    if (me.sprint && me.coyote > 0 && prevH - h > FLOP.bonkDrop * k && prevH > 7) startFlop('bonk', FLOP.bonkMs);
    for (const r of remotes.values()) {
      const rs = r.avatar && states.get(r.avatar);
      if (!rs) continue;
      const av = r.avatar!;
      const dy = av.position.y - a.position.y;
      if (
        rs.vy < -2.5 &&
        dy > 0.9 &&
        dy < 1.9 &&
        Math.hypot(av.position.x - a.position.x, av.position.z - a.position.z) < 0.7
      )
        startFlop('stomp', FLOP.stompMs);
    }
    // skid dust: braking hard on the ground (on a deck, against your speed on the deck)
    const w = me.wish;
    const rx = s.vx - carry.x,
      rz = s.vz - carry.z,
      rh = Math.hypot(rx, rz);
    if (me.coyote > 0 && rh > MOVE.skidSpeed && w.x * rx + w.z * rz < -0.3 * rh && Math.random() < dt * 30)
      puff(a.position.x, a.position.y - PLAYER_R + 0.05, a.position.z, 2, 1.2);
    // tumble: landing fast after jumping off a moving deck (src/physics/platforms.ts)
    if (carry.tumbles !== seenTumbles) {
      seenTumbles = carry.tumbles;
      startFlop('bonk', FLOP.bonkMs);
      puff(a.position.x, a.position.y - PLAYER_R, a.position.z, 10, 2.5);
    }
  }
}

onFrame(
  ({ dt, elapsed }) => {
    if (dt <= 0) return;
    if (me.avatar) spring(me.avatar, dt, elapsed, () => flop, true);
    for (const r of remotes.values()) if (r.avatar) spring(r.avatar, dt, elapsed, () => r.flop, false);
  },
  { phase: 'update', order: 20 },
);

window.__feel = {
  JUMP,
  MOVE,
  SPRING,
  FLOP,
  get flop() {
    return flop;
  },
};

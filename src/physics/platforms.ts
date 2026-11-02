// Platforms: kinematic bodies the local player stands on and is carried by (a wagon, the ?proto=ride flatbed).
// docs/plans/find-the-fun.md, step 2; docs/plans/boogle-2-architecture-fit.md, "The slice's one risk: riding".
//
//   registerPlatform({ body, hx, hz, top, move, id?, shared? })   -> unregister()
//     body   a BODY.KINEMATIC body, level (yaw only)
//     hx, hz the deck's half size in the body's own x and z; top: deck height above body.position
//     move(dt)  sets body.velocity and body.angularVelocity.y for the coming fixed step (called first in every step,
//               so the carry below reads this step's motion, never last step's)
//     id, shared  shared: true when every tab computes this platform's pose identically (the wagon's cars, from
//               shared time), with a stable id ('wagon:car1'). A rider on one sends their offset in its frame
//               (presence key `riding`, src/netplay/net.ts) and other tabs draw them on their own copy, so they stay
//               put on the deck instead of trailing it by the presence delay. The ?proto=ride flatbed is per tab: not
//               shared.
//   platformById(id), toPlatform(p, pos, yaw, out), fromPlatform(p, local, interpolated, out): that frame's maths
//   carry       the velocity the player's steering is relative to (src/physics/physics.ts adds it to the target):
//               the deck point under you while you stand on it, kept through the air when you jump or walk off, and
//               bled away once you land on plain ground or water (a short skid; landing fast counts a tumble)
//   carry.spin  yaw (radians) the deck turned under you since the last frame; player.ts turns you and the camera by it
//
// Riding works in the deck's frame: the player's velocity is the deck point's velocity plus the steered part, so
// Rapier moves body and deck together (zero friction, no sliding) and jumping off keeps the deck's speed for free.
import { FIXED, PLAYER_R } from '../constants.ts';
import { angleLerp } from '../math.ts';
import { onPreStep, stepAlpha, type Body } from './engine.ts';

export type Platform = {
  body: Body;
  hx: number;
  hz: number;
  top: number;
  move: (dt: number) => void;
  id?: string;
  shared?: boolean;
};
/** A pose in a platform's frame (x, y, z from the body's centre, along its own axes; yaw relative to its yaw). */
export type Local = { x: number; y: number; z: number; yaw: number };

export const CARRY = {
  boardS: 0.12, // s: the carry blends from what you had to the deck's speed (no snap when you land on a moving deck)
  edge: 0.2, // m past the deck's edge that still counts as on it (the body is a sphere)
  above: 0.15, // m of air under the feet that still counts as standing (then the snap pulls you down)
  below: 0.3, // m sunk into the deck that still counts (the contact pushes you out)
  leaveVy: 1, // m/s up relative to the deck: you jumped
  skid: 9, // m/s² the kept carry bleeds away once you land on plain ground
  tumbleSpeed: 3, // m/s of kept carry on landing that counts as a tumble
};

const platforms: Platform[] = [];
export const carry = {
  x: 0,
  y: 0,
  z: 0,
  spin: 0,
  on: null as Platform | null,
  tumbles: 0, // counts landings at speed off a deck (src/features/feel.ts flops on a change)
};
let boardT = 0,
  fromX = 0,
  fromZ = 0,
  airborne = false;

const prevYaw = new Map<Platform, number>(); // each platform's yaw before the last fixed step, for drawing between
export function registerPlatform(p: Platform) {
  platforms.push(p);
  prevYaw.set(p, yawOf(p.body.quaternion));
  return () => {
    const k = platforms.indexOf(p);
    if (k >= 0) platforms.splice(k, 1);
    prevYaw.delete(p);
    if (carry.on === p) carry.on = null;
  };
}
export const platformById = (id: string) => platforms.find((p) => p.id === id) ?? null;

// A world pose (position, yaw) in p's frame, at the body's current (fixed-step) pose.
export function toPlatform(p: Platform, at: { x: number; y: number; z: number }, yaw: number, out: Local) {
  const q = p.body.position,
    py = yawOf(p.body.quaternion);
  const rx = at.x - q.x,
    rz = at.z - q.z,
    c = Math.cos(py),
    s = Math.sin(py);
  out.x = rx * c - rz * s;
  out.y = at.y - q.y;
  out.z = rx * s + rz * c;
  out.yaw = yaw - py;
  return out;
}
// The world pose of a point in p's frame: at the body's fixed-step pose, or interpolated the way meshes draw it.
export function fromPlatform(p: Platform, l: Local, interpolated: boolean, out: Local) {
  const q = interpolated ? p.body.interpolatedPosition : p.body.position;
  const yaw = yawOf(p.body.quaternion),
    py = interpolated ? angleLerp(prevYaw.get(p) ?? yaw, yaw, stepAlpha()) : yaw;
  const c = Math.cos(py),
    s = Math.sin(py);
  out.x = q.x + l.x * c + l.z * s;
  out.y = q.y + l.y;
  out.z = q.z - l.x * s + l.z * c;
  out.yaw = py + l.yaw;
  return out;
}

export const yawOf = (q: { x: number; y: number; z: number; w: number }) =>
  Math.atan2(2 * (q.w * q.y + q.x * q.z), 1 - 2 * (q.y * q.y + q.x * q.x));

// Module-level, so it runs before the player's controller hook (installed later, from main.ts).
onPreStep(() => {
  for (const p of platforms) {
    prevYaw.set(p, yawOf(p.body.quaternion));
    p.move(FIXED);
  }
});

// The deck the body stands on, with its feet gap (m, + = air below), or null.
let gap = 0;
function deckUnder(b: Body) {
  for (const p of platforms) {
    const q = p.body.position,
      yaw = yawOf(p.body.quaternion);
    const rx = b.position.x - q.x,
      rz = b.position.z - q.z;
    const c = Math.cos(yaw),
      s = Math.sin(yaw);
    const lx = rx * c - rz * s,
      lz = rx * s + rz * c;
    if (Math.abs(lx) > p.hx + CARRY.edge || Math.abs(lz) > p.hz + CARRY.edge) continue;
    const g = b.position.y - PLAYER_R - (q.y + p.top);
    if (g > CARRY.above || g < -CARRY.below) continue;
    if (b.velocity.y - p.body.velocity.y > CARRY.leaveVy) continue;
    gap = g;
    return p;
  }
  return null;
}

// Once per fixed step, before the player's steering (src/physics/physics.ts). me.coyote > 0: on some ground.
export function carryStep(b: Body, me: { coyote: number; swimming: boolean }) {
  const p = deckUnder(b);
  if (p) {
    const v = p.body.velocity,
      q = p.body.position;
    // The deck point under you over this step: its centre's motion plus your offset turned by its yaw (the chord, so
    // corners don't fling you outward).
    const th = p.body.angularVelocity.y * FIXED;
    const rx = b.position.x - q.x,
      rz = b.position.z - q.z;
    const c = Math.cos(th),
      s = Math.sin(th);
    const px = v.x + (rx * c + rz * s - rx) / FIXED,
      pz = v.z + (-rx * s + rz * c - rz) / FIXED;
    if (carry.on !== p) {
      carry.on = p;
      boardT = 0;
      fromX = carry.x;
      fromZ = carry.z;
    }
    boardT += FIXED;
    const w = Math.min(1, boardT / CARRY.boardS);
    carry.x = fromX + (px - fromX) * w;
    carry.z = fromZ + (pz - fromZ) * w;
    carry.y = v.y;
    carry.spin += th;
    airborne = false;
    // Snapped to the floor: ride the deck's vertical motion, and close a small gap (a dip, a stop) instead of
    // floating off it and dropping back.
    b.velocity.y = v.y - (Math.max(0, gap) * 0.5) / FIXED;
    me.coyote = Math.max(me.coyote, 0.1);
    return;
  }
  carry.on = null;
  carry.y = 0;
  const h = Math.hypot(carry.x, carry.z);
  if (me.coyote <= 0 && !me.swimming) {
    if (h > 0) airborne = true; // left a deck: keep its speed through the air
    return;
  }
  if (airborne && h > CARRY.tumbleSpeed) carry.tumbles++;
  airborne = false;
  if (h === 0) return;
  const k = Math.max(0, h - CARRY.skid * FIXED) / h;
  carry.x *= k;
  carry.z *= k;
}

window.__carry = { CARRY, carry };

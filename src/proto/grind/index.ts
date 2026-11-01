// Grind the laid rails (docs/research/ratchet-and-clank-feel.md rec 5; behind ?proto=wagon&grind=1, loaded by the
// wagon prototype, src/proto/wagon/index.ts). Land on a laid section while falling, near its centreline and heading
// roughly along it, and you lock onto the track: speed eases toward sprint speed (plus gravity on the grade), pulling
// back reverses at once, jump leaves at any time with the rail's speed, the railhead flings you off into the existing
// tumble flop, and meeting the wagon on the line is a bonk. Sideways stance, sparks, a hiss that rises with speed, a
// clack per rail joint, and a camera that drops a little and looks ahead along the rail.
// Serves DESIGN.md 1 (moving around is a toy) and 10 (slapstick over precision).
// Owner kind for your own body (Local otherwise): other tabs see you through your normal presence (position, yaw), and
// your flops through `fl` (src/features/feel.ts). Runs after the controller's step hook (a lazy module's onPreStep
// registers after main.ts installs it), so it has the last word on your velocity while you grind.
import * as THREE from 'three/webgpu';
import { onFrame } from '../../loop.ts';
import { onPreStep, getMask, setMask, raycastClosest, rayHit, type Body } from '../../physics/engine.ts';
import { GROUP } from '../../physics/physics.ts';
import { carry } from '../../physics/platforms.ts';
import { FIXED, GRAVITY, PLAYER_MASS, PLAYER_R, reducedMotion } from '../../constants.ts';
import { angleLerp, clamp } from '../../math.ts';
import { groundHeight } from '../../adapters/terrain.ts';
import { me, cam } from '../../player/player.ts';
import { camera } from '../../render/scene.ts';
import { emit } from '../../render/particles.ts';
import { getAudio } from '../../render/audio.ts';
import { ROUTE } from '../../sim/route.ts';
import { protoMark } from '../mark.ts';

export const GRIND = {
  catchR: 0.7, // m from the centreline that still catches you
  catchDeg: 50, // your heading within this of the track's direction (either way)
  catchAbove: 0.25, // m: the feet this far over the railhead, falling, lock on (or this far under, mid-step)
  minSpeed: 6, // m/s along the rail on entry, at least
  cruise: 9, // m/s the ride eases toward (sprint speed) ...
  ease: 4, // ... at this many m/s²
  cap: 13, // m/s
  snapS: 0.08, // s: the time constant you slide onto the centreline with
  railTop: 0.2, // m over the ground (the rails in src/features/track-machine.ts: 0.16 + half their 0.08)
  joint: 4.5, // m between rail joints (as the wagon's, src/proto/wagon/index.ts)
  reboardS: 0.25, // s after leaving before the rail catches you again
  flyUp: 3, // m/s of lift off the railhead, so you fly a little before the tumble
  bonk: { back: 4, up: 4.5 }, // m/s: knocked back off the rail by the wagon
  wagonGap: 1, // m between the rail point under you and a car's end that counts as meeting it (your body is 0.45)
  sparks: [20, 40], // per second at minSpeed and at cap
  camAhead: 3, // m ahead along the rail the camera looks
  camDrop: 0.5, // m the camera drops
  camYaw: 2.5, // 1/s: the camera swings behind your travel
};

export type GrindHooks = {
  /** Sections laid (the line runs from ROUTE[0] to the end of section laid-1). */
  laid: () => number;
  /** The wagon's cars on the line now: each centre's distance along it (m) and half length. */
  cars: () => { d: number; hz: number }[];
};

// ---------------------------------------------------------------- the line, as the wagon measures it
const SEG = ROUTE.map((r) => {
  const len = Math.round(Math.hypot(r.to[0] - r.x, r.to[1] - r.z) * 100) / 100;
  return { x: r.x, z: r.z, ux: (r.to[0] - r.x) / len, uz: (r.to[1] - r.z) / len, len };
});
const AT: number[] = [];
SEG.reduce((at, s) => (AT.push(at), at + s.len), 0);
const lengthOf = (n: number) => (n > 0 ? AT[n - 1] + SEG[n - 1].len : 0);
const segAt = (d: number, n: number) => {
  let k = 0;
  while (k < n - 1 && d > AT[k + 1]) k++;
  return k;
};
// The point d m along the line (straight on past either end) and the line's direction there.
function lineAt(d: number, n: number) {
  const k = segAt(d, n),
    s = SEG[k],
    u = d - AT[k];
  return { x: s.x + s.ux * u, z: s.z + s.uz * u, ux: s.ux, uz: s.uz };
}
const railY = (x: number, z: number) => groundHeight(x, z) + GRIND.railTop;
// The closest point of the laid line to (x, z): distance along it and sideways from it.
function nearest(x: number, z: number, n: number) {
  let best = { d: 0, side: Infinity };
  for (let k = 0; k < n; k++) {
    const s = SEG[k];
    const u = clamp((x - s.x) * s.ux + (z - s.z) * s.uz, 0, s.len);
    const side = Math.hypot(x - (s.x + s.ux * u), z - (s.z + s.uz * u));
    if (side < best.side) best = { d: AT[k] + u, side };
  }
  return best;
}

// ---------------------------------------------------------------- state
const ray = { from: { x: 0, y: 0, z: 0 }, to: { x: 0, y: 0, z: 0 }, hit: rayHit() };
const g = {
  on: false,
  d: 0, // m along the line
  dir: 1, // +1: away from the first site
  s: 0, // m/s along the rail
  vx: 0, // the rail's velocity this step
  vy: 0,
  vz: 0,
  boarded: 0, // steps since boarding
  armed: true, // pulling back reverses (re-armed when the stick is let go)
  cool: 0,
  joints: 0, // joints crossed (the frame hook clacks the difference)
  clacked: 0,
  reversed: 0, // reversals (a screech and a spray)
  shown: 0,
  landed: 0, // boardings (a burst of sparks and a clank)
  landShown: 0,
  mask: 0, // your body's collision mask before boarding
  left: '', // why you last left: jump, end or bonk
};

export function grind(hooks: GrindHooks) {
  function leave(b: Body, why: 'jump' | 'end' | 'bonk') {
    g.on = false;
    g.left = why;
    setMask(b, g.mask);
    g.cool = GRIND.reboardS;
    if (why === 'bonk') {
      const away = -g.dir; // the car was ahead
      const t = lineAt(g.d, hooks.laid());
      b.velocity.x = t.ux * away * GRIND.bonk.back;
      b.velocity.z = t.uz * away * GRIND.bonk.back;
      b.velocity.y = GRIND.bonk.up;
      carry.x = b.velocity.x * 0.7; // the knock carries through the air (under the tumble's 3 m/s: a bonk, no tumble)
      carry.z = b.velocity.z * 0.7;
      carry.bonks++;
      protoMark('bonk');
      sfx('bonk');
      burst(14);
      return;
    }
    // Keep the rail's speed through the air (steering is relative to carry, as off a moving deck), so landing on the
    // ground at speed is the tumble flop (src/physics/platforms.ts).
    b.velocity.x = g.vx;
    b.velocity.z = g.vz;
    if (why === 'end') b.velocity.y = Math.max(g.vy, 0) + GRIND.flyUp;
    carry.x = g.vx;
    carry.z = g.vz;
    me.coyote = 0;
  }

  function tryBoard(b: NonNullable<typeof me.body>) {
    const n = hooks.laid();
    if (!n || g.cool > 0 || me.swimming || me.coyote > 0 || b.velocity.y > 0.5) return;
    const p = b.position;
    const near = nearest(p.x, p.z, n);
    const L = lengthOf(n);
    if (near.side > GRIND.catchR || near.d < 0.3 || near.d > L - 0.3) return;
    const t = lineAt(near.d, n);
    const feet = p.y - PLAYER_R - railY(p.x, p.z);
    if (feet > GRIND.catchAbove || feet < -GRIND.catchAbove - 0.1) return;
    // Heading: your horizontal velocity, or where you face when you are nearly still.
    let hx = b.velocity.x,
      hz = b.velocity.z;
    if (Math.hypot(hx, hz) < 1) {
      hx = -Math.sin(me.yaw);
      hz = -Math.cos(me.yaw);
    }
    const h = Math.hypot(hx, hz);
    const along = (hx * t.ux + hz * t.uz) / h;
    if (Math.abs(along) < Math.cos((GRIND.catchDeg * Math.PI) / 180)) return;
    g.on = true;
    me.coyote = 0.1;
    g.mask = getMask(b);
    setMask(b, g.mask & ~GROUP.SCENERY); // the rail is your ground: pass through signs and bumps beside it
    g.d = near.d;
    g.dir = Math.sign(along);
    g.s = Math.max(GRIND.minSpeed, Math.abs(b.velocity.x * t.ux + b.velocity.z * t.uz));
    g.boarded = 0;
    g.armed = Math.hypot(me.wish.x, me.wish.z) < 0.2 || (me.wish.x * t.ux + me.wish.z * t.uz) * g.dir > -0.2;
    g.joints = Math.floor(g.d / GRIND.joint);
    g.clacked = g.joints;
    g.vy = 0;
    g.landed++;
    // This step's carry stays 0, so platforms.ts sees an ordinary landing (no tumble) before the rail sets it.
    carry.x = carry.z = 0;
  }

  function ride(b: NonNullable<typeof me.body>) {
    const n = hooks.laid();
    const L = lengthOf(n);
    if (!n || g.d > L) return leave(b, 'end');
    // The controller jumped this step (we keep you "on the ground" while grinding): off you go, with the rail's speed.
    if (me.coyote <= 0) return leave(b, 'jump'); // it zeroes the 0.1 we set below
    let t = lineAt(g.d, n);
    // Pull back to reverse, at once; again only after the stick has been let go.
    const wl = Math.hypot(me.wish.x, me.wish.z);
    if (wl < 0.2) g.armed = true;
    else if (g.armed && ((me.wish.x * t.ux + me.wish.z * t.uz) * g.dir) / wl < -0.5) {
      g.dir = -g.dir;
      g.armed = false;
      g.reversed++;
    }
    // Speed: ease toward cruise, gravity along the grade, capped; a slope that stops you sends you back down.
    const y0 = railY(t.x, t.z);
    const ahead = lineAt(clamp(g.d + 0.5 * g.dir, 0, L), n);
    const grade = (railY(ahead.x, ahead.z) - y0) / 0.5; // rise per metre, in your direction
    const sin = grade / Math.sqrt(1 + grade * grade);
    g.s += clamp(GRIND.cruise - g.s, -GRIND.ease * FIXED, GRIND.ease * FIXED) - GRAVITY * sin * FIXED;
    if (g.s < 0) {
      g.s = -g.s;
      g.dir = -g.dir;
    }
    g.s = Math.min(g.s, GRIND.cap);
    const dh = (g.s / Math.sqrt(1 + grade * grade)) * FIXED;
    const next = g.d + g.dir * dh;
    // The wagon on the line: a bonk if you run into a car (or it into you).
    for (const c of hooks.cars()) {
      const gap = Math.abs(next - c.d) - c.hz - GRIND.wagonGap;
      if (gap < 0) {
        g.dir = Math.sign(c.d - g.d) || g.dir; // knocked away from it, whichever end
        return leave(b, 'bonk');
      }
    }
    // Anything else moved by code or a player in the way (the track machine parked on the line, a friend): a bonk too.
    const p0 = b.position,
      mx = t.ux * g.dir,
      mz = t.uz * g.dir;
    for (const up of [-0.3, 0, 0.5]) {
      ray.from.x = p0.x + mx * (PLAYER_R + 0.05);
      ray.from.y = p0.y + up;
      ray.from.z = p0.z + mz * (PLAYER_R + 0.05);
      ray.to.x = ray.from.x + mx * (dh + 0.3);
      ray.to.y = ray.from.y;
      ray.to.z = ray.from.z + mz * (dh + 0.3);
      if (raycastClosest(ray.from, ray.to, { mask: GROUP.DEFAULT }, ray.hit)) return leave(b, 'bonk');
    }
    if (next < 0 || next > L) {
      g.vx = t.ux * g.dir * (dh / FIXED);
      g.vz = t.uz * g.dir * (dh / FIXED);
      g.vy = grade * (dh / FIXED);
      return leave(b, 'end');
    }
    // Where you'll be: the next rail point, with any sideways or vertical offset from it decaying (the snap on).
    const p = b.position;
    const ex = p.x - t.x,
      ez = p.z - t.z,
      ey = p.y - (y0 + PLAYER_R);
    t = lineAt(next, n);
    const keep = Math.exp(-FIXED / GRIND.snapS);
    const tx = t.x + ex * keep,
      tz = t.z + ez * keep,
      ty = railY(t.x, t.z) + PLAYER_R + ey * keep;
    b.velocity.set((tx - p.x) / FIXED, (ty - p.y) / FIXED, (tz - p.z) / FIXED);
    b.force.set(0, PLAYER_MASS * GRAVITY, 0); // no gravity this step: the rail holds you
    g.vx = t.ux * g.dir * (dh / FIXED);
    g.vz = t.uz * g.dir * (dh / FIXED);
    g.vy = b.velocity.y;
    if (g.boarded++ > 0) {
      carry.x = g.vx; // you stand still on the rail as it carries you: idle pose, no skid dust
      carry.z = g.vz;
    }
    me.coyote = 0.1; // grounded: jump works, and the double jump (src/proto/moves/) resets
    g.d = next;
    g.joints = Math.floor(g.d / GRIND.joint);
  }

  onPreStep(() => {
    const b = me.body;
    if (!b) return;
    g.cool -= FIXED;
    if (!g.on) tryBoard(b);
    if (g.on) ride(b);
  });

  // ---------------------------------------------------------------- feel
  const SPARK = new THREE.Color(1.6, 0.42, 0.06),
    SPARK2 = new THREE.Color(2, 1.1, 0.3);
  const v3 = new THREE.Vector3();
  let sparkDue = 0,
    blend = 0; // 0..1: the grind camera and stance, eased in and out
  // One spark: a short streak of three dots along its flight, flung back and up off the railhead at your feet.
  function spark(side: number, kick: number) {
    const b = me.body!;
    const p = b.interpolatedPosition;
    const nx = -g.vz / (g.s || 1),
      nz = g.vx / (g.s || 1); // sideways
    const vx = -g.vx * 0.3 + (Math.random() - 0.5) * 2.4 * kick + nx * side * 0.8,
      vy = 1.2 + Math.random() * 2.4 * kick,
      vz = -g.vz * 0.3 + (Math.random() - 0.5) * 2.4 * kick + nz * side * 0.8;
    const life = 0.2 + Math.random() * 0.1,
      color = Math.random() < 0.3 ? SPARK2 : SPARK;
    for (let k = 0; k < 3; k++)
      emit({
        x: p.x + nx * side * 0.45 - vx * k * 0.012,
        y: p.y - PLAYER_R + 0.03 - vy * k * 0.012,
        z: p.z + nz * side * 0.45 - vz * k * 0.012,
        vx,
        vy,
        vz,
        life: life - k * 0.03,
        size: 0.2 - k * 0.05,
        color,
        gravity: 14,
        shrink: 0.5,
      });
  }
  function burst(k: number) {
    if (reducedMotion || !me.body) return;
    for (let i = 0; i < k; i++) spark(i % 2 ? 1 : -1, 1.6);
  }

  // A band-passed hiss of noise while you grind, its pitch and level following your speed.
  let hiss: { src: AudioBufferSourceNode; bp: BiquadFilterNode; gain: GainNode } | null = null;
  function hissOn(on: boolean) {
    const a = getAudio();
    if (!a) return;
    const { ctx, out } = a;
    if (on && !hiss) {
      const buf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
      const src = ctx.createBufferSource();
      src.buffer = buf;
      src.loop = true;
      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.Q.value = 4;
      const gain = ctx.createGain();
      gain.gain.value = 0;
      src.connect(bp).connect(gain).connect(out);
      src.start();
      hiss = { src, bp, gain };
    } else if (!on && hiss) {
      const h = hiss;
      hiss = null;
      h.gain.gain.setTargetAtTime(0, ctx.currentTime, 0.04);
      h.src.stop(ctx.currentTime + 0.3);
    }
  }
  function sfx(kind: 'clack' | 'bonk' | 'land' | 'screech') {
    const a = getAudio();
    if (!a) return;
    const { ctx, out } = a;
    const t = ctx.currentTime + 0.005;
    const gn = ctx.createGain();
    gn.connect(out);
    const o = ctx.createOscillator();
    o.connect(gn);
    const [type, f0, f1, vol, len] = {
      clack: ['square', 260, 90, 0.07, 0.05],
      land: ['square', 520, 160, 0.1, 0.09],
      screech: ['sawtooth', 1800, 900, 0.05, 0.18],
      bonk: ['triangle', 300, 70, 0.3, 0.25],
    }[kind] as [OscillatorType, number, number, number, number];
    o.type = type;
    o.frequency.setValueAtTime(f0 * (0.92 + Math.random() * 0.16), t);
    o.frequency.exponentialRampToValueAtTime(f1, t + len * 0.8);
    gn.gain.setValueAtTime(vol, t);
    gn.gain.exponentialRampToValueAtTime(0.001, t + len);
    o.start(t);
    o.stop(t + len + 0.02);
  }

  // Stance: sideways to the rail (yours, sent with your presence, so others see it too).
  onFrame(
    ({ dt }) => {
      if (!g.on || !me.avatar) return;
      const travel = Math.atan2(-g.vx, -g.vz);
      me.yaw = angleLerp(me.yaw, travel + Math.PI / 2, 1 - Math.exp(-dt * 20));
      me.avatar.rotation.y = me.yaw;
    },
    { phase: 'update', order: -5 },
  );

  onFrame(
    ({ dt }) => {
      const b = me.body;
      blend = clamp(blend + (g.on ? dt : -dt) / 0.25, 0, 1);
      hissOn(g.on);
      if (!b) return;
      if (g.landShown !== g.landed) {
        g.landShown = g.landed;
        sfx('land');
        burst(10);
      }
      if (!g.on) return;
      const u = clamp((g.s - GRIND.minSpeed) / (GRIND.cap - GRIND.minSpeed), 0, 1);
      if (hiss) {
        const a = getAudio()!;
        hiss.bp.frequency.setTargetAtTime(1400 + g.s * 260, a.ctx.currentTime, 0.05);
        hiss.gain.gain.setTargetAtTime(0.05 + 0.1 * u, a.ctx.currentTime, 0.05);
      }
      if (g.clacked !== g.joints) {
        g.clacked = g.joints;
        sfx('clack');
      }
      if (g.shown !== g.reversed) {
        g.shown = g.reversed;
        sfx('screech');
        burst(12);
      }
      if (reducedMotion) return;
      sparkDue += dt * (GRIND.sparks[0] + (GRIND.sparks[1] - GRIND.sparks[0]) * u);
      for (; sparkDue >= 1; sparkDue--) spark(Math.random() < 0.5 ? 1 : -1, 1);
      // The camera swings in behind your travel.
      cam.yaw = angleLerp(cam.yaw, Math.atan2(-g.vx, -g.vz), 1 - Math.exp(-dt * GRIND.camYaw));
    },
    { phase: 'update', order: 8 },
  );

  // The camera: dropped a little, looking a few metres ahead along the rail (after player.ts places it).
  const look = new THREE.Vector3(),
    fwd = new THREE.Vector3();
  onFrame(
    () => {
      const b = me.body;
      if (blend <= 0 || !b) return;
      const n = hooks.laid();
      const e = blend * blend * (3 - 2 * blend);
      camera.position.y -= GRIND.camDrop * e;
      camera.getWorldDirection(fwd);
      look.copy(camera.position).addScaledVector(fwd, 9);
      if (n) {
        const p = b.interpolatedPosition;
        const t = lineAt(clamp(g.d + g.dir * GRIND.camAhead, 0, lengthOf(n)), n);
        v3.set(t.x, p.y + 0.6, t.z);
        look.lerp(v3, e);
      }
      camera.lookAt(look);
    },
    { phase: 'update', order: 9 },
  );

  window.__grind = { GRIND, g };
  return { active: () => g.on };
}

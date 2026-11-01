// Haul variant `v=magnet` (?room=proto-haul&proto=haul&v=magnet; docs/game-design/haul.md): today's back-bundle loop
// with Ratchet & Clank bolt pickups (docs/research/ratchet-and-clank-feel.md recs 1-3). Asks: does collecting logs
// feel like collecting bolts?
//   1. Magnet: piles notice you from 3 m (`&reach=`, haul-variant.ts); each piece pauses, lifts, then homes on the top
//      of your bundle, speeding up, curving sideways, spinning, shrinking to the bundle's scale, 40 ms apart.
//   2. One tick per piece as it lands (magnet-sound.ts); the chip's number moves with each landing, then settles on
//      the host's count.
//   3. Take logs spills the bundle's logs out in a fan: one bounce, a short rest, then the magnet takes them.
// Only the look and sound change: pickups are the same `pile.take` / `src.take` ops, sent when they always were.
// Local only. Serves DESIGN.md 1 (toys before chores: picking up is the fun part) and 10 (slapstick: logs pop out).
import * as THREE from 'three/webgpu';
import { rules } from '../../world/game-world.ts';
import { onFrame } from '../../loop.ts';
import { identity } from '../../player/identity.ts';
import { me } from '../../player/player.ts';
import { reducedMotion } from '../../constants.ts';
import { groundHeight } from '../../adapters/terrain.ts';
import { pieceMesh, pieceColor, commitPieces, onFly, PIECE } from '../../render/haul-pieces.ts';
import { emit } from '../../render/particles.ts';
import { onApplied } from '../../world/sync.ts';
import { net } from '../../netplay/net.ts';
import { outQuad, inOutSine } from '../../render/motion.ts';
import { backSeam, myBundleNext, BUNDLE_SCALE } from '../../features/haul-stack.ts';
import { squash } from './pickup-feel.ts';
import { arrivalTick, burstChord } from './magnet-sound.ts';

// ---------------------------------------------------------------- tuning (window.__magnet.T in the console)
const T = {
  notice: [50, 70], // ms a piece pauses and lifts before it flies
  lift: [0.3, 0.5], // m
  v0: 2, // m/s as it sets off
  accel: 60, // m/s²
  vMax: 16, // m/s: about 1.7× sprint, so pieces always catch you
  bow: 0.6, // m sideways at the middle of the flight, alternating sides
  stagger: 40, // ms between pieces
  drawn: 8, // pieces drawn per pickup (the rest are counted)
  spin: [2, 3], // turns/s
  settle: 0.5, // m: within this the spin eases into the bundle's orientation
  // spill (Take logs)
  up: [4, 4.5], // m/s (rec 3: 4-5; the low end keeps E to the last tick near a second)
  out: [1.5, 2.5], // m/s
  fan: 0.7, // rad either side of the way to you
  tumble: [6, 10], // rad/s while spilling
  g: 18, // m/s² (the player's gravity)
  bounce: 0.3, // restitution of the one bounce
  rest: [120, 160], // ms lying on the ground before the magnet takes it
  // ticks for pieces that aren't drawn (rec 9): up to 12 ticks a burst, the rest at 45 ms, then counted silently
  maxTicks: 12,
  fastMs: 45,
};
const rnd = ([a, b]: number[]) => a + Math.random() * (b - a);

// A pickup's pieces. `counted`: the host has added them to your stack (a Take flies on apply, a pile when it answers);
// `early`: how many landed before it did.
type Burst = { n: number; drawn: number; landed: number; counted: boolean; early: number };
type Piece = {
  phase: 'spill' | 'rest' | 'wait' | 'notice' | 'home';
  until: number; // ms the current phase ends (spill and home end on events)
  pos: THREE.Vector3; // drawn position (home: the straight-line base, before the bow)
  vel: THREE.Vector3; // spill velocity
  from: THREE.Vector3; // where the notice lift started
  lift: number;
  speed: number;
  d0: number;
  side: number;
  bowDir: THREE.Vector3;
  axis: THREE.Vector3;
  rate: number; // rad/s
  angle: number;
  floor: number;
  bounced: boolean;
  burst: Burst;
};
const pieces: Piece[] = [];
const MAX = 24;
const mesh = pieceMesh(MAX);

// The count your chip and bundle show: the host's, less what it counted that hasn't landed yet (`behind`), plus what
// landed that it hasn't counted yet (`ahead`). Pours and drops go straight through. A pile take the host never
// applies (refused) is let go 1.5 s after the last landing.
let behind = 0,
  ahead = 0;
const waiting: Burst[] = []; // pile bursts the host hasn't counted yet, oldest first
let lastLanding = -1e9;
let squashed = -1e9;
const fast: { at: number; b: Burst; add: number; chord: boolean }[] = []; // queued landings of undrawn pieces
const hostN = () => (identity.pid ? rules.stacks.count(identity.pid) : 0);
backSeam.flyIns = false;
backSeam.count = (n) => Math.max(0, n - behind + ahead);
onApplied((e: { op: string; p: string }, _tick: number, r: { n?: number } | null) => {
  if (e.op !== 'pile.take' || !r?.n || e.p !== (net.room?.selfId ?? 'local')) return;
  const b = waiting.shift();
  if (!b) return;
  b.counted = true;
  ahead -= b.early;
  behind += Math.max(0, r.n - b.early);
});

let sideFlip = 1;
onFly((from, n, spill) => {
  if (n <= 0) return;
  const now = performance.now();
  const drawn = Math.min(n, T.drawn, MAX - pieces.length);
  const burst: Burst = { n, drawn, landed: 0, counted: !!spill, early: 0 };
  if (spill) behind += n;
  else waiting.push(burst);
  if (!drawn) return landRest(burst, n, 0, now);
  const toMe = me.body ? Math.atan2(me.body.position.x - from.x, me.body.position.z - from.z) : 0;
  for (let m = 0; m < drawn; m++) {
    const p: Piece = {
      phase: 'wait',
      until: now + m * T.stagger,
      pos: new THREE.Vector3(),
      vel: new THREE.Vector3(),
      from: new THREE.Vector3(),
      lift: rnd(T.lift),
      speed: T.v0,
      d0: 1,
      side: (sideFlip = -sideFlip),
      bowDir: new THREE.Vector3(),
      axis: new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize(),
      rate: rnd(T.spin) * Math.PI * 2,
      angle: Math.random() * 6,
      floor: from.y + PIECE.r,
      bounced: false,
      burst,
    };
    if (spill && !reducedMotion) {
      // out of the bundle in a fan toward you, tumbling
      const a = toMe + (drawn > 1 ? (m / (drawn - 1) - 0.5) * 2 * T.fan : 0) + (Math.random() - 0.5) * 0.2;
      const s = rnd(T.out);
      p.phase = 'spill';
      p.until = now;
      p.pos.set(from.x, from.y + 0.25, from.z);
      p.vel.set(Math.sin(a) * s, rnd(T.up), Math.cos(a) * s);
      p.rate = rnd(T.tumble);
    } else {
      // a ground pile: the pieces sit where its heap was until their turn
      const r = Math.random() * 0.35,
        a = Math.random() * 6.3;
      p.pos.set(
        from.x + Math.cos(a) * r,
        from.y + PIECE.r + Math.floor(m / 4) * PIECE.r * 1.8,
        from.z + Math.sin(a) * r,
      );
    }
    pieces.push(p);
  }
});

// One piece reached your back: the chip and bundle go up by `add`, and it ticks (and closes the burst with a chord).
function step(b: Burst, add: number, tick: boolean, chord: boolean): void {
  if (b.counted) behind = Math.max(0, behind - add);
  else {
    ahead += add;
    b.early += add;
  }
  lastLanding = performance.now();
  if (tick) arrivalTick();
  if (chord) burstChord();
}
// A drawn piece landed. After a burst's last drawn piece, the undrawn rest tick in at a fixed cadence up to 12 ticks
// for the burst, and whatever is left after that is counted with the last one.
function land(b: Burst, now: number): void {
  b.landed++;
  if (now - squashed >= 140) {
    squashed = now;
    squash();
  }
  const rest = b.landed === b.drawn ? b.n - b.drawn : 0;
  step(b, 1, true, b.landed === b.drawn && !rest && b.n >= 4);
  if (rest) landRest(b, rest, b.drawn, now);
}
function landRest(b: Burst, rest: number, ticked: number, now: number): void {
  const chord = b.n >= 4;
  const ticks = Math.min(rest, Math.max(0, T.maxTicks - ticked));
  if (!ticks) return step(b, rest, false, chord);
  for (let k = 0; k < ticks; k++) {
    const last = k === ticks - 1;
    fast.push({ at: now + (k + 1) * T.fastMs, b, add: last ? rest - k : 1, chord: chord && last });
  }
}

function puff(x: number, y: number, z: number) {
  if (reducedMotion) return;
  for (let k = 0; k < 3; k++)
    emit({
      x,
      y,
      z,
      vx: (Math.random() - 0.5) * 1.4,
      vy: 0.5 + Math.random() * 0.8,
      vz: (Math.random() - 0.5) * 1.4,
      life: 0.3,
      size: 0.1,
      alpha: 0.7,
      color: DUST,
      gravity: 5,
      fade: 0.5,
    });
}
const DUST = new THREE.Color(0xe8d6a6);

const target = new THREE.Vector3(),
  bundleRot = new THREE.Quaternion(),
  q = new THREE.Quaternion(),
  dir = new THREE.Vector3(),
  at = new THREE.Vector3(),
  sc = new THREE.Vector3(),
  m4 = new THREE.Matrix4(),
  UP = new THREE.Vector3(0, 1, 0);
let lastNow = 0;

onFrame(
  ({ now }: { now: number }) => {
    const dt = Math.min(0.05, Math.max(0, (now - (lastNow || now)) / 1000));
    lastNow = now;
    while (fast.length && now >= fast[0].at) {
      const f = fast.shift()!;
      step(f.b, f.add, true, f.chord);
    }
    const host = hostN();
    if (!pieces.length && !fast.length && (behind || ahead) && (!waiting.length || now - lastLanding > 1500)) {
      behind = ahead = 0;
      waiting.length = 0;
    }

    const haveTarget = myBundleNext(backSeam.count(host), target, bundleRot);
    const color = pieceColor(Math.max(0, identity.pid ? rules.stacks.kind(identity.pid) : 0));
    let c = 0;
    for (let k = 0; k < pieces.length; k++) {
      const p = pieces[k];
      let u = 0; // 0 -> 1 over the homing flight
      if (p.phase === 'spill' && now >= p.until) {
        p.vel.y -= T.g * dt;
        p.pos.addScaledVector(p.vel, dt);
        p.angle += p.rate * dt;
        p.floor = groundHeight(p.pos.x, p.pos.z) + PIECE.r;
        if (p.pos.y <= p.floor && p.vel.y < 0) {
          p.pos.y = p.floor;
          puff(p.pos.x, p.floor - PIECE.r, p.pos.z);
          if (!p.bounced) {
            p.bounced = true;
            p.vel.y *= -T.bounce;
            p.vel.x *= 0.5;
            p.vel.z *= 0.5;
            p.rate *= 0.5;
          } else {
            p.phase = 'rest';
            p.until = now + rnd(T.rest);
          }
        }
      } else if ((p.phase === 'rest' || p.phase === 'wait') && now >= p.until) {
        p.phase = 'notice';
        p.from.copy(p.pos);
        p.until = now + rnd(T.notice);
        p.rate = rnd(T.spin) * Math.PI * 2;
      }
      if (p.phase === 'notice') {
        const w = 1 - Math.max(0, (p.until - now) / T.notice[1]);
        p.pos.copy(p.from).y += p.lift * outQuad(w);
        p.angle += p.rate * dt * w;
        if (now >= p.until) {
          p.phase = 'home';
          p.speed = T.v0;
          p.d0 = Math.max(0.3, haveTarget ? p.pos.distanceTo(target) : 1);
          dir.subVectors(target, p.pos).setY(0);
          p.bowDir.crossVectors(dir.lengthSq() > 1e-6 ? dir.normalize() : dir.set(1, 0, 0), UP).multiplyScalar(p.side);
        }
      }
      let d = Infinity;
      if (p.phase === 'home') {
        if (!haveTarget) {
          pieces.splice(k--, 1);
          land(p.burst, now);
          continue;
        }
        p.speed = Math.min(T.vMax, p.speed + T.accel * dt);
        dir.subVectors(target, p.pos);
        d = dir.length();
        const stepLen = p.speed * dt;
        if (stepLen >= d || d < 0.08) {
          pieces.splice(k--, 1);
          land(p.burst, now);
          continue;
        }
        p.pos.addScaledVector(dir, stepLen / d);
        p.angle += p.rate * dt;
        u = Math.min(1, Math.max(0, 1 - d / p.d0));
      }
      // draw: spin about its own axis, easing into the bundle's lie at the end; shrink to the bundle's scale
      q.setFromAxisAngle(p.axis, p.angle);
      if (p.phase === 'home' && d < T.settle) q.slerp(bundleRot, inOutSine(1 - d / T.settle));
      at.copy(p.pos).addScaledVector(p.bowDir, T.bow * Math.sin(Math.PI * u));
      const s = 1 + (BUNDLE_SCALE - 1) * outQuad(u);
      mesh.setMatrixAt(c, m4.compose(at, q, sc.set(s, s, s)));
      mesh.setColorAt(c++, color);
    }
    if (c || mesh.count) commitPieces(mesh, c);
  },
  { phase: 'update', order: 33 },
);

(window as unknown as { __magnet?: unknown }).__magnet = {
  T,
  pieces,
  shown: () => backSeam.count(hostN()),
};

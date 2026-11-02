// Construction you can watch (docs/game-design/haul.md, "Building"). Each work site's helper hut goes up as its Helper
// ring fills: a faint ghost of the whole hut shows from the first log, scaffolding poles rise, then the pieces of
// src/render/hut-blueprint.ts go up one after another at their own steady beat (a short pause between phases: ground,
// frame, walls, roof, topping out), as far as the ring's stock has reached. Most pieces fly in on an arc from the ring
// and settle with a little overshoot; posts drop in with a thud. Each landing plays a wooden note that steps up a
// pentatonic scale through its phase, and a phase's last piece resolves it with a chord and a ring of dust. Once the
// hut is built the sign's board swings up and the scaffolding falls over as loose poles you can kick about for a few
// seconds.
// The stage is derived from lockstep stock (every peer sees the same pieces); the motion, sounds and the fallen
// scaffold are Local. A join, a reload or a resync snaps to the stage as it is, without the drops: a hut finished
// before you came stands finished. Greybox boxes only.
// Research: docs/research/construction-you-can-watch.md (recs 1, 3-6) and procedural-animation.md (rec 4).
// Serves DESIGN.md 7 (Telegraph everything: the ghost and scaffold show the hut's size before a plank is up, and every
// pour visibly moves it on) and 9 (Leave something for the next visitor: a half-built hut says what's left to bring).
import { rules } from '../world/game-world.ts';
import * as THREE from 'three/webgpu';
import { onFrame } from '../loop.ts';
import { scene } from '../render/scene.ts';
import { emit } from '../render/particles.ts';
import { getAudio } from '../render/audio.ts';
import { arc, ring } from '../render/motion.ts';
import { addBody, createBody, material, removeBody, type Body } from '../physics/engine.ts';
import { onSnapshot } from '../world/sync.ts';
import { groundHeight, heights } from '../adapters/terrain.ts';
import { reducedMotion } from '../constants.ts';
import { me } from '../player/player.ts';
import { ROUTE, HELPER, RING_R, ringAt } from '../sim/route.ts';
import { HUT_BUILD, PHASES, PHASE_OF, buildFraction, shows, type Piece } from '../render/hut-blueprint.ts';

const OFFSET = RING_R + 1.9; // the hut's middle, metres to the +x of its Helper ring's centre
// Pacing (construction rec 1): pieces go up at their own beat, not as fast as logs pour in. The gap shrinks a little
// as the queue grows (a catch-up) but never below MIN_GAP; a phase boundary adds a short pause.
const GAP = 0.38, // seconds between one piece and the next with a short queue
  MIN_GAP = 0.24,
  CATCH_UP = 0.012, // seconds off the gap per piece waiting
  PHASE_PAUSE = 0.45;
const DROP_H = 1.8; // metres a post falls
const FALL = Math.sqrt((2 * DROP_H) / 14); // seconds to fall DROP_H (at a snappy 14 m/s²)
const FLY = 0.55; // seconds of a piece's arc from the ring
const FLY_H = 1.5; // metres the arc rises over the straight line
const SETTLE = 0.6; // the overshoot after it lands
const RISE = 0.4; // a scaffold pole growing up out of the ground
const LOOSE = 6; // seconds the fallen scaffold lies about before it goes
const HEAR = 40; // metres: no sound past this
const VOICES = 3; // landing sounds per site per 0.3 s, at most (a burst of pieces doesn't turn into noise)

// How each kind lands (procedural-animation rec 4): `fly` arcs in from the ring (else it drops), then a spring settle
// of `amp` (squash, or `tilt` radians of rocking) ringing at `hz`, dying away with damping ratio `zeta`.
type Land = { fly: boolean; amp: number; hz: number; zeta: number; tilt?: 'x' | 'z' };
const LAND: Record<Piece['kind'], Land> = {
  scaffold: { fly: false, amp: 0, hz: 1, zeta: 1 },
  sill: { fly: true, amp: 0.2, hz: 4, zeta: 0.35 },
  post: { fly: false, amp: 0.28, hz: 3.5, zeta: 0.55 }, // a thud
  plate: { fly: true, amp: 0.2, hz: 4.5, zeta: 0.3 },
  plank: { fly: true, amp: 0.28, hz: 5, zeta: 0.22 }, // a bounce
  ridge: { fly: true, amp: 0.22, hz: 4, zeta: 0.35 },
  roof: { fly: true, amp: 0.22, hz: 3.5, zeta: 0.25, tilt: 'x' }, // a flap
  sign: { fly: false, amp: 0.28, hz: 3.5, zeta: 0.55 },
  board: { fly: true, amp: 0.4, hz: 2.2, zeta: 0.18, tilt: 'z' }, // topping out: it swings
};
const arrival = (p: Piece) => (reducedMotion ? 0 : LAND[p.kind].fly ? FLY : FALL);
const DONE = Math.max(FLY, FALL) + SETTLE; // a piece is still moving this long after it starts

const COLORS: Record<Piece['kind'], string> = {
  scaffold: '#c7ced6',
  sill: '#5f4126',
  post: '#7a5532',
  plate: '#6b4a2b',
  plank: '#b08454',
  ridge: '#5a3d22',
  roof: '#8c5a3c',
  sign: '#6b4a2b',
  board: '#f4ead2',
};
const colorOf = Object.fromEntries(Object.entries(COLORS).map(([k, c]) => [k, new THREE.Color(c)])) as Record<
  Piece['kind'],
  THREE.Color
>;
const dust = new THREE.Color('#d8c8a6');
const phaseIx = HUT_BUILD.map((p) => PHASES.indexOf(PHASE_OF[p.kind]));
const lastOfPhase = HUT_BUILD.map((_, k) => phaseIx[k + 1] !== phaseIx[k]); // the piece that completes its phase

const geo = new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0); // a unit box standing on its base
const mat = new THREE.MeshStandardNodeMaterial({ roughness: 0.85, flatShading: true });
const mesh = new THREE.InstancedMesh(geo, mat, ROUTE.length * HUT_BUILD.length);
mesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(mesh.count * 3), 3);
mesh.castShadow = mesh.receiveShadow = true;
mesh.frustumCulled = false;
mesh.count = 0;
scene.add(mesh);
// The ghost (construction rec 3): every piece still to come, faint, from the first log until it lands.
const ghostMat = new THREE.MeshStandardNodeMaterial({
  color: '#e8f4ff',
  roughness: 1,
  transparent: true,
  opacity: 0.22,
  depthWrite: false,
});
const ghost = new THREE.InstancedMesh(geo, ghostMat, ROUTE.length * HUT_BUILD.length);
ghost.frustumCulled = false;
ghost.count = 0;
scene.add(ghost);
// The fallen scaffold (construction rec 5): Local physics props you can kick, for LOOSE seconds.
const looseMat = material('scaffold', { friction: 0.7, restitution: 0.25 });

// Per piece, Local: 0 not there, 1 queued, 2 arriving or standing (since `t`), 3 coming down (since `t`).
const GONE = 0,
  QUEUED = 1,
  UP = 2,
  DOWN = 3;
type View = {
  at: THREE.Vector3; // the hut's origin on the ground
  state: Uint8Array;
  t: Float64Array;
  landed: Uint8Array; // the landing's sound and dust have played
  loose: (Body | null)[]; // a fallen scaffold piece's body
  queue: number[];
  next: number; // when the next queued piece may go up
  notes: number[]; // per phase: pieces landed so far (the next note up the scale)
  voices: number[]; // when this site's recent sounds played
  ghost: boolean; // the build has begun and isn't finished
  seen: boolean; // drawn once (a site's first look snaps to its stage, no drops)
};
let views: View[] | null = null;
// The world was replaced (a join, a reload, a resync): every site snaps to its stage on its next look, no replay.
onSnapshot(() => views?.forEach((v) => (v.seen = false)));

function makeViews(): View[] {
  return ROUTE.map((_, s) => {
    const h = ringAt(s, HELPER);
    const x = h.x + OFFSET;
    return {
      at: new THREE.Vector3(x, groundHeight(x, h.z), h.z),
      state: new Uint8Array(HUT_BUILD.length),
      t: new Float64Array(HUT_BUILD.length),
      landed: new Uint8Array(HUT_BUILD.length),
      loose: HUT_BUILD.map(() => null),
      queue: [],
      next: 0,
      notes: PHASES.map(() => 0),
      voices: [],
      ghost: false,
      seen: false,
    };
  });
}

// ---------------------------------------------------------------- feedback
function puff(v: View, p: Piece, n = 8, wide = 1): void {
  const y = v.at.y + p.y;
  for (let k = 0; k < n; k++) {
    const a = (k / n) * Math.PI * 2 + Math.random() * 0.4;
    emit({
      x: v.at.x + p.x + Math.cos(a) * (p.w * 0.5 + 0.1) * wide,
      y: y + 0.05,
      z: v.at.z + p.z + Math.sin(a) * (p.d * 0.5 + 0.1) * wide,
      vx: Math.cos(a) * 1.4 * wide,
      vy: 0.9 + Math.random() * 0.5,
      vz: Math.sin(a) * 1.4 * wide,
      life: 0.8,
      size: 0.35 + Math.min(0.35, (p.w * p.d) / 2),
      color: dust,
      gravity: -0.4,
      drag: 2.5,
    });
  }
}

// Sounds (construction rec 6): a low wooden thump under a short pitched knock. The knock steps up a major pentatonic
// scale with each piece of a phase, so progress is audible with your eyes closed; a phase's last piece resolves the
// phrase with a chord. At most VOICES per site per 0.3 s.
const PENTA = [0, 2, 4, 7, 9]; // semitones
const ROOT = 196; // Hz (G3)
const noteHz = (step: number) => ROOT * 2 ** ((PENTA[step % 5] + 12 * Math.floor(step / 5)) / 12);
let noise: AudioBuffer | null = null;
function knock(ctx: AudioContext, out: AudioNode, t: number, hz: number, vol: number, len: number) {
  const o = ctx.createOscillator();
  o.type = 'triangle';
  o.frequency.setValueAtTime(hz, t);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(vol, t + 0.006);
  g.gain.exponentialRampToValueAtTime(0.0001, t + len);
  o.connect(g).connect(out);
  o.start(t);
  o.stop(t + len + 0.02);
}
function thump(v: View, p: Piece, sec: number, note = -1, chord = false): void {
  const a = getAudio();
  if (!a || !me.body) return;
  const far = Math.hypot(me.body.position.x - v.at.x, me.body.position.z - v.at.z);
  if (far > HEAR) return;
  v.voices = v.voices.filter((s) => sec - s < 0.3);
  if (v.voices.length >= VOICES && !chord) return;
  v.voices.push(sec);
  const { ctx, out } = a;
  const vol = 0.45 * (1 - far / HEAR);
  const size = Math.min(1, Math.max(p.w, p.h, p.d) / 3);
  const t = ctx.currentTime + 0.005;
  const o = ctx.createOscillator();
  o.type = 'sine';
  o.frequency.setValueAtTime(190 - 90 * size + Math.random() * 25, t);
  o.frequency.exponentialRampToValueAtTime(48, t + 0.16);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(vol, t + 0.004);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);
  o.connect(g).connect(out);
  o.start(t);
  o.stop(t + 0.25);
  if (!noise) {
    noise = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.05), ctx.sampleRate);
    const d = noise.getChannelData(0);
    for (let k = 0; k < d.length; k++) d[k] = (Math.random() * 2 - 1) * (1 - k / d.length) ** 2;
  }
  const n = ctx.createBufferSource();
  n.buffer = noise;
  const f = ctx.createBiquadFilter();
  f.type = 'lowpass';
  f.frequency.value = 1400;
  const ng = ctx.createGain();
  ng.gain.value = vol * 0.6;
  n.connect(f).connect(ng).connect(out);
  n.start(t);
  if (note >= 0) knock(ctx, out, t, noteHz(Math.min(note, 9)), vol * 0.32, 0.18);
  if (chord)
    for (const s of [0, 4, 7, 12]) knock(ctx, out, t + 0.06 + s * 0.004, ROOT * 2 * 2 ** (s / 12), vol * 0.2, 0.9);
}

// Plays a piece's landing: dust, a thump on the phase's next note, and the phase's chord if it completes one.
function land(v: View, p: Piece, k: number, sec: number): void {
  v.landed[k] = 1;
  const ph = phaseIx[k];
  const beat = lastOfPhase[k];
  puff(v, p, beat ? 18 : 8, beat ? 1.8 : 1);
  thump(v, p, sec, v.notes[ph]++, beat);
}

// ---------------------------------------------------------------- stage
// Moves site s's pieces toward the stage its Helper ring has reached.
function step(v: View, s: number, sec: number): void {
  const site = rules.sites.sites.list[s];
  const built = site.helpers > 0;
  const f = buildFraction(site.stock[HELPER], rules.sites.cost(s, HELPER), built);
  const snap = !v.seen;
  v.seen = true;
  v.ghost = f > 0 && !built;
  if (f === 0) v.notes.fill(0);
  let busy = v.queue.length > 0;
  HUT_BUILD.forEach((p, k) => {
    const want = shows(p, f) && !(p.kind === 'scaffold' && built);
    const st = v.state[k];
    if (want && st === GONE) {
      if (snap) {
        v.state[k] = UP;
        v.t[k] = -1e9; // already standing
        v.landed[k] = 1;
      } else {
        v.state[k] = QUEUED;
        v.queue.push(k);
        busy = true;
      }
    } else if (!want && (st === UP || st === QUEUED)) {
      // the hut is done: its scaffold comes down below; otherwise (a reset) the piece just goes
      if (p.kind !== 'scaffold' || !built || snap) {
        v.state[k] = GONE;
        if (st === QUEUED) v.queue.splice(v.queue.indexOf(k), 1);
      }
    }
    if (v.state[k] === UP && sec - v.t[k] < DONE) busy = true;
  });
  // Send the next piece in line up; a longer queue goes a little faster, and a new phase waits a beat.
  if (v.queue.length && sec >= v.next) {
    const k = v.queue.shift()!;
    v.state[k] = UP;
    v.t[k] = sec;
    v.landed[k] = 0;
    const gap = Math.max(MIN_GAP, GAP - CATCH_UP * v.queue.length);
    const nextPhase = v.queue.length && phaseIx[v.queue[0]] !== phaseIx[k];
    v.next = sec + (HUT_BUILD[k].kind === 'scaffold' ? gap * 0.5 : gap) + (nextPhase ? PHASE_PAUSE : 0);
  }
  // Built and every piece in: the scaffold falls, one piece after another.
  if (built && !busy) {
    let d = 0;
    HUT_BUILD.forEach((p, k) => {
      if (p.kind !== 'scaffold' || v.state[k] !== UP) return;
      v.state[k] = DOWN;
      v.t[k] = sec + 0.5 + d;
      d += 0.15;
    });
  }
}

const m4 = new THREE.Matrix4(),
  q = new THREE.Quaternion(),
  e = new THREE.Euler(),
  pos = new THREE.Vector3(),
  scl = new THREE.Vector3();

// A scaffold piece let go: a dynamic box (its origin at the piece's base), nudged outward so it topples.
function letGo(v: View, p: Piece): Body {
  const ledger = p.h < 1;
  const b = createBody({
    mass: ledger ? 6 : 4,
    material: looseMat,
    position: { x: v.at.x + p.x, y: v.at.y + p.y, z: v.at.z + p.z },
    shapes: [
      // a ledger's ends stop short of the poles it spans, so the two don't start inside each other
      { kind: 'box', hx: p.w / 2 - (ledger ? 0.12 : 0), hy: p.h / 2, hz: p.d / 2, offset: { x: 0, y: p.h / 2, z: 0 } },
    ],
    angularDamping: 0.4,
    linearDamping: 0.1,
  });
  addBody(b);
  const out = Math.abs(p.z) > 0.1 ? Math.sign(p.z) : 0;
  const r = () => (Math.random() - 0.5) * 0.6;
  if (ledger) {
    b.velocity.set(r(), 0.5, out * 1.2);
    b.angularVelocity.set(out * 1.5, r(), r());
  } else {
    b.velocity.set(0, 0.3, 0);
    // tip outward about the foot: +x rotation swings the top toward +z
    b.angularVelocity.set(out * 1.3 + r(), r(), out ? r() : -Math.sign(p.x) * 1.3);
  }
  return b;
}

// Writes piece k of site v at time sec; returns false when it isn't drawn.
function place(v: View, p: Piece, k: number, sec: number): boolean {
  const st = v.state[k];
  if (st === GONE || st === QUEUED) return false;
  const t = sec - v.t[k];
  let dx = 0,
    dy = 0,
    dz = 0,
    sy = 1,
    sxz = 1,
    yaw = 0,
    rx = p.rx ?? 0,
    rz = p.rz ?? 0;
  if (st === UP && p.kind === 'scaffold') {
    // grows up out of the ground with a little overshoot
    if (t < RISE && !reducedMotion) {
      const u = t / RISE;
      sy = Math.max(0.001, 1 + 2.2 * (u - 1) ** 3 + 1.2 * (u - 1) ** 2);
    }
    if (!v.landed[k]) {
      v.landed[k] = 1;
      if (p.h > 1) puff(v, p, 4);
    }
  } else if (st === UP) {
    const L = LAND[p.kind];
    const t0 = arrival(p);
    if (t < t0) {
      const u = t / t0;
      if (L.fly) {
        // an arc from the ring (the hut's -x, where the logs went in), turning as it flies
        dx = (-OFFSET - p.x) * (1 - u);
        dz = -p.z * 0.6 * (1 - u);
        dy = (0.5 - p.y) * (1 - u) + FLY_H * arc(u);
        yaw = (k % 2 ? 1 : -1) * 1.1 * (1 - u) * (1 - u);
        rx *= u;
        rz *= u;
      } else dy = DROP_H * (1 - u * u);
    } else if (t < t0 + SETTLE && !reducedMotion) {
      const b = L.amp * ring(t - t0, L.hz, L.zeta);
      if (L.tilt === 'x') rx += Math.sign(rx || 1) * b;
      else if (L.tilt === 'z') rz += b;
      else {
        sy = 1 - b; // squash that keeps its volume (procedural-animation rec 2)
        sxz = 1 / Math.sqrt(sy);
      }
    }
    if (t >= t0 && !v.landed[k]) land(v, p, k, sec);
  } else if (st === DOWN) {
    if (t > 0) {
      let b = v.loose[k];
      if (!b && !reducedMotion && t < LOOSE) b = v.loose[k] = letGo(v, p);
      if (t >= LOOSE || reducedMotion) {
        if (b) {
          pos.copy(b.interpolatedPosition as THREE.Vector3);
          removeBody(b);
          v.loose[k] = null;
          puff(v, { ...p, x: pos.x - v.at.x, y: pos.y - v.at.y, z: pos.z - v.at.z }, 6);
        } else puff(v, p, 6);
        v.state[k] = GONE;
        return false;
      }
      if (b) {
        // shrinks away over its last half second
        const s = Math.min(1, (LOOSE - t) * 2);
        const bq = b.quaternion;
        q.set(bq.x, bq.y, bq.z, bq.w);
        const ip = b.interpolatedPosition;
        m4.compose(pos.set(ip.x, ip.y, ip.z), q, scl.set(p.w * s, p.h * s, p.d * s));
        return true;
      }
    }
  }
  pos.set(v.at.x + p.x + dx, v.at.y + p.y + dy, v.at.z + p.z + dz);
  q.setFromEuler(e.set(rx, yaw, rz));
  scl.set(p.w * sxz, p.h * sy, p.d * sxz);
  m4.compose(pos, q, scl);
  return true;
}

onFrame(
  ({ now }: { now: number }) => {
    if (!views) {
      if (!heights.length) return; // the ground isn't built yet
      views = makeViews();
    }
    const sec = now / 1000;
    let c = 0,
      g = 0;
    views.forEach((v, s) => {
      step(v, s, sec);
      HUT_BUILD.forEach((p, k) => {
        if (v.ghost && p.kind !== 'scaffold' && !(v.state[k] === UP && v.landed[k])) {
          ghost.setMatrixAt(
            g++,
            m4.compose(
              pos.set(v.at.x + p.x, v.at.y + p.y, v.at.z + p.z),
              q.setFromEuler(e.set(p.rx ?? 0, 0, p.rz ?? 0)),
              scl.set(p.w, p.h, p.d),
            ),
          );
        }
        if (!place(v, p, k, sec)) return;
        mesh.setMatrixAt(c, m4);
        mesh.setColorAt(c++, colorOf[p.kind]);
      });
    });
    mesh.count = c;
    mesh.visible = c > 0;
    mesh.instanceMatrix.needsUpdate = true;
    mesh.instanceColor!.needsUpdate = true;
    ghost.count = g;
    ghost.visible = g > 0;
    ghost.instanceMatrix.needsUpdate = true;
  },
  { phase: 'update', order: 38 },
);

// Construction you can watch (the build prototype; loaded by src/features/build-proto.ts behind ?proto=build). Each
// work site's helper hut goes up as its Helper ring fills: scaffolding poles rise with the first logs, then the pieces
// of ./blueprint.ts drop into place one after another, each with a thump and a puff of dust, as far as the ring's
// stock has reached; once the hut is built the station sign's board goes up and the scaffolding tips over and goes.
// The stage is derived from lockstep stock (every peer sees the same pieces); the drops are Local. A late joiner or a
// reload sees the stage as it is, without the drops. Greybox boxes only.
// Serves DESIGN.md 7 (Telegraph everything: the scaffold shows the hut's size before a plank is up, and every pour
// visibly moves it on) and 9 (Leave something for the next visitor: a half-built hut says what's left to bring).
import './build.css';
import { rules } from '../../world/game-world.ts';
import * as THREE from 'three/webgpu';
import { onFrame } from '../../loop.ts';
import { scene } from '../../render/scene.ts';
import { emit } from '../../render/particles.ts';
import { getAudio } from '../../render/audio.ts';
import { onApplied, submitEdit } from '../../world/sync.ts';
import { groundHeight, heights } from '../../adapters/terrain.ts';
import { me } from '../../player/player.ts';
import { identity } from '../../player/identity.ts';
import { ROUTE, HELPER, RING_R, ringAt } from '../../sim/route.ts';
import { materialOf } from '../../sim/materials.ts';
import { HUT_BUILD, buildFraction, shows, type Piece } from './blueprint.ts';

const OFFSET = RING_R + 1.9; // the hut's middle, metres to the +x of its Helper ring's centre
const GAP = 0.15; // seconds between one piece's drop and the next
const DROP_H = 1.8; // metres a piece falls
const FALL = Math.sqrt((2 * DROP_H) / 14); // seconds to fall DROP_H (at a snappy 14 m/s²)
const SETTLE = 0.18; // the squash after it lands
const RISE = 0.4; // a scaffold pole growing up out of the ground
const TIP = 0.55; // a scaffold piece tipping over when the hut is done
const HEAR = 40; // metres: no thump past this

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

const geo = new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0); // a unit box standing on its base
const mat = new THREE.MeshStandardNodeMaterial({ roughness: 0.85, flatShading: true });
const mesh = new THREE.InstancedMesh(geo, mat, ROUTE.length * HUT_BUILD.length);
mesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(mesh.count * 3), 3);
mesh.castShadow = mesh.receiveShadow = true;
mesh.frustumCulled = false;
mesh.count = 0;
scene.add(mesh);

// Per piece, Local: 0 not there, 1 queued to drop, 2 dropping or standing (since `t`), 3 tipping over (since `t`).
const GONE = 0,
  QUEUED = 1,
  UP = 2,
  DOWN = 3;
type View = {
  at: THREE.Vector3; // the hut's origin on the ground
  state: Uint8Array;
  t: Float64Array;
  landed: Uint8Array; // the drop's thump and dust have played
  queue: number[];
  next: number; // when the next queued piece may drop
  seen: boolean; // drawn once (a site's first look snaps to its stage, no drops)
};
let views: View[] | null = null;

function makeViews(): View[] {
  return ROUTE.map((_, s) => {
    const h = ringAt(s, HELPER);
    const x = h.x + OFFSET;
    return {
      at: new THREE.Vector3(x, groundHeight(x, h.z), h.z),
      state: new Uint8Array(HUT_BUILD.length),
      t: new Float64Array(HUT_BUILD.length),
      landed: new Uint8Array(HUT_BUILD.length),
      queue: [],
      next: 0,
      seen: false,
    };
  });
}

// ---------------------------------------------------------------- feedback
function puff(v: View, p: Piece, n = 8): void {
  const y = v.at.y + p.y;
  for (let k = 0; k < n; k++) {
    const a = (k / n) * Math.PI * 2 + Math.random() * 0.4;
    emit({
      x: v.at.x + p.x + Math.cos(a) * (p.w * 0.5 + 0.1),
      y: y + 0.05,
      z: v.at.z + p.z + Math.sin(a) * (p.d * 0.5 + 0.1),
      vx: Math.cos(a) * 1.4,
      vy: 0.9 + Math.random() * 0.5,
      vz: Math.sin(a) * 1.4,
      life: 0.8,
      size: 0.35 + Math.min(0.35, (p.w * p.d) / 2),
      color: dust,
      gravity: -0.4,
      drag: 2.5,
    });
  }
}
// A short wooden thump: a falling sine and a click of noise, lower for bigger pieces, quieter further off.
let noise: AudioBuffer | null = null;
function thump(v: View, p: Piece): void {
  const a = getAudio();
  if (!a || !me.body) return;
  const far = Math.hypot(me.body.position.x - v.at.x, me.body.position.z - v.at.z);
  if (far > HEAR) return;
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
}

// ---------------------------------------------------------------- stage
// Moves site s's pieces toward the stage its Helper ring has reached.
function step(v: View, s: number, sec: number): void {
  const site = rules.sites.sites.list[s];
  const built = site.helpers > 0;
  const f = buildFraction(site.stock[HELPER], rules.sites.cost(s, HELPER), built);
  const snap = !v.seen;
  v.seen = true;
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
    if (v.state[k] === UP && sec - v.t[k] < FALL + SETTLE) busy = true;
  });
  // Drop the next piece in line.
  if (v.queue.length && sec >= v.next) {
    const k = v.queue.shift()!;
    v.state[k] = UP;
    v.t[k] = sec;
    v.landed[k] = 0;
    v.next = sec + (HUT_BUILD[k].kind === 'scaffold' ? GAP * 0.5 : GAP);
  }
  // Built and every piece in: the scaffold tips over, one piece after another.
  if (built && !busy) {
    let d = 0;
    HUT_BUILD.forEach((p, k) => {
      if (p.kind !== 'scaffold' || v.state[k] !== UP) return;
      v.state[k] = DOWN;
      v.t[k] = sec + 0.35 + d;
      d += 0.12;
    });
  }
}

const m4 = new THREE.Matrix4(),
  q = new THREE.Quaternion(),
  e = new THREE.Euler(),
  pos = new THREE.Vector3(),
  scl = new THREE.Vector3();

// Writes piece k of site v at time sec; returns false when it isn't drawn.
function place(v: View, p: Piece, k: number, sec: number): boolean {
  const st = v.state[k];
  if (st === GONE || st === QUEUED) return false;
  const t = sec - v.t[k];
  let dy = 0,
    sy = 1,
    sxz = 1,
    rx = p.rx ?? 0,
    rz = p.rz ?? 0;
  if (st === UP && p.kind === 'scaffold') {
    // grows up out of the ground with a little overshoot
    if (t < RISE) {
      const u = t / RISE;
      sy = Math.max(0.001, 1 + 2.2 * (u - 1) ** 3 + 1.2 * (u - 1) ** 2);
    }
    if (!v.landed[k]) {
      v.landed[k] = 1;
      if (p.h > 1) puff(v, p, 4);
    }
  } else if (st === UP) {
    if (t < FALL) dy = DROP_H * (1 - (t / FALL) ** 2);
    else if (t < FALL + SETTLE) {
      const u = (t - FALL) / SETTLE;
      const b = Math.sin(u * Math.PI) * (1 - u);
      sy = 1 - 0.3 * b;
      sxz = 1 + 0.12 * b;
    }
    if (t >= FALL && !v.landed[k]) {
      v.landed[k] = 1;
      puff(v, p);
      thump(v, p);
    }
  } else if (st === DOWN) {
    if (t > 0) {
      const u = Math.min(1, t / TIP);
      if (p.h > 1) {
        // a pole tips outward about its foot
        const tip = (Math.PI / 2) * u * u;
        if (Math.abs(p.z) > 0.1) rx += Math.sign(p.z) * tip;
        else rz -= Math.sign(p.x) * tip;
      } else dy = -p.y * u * u; // a ledger drops to the ground
      if (u >= 1) {
        v.state[k] = GONE;
        puff(v, p.h > 1 ? { ...p, x: p.x * 1.8, z: p.z * 1.8 } : p, 6);
        thump(v, p);
        return false;
      }
    }
  }
  pos.set(v.at.x + p.x, v.at.y + p.y + dy, v.at.z + p.z);
  q.setFromEuler(e.set(rx, 0, rz));
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
    let c = 0;
    views.forEach((v, s) => {
      step(v, s, sec);
      HUT_BUILD.forEach((p, k) => {
        if (!place(v, p, k, sec)) return;
        mesh.setMatrixAt(c, m4);
        mesh.setColorAt(c++, colorOf[p.kind]);
      });
    });
    mesh.count = c;
    mesh.visible = c > 0;
    mesh.instanceMatrix.needsUpdate = true;
    mesh.instanceColor!.needsUpdate = true;
  },
  { phase: 'update', order: 38 },
);

// ---------------------------------------------------------------- the solo shortcut
// "Pour 10 logs": takes logs from palm bundles onto your stack (src.take) and pours them into the open site's Helper
// ring (site.stock), ten per press, one edit at a time; the same ops as walking and pouring, minus the walk. "Reset"
// is the haul kit's tune.reset (empty rings, stacks and piles). The host takes reset only in a proto- room.
const POUR = 10;
let want = 0; // logs still to pour from presses so far
let inflight = 0; // when the last edit went out (0: none waiting)
onApplied((ed: { op: string; u?: string }) => {
  if ((ed.op === 'src.take' || ed.op === 'site.stock') && ed.u === identity.pid) inflight = 0;
});
onApplied((ed: { op: string; ring?: number; u?: string }, _tick: number, r: { n?: number } | null) => {
  if (ed.op === 'site.stock' && ed.ring === HELPER && ed.u === identity.pid && r?.n) want = Math.max(0, want - r.n);
});

function feed(now: number): string {
  const s = rules.sites.sites.open;
  if (s >= ROUTE.length) return ((want = 0), 'Route laid: Reset to build again');
  const room = rules.sites.room(s, HELPER);
  if (room <= 0) return ((want = 0), 'Hut built: Reset to build again');
  if (!want || !identity.pid) return '';
  if (inflight && now - inflight < 3000) return 'pouring…';
  const k = materialOf(ROUTE[s].age);
  const mine = rules.stacks.kind(identity.pid) === k ? rules.stacks.count(identity.pid) : 0;
  const need = Math.min(want, room, POUR);
  if (mine >= need || (mine > 0 && rules.stacks.count(identity.pid) >= rules.tune.get('hard'))) {
    submitEdit({ op: 'site.stock', i: 0, j: 0, s, ring: HELPER, n: Math.min(mine, need) });
  } else {
    const id = rules.sources.list().findIndex((_, i) => rules.sources.charges(i) > 0);
    if (id < 0) return ((want = 0), 'No logs left in the bundles');
    const c = rules.sources.list()[id];
    submitEdit({ op: 'src.take', i: c.i, j: c.j, id });
  }
  inflight = now;
  return 'pouring…';
}

export function shortcutButtons(protoRoom: boolean): void {
  const box = document.createElement('div');
  box.className = 'build-proto';
  const pour = document.createElement('button');
  pour.type = 'button';
  pour.textContent = `Pour ${POUR} logs`;
  const reset = document.createElement('button');
  reset.type = 'button';
  reset.textContent = 'Reset';
  const note = document.createElement('span');
  box.append(pour, reset, note);
  (document.querySelector('.hud') ?? document.body).append(box);
  pour.addEventListener('click', () => (want += POUR));
  reset.addEventListener('click', () => {
    want = 0;
    submitEdit({ op: 'tune.reset', i: 0, j: 0 });
  });
  onFrame(
    ({ now }: { now: number }) => {
      const msg = protoRoom ? feed(now) : 'needs ?room=proto-build';
      pour.disabled = reset.disabled = !protoRoom;
      if (note.textContent !== msg) note.textContent = msg;
    },
    { phase: 'late', order: 121 },
  );
}

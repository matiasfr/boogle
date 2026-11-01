// Haul variant `wave` (?room=proto-haul-wave&proto=haul&v=wave): a trip home under a world threat, the kind version
// (docs/research/roblox-patterns.md, pattern 1; docs/game-design/haul.md, "Prototype: haul variants"). The richest log
// bundles sit on a sandbar off the home beach, out along an awash spit; every 60-90 s a wave comes, telegraphed 25 s
// ahead (a swell rising on the horizon, a growing rumble, a horn, a countdown), and sweeps the bar and the beach up to
// the high-water stakes. Caught: you tumble, and part of your bundle is flung up the beach, where it settles as piles
// (`pile.drop` from your own stack, ./loose-logs.ts): nothing is lost, only moved. Asks: does tension make hauling fun
// without rewards? Serves DESIGN.md 5 (only the world is the antagonist), 7 (telegraph everything), 10 (slapstick).
//
// Sync: no new state, ops or messages. The wave is a function of shared time and the room seed (./wave-time.ts), drawn
// by each tab; whether it caught you is your own tab's call (your body, your stack). A sandbar bundle is three of the
// palms' bundles moved out there (`haulHooks.moved`), so a take is three `src.take`s at once: 12 logs where a palm
// gives 4, counted by the same lockstep sources and refilled the same way.
import './wave.css';
import * as THREE from 'three/webgpu';
import { rules } from '../../world/game-world.ts';
import { onFrame } from '../../loop.ts';
import { onApplied, submitEdit, world } from '../../world/sync.ts';
import { sharedSeconds } from '../../netplay/shared-time.ts';
import { net } from '../../netplay/net.ts';
import { identity } from '../../player/identity.ts';
import { me } from '../../player/player.ts';
import { registerInteractable, NO_TARGETS, type Interactable } from '../../player/hands.ts';
import { haulHooks } from '../../player/haul-variant.ts';
import { onPreStep } from '../../physics/engine.ts';
import { carry } from '../../physics/platforms.ts';
import { cellX, cellZ, groundHeight } from '../../adapters/terrain.ts';
import { pieceMesh, pieceColor, heapMatrix, commitPieces, fly } from '../../render/haul-pieces.ts';
import { camera } from '../../render/scene.ts';
import { emit } from '../../render/particles.ts';
import { getAudio } from '../../render/audio.ts';
import { notify } from '../../render/notify.ts';
import { GRAVITY, reducedMotion } from '../../constants.ts';
import { ROUTE } from '../../sim/route.ts';
import { YIELD } from '../../sim/sources.ts';
import { materialOf } from '../../sim/materials.ts';
import { wavePhase, WAVE, type WavePhase } from './wave-time.ts';
import { BAR, LINE, SEAWARD, BAND, sandAt, awash, swell, sheet, bundlePole } from './wave-look.ts';
import { launchLog, myLogs } from './loose-logs.ts';

export const TUNE = {
  perBundle: 3, // palm bundles pooled into each sandbar bundle
  perTake: 3, // of them spent by one Take logs (3 x 4 = 12 logs)
  washShare: 0.5, // of your load the wave flings up the beach
  wade: 0.6, // x your speed on the awash spit
  knock: 8, // m/s the surge carries you shoreward...
  carryS: 0.9, // ...easing off over this long
  swellH: 2.6, // m: the crest's height when it reaches the bar
  horizon: 260, // m: where the swell first shows (z)
};

// ---------------------------------------------------------------- the sandbar bundles
const SPOTS = [
  { x: BAR.x - 8, z: BAR.z + 0.5 },
  { x: BAR.x, z: BAR.z + 1.5 },
  { x: BAR.x + 8, z: BAR.z + 0.2 },
];
// Which palms' bundles moved out: the ones farthest from the first work site (nobody walks to those anyway), so the
// home palms by the line keep theirs. The layout is the same in every tab, so is this.
const groups: number[][] = SPOTS.map(() => []);
const movedIds = new Set<number>();
function claim() {
  const list = rules.sources.list();
  if (!list.length || movedIds.size) return movedIds.size > 0;
  const far = list
    .map((p, id) => ({ id, d: Math.hypot(cellX(p.i) - ROUTE[0].x, cellZ(p.j) - ROUTE[0].z) }))
    .sort((a, b) => b.d - a.d || a.id - b.id);
  far.slice(0, SPOTS.length * TUNE.perBundle).forEach((e, k) => {
    groups[k % SPOTS.length].push(e.id);
    movedIds.add(e.id);
  });
  haulHooks.moved = (id) => movedIds.has(id);
  rules.sources.sources.rev++; // the palms redraw without them (rev is for views: neither saved nor hashed)
  return true;
}
const chargesOf = (g: number) => groups[g].reduce((t, id) => t + rules.sources.charges(id), 0);
const yieldN = () => rules.tune.get('yield') ?? YIELD;

const spotAt = SPOTS.map((s) => new THREE.Vector3(s.x, sandAt(s.x, s.z), s.z));
SPOTS.forEach((s) => bundlePole(s.x, s.z));
const REACH = 2.6;
const pending = new Map<number, number>(); // group -> ms of the press
registerInteractable(() => {
  if (!me.body || !claim()) return NO_TARGETS;
  const pos = me.body.interpolatedPosition;
  const now = performance.now();
  let out: Interactable[] | null = null;
  spotAt.forEach((at, g) => {
    if (Math.hypot(at.x - pos.x, at.z - pos.z) > REACH || chargesOf(g) <= 0) return;
    if (now - (pending.get(g) ?? -1e9) < 1500) return;
    const t = { id: `bar${g}`, verb: 'Take logs', at: new THREE.Vector3(at.x, at.y + 0.6, at.z) };
    const pid = identity.pid;
    const k = materialOf(rules.sites.age());
    const room = pid ? rules.stacks.room(pid, k) : 0;
    const n = Math.min(TUNE.perTake, Math.floor(room / yieldN()));
    (out ??= []).push(
      n <= 0
        ? { ...t, blocked: room > 0 ? 'Not enough room' : 'Full' }
        : {
            ...t,
            run: () => {
              let sent = 0;
              for (const id of groups[g])
                for (let c = rules.sources.charges(id); c > 0 && sent < n; c--)
                  if (submitEdit({ op: 'src.take', i: 0, j: 0, id })) sent++;
              if (sent) pending.set(g, now);
            },
          },
    );
  });
  return out ?? NO_TARGETS;
});
onApplied((e: { op: string; p: string; id: number }, _tick: number, r: { n?: number } | null) => {
  if (e.op !== 'src.take' || !movedIds.has(e.id)) return;
  const g = groups.findIndex((ids) => ids.includes(e.id));
  pending.delete(g);
  if (r?.n && e.p === (net.room?.selfId ?? 'local')) fly(spotAt[g], r.n);
});

const PER_CHARGE = 3; // pieces drawn per charge left: a sandbar bundle is a big heap
const heap = pieceMesh(SPOTS.length * 20 * PER_CHARGE);
const m4 = new THREE.Matrix4();
let drawnRev = -1;
function drawBundles() {
  if (!claim() || rules.sources.sources.rev === drawnRev) return;
  drawnRev = rules.sources.sources.rev;
  const k = materialOf(rules.sites.age());
  let c = 0;
  spotAt.forEach((at, g) => {
    for (let m = 0; m < chargesOf(g) * PER_CHARGE && c < heap.instanceMatrix.count; m++) {
      heap.setMatrixAt(c, heapMatrix(m, g + 7, at.x + ((m >> 3) % 2) * 0.5, at.y, at.z, m4));
      heap.setColorAt(c++, pieceColor(k));
    }
  });
  commitPieces(heap, c);
}

// ---------------------------------------------------------------- time: shared, with a Local seek for the look evals
let seek = 0; // s added to shared time (window.__wave.next(s): the next crest in s seconds, in this tab only)
const now = () => sharedSeconds() + seek;
let ph: WavePhase = wavePhase(0, world.seed);

// Where the front is (z) and how tall, through the phases.
const easeOut = (u: number) => 1 - (1 - u) * (1 - u);
function front(p: WavePhase): { z: number; h: number } {
  if (p.phase === 'calm') return { z: TUNE.horizon, h: 0 };
  if (p.phase === 'warn') {
    const u = p.u * p.u; // far away it hardly seems to move; then it comes on
    return { z: TUNE.horizon + (SEAWARD - TUNE.horizon) * u, h: 0.35 + (TUNE.swellH - 0.35) * Math.pow(p.u, 1.5) };
  }
  if (p.phase === 'sweep') {
    const u = easeOut(p.u);
    return { z: SEAWARD + (LINE - SEAWARD) * u, h: TUNE.swellH * (1 - 0.85 * u) };
  }
  return { z: LINE + (SEAWARD + 6 - LINE) * p.u * p.u, h: 0.3 * (1 - p.u) };
}

// ---------------------------------------------------------------- caught
let caughtWave = -1;
let caughtAt = -1e9;
let jolt = 0;
const inBand = (x: number) => x > BAND.x0 && x < BAND.x1;
function strandZ(x: number, z: number): number {
  // the first dry sand shoreward of (x, z), then a little further up, never past the line
  let zz = z;
  while (zz > LINE + 1 && groundHeight(x, zz) < 0.35) zz -= 0.5;
  return Math.max(LINE + 0.8, Math.min(zz, z) - 1 - Math.random() * 2.5);
}
function caught(p: WavePhase) {
  caughtWave = p.n;
  caughtAt = performance.now();
  const b = me.body!;
  carry.tumbles++; // the tumble flop (src/features/feel.ts): a held beat, a face-plant, a pop back up
  b.velocity.set(b.velocity.x * 0.3, 5, -TUNE.knock);
  jolt = 1;
  whoosh(0.7);
  splashAt(b.position.x, b.position.y, b.position.z, 40);
  const have = myLogs();
  const wash = Math.min(have, Math.max(1, Math.round(have * TUNE.washShare)));
  if (have <= 0) return;
  const logs = Math.min(6, wash);
  const T = 1.15; // s in the air
  for (let k = 0; k < logs; k++) {
    const n = Math.floor(wash / logs) + (k < wash % logs ? 1 : 0);
    const from = { x: b.position.x, y: b.position.y + 1.1, z: b.position.z };
    const tx = from.x + (k - (logs - 1) / 2) * 1.6 + (Math.random() - 0.5) * 1.2;
    const tz = strandZ(tx, from.z);
    const ty = groundHeight(tx, tz) + 0.2;
    launchLog(from, { x: (tx - from.x) / T, y: (ty - from.y + 0.5 * GRAVITY * T * T) / T, z: (tz - from.z) / T }, n, 7);
  }
  notify(`The wave took ${wash} log${wash === 1 ? '' : 's'}: they washed up the beach`, { key: 'wave' });
}

// Wading: the spit slows you (a splash at each step); the bar's dry top and the beach don't.
// Caught: the surge carries you shoreward for a moment, over whatever your stick says.
onPreStep(() => {
  const b = me.body;
  if (!b) return;
  const k = 1 - (performance.now() - caughtAt) / (TUNE.carryS * 1000);
  if (k > 0) {
    b.velocity.x *= 0.9;
    b.velocity.z = Math.min(b.velocity.z, -TUNE.knock * k);
    return;
  }
  if (!awash(b.position.x, b.position.z) || b.position.y > 0.9) return;
  const cap = (me.sprint ? 9.5 : 5.6) * TUNE.wade;
  const h = Math.hypot(b.velocity.x, b.velocity.z);
  if (h > cap) {
    b.velocity.x *= cap / h;
    b.velocity.z *= cap / h;
  }
});

// ---------------------------------------------------------------- sound: horn, rumble, crash (Local)
function horn(blasts: number) {
  const a = getAudio();
  if (!a) return;
  const { ctx, out } = a;
  for (let k = 0; k < blasts; k++) {
    const t = ctx.currentTime + 0.02 + k * 0.75,
      len = blasts > 1 ? 0.55 : 1.8;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.22, t + 0.12);
    g.gain.setValueAtTime(0.22, t + len - 0.2);
    g.gain.exponentialRampToValueAtTime(0.0001, t + len);
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 700;
    lp.connect(g).connect(out);
    for (const f of [98, 147, 196.5]) {
      const o = ctx.createOscillator();
      o.type = 'sawtooth';
      o.frequency.setValueAtTime(f * 0.97, t);
      o.frequency.linearRampToValueAtTime(f, t + 0.15);
      o.connect(lp);
      o.start(t);
      o.stop(t + len + 0.05);
    }
  }
}
let noiseBuf: AudioBuffer | null = null;
function noise(ctx: AudioContext) {
  if (noiseBuf) return noiseBuf;
  noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
  const d = noiseBuf.getChannelData(0);
  for (let k = 0; k < d.length; k++) d[k] = Math.random() * 2 - 1;
  return noiseBuf;
}
let rumble: { gain: GainNode; lp: BiquadFilterNode } | null = null;
function setRumble(level: number) {
  if (!rumble) {
    if (level <= 0.001) return;
    const a = getAudio();
    if (!a) return;
    const src = a.ctx.createBufferSource();
    src.buffer = noise(a.ctx);
    src.loop = true;
    const lp = a.ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 90;
    const gain = a.ctx.createGain();
    gain.gain.value = 0;
    src.connect(lp).connect(gain).connect(a.out);
    src.start();
    rumble = { gain, lp };
  }
  const t = rumble.gain.context.currentTime;
  rumble.gain.gain.setTargetAtTime(level * 0.9, t, 0.15);
  rumble.lp.frequency.setTargetAtTime(70 + 260 * level, t, 0.2);
}
function whoosh(strength: number) {
  const a = getAudio();
  if (!a) return;
  const { ctx, out } = a;
  const t = ctx.currentTime + 0.01;
  const src = ctx.createBufferSource();
  src.buffer = noise(ctx);
  const bp = ctx.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.setValueAtTime(500, t);
  bp.frequency.exponentialRampToValueAtTime(1600, t + 0.35);
  bp.frequency.exponentialRampToValueAtTime(300, t + 1.4);
  bp.Q.value = 0.7;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(0.5 * strength, t + 0.12);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 1.6);
  src.connect(bp).connect(g).connect(out);
  src.start(t);
  src.stop(t + 1.7);
}

// ---------------------------------------------------------------- foam
const FOAM = new THREE.Color('#ffffff');
function splashAt(x: number, y: number, z: number, n: number) {
  if (reducedMotion) return;
  for (let k = 0; k < n; k++)
    emit({
      x: x + (Math.random() - 0.5) * 1.5,
      y,
      z: z + (Math.random() - 0.5) * 1.5,
      vx: (Math.random() - 0.5) * 4,
      vy: 2 + Math.random() * 4,
      vz: -1 - Math.random() * 3,
      life: 0.5 + Math.random() * 0.5,
      size: 0.2,
      alpha: 0.9,
      color: FOAM,
      gravity: 9,
      grow: [1, 1.8],
      fade: 0.6,
    });
}

// ---------------------------------------------------------------- the HUD countdown
const chip = document.createElement('div');
chip.className = 'wave-chip';
chip.hidden = true;
(document.querySelector('.hud') ?? document.body).append(chip);
let chipText = '';
function showChip(text: string, urgent: boolean) {
  chip.hidden = !text;
  if (text !== chipText) chip.innerHTML = chipText = text;
  chip.classList.toggle('urgent', urgent);
}

// ---------------------------------------------------------------- every frame
let lastPhase = '',
  lastN = -1,
  blasted = false, // this wave's two short blasts at 10 s
  splashT = 0;
onFrame(
  ({ dt }: { dt: number }) => {
    drawBundles();
    ph = wavePhase(now(), world.seed);
    const f = front(ph);
    const left = ph.at - now();

    // telegraph: the horn at the start of the warning and two short blasts at 10 s
    if (ph.phase === 'warn' && (lastPhase !== 'warn' || lastN !== ph.n)) {
      if (left > WAVE.warn - 1.5) horn(1);
      blasted = false;
    }
    if (ph.phase === 'warn' && left < 10 && !blasted) {
      horn(2);
      blasted = true;
    }
    if (ph.phase === 'sweep' && lastPhase === 'warn') whoosh(1);
    lastPhase = ph.phase;
    lastN = ph.n;

    // the swell and the sheet
    swell.visible = ph.phase !== 'calm';
    swell.position.z = f.z;
    swell.scale.set(1, Math.max(0.05, f.h), 0.8 + f.h * 0.5);
    sheet.visible = ph.phase === 'sweep' || ph.phase === 'recede';
    sheet.position.z = f.z + 1;
    sheet.position.y = ph.phase === 'sweep' ? BAR.top + 0.15 + 0.5 * f.h : (BAR.top + 0.2) * (1 - ph.u) - 0.15 * ph.u;
    (sheet.material as THREE.MeshStandardNodeMaterial).opacity = ph.phase === 'recede' ? 0.45 * (1 - ph.u) : 0.45;

    // foam along the front, near you
    const p = me.body?.position;
    if (p && (ph.phase === 'sweep' || (ph.phase === 'warn' && ph.u > 0.85)) && !reducedMotion) {
      splashT += dt * 60;
      for (; splashT >= 1; splashT--)
        emit({
          x: p.x + (Math.random() - 0.5) * 50,
          y: Math.max(0, f.h * 0.9) + 0.1,
          z: f.z - 0.5 + Math.random(),
          vx: (Math.random() - 0.5) * 2,
          vy: 1.5 + Math.random() * 3,
          vz: -2 - Math.random() * 3,
          life: 0.6 + Math.random() * 0.6,
          size: 0.35,
          alpha: 0.85,
          color: FOAM,
          gravity: 7,
          grow: [1, 2.2],
          fade: 0.5,
        });
    }

    // the rumble: rising through the warning, loudest as it breaks, near the bay
    const near = p ? Math.max(0, 1 - Math.max(0, Math.abs(p.z - BAR.z) - 30) / 80) : 0;
    const level =
      ph.phase === 'warn'
        ? 0.15 + 0.85 * ph.u * ph.u
        : ph.phase === 'sweep'
          ? 1 - 0.4 * ph.u
          : ph.phase === 'recede'
            ? 0.6 * (1 - ph.u)
            : 0;
    setRumble(level * near);
    if (ph.phase === 'warn' && ph.u > 0.75) jolt = Math.max(jolt, (ph.u - 0.75) * 1.2 * near);

    // caught? The front passed you while you stood seaward of the line.
    if (p && me.entered && (ph.phase === 'sweep' || (ph.phase === 'recede' && ph.u < 0.2)) && caughtWave !== ph.n)
      if (inBand(p.x) && p.z > LINE && p.z > f.z && p.y < f.h + 2) caught(ph);

    // the countdown chip
    const yours = !!p && inBand(p.x) && p.z > LINE - 25;
    if (ph.phase === 'warn' && yours)
      showChip(`<b>Wave!</b> <span>${Math.ceil(left)}</span> get above the stakes`, left < 10);
    else if (ph.phase === 'sweep' && yours) showChip(p.z > LINE ? '<b>Wave!</b>' : '<b>Safe</b>', p.z > LINE);
    else showChip('', false);
  },
  { phase: 'update', order: 41 },
);

// The rumble shakes the camera a little in the last seconds, and the hit jolts it.
onFrame(
  ({ dt }: { dt: number }) => {
    if (jolt < 0.01 || reducedMotion) return;
    camera.position.y += (Math.random() - 0.5) * 0.12 * jolt;
    camera.position.x += (Math.random() - 0.5) * 0.12 * jolt;
    jolt *= Math.exp(-dt * (performance.now() - caughtAt < 600 ? 4 : 10));
  },
  { phase: 'late', order: 124 },
);

// Tuning and the look evals' shortcut: __wave.next(s) puts the next crest s seconds away (this tab only).
(window as unknown as { __wave: unknown }).__wave = {
  TUNE,
  WAVE,
  SPOTS,
  groups,
  get phase() {
    return ph;
  },
  get caught() {
    return caughtWave;
  },
  next(s: number) {
    const t = sharedSeconds();
    seek = 0;
    const p = wavePhase(t, world.seed);
    const at =
      p.phase === 'calm' || p.phase === 'warn'
        ? p.at
        : wavePhase(p.at + WAVE.sweep + WAVE.recede + 0.01, world.seed).at;
    seek = at - s - t;
  },
};

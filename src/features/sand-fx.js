// Cosmetic dig/pile juice: a spray of sand clumps (the shared pool in src/particles.js), a tiny camera nudge and
// procedural WebAudio sounds.
// Local only. Never networked, never read by the simulation, so Math.random is fine here.
import * as THREE from 'three';
import { camera } from '../scene.js';
import { emit } from '../particles.js';
import { reducedMotion, CELL, HALF } from '../constants.js';
import { updateSettle } from '../terrain.js';
import { remotes } from '../net.js';
import { me } from '../player.js';
import { onFrame } from '../loop.js';
import { getAudio } from '../audio.js';
import { terrain, onTerrainCells, isMyEdit } from '../world/terrain-edits.js';

// ---------------------------------------------------------------- spray (the shared pool, src/particles.js)
const C_DRY = new THREE.Color('#e3c286'),
  C_DUG = new THREE.Color('#9a7650'),
  C_WET = new THREE.Color('#5b4a3d'),
  C_DUST = new THREE.Color('#f6e7b8');
const tmpC = new THREE.Color();
const jitter = (c) => tmpC.copy(c).offsetHSL(0, 0, (Math.random() - 0.5) * 0.08);

// Sand clumps arc out of the hole toward the digger (fx.from = {x, z}) or straight up and out.
function sprayDig(x, y, z, from, k, wet, deep) {
  const n = Math.round(14 * k);
  let ax = 0,
    az = 0;
  if (from) {
    const dx = from.x - x,
      dz = from.z - z,
      l = Math.hypot(dx, dz) || 1;
    ax = dx / l;
    az = dz / l;
  }
  const col = wet ? C_WET : deep ? C_DUG : C_DRY;
  for (let q = 0; q < n; q++) {
    const a = Math.random() * Math.PI * 2,
      r = Math.random();
    const out = from ? 2.6 + Math.random() * 3.2 : 1 + Math.random() * 2.5;
    emit('clump', {
      x: x + Math.cos(a) * 0.5,
      y: y + 0.15,
      z: z + Math.sin(a) * 0.5,
      vx: ax * out + Math.cos(a) * r * 1.6,
      vy: 4.2 + Math.random() * 3.6,
      vz: az * out + Math.sin(a) * r * 1.6,
      size: 0.1 + Math.random() * 0.14,
      life: 1.4,
      color: jitter(Math.random() < 0.3 ? C_DUG : col),
      gravity: 16,
      floor: 'ground',
      shrink: 0.2,
    });
  }
}
function puff(x, y, z, k) {
  const n = Math.round(11 * k);
  for (let q = 0; q < n; q++) {
    const a = Math.random() * Math.PI * 2,
      sp = 0.8 + Math.random() * 1.6;
    emit('clump', {
      x: x + Math.cos(a) * 0.9,
      y: y + 0.2,
      z: z + Math.sin(a) * 0.9,
      vx: Math.cos(a) * sp,
      vy: 0.8 + Math.random() * 1.5,
      vz: Math.sin(a) * sp,
      size: 0.18 + Math.random() * 0.2,
      life: 0.7 + Math.random() * 0.4,
      color: jitter(C_DUST),
      gravity: 0.6,
      drag: 2.5,
      grow: [0.5, 1.8],
      shrink: 0.2,
    });
  }
}

let nudge = 0;
function updateNudge(dt) {
  // Camera nudge: a short downward kick on your own edits. Applied after the camera is placed each frame.
  if (nudge > 0.001) {
    camera.rotateX(-nudge * 0.014);
    camera.position.y -= nudge * 0.025;
    nudge *= Math.exp(-dt * 16);
  }
}

// ---------------------------------------------------------------- audio
// Uses the shared context from audio.js (it handles the mobile gesture unlock); our bus and noise are built once it runs.
let ctx = null;
let master = null;
let noise = null;
function ready() {
  const a = getAudio();
  if (!a) return false;
  if (ctx !== a.ctx) {
    ctx = a.ctx;
    master = ctx.createGain();
    master.gain.value = 0.9; // the shared bus sits a little hotter than our old one
    master.connect(a.out);
    noise = ctx.createBuffer(1, ctx.sampleRate >> 1, ctx.sampleRate);
    const d = noise.getChannelData(0);
    for (let k = 0; k < d.length; k++) d[k] = Math.random() * 2 - 1;
  }
  return true;
}

function burst(t, { type = 'bandpass', f0, f1, q = 1, dur, gain, attack = 0.006 }) {
  const src = ctx.createBufferSource();
  src.buffer = noise;
  src.playbackRate.value = 0.8 + Math.random() * 0.4;
  const flt = ctx.createBiquadFilter();
  flt.type = type;
  flt.Q.value = q;
  flt.frequency.setValueAtTime(f0, t);
  flt.frequency.exponentialRampToValueAtTime(f1, t + dur);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(gain, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(flt).connect(g).connect(master);
  src.start(t, Math.random() * 0.2, dur + 0.05);
}
function tone(t, f0, f1, dur, gain) {
  const o = ctx.createOscillator();
  o.frequency.setValueAtTime(f0, t);
  o.frequency.exponentialRampToValueAtTime(f1, t + dur);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(gain, t + 0.005);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(master);
  o.start(t);
  o.stop(t + dur + 0.02);
}
// depth01: 0 shallow .. 1 deepest hole. Deeper sounds lower and duller.
function sound(kind, vol, depth01, wet) {
  if (!ready()) return;
  const t = ctx.currentTime + 0.005;
  const j = 0.92 + Math.random() * 0.16;
  if (kind === 'dig' && wet) {
    // schlp: a wet bandpass sweep with a little blip on top
    burst(t, { f0: 380 * j, f1: 1500 * j, q: 5, dur: 0.14, gain: 0.55 * vol, attack: 0.02 });
    tone(t + 0.02, (240 - depth01 * 80) * j, 560 * j, 0.09, 0.12 * vol);
  } else if (kind === 'dig') {
    // shff: two quick grains of gritty noise
    const f = (3000 - depth01 * 1700) * j;
    burst(t, { f0: f * 1.5, f1: f * 0.8, q: 0.9, dur: 0.12, gain: 0.5 * vol, attack: 0.012 });
    burst(t + 0.05, { f0: f * 1.2, f1: f * 0.7, q: 1.2, dur: 0.09, gain: 0.3 * vol, attack: 0.008 });
  } else {
    // pat: a soft low thump and a muffled tick
    tone(t, (170 - depth01 * 40) * j, 70, 0.09, 0.3 * vol);
    burst(t, { type: 'lowpass', f0: 1100 * j, f1: 300, q: 0.7, dur: 0.07, gain: 0.35 * vol });
  }
}

const lastBy = new Map();
let recent = 0,
  recentAt = 0;
function play(kind, vol, depth01, wet, who, own) {
  const now = performance.now();
  if (!own) {
    if (vol < 0.04 || now - (lastBy.get(who) ?? 0) < 110) return;
    if (now - recentAt > 250) recent = 0;
    if (recent >= 4) return; // never more than 4 remote voices in a quarter second
    recent++;
    recentAt = now;
  }
  lastBy.set(who, now);
  sound(kind, vol, depth01, wet);
}

// ---------------------------------------------------------------- entry point
// fx: { op, p, own, x, z, y (ground), depth (cm dug at the centre, 0..150), wet }
function playEditFx(fx) {
  const k = fx.own ? 1 : 0.5;
  const camD = Math.hypot(camera.position.x - fx.x, camera.position.z - fx.z);
  const vol = (fx.own ? 1 : 0.55) / (1 + (camD * camD) / 400);
  const depth01 = Math.min(1, Math.max(0, fx.depth / 150));
  let from = null;
  if (fx.own) {
    const b = me.body?.position;
    if (b) from = { x: b.x, z: b.z };
  } else {
    const r = remotes.get(fx.p);
    if (r?.target) from = { x: r.target.x, z: r.target.z };
  }
  const kind = fx.op === 'dig' ? 'dig' : 'pile';
  if (camD < 70) {
    if (kind === 'dig') sprayDig(fx.x, fx.y, fx.z, from, k, fx.wet, depth01 > 0.4);
    else puff(fx.x, fx.y, fx.z, fx.op === 'flatten' ? k * 0.6 : k);
  }
  play(kind, vol * (fx.op === 'flatten' ? 0.6 : 1), depth01, fx.wet, fx.p, fx.own);
  if (fx.own && !reducedMotion) nudge = kind === 'dig' ? 1 : 0.6;
}

// Every applied edit (ours and remote players') triggers juice; remote ones are quieter and smaller.
onTerrainCells((edit) => {
  const c = edit.i * terrain.n + edit.j;
  const eff = (terrain.base[c] + terrain.delta[c]) / 100;
  playEditFx({
    op: edit.op,
    p: edit.p,
    own: isMyEdit(edit),
    x: edit.i * CELL - HALF,
    z: HALF - edit.j * CELL,
    y: Math.max(eff, 0),
    depth: -terrain.delta[c],
    wet: eff <= 0.05,
  });
});
onFrame(({ dt }) => {
  updateSettle(dt);
  updateNudge(dt);
});

// Honk (T, or the touch Honk button): a short cartoon honk with a note popping over your head. Every honk takes a tone
// from a shared chord that changes every 10 s of shared time (honkNotes in src/sim/social.ts), so honks heard together
// always form a chord; your colour sets your home tone and flavour, and each press a different shape (honk, toot,
// double, low). When honks from 3 or more different players land within about a second they also play as a held chord
// with a sparkle burst over everyone involved. Each client detects that locally from the honks it receives (plus its
// own), so there is no shared state. Sent as a reliable room message { t:'honk', v } (v: the shape; older tabs send
// none, heard as 0), rate limited on receipt.
import './honk.css';
import * as THREE from 'three';
import { scene, camera } from '../render/scene.ts';
import { COLORS } from '../constants.ts';
import { me } from '../player/player.ts';
import { net, remotes, onRoomReady } from '../netplay/net.ts';
import { getAudio, onBeat } from '../render/audio.ts';
import { onFrame, onStart } from '../loop.ts';
import { registerAction } from '../player/controls.ts';
import { createLimiter, createChordDetector, honkNotes, honkShape, HONK_SHAPES } from '../sim/social.ts';
import { sharedSeconds } from '../netplay/shared-time.ts';

const TUNE = {
  ownGapMs: 300, // our own cap, ~3 per second
  chordWindowMs: 1000,
  chordMin: 3,
  noteLife: 1.0, // seconds the note icon floats
  sparkles: 14, // per player involved in a chord
};

const incoming = createLimiter(3, 1000);
const chord = createChordDetector({ windowMs: TUNE.chordWindowMs, min: TUNE.chordMin });

// ---------------------------------------------------------------- sound
const farGain = (x: number, z: number) => 1 / (1 + ((camera.position.x - x) ** 2 + (camera.position.z - z) ** 2) / 500);

// One horn voice: the bwAH (a quick bend down onto the note), a slight sag at the end. `wave` is the player's flavour.
type Voice = { f: number; at: number; dur: number; bend: number; lp: number; vol: number; wave: OscillatorType };
function horn(ctx: AudioContext, out: AudioNode, { f, at, dur, bend, lp: lpHz, vol, wave }: Voice) {
  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = lpHz;
  lp.Q.value = 2.5;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, at);
  g.gain.linearRampToValueAtTime(vol, at + 0.012);
  g.gain.setValueAtTime(vol * 0.85, at + dur * 0.4);
  g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
  lp.connect(g).connect(out);
  for (const [type, mul, gain] of [
    [wave, 1, wave === 'square' ? 0.32 : 0.5],
    ['triangle', 0.5, 0.7],
  ] as [OscillatorType, number, number][]) {
    const o = ctx.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(f * mul * bend, at);
    o.frequency.exponentialRampToValueAtTime(f * mul, at + 0.05);
    o.frequency.exponentialRampToValueAtTime(f * mul * 0.96, at + dur);
    const og = ctx.createGain();
    og.gain.value = gain;
    o.connect(og).connect(lp);
    o.start(at);
    o.stop(at + dur + 0.03);
  }
}

// A honk on note f (f2: the next chord tone, for the double) in shape v: 0 the honk, 1 a short toot, 2 a honk-honk
// up a chord tone, 3 a low bwomp an octave down. colorIdx picks the player's flavour (reedier on odd colours).
// Plays at once: no waiting for a beat (`onBeat` would snap it only if music installed a snap; none does today).
export function honkSound(f: number, vol: number, v = 0, colorIdx = 0, f2 = f * 1.5) {
  const a = getAudio();
  if (!a || vol < 0.02) return;
  const { ctx, out } = a;
  const { t, freq } = onBeat(ctx.currentTime + 0.004, f);
  const wave: OscillatorType = colorIdx % 2 ? 'square' : 'sawtooth';
  const lp = 1500 + (colorIdx % 4) * 120;
  if (v === 1) horn(ctx, out, { f: freq, at: t, dur: 0.15, bend: 1.06, lp: lp + 400, vol: vol * 0.9, wave });
  else if (v === 2) {
    horn(ctx, out, { f: freq, at: t, dur: 0.11, bend: 1.1, lp, vol: vol * 0.85, wave });
    horn(ctx, out, { f: onBeat(t, f2).freq, at: t + 0.125, dur: 0.2, bend: 1.1, lp, vol, wave });
  } else if (v === 3) horn(ctx, out, { f: freq / 2, at: t, dur: 0.34, bend: 1.2, lp: lp - 400, vol: vol * 1.15, wave });
  else horn(ctx, out, { f: freq, at: t, dur: 0.27, bend: 1.14, lp, vol, wave });
}

export function chordSound(notes: number[], vol: number) {
  const a = getAudio();
  if (!a) return;
  const { ctx, out } = a;
  const t = onBeat(ctx.currentTime + 0.01).t;
  const freqs = notes.map((f) => onBeat(t, f).freq);
  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 2600;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(vol, t + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.95);
  lp.connect(g).connect(out);
  const each = 1 / Math.sqrt(freqs.length);
  for (const f of freqs) {
    for (const [type, mul, gain] of [
      ['sawtooth', 1, 0.35],
      ['sine', 2, 0.25],
      ['triangle', 0.5, 0.5],
    ] as [OscillatorType, number, number][]) {
      const o = ctx.createOscillator();
      o.type = type;
      o.frequency.value = f * mul;
      const og = ctx.createGain();
      og.gain.value = gain * each;
      o.connect(og).connect(lp);
      o.start(t);
      o.stop(t + 1);
    }
  }
  // A little glitter on top: high chimes from the same notes.
  for (let k = 0; k < 6; k++) {
    const f = freqs[k % freqs.length] * (k % 2 ? 4 : 2);
    const t0 = t + 0.04 + k * 0.06;
    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.value = f;
    const og = ctx.createGain();
    og.gain.setValueAtTime(0.0001, t0);
    og.gain.linearRampToValueAtTime(vol * 0.25, t0 + 0.008);
    og.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.25);
    o.connect(og).connect(out);
    o.start(t0);
    o.stop(t0 + 0.3);
  }
}

// ---------------------------------------------------------------- note icons and sparkles
function drawNote(color: string) {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d')!;
  g.lineJoin = g.lineCap = 'round';
  g.strokeStyle = '#13243f';
  g.fillStyle = color;
  g.lineWidth = 9;
  const path = () => {
    g.beginPath();
    g.ellipse(22, 49, 11, 8, -0.4, 0, Math.PI * 2);
    g.moveTo(31, 46);
    g.lineTo(31, 11);
    g.quadraticCurveTo(46, 14, 48, 28);
    g.quadraticCurveTo(40, 22, 31, 21);
  };
  path();
  g.stroke();
  path();
  g.fill();
  g.lineWidth = 6;
  g.strokeStyle = color;
  g.beginPath();
  g.moveTo(31, 46);
  g.lineTo(31, 14);
  g.stroke();
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
const noteTex = COLORS.map(drawNote);

const sparkleTex = (() => {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d')!;
  g.translate(32, 32);
  g.fillStyle = '#fff6c2';
  g.strokeStyle = '#ffb81f';
  g.lineWidth = 3;
  g.beginPath();
  for (let k = 0; k < 8; k++) {
    const r = k % 2 ? 6 : 28,
      a = (k * Math.PI) / 4;
    g[k ? 'lineTo' : 'moveTo'](Math.cos(a) * r, Math.sin(a) * r);
  }
  g.closePath();
  g.stroke();
  g.fill();
  return new THREE.CanvasTexture(c);
})();

const notes: { sprite: THREE.Sprite; avatar: THREE.Object3D; age: number }[] = [];
function popNote(avatar: THREE.Object3D | null | undefined, colorIdx: number) {
  if (!avatar) return;
  const sprite = new THREE.Sprite(
    new THREE.SpriteMaterial({ map: noteTex[colorIdx] ?? noteTex[0], transparent: true, depthWrite: false }),
  );
  sprite.renderOrder = 12;
  sprite.position.set(0.1, 2.6, 0);
  avatar.add(sprite);
  notes.push({ sprite, avatar, age: 0 });
}

const sparks: { sprite: THREE.Sprite; vx: number; vy: number; vz: number; age: number; life: number; s: number }[] = [];
function sparkleOver(avatar: THREE.Object3D | null | undefined) {
  if (!avatar) return;
  const base = avatar.position;
  for (let k = 0; k < TUNE.sparkles; k++) {
    const a = (k / TUNE.sparkles) * Math.PI * 2 + Math.random();
    const sp = 1.4 + Math.random() * 2;
    const sprite = new THREE.Sprite(
      new THREE.SpriteMaterial({ map: sparkleTex, transparent: true, depthWrite: false }),
    );
    sprite.renderOrder = 12;
    sprite.position.set(base.x, base.y + 2.5, base.z);
    const s = 0.25 + Math.random() * 0.3;
    sprite.scale.set(s, s, 1);
    scene.add(sprite);
    sparks.push({
      sprite,
      vx: Math.cos(a) * sp,
      vy: 2 + Math.random() * 2.5,
      vz: Math.sin(a) * sp,
      age: 0,
      life: 0.9 + Math.random() * 0.5,
      s,
    });
  }
  while (sparks.length > 160) {
    const o = sparks.shift()!;
    scene.remove(o.sprite);
    o.sprite.material.dispose();
  }
}

function update(dt: number) {
  for (let k = notes.length - 1; k >= 0; k--) {
    const n = notes[k];
    n.age += dt;
    const f = n.age / TUNE.noteLife;
    if (f >= 1 || !n.avatar.parent) {
      n.avatar.remove(n.sprite);
      n.sprite.material.dispose();
      notes.splice(k, 1);
      continue;
    }
    const pop = Math.min(1, n.age / 0.12);
    const s = 0.75 * (pop < 1 ? 0.3 + pop * 0.9 : 1.2 - Math.min(0.2, (n.age - 0.12) * 0.6));
    n.sprite.scale.set(s, s, 1);
    n.sprite.position.y = 2.5 + f * 0.7;
    n.sprite.position.x = 0.1 + Math.sin(n.age * 9) * 0.08;
    n.sprite.material.opacity = f > 0.65 ? 1 - (f - 0.65) / 0.35 : 1;
  }
  for (let k = sparks.length - 1; k >= 0; k--) {
    const p = sparks[k];
    p.age += dt;
    if (p.age >= p.life) {
      scene.remove(p.sprite);
      p.sprite.material.dispose();
      sparks.splice(k, 1);
      continue;
    }
    p.vy -= 7 * dt;
    p.sprite.position.x += p.vx * dt;
    p.sprite.position.y += p.vy * dt;
    p.sprite.position.z += p.vz * dt;
    const f = p.age / p.life;
    const s = p.s * (1 - f * 0.6);
    p.sprite.scale.set(s, s, 1);
    p.sprite.material.opacity = 1 - f * f;
    p.sprite.material.rotation = p.age * 4;
  }
}
onFrame(({ dt }) => update(dt), { phase: 'late' });

// ---------------------------------------------------------------- honks
// who: 'me' or a remote's peer id; v: the honk's shape (HONK_SHAPES).
const lastNote = new Map<string, number>(); // what each player honked last, for the chord gag
function onHonk(who: string, now: number, v: number) {
  const own = who === 'me';
  const r = own ? null : remotes.get(who);
  const colorIdx = own ? me.colorIdx : (r?.colorIdx ?? 0);
  const avatar = own ? me.avatar : r?.avatar;
  const pos = own ? me.body?.position : r?.target;
  const vol = own ? 0.16 : 0.14 * (pos ? farGain(pos.x, pos.z) : 0.3);
  const [f, f2] = honkNotes(colorIdx, sharedSeconds(), v);
  honkSound(f, vol, v, colorIdx, f2);
  lastNote.set(who, v === 2 ? f2 : f);
  popNote(avatar, colorIdx);
  const ids = chord.add(who, now);
  if (!ids) return;
  chordSound(
    ids.map((id) => lastNote.get(id) ?? f),
    0.17,
  );
  for (const id of ids) sparkleOver(id === 'me' ? me.avatar : remotes.get(id)?.avatar);
}

let lastOwn = -1e9,
  lastShape = 0;
function honkNow() {
  const now = performance.now();
  if (!me.entered || !me.body || me.down || now - lastOwn < TUNE.ownGapMs) return;
  lastOwn = now;
  // a different shape from the last press, so a honk is never the same twice in a row
  const v = (lastShape = (lastShape + 1 + Math.floor(Math.random() * (HONK_SHAPES - 1))) % HONK_SHAPES);
  try {
    net.room?.send({ t: 'honk', v });
  } catch (e) {
    console.warn('[honk] send failed', e);
  }
  onHonk('me', now, v);
}

onRoomReady((room) =>
  room.onMessage((msg, from) => {
    if ((msg as { t?: unknown } | null)?.t !== 'honk' || typeof from !== 'string') return;
    const now = performance.now();
    if (!incoming.allow(from, now)) return;
    onHonk(from, now, honkShape(msg));
  }),
);

onStart(() => {
  registerAction('honk', {
    pad: 'y',
    key: 'KeyT',
    touch: { label: 'Honk', className: 'honk-btn' },
    label: 'Honk',
    detail: 'Three friends at once make a chord',
    group: 'friends',
    order: 0,
    down: honkNow,
  });
});

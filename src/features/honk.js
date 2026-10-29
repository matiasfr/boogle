// Honk (T, or the touch Honk button): a short cartoon honk with a note popping over your head. Everyone has a stable
// pitch from their colour. When honks from 3 or more different players land within about a second they play as a
// chord with a sparkle burst over everyone involved. Each client detects that locally from the honks it receives
// (plus its own), so there is no shared state. Sent as a reliable room message { t:'honk' }, rate limited on receipt.
import './honk.css';
import * as THREE from 'three';
import { scene, camera } from '../scene.js';
import { COLORS } from '../constants.js';
import { me } from '../player.js';
import { net, remotes, onRoomReady } from '../net.js';
import { dom } from '../hud.js';
import { getAudio } from '../audio.js';
import { onFrame, onStart } from '../loop.js';
import { createLimiter, createChordDetector, honkFreq } from '../sim/social.js';

export const TUNE = {
  ownGapMs: 300, // our own cap, ~3 per second
  chordWindowMs: 1000,
  chordMin: 3,
  noteLife: 1.0, // seconds the note icon floats
  sparkles: 14, // per player involved in a chord
};

const incoming = createLimiter(3, 1000);
const chord = createChordDetector({ windowMs: TUNE.chordWindowMs, min: TUNE.chordMin });

// ---------------------------------------------------------------- sound
const farGain = (x, z) => 1 / (1 + ((camera.position.x - x) ** 2 + (camera.position.z - z) ** 2) / 500);

function honkSound(freq, vol) {
  const a = getAudio();
  if (!a || vol < 0.02) return;
  const { ctx, out } = a;
  const t = ctx.currentTime + 0.004;
  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 1700;
  lp.Q.value = 2.5;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(vol, t + 0.015);
  g.gain.setValueAtTime(vol * 0.85, t + 0.11);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.27);
  lp.connect(g).connect(out);
  for (const [type, mul, gain] of [
    ['sawtooth', 1, 0.5],
    ['triangle', 0.5, 0.7],
  ]) {
    const o = ctx.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(freq * mul * 1.14, t);
    o.frequency.exponentialRampToValueAtTime(freq * mul, t + 0.05); // the bwAH
    o.frequency.exponentialRampToValueAtTime(freq * mul * 0.96, t + 0.27);
    const og = ctx.createGain();
    og.gain.value = gain;
    o.connect(og).connect(lp);
    o.start(t);
    o.stop(t + 0.3);
  }
}

function chordSound(freqs, vol) {
  const a = getAudio();
  if (!a) return;
  const { ctx, out } = a;
  const t = ctx.currentTime + 0.01;
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
    ]) {
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
function drawNote(color) {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d');
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
  const g = c.getContext('2d');
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

const notes = []; // { sprite, avatar, age }
function popNote(avatar, colorIdx) {
  if (!avatar) return;
  const sprite = new THREE.Sprite(
    new THREE.SpriteMaterial({ map: noteTex[colorIdx] ?? noteTex[0], transparent: true, depthWrite: false }),
  );
  sprite.renderOrder = 12;
  sprite.position.set(0.1, 2.6, 0);
  avatar.add(sprite);
  notes.push({ sprite, avatar, age: 0 });
}

const sparks = []; // { sprite, vx, vy, vz, age, life }
function sparkleOver(avatar) {
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
    const o = sparks.shift();
    scene.remove(o.sprite);
    o.sprite.material.dispose();
  }
}

function update(dt) {
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
// who: 'me' or a remote's peer id.
function onHonk(who, now) {
  const own = who === 'me';
  const r = own ? null : remotes.get(who);
  const colorIdx = own ? me.colorIdx : (r?.colorIdx ?? 0);
  const avatar = own ? me.avatar : r?.avatar;
  const pos = own ? me.body?.position : r?.target;
  const vol = own ? 0.16 : 0.14 * (pos ? farGain(pos.x, pos.z) : 0.3);
  honkSound(honkFreq(colorIdx), vol);
  popNote(avatar, colorIdx);
  const ids = chord.add(who, now);
  if (!ids) return;
  const freqs = ids.map((id) => honkFreq(id === 'me' ? me.colorIdx : (remotes.get(id)?.colorIdx ?? 0)));
  chordSound(freqs, 0.17);
  for (const id of ids) sparkleOver(id === 'me' ? me.avatar : remotes.get(id)?.avatar);
}

let lastOwn = -1e9;
export function honkNow() {
  const now = performance.now();
  if (!me.entered || !me.body || me.down || now - lastOwn < TUNE.ownGapMs) return;
  lastOwn = now;
  try {
    net.room?.send({ t: 'honk' });
  } catch (e) {
    console.warn('[honk] send failed', e);
  }
  onHonk('me', now);
}

onRoomReady((room) =>
  room.onMessage((msg, from) => {
    if (msg?.t !== 'honk' || typeof from !== 'string') return;
    const now = performance.now();
    if (!incoming.allow(from, now)) return;
    onHonk(from, now);
  }),
);

onStart(() => {
  const typing = () => document.activeElement === dom.nameInput;
  addEventListener('keydown', (e) => {
    if (e.code !== 'KeyT' || e.repeat || e.ctrlKey || e.metaKey || e.altKey || typing()) return;
    honkNow();
  });
  const row = document.createElement('div');
  row.innerHTML = '<kbd>T</kbd><span>Honk (three friends at once make a chord)</span>';
  document.getElementById('help')?.append(row);
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'tbtn honk-btn';
  btn.textContent = 'Honk';
  btn.addEventListener('pointerdown', (e) => {
    e.stopPropagation();
    honkNow();
  });
  document.getElementById('touch')?.append(btn);
});

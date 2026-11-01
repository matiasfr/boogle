// Context ping (G, middle click, or the touch Ping button): drops a marker where you are aiming, "Ball!" near the
// ball, "Look!" otherwise. Everyone sees it in the pinger's colour with their name for a few
// seconds, pinned to the screen edge with an arrow when it is off-screen. Sent as a reliable room message
// { t:'ping', x, y, z, k }, validated and rate limited on receipt (src/sim/social.ts). No scores, no sim state.
import './ping.css';
import * as THREE from 'three';
import { scene, camera, toScreen } from '../render/scene.js';
import { COLORS, HALF, SEA, reducedMotion } from '../constants.ts';
import { groundHeight } from '../adapters/terrain.js';
import { clamp } from '../math.ts';
import { me, camForward } from '../player/player.ts';
import { ball } from '../physics/ball.ts';
import { net, remotes, onRoomReady } from '../netplay/net.ts';
import { getAudio } from '../render/audio.js';
import { onFrame, onStart } from '../loop.ts';
import { registerAction } from '../player/controls.ts';
import { PING_KINDS, validatePing, createLimiter, honkFreq } from '../sim/social.ts';

const TUNE = {
  lifeMs: 4000,
  fadeMs: 500,
  ownGapMs: 1000, // our own cooldown
  ballRadius: 1.6, // how close the aim ray must pass to the ball for "Ball!"
  maxRange: 90,
};

const incoming = createLimiter(1, 800); // a little looser than our own 1 s gap, so honest senders never get dropped
const fwd = new THREE.Vector3(),
  tmp = new THREE.Vector3();

// ---------------------------------------------------------------- aiming
function aimPing() {
  camForward(fwd);
  const o = camera.position;
  const bp = ball.disp.p;
  const t = tmp.copy(bp).sub(o).dot(fwd);
  if (t > 0 && t < TUNE.maxRange && tmp.copy(o).addScaledVector(fwd, t).distanceTo(bp) < TUNE.ballRadius)
    return { x: bp.x, y: bp.y, z: bp.z, k: 'ball' };
  let prev = 0;
  for (let s = 0.5; s < TUNE.maxRange; s += 0.5) {
    const x = o.x + fwd.x * s,
      y = o.y + fwd.y * s,
      z = o.z + fwd.z * s;
    if (Math.abs(x) > HALF - 1 || Math.abs(z) > HALF - 1) break;
    const floor = Math.max(groundHeight(x, z), SEA);
    if (y <= floor) {
      let lo = prev,
        hi = s;
      for (let k = 0; k < 6; k++) {
        const m = (lo + hi) / 2;
        const mx = o.x + fwd.x * m,
          mz = o.z + fwd.z * m;
        if (o.y + fwd.y * m <= Math.max(groundHeight(mx, mz), SEA)) hi = m;
        else lo = m;
      }
      const hx = o.x + fwd.x * hi,
        hz = o.z + fwd.z * hi;
      return { x: hx, y: Math.max(groundHeight(hx, hz), SEA), z: hz, k: 'look' };
    }
    prev = s;
  }
  // Sky or beyond the island: a far point along the view, kept inside the bounds.
  const d = 40;
  return {
    x: clamp(o.x + fwd.x * d, -HALF + 2, HALF - 2),
    y: o.y + fwd.y * d,
    z: clamp(o.z + fwd.z * d, -HALF + 2, HALF - 2),
    k: 'look',
  };
}

let lastOwn = -1e9;
function pingNow() {
  const now = performance.now();
  if (!me.entered || !me.body || now - lastOwn < TUNE.ownGapMs) return;
  lastOwn = now;
  const a = aimPing();
  const msg = {
    t: 'ping',
    x: Math.round(a.x * 10) / 10,
    y: Math.round(a.y * 10) / 10,
    z: Math.round(a.z * 10) / 10,
    k: a.k,
  };
  try {
    net.room?.send(msg);
  } catch (e) {
    console.warn('[ping] send failed', e);
  }
  addPing('me', msg, me.name, me.colorIdx, true);
}

// ---------------------------------------------------------------- markers
const layer = document.createElement('div');
layer.className = 'ping-layer';
const pings = new Map(); // sender -> { x,y,z,k, born, el, arrow, dist, ring }

const ringGeo = new THREE.RingGeometry(0.55, 0.7, 36).rotateX(-Math.PI / 2);

function addPing(from, p, name, colorIdx, own) {
  const old = pings.get(from);
  if (old) removePing(from, old);
  const color = COLORS[colorIdx] ?? COLORS[0];
  const el = document.createElement('div');
  el.className = 'ping';
  el.style.setProperty('--c', color);
  const card = document.createElement('div');
  card.className = 'ping-card';
  const label = document.createElement('b');
  label.textContent = PING_KINDS[p.k];
  const who = document.createElement('span');
  who.textContent = name;
  card.append(label, who);
  const arrow = document.createElement('div');
  arrow.className = 'ping-arrow';
  const dist = document.createElement('div');
  dist.className = 'ping-dist';
  el.append(card, arrow, dist);
  layer.append(el);
  const ring = new THREE.Mesh(
    ringGeo,
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.9, depthWrite: false, depthTest: false }),
  );
  ring.renderOrder = 12;
  ring.position.set(p.x, p.y + 0.08, p.z);
  scene.add(ring);
  pings.set(from, { ...p, born: performance.now(), el, arrow, dist, ring, lastDist: '' });
  chime(colorIdx, p.k, own);
}
function removePing(from, p) {
  p.el.remove();
  scene.remove(p.ring);
  p.ring.material.dispose();
  pings.delete(from);
}

function chime(colorIdx, kind, own) {
  const a = getAudio();
  if (!a) return;
  const { ctx, out } = a;
  const f = honkFreq(colorIdx) * 2;
  const t = ctx.currentTime + 0.005;
  const notes = kind === 'ball' ? [f, f * 1.5] : [f, f * 1.25];
  notes.forEach((hz, k) => {
    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.value = hz;
    const g = ctx.createGain();
    const t0 = t + k * 0.085;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.linearRampToValueAtTime((own ? 0.16 : 0.12) * (k ? 0.9 : 1), t0 + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.28);
    o.connect(g).connect(out);
    o.start(t0);
    o.stop(t0 + 0.3);
  });
}

const EDGE_X = 100,
  EDGE_Y = 84;
const over = new THREE.Vector3(),
  onScreen = { x: 0, y: 0, behind: false };
function updatePings(now) {
  const w = innerWidth,
    h = innerHeight;
  for (const [from, p] of pings) {
    const age = now - p.born;
    if (age > TUNE.lifeMs) {
      removePing(from, p);
      continue;
    }
    const fade = Math.min(1, (TUNE.lifeMs - age) / TUNE.fadeMs);
    p.el.style.opacity = fade.toFixed(2);
    // The ground ring pulses outward a couple of times, then rests.
    const pulse = reducedMotion ? 1 : 1 + 0.35 * Math.sin(age * 0.008) * Math.exp(-age / 1500);
    p.ring.scale.setScalar(pulse * Math.min(1, 0.3 + age / 200));
    p.ring.material.opacity = 0.9 * fade;

    const { x: px, y: py, behind } = toScreen(over.set(p.x, p.y + 1.4, p.z), onScreen, w, h);
    // Behind the camera the projection comes out mirrored through the centre; mirror it back to aim the pointer.
    const sx = behind ? w - px : px,
      sy = behind ? h - py : py;
    const on = !behind && sx > 40 && sx < w - 40 && sy > 50 && sy < h - 40;
    p.el.classList.toggle('off', !on);
    let x = sx,
      y = sy;
    if (!on) {
      let dx = sx - w / 2,
        dy = sy - h / 2;
      const len = Math.hypot(dx, dy) || 1;
      dx /= len;
      dy /= len;
      const hw = Math.max(1, w / 2 - EDGE_X),
        hh = Math.max(1, h / 2 - EDGE_Y);
      const t = Math.min(dx ? hw / Math.abs(dx) : Infinity, dy ? hh / Math.abs(dy) : Infinity);
      x = w / 2 + dx * t;
      y = h / 2 + dy * t;
      p.arrow.style.transform = `rotate(${Math.atan2(dy, dx).toFixed(3)}rad) translateX(54px)`;
    }
    p.el.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`;
    if (!on && me.body) {
      const text = `${Math.round(Math.hypot(p.x - me.body.position.x, p.z - me.body.position.z))} m`;
      if (text !== p.lastDist) p.dist.textContent = p.lastDist = text;
    }
  }
}

// ---------------------------------------------------------------- wiring
onRoomReady((room) =>
  room.onMessage((msg, from) => {
    if (msg?.t !== 'ping') return;
    const p = validatePing(msg);
    if (!p || typeof from !== 'string' || !incoming.allow(from, performance.now())) return;
    const r = remotes.get(from);
    addPing(from, p, r?.name || 'Someone', r?.colorIdx ?? 0, false);
  }),
);

onStart(() => {
  (document.querySelector('.hud') ?? document.body).append(layer);

  document.getElementById('view')?.addEventListener('mousedown', (e) => {
    if (e.button !== 1) return;
    e.preventDefault();
    pingNow();
  });

  registerAction('ping', {
    pad: 'left',
    key: 'KeyG',
    touch: { label: 'Ping', className: 'ping-btn' },
    label: 'Ping where you look',
    keys: ['KeyG', 'Mouse1'],
    group: 'friends',
    order: 1,
    down: pingNow,
  });
});

onFrame(({ now }) => updatePings(now), { phase: 'late' });

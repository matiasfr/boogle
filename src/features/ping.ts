// A reliable, short-lived marker where you aim. Ping a friend's live marker to answer them.
import './ping.css';
import * as THREE from 'three';
import { MeshBasicNodeMaterial } from 'three/webgpu';
import { camera, toScreen, view } from '../render/scene.ts';
import { readableUnlit } from '../render/readable-unlit.ts';
import { COLORS, SEA, reducedMotion } from '../constants.ts';
import { groundHeight } from '../island/terrain.ts';
import { waterField } from '../physics/water-field.ts';
import { raycastClosest, rayHit } from '../physics/engine.ts';
import { GROUP } from '../physics/physics.ts';
import { me } from '../player/player.ts';
import { ball } from '../entities/ball/state.ts';
import { pingHint } from '../player/ping-hints.ts';
import { net, remotes, onRoomReady } from '../netplay/net.ts';
import { getAudio } from '../render/audio.ts';
import { onStart } from '../loop.ts';
import { defineKind, despawn, spawn, type GameEntity } from '../entity/entity.ts';
import { registerAction } from '../player/controls.ts';
import {
  MAX_PING_SEQ,
  PING_KINDS,
  validatePing,
  createLimiter,
  honkFreq,
  type Ping,
  type PingReply,
} from '../sim/social.ts';

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
const hit = rayHit();
const contact = (x: number, y: number, z: number) =>
  Math.max(groundHeight(x, z), waterField.moving ? waterField.nearby({ x, y, z }).height : SEA);

// ---------------------------------------------------------------- aiming
function aimPing(): Omit<Ping, 'seq'> {
  camera.getWorldDirection(fwd);
  const o = camera.position;
  // Authored places sit outside the original island grid; use their actual solid surfaces too.
  tmp.copy(o).addScaledVector(fwd, TUNE.maxRange);
  const solid = raycastClosest(o, tmp, { mask: GROUP.SCENERY | GROUP.CAVE, skipBackfaces: true }, hit);
  const bp = ball.pose.p;
  const t = tmp.copy(bp).sub(o).dot(fwd);
  if (
    t > 0 &&
    t < (solid ? hit.distance : TUNE.maxRange) &&
    tmp.copy(o).addScaledVector(fwd, t).distanceTo(bp) < TUNE.ballRadius
  )
    return { x: bp.x, y: bp.y, z: bp.z, k: 'ball' };
  let prev = 0;
  for (let s = 0.5; s < (solid ? hit.distance : TUNE.maxRange); s += 0.5) {
    const x = o.x + fwd.x * s,
      y = o.y + fwd.y * s,
      z = o.z + fwd.z * s;
    const floor = contact(x, y, z);
    if (y <= floor) {
      let lo = prev,
        hi = s;
      for (let k = 0; k < 6; k++) {
        const m = (lo + hi) / 2;
        const mx = o.x + fwd.x * m,
          mz = o.z + fwd.z * m;
        if (o.y + fwd.y * m <= contact(mx, o.y + fwd.y * m, mz)) hi = m;
        else lo = m;
      }
      const hx = o.x + fwd.x * hi,
        hz = o.z + fwd.z * hi;
      return hintOrLook(tmp.set(hx, contact(hx, o.y + fwd.y * hi, hz), hz));
    }
    prev = s;
  }
  if (solid) return hintOrLook(tmp.copy(hit.hitPointWorld));
  // A miss stays near the view, never clamped back to the original island hundreds of metres away.
  return hintOrLook(tmp.copy(o).addScaledVector(fwd, TUNE.maxRange), true);
}

function hintOrLook(end: THREE.Vector3, miss = false): Omit<Ping, 'seq'> {
  const hint = pingHint(camera.position, end);
  const { x, y, z } = hint?.at ?? (miss ? end.copy(camera.position).addScaledVector(fwd, 30) : end);
  return { x, y, z, k: hint?.k ?? 'look' };
}

let lastOwn = -1e9;
let nextSeq = 0;
function sendPing(message: Ping | PingReply) {
  try {
    net.room?.send({ t: 'ping', ...message });
  } catch (e) {
    console.warn('[ping] send failed', e);
  }
}
function pingNow(tapped?: string) {
  const now = performance.now();
  if (!me.entered || !me.body || now - lastOwn < TUNE.ownGapMs) return;
  camera.getWorldDirection(fwd);
  let of = tapped;
  let best = Math.cos((6 * Math.PI) / 180);
  for (const [id, marker] of pings) {
    if (tapped !== undefined || marker.own || marker.expires <= now) continue;
    const cosine = tmp.copy(marker.at).sub(camera.position).normalize().dot(fwd);
    if (cosine >= best) {
      best = cosine;
      of = id;
    }
  }
  if (of !== undefined) {
    const marker = pings.get(of);
    if (!marker || marker.own || marker.expires <= now) return;
    lastOwn = now;
    sendPing({ k: 'omw', of, seq: marker.seq });
    marker.reply(net.room?.selfId ?? 'me', me.name, me.colorIdx, true);
    return;
  }
  lastOwn = now;
  const a = aimPing();
  const msg = {
    x: Math.round(a.x * 10) / 10,
    y: Math.round(a.y * 10) / 10,
    z: Math.round(a.z * 10) / 10,
    k: a.k,
    seq: nextSeq,
  };
  nextSeq = (nextSeq + 1) % (MAX_PING_SEQ + 1);
  sendPing(msg);
  addPing(net.room?.selfId ?? 'me', msg, me.name, me.colorIdx, true);
}

// ---------------------------------------------------------------- markers
const EDGE_X = 100,
  EDGE_Y = 84;
const over = new THREE.Vector3(),
  onScreen = { x: 0, y: 0, behind: false };
const layer = document.createElement('div');
layer.className = 'ping-layer';
type Marker = {
  seq: number;
  entity: GameEntity;
  own: boolean;
  expires: number;
  at: THREE.Vector3;
  reply: (id: string, name: string, colorIdx: number, own: boolean) => void;
};
const pings = new Map<string, Marker>();

const ringGeo = new THREE.RingGeometry(0.55, 0.7, 36).rotateX(-Math.PI / 2);

// Each ping is an entity, the worked example of a short-lived one: its ring is its mesh, it despawns when its time is up,
// and dispose takes away what the core doesn't own (src/entities/ball/ is the long-lived example).
defineKind('ping', { lateUpdate: 0 });

function addPing(from: string, p: Ping, name: string, colorIdx: number, own: boolean) {
  const old = pings.get(from);
  if (old) despawn(old.entity);
  const color = COLORS[colorIdx] ?? COLORS[0]!;
  const el = document.createElement('div');
  el.className = 'ping';
  el.style.setProperty('--c', color);
  const card = document.createElement('div');
  card.className = 'ping-card';
  if (!own) {
    card.classList.add('replyable');
    card.addEventListener('click', () => {
      if (pings.get(from) === marker) pingNow(from);
    });
  }
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
    readableUnlit(
      new MeshBasicNodeMaterial({ color, transparent: true, opacity: 0.9, depthWrite: false, depthTest: false }),
    ),
  );
  ring.renderOrder = 12;
  ring.position.set(p.x, p.y + 0.08, p.z);
  const born = performance.now();
  let lastDist = '';
  const entity: GameEntity = spawn({
    kind: 'ping',
    mesh: ring,
    lateUpdate({ now }) {
      const age = now - born;
      if (now >= marker.expires) {
        despawn(entity);
        if (pings.get(from) === marker) pings.delete(from);
        return;
      }
      const fade = Math.min(1, (marker.expires - now) / TUNE.fadeMs);
      el.style.opacity = fade.toFixed(2);
      // The ground ring pulses outward a couple of times, then rests.
      const pulse = reducedMotion ? 1 : 1 + 0.35 * Math.sin(age * 0.008) * Math.exp(-age / 1500);
      ring.scale.setScalar(pulse * Math.min(1, 0.3 + age / 200));
      ring.material.opacity = 0.9 * fade;

      const w = view.w,
        h = view.h;
      const { x: px, y: py, behind } = toScreen(over.set(p.x, p.y + 1.4, p.z), onScreen, w, h);
      // Behind the camera the projection comes out mirrored through the centre; mirror it back to aim the pointer.
      const sx = behind ? w - px : px,
        sy = behind ? h - py : py;
      const on = !behind && sx > 40 && sx < w - 40 && sy > 50 && sy < h - 40;
      el.classList.toggle('off', !on);
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
        arrow.style.transform = `rotate(${Math.atan2(dy, dx).toFixed(3)}rad) translateX(54px)`;
      }
      el.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`;
      if (!on && me.body) {
        const text = `${Math.round(Math.hypot(p.x - me.body.position.x, p.z - me.body.position.z))} m`;
        if (text !== lastDist) dist.textContent = lastDist = text;
      }
    },
    dispose() {
      el.remove();
      ring.material.dispose();
    },
  });
  const replies = new Map<string, HTMLElement>();
  const marker: Marker = {
    seq: p.seq,
    entity,
    own,
    expires: born + TUNE.lifeMs,
    at: new THREE.Vector3(p.x, p.y + 1.4, p.z),
    reply(id, name, colorIdx, local) {
      if (performance.now() >= marker.expires) return;
      const row = replies.get(id) ?? document.createElement('span');
      row.className = 'ping-reply';
      row.textContent = name + ' · On my way'; // Placeholder for the owner's words.
      row.style.backgroundColor = COLORS[colorIdx] ?? COLORS[0]!;
      replies.set(id, row);
      card.append(row);
      marker.expires += 2000;
      chime(colorIdx, p.k, local);
    },
  };
  pings.set(from, marker);
  chime(colorIdx, p.k, own);
}

export function chime(colorIdx: number, kind: Ping['k'], own: boolean) {
  const a = getAudio('social');
  if (!a) return;
  const { ctx, out } = a;
  const f = honkFreq(colorIdx)! * 2;
  const t = ctx.currentTime + 0.005;
  const notes = [f, f * { ball: 1.5, look: 1.25, rails: 4 / 3, train: 5 / 3 }[kind]];
  notes.forEach((hz, k) => {
    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.value = hz;
    const g = ctx.createGain();
    // subtle (2026-11-02 audit): about 5 dB quieter, a soft 18 ms swell instead of a strike, a short tail, and the
    // second note under the first
    const t0 = t + k * 0.075;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.linearRampToValueAtTime((own ? 0.09 : 0.065) * (k ? 0.75 : 1), t0 + 0.018);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.17);
    o.connect(g).connect(out);
    o.start(t0);
    o.stop(t0 + 0.2);
  });
}

// ---------------------------------------------------------------- wiring
onRoomReady((room) =>
  room.onMessage((msg, from) => {
    if ((msg as { t?: unknown } | null)?.t !== 'ping') return;
    const p = validatePing(msg);
    if (!p || typeof from !== 'string' || !incoming.allow(from, performance.now())) return;
    const r = remotes.get(from);
    const name = r?.name || 'Someone',
      color = r?.colorIdx ?? 0;
    if (p.k === 'omw') {
      const marker = pings.get(p.of);
      if (marker?.seq === p.seq) marker.reply(from, name, color, false);
    } else addPing(from, p, name, color, false);
  }),
);

onStart(() => {
  (document.querySelector('.hud') ?? document.body).append(layer);

  registerAction('ping', {
    pad: 'left',
    key: 'KeyG',
    mouse: 1,
    touch: { label: 'Ping', className: 'ping-btn' },
    label: 'Ping where you look',
    keys: ['KeyG', 'Mouse1'],
    group: 'friends',
    order: 1,
    down: pingNow,
  });
});

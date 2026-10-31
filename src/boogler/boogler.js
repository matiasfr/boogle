// The Boogler: a squished, smiling NPC who waddles around the island.
//
// Authority: Host state. The host decides where he walks and publishes it as the host field `g: { p:[x,z], r, w, m }`
// (r = yaw, w = 1 while walking, m = MODE; missing means CALM). Everyone else interpolates those snapshots, like a
// remote player. He is not part of the deterministic world sim (he never changes terrain or crops), so his brain
// can use floats; it still uses the seeded RNG so no Math.random sneaks into shared code. Solo tabs, and clients that
// hear nothing from a host for a few seconds, walk him locally so he never freezes. Animation (waddle, breathing, hops)
// is cosmetic and local.
//
// He has a kinematic physics body, so the ball bounces off him and players can bump into him or hop on his head.
// Every player also publishes how they treat him (`bg` in presence, see src/boogler/play.js): the host stops for
// players who talk to or pet him, hurries while someone rides him, and runs from players he's wary of.
import * as THREE from 'three';
import { FIXED, INTERP_MS, CELL, HALF, reducedMotion } from '../constants.js';
import { clamp, lerp, angleLerp, finiteArr, r2, mulberry32 } from '../math.js';
import { groundHeight } from '../adapters/terrain.js';
import { scene, camera, toScreen } from '../render/scene.js';
import { playerMat, teleport, NOT_SCENERY } from '../physics/physics.js';
import { createBody, addBody, onPreStep, BODY } from '../physics/engine.ts';
import { blockedAt } from '../render/props.js';
import { island } from '../island/index.js';
import { MAINLAND } from '../island/shape.js';
import { PATCH } from '../sim/mushrooms.ts';
import { me } from '../player/player.js';
import { net, remotes, addHostField } from '../netplay/net.ts';
import { createSnaps } from '../netplay/snaps.ts';

// Shape: about three times as wide as he is tall.
export const W_R = 0.8; // half width
const H_R = 0.27; // half height
const BODY_Y = 0.32; // body center above the ground
const BODY_HEX = '#b99cff';
const FOOT_HEX = '#6c4fd1';
const FACE_HEX = '#1d1640';

// Wandering.
const SPEED = 1.5; // m/s
const TURN = 3.2; // rad/s
const MIN_H = 0.45; // stays on dry land
const MAX_H = 30; // the whole island, massif included
const MAX_STEP = 0.55; // max height change per metre of path
const MAP_LIMIT = HALF - 25;
// Home is the mushroom garden: he drifts back towards it, and only now and then sets off to see the rest of the island.
const HOME_X = (PATCH.i0 + PATCH.w / 2) * CELL - HALF,
  HOME_Z = HALF - (PATCH.j0 + PATCH.h / 2) * CELL;
const HOME_RANGE = 22; // metres around the garden where he just potters about
const TRIP_CHANCE = 0.08; // per stop near home: chance to head off somewhere far
const FACE_RANGE = 7; // turns to look at players this close while idle
const STALE_MS = 3000; // no host snapshot for this long: walk him locally
// His top hat, comically tall: the brim is a third of his radius (it sits on top of his head, covering none of it), the
// crown half the brim's radius, and the whole hat about one and a half times his height.
const BRIM_R = W_R / 3;
const CROWN_R = BRIM_R / 2;
const BRIM_H = 0.03;
const HAT_H = 1.5 * (BODY_Y + H_R); // brim included
const HAT_SINK = 0.015; // into the curve of his head, so no gap shows under the brim
const LABEL_GAP = 0.45; // name tag anchor above the top of the hat (a crushed hat too, so it clears a rider)
const FLEE_SPEED = 3.4;
const RIDDEN_SPEED = 2.3;
const FLEE_RANGE = 9;
const ATTEND_RANGE = 5;
export const PUFF_MS = 750;

// What a player is doing with him (published by each player) and what he is doing (published by the host).
// 3 was PET (petting now happens inside TALK): never reuse it, old tabs may still send it and it must read as NONE.
export const ACT = { NONE: 0, TALK: 1, RIDE: 2 };
export const MODE = { CALM: 0, FLEE: 1, RIDDEN: 2 };

const rng = mulberry32((Date.now() ^ 0x5eed) | 0);
const range = (a, b) => a + rng() * (b - a);

const sim = { x: 0, z: 0, yaw: 0, walking: false, tx: 0, tz: 0, wait: 1, mode: MODE.CALM, fleeCheck: 0 };
const disp = { x: 0, z: 0, yaw: 0, walking: false, mode: MODE.CALM };
const target = { x: 0, z: 0, yaw: 0, walking: false, mode: MODE.CALM };
const snaps = createSnaps();
let src = null;
let lastSnapAt = 0;
let simulating = false;
const bootAt = performance.now();

let group = null;
let parts = null;
let body = null;

// `me` is this player's side of things, written by src/boogler/play.js: act (ACT; petting is part of TALK), wary (he
// runs from us), and the face to pull while we talk (mood, speaking).
export const boogler = {
  disp,
  labelPos: new THREE.Vector3(),
  center: new THREE.Vector3(),
  body: null,
  me: { act: ACT.NONE, wary: false, mood: null, speaking: false },
};

// ---------------------------------------------------------------- terrain checks
function blocked(x, z, pad = 0) {
  if (Math.abs(x) > MAP_LIMIT || Math.abs(z) > MAP_LIMIT) return true;
  const h = groundHeight(x, z);
  if (h < MIN_H || h > MAX_H) return true;
  if (blockedAt(x, z, W_R + pad)) return true;
  // Keep off the mushroom patch so he never looks like he's trampling the garden.
  const m = (W_R + pad) / CELL + 0.5,
    i = (x + HALF) / CELL,
    j = (HALF - z) / CELL;
  if (i > PATCH.i0 - m && i < PATCH.i0 + PATCH.w + m && j > PATCH.j0 - m && j < PATCH.j0 + PATCH.h + m) return true;
  return false;
}

function pathClear(x0, z0, x1, z1) {
  const len = Math.hypot(x1 - x0, z1 - z0);
  const n = Math.max(1, Math.ceil(len));
  let prev = groundHeight(x0, z0);
  for (let k = 1; k <= n; k++) {
    const x = lerp(x0, x1, k / n),
      z = lerp(z0, z1, k / n);
    if (blocked(x, z, 0.2)) return false;
    const h = groundHeight(x, z);
    if (Math.abs(h - prev) > (MAX_STEP * len) / n) return false;
    prev = h;
  }
  return true;
}

// Where he's heading on a trip away from home (a POI or a random far spot), or null while pottering about.
let trip = null;

// Sets his next walk target if the way there is clear.
function headFor(x, z) {
  if (!pathClear(sim.x, sim.z, x, z)) return false;
  sim.tx = x;
  sim.tz = z;
  return true;
}

function tryStep(a, dmin, dmax) {
  for (let tries = 0; tries < 12; tries++) {
    const aa = a + (rng() - 0.5) * (tries < 6 ? 0.9 : 2.6),
      d = range(dmin, dmax);
    if (headFor(sim.x + Math.cos(aa) * d, sim.z + Math.sin(aa) * d)) return true;
  }
  return false;
}

function pickTarget() {
  const homeD = Math.hypot(HOME_X - sim.x, HOME_Z - sim.z);
  if (!trip && homeD < HOME_RANGE * 1.5 && rng() < TRIP_CHANCE) {
    // Off to see a POI (or somewhere random), standing a little way from it.
    const spots = island.keepOut;
    if (spots.length && rng() < 0.7) {
      const k = spots[Math.floor(rng() * spots.length)];
      const a = rng() * Math.PI * 2;
      trip = { x: k.x + Math.cos(a) * (k.r + 6), z: k.z + Math.sin(a) * (k.r + 6) };
    } else
      trip = {
        x: range(MAINLAND.x - MAINLAND.rx, MAINLAND.x + MAINLAND.rx),
        z: range(MAINLAND.z - MAINLAND.rz, 0),
      };
  }
  if (trip) {
    const d = Math.hypot(trip.x - sim.x, trip.z - sim.z);
    if (d < 8 || rng() < 0.03)
      trip = null; // arrived (or got bored on the way)
    else if (tryStep(Math.atan2(trip.z - sim.z, trip.x - sim.x), 8, Math.min(22, d))) return true;
    else trip = null;
  }
  // Pottering: random little walks, pulled back towards the garden the further he strays.
  const pull = clamp((homeD - HOME_RANGE) / 40, 0, 0.85);
  if (rng() < pull && tryStep(Math.atan2(HOME_Z - sim.z, HOME_X - sim.x), 6, 18)) return true;
  return tryStep(rng() * Math.PI * 2, 5, 20);
}

function findStart() {
  // A spot on dry land near the spawn, so new players meet him early.
  for (let ring = 4; ring < 40; ring += 2)
    for (let k = 0; k < 16; k++) {
      const a = (k / 16) * Math.PI * 2;
      const x = 6 + Math.cos(a) * ring,
        z = 22 + Math.sin(a) * ring;
      if (!blocked(x, z, 0.5)) return { x, z };
    }
  return { x: 0, z: 0 };
}

// ---------------------------------------------------------------- brain (authority only)
function visitors() {
  const out = [];
  if (me.entered && me.body)
    out.push({ x: me.body.position.x, z: me.body.position.z, act: boogler.me.act, wary: boogler.me.wary });
  for (const r of remotes.values())
    if (r.entered && r.avatar) out.push({ x: r.target.x, z: r.target.z, act: r.bg?.[0] ?? 0, wary: r.bg?.[1] === 1 });
  return out;
}

function fleeFrom(t) {
  const away = Math.atan2(sim.z - t.z, sim.x - t.x);
  for (const off of [0, 0.6, -0.6, 1.2, -1.2, 1.8, -1.8]) {
    const d = range(7, 12);
    if (headFor(sim.x + Math.cos(away + off) * d, sim.z + Math.sin(away + off) * d)) return true;
  }
  return false;
}

function turnToward(yaw, dt) {
  const d = angleLerp(sim.yaw, yaw, 1) - sim.yaw;
  sim.yaw += clamp(d, -TURN * dt, TURN * dt);
  return Math.abs(d);
}

const facing = (p) => Math.atan2(-(p.x - sim.x), -(p.z - sim.z));

function think(dt) {
  let focus = null,
    focusD = ATTEND_RANGE,
    threat = null,
    threatD = FLEE_RANGE,
    nearest = null, // whoever he turns to look at while idle
    nearestD = FACE_RANGE,
    ridden = false;
  for (const v of visitors()) {
    const d = Math.hypot(v.x - sim.x, v.z - sim.z);
    if (d < nearestD && d > 0.5) [nearest, nearestD] = [v, d];
    if (v.act === ACT.RIDE && d < W_R + 0.8) ridden = true;
    else if (v.act === ACT.TALK) {
      if (d < focusD) [focus, focusD] = [v, d];
    } else if (v.wary && d < threatD) [threat, threatD] = [v, d];
  }
  sim.mode = threat ? MODE.FLEE : ridden ? MODE.RIDDEN : MODE.CALM;

  if (focus && !ridden) {
    sim.walking = false;
    sim.wait = Math.max(sim.wait, 1);
    turnToward(facing(focus), dt);
    return;
  }
  if (threat) {
    sim.fleeCheck -= dt;
    if (!sim.walking || sim.fleeCheck <= 0) {
      sim.fleeCheck = 0.8;
      sim.walking = fleeFrom(threat) || sim.walking;
    }
  } else if (ridden) sim.wait = Math.min(sim.wait, 0.3);

  if (!sim.walking) {
    if (nearest) turnToward(facing(nearest), dt);
    sim.wait -= dt;
    if (sim.wait <= 0) {
      if (pickTarget()) sim.walking = true;
      else sim.wait = 1;
    }
    return;
  }
  const dx = sim.tx - sim.x,
    dz = sim.tz - sim.z;
  const dist = Math.hypot(dx, dz);
  if (dist < 0.3) {
    sim.walking = false;
    sim.wait = range(1.5, 5);
    return;
  }
  const off = turnToward(Math.atan2(-dx, -dz), dt);
  const speed = sim.mode === MODE.FLEE ? FLEE_SPEED : sim.mode === MODE.RIDDEN ? RIDDEN_SPEED : SPEED;
  const step = Math.min(dist, speed * dt * Math.max(0, Math.cos(off)));
  const nx = sim.x + (dx / dist) * step,
    nz = sim.z + (dz / dist) * step;
  if (blocked(nx, nz)) {
    sim.walking = false;
    sim.wait = range(0.5, 1.5);
    return;
  }
  sim.x = nx;
  sim.z = nz;
}

// ---------------------------------------------------------------- network
function publish() {
  return simulating ? { p: [r2(sim.x), r2(sim.z)], r: r2(sim.yaw), w: sim.walking ? 1 : 0, m: sim.mode } : null;
}

function hear(g, time, peer) {
  if (!g || !finiteArr(g.p, 2) || !Number.isFinite(g.r)) return;
  if (Math.abs(g.p[0]) > HALF || Math.abs(g.p[1]) > HALF) return;
  if (peer !== src) {
    src = peer;
    snaps.clear();
  }
  snaps.push(time, { x: g.p[0], z: g.p[1], r: g.r, w: g.w === 1, m: Number.isInteger(g.m) ? g.m : MODE.CALM });
  lastSnapAt = performance.now();
}

function sampleSnaps(t) {
  const { a, b, u } = snaps.sample(t);
  target.x = lerp(a.x, b.x, u);
  target.z = lerp(a.z, b.z, u);
  target.yaw = angleLerp(a.r, b.r, u);
  target.walking = b.w;
  target.mode = b.m;
}

// ---------------------------------------------------------------- model
// Faces he can pull: smile, joy, grump, worry, puff (cheeks full, about to launch someone), talk (mouth open).
function drawFace(g, m, expr) {
  const TAU = Math.PI * 2;
  const blob = (x, y, rx, ry, color = FACE_HEX) => {
    g.fillStyle = color;
    g.beginPath();
    g.ellipse(m(x), m(y), m(rx), m(ry), 0, 0, TAU);
    g.fill();
  };
  const stroke = (draw, w = 0.022) => {
    g.strokeStyle = FACE_HEX;
    g.lineWidth = m(w);
    g.lineCap = g.lineJoin = 'round';
    g.beginPath();
    draw();
    g.stroke();
  };
  const line = (pts, w) =>
    stroke(() => pts.forEach(([x, y], k) => (k ? g.lineTo(m(x), m(y)) : g.moveTo(m(x), m(y)))), w);
  const eyes = (ry = 0.064, y = -0.075) => {
    for (const sx of [-1, 1]) blob(0.145 * sx, y, 0.046, ry);
    for (const sx of [-1, 1]) blob(0.145 * sx + 0.014, y - 0.025 * (ry / 0.064), 0.015, 0.015, '#ffffff');
  };
  const cheeks = (a = 0.5, r = 1) => {
    for (const sx of [-1, 1]) blob(0.25 * sx, -0.005, 0.055 * r, 0.032 * r, `rgba(255, 110, 150, ${a})`);
  };
  const smile = () => stroke(() => g.arc(0, m(-0.03), m(0.095), Math.PI * 0.18, Math.PI * 0.82));
  const openMouth = (rx, ry) => {
    blob(0, 0.02, rx, ry);
    blob(0, 0.02 + ry * 0.45, rx * 0.6, ry * 0.45, '#ff7a9a');
  };
  if (expr === 'joy') {
    for (const sx of [-1, 1]) stroke(() => g.arc(m(0.145 * sx), m(-0.05), m(0.045), Math.PI * 1.15, Math.PI * 1.85));
    g.fillStyle = FACE_HEX;
    g.beginPath();
    g.arc(0, m(-0.01), m(0.1), 0.05, Math.PI - 0.05);
    g.closePath();
    g.fill();
    blob(0, 0.06, 0.05, 0.025, '#ff7a9a');
    cheeks(0.6);
  } else if (expr === 'grump') {
    eyes(0.045, -0.065);
    for (const sx of [-1, 1])
      line([
        [0.21 * sx, -0.165],
        [0.09 * sx, -0.125],
      ]);
    stroke(() => g.arc(0, m(0.08), m(0.075), Math.PI * 1.22, Math.PI * 1.78));
  } else if (expr === 'worry') {
    eyes(0.07, -0.07);
    for (const sx of [-1, 1])
      line([
        [0.2 * sx, -0.165],
        [0.09 * sx, -0.2],
      ]);
    line([
      [-0.06, 0.03],
      [-0.03, 0.015],
      [0, 0.03],
      [0.03, 0.015],
      [0.06, 0.03],
    ]);
  } else if (expr === 'puff') {
    for (const sx of [-1, 1])
      line([
        [0.19 * sx, -0.11],
        [0.12 * sx, -0.075],
        [0.19 * sx, -0.04],
      ]);
    cheeks(0.8, 1.5);
    blob(0, 0.02, 0.028, 0.028);
  } else if (expr === 'talk') {
    eyes();
    openMouth(0.065, 0.045);
  } else {
    eyes();
    smile();
  }
}

// Equirectangular texture for a unit sphere scaled to (W_R, H_R, W_R). The face sits at u = 0.75 (the -Z side, which
// is "forward" like the player avatars). Drawing is stretched vertically by W_R / H_R so the features look round once
// the sphere is squished. Built on first use per expression.
const faces = new Map();
function faceTexture(expr = 'smile') {
  if (faces.has(expr)) return faces.get(expr);
  const c = document.createElement('canvas');
  c.width = 1024;
  c.height = 512;
  const g = c.getContext('2d');
  g.fillStyle = BODY_HEX;
  g.fillRect(0, 0, 1024, 512);
  const pxPerM = 1024 / (Math.PI * 2) / W_R; // horizontal pixels per metre of surface at the equator
  g.save();
  g.translate(768, 256);
  g.scale(1, W_R / H_R);
  drawFace(g, (v) => v * pxPerM, expr);
  g.restore();
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  faces.set(expr, t);
  return t;
}

function buildModel() {
  const root = new THREE.Group();
  const inner = new THREE.Group();
  root.add(inner);
  const bodyMesh = new THREE.Mesh(
    new THREE.SphereGeometry(1, 48, 24),
    new THREE.MeshStandardMaterial({ map: faceTexture(), roughness: 0.5 }),
  );
  bodyMesh.scale.set(W_R, H_R, W_R);
  bodyMesh.position.y = BODY_Y;
  inner.add(bodyMesh);

  const limbMat = new THREE.MeshStandardMaterial({ color: BODY_HEX, roughness: 0.5 });
  const footMat = new THREE.MeshStandardMaterial({ color: FOOT_HEX, roughness: 0.55 });
  const handGeo = new THREE.SphereGeometry(0.15, 20, 12);
  const footGeo = new THREE.SphereGeometry(0.19, 20, 12);
  const hands = [-1, 1].map((sx) => {
    const h = new THREE.Mesh(handGeo, limbMat);
    h.userData.base = new THREE.Vector3(sx * (W_R + 0.05), BODY_Y - 0.03, -0.05);
    h.position.copy(h.userData.base);
    inner.add(h);
    return h;
  });
  const feet = [-1, 1].map((sx) => {
    const f = new THREE.Mesh(footGeo, footMat);
    f.scale.set(1, 0.62, 1.25);
    f.userData.base = new THREE.Vector3(sx * 0.38, 0.1, -0.42);
    f.position.copy(f.userData.base);
    root.add(f);
    return f;
  });
  // The hat stands on its own pivot (the middle of the brim) so it can lag, wobble and get crushed without stretching.
  const hat = new THREE.Group();
  const hatMat = new THREE.MeshStandardMaterial({ color: '#111114', roughness: 0.42 });
  const brim = new THREE.Mesh(new THREE.CylinderGeometry(BRIM_R, BRIM_R, BRIM_H, 28), hatMat);
  brim.position.y = BRIM_H / 2;
  const crownH = HAT_H - BRIM_H;
  const crown = new THREE.Mesh(new THREE.CylinderGeometry(CROWN_R * 1.06, CROWN_R, crownH, 20), hatMat);
  crown.position.y = BRIM_H + crownH / 2;
  hat.add(brim, crown);
  root.add(hat);
  root.traverse((o) => {
    if (!o.isMesh) return;
    // Only parts big enough to show in the shadow map: eyes, buttons and hat trims would each cost a shadow draw call.
    o.geometry.computeBoundingSphere();
    o.castShadow = o.geometry.boundingSphere.radius >= 0.3;
  });
  return { root, inner, bodyMesh, hands, feet, hat };
}

// ---------------------------------------------------------------- lifecycle
export function createBoogler() {
  const s = findStart();
  sim.x = disp.x = target.x = s.x;
  sim.z = disp.z = target.z = s.z;
  parts = buildModel();
  group = parts.root;
  scene.add(group);
  addHostField('g', publish, hear);

  body = createBody({
    type: BODY.KINEMATIC,
    material: playerMat,
    mask: NOT_SCENERY,
    shapes: [
      { kind: 'cylinder', rTop: W_R, rBottom: W_R, h: H_R * 2, segments: 14, offset: { x: 0, y: BODY_Y, z: 0 } },
    ],
  });
  teleport(body, s.x, groundHeight(s.x, s.z), s.z);
  addBody(body);
  boogler.body = body;
  onPreStep(() => {
    const p = body.position;
    const tx = disp.x,
      tz = disp.z,
      ty = groundHeight(tx, tz);
    const dx = tx - p.x,
      dy = ty - p.y,
      dz = tz - p.z;
    if (dx * dx + dy * dy + dz * dz > 36) {
      teleport(body, tx, ty, tz);
      body.velocity.set(0, 0, 0);
    } else body.velocity.set(dx / FIXED, dy / FIXED, dz / FIXED);
  });
}

const anim = { phase: 0, hop: 0, hopIn: 5, walk: 0, t: 0 };
// The hat's springs (cosmetic): height above his head, lean (x forward/back, z sideways) and squash (crushed flat like an
// opera hat while someone rides him, popping back up after).
const hatSpring = { y: 0, vy: 0, lx: 0, vlx: 0, lz: 0, vlz: 0, s: 1, vs: 0, top: null };
// Steps the damped spring h[x] (velocity h[v]) toward `to` in place: no allocation per frame.
const spring = (h, x, v, to, k, d, dt) => {
  h[v] += ((to - h[x]) * k - h[v] * d) * dt;
  h[x] += h[v] * dt;
};
const react = { petAt: -1e9, puffAt: -1e9, joyUntil: 0, grumpUntil: 0 };

// Cosmetic reactions, played on every client: 'pet' (squish and a happy face), 'joy', 'grump', 'puff' (inflate for
// PUFF_MS, then pop).
export function booglerReact(kind, now = performance.now()) {
  if (kind === 'pet') {
    react.petAt = now;
    react.joyUntil = now + 1100;
  } else if (kind === 'joy') react.joyUntil = now + 1600;
  else if (kind === 'grump') react.grumpUntil = now + 1600;
  else if (kind === 'puff') react.puffAt = now;
}

// 0..1: swells over PUFF_MS, then deflates fast after the pop.
function puffAmount(now) {
  const u = (now - react.puffAt) / PUFF_MS;
  if (u < 0 || u > 1.3) return 0;
  return u < 1 ? u * u : 1 - (u - 1) / 0.3;
}

function expression(now) {
  if (puffAmount(now) > 0) return 'puff';
  if (now < react.joyUntil) return 'joy';
  if (now < react.grumpUntil || disp.mode === MODE.RIDDEN) return 'grump';
  if (disp.mode === MODE.FLEE) return 'worry';
  if (boogler.me.speaking && Math.floor(now / 110) % 2) return 'talk';
  return boogler.me.mood ?? 'smile';
}

function animate(dt, now) {
  anim.t += dt;
  anim.walk = lerp(anim.walk, disp.walking ? 1 : 0, 1 - Math.exp(-dt * 8));
  anim.phase += dt * (disp.mode === MODE.FLEE ? 15 : disp.mode === MODE.RIDDEN ? 12 : 9) * anim.walk;
  const puff = puffAmount(now);
  const petT = (now - react.petAt) / 500;
  const pet = !reducedMotion && petT >= 0 && petT < 1 ? Math.sin(petT * Math.PI * 4) * 0.14 * (1 - petT) : 0;
  const s = Math.sin(anim.phase);
  const w = reducedMotion ? anim.walk * 0.4 : anim.walk;

  // An idle hop every few seconds, purely for looks.
  let hopY = 0,
    hopSquash = 0;
  if (!reducedMotion && anim.walk < 0.1 && !puff) {
    anim.hopIn -= dt;
    if (anim.hopIn <= 0 && anim.hop === 0) anim.hop = 0.001;
  }
  if (anim.hop > 0) {
    anim.hop += dt / 0.5;
    const u = anim.hop;
    if (u >= 1) {
      anim.hop = 0;
      anim.hopIn = range(4, 9);
    } else {
      hopY = Math.sin(u * Math.PI) * 0.4;
      hopSquash = u < 0.15 ? -0.18 * Math.sin((u / 0.15) * Math.PI) : 0.1 * Math.sin(u * Math.PI);
    }
  }

  const breathe = reducedMotion ? 0 : Math.sin(anim.t * 2.2) * 0.025 * (1 - anim.walk);
  const bob = Math.abs(s) * 0.06 * w;
  const squash = 1 + breathe + hopSquash - pet - Math.abs(Math.cos(anim.phase)) * 0.07 * w;
  const swell = 1 + puff * 0.45 + (reducedMotion ? 0 : Math.sin(now / 30) * 0.02 * puff);
  parts.inner.position.y = bob + hopY + puff * 0.12;
  parts.inner.scale.set(swell / Math.sqrt(squash), squash * swell, swell / Math.sqrt(squash));
  parts.inner.rotation.z = s * 0.06 * w;

  parts.feet.forEach((f, k) => {
    const ph = k ? -s : s;
    f.position.set(
      f.userData.base.x,
      f.userData.base.y + Math.max(0, ph) * 0.08 * w + hopY * 0.75,
      f.userData.base.z - ph * 0.16 * w,
    );
  });
  parts.hands.forEach((h, k) => {
    const ph = k ? s : -s;
    h.position.set(
      h.userData.base.x + (hopY > 0 ? Math.sign(h.userData.base.x) * hopY * 0.25 : 0),
      h.userData.base.y + Math.abs(ph) * 0.05 * w + hopY * 0.6 + Math.abs(pet) * 0.8,
      h.userData.base.z - ph * 0.14 * w,
    );
  });
  const face = faceTexture(expression(now));
  if (parts.bodyMesh.material.map !== face) parts.bodyMesh.material.map = face;
  animateHat(dt);
}

function animateHat(dt) {
  const h = hatSpring;
  const top = parts.inner.position.y + BODY_Y + H_R * parts.inner.scale.y - HAT_SINK;
  dt = Math.min(dt, 1 / 30); // keep the springs stable through a slow frame
  if (reducedMotion) {
    h.y = top;
    h.lx = 0;
    h.lz = parts.inner.rotation.z;
  } else {
    if (h.top === null) h.y = top;
    // The head moving up or down kicks the hat's lean a little, so hops make it wobble.
    const rise = h.top === null ? 0 : (top - h.top) / dt;
    h.vlx += rise * 0.9 * dt;
    spring(h, 'y', 'vy', top, 260, 16, dt);
    h.y = Math.max(h.y, top - 0.02); // never sinks into him
    spring(h, 'lx', 'vlx', 0.07 * anim.walk, 70, 5, dt); // leans back a touch when he walks
    spring(h, 'lz', 'vlz', parts.inner.rotation.z * 2.2, 70, 5, dt); // and sways more than he does
  }
  h.top = top;
  const crushed = disp.mode === MODE.RIDDEN;
  spring(h, 's', 'vs', crushed ? 0.06 : 1, crushed ? 900 : 180, crushed ? 40 : 7, dt);
  h.s = Math.max(0.04, h.s);
  parts.hat.position.set(0, h.y, 0);
  parts.hat.rotation.set(h.lx, 0, h.lz);
  parts.hat.scale.set(1 + (1 - h.s) * 0.25, h.s, 1 + (1 - h.s) * 0.25);
}

export function updateBoogler(dt, now) {
  if (!group) return;
  const isHost = net.room?.isHost() ?? false;
  const solo = !net.room || net.state === 'solo';
  const stale = now - Math.max(lastSnapAt, bootAt) > STALE_MS;
  const shouldSim = solo || isHost || stale;

  if (shouldSim && !simulating) {
    // Taking over (became host, went solo, or the host went quiet): continue from where he is on screen.
    sim.x = disp.x;
    sim.z = disp.z;
    sim.yaw = disp.yaw;
    sim.walking = false;
    sim.wait = 0.6;
  }
  simulating = shouldSim;

  if (simulating) {
    think(dt);
    disp.x = sim.x;
    disp.z = sim.z;
    disp.yaw = sim.yaw;
    disp.walking = sim.walking;
    disp.mode = sim.mode;
  } else if (snaps.length) {
    sampleSnaps(now - INTERP_MS);
    const far = Math.hypot(target.x - disp.x, target.z - disp.z) > 6;
    const k = far ? 1 : 1 - Math.exp(-dt * 15);
    disp.x = lerp(disp.x, target.x, k);
    disp.z = lerp(disp.z, target.z, k);
    disp.yaw = angleLerp(disp.yaw, target.yaw, k);
    disp.walking = target.walking;
    disp.mode = target.mode;
  }

  const gy = groundHeight(disp.x, disp.z);
  group.position.set(disp.x, gy, disp.z);
  group.rotation.y = disp.yaw;
  animate(dt, now);
  boogler.center.set(disp.x, gy + BODY_Y + parts.inner.position.y, disp.z);
  boogler.labelPos.set(disp.x, gy + hatSpring.y + HAT_H + LABEL_GAP, disp.z);
}

// Screen-space position for the HUD label and edge pointer (hud.js).
const vp = new THREE.Vector3();
const centerOn = { x: 0, y: 0, behind: false },
  labelOn = { x: 0, y: 0, behind: false };
export function booglerScreen(width, height) {
  camera.updateMatrixWorld();
  vp.copy(boogler.center).applyMatrix4(camera.matrixWorldInverse);
  const inFront = vp.z < -0.2;
  // Direction from the screen centre toward him, in pixels (y down). Works in front of and behind the camera.
  let dx = vp.x,
    dy = -vp.y;
  if (Math.hypot(dx, dy) < 1e-4) dy = 1;
  const c = toScreen(boogler.center, centerOn, width, height);
  const onScreen = inFront && Math.abs((c.x / width) * 2 - 1) < 0.96 && Math.abs((c.y / height) * 2 - 1) < 0.96;
  const label = toScreen(boogler.labelPos, labelOn, width, height);
  return { onScreen, dirX: dx, dirY: dy, labelX: label.x, labelY: label.y };
}

// The Boogler: a squished, smiling NPC who waddles around the island.
//
// Authority: the host decides where he walks and publishes it in its presence as `g: { p:[x,z], r, w }`
// (r = yaw, w = 1 while walking). Everyone else interpolates those snapshots, like a remote player. He is not part of
// the deterministic world sim (he never changes terrain, water or crops), so his brain can use floats; it still uses
// the seeded RNG so no Math.random sneaks into shared code. Solo tabs, and clients that hear nothing from a host for a
// few seconds, walk him locally so he never freezes. Animation (waddle, breathing, hops) is cosmetic and local.
//
// He has a kinematic physics body, so the ball bounces off him and players can bump into him or hop on his head.
import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { FIXED, INTERP_MS, CELL, HALF, reducedMotion } from './constants.js';
import { clamp, lerp, angleLerp, finiteArr, r2, mulberry32 } from './math.js';
import { groundHeight } from './terrain.js';
import { scene, camera } from './scene.js';
import { world, playerMat, teleport } from './physics.js';
import { obstacles } from './props.js';
import { PATCH } from './sim/mushrooms.js';
import { me } from './player.js';
import { net, remotes } from './net.js';

// Shape: about three times as wide as he is tall.
const W_R = 0.8; // half width
const H_R = 0.27; // half height
const BODY_Y = 0.32; // body center above the ground
const BODY_HEX = '#b99cff';
const FOOT_HEX = '#6c4fd1';
const FACE_HEX = '#1d1640';

// Wandering.
const SPEED = 1.5; // m/s
const TURN = 3.2; // rad/s
const MIN_H = 0.45; // stays on dry land
const MAX_H = 7.5;
const MAX_STEP = 0.55; // max height change per metre of path
const ISLAND_LIMIT = 48;
const FACE_RANGE = 7; // turns to look at players this close while idle
const STALE_MS = 3000; // no host snapshot for this long: walk him locally
const LABEL_Y = 1.15; // label anchor above the ground

const rng = mulberry32((Date.now() ^ 0x5eed) | 0);
const range = (a, b) => a + rng() * (b - a);

const sim = { x: 0, z: 0, yaw: 0, walking: false, tx: 0, tz: 0, wait: 1 };
const disp = { x: 0, z: 0, yaw: 0, walking: false };
const target = { x: 0, z: 0, yaw: 0, walking: false };
const snaps = [];
let src = null;
let lastSnapAt = 0;
let simulating = false;
const bootAt = performance.now();

let group = null;
let parts = null;
let body = null;

export const boogler = { disp, labelPos: new THREE.Vector3(), center: new THREE.Vector3() };

// ---------------------------------------------------------------- terrain checks
function blocked(x, z, pad = 0) {
  if (Math.hypot(x, z) > ISLAND_LIMIT) return true;
  const h = groundHeight(x, z);
  if (h < MIN_H || h > MAX_H) return true;
  for (const o of obstacles) if (Math.hypot(o.x - x, o.z - z) < o.r + W_R + pad) return true;
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

function pickTarget() {
  for (let tries = 0; tries < 24; tries++) {
    const a = rng() * Math.PI * 2,
      d = range(5, 20);
    const x = sim.x + Math.cos(a) * d,
      z = sim.z + Math.sin(a) * d;
    if (pathClear(sim.x, sim.z, x, z)) {
      sim.tx = x;
      sim.tz = z;
      return true;
    }
  }
  return false;
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
function nearestPlayer() {
  let best = null,
    bestD = FACE_RANGE;
  const consider = (x, z) => {
    const d = Math.hypot(x - sim.x, z - sim.z);
    if (d < bestD && d > 0.5) {
      bestD = d;
      best = { x, z };
    }
  };
  if (me.entered && me.body) consider(me.body.position.x, me.body.position.z);
  for (const r of remotes.values()) if (r.entered && r.avatar) consider(r.target.x, r.target.z);
  return best;
}

function turnToward(yaw, dt) {
  const d = angleLerp(sim.yaw, yaw, 1) - sim.yaw;
  sim.yaw += clamp(d, -TURN * dt, TURN * dt);
  return Math.abs(d);
}

function think(dt) {
  if (!sim.walking) {
    const p = nearestPlayer();
    if (p) turnToward(Math.atan2(-(p.x - sim.x), -(p.z - sim.z)), dt);
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
  const step = Math.min(dist, SPEED * dt * Math.max(0, Math.cos(off)));
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
export function booglerForPresence() {
  if (!group || !simulating || !net.room?.isHost()) return null;
  return { p: [r2(sim.x), r2(sim.z)], r: r2(sim.yaw), w: sim.walking ? 1 : 0 };
}

// Called from net.js with every fresh presence that carries `g` (only the host's does).
export function noteBoogler(peer, g, time) {
  if (!g || !finiteArr(g.p, 2) || !Number.isFinite(g.r)) return;
  if (Math.abs(g.p[0]) > 100 || Math.abs(g.p[1]) > 100) return;
  if (peer !== src) {
    src = peer;
    snaps.length = 0;
  }
  snaps.push({ time, x: g.p[0], z: g.p[1], r: g.r, w: g.w === 1 });
  if (snaps.length > 40) snaps.shift();
  lastSnapAt = performance.now();
}

function sampleSnaps(t) {
  while (snaps.length > 2 && snaps[1].time <= t) snaps.shift();
  const a = snaps[0],
    b = snaps[1] || a;
  const u = b === a || t <= a.time ? 0 : Math.min(1, (t - a.time) / Math.max(1, b.time - a.time));
  target.x = lerp(a.x, b.x, u);
  target.z = lerp(a.z, b.z, u);
  target.yaw = angleLerp(a.r, b.r, u);
  target.walking = b.w;
}

// ---------------------------------------------------------------- model
function faceTexture() {
  // Equirectangular texture for a unit sphere scaled to (W_R, H_R, W_R). The face sits at u = 0.75 (the -Z side,
  // which is "forward" like the player avatars). Drawing is stretched vertically by W_R / H_R so the features look
  // round once the sphere is squished.
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
  const m = (v) => v * pxPerM;
  g.fillStyle = FACE_HEX;
  for (const sx of [-1, 1]) {
    g.beginPath();
    g.ellipse(m(0.145 * sx), m(-0.075), m(0.046), m(0.064), 0, 0, Math.PI * 2);
    g.fill();
  }
  g.fillStyle = '#ffffff';
  for (const sx of [-1, 1]) {
    g.beginPath();
    g.arc(m(0.145 * sx + 0.014), m(-0.1), m(0.015), 0, Math.PI * 2);
    g.fill();
  }
  g.strokeStyle = FACE_HEX;
  g.lineWidth = m(0.022);
  g.lineCap = 'round';
  g.beginPath();
  g.arc(0, m(-0.03), m(0.095), Math.PI * 0.18, Math.PI * 0.82);
  g.stroke();
  g.restore();
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
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
  root.traverse((o) => {
    if (o.isMesh) o.castShadow = true;
  });
  return { root, inner, bodyMesh, hands, feet };
}

// ---------------------------------------------------------------- lifecycle
export function createBoogler() {
  const s = findStart();
  sim.x = disp.x = target.x = s.x;
  sim.z = disp.z = target.z = s.z;
  parts = buildModel();
  group = parts.root;
  scene.add(group);

  body = new CANNON.Body({ mass: 0, type: CANNON.Body.KINEMATIC, material: playerMat });
  body.addShape(new CANNON.Cylinder(W_R, W_R, H_R * 2, 14), new CANNON.Vec3(0, BODY_Y, 0));
  teleport(body, s.x, groundHeight(s.x, s.z), s.z);
  world.addBody(body);
  world.addEventListener('preStep', () => {
    const p = body.position;
    const tx = disp.x,
      tz = disp.z,
      ty = groundHeight(tx, tz);
    const dx = tx - p.x,
      dy = ty - p.y,
      dz = tz - p.z;
    if (dx * dx + dy * dy + dz * dz > 36) {
      teleport(body, tx, ty, tz);
      body.velocity.setZero();
    } else body.velocity.set(dx / FIXED, dy / FIXED, dz / FIXED);
  });
}

const anim = { phase: 0, hop: 0, hopIn: 5, walk: 0, t: 0 };

function animate(dt) {
  anim.t += dt;
  anim.walk = lerp(anim.walk, disp.walking ? 1 : 0, 1 - Math.exp(-dt * 8));
  anim.phase += dt * 9 * anim.walk;
  const s = Math.sin(anim.phase);
  const w = reducedMotion ? anim.walk * 0.4 : anim.walk;

  // An idle hop every few seconds, purely for looks.
  let hopY = 0,
    hopSquash = 0;
  if (!reducedMotion && anim.walk < 0.1) {
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
  const squash = 1 + breathe + hopSquash - Math.abs(Math.cos(anim.phase)) * 0.07 * w;
  parts.inner.position.y = bob + hopY;
  parts.inner.scale.set(1 / Math.sqrt(squash), squash, 1 / Math.sqrt(squash));
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
      h.userData.base.y + Math.abs(ph) * 0.05 * w + hopY * 0.6,
      h.userData.base.z - ph * 0.14 * w,
    );
  });
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
  } else if (snaps.length) {
    sampleSnaps(now - INTERP_MS);
    const far = Math.hypot(target.x - disp.x, target.z - disp.z) > 6;
    const k = far ? 1 : 1 - Math.exp(-dt * 15);
    disp.x = lerp(disp.x, target.x, k);
    disp.z = lerp(disp.z, target.z, k);
    disp.yaw = angleLerp(disp.yaw, target.yaw, k);
    disp.walking = target.walking;
  }

  const gy = groundHeight(disp.x, disp.z);
  group.position.set(disp.x, gy, disp.z);
  group.rotation.y = disp.yaw;
  animate(dt);
  boogler.center.set(disp.x, gy + BODY_Y + parts.inner.position.y, disp.z);
  boogler.labelPos.set(disp.x, gy + LABEL_Y + parts.inner.position.y, disp.z);
}

// Screen-space position for the HUD label and edge pointer (boogler-hud.js).
const vp = new THREE.Vector3();
export function booglerScreen(width, height) {
  camera.updateMatrixWorld();
  vp.copy(boogler.center).applyMatrix4(camera.matrixWorldInverse);
  const inFront = vp.z < -0.2;
  // Direction from the screen centre toward him, in pixels (y down). Works in front of and behind the camera.
  let dx = vp.x,
    dy = -vp.y;
  if (Math.hypot(dx, dy) < 1e-4) dy = 1;
  const ndc = boogler.center.clone().project(camera);
  const onScreen = inFront && Math.abs(ndc.x) < 0.96 && Math.abs(ndc.y) < 0.96;
  const label = boogler.labelPos.clone().project(camera);
  return {
    onScreen,
    dirX: dx,
    dirY: dy,
    labelX: (label.x * 0.5 + 0.5) * width,
    labelY: (-label.y * 0.5 + 0.5) * height,
  };
}

// The Boogler: a squished, smiling NPC who waddles around the island.
//
// Authority: Server legs, evaluated against the railway presentation clock. Only sessionless tabs run a local
// 10 Hz brain. Animation RNG is private and cannot change his decisions. Your own talk holds him immediately.
//
// He has a kinematic physics body, so the ball bounces off him and players can bump into him or hop on his head.
// Every player also publishes how they treat him (`bg` in presence, see src/boogler/play.ts): the server stops for
// players who talk to him, hurries while someone rides him, and runs from players he's wary of.
import * as THREE from 'three';
import { reducedMotion } from '../constants.ts';
import { lerp, mulberry32 } from '../math.ts';
import { groundHeight } from '../island/terrain.ts';
import { camera, toScreen } from '../render/scene.ts';
import { chaseKinematic, playerMat, NOT_SCENERY } from '../physics/physics.ts';
import { createBody, BODY, teleport } from '../physics/engine.ts';
import { blockedAt } from '../entities/props/state.ts';
import { island } from '../island/index.ts';
import { MAINLAND } from '../island/shape.ts';
import { me } from '../player/player.ts';
import { net, remotes } from '../netplay/net.ts';
import type { Remote } from '../netplay/net.ts';
import type { Body } from '../physics/engine.ts';
import { ACT, MODE, W_R, MIN_H, findStart } from '../world/boogler-brain.ts';
import { createBooglerShadow } from '../world/boogler-shadow.ts';
import { createBooglerPresentation } from './presentation.ts';
import { railwayMirror } from '../world/game-world.ts';
import { railwayWorldRead } from '../entities/railway/state.ts';
import type { BooglerVisitor } from '../world/boogler-brain.ts';
import type { BooglerLand } from '../world/boogler-land.ts';
export { ACT, MODE, W_R } from '../world/boogler-brain.ts';

/** A remote player as he sees them: their bg presence (src/boogler/play.ts: act, wary, ev, evN). */
export type BgRemote = Remote & { bg?: number[] | null };
export type Mood = 'smile' | 'joy' | 'grump' | 'worry' | 'puff' | 'talk';

// Shape: about three times as wide as he is tall.
const H_R = 0.27; // half height
const BODY_Y = 0.32; // body center above the ground
const BODY_HEX = '#b99cff';
const FOOT_HEX = '#6c4fd1';
const FACE_HEX = '#1d1640';

/** Dry land of his island under x, z: the ground he walks on. Off its grid (the railway world, the sea) is the seabed. */
export const onBooglerIsland = (x: number, z: number) => groundHeight(x, z) >= MIN_H;
// His top hat, comically tall: the brim is a third of his radius (it sits on top of his head, covering none of it), the
// crown half the brim's radius, and the whole hat about one and a half times his height.
const BRIM_R = W_R / 3;
const CROWN_R = BRIM_R / 2;
const BRIM_H = 0.03;
const HAT_H = 1.5 * (BODY_Y + H_R); // brim included
const HAT_SINK = 0.015; // into the curve of his head, so no gap shows under the brim
const LABEL_GAP = 0.45; // name tag anchor above the top of the hat (a crushed hat too, so it clears a rider)
export const PUFF_MS = 750;

const rng = mulberry32((Date.now() ^ 0x5eed) | 0);
const range = (a: number, b: number) => a + rng() * (b - a);

// Sessionless terrain is live; the server uses its pinned bake of this same land.
const land: BooglerLand = {
  height: groundHeight,
  blocked: blockedAt,
  get keepOut() {
    return island.keepOut;
  },
  mainland: MAINLAND,
};
let brain: ReturnType<typeof createBooglerShadow> | null = null;
let localTick = 0;
let localTime = 0;
const presentation = createBooglerPresentation();
// One presenter for the page lifetime. A slow frame alone is not evidence that nobody was watching.
presentation.visibility(document.hidden, performance.now());
document.addEventListener('visibilitychange', () => presentation.visibility(document.hidden, performance.now()));
const disp = presentation.pose;
let received = false;

let group: THREE.Group | null = null;
let modelParts: Parts | null = null;

// `me` is this player's side of things, written by src/boogler/play.ts: act (ACT), wary (he
// runs from us), and the face to pull while we talk (mood, speaking).
export const boogler = {
  disp,
  labelPos: new THREE.Vector3(),
  center: new THREE.Vector3(),
  body: null as Body | null,
  me: { act: ACT.NONE, wary: false, mood: null as Mood | null, speaking: false },
  // Local talk owner calls this in the press frame, before showing the dialogue.
  holdTalk(open: boolean) {
    presentation.talk(open);
    boogler.me.act = open ? ACT.TALK : ACT.NONE;
  },
};

// ---------------------------------------------------------------- brain (authority only)
// The players near him this frame, refilled into reused entries for the headless brain.
const seen: BooglerVisitor[] = [];
let seenCount = 0;
function visitor(x: number, z: number, act: number, wary: boolean, pid: string) {
  const v = seen[seenCount] ?? (seen[seenCount] = { x, z, act, wary });
  v.x = x;
  v.z = z;
  v.act = act;
  v.wary = wary;
  v.pid = pid;
  seenCount++;
}
function visitors() {
  seenCount = 0;
  if (me.entered && me.body) visitor(me.body.position.x, me.body.position.z, boogler.me.act, boogler.me.wary, 'local');
  for (const r of remotes.values() as Iterable<BgRemote>)
    if (r.entered && r.avatar) visitor(r.target.x, r.target.z, r.bg?.[0] ?? 0, r.bg?.[1] === 1, r.pid ?? '');
  seen.length = seenCount;
}

// ---------------------------------------------------------------- model
// Faces he can pull: smile, joy, grump, worry, puff (cheeks full, about to launch someone), talk (mouth open).
function drawFace(g: CanvasRenderingContext2D, m: (v: number) => number, expr: string) {
  const TAU = Math.PI * 2;
  const blob = (x: number, y: number, rx: number, ry: number, color = FACE_HEX) => {
    g.fillStyle = color;
    g.beginPath();
    g.ellipse(m(x), m(y), m(rx), m(ry), 0, 0, TAU);
    g.fill();
  };
  const stroke = (draw: () => void, w = 0.022) => {
    g.strokeStyle = FACE_HEX;
    g.lineWidth = m(w);
    g.lineCap = g.lineJoin = 'round';
    g.beginPath();
    draw();
    g.stroke();
  };
  const line = (pts: [number, number][], w?: number) =>
    stroke(() => pts.forEach(([x, y], k) => (k ? g.lineTo(m(x), m(y)) : g.moveTo(m(x), m(y)))), w);
  const eyes = (ry = 0.064, y = -0.075) => {
    for (const sx of [-1, 1]) blob(0.145 * sx, y, 0.046, ry);
    for (const sx of [-1, 1]) blob(0.145 * sx + 0.014, y - 0.025 * (ry / 0.064), 0.015, 0.015, '#ffffff');
  };
  const cheeks = (a = 0.5, r = 1) => {
    for (const sx of [-1, 1]) blob(0.25 * sx, -0.005, 0.055 * r, 0.032 * r, `rgba(255, 110, 150, ${a})`);
  };
  const smile = () => stroke(() => g.arc(0, m(-0.03), m(0.095), Math.PI * 0.18, Math.PI * 0.82));
  const openMouth = (rx: number, ry: number) => {
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
const faces = new Map<string, THREE.CanvasTexture>();
function faceTexture(expr = 'smile') {
  if (faces.has(expr)) return faces.get(expr)!;
  const c = document.createElement('canvas');
  c.width = 1024;
  c.height = 512;
  const g = c.getContext('2d')!;
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
  root.traverse((obj) => {
    const o = obj as THREE.Mesh;
    if (!o.isMesh) return;
    // Only parts big enough to show in the shadow map: eyes, buttons and hat trims would each cost a shadow draw call.
    o.geometry.computeBoundingSphere();
    o.castShadow = o.geometry.boundingSphere!.radius >= 0.3;
  });
  return { root, inner, bodyMesh, hands, feet, hat };
}
type Parts = ReturnType<typeof buildModel>;

// ---------------------------------------------------------------- lifecycle
// src/features/boogler.ts spawns what this returns, at start: he needs the props to exist, to know where the trees and
// rocks are.
export function createBoogler() {
  const s = findStart(land);
  disp.x = s.x;
  disp.z = s.z;
  brain = createBooglerShadow(land, mulberry32(0x5eed), 0);
  modelParts = buildModel();
  group = modelParts.root;

  const b = createBody({
    type: BODY.KINEMATIC,
    material: playerMat,
    mask: NOT_SCENERY,
    shapes: [
      { kind: 'cylinder', rTop: W_R, rBottom: W_R, h: H_R * 2, segments: 14, offset: { x: 0, y: BODY_Y, z: 0 } },
    ],
  });
  teleport(b, s.x, groundHeight(s.x, s.z), s.z);
  boogler.body = b;
  return { group, body: b };
}

// His body follows him, each physics step.
export function booglerBodyStep() {
  const b = boogler.body;
  if (!b) return;
  chaseKinematic(b, disp.x, groundHeight(disp.x, disp.z), disp.z);
}

const anim = { phase: 0, hop: 0, hopIn: 5, walk: 0, t: 0 };
// The hat's springs (cosmetic): height above his head, lean (x forward/back, z sideways) and squash (crushed flat like an
// opera hat while someone rides him, popping back up after).
const hatSpring = { y: 0, vy: 0, lx: 0, vlx: 0, lz: 0, vlz: 0, s: 1, vs: 0, top: null as number | null };
type SpringKey = 'y' | 'vy' | 'lx' | 'vlx' | 'lz' | 'vlz' | 's' | 'vs';
// Steps the damped spring h[x] (velocity h[v]) toward `to` in place: no allocation per frame.
const spring = (
  h: Record<SpringKey, number>,
  x: SpringKey,
  v: SpringKey,
  to: number,
  k: number,
  d: number,
  dt: number,
) => {
  h[v] += ((to - h[x]) * k - h[v] * d) * dt;
  h[x] += h[v] * dt;
};
const react = { petAt: -1e9, puffAt: -1e9, joyUntil: 0, grumpUntil: 0 };

// Cosmetic reactions, played on every client: 'pet' (squish and a happy face), 'joy', 'grump', 'puff' (inflate for
// PUFF_MS, then pop).
export function booglerReact(kind: 'pet' | 'joy' | 'grump' | 'puff', now = performance.now()) {
  if (kind === 'pet') {
    react.petAt = now;
    react.joyUntil = now + 1100;
  } else if (kind === 'joy') react.joyUntil = now + 1600;
  else if (kind === 'grump') react.grumpUntil = now + 1600;
  else if (kind === 'puff') react.puffAt = now;
}

// 0..1: swells over PUFF_MS, then deflates fast after the pop.
function puffAmount(now: number) {
  const u = (now - react.puffAt) / PUFF_MS;
  if (u < 0 || u > 1.3) return 0;
  return u < 1 ? u * u : 1 - (u - 1) / 0.3;
}

function expression(now: number): Mood {
  if (puffAmount(now) > 0) return 'puff';
  if (now < react.joyUntil) return 'joy';
  if (now < react.grumpUntil || disp.mode === MODE.RIDDEN) return 'grump';
  if (disp.mode === MODE.FLEE) return 'worry';
  if (boogler.me.speaking && Math.floor(now / 110) % 2) return 'talk';
  return boogler.me.mood ?? 'smile';
}

function animate(dt: number, now: number) {
  const parts = modelParts!; // built in createBoogler, before the first frame
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

  for (let k = 0; k < parts.feet.length; k++) {
    const f = parts.feet[k]!;
    const ph = k ? -s : s;
    f.position.set(
      f.userData.base.x,
      f.userData.base.y + Math.max(0, ph) * 0.08 * w + hopY * 0.75,
      f.userData.base.z - ph * 0.16 * w,
    );
  }
  for (let k = 0; k < parts.hands.length; k++) {
    const h = parts.hands[k]!;
    const ph = k ? s : -s;
    h.position.set(
      h.userData.base.x + (hopY > 0 ? Math.sign(h.userData.base.x) * hopY * 0.25 : 0),
      h.userData.base.y + Math.abs(ph) * 0.05 * w + hopY * 0.6 + Math.abs(pet) * 0.8,
      h.userData.base.z - ph * 0.14 * w,
    );
  }
  const face = faceTexture(expression(now));
  if (parts.bodyMesh.material.map !== face) parts.bodyMesh.material.map = face;
  animateHat(dt);
}

function animateHat(dt: number) {
  const parts = modelParts!;
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

export function updateBoogler(dt: number, now: number) {
  if (!group || !modelParts) return;
  const read = railwayWorldRead();
  let leg = railwayMirror?.boogler.leg() ?? null;
  let tick = read?.tickNow() ?? 0;
  const local = !railwayMirror || (!net.room && !leg);
  if (local && brain) {
    localTime += dt * 10;
    visitors();
    while (localTick < Math.floor(localTime)) brain.step(++localTick, seen);
    leg = brain.leg();
    tick = localTime;
  }
  if (leg) {
    const self = local ? 'local' : (read?.pid ?? '');
    const face =
      boogler.me.act === ACT.TALK || leg.look === self
        ? me.body?.position
        : [...remotes.values()].find((r) => r.pid === leg.look)?.avatar?.position;
    const live = local || (net.state === 'live' && read?.status() === 'ready');
    presentation.update(leg, tick, dt, !received, face, live, now);
    if (live) received = true;
  }

  const gy = groundHeight(disp.x, disp.z);
  group.position.set(disp.x, gy, disp.z);
  group.rotation.y = disp.yaw;
  animate(dt, now);
  boogler.center.set(disp.x, gy + BODY_Y + modelParts.inner.position.y, disp.z);
  boogler.labelPos.set(disp.x, gy + hatSpring.y + HAT_H + LABEL_GAP, disp.z);
}

// Screen-space position for the HUD label and edge pointer (hud.ts).
const vp = new THREE.Vector3();
const centerOn = { x: 0, y: 0, behind: false },
  labelOn = { x: 0, y: 0, behind: false };
const onScreenOut = { onScreen: false, dirX: 0, dirY: 0, labelX: 0, labelY: 0 }; // refilled by every call
export function booglerScreen(width: number, height: number) {
  camera.updateMatrixWorld();
  vp.copy(boogler.center).applyMatrix4(camera.matrixWorldInverse);
  const inFront = vp.z < -0.2;
  // Direction from the screen centre toward him, in pixels (y down). Works in front of and behind the camera.
  const dx = vp.x;
  let dy = -vp.y;
  if (Math.hypot(dx, dy) < 1e-4) dy = 1;
  const c = toScreen(boogler.center, centerOn, width, height);
  const onScreen = inFront && Math.abs((c.x / width) * 2 - 1) < 0.96 && Math.abs((c.y / height) * 2 - 1) < 0.96;
  const label = toScreen(boogler.labelPos, labelOn, width, height);
  onScreenOut.onScreen = onScreen;
  onScreenOut.dirX = dx;
  onScreenOut.dirY = dy;
  onScreenOut.labelX = label.x;
  onScreenOut.labelY = label.y;
  return onScreenOut;
}

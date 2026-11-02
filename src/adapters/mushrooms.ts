// Mushrooms in the game: the stand where you take a bag of seeds, and the short-lived bouncy mushrooms a bag sprouts.
// Using the bag (src/player/hands.ts calls sprout) picks open spots ahead of you and sends them as a one-off room
// message { t:'mush', s: [x, z, ...] }, validated and rate limited on receipt. Every tab then pops up its own mushrooms
// for LIFE_MS: each is an entity with its mesh, and a second one for its collider while it is solid. Local after the
// message: no shared state, nothing saved, and someone joining a moment later misses that cluster.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { HALF, REACH, SEA, PLAYER_R, HEAD_OFFSET, reducedMotion } from '../constants.ts';
import { groundHeight } from '../island/terrain.ts';
import { defineKind, despawn, spawn, type GameEntity } from '../entity/entity.ts';
import { obstacles } from '../entities/props/state.ts';
import { groundMat, GROUP } from '../physics/physics.ts';
import { material, createBody, forEachContact } from '../physics/engine.ts';
import { me } from '../player/state.ts';
import { net, onRoomReady } from '../netplay/net.ts';
import { waterField } from '../physics/water-field.ts';
import { dropPoint } from '../physics/flight.ts';
import { splash } from '../render/splash.ts';
import { itemModel } from '../player/item-models.ts';
import { take, has } from '../player/inventory.ts';
import { createLimiter } from '../sim/social.ts';
import type { Body } from '../physics/engine.ts';
import type { Interactable } from '../player/hands.ts';
import { NO_TARGETS } from '../sim/interact-pick.ts';

/** One mushroom: its entity, and its collider's while it is solid. */
type Shroom = {
  entity: GameEntity;
  x: number;
  z: number;
  y: number;
  born: number;
  squishAt: number;
  cap: GameEntity | null;
};

const LIFE_MS = 20000;
const POP_MS = 500;
const WILT_MS = 600;
const MAX_ALIVE = 40; // past this the oldest goes, so a busy room can't pile them up
// Where a bag's mushrooms go: a loose zig-zag to hop along, in metres [right, ahead] of you.
const CLUSTER: [number, number][] = [
  [0, 4.5],
  [-4.5, 8],
  [4, 9.5],
  [-2, 13.5],
  [3, 16.5],
];
const JITTER = 0.8;
const BOUNCE_SPEED = 15;
const STEM_H = 0.85;
const STEM_TOP_R = 0.32;
const STEM_BASE_R = 0.42;
const CAP_R = 1.9;
const CAP_T = 0.35;
export const STALL = { x: 15.2, z: 13.4, yaw: 3.0 };

// ---------------------------------------------------------------- physics
const mushroomMat = material('mushroom', { friction: 0.5, restitution: 1.73 }); // x ball: 0.3, 0.95
const capShapes = [
  {
    kind: 'cylinder' as const,
    rTop: STEM_TOP_R,
    rBottom: STEM_BASE_R,
    h: STEM_H,
    segments: 10,
    offset: { x: 0, y: STEM_H / 2, z: 0 },
  },
  {
    kind: 'cylinder' as const,
    rTop: CAP_R,
    rBottom: CAP_R * 0.85,
    h: CAP_T,
    segments: 16,
    offset: { x: 0, y: STEM_H + CAP_T / 2, z: 0 },
  },
];
const capBodies = new Map<Body, Shroom>();
defineKind('mushroom-cap', {}); // no methods: a mushroom's collider, which comes after the pop and goes before the wilt

export function bounceOffCaps() {
  const b = me.body;
  if (!b || !capBodies.size) return; // reading the contacts allocates, so no caps skips it
  forEachContact(b, (_nx, _ny, _nz, other) => {
    const m = capBodies.get(other);
    if (!m || b.position.y < other.position.y + STEM_H) return false;
    b.velocity.y = BOUNCE_SPEED;
    me.coyote = 0;
    m.squishAt = performance.now();
    return true;
  });
}

// Whether the player's body would be inside this mushroom: its collider waits until you step out.
function overlaps(b: Body, m: Shroom) {
  if (b.position.y - PLAYER_R > m.y + STEM_H + CAP_T + 0.05 || b.position.y + HEAD_OFFSET + PLAYER_R < m.y)
    return false;
  return Math.hypot(b.position.x - m.x, b.position.z - m.z) < CAP_R + PLAYER_R + 0.05;
}

function setSolid(m: Shroom, solid: boolean) {
  if (solid === !!m.cap) return;
  if (solid) {
    const body = createBody({
      material: mushroomMat,
      group: GROUP.SCENERY,
      position: { x: m.x, y: m.y, z: m.z },
      shapes: capShapes,
    });
    m.cap = spawn({ kind: 'mushroom-cap', bodies: [body] });
    capBodies.set(body, m);
  } else {
    capBodies.delete(m.cap!.bodies![0]!);
    despawn(m.cap!);
    m.cap = null;
  }
}

// ---------------------------------------------------------------- meshes
const capProfile = [
  [0, 0],
  [CAP_R * 0.85, 0],
  [CAP_R, CAP_T * 0.45],
  [CAP_R * 0.97, CAP_T * 0.85],
  [CAP_R * 0.85, CAP_T],
  [0, CAP_T * 1.05],
].map(([x, y]) => new THREE.Vector2(x, y));
const capGeo = new THREE.LatheGeometry(capProfile, 20);
const stemGeo = new THREE.CylinderGeometry(STEM_TOP_R, STEM_BASE_R, STEM_H, 12).translate(0, STEM_H / 2, 0);
// All six cap spots in one geometry: one draw per mushroom instead of six.
const spotGeo = mergeGeometries(
  [
    [0.3, 0.55, 0.22],
    [2.2, 0.9, 0.18],
    [3.9, 0.75, 0.2],
    [5.3, 1.15, 0.15],
    [1.3, 1.25, 0.14],
    [0, 0, 0.2],
  ].map(([a, r, s]) =>
    new THREE.SphereGeometry(s, 8, 4)
      .scale(1, 0.25, 1)
      .translate(Math.cos(a!) * r!, CAP_T * (r! > 1.1 ? 0.95 : 1.02), Math.sin(a!) * r!),
  ),
);
const capMat = new THREE.MeshStandardMaterial({ color: '#e5483b', roughness: 0.6, flatShading: true });
const stemMat = new THREE.MeshStandardMaterial({ color: '#f6ead2', roughness: 0.8 });
const spotMat = new THREE.MeshStandardMaterial({ color: '#fffaf0', roughness: 0.7 });

function makeMushroomMesh() {
  const g = new THREE.Group();
  const stem = new THREE.Mesh(stemGeo, stemMat);
  const cap = new THREE.Group();
  cap.position.y = STEM_H;
  const capMesh = new THREE.Mesh(capGeo, capMat);
  capMesh.castShadow = capMesh.receiveShadow = stem.castShadow = stem.receiveShadow = true;
  const spots = new THREE.Mesh(spotGeo, spotMat); // sits on the cap, so its shadow would never show
  spots.receiveShadow = true;
  cap.add(capMesh, spots);
  g.add(stem, cap);
  return g;
}

// Overshoots then settles, so the mushroom pops up.
const easeOutBack = (t: number) => 1 + 2.4 * (t - 1) ** 3 + 1.4 * (t - 1) ** 2;

const alive: Shroom[] = [];
defineKind('mushroom', { update: 5 });

function drawShroom(m: Shroom, mesh: THREE.Object3D, now: number) {
  const age = now - m.born;
  const left = LIFE_MS - age;
  if (left <= 0) {
    alive.splice(alive.indexOf(m), 1);
    setSolid(m, false);
    despawn(m.entity);
    return;
  }
  const popped = reducedMotion || age >= POP_MS;
  setSolid(m, popped && left > WILT_MS && (!!m.cap || !me.body || !overlaps(me.body, m)));
  const s = !popped ? Math.max(0.001, easeOutBack(age / POP_MS)) : left < WILT_MS ? Math.max(0.001, left / WILT_MS) : 1;
  const since = (now - m.squishAt) / 1000;
  const squish = !reducedMotion && since < 0.5 ? Math.sin(since * 25) * 0.18 * (1 - since * 2) : 0;
  mesh.scale.set(s * (1 + squish * 0.5), s * (1 - squish), s * (1 + squish * 0.5));
}

function addShroom(x: number, z: number) {
  if (alive.length >= MAX_ALIVE) {
    const oldest = alive.shift()!;
    setSolid(oldest, false);
    despawn(oldest.entity);
  }
  const y = groundHeight(x, z);
  const mesh = makeMushroomMesh();
  mesh.position.set(x, y, z);
  mesh.scale.setScalar(0.001);
  const m: Shroom = {
    entity: null as unknown as GameEntity,
    x,
    z,
    y,
    born: performance.now(),
    squishAt: -1e9,
    cap: null,
  };
  m.entity = spawn({ kind: 'mushroom', mesh, update: ({ now }) => drawShroom(m, mesh, now) });
  alive.push(m);
  splash(x, z, 0.12, y);
}

// ---------------------------------------------------------------- sprouting
const SPOTS_MAX = CLUSTER.length * 2;
const OWN_GAP_MS = 1000; // our own cap, past what `incoming` lets through, so every tab sees every cluster
const incoming = createLimiter(1, 800);
let lastOwn = -1e9;

// Dry land with nothing (rock, tree, wall, another cap) over it.
function openGround(x: number, z: number) {
  const g = groundHeight(x, z);
  if (g < SEA + 0.1 || waterField.surfaceAt(x, z) > g + 0.02) return false;
  return dropPoint(new THREE.Vector3(x, g + 3, z)).y < g + 0.2;
}

// The open spots ahead of you, flat as [x, z, ...]: empty when nothing can grow here.
export function spotsAhead() {
  if (!me.body) return [];
  const p = me.body.interpolatedPosition;
  const fx = -Math.sin(me.yaw),
    fz = -Math.cos(me.yaw);
  const out: number[] = [];
  for (const [right, ahead] of CLUSTER) {
    const a = ahead + (Math.random() - 0.5) * JITTER,
      r = right + (Math.random() - 0.5) * JITTER;
    const x = Math.round((p.x + fx * a - fz * r) * 10) / 10,
      z = Math.round((p.z + fz * a + fx * r) * 10) / 10;
    if (openGround(x, z)) out.push(x, z);
  }
  return out;
}

// Uses a bag: its mushrooms pop up here and on every other tab. False if nothing can grow here (you keep the bag).
export function sprout() {
  const now = performance.now();
  const s = now - lastOwn < OWN_GAP_MS ? [] : spotsAhead();
  if (!s.length) return false;
  lastOwn = now;
  try {
    net.room?.send({ t: 'mush', s });
  } catch (e) {
    console.warn('[mushrooms] send failed', e);
  }
  for (let k = 0; k < s.length; k += 2) addShroom(s[k]!, s[k + 1]!);
  return true;
}

export function listenForSprouts() {
  onRoomReady((room) => {
    room.onMessage((msg, from) => {
      const d = msg as { t?: string; s?: unknown } | null;
      if (d?.t !== 'mush') return;
      const s = d.s;
      if (!Array.isArray(s) || s.length > SPOTS_MAX || s.length % 2) return;
      if (!s.every((v) => Number.isFinite(v) && Math.abs(v) < HALF)) return;
      if (!incoming.allow(from, performance.now())) return;
      for (let k = 0; k < s.length; k += 2) addShroom(s[k], s[k + 1]);
    });
  });
}

// ---------------------------------------------------------------- stall
const wood = new THREE.MeshStandardMaterial({ color: '#b07a45', roughness: 0.9, flatShading: true });
const woodDk = new THREE.MeshStandardMaterial({ color: '#7d5230', roughness: 0.9, flatShading: true });

function stripedAwning() {
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 8;
  const g = c.getContext('2d')!;
  for (let k = 0; k < 8; k++) {
    g.fillStyle = k % 2 ? '#fffaf0' : '#e5483b';
    g.fillRect(k * 16, 0, 16, 8);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return new THREE.MeshStandardMaterial({ map: t, roughness: 0.8, side: THREE.DoubleSide });
}

const stall = new THREE.Group();
const pickup = { local: new THREE.Vector3(0, 1.2, 0), world: null as THREE.Vector3 | null };
{
  const box = (w: number, h: number, d: number, mat: THREE.Material, x: number, y: number, z: number) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(x, y, z);
    m.castShadow = m.receiveShadow = true;
    stall.add(m);
    return m;
  };
  box(2.8, 0.9, 0.9, wood, 0, 0.45, 0);
  box(2.9, 0.08, 1.0, woodDk, 0, 0.92, 0);
  for (const sx of [-1.35, 1.35]) box(0.12, 2.4, 0.12, woodDk, sx, 1.2, 0.35);
  const awning = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 1.4), stripedAwning());
  awning.position.set(0, 2.35, -0.05);
  awning.rotation.x = -Math.PI / 2 + 0.45;
  awning.castShadow = true;
  stall.add(awning);
  box(1.5, 0.3, 0.6, woodDk, 0, 1.11, 0);
  for (let k = 0; k < 5; k++) {
    const bag = itemModel('seeds');
    bag.position.set(-0.56 + k * 0.28, 1.2, (k % 2) * 0.12 - 0.05);
    stall.add(bag);
  }

  const sign = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 0.38), signMaterial());
  sign.position.set(0, 1.95, -0.48);
  sign.rotation.y = Math.PI;
  stall.add(sign);
}

function signMaterial() {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 64;
  const g = c.getContext('2d')!;
  g.fillStyle = '#7d5230';
  g.fillRect(0, 0, 256, 64);
  g.fillStyle = '#fffaf0';
  g.font = '400 36px "Lilita One", system-ui, sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText('Mushroom seeds', 128, 34, 240);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return new THREE.MeshStandardMaterial({ map: t, roughness: 0.9 });
}

defineKind('mushroom-stall', {}); // no methods: it just stands there
export function createStall() {
  const y = groundHeight(STALL.x, STALL.z) - 0.05;
  stall.position.set(STALL.x, y, STALL.z);
  stall.rotation.y = STALL.yaw;
  const body = createBody({
    material: groundMat,
    group: GROUP.SCENERY,
    position: { x: STALL.x, y, z: STALL.z },
    rotation: { x: 0, y: Math.sin(STALL.yaw / 2), z: 0, w: Math.cos(STALL.yaw / 2) },
    shapes: [{ kind: 'box', hx: 1.4, hy: 0.5, hz: 0.45, offset: { x: 0, y: 0.5, z: 0 } }],
  });
  spawn({ kind: 'mushroom-stall', mesh: stall, bodies: [body] });
  stall.updateMatrixWorld(true);
  pickup.world = stall.localToWorld(pickup.local.clone());

  obstacles.push({ x: STALL.x, z: STALL.z, r: 1.5 });
}

// ---------------------------------------------------------------- the stand
// What interacting at the stand can do (see interactTarget in src/player/hands.ts): take a bag, unless you carry one.
export function stallTargets() {
  const w = pickup.world;
  if (!me.entered || !me.body || !w || has('seeds')) return NO_TARGETS;
  const p = me.body.interpolatedPosition;
  const dx = w.x - p.x,
    dz = w.z - p.z;
  if (dx * dx + dz * dz >= (REACH + 0.6) * (REACH + 0.6)) return NO_TARGETS;
  const out: Interactable[] = [
    { id: 'stall-seeds', verb: 'Take', at: w.clone().setY(w.y + 0.35), run: () => take('seeds') },
  ];
  return out;
}

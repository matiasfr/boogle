// The crates of ?proto=net: what you watch instead of a counter (docs/research/carrying-and-logistics-play.md, finding 2
// and rec 7, the rail visibly takes the hauling over; rec 12, quantity as a physical heap). Heaps stand on the ground,
// one instanced mesh; the load sits in slots on the rear flatbed and moves with it; between them a crate hops on an arc
// and lands with a little dust. Written beside src/proto/wagon/freight.ts, which shows helper-hut freight. Local.
import * as THREE from 'three/webgpu';
import { emit } from './particles.ts';
import { groundHeight } from '../island/terrain.ts';
import { reducedMotion } from '../constants.ts';
import { TRAILER } from './wagon-look.ts';

export type Kind = 'wood' | 'stone' | 'fill';
// Brown for wood, grey for stone, a painted yellow for what the town sends back to the railhead.
const COLORS: Record<Kind, string> = { wood: '#a8703a', stone: '#8f959c', fill: '#f0c23a' };
const SIZE = 0.82;
const HOP = { flight: 0.55, apex: 1.5 };

const geo = new THREE.BoxGeometry(1, 1, 1);
const mats = Object.fromEntries(
  (Object.keys(COLORS) as Kind[]).map((k) => [
    k,
    new THREE.MeshStandardNodeMaterial({ color: COLORS[k], roughness: 0.85 }),
  ]),
) as Record<Kind, THREE.MeshStandardNodeMaterial>;
const dust = new THREE.Color('#d8c49a');

// ---------------------------------------------------------------- heaps on the ground
const MAX_ON_GROUND = 150;
const ground = new THREE.InstancedMesh(geo, new THREE.MeshStandardNodeMaterial({ roughness: 0.85 }), MAX_ON_GROUND);
ground.count = 0;
ground.castShadow = ground.receiveShadow = true;
ground.frustumCulled = false;
ground.setColorAt(0, new THREE.Color('#ffffff'));

// `y`: the ground under it, for a heap off the island's grid (?proto=place).
export type Heap = { x: number; z: number; base: number; list: Kind[]; y?: number };
export const heap = (x: number, z: number, base: number, y?: number): Heap => ({ x, z, base, list: [], y });

// A pyramid: `base` x `base` crates, then one smaller on top of it, and so on; past its top another pyramid beside it.
function slotOf(h: Heap, n: number, out: THREE.Vector3): THREE.Vector3 {
  let left = n,
    shift = 0;
  const size = (h.base * (h.base + 1) * (2 * h.base + 1)) / 6;
  while (left >= size) {
    left -= size;
    shift++;
  }
  let side = h.base,
    layer = 0;
  while (left >= side * side) {
    left -= side * side;
    side--;
    layer++;
  }
  const ix = left % side,
    iz = Math.floor(left / side);
  const step = SIZE * 1.04;
  const x = h.x + (ix - (side - 1) / 2) * step + shift * (h.base + 0.5) * step,
    z = h.z + (iz - (side - 1) / 2) * step;
  return out.set(x, (h.y ?? groundHeight(h.x, h.z)) + (layer + 0.5) * SIZE, z);
}

const m4 = new THREE.Matrix4(),
  tq = new THREE.Quaternion(),
  ty = new THREE.Vector3(0, 1, 0),
  tv = new THREE.Vector3(),
  ts = new THREE.Vector3(SIZE, SIZE, SIZE),
  tc = new THREE.Color();
/** Redraws every heap (call when one changes). The heaps' mesh joins `stage` the first time. */
export function drawHeaps(heaps: Heap[], stage: THREE.Object3D): void {
  if (!ground.parent) stage.add(ground);
  let c = 0;
  for (const h of heaps)
    h.list.forEach((kind, n) => {
      if (c >= MAX_ON_GROUND) return;
      slotOf(h, n, tv);
      tq.setFromAxisAngle(ty, ((n * 37) % 11) * 0.03 - 0.15);
      ground.setMatrixAt(c, m4.compose(tv, tq, ts));
      ground.setColorAt(c++, tc.set(COLORS[kind]));
    });
  ground.count = c;
  ground.instanceMatrix.needsUpdate = true;
  if (ground.instanceColor) ground.instanceColor.needsUpdate = true;
}
/** Where the next crate on a heap lands, in world metres. */
export const nextSlot = (h: Heap, out = new THREE.Vector3()) => slotOf(h, h.list.length, out);
/** Where a heap's top crate sits. */
export const topSlot = (h: Heap, out = new THREE.Vector3()) => slotOf(h, Math.max(0, h.list.length - 1), out);

// ---------------------------------------------------------------- the load on the rear flatbed
// Slots in the flatbed's frame: three pairs on the deck, then a top layer.
const X = 0.44,
  Z = 0.92;
const SLOTS: [number, number, number][] = [
  [-X, -Z, 0],
  [X, -Z, 0],
  [-X, 0, 0],
  [X, 0, 0],
  [-X, Z, 0],
  [X, Z, 0],
  [-X, -Z, 1],
  [X, Z, 1],
];
export type Deck = {
  frame: THREE.Object3D; // the rear flatbed's look: what the load is parented to
  dipV: (v: number) => void; // kicks the flatbed's springs as a crate lands on it or lets go
  held: ({ kind: Kind; mesh: THREE.Mesh; landed: boolean } | null)[]; // reserved in flight, solid once landed
  stage: THREE.Object3D; // what its hopping crates fly in: the owning view's root (or the scene, for a prototype)
};
export const deck = (frame: THREE.Object3D, dipV: (v: number) => void, stage: THREE.Object3D): Deck => ({
  frame,
  dipV,
  stage,
  held: SLOTS.map(() => null),
});
const pool: Record<Kind, THREE.Mesh[]> = { wood: [], stone: [], fill: [] };
function take(kind: Kind) {
  const m = pool[kind].pop() ?? new THREE.Mesh(geo, mats[kind]);
  m.castShadow = true;
  m.scale.setScalar(SIZE);
  m.rotation.set(0, 0, 0);
  m.visible = true;
  return m;
}
function give(kind: Kind, m: THREE.Mesh) {
  m.removeFromParent();
  pool[kind].push(m);
}
const slotLocal = (k: number, out: THREE.Vector3) => {
  const [x, z, layer] = SLOTS[k]!;
  return out.set(x, TRAILER.top + (layer + 0.5) * SIZE, z);
};
/** Settled crate bounds in the deck's frame, independent of its drawing and flight animation. */
export function deckBox(k: number) {
  const [x, z, layer] = SLOTS[k]!;
  return { x, z, bottom: layer * SIZE, size: SIZE };
}
export const deckCount = (d: Deck, kind?: Kind) => d.held.filter((c) => c && (!kind || c.kind === kind)).length;
export const deckFree = (d: Deck) => d.held.findIndex((c) => !c);
/** Restore settled cargo after the caller has cleared old loads and flights. */
export function putCrate(d: Deck, k: number, kind: Kind) {
  const mesh = take(kind);
  slotLocal(k, mesh.position);
  d.frame.add(mesh);
  d.held[k] = { kind, mesh, landed: true };
}
/** Empties the load and everything in the air at once (Start over). */
export function clearCrates(d: Deck | null) {
  if (d) {
    for (const c of d.held) if (c) c.mesh.removeFromParent();
    d.held.fill(null);
  }
  for (const h of hops) h.mesh.removeFromParent();
  hops.length = 0;
}

// ---------------------------------------------------------------- hops
type Hop = {
  kind: Kind;
  mesh: THREE.Mesh;
  t: number; // s since launch (negative: waiting its turn)
  from: THREE.Vector3;
  to: THREE.Vector3;
  aim?: (to: THREE.Vector3) => void; // moves `to` each frame (a flatbed that may be moving)
  leave?: (from: THREE.Vector3) => void; // as it leaves: sets `from`, frees its slot on the load
  over?: number; // the arc's top is at least this world height (a long hop over a track a train may stand on)
  spin: THREE.Vector3;
  land: () => void;
};
const hops: Hop[] = [];
function launch(
  kind: Kind,
  from: THREE.Vector3,
  to: THREE.Vector3,
  delay: number,
  land: () => void,
  stage: THREE.Object3D,
  extra?: Pick<Hop, 'aim' | 'leave' | 'over'>,
) {
  const mesh = take(kind);
  mesh.visible = false;
  stage.add(mesh);
  hops.push({
    kind,
    mesh,
    t: -delay,
    from: from.clone(),
    to: to.clone(),
    spin: new THREE.Vector3((Math.random() - 0.5) * 7, (Math.random() - 0.5) * 8, (Math.random() - 0.5) * 7),
    land,
    ...extra,
  });
}

/** A crate hops from a world point up onto a free slot of the load; false when the load is full. */
export function hopOn(d: Deck, kind: Kind, from: THREE.Vector3, delay: number, landed?: () => void): boolean {
  const k = deckFree(d);
  if (k < 0) return false;
  const held = { kind, mesh: take(kind), landed: false };
  d.held[k] = held;
  const on = held.mesh;
  on.visible = false;
  slotLocal(k, on.position);
  d.frame.add(on);
  const aim = (to: THREE.Vector3) => {
    slotLocal(k, to);
    d.frame.updateWorldMatrix(true, false);
    d.frame.localToWorld(to);
  };
  launch(
    kind,
    from,
    from,
    delay,
    () => {
      held.landed = true;
      on.visible = true;
      d.dipV(-1.1);
      landed?.();
    },
    d.stage,
    { aim },
  );
  return true;
}

/** The crate in slot `k` hops off the load to a world point; `landed` when it comes down. `over`: the least world
 * height of the arc's top (its centre), for a hop that crosses something tall. */
export function hopOff(d: Deck, k: number, to: THREE.Vector3, delay: number, landed: () => void, over?: number) {
  const c = d.held[k];
  if (!c) return;
  const leave = (from: THREE.Vector3) => {
    slotLocal(k, from);
    d.frame.updateWorldMatrix(true, false);
    d.frame.localToWorld(from);
    d.dipV(1.1);
    give(c.kind, c.mesh);
    if (d.held[k] === c) d.held[k] = null;
  };
  launch(c.kind, to, to, delay, landed, d.stage, over === undefined ? { leave } : { leave, over });
}

/** A crate hops between two world points. */
export const hopTo = (
  kind: Kind,
  from: THREE.Vector3,
  to: THREE.Vector3,
  delay: number,
  landed: () => void,
  stage: THREE.Object3D,
) => launch(kind, from, to, delay, landed, stage);

function landDust(x: number, y: number, z: number) {
  for (let n = 0; n < (reducedMotion ? 3 : 8); n++) {
    const a = (n / 8) * Math.PI * 2 + Math.random() * 0.4,
      sp = 1.1 + Math.random() * 1.2;
    emit({
      x: x + Math.cos(a) * 0.35,
      y: y - SIZE / 2 + 0.08,
      z: z + Math.sin(a) * 0.35,
      vx: Math.cos(a) * sp,
      vy: 0.4 + Math.random() * 0.6,
      vz: Math.sin(a) * sp,
      life: 0.5 + Math.random() * 0.3,
      size: 0.24,
      color: dust,
      alpha: 0.8,
      drag: 3,
      grow: [1, 2.2],
      fade: 0.5,
    });
  }
}

/** Each frame. */
export function updateCrates(dt: number) {
  for (let k = hops.length - 1; k >= 0; k--) {
    const h = hops[k]!;
    h.t += dt;
    if (h.t < 0) continue;
    if (!h.mesh.visible) {
      h.leave?.(h.from);
      h.mesh.visible = true;
    }
    h.aim?.(h.to);
    const u = Math.min(1, h.t / HOP.flight);
    const top = Math.max(Math.max(h.from.y, h.to.y) + HOP.apex, h.over ?? -Infinity);
    const y0 = h.from.y,
      y1 = h.to.y;
    const b = 2 * (top - y0) + 2 * Math.sqrt(Math.max(0, (top - y0) * (top - y1)));
    h.mesh.position.lerpVectors(h.from, h.to, u);
    h.mesh.position.y = y0 + b * u - (b - (y1 - y0)) * u * u;
    h.mesh.rotation.set(h.spin.x * h.t, h.spin.y * h.t, h.spin.z * h.t);
    if (u >= 1) {
      landDust(h.to.x, h.to.y, h.to.z);
      hops.splice(k, 1);
      give(h.kind, h.mesh);
      h.land();
    }
  }
}

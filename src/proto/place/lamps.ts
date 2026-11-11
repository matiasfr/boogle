// Lamps along a new path: they come on one after another from the near rim as it opens, down both edges of the deck, so you can
// see it's walkable from anywhere, and at night they're how you find it. Solid posts; the deck still has no railing. Local.
import * as THREE from 'three/webgpu';
import { scene } from '../../render/scene.ts';
import { readableUnlit } from '../../render/readable-unlit.ts';
import { pop } from '../../render/fanfare.ts';
import { flat } from '../../render/flat.ts';
import { addStatic } from '../../place/land.ts';
import { railY } from '../../place/layout.ts';
import { lines } from './lines.ts';
import { besideLine } from '../../entities/railway/rail-kit.ts';

const MAX = 120;
const posts = new THREE.InstancedMesh(new THREE.BoxGeometry(0.12, 1.5, 0.12), flat('#5c4530'), MAX);
const glows = new THREE.InstancedMesh(
  new THREE.BoxGeometry(0.26, 0.26, 0.26),
  readableUnlit(new THREE.MeshBasicNodeMaterial({ color: new THREE.Color(3, 2.1, 0.9) })),
  MAX,
);
posts.castShadow = true;
posts.frustumCulled = glows.frustumCulled = false;
posts.count = glows.count = 0;
scene.add(posts, glows);
const o = new THREE.Object3D();
const queue: { t: number; k: number; s: number; side: number }[] = [];
const EVERY = 7,
  EDGE = 1.72;
function place(k: number, s: number, side: number, loud: boolean) {
  if (posts.count >= MAX) return;
  const line = lines[k]!.spec.line;
  const q = besideLine(line, s, side * EDGE),
    y = railY(line, s);
  o.position.set(q.x, y + 0.75, q.z);
  o.updateMatrix();
  posts.setMatrixAt(posts.count++, o.matrix);
  o.position.y = y + 1.55;
  o.updateMatrix();
  glows.setMatrixAt(glows.count++, o.matrix);
  posts.instanceMatrix.needsUpdate = glows.instanceMatrix.needsUpdate = true;
  addStatic({ kind: 'box', hx: 0.06, hy: 0.75, hz: 0.06 }, { x: q.x, y: y + 0.75, z: q.z });
  if (loud) pop((posts.count >> 1) % 8, 0.25);
}
/** A row comes on, `s1` to `s0`, starting after `delay` s. */
export function lampRow(k: number, s0: number, s1: number, delay: number) {
  let t = delay;
  for (let s = s1; s >= s0; s -= EVERY) {
    for (const side of [-1, 1]) queue.push({ t, k, s, side });
    t += 0.09;
  }
}
const placed = new Set<string>();
export function updateLamps(dt: number) {
  for (let n = queue.length - 1; n >= 0; n--) {
    const q = queue[n]!;
    q.t -= dt;
    if (q.t > 0) continue;
    queue.splice(n, 1);
    const id = `${q.k}:${q.s}:${q.side}`;
    if (placed.has(id)) continue;
    placed.add(id);
    place(q.k, q.s, q.side, true);
  }
}
/** Those whose paths are open are on, with no show. */
export function snapLamps() {
  queue.length = 0;
  if (lines[0]!.open) lightAll(0, 60, 116);
  if (lines[1]!.open) lightAll(1, 306, 490);
}
function lightAll(k: number, s0: number, s1: number) {
  for (let s = s1; s >= s0; s -= EVERY)
    for (const side of [-1, 1]) {
      const id = `${k}:${s}:${side}`;
      if (placed.has(id)) continue;
      placed.add(id);
      place(k, s, side, false);
    }
}

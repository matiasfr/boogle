// Placeholder pieces of haul material (0.1 groundwork: placeholder visuals only), shared by ground piles, the haul
// stack and the work sites: one instanced-mesh maker per material kind. Logs are short brown cylinders lying on their
// side. Later ages get their own shapes; until then they reuse the log with a tint.
import * as THREE from 'three/webgpu';
import { scene } from './scene.js';

const TINT = ['#8a5a32', '#7d7f86', '#a9b4c2', '#c9b48a', '#7fd0ff', '#d9d2c4', '#c25ad9']; // by kind (sim/materials.js)
export const PIECE = { len: 0.62, r: 0.11 };
const geo = new THREE.CylinderGeometry(PIECE.r, PIECE.r, PIECE.len, 7).rotateZ(Math.PI / 2);

const mat = new THREE.MeshStandardNodeMaterial({ roughness: 0.9, flatShading: true }); // one for every piece mesh

// An InstancedMesh of up to `max` pieces, in the scene, hidden until commitPieces shows some. Fill it with
// setMatrixAt and setColorAt(n, pieceColor(kind)).
export function pieceMesh(max) {
  const mesh = new THREE.InstancedMesh(geo, mat, max);
  mesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(max * 3), 3);
  mesh.count = 0;
  mesh.visible = false;
  mesh.frustumCulled = false;
  mesh.castShadow = true;
  scene.add(mesh);
  return mesh;
}
// Shows the first n pieces written since the last commit (none: the mesh leaves the draw and shadow lists).
export function commitPieces(mesh, n) {
  mesh.count = n;
  mesh.visible = n > 0;
  mesh.instanceMatrix.needsUpdate = true;
  mesh.instanceColor.needsUpdate = true;
}

// Pieces flying to your stack (a pickup, a shake): anyone can ask, the haul stack (src/features/haul-stack.js) draws
// them. fly(from: Vector3, n).
const flyFns = [];
export const onFly = (fn) => flyFns.push(fn);
export const fly = (from, n) => flyFns.forEach((fn) => fn(from, n));

const colors = TINT.map((h) => new THREE.Color(h));
export const pieceColor = (k) => colors[k] ?? colors[0];

// A deterministic heap: piece m of a pile sits in a loose cross-hatched stack (4 per layer, alternating direction).
const q = new THREE.Quaternion(),
  e = new THREE.Euler(),
  v = new THREE.Vector3(),
  one = new THREE.Vector3(1, 1, 1);
export function heapMatrix(m, seed, x, y, z, out) {
  const layer = Math.floor(m / 4),
    slot = m % 4;
  const turn = (layer % 2) * (Math.PI / 2) + seed * 0.7;
  const off = (slot - 1.5) * PIECE.r * 2.1;
  e.set(0, turn, ((seed * 13 + m * 7) % 5) * 0.03);
  q.setFromEuler(e);
  v.set(Math.sin(turn) * off, PIECE.r + layer * PIECE.r * 1.8, Math.cos(turn) * off);
  return out.compose(v.set(x + v.x, y + v.y, z + v.z), q, one);
}

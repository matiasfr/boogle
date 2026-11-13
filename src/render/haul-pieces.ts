// Placeholder pieces of haul material (0.1 groundwork: placeholder visuals only), shared by ground piles, the haul
// stack and the work sites: one instanced-mesh maker per material kind. Logs are short brown cylinders lying on their
// side. Later ages get their own shapes; until then they reuse the log with a tint.
import * as THREE from 'three/webgpu';
import { boundedDrawCount, guardInstances, instanceCapacity } from './draw-count.ts';

const TINT = ['#8a5a32', '#7d7f86', '#a9b4c2', '#c9b48a', '#7fd0ff', '#d9d2c4', '#c25ad9']; // by kind (sim/materials.ts)
export const PIECE = { len: 0.62, r: 0.11 };
const geo = new THREE.CylinderGeometry(PIECE.r, PIECE.r, PIECE.len, 7).rotateZ(Math.PI / 2);

const mat = new THREE.MeshStandardNodeMaterial({ roughness: 0.9, flatShading: true }); // one for every piece mesh

// An InstancedMesh of up to `max` pieces, hidden until commitPieces shows some, for an entity to carry as its mesh or in
// its Group. Fill it with setMatrixAt and setColorAt(n, pieceColor(kind)).
export function pieceMesh(max: number): THREE.InstancedMesh {
  const mesh = new THREE.InstancedMesh(geo, mat, max);
  mesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(max * 3), 3);
  mesh.count = 0;
  mesh.visible = false;
  mesh.frustumCulled = false;
  mesh.castShadow = true;
  return guardInstances(mesh, 'haul pieces');
}
// Shows the first n pieces written since the last commit (none: the mesh leaves the draw and shadow lists).
export function commitPieces(mesh: THREE.InstancedMesh, n: number): void {
  mesh.count = boundedDrawCount(mesh, n, instanceCapacity(mesh));
  mesh.visible = mesh.count > 0;
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
}

const colors = TINT.map((h) => new THREE.Color(h));
export const pieceColor = (k: number): THREE.Color => colors[k] ?? colors[0]!;

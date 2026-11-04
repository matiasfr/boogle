import * as THREE from 'three';

// Concatenate many small vertex-colored geometries into one draw call (POIs use these too).
export function addPart(
  parts: THREE.BufferGeometry[],
  geo: THREE.BufferGeometry,
  matrix: THREE.Matrix4,
  color: THREE.ColorRepresentation,
) {
  const g = geo.index ? geo.toNonIndexed() : geo.clone();
  g.applyMatrix4(matrix);
  const c = new THREE.Color(color);
  const n = g.attributes.position!.count;
  const col = new Float32Array(n * 3);
  for (let k = 0; k < n; k++) {
    col[k * 3] = c.r;
    col[k * 3 + 1] = c.g;
    col[k * 3 + 2] = c.b;
  }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  parts.push(g);
}
export function mergeParts(parts: THREE.BufferGeometry[]) {
  let total = 0;
  for (const g of parts) total += g.attributes.position!.count;
  const pos = new Float32Array(total * 3),
    nrm = new Float32Array(total * 3),
    col = new Float32Array(total * 3);
  let off = 0;
  for (const g of parts) {
    pos.set(g.attributes.position!.array, off * 3);
    nrm.set(g.attributes.normal!.array, off * 3);
    col.set(g.attributes.color!.array, off * 3);
    off += g.attributes.position!.count;
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  out.setAttribute('normal', new THREE.BufferAttribute(nrm, 3));
  out.setAttribute('color', new THREE.BufferAttribute(col, 3));
  return out;
}

// Static root skirts reach terrain beneath the actual trunk ring. One batch, no additional loop.
import * as THREE from 'three/webgpu';
export type TreeRoot = { footprint: readonly (readonly [number, number])[]; bottom: number; burial: number };
export function createTreeRoots(
  trees: readonly { y: number; cleared: boolean; root: TreeRoot }[],
  material: THREE.Material,
) {
  const positions: number[] = [],
    indices: number[] = [];
  for (const t of trees) {
    if (t.cleared) continue;
    const { footprint, bottom } = t.root;
    const start = positions.length / 3,
      n = footprint.length;
    // Overlap the trunk by 2 cm so rounding cannot expose a seam. The lower skirt is intentionally underground.
    for (const y of [bottom, t.y + 0.02]) for (const [x, z] of footprint) positions.push(x, y, z);
    for (let k = 0; k < n; k++) {
      const a = start + k,
        b = start + ((k + 1) % n),
        c = a + n,
        d = b + n;
      indices.push(a, b, c, b, d, c);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  const mesh = new THREE.Mesh(geometry, material);
  mesh.castShadow = mesh.receiveShadow = true;
  return mesh;
}

// The owner-chosen rack, unchanged. Its three authored logs represent accepted stock, never its full ledger.
import * as THREE from 'three/webgpu';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { OwnedView } from '../../render/owned-view.ts';
import { loadAsset } from '../../render/assets.ts';
import rackUrl from '../../../assets/built/recovery-rack.glb?url';

export async function createRecoveryRack(
  owner: OwnedView,
  at: THREE.Vector3,
  addSolid: (vertices: Float32Array, indices: Uint32Array, position: THREE.Vector3) => void,
) {
  const asset = await loadAsset(rackUrl);
  if (!owner.alive) throw new Error('Recovery rack mounted after disposal');
  const model = asset.instance();
  const stockParts = new Set<THREE.Object3D>();
  const stockBounds = new THREE.Box3();
  const logs = [0, 1, 2].map((i) => {
    const log = model.getObjectByName(`log_${i}`);
    if (!log) throw new Error(`Recovery rack is missing its authored log_${i}`);
    log.traverse((part) => stockParts.add(part));
    stockBounds.expandByObject(log);
    return log;
  });
  const logBase = stockBounds.getCenter(new THREE.Vector3()).add(at);

  // Use the loaded structural triangles, including leaning posts, sloped roof and low bed. No stock collider:
  // accepting a pickup changes its representation, not whether a player can move through the courtyard.
  const vertices: number[] = [],
    indices: number[] = [],
    point = new THREE.Vector3();
  model.updateMatrixWorld(true);
  model.traverse((part) => {
    if (!(part instanceof THREE.Mesh) || stockParts.has(part)) return;
    const geometry = part.geometry,
      position = geometry.getAttribute('position'),
      index = geometry.index,
      base = vertices.length / 3;
    for (let i = 0; i < position.count; i++) {
      point.fromBufferAttribute(position, i).applyMatrix4(part.matrixWorld);
      vertices.push(point.x, point.y, point.z);
    }
    for (let i = 0; i < (index?.count ?? position.count); i++) indices.push(base + (index ? index.getX(i) : i));
  });
  // Collision above keeps the authored triangles. Only the static visual shell is joined;
  // stock retains its named nodes and independent visibility. Never mutate the cached GLB.
  const structure = new Map<THREE.Material, THREE.BufferGeometry[]>();
  const originals: THREE.Mesh[] = [];
  model.traverse((part) => {
    if (!(part instanceof THREE.Mesh) || stockParts.has(part)) return;
    if (Array.isArray(part.material)) throw new Error('Recovery rack structure needs one material per primitive');
    const geometry = new THREE.BufferGeometry();
    // Meshopt uses normalized integer attributes and decode scales on each node. Decode
    // to floats before baking that node's matrix, or setXYZ would quantize the result again.
    const source: THREE.BufferGeometry = part.geometry;
    for (const name of Object.keys(source.attributes)) {
      const attribute = source.getAttribute(name);
      const values = new Float32Array(attribute.count * attribute.itemSize);
      for (let i = 0; i < attribute.count; i++)
        for (let c = 0; c < attribute.itemSize; c++) values[i * attribute.itemSize + c] = attribute.getComponent(i, c);
      geometry.setAttribute(name, new THREE.BufferAttribute(values, attribute.itemSize));
    }
    geometry.setIndex(part.geometry.index);
    geometry.applyMatrix4(part.matrixWorld);
    const parts = structure.get(part.material) ?? [];
    parts.push(geometry);
    structure.set(part.material, parts);
    originals.push(part);
  });
  const merged: THREE.BufferGeometry[] = [];
  for (const [material, parts] of structure) {
    const geometry = mergeGeometries(parts);
    for (const part of parts) part.dispose();
    if (!geometry) throw new Error('Recovery rack structure has incompatible attributes');
    merged.push(geometry);
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = `recovery-rack ${material.name}`;
    mesh.castShadow = mesh.receiveShadow = true;
    model.add(mesh);
  }
  for (const part of originals) part.removeFromParent();
  model.position.copy(at);
  owner.add(model); // Clones only geometry into the view lifetime; cached authored materials remain shared.
  for (const geometry of merged) geometry.dispose(); // owner.add owns the clones from here.
  addSolid(new Float32Array(vertices), new Uint32Array(indices), at);
  const { flat } = await import('../../proto/flat.ts');
  const stoneAt = at.clone().add(new THREE.Vector3(1.3, 0.6, 0));
  const stone = Array.from({ length: 3 }, (_, i) => {
    const mesh = new THREE.Mesh(new THREE.DodecahedronGeometry(0.3), flat('#b0ab9d'));
    mesh.position.copy(stoneAt).add(new THREE.Vector3((i - 1) * 0.42, -0.3, 0));
    owner.add(mesh);
    return mesh;
  });
  const setStock = (count: number, stones = 0) => {
    logs.forEach((log, i) => (log.visible = count > i));
    stone.forEach((mesh, i) => (mesh.visible = stones > i));
  };
  setStock(0);
  return { logBase, stoneAt, setStock };
}

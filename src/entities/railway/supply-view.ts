// The owner-chosen rack, unchanged. Its three authored logs represent accepted stock, never its full ledger.
import * as THREE from 'three/webgpu';
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
  model.position.copy(at);
  owner.add(model); // Clones only geometry into the view lifetime; cached authored materials remain shared.
  addSolid(new Float32Array(vertices), new Uint32Array(indices), at);
  const setStock = (count: number) => logs.forEach((log, i) => (log.visible = count > i));
  setStock(0);
  return { logBase, setStock };
}

import * as THREE from 'three/webgpu';
import { registerBuilder } from '../builders.ts';
import { createTreeView, type TreePose } from '../../render/place-tree-view.ts';
import { flat } from '../../render/flat.ts';
import type { TreeSource } from '../../place/tree-placement-source.ts';
declare module '../names.ts' {
  interface BuilderNames {
    'scenery.tree': true;
  }
}
// Production's animated batch keeps its existing owner. This builder exposes the same standing geometry.
export const sceneryTree = registerBuilder('scenery.tree', (params, _batch, placement) => {
  if (!placement || !params.root) throw new Error('prefabs: tree builder needs its resolved placement');
  const source: TreeSource = {
    index: params.index as number,
    x: placement.pos[0],
    y: placement.pos[1],
    z: placement.pos[2],
    size: placement.scale?.[0] ?? 1,
    root: params.root as TreeSource['root'],
    great: params.great as boolean,
    hardwood: params.hardwood as boolean,
    cleared: params.cleared as boolean,
  };
  const root = new THREE.Group();
  const pose = {
    ...source,
    index: 0, // one standalone draw slot, independent of the unchanged sim id
    work: 0,
    issued: 0,
    ceiling: 10,
    revision: 0,
    collapsed: false,
    scuff: false,
    hitAt: 0,
    cutYaw: 0,
    strokes: 0,
    shake: 0,
    fall: -1,
    fallYaw: 0,
    at: new THREE.Vector3(source.x, source.y, source.z),
    body: null,
    stump: null,
  } as TreePose;
  const view = createTreeView(
    [pose],
    root,
    () => source.y,
    { flat, tree: (colour) => flat(colour).clone() },
    () => false,
    1,
  );
  view.pose(pose, 0);
  // The tree view owns world-space transforms; the returned group compensates the placement transform.
  root.position.set(-source.x / source.size, -source.y / source.size, -source.z / source.size);
  root.scale.setScalar(1 / source.size);
  return { object: root, dispose: view.dispose };
});

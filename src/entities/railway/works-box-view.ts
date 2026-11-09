// Both dormant views share one instanced-box recipe. One draw per view, including all palette changes.
import * as THREE from 'three/webgpu';
import type { OwnedView } from '../../render/owned-view.ts';
import { material } from '../../render/materials.ts';
import type { WorksBox } from './works-shape.ts';
export async function drawWorksBoxes(owner: OwnedView, boxes: WorksBox[]) {
  const { addStatic } = await import('../../proto/place/land.ts');
  const geometry = new THREE.BoxGeometry(1, 1, 1);
  const mesh = new THREE.InstancedMesh(geometry, material('stone', { colour: '#ffffff' }), boxes.length);
  const pose = new THREE.Object3D();
  boxes.forEach((b, i) => {
    pose.position.set(b.x, b.y, b.z);
    pose.rotation.set(0, b.yaw, 0);
    pose.scale.set(b.w, b.h, b.d);
    pose.updateMatrix();
    mesh.setMatrixAt(i, pose.matrix);
    mesh.setColorAt(i, new THREE.Color(b.colour ?? '#b7b0a0'));
    if (b.solid !== false)
      addStatic(
        { kind: 'box', hx: b.w / 2, hy: b.h / 2, hz: b.d / 2 },
        pose.position,
        pose.quaternion,
        undefined,
        owner,
      );
  });
  mesh.receiveShadow = true;
  mesh.computeBoundingSphere();
  owner.add(mesh);
  geometry.dispose();
  return mesh;
}

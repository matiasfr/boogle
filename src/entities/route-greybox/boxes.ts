// The greybox route's static boxes (docs/plans/greybox-route.md, leg 1 step 4; prerequisite P3): one instanced mesh
// with real bounds, each box yawed and optionally pitched (a ramp or a stair flight), with a static collider unless
// `solid` is false. `hidden` boxes are colliders only (a stack's wall and top under the horizon silhouette's mesh).
import * as THREE from 'three/webgpu';
import type { OwnedView } from '../../render/owned-view.ts';
import { material } from '../../render/materials.ts';

export type GreyBox = {
  x: number;
  y: number;
  z: number;
  /** Across, up and along (its local x, y, z), metres. */
  w: number;
  h: number;
  d: number;
  yaw: number;
  /** Radians about its local x: positive lifts its +z end. */
  pitch?: number;
  colour?: string;
  solid?: boolean;
  hidden?: boolean;
};

/** A box between two points (the middle of its top face runs from `a` to `b`), `w` wide and `h` thick. */
export function span(
  a: { x: number; y: number; z: number },
  b: { x: number; y: number; z: number },
  w: number,
  h: number,
  colour: string,
  solid = true,
): GreyBox {
  const dx = b.x - a.x,
    dz = b.z - a.z,
    dy = b.y - a.y,
    run = Math.hypot(dx, dz),
    pitch = Math.atan2(dy, run);
  return {
    x: (a.x + b.x) / 2,
    // The top face passes through a and b: the centre is half a thickness down its own normal.
    y: (a.y + b.y) / 2 - (h / 2) * Math.cos(pitch),
    z: (a.z + b.z) / 2,
    w,
    h,
    d: Math.hypot(run, dy),
    yaw: Math.atan2(dx, dz),
    pitch,
    colour,
    solid,
  };
}

const pose = new THREE.Object3D();
pose.rotation.order = 'YXZ';
function place(b: GreyBox) {
  pose.position.set(b.x, b.y, b.z);
  pose.rotation.set(-(b.pitch ?? 0), b.yaw, 0);
  pose.scale.set(b.w, b.h, b.d);
  pose.updateMatrix();
  return pose;
}

/** Draws `boxes` as one instanced mesh under `owner` and adds their colliders. Returns the mesh and the counts. */
export async function drawGreyBoxes(owner: OwnedView, boxes: readonly GreyBox[]) {
  const { addStatic } = await import('../../place/land.ts');
  const shown = boxes.filter((b) => !b.hidden);
  const geometry = new THREE.BoxGeometry(1, 1, 1);
  const mesh = new THREE.InstancedMesh(geometry, material('stone', { colour: '#ffffff' }), Math.max(1, shown.length));
  geometry.dispose();
  mesh.count = shown.length;
  const colour = new THREE.Color();
  shown.forEach((b, i) => {
    mesh.setMatrixAt(i, place(b).matrix);
    mesh.setColorAt(i, colour.set(b.colour ?? '#9c9ea1'));
  });
  let solids = 0;
  for (const b of boxes) {
    if (b.solid === false) continue;
    const p = place(b);
    addStatic({ kind: 'box', hx: b.w / 2, hy: b.h / 2, hz: b.d / 2 }, p.position, p.quaternion, undefined, owner);
    solids++;
  }
  mesh.name = 'route-greybox:massing';
  mesh.receiveShadow = true;
  mesh.computeBoundingBox();
  mesh.computeBoundingSphere();
  owner.add(mesh);
  return { mesh, solids };
}

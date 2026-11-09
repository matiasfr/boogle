// Local dormant ruin. The tarps and empty sockets promise a later fitting; nothing can be operated yet.
import * as THREE from 'three/webgpu';
import type { RailwayAdapter } from '../../adapters/railway.ts';
import type { OwnedView } from '../../render/owned-view.ts';
import type { Interactable } from '../../player/hands.ts';
import { material } from '../../render/materials.ts';
import {
  STALL_BOXES,
  STALL_SLAB,
  STALL_ROAD,
  STALL_SOCKETS,
  STALL_YAW,
  stallPoint,
  beam,
  box,
  type WorksBox,
} from './works-shape.ts';
import { drawWorksBoxes } from './works-box-view.ts';
export async function createRailwayRoundhouse(_adapter: RailwayAdapter, owner: OwnedView) {
  const boxes: WorksBox[] = [...STALL_BOXES, { ...STALL_SLAB, colour: '#9a958b' }];
  const part = (x: number, y: number, z: number, w: number, h: number, d: number, colour: `#${string}`) => {
    const p = stallPoint(x, z);
    boxes.push({ ...box(p.x, y, p.z, w, h, d, STALL_YAW), colour });
  };
  // Tandem on the short stall road: four-metre shunter and TRAILER's 2.2 x 3.2 m flatbed.
  part(0, 18.5, -0.7, 2.4, 0.5, 4, '#4e5352');
  part(0, 20.1, 0.4, 2, 2.5, 1.6, '#687f77');
  part(0, 19.8, -1.7, 2.3, 1.6, 2.4, '#87968b');
  part(0, 18.6, 3, 2.2, 0.35, 3.2, '#77766b');
  // Sagging tarp ridges retain the engine and wagon silhouettes in the greybox vocabulary.
  part(0, 21.4, 0.4, 2.2, 0.18, 1.9, '#87968b');
  part(0, 19.1, 3, 2.8, 0.55, 3.3, '#87968b');
  for (const x of [-1.2, 1.2]) for (const z of [1.6, 4.4]) part(x, 19.7, z, 0.12, 1.2, 0.12, '#4e5352');
  for (const x of [-1.2, 1.2]) part(x, 20.3, 3, 0.12, 0.12, 2.9, '#4e5352');
  for (const p of STALL_SOCKETS) {
    boxes.push({ ...box(p.x, 18.05, p.z, 0.9, 0.1, 0.9, STALL_YAW), colour: '#373c3b', solid: false });
    for (const offset of [-0.55, 0.55]) {
      boxes.push({ ...box(p.x + offset, 18.17, p.z, 0.14, 0.24, 1.2), colour: '#a9a395', solid: false });
      boxes.push({ ...box(p.x, 18.17, p.z + offset, 1.2, 0.24, 0.14), colour: '#a9a395', solid: false });
    }
  }
  for (let i = 1; i < STALL_ROAD.length; i++)
    for (const offset of [-0.75, 0.75]) {
      const a = STALL_ROAD[i - 1]!,
        b = STALL_ROAD[i]!;
      const length = Math.hypot(b.x - a.x, b.z - a.z);
      const side = { x: (offset * (b.z - a.z)) / length, z: (-offset * (b.x - a.x)) / length };
      boxes.push({
        ...beam({ x: a.x + side.x, z: a.z + side.z }, { x: b.x + side.x, z: b.z + side.z }, 18.35, 0.12, 0.14),
        colour: '#555b5b',
        solid: false,
      });
    }
  for (let z = -5; z < 5; z += 1) part(0, 18.2, z, 2, 0.15, 0.25, '#827c6e');
  // Visible cracks across the door's outer face.
  for (let i = 0; i < 3; i++) part(-0.1 + (i % 2) * 0.22, 18.8 + i * 0.8, -3.26, 0.14, 0.95, 0.14, '#464640');
  await drawWorksBoxes(owner, boxes);
  const geo = new THREE.CylinderGeometry(0.75, 0.75, 2.2, 8);
  geo.rotateX(Math.PI / 2);
  const boiler = new THREE.Mesh(geo, material('stone', { colour: '#687f77' }));
  const p = stallPoint(0, -1.7);
  boiler.position.set(p.x, 19.4, p.z);
  boiler.rotation.y = STALL_YAW;
  owner.add(boiler);
  geo.dispose();
  return { update() {}, restore() {}, targets: (): Interactable[] => [], inspect: () => ({ slab: true, tarp: true }) };
}

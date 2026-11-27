import * as THREE from 'three/webgpu';
import { registerBuilder } from '../builders.ts';
import { material } from '../../render/materials.ts';
import { TOWN_COURT, courtLength } from '../../place/town-plan.ts';

declare module '../names.ts' {
  interface BuilderNames {
    'town.ball-court': true;
    'town.ball-lever': true;
  }
}
function piece(parent: THREE.Group, geometry: THREE.BufferGeometry, color: number, x: number, y: number, z: number) {
  const mesh = new THREE.Mesh(geometry, material('paintedToy', { colour: `#${color.toString(16).padStart(6, '0')}` }));
  mesh.position.set(x, y, z);
  parent.add(mesh);
  return mesh;
}
registerBuilder('town.ball-lever', () => {
  const root = new THREE.Group();
  piece(root, new THREE.BoxGeometry(0.44, 0.4, 0.44), 0x71553b, 0, 0.2, 0);
  piece(root, new THREE.CylinderGeometry(0.04, 0.055, 0.36, 8), 0xc5984d, 0, 0.53, 0).rotation.z = -0.35;
  piece(root, new THREE.SphereGeometry(0.1, 10, 7), 0xdd543d, 0.06, 0.7, 0);
  return root;
});
registerBuilder('town.ball-court', (_params, _batch, placement) => {
  const root = new THREE.Group();
  const { width, height } = TOWN_COURT;
  const side = placement?.id === 'town.goal-a' ? 1 : -1;
  const angle = (side * -Math.PI) / 9;
  for (const x of [-width / 2, width / 2]) {
    const length = (courtLength * (1 + (side * x) / 8.5)) / 2;
    piece(
      root,
      new THREE.BoxGeometry(0.065, 0.02, length),
      0xfff0c7,
      x + (Math.sin(angle) * length) / 2,
      0.018,
      (Math.cos(angle) * length) / 2,
    ).rotation.y = angle;
  }
  const z = 0;
  for (const x of [-width / 2, width / 2])
    piece(root, new THREE.BoxGeometry(0.1, height, 0.1), 0x92633f, x, height / 2, z);
  piece(root, new THREE.BoxGeometry(width + 0.1, 0.1, 0.1), 0x92633f, 0, height, z);
  const string = new THREE.Group();
  string.name = 'bunting';
  string.position.set(0, height, z);
  root.add(string);
  piece(string, new THREE.CylinderGeometry(0.09, 0.155, 0.18, 4), 0xe4ad4d, 0, -0.15, 0);
  for (const [i, x] of [-0.84, -0.52, 0.52, 0.84].entries())
    piece(string, new THREE.ConeGeometry(0.14, 0.23, 3), i % 2 ? 0x55a99b : 0xe15b53, x, -0.115, 0).rotation.z =
      Math.PI;
  piece(root, new THREE.BoxGeometry(width, 0.02, 0.065), 0xfff0c7, 0, 0.018, z);
  return root;
});

import * as THREE from 'three/webgpu';
import { registerBuilder } from '../builders.ts';
import { material } from '../../render/materials.ts';
import { TOWN_COURT, courtLength } from '../../place/town-plan.ts';

declare module '../names.ts' {
  interface BuilderNames {
    'town.ball-court': true;
    'town.ball-lever': true;
    'town.choice-board': true;
    'town.golf-cup': true;
    'town.golf-tee': true;
    'town.dunk': true;
    'town.horn-pad': true;
  }
}
function piece(parent: THREE.Group, geometry: THREE.BufferGeometry, color: number, x: number, y: number, z: number) {
  const mesh = new THREE.Mesh(geometry, material('paintedToy', { colour: `#${color.toString(16).padStart(6, '0')}` }));
  mesh.position.set(x, y, z);
  parent.add(mesh);
  return mesh;
}
function brassHorn(root: THREE.Group, y: number, z: number) {
  const bell = new THREE.Group();
  bell.position.set(0, y, z);
  bell.rotation.set(1.05, 0, -0.45);
  root.add(bell);
  piece(bell, new THREE.CylinderGeometry(0.32, 0.07, 0.52, 16), 0xe8ac4f, 0, 0, 0);
  piece(bell, new THREE.CylinderGeometry(0.26, 0.26, 0.012, 16), 0x79502b, 0, 0.264, 0);
  piece(root, new THREE.CylinderGeometry(0.065, 0.065, 0.35, 10), 0x996326, 0, y - 0.16, z - 0.2);
}
function flag(root: THREE.Group) {
  piece(root, new THREE.CylinderGeometry(0.04, 0.04, 1.55), 0xffecc8, 0, 0.78, 0);
  piece(root, new THREE.BoxGeometry(0.48, 0.33, 0.055), 0xe74e43, 0.22, 1.38, 0);
}
registerBuilder('town.golf-cup', () => {
  const root = new THREE.Group();
  const rim = piece(root, new THREE.TorusGeometry(0.77, 0.085, 8, 28, Math.PI * 1.4), 0xffcf54, 0, 0.12, 0);
  rim.rotation.set(Math.PI / 2, 0, Math.PI * 0.8);
  piece(root, new THREE.CylinderGeometry(0.76, 0.76, 0.04), 0x298d82, 0, 0.045, 0);
  const pole = new THREE.Group();
  pole.name = 'flag';
  pole.position.z = -0.74;
  root.add(pole);
  flag(pole);
  return root;
});
registerBuilder('town.golf-tee', () => {
  const root = new THREE.Group();
  piece(root, new THREE.BoxGeometry(1.25, 0.045, 1.18), 0x298d82, 0, 0.03, 0);
  piece(root, new THREE.CylinderGeometry(0.24, 0.24, 0.025), 0xffecc8, 0, 0.067, 0);
  return root;
});
registerBuilder('town.dunk', () => {
  const root = new THREE.Group();
  piece(root, new THREE.CylinderGeometry(0.66, 0.65, 0.06), 0x48c0c3, 0, 0.04, 0);
  for (const x of [-0.64, 0.64]) piece(root, new THREE.BoxGeometry(0.1, 2.75, 0.12), 0xb67447, x, 1.38, -0.36);
  piece(root, new THREE.BoxGeometry(1.45, 0.13, 0.18), 0xffce61, 0, 2.65, -0.36);
  const bucket = new THREE.Group();
  bucket.name = 'bucket';
  bucket.position.set(0, 2.64, -0.22);
  root.add(bucket);
  piece(bucket, new THREE.CylinderGeometry(0.5, 0.34, 0.63, 16), 0x3c8798, 0, 0, 0);
  piece(bucket, new THREE.CylinderGeometry(0.46, 0.46, 0.02, 16), 0x82e5df, 0, 0.32, 0);
  for (const [radius, colour, z] of [
    [0.45, 0xc14a40, 0],
    [0.27, 0xffeec4, 0.07],
    [0.13, 0xd95a33, 0.14],
  ] as const)
    piece(root, new THREE.CylinderGeometry(radius, radius, 0.09, 24), colour, 0.78, 1.5, z).rotation.x = Math.PI / 2;
  return root;
});
registerBuilder('town.choice-board', (params) => {
  const root = new THREE.Group();
  if (params.kind === 1) {
    piece(root, new THREE.CylinderGeometry(0.12, 0.15, 0.34, 10), 0xffedcd, 0, 2.61, 0);
    piece(root, new THREE.SphereGeometry(0.36, 16, 8, 0, 2 * Math.PI, 0, Math.PI / 2), 0xdb4537, 0, 2.74, 0);
    for (const x of [-0.14, 0.14]) piece(root, new THREE.SphereGeometry(0.07, 8, 6), 0xffedcd, x, 2.93, 0.22);
  } else if (params.kind === 3) {
    piece(root, new THREE.CylinderGeometry(0.37, 0.34, 0.07, 24), 0xff4fa3, 0, 2.76, 0).rotation.x = 0.9;
  } else if (params.kind === 4) {
    const topper = new THREE.Group();
    topper.scale.setScalar(0.62);
    topper.position.y = 2.36;
    root.add(topper);
    flag(topper);
  } else if (params.kind === 5) {
    piece(root, new THREE.CylinderGeometry(0.34, 0.23, 0.45), 0x3c8798, 0, 2.75, 0).rotation.z = -0.55;
  } else if (params.kind === 6) {
    piece(root, new THREE.CylinderGeometry(0.17, 0.1, 0.72, 12), 0xd6aa52, 0, 2.8, 0).rotation.z = -1.12;
  } else if (params.kind === 7) {
    piece(root, new THREE.CylinderGeometry(0.14, 0.31, 0.4, 16), 0xd6aa52, 0, 2.8, 0);
    piece(root, new THREE.SphereGeometry(0.08, 10, 8), 0x724c2b, 0, 2.55, 0);
  } else brassHorn(root, 2.79, 0);
  return root;
});
registerBuilder('town.horn-pad', () => {
  const root = new THREE.Group();
  piece(root, new THREE.CylinderGeometry(0.55, 0.55, 0.12, 24), 0xc08a40, 0, 0.06, 0);
  piece(root, new THREE.CylinderGeometry(0.41, 0.42, 0.02, 24), 0xe8bb62, 0, 0.12, 0);
  brassHorn(root, 2.2, -1.0);
  return root;
});
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
    const chalk = piece(
      root,
      new THREE.BoxGeometry(0.065, 0.02, length, 1, 1, 12),
      0xfff0c7,
      x + (Math.sin(angle) * length) / 2,
      0.018,
      (Math.cos(angle) * length) / 2,
    );
    chalk.rotation.y = angle;
    chalk.name = 'chalk';
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
  piece(root, new THREE.BoxGeometry(width, 0.02, 0.065, 8), 0xfff0c7, 0, 0.018, z).name = 'chalk';
  return root;
});

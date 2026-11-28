import * as THREE from 'three/webgpu';
import { material } from '../../render/materials.ts';
import { mulberry32 } from '../../sim/rng.ts';
import type { OwnedView } from '../../render/owned-view.ts';

export function mountQuayEdges(owner: OwnedView) {
  // Local x runs along the platforms. Local z points out across the straight dock face.
  const root = new THREE.Group();
  root.name = 'Port Quay freight edges';
  root.position.set(137.6, 0, 942.25);
  root.rotation.y = Math.atan2(-17.75, -17.6);
  const boxes: { matrix: THREE.Matrix4; colour: string }[] = [];
  function box(x: number, y: number, z: number, w: number, h: number, d: number, colour: string, yaw = 0) {
    const matrix = new THREE.Matrix4().makeRotationY(yaw).scale(new THREE.Vector3(w, h, d));
    boxes.push({ matrix: matrix.setPosition(x, y, -z), colour });
  }
  const timber = '#7a5430';
  for (const sign of [-1, 1]) {
    box(0, 3.58, sign * 7.8, 40, 0.48, 0.14, timber);
    box(20, 3.58, sign * 5.8, 0.14, 0.48, 4, timber);
  }
  box(0, 2.58, 18, 52, 0.62, 0.2, timber);
  for (let x = -24; x <= 24; x += 6) box(x, 1.91, 18.12, 0.48, 1.98, 0.36, '#644a34');

  // Low stacks beside the apron lip and the platform ends, clear of the crossing and yard.
  for (const [x, base, z] of [
    [-27, 3.02, -10],
    [-25.9, 3.02, -10],
    [-27, 4.02, -10],
    [18.2, 3.9, 7.05],
    [17.1, 3.9, 7.05],
    [18.2, 4.9, 7.05],
  ] as const) {
    box(x, base + 0.5, z, 1, 1, 1, '#a8703a');
    for (const offset of [-0.32, 0.32]) box(x + offset, base + 0.5, z, 0.09, 1.02, 1.02, timber);
  }

  // Two staggered courses wrap the seaward end of the resident slab, below the dock fascia.
  for (let course = 0; course < 2; course++) {
    for (let i = 0; i < 4; i++) {
      box(
        -26 + course * 0.28,
        0.65 + course * 0.48,
        5 + i * 3.4 + course * 0.45,
        2.4 - course * 0.8,
        0.56,
        3.37,
        ['#827e73', '#969083', '#888578'][(i + course) % 3]!,
      );
    }
  }
  // Retain the raised yard along its east edge. The six-metre opening is the yard ramp.
  for (const [start, end] of [
    [-66, -40],
    [-34, -7.8],
  ] as const) {
    const mid = (start + end) / 2;
    box(22.05, 3.24, mid, 0.12, 0.4, end - start, '#694c35');
    box(22.05, 3.67, mid, 0.12, 0.42, end - start, timber);
    for (let z = start + 0.2; z < end; z += 5) box(22.14, 3.46, z, 0.18, 0.86, 0.32, '#594533');
  }
  // Broken cinders collect along the margins of the cart approach, outside the worn wheel paths.
  const random = mulberry32(1749);
  for (const side of [-1, 1]) {
    for (let cluster = 0; cluster < 24; cluster++) {
      const x = 25.8 + random() * 8;
      const z = -37 + side * (1.9 + random() * 4);
      for (let chip = 0; chip < 5; chip++) {
        const width = 0.04 + random() * 0.1;
        box(
          x + random() - 0.5,
          3.027,
          z + random() - 0.5,
          width,
          0.018,
          width * 0.65,
          random() < 0.6 ? '#696158' : '#908578',
          random() * Math.PI,
        );
      }
    }
  }
  const cube = new THREE.BoxGeometry();
  const mesh = new THREE.InstancedMesh(cube, material('timber', { colour: '#ffffff' }), boxes.length);
  boxes.forEach(({ matrix, colour }, i) => {
    mesh.setMatrixAt(i, matrix);
    mesh.setColorAt(i, new THREE.Color(colour));
  });
  root.add(mesh);
  owner.add(root);
  cube.dispose();
}

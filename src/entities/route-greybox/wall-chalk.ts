import * as THREE from 'three/webgpu';
import { color, mix, vertexColor } from 'three/tsl';
import { compiled } from '../../prefab/catalogue.ts';
import { kitMaterial } from '../../prefab/builders/terrain-kit.ts';
import { material } from '../../render/materials.ts';
import { patchNode } from '../../render/material-patch.ts';
import type { OwnedView } from '../../render/owned-view.ts';
import { terrainKitGeometry } from '../terrain-kit/geometry.ts';

// Train-facing stretches of the mapped shore. Both runs follow the top ring
// counterclockwise, with the water on the right.
const shores = {
  'wall-s2': { first: 33, angle: 48 },
  'wall-n1': { first: 33, angle: 122 },
};

export async function wallChalk(owner: OwnedView, islet: keyof typeof shores) {
  const kit = await terrainKitGeometry();
  if (!owner.alive) return;
  const prism = compiled.prefabs[`greybox.${islet}`]!.colliders[0]!;
  if (prism.shape !== 'trimesh') throw new Error('Missing Wall shore');
  const { first, angle } = shores[islet];
  const centre = new THREE.Vector3().fromArray(prism.vertices, prism.vertices.length - 3);
  const axis = THREE.MathUtils.degToRad(angle);
  const along = (v: THREE.Vector3) => (v.x - centre.x) * Math.cos(axis) + (v.z - centre.z) * Math.sin(axis);
  const chalk = patchNode(kitMaterial().clone(), 'colorNode', (beds) =>
    mix(beds, color('#c9c5bb').mul(vertexColor().r.mul(0.25).add(0.75)), 0.94),
  );
  owner.cleanup(() => chalk.dispose());
  const shoreCount = 9;
  const spurs =
    islet === 'wall-s2'
      ? [
          { bay: 2, height: 4 },
          { bay: 5, height: 5.5 },
          { bay: 7, height: 3 },
        ]
      : [];
  const faces = new THREE.InstancedMesh(kit.get('face_10')!, chalk, shoreCount + spurs.length);
  faces.name = 'White Wall chalk foot';
  const lip: number[] = [],
    grass: number[] = [];
  for (let i = 0; i < shoreCount; i++) {
    const a = new THREE.Vector3().fromArray(prism.vertices, 3 * (first + i));
    const b = new THREE.Vector3().fromArray(prism.vertices, 3 * (first + i + 1));
    const dx = b.x - a.x,
      dz = b.z - a.z,
      length = Math.hypot(dx, dz);
    const mid = a.clone().lerp(b, 0.5);
    const yaw = Math.atan2(-dz, dx);
    const facing = (mid.x - centre.x) * -dz + (mid.z - centre.z) * dx > 0 ? 1 : -1;
    const matrix = new THREE.Matrix4().makeRotationY(yaw + (facing < 0 ? Math.PI : 0));
    // Each course steps back into the bank. Bring its foot out far enough
    // that the upper beds meet the backing plane as the courses taper.
    const toe = (0.95 * facing) / length;
    faces.setMatrixAt(
      i,
      matrix.scale(new THREE.Vector3(length / 10, 1.45, 0.6)).setPosition(mid.x - dz * toe, -2, mid.z + dx * toe),
    );
    // Narrow chalk spurs climb out of the continuous waterline beds.
    const spur = spurs.findIndex(({ bay }) => bay === i);
    if (spur >= 0) {
      const projection = (3.2 * facing) / length;
      faces.setMatrixAt(
        shoreCount + spur,
        new THREE.Matrix4()
          .makeRotationY(yaw + (facing < 0 ? Math.PI : 0))
          .scale(new THREE.Vector3(length / 15, spurs[spur]!.height, 2.1))
          .setPosition(mid.x - dz * projection, -2, mid.z + dx * projection),
      );
    }
    // The backdrop cuts its 250 m long axis at -0.60 and +0.44 radii.
    // Leave breaks where either end crosses a riser.
    const height = (s: number) => (s < -150 ? 91.2 : s > 110 ? 108 : 120);
    const top = height(along(a));
    if (i % 4 === 0 || top !== height(along(b))) continue;
    const point = (t: number, y: number) => [
      a.x + dx * t - ((facing * dz) / length) * 0.09,
      y,
      a.z + dz * t + ((facing * dx) / length) * 0.09,
    ];
    const p = point(0.03, top),
      q = point(0.96, top),
      r = point(0.93, top - 1.3),
      s = point(0.08, top - 2.4);
    lip.push(...p, ...q, ...r, ...p, ...r, ...s);
    if (top === 120) continue;
    const x = mid.x + ((facing * dz) / length) * 2,
      z = mid.z - ((facing * dx) / length) * 2;
    for (const offset of [-0.6, 0, 0.7])
      grass.push(x + offset, top, z, x + offset + 0.35, top, z, x + offset + 0.5, top + 0.9, z + 0.12);
  }
  owner.add(faces);
  for (const [name, xyz, tint] of [
    ['rim', lip, '#ded9c8'],
    ['grass', grass, '#8c9379'],
  ] as const) {
    if (!xyz.length) continue;
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(xyz, 3));
    geo.computeVertexNormals();
    const mesh = new THREE.Mesh(geo, material('stone', { colour: tint, sidedness: 'double' }));
    mesh.name = 'White Wall ' + name;
    owner.add(mesh);
    geo.dispose();
  }
  return { update() {} };
}

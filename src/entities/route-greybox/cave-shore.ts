import * as THREE from 'three/webgpu';
import { compiled } from '../../prefab/catalogue.ts';
import { kitMaterial } from '../../prefab/builders/terrain-kit.ts';
import { material } from '../../render/materials.ts';
import type { OwnedView } from '../../render/owned-view.ts';
import { terrainKitGeometry } from '../terrain-kit/geometry.ts';

export async function hoodRock(owner: OwnedView) {
  const pieces = await terrainKitGeometry();
  if (!owner.alive) return;
  const face = pieces.get('face_6')!;
  const mesh = new THREE.InstancedMesh(face, kitMaterial(), 2);
  mesh.name = 'West hood shoulders';
  // Work back from the exit chord's daylight end. The faces flank the 13 m opening.
  const yaw = Math.atan2(-125, 225);
  const at = (along: number, across: number) =>
    new THREE.Vector3(
      795 + Math.sin(yaw) * along + Math.cos(yaw) * across,
      3.1,
      75 + Math.cos(yaw) * along - Math.sin(yaw) * across,
    );
  const shoulder = new THREE.Matrix4().makeRotationY(yaw).scale(new THREE.Vector3(5.6 / 6, 0.54, 0.18));
  mesh.setMatrixAt(0, shoulder.setPosition(at(14.9, -9.5)));
  mesh.setMatrixAt(1, shoulder.setPosition(at(14.9, 9.5)));
  owner.add(mesh);
  // Print the last course onto the existing inner wall plane. The depth bias
  // resolves coplanar pixels while the entire 13 m opening stays clear.
  const lining = kitMaterial().clone();
  lining.polygonOffset = true;
  lining.polygonOffsetFactor = lining.polygonOffsetUnits = -2;
  owner.cleanup(() => lining.dispose());
  const inset = new THREE.Mesh(face, lining);
  inset.name = 'West hood return';
  inset.rotation.y = yaw - Math.PI / 2;
  inset.scale.set(0.9, 0.54, 0.00001);
  inset.position.copy(at(12, 6.5));
  owner.add(inset);
  return { update() {} };
}

export async function saltShore(owner: OwnedView) {
  const pieces = await terrainKitGeometry();
  if (!owner.alive) return;
  const prism = compiled.prefabs['greybox.salt-land']!.colliders[0]!;
  if (prism.shape !== 'trimesh') throw new Error('Saltpan needs its land outline');
  // landPrism stores the top ring, bottom ring and centre in world coordinates.
  const vertices = prism.vertices;
  const count = (vertices.length / 3 - 1) / 2;
  const centre = new THREE.Vector3().fromArray(vertices, vertices.length - 3);
  const positions: number[] = [],
    grass: number[] = [];
  const rockCount = Math.ceil(count / 8);
  const rocks = new THREE.InstancedMesh(pieces.get('bank_rock')!, kitMaterial(), rockCount);
  const rim = (i: number) => new THREE.Vector3().fromArray(vertices, (i % count) * 3).setY(3.035);
  for (let i = 0; i < count; i++) {
    const a = rim(i),
      b = rim(i + 1);
    const inner = (v: THREE.Vector3) => v.clone().lerp(centre, 0.34).setY(a.y);
    for (const point of [a, b, inner(b), a, inner(b), inner(a)]) positions.push(point.x, point.y, point.z);
    if (i % 8 !== 0) continue;
    const p = a.clone().lerp(b, 0.5);
    const yaw = Math.atan2(a.z - b.z, b.x - a.x);
    rocks.setMatrixAt(
      i / 8,
      new THREE.Matrix4()
        .makeRotationY(yaw)
        .scale(new THREE.Vector3(1.4, 0.32, 0.7))
        .setPosition(p),
    );
    for (const offset of [-0.45, 0.35, 0.8]) {
      const x = p.x + offset;
      grass.push(x, p.y, p.z, x + 0.17, p.y, p.z + 0.12, x + 0.32, p.y + 0.62, p.z);
    }
  }
  const strip = (xyz: number[], colour: `#${string}`, name: string) => {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(xyz, 3));
    geometry.computeVertexNormals();
    const mesh = new THREE.Mesh(geometry, material('stone', { colour, sidedness: 'double' }));
    mesh.name = name;
    owner.add(mesh);
    geometry.dispose();
  };
  strip(positions, '#c5c1ae', 'Saltpan salt band');
  strip(grass, '#8c9379', 'Saltpan edge grass');
  rocks.name = 'Saltpan shore rocks';
  owner.add(rocks);
  return { update() {} };
}

import * as THREE from 'three/webgpu';
import { compiled } from '../../prefab/catalogue.ts';
import type { Placement } from '../../prefab/types.ts';
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
  const at = (along: number, across: number, foot: number) =>
    new THREE.Vector3(
      795 + Math.sin(yaw) * along + Math.cos(yaw) * across,
      foot,
      75 + Math.cos(yaw) * along - Math.sin(yaw) * across,
    );
  const shoulder = new THREE.Matrix4().makeRotationY(yaw).scale(new THREE.Vector3(5.6 / 6, 0.84, 0.78));
  mesh.setMatrixAt(0, shoulder.setPosition(at(14.9, -9.5, -2)));
  mesh.setMatrixAt(1, shoulder.setPosition(at(14.9, 9.5, -1.7)));
  owner.add(mesh);
  // Print the courses onto the inner wall planes, keeping the 13 m opening clear.
  const lining = kitMaterial().clone();
  lining.polygonOffset = true;
  lining.polygonOffsetFactor = lining.polygonOffsetUnits = -2;
  owner.cleanup(() => lining.dispose());
  const returns = new THREE.InstancedMesh(face, lining, 4);
  returns.name = 'West hood return';
  for (const [side, sign] of [-1, 1].entries()) {
    const course = new THREE.Matrix4()
      .makeRotationY(yaw - (sign * Math.PI) / 2)
      .scale(new THREE.Vector3(7.35 / 6, 0.96, 0.00001));
    for (let bay = 0; bay < 2; bay++)
      returns.setMatrixAt(2 * side + bay, course.setPosition(at((bay + 0.5) * 7.35, sign * 6.5, -2)));
  }
  owner.add(returns);
  // Face the incoming chord at its mouth, with jambs outside the opening
  // and three broad, broken blocks following the roof edge above it.
  const entryYaw = Math.atan2(-6, 65);
  const front = new THREE.Group();
  front.rotation.y = entryYaw;
  front.position.set(801 + 45 * Math.sin(entryYaw), 0, 10 + 45 * Math.cos(entryYaw));
  const jambs = new THREE.InstancedMesh(face, kitMaterial(), 2);
  const jamb = new THREE.Matrix4().makeRotationY(Math.PI).scale(new THREE.Vector3(0.7, 0.96, 0.58));
  for (const [i, x] of [-8.7, 8.7].entries()) jambs.setMatrixAt(i, jamb.setPosition(x, -2, -1.2));
  front.add(jambs);
  // Use the exit return's flush treatment down the two inner walls.
  const walls = new THREE.InstancedMesh(face, lining, 6);
  for (const [side, sign] of [-1, 1].entries()) {
    const course = new THREE.Matrix4()
      .makeRotationY((-sign * Math.PI) / 2)
      .scale(new THREE.Vector3(1.14, 0.96, 0.00001));
    for (let bay = 0; bay < 3; bay++)
      walls.setMatrixAt(3 * side + bay, course.setPosition(sign * 6.5, -2, (bay + 0.5) * 6.76));
  }
  front.add(walls);
  const lintel = new THREE.InstancedMesh(pieces.get('rim_cap')!, kitMaterial(), 3);
  const cap = new THREE.Matrix4().makeRotationY(Math.PI).scale(new THREE.Vector3(1.32, 0.85, 0.62));
  for (const [i, x] of [-5.1, 0, 5.1].entries()) lintel.setMatrixAt(i, cap.setPosition(x, 11.8, -0.7));
  front.add(lintel);
  front.name = 'West sea cave entrance';
  owner.add(front);
  return { update() {} };
}

function saltBoardingEdge(owner: OwnedView, deck: Placement) {
  const [width, height, length] = deck.scale!;
  const count = Math.floor(length / 1.25);
  const pitch = length / count;
  const geometry = new THREE.BoxGeometry();
  const blocks = new THREE.InstancedMesh(geometry, material('stone', { colour: '#b8ab92' }), count);
  blocks.name = deck.id + ':coping';
  blocks.position.fromArray(deck.pos);
  const [yaw, tilt] = deck.rot!;
  blocks.rotation.set(tilt, yaw, 0, 'YXZ');
  const side = deck.id.startsWith('saltpan.platform-0-') || deck.id.endsWith('step-0') ? -1 : 1;
  const matrix = new THREE.Matrix4().makeScale(0.32, 0.16, pitch - 0.035);
  for (let i = 0; i < count; i++)
    blocks.setMatrixAt(
      i,
      matrix.setPosition(side * (width / 2 - 0.15), height / 2 - 0.055, (i + 0.5) * pitch - length / 2),
    );
  owner.add(blocks);
  geometry.dispose();
}

export async function saltShore(owner: OwnedView, deck: readonly Placement[]) {
  const pieces = await terrainKitGeometry();
  if (!owner.alive) return;
  for (const platform of deck) saltBoardingEdge(owner, platform);
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

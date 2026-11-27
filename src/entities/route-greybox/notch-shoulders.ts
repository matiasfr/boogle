import * as THREE from 'three/webgpu';
import { color, vertexColor } from 'three/tsl';
import { kitMaterial } from '../../prefab/builders/terrain-kit.ts';
import { material } from '../../render/materials.ts';
import type { OwnedView } from '../../render/owned-view.ts';
import { terrainKitGeometry } from '../terrain-kit/geometry.ts';

export async function notchShoulders(owner: OwnedView) {
  const pieces = await terrainKitGeometry();
  if (!owner.alive) return;
  const face = pieces.get('face_6')!;
  const limestone = kitMaterial().clone();
  limestone.colorNode = color('#bdb5a2').mul(vertexColor().r);
  owner.cleanup(() => limestone.dispose());
  const shoulders = new THREE.InstancedMesh(face, limestone, 2);
  shoulders.name = 'Notch limestone courses';
  // The backdrop piers have a 22 m frontage. Keep the courses inside their
  // jambs and compress their relief against the existing solid east faces.
  const matrix = new THREE.Matrix4().makeRotationY(Math.PI / 2).scale(new THREE.Vector3(3.35, 3.8, 0.025));
  for (const [i, z] of [-972, -1028].entries()) {
    shoulders.setMatrixAt(i, matrix.setPosition(-1606.93, 5.8, z));
  }
  owner.add(shoulders);

  // A tapered patch of packed earth on the level reef between the steps
  // and the lantern. Depth bias keeps the pigment on the walkable 6 m plane.
  const earth = material('stone', { colour: '#716b5e' }).clone();
  earth.polygonOffset = true;
  earth.polygonOffsetFactor = earth.polygonOffsetUnits = -2;
  owner.cleanup(() => earth.dispose());
  const path = new THREE.BufferGeometry();
  path.setAttribute(
    'position',
    new THREE.Float32BufferAttribute(
      [-1590, 6, -981, -1595, 6, -977, -1623, 6, -985, -1590, 6, -981, -1623, 6, -985, -1621, 6, -989],
      3,
    ),
  );
  path.setIndex([0, 2, 1, 3, 5, 4]);
  path.computeVertexNormals();
  owner.add(new THREE.Mesh(path, earth));
  path.dispose();

  const blades: number[] = [];
  for (const z of [-962, -1038]) {
    for (const offset of [-0.8, -0.35, 0.2, 0.65]) {
      blades.push(-1606.6, 6, z + offset, -1606.3, 6, z + offset + 0.3, -1606.4, 7.2, z + offset + 0.5);
    }
  }
  const grass = new THREE.BufferGeometry();
  grass.setAttribute('position', new THREE.Float32BufferAttribute(blades, 3));
  grass.computeVertexNormals();
  owner.add(new THREE.Mesh(grass, material('stone', { colour: '#78806c', sidedness: 'double' })));
  grass.dispose();
  return { update() {} };
}

// Two cullable opaque batches. Render and collision consume exactly the same original code-mesh recipe.
import * as THREE from 'three/webgpu';
import { defineKind, spawn } from '../../entity/entity.ts';
import { createBody } from '../../physics/engine.ts';
import { GROUP, groundMat } from '../../physics/physics.ts';
import { registerWaterReceiver } from '../../render/water/receivers.ts';
import { COVE_DRY, coveMeshes } from './cove.ts';
import { ORIGIN } from './layout.ts';
import { holdCoveStop } from './cove-stop.ts';

defineKind('place-cove', { fixedPre: 44 });
export function buildCove() {
  const group = new THREE.Group();
  group.name = 'west-cove-sandstone';
  group.position.set(ORIGIN.x, 0, ORIGIN.z);
  const material = new THREE.MeshStandardNodeMaterial({ vertexColors: true, roughness: 0.93, flatShading: true });
  if (!COVE_DRY) registerWaterReceiver(material);
  const geometries = coveMeshes.map((m) => {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(m.vertices, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(m.colors, 3));
    geometry.setIndex(m.indices);
    geometry.computeVertexNormals();
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = m.name;
    mesh.castShadow = mesh.receiveShadow = true;
    group.add(mesh);
    return geometry;
  });
  const bodies = coveMeshes.map((m) =>
    createBody({
      material: groundMat,
      group: GROUP.SCENERY,
      position: { x: ORIGIN.x, y: 0, z: ORIGIN.z },
      shapes: [{ kind: 'trimesh', vertices: m.vertices, indices: m.indices }],
    }),
  );
  spawn({
    kind: 'place-cove',
    mesh: group,
    bodies,
    fixedPre: holdCoveStop,
    describe: () => ({
      triangles: coveMeshes.reduce((n, m) => n + m.indices.length / 3, 0),
      batches: 2,
      collision: 'same triangles',
      textures: 0,
    }),
    dispose() {
      for (const g of geometries) g.dispose();
      material.dispose();
    },
  });
}

import * as THREE from 'three';
import { MeshStandardNodeMaterial } from 'three/webgpu';

import { terrainKitGeometry } from '../entities/terrain-kit/geometry.ts';
import { kitMaterial } from '../prefab/builders/terrain-kit.ts';
import { warmUp } from './precompile.ts';
import { isHomePalm, tileKey, type PropSample } from '../blueprints/props.ts';
import { placements } from '../entities/props/state.ts';
import { clearedAt } from '../island/layout.ts';
import { mulberry32 } from '../math.ts';
import { defineKind, spawn } from '../entity/entity.ts';
import { freezeStatic } from './instances.ts';

import { registerWaterReceiver } from './water/receivers.ts';

export { addPart, mergeParts } from './geometry-parts.ts';
import { addPart, mergeParts } from './geometry-parts.ts';
import { addPalm, addBroadleaf, addRock } from './prop-models.ts';

const propsMat = new MeshStandardNodeMaterial({ vertexColors: true, flatShading: true, roughness: 0.9 });
// Scenery that never moves, as one entity with no methods. Its colliders are the `props` entity (src/entities/props/).
defineKind('props-view', {});
export function createProps() {
  registerWaterReceiver(propsMat);
  const tiles = new Map<number, THREE.BufferGeometry[]>();
  const rocks: Extract<PropSample, { blueprint: 'rock' }>[] = [];
  for (const p of placements) {
    if (clearedAt(p.x, p.z) && !isHomePalm(p)) continue;
    if (p.blueprint === 'rock') {
      rocks.push(p);
      continue;
    }
    const k = tileKey(p.x, p.z);
    if (!tiles.has(k)) tiles.set(k, []);
    const parts = tiles.get(k)!;
    if (p.blueprint === 'palm') addPalm(parts, p);
    else addBroadleaf(parts, p);
  }
  const group = new THREE.Group();
  for (const parts of tiles.values()) {
    const mesh = new THREE.Mesh(mergeParts(parts), propsMat);
    mesh.geometry.computeBoundingSphere();
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
  }
  // The old shapes cover the solids immediately, including when the optional kit cannot load.
  const fallbackParts: THREE.BufferGeometry[] = [];
  for (const rock of rocks) addRock(fallbackParts, rock);
  const fallback = new THREE.Mesh(mergeParts(fallbackParts), propsMat);
  fallback.castShadow = fallback.receiveShadow = true;
  group.add(fallback);
  const dressed = terrainKitGeometry().then(
    (pieces) => {
      const material = kitMaterial().clone();
      registerWaterReceiver(material);
      const sizeClass = (r: number) => (r < 1 ? 's' : r < 1.8 ? 'm' : 'l');
      for (const size of ['s', 'm', 'l']) {
        const samples = rocks.filter((p) => sizeClass(p.size) === size);
        if (!samples.length) continue;
        const geometry = pieces.get('boulder_' + size)!;
        const bounds = geometry.boundingBox!;
        const center = bounds.getCenter(new THREE.Vector3());
        const extent = bounds.getSize(new THREE.Vector3());
        const batch = new THREE.InstancedMesh(geometry, material, samples.length);
        const recenter = new THREE.Matrix4().makeTranslation(-center.x, -bounds.min.y, -center.z);
        const pose = new THREE.Object3D();
        for (const [i, p] of samples.entries()) {
          pose.position.set(p.x, p.h - 0.15 * p.size, p.z);
          pose.rotation.y = p.look.spin[1]!;
          pose.scale.set(2.1 / extent.x, 1.07 / extent.y, 1.85 / extent.z).multiplyScalar(p.size);
          pose.updateMatrix();
          pose.matrix.multiply(recenter);
          batch.setMatrixAt(i, pose.matrix);
        }
        batch.castShadow = batch.receiveShadow = true;
        group.add(batch);
      }
      fallback.removeFromParent();
      fallback.geometry.dispose();
    },
    (error: unknown) => console.warn('[props] using fallback rocks:', error),
  );
  warmUp(() => dressed);
  spawn({ kind: 'props-view', mesh: group });
  freezeStatic(group); // never moves: no per-frame matrix work
}

// update -190, after the camera (src/entities/camera/, -200), before the feature update hooks (src/loop.ts lists the orders).
defineKind('cloud', { update: -190 });
export const clouds: THREE.Mesh<THREE.BufferGeometry, THREE.MeshLambertMaterial>[] = [];
export function createClouds() {
  const rng = mulberry32(77);
  const puff = new THREE.IcosahedronGeometry(1, 1);
  const mat = new THREE.MeshLambertMaterial({
    color: '#ffffff',
    emissive: '#d8ecff',
    emissiveIntensity: 0.45,
    flatShading: true,
  });
  for (let c = 0; c < 9; c++) {
    const parts: THREE.BufferGeometry[] = [];
    const m = new THREE.Matrix4();
    for (let k = 0; k < 5; k++) {
      const r = 5 + rng() * 6;
      m.compose(
        new THREE.Vector3((k - 2) * 6 + rng() * 3, rng() * 3, rng() * 6 - 3),
        new THREE.Quaternion(),
        new THREE.Vector3(r, r * 0.6, r),
      );
      addPart(parts, puff, m, '#ffffff');
    }
    const mesh = new THREE.Mesh(mergeParts(parts), mat);
    const a = rng() * Math.PI * 2,
      d = 140 + rng() * 180;
    mesh.position.set(Math.cos(a) * d, 55 + rng() * 35, Math.sin(a) * d);
    spawn({
      kind: 'cloud',
      mesh,
      update({ dt }) {
        mesh.position.x += dt * 1.2;
        if (mesh.position.x > 340) mesh.position.x = -340;
      },
    });
    clouds.push(mesh);
  }
}

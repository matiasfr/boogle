import * as THREE from 'three';
import { MeshStandardNodeMaterial } from 'three/webgpu';

import { isHomePalm, tileKey } from '../blueprints/props.ts';
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
  for (const p of placements) {
    if (clearedAt(p.x, p.z) && !isHomePalm(p)) continue;
    const k = tileKey(p.x, p.z);
    if (!tiles.has(k)) tiles.set(k, []);
    const parts = tiles.get(k)!;
    if (p.blueprint === 'palm') addPalm(parts, p);
    else if (p.blueprint === 'broadleaf') addBroadleaf(parts, p);
    else addRock(parts, p);
  }
  const group = new THREE.Group();
  for (const parts of tiles.values()) {
    const mesh = new THREE.Mesh(mergeParts(parts), propsMat);
    mesh.geometry.computeBoundingSphere();
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
  }
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

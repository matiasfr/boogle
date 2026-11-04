import * as THREE from 'three';
import { MeshStandardNodeMaterial } from 'three/webgpu';
import { bool, dot, fract, positionView, screenCoordinate, uniform, vec2 } from 'three/tsl';

import { isHomePalm, tileKey, type PropPlacement } from '../blueprints/props.ts';
import { placements } from '../entities/props/state.ts';
import { clearedAt } from '../island/layout.ts';
import { mulberry32 } from '../math.ts';
import { defineKind, spawn } from '../entity/entity.ts';
import { freezeStatic } from './instances.ts';
import { registerWaterContact } from './water/contacts.ts';
import { registerWaterReceiver } from './water/receivers.ts';
import { inShore, shoreRocks } from '../island/shore-options.ts';

export { addPart, mergeParts } from './geometry-parts.ts';
import { addPart, mergeParts } from './geometry-parts.ts';
import { addPalm, addBroadleaf, addRock } from './prop-models.ts';
type Rock = PropPlacement & { blueprint: 'rock' };

const propsMat = new MeshStandardNodeMaterial({ vertexColors: true, flatShading: true, roughness: 0.9 });
// Metres from the lens inside which props dither away, so a chase camera can pass a crown or a rock without a screenful
// of leaves (the soapbox sets it while seated). 0 keeps every fragment.
export const propsNearFade = uniform(0);
// The fade costs a discard on every prop fragment (and so early depth rejection), so props have no mask until a
// prototype that uses it asks for one. Shadows are never touched.
export function enablePropsNearFade() {
  // interleaved gradient noise: stable per pixel, so the fade doesn't sparkle
  const noise = fract(fract(dot(screenCoordinate.xy, vec2(0.06711056, 0.00583715))).mul(52.9829189));
  propsMat.maskNode = positionView.length().greaterThan(noise.add(0.3).mul(propsNearFade));
  propsMat.maskShadowNode = bool(true);
  propsMat.needsUpdate = true;
}

// Scenery that never moves, as one entity with no methods. Its colliders are the `props` entity (src/entities/props/).
defineKind('props-view', {});
export function createProps() {
  registerWaterReceiver(propsMat);
  const removeContacts: (() => void)[] = [];
  const tiles = new Map<number, THREE.BufferGeometry[]>();
  const shoreParts = new Set<THREE.BufferGeometry>();
  const shorePlacements: Rock[] = [];
  const shoreCuts: { geometry: THREE.BufferGeometry; cut: THREE.BufferAttribute }[] = [];
  for (const p of placements) {
    if (clearedAt(p.x, p.z) && !isHomePalm(p)) continue;
    const k = tileKey(p.x, p.z);
    if (!tiles.has(k)) tiles.set(k, []);
    const parts = tiles.get(k)!;
    if (p.blueprint === 'palm') addPalm(parts, p);
    else if (p.blueprint === 'broadleaf') addBroadleaf(parts, p);
    else {
      addRock(parts, p);
      if (!(shoreRocks && inShore(p.x, p.z)) && p.h < 0.5 && p.h + p.size * 1.25 > 0)
        removeContacts.push(registerWaterContact({ x: p.x, z: p.z, radius: p.size * 1.1, top: p.h + p.size * 1.25 }));
      if (shoreRocks && inShore(p.x, p.z)) {
        shoreParts.add(parts.at(-1)!);
        shorePlacements.push(p);
      }
    }
  }
  const group = new THREE.Group();
  for (const parts of tiles.values()) {
    const mesh = new THREE.Mesh(mergeParts(parts), propsMat);
    if (parts.some((p) => shoreParts.has(p))) {
      const kept: number[] = [];
      let offset = 0;
      for (const part of parts) {
        const count = part.getAttribute('position').count;
        if (!shoreParts.has(part)) for (let i = 0; i < count; i++) kept.push(offset + i);
        offset += count;
      }
      shoreCuts.push({ geometry: mesh.geometry, cut: new THREE.BufferAttribute(new Uint32Array(kept), 1) });
    }
    mesh.geometry.computeBoundingSphere();
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
  }
  spawn({
    kind: 'props-view',
    mesh: group,
    dispose: () => {
      for (const remove of removeContacts) remove();
    },
  });
  freezeStatic(group); // never moves: no per-frame matrix work
  if (shorePlacements.length)
    void import('../proto/shore/rocks.ts').then((m) =>
      removeContacts.push(m.buildShoreRocks(group, shoreCuts, shorePlacements)),
    );
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

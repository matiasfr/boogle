// The lighthouse: a striped tower on the hill in the middle of the island, with a spiral staircase round the outside up
// to a gallery deck.
// At dusk the lamp comes on and two beams sweep the sea (on the shared clock, so everyone sees the same sweep).
//
// Its two records (content/prefabs/pois.ts) are the tower with its deck, stair and solids, and the lantern; both stand
// where content/levels/pois.ts puts them, under this entity's owner. The stair's shape is src/prefab/lighthouse.ts.
import * as THREE from 'three';
import { camera } from '../../render/scene.ts';
import { addPart, mergeParts } from '../../render/geometry-parts.ts';
import { onStart } from '../../loop.ts';
import { skyNow } from '../../render/sky.ts';
import { sharedSeconds } from '../../netplay/shared-time.ts';
import { addLightSource, removeLightSource } from '../../render/lights.ts';
import { reducedMotion } from '../../constants.ts';
import { defineKind, spawn } from '../../entity/entity.ts';
import { createOwnedView } from '../../render/owned-view.ts';
import { instantiate } from '../../prefab/instantiate.ts';
import { definitions } from '../../prefab/catalogue.ts';
import { loadLevelArtifact } from '../../prefab/validate.ts';
import { lanternOf } from '../../prefab/builders/poi-lighthouse.ts';
import level from '../../../content/built/levels/lighthouse.json' with { type: 'json' };
import site, { PAD_Y } from './site.ts';
import type { Placement } from '../../prefab/types.ts';

// In the site's frame, unturned: from its centre, above its pad.
const [towerAt, lanternAt] = loadLevelArtifact(level, definitions).placements.map((p): Placement => ({
  ...p,
  pos: [site.x + p.pos[0], PAD_Y + p.pos[1], site.z + p.pos[2]],
}));
const tower = definitions['poi.lighthouse']!.visual;
/** The walkable top of the gallery deck (world metres). */
export const DECK_Y =
  'builder' in tower ? PAD_Y + (tower.params.plinthH as number) + (tower.params.towerH as number) : 0;

defineKind('lighthouse', { update: 0 });
const night = () => THREE.MathUtils.smoothstep(1 - (skyNow.day ?? 1), 0.25, 0.6);

function build() {
  const owner = createOwnedView();
  const parts: THREE.BufferGeometry[] = [];
  const statics = instantiate(towerAt!.prefab, towerAt!, { owner, still: true });
  statics.setEnabled(true);
  for (const p of statics.pieces) addPart(parts, p.geometry, p.matrix, p.color);
  const mesh = new THREE.Mesh(
    mergeParts(parts),
    new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.8 }),
  );
  mesh.castShadow = mesh.receiveShadow = true;
  owner.add(mesh);
  mesh.updateMatrixWorld();
  mesh.matrixAutoUpdate = false; // never moves: no per-frame matrix work

  const lit = instantiate(lanternAt!.prefab, lanternAt!, { owner });
  lit.setEnabled(true);
  const { glass, lamp, beams, halo, on } = lanternOf(lit.root);
  lamp.updateWorldMatrix(true, false);
  const lampAt = lamp.getWorldPosition(new THREE.Vector3());
  const light = addLightSource({ position: lampAt.clone(), color: '#ffd9a0', intensity: 90, distance: 26, on: night });
  owner.cleanup(() => removeLightSource(light));

  const lampOff = new THREE.Color('#7a6a4a'),
    lampOn = new THREE.Color('#fff2c8'),
    toCam = new THREE.Vector3(),
    beamDir = new THREE.Vector3();
  function update() {
    const n = night();
    beams.visible = halo.visible = n > 0.01;
    lamp.material.color.copy(lampOff).lerp(lampOn, n);
    glass.material.emissiveIntensity = n * 0.9;
    if (n <= 0.01) return;
    const a = reducedMotion ? 0.3 : sharedSeconds() * 0.55;
    beams.rotation.y = a;
    on.value = n;
    // The halo flares when a beam swings round to face you.
    toCam.subVectors(camera.position, lampAt).setY(0).normalize();
    beamDir.set(Math.cos(a), 0, -Math.sin(a));
    const face = Math.abs(toCam.dot(beamDir));
    halo.material.opacity = n * (0.55 + 0.45 * Math.pow(face, 24));
    halo.scale.setScalar(6 + 10 * Math.pow(face, 24));
  }
  spawn({ kind: 'lighthouse', mesh: owner.root, update, dispose: () => owner.dispose() });
}

onStart(build);

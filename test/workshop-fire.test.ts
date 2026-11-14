// The forge fire's owner-disposal contract: what makeForgeFire registers in the shared light pool, dispose removes.
// Source-owned, with the real light registry and no renderer, scene or particle pool.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as THREE from 'three/webgpu';
import { sourceModule } from '../dev/level/source.ts';
import { addLightSource, lightSources, removeLightSource } from '../src/render/light-sources.ts';

const fire = sourceModule<typeof import('../src/entities/town/workshop-fire.ts')>(
  fs.readFileSync('src/entities/town/workshop-fire.ts', 'utf8'),
  {
    THREE,
    reducedMotion: false,
    addLightSource,
    removeLightSource,
    emit: () => {},
    readableIntensity: () => 1,
    readableUnlit: (m: unknown) => m,
  },
);

test('the forge fire leaves no light source behind: three create/dispose cycles retain none', () => {
  const before = lightSources.length;
  for (let n = 0; n < 3; n++) {
    const room = new THREE.Group();
    const view = fire.makeForgeFire(room, 3.15, new THREE.Vector3(913, 19, -3));
    assert.equal(lightSources.length, before + 1, 'one source while the fire lives');
    view.update(0.1, true, true);
    assert.ok(lightSources.at(-1)!.intensity > 0, 'lit: the source glows');
    view.dispose();
    assert.equal(lightSources.length, before, `cycle ${n + 1}: the source is gone`);
    assert.equal(room.children.length, 0, 'and its meshes left the room');
  }
});

test('removing a light source twice changes nothing more', () => {
  const a = addLightSource({ position: new THREE.Vector3(), intensity: 1, distance: 5 });
  const count = lightSources.length;
  removeLightSource(a);
  removeLightSource(a);
  assert.equal(lightSources.length, count - 1);
});

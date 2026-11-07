import * as THREE from 'three';
import { GRID_RES, HALF, CELL, SEA } from '../constants.ts';
import { heights } from '../island/heights.ts';
import { defineKind, spawn, despawn } from '../entity/entity.ts';
import { seaU } from './water/state.ts';
import { registerShoreProvider, gridBedAt, createShoreAtlas } from './water/shore-providers.ts';
import { createOcean } from './water/surface.ts';
import { fftWaves } from './water/fft.ts';
import { bakeFoam } from './water/foam.ts';
import { shoreFields } from './water/shore-nodes.ts';
import { createWaterQuality } from './water/quality.ts';

import { createWaterQueries } from './water/queries.ts';
import { createCaustics } from './water/caustics.ts';
import { installWaterReceivers } from './water/receivers.ts';
import { createSpray } from './water/spray.ts';
import { contactDistance } from './water/contacts.ts';
import { createUnderwater } from './water/underwater.ts';
import { createSnow } from './water/snow.ts';
import { createFrozenWaterSky } from './water/frozen-sky.ts';
import { installWaterPost } from './water/post.ts';
import { waterField } from '../physics/water-field.ts';
import { GRID } from './water/tuning.ts';
import { TSL } from './water/tsl.ts';
import { camera, rendererReady, scene, sun } from './scene.ts';
import { warmUp, warmDraw } from './precompile.ts';
import { registerGraphics } from '../graphics-settings.ts';
export { seaU, seaRipples } from './water/state.ts';
export { registerShoreProvider } from './water/shore-providers.ts';

// late 3010, last hook before render, after the presence send (net.ts, 3000): the sea's clock.
defineKind('sea', { prePhysics: -110, lateUpdate: 3010 });

let waterMesh: THREE.Mesh | null = null;
export let waterReady: Promise<void> = Promise.resolve();
export const waterRuntime: { inspect(): Record<string, unknown>; dispose(): void } = {
  inspect: () => ({ mode: 'new', ready: false }),
  dispose() {},
};

function createRealSea() {
  const frozen = createFrozenWaterSky();
  const atlas = createShoreAtlas(),
    source = fftWaves(),
    foam = bakeFoam(),
    quality = createWaterQuality();
  quality.update(); // allocate the loading frame at the same scene resolution as the first playable frame
  const fogRange = TSL.uniform(new THREE.Vector2(110, 520));
  const field = shoreFields(atlas);
  const caustics = createCaustics(source.fft.moments, source.fft.bands.indexOf(2), source.fft.size);
  const removeReceivers = installWaterReceivers(field, caustics.sample);
  const ocean = createOcean(source, field, foam, {
    sky: frozen.sky,
    contactDistance,
    grid: { ...GRID, far: camera.far, outer: Math.min(3000, camera.far * 0.5) },
    fitCameraRange: true,
    fog: (distance) => TSL.smoothstep(fogRange.x, fogRange.y, distance),
  });
  // The phone ladder's sea rung (graphics-settings.ts) and the cheaper far sea; both Local, both live.
  let seaDetail = 'full',
    farSea = false;
  const removeSeaDetail = registerGraphics({
    id: 'seaDetail',
    label: 'Sea detail',
    choices: ['full', 'low'],
    default: 'full',
    applyMode: 'live',
    cost: 'sea vertices',
    skips: 'Low draws the sea grid with half the spokes and rings: a quarter of its triangles.',
    read: () => seaDetail,
    apply: (value) => {
      seaDetail = value === 'low' ? 'low' : 'full';
      ocean.setDetail(seaDetail === 'low' ? GRID.angular / 2 : GRID.angular);
    },
  });
  const removeFarSea = registerGraphics({
    id: 'farSea',
    label: 'Cheaper far sea',
    choices: [false, true],
    default: false,
    applyMode: 'live',
    cost: 'sea vertices behind the camera, far sea fill',
    skips: 'Skips displacement outside the view cone, and refraction and glitter past 300 m.',
    read: () => farSea,
    apply: (value) => {
      farSea = value === true;
      ocean.setFarSea(farSea);
    },
  });
  const queries = createWaterQueries(ocean.heightAt, atlas);
  const underwater = createUnderwater(ocean, frozen.sky);
  const snow = createSnow(ocean, frozen.sky);
  const post = installWaterPost(underwater.outputNode, underwater.cameraDepth);
  const removeProvider = waterField.install(queries.provider);
  const spray = createSpray(atlas);
  let ready = false,
    disposed = false;
  const entity = spawn({
    kind: 'sea',
    mesh: ocean.mesh,
    prePhysics({ elapsed }) {
      seaU.uTime.value = elapsed;
      queries.publish(elapsed);
    },
    lateUpdate({ elapsed, dt }) {
      if (!ready || disposed) return;
      atlas.sync();
      frozen.update(dt);
      const fog = scene.fog as THREE.Fog;
      fogRange.value.set(fog.near, fog.far);
      ocean.update(camera, elapsed, sun);
      caustics.update(seaU.uSun.value);
      queries.dispatch(elapsed);
      quality.update(); // after adaptive-res, normalize once against its actual DPR
      underwater.update(elapsed, dt);
      snow.update(underwater.near.value && waterField.nearby(camera.position).body === 'sea');
    },
    describe: () => ({
      mode: 'new',
      ready,
      disposed,
      fftBands: source.fft.bands,
      quality: quality.name,
      resolution: quality.resolution,
      queries: queries.inspect(),
      underwater: underwater.inspect(),
      sky: frozen.inspect(),
      tone: post.tone(),
      ...atlas.inspect(),
    }),
    dispose() {
      if (disposed) return;
      disposed = true;
      ready = false;
      waterMesh = null;
      waterRuntime.inspect = () => ({ mode: 'new', ready: false, disposed: true });
      waterRuntime.dispose = () => {};
      removeProvider();
      removeReceivers();
      removeSeaDetail();
      removeFarSea();
      post.dispose();
      frozen.dispose();
      underwater.dispose();
      snow.dispose();
      spray.dispose();
      caustics.dispose();
      queries.dispose();
      ocean.dispose();
      source.dispose?.();
      atlas.dispose();
      foam.dispose();
      quality.dispose();
    },
  });
  waterRuntime.inspect = () => entity.describe!();
  waterRuntime.dispose = () => despawn(entity);
  // Compile while the frozen sky is baking; the warm-up below awaits this INSIDE its existing deadline.
  const prepared = rendererReady.then(async () => {
    if (disposed || !entity.alive) return;
    atlas.sync();
    await source.prepare();
    await queries.prepare();
    await underwater.prepare();
    await post.prepare();
  });
  // CPU resources exist before the loading precompile. GPU work begins only after the existing renderer is ready.
  waterReady = Promise.all([rendererReady, frozen.ready]).then(() => {
    if (disposed || !entity.alive) return;
    atlas.sync();
  });
  warmUp(
    async () => {
      await waterReady;
      if (disposed || !entity.alive) return;
      // Both FFT parities, both readback slots and the wet lens must exist before the first update.
      // computeAsync only waits for renderer.init in r187; compileComputeAsync waits for native pipelines.
      await prepared;
      if (disposed || !entity.alive) return;
      source.update(0);
      ready = true;
      // main's whole-scene warm-up includes this mesh; a separate queued compile duplicates that work.
    },
    { beforeScene: true },
  );
  warmDraw(() => {
    if (!ready || disposed) return;
    caustics.update(seaU.uSun.value);
    underwater.update(0, 0);
  });
  return ocean.mesh;
}

export function createWaterMesh() {
  if (waterMesh) return waterMesh;
  registerShoreProvider({
    id: 'home',
    bounds: { minX: -HALF, maxX: HALF, minZ: -HALF, maxZ: HALF },
    seaLevel: SEA,
    revision: 'stamped-home-1',
    extent: 512,
    bedAt: gridBedAt({
      x0: -HALF,
      z0: HALF,
      dx: CELL,
      dz: -CELL,
      nx: GRID_RES,
      nz: GRID_RES,
      height: (i, j) => heights[i]![j]!,
    }),
  });
  return (waterMesh = createRealSea());
}

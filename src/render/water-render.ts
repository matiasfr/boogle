import * as THREE from 'three';
import { GRID_RES, HALF, CELL, SEA } from '../constants.ts';
import { heights } from '../island/heights.ts';
import { defineKind, spawn, despawn } from '../entity/entity.ts';
import { seaU } from './water/state.ts';
import { registerShoreProvider, gridBedAt } from './water/shore-providers.ts';
import { createOcean } from './water/surface.ts';
import { bakeWaveCell, WAVE_SIZE } from './water/art.ts';
import { createCoast } from './water/coast.ts';
import { createSwellProvider } from './water/field.ts';
import { createWaterQuality } from './water/quality.ts';
import { createCaustics } from './water/caustics.ts';
import { installWaterReceivers } from './water/receivers.ts';
import { createUnderwater } from './water/underwater.ts';
import { createFrozenWaterSky } from './water/frozen-sky.ts';
import { installWaterPost } from './water/post.ts';
import { waterField } from '../physics/water-field.ts';
import { TSL } from './water/tsl.ts';
import { camera, rendererReady, scene } from './scene.ts';
import { warmUp } from './precompile.ts';
import { registerGraphics } from '../graphics-settings.ts';
export { seaU, seaRipples } from './water/state.ts';
export { registerShoreProvider } from './water/shore-providers.ts';

// late 3010, last hook before render, after the presence send (net.ts, 3000): the sea's clock.
defineKind('sea', { prePhysics: -110, lateUpdate: 3010 });

let waterMesh: THREE.Mesh | null = null;
let created = false;
export let waterReady: Promise<void> = Promise.resolve();
export const waterRuntime: { inspect(): Record<string, unknown>; dispose(): void } = {
  inspect: () => ({ mode: 'new', ready: false }),
  dispose() {},
};

const SPOKES = { full: 96, low: 48 }; // the sea grid's spokes; low is the phone ladder's sea rung

function createRealSea() {
  const frozen = createFrozenWaterSky();
  const quality = createWaterQuality();
  quality.update(); // allocate the loading frame at the same scene resolution as the first playable frame
  const fogRange = TSL.uniform(new THREE.Vector2(110, 520));
  // CPU resources exist before the loading precompile; GPU work waits for the renderer.
  const coast = createCoast();
  coast.sync();
  const waveTex = bakeWaveCell();
  const caustics = createCaustics();
  const ocean = createOcean({

    coast,
    waveTex,
    fog: (distance) => TSL.smoothstep(fogRange.x, fogRange.y, distance),
    far: camera.far,
  });
  const field = createSwellProvider(coast);
  let ready = false,
    disposed = false;
  const removeReceivers = installWaterReceivers(caustics.sample);
  let seaDetail: keyof typeof SPOKES = 'full';
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
      ocean.setDetail(SPOKES[seaDetail]);
    },
  });
  const underwater = createUnderwater(ocean.deepColor);
  const post = installWaterPost(underwater.outputNode);
  const removeProvider = waterField.install(field.provider);
  const entity = spawn({
    kind: 'sea',
    mesh: ocean.mesh,
    prePhysics({ elapsed }) {
      seaU.uTime.value = elapsed;
      field.publish(elapsed);
    },
    lateUpdate({ elapsed, dt }) {
      if (!ready || disposed) return;
      coast.sync();
      frozen.update(dt);
      const fog = scene.fog as THREE.Fog;
      fogRange.value.set(fog.near, fog.far);
      ocean.update(camera, elapsed);
      quality.update(); // after adaptive-res, normalize once against its actual DPR
      underwater.update();
    },
    describe: () => ({
      mode: 'new',
      ready,
      disposed,
      quality: quality.name,
      resolution: quality.resolution,
      underwater: underwater.inspect(),
      sky: frozen.inspect(),
      tone: post.tone(),
      vertices: ocean.vertices(),
      field: field.inspect(),
      textureBytes: { wave: Math.round((WAVE_SIZE * WAVE_SIZE * 4 * 4) / 3), caustic: caustics.bytes },
      ...coast.inspect(),
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
      post.dispose();
      frozen.dispose();
      ocean.dispose();
      caustics.dispose();
      waveTex.dispose();
      coast.dispose();
      quality.dispose();
    },
  });
  waterMesh = ocean.mesh;
  waterRuntime.inspect = () => entity.describe!();
  waterRuntime.dispose = () => despawn(entity);
  // Compile while the frozen sky is baking; the warm-up below awaits this INSIDE its existing deadline.
  const prepared = rendererReady.then(async () => {
    if (disposed || !entity.alive) return;
    await post.prepare();
  });
  waterReady = Promise.all([rendererReady, frozen.ready]).then(() => {
    if (disposed || !entity.alive) return;
    coast.sync();
  });
  warmUp(
    async () => {
      await waterReady;
      if (disposed || !entity.alive) return;
      await prepared;
      if (disposed || !entity.alive) return;
      ready = true;
      // main's whole-scene warm-up includes this mesh; a separate queued compile duplicates that work.
    },
    { beforeScene: true },
  );
}

export function createWaterMesh() {
  if (created) return waterMesh;
  created = true;
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
  createRealSea();
  return waterMesh;
}

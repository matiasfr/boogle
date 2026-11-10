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
import { graphicsInitial, registerGraphics } from '../graphics-settings.ts';
import { WATER_CHOICES, type SeaSurface, type SurfaceContext, type WaterChoice } from './water/sea-surface.ts';
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

/**
 * Which surface this client draws (docs/plans/water-sunshine.md): `?water=<id>` is shorthand for `?graphics=water:<id>`
 * and, being one client's look only, also works without Dev, so the owner can compare on a friend's phone. On reload.
 */
export function waterChoice(): WaterChoice {
  const flag = new URLSearchParams(location.search).get('water');
  const choices: readonly string[] = WATER_CHOICES;
  if (flag && choices.includes(flag)) return flag as WaterChoice;
  return graphicsInitial('water', WATER_CHOICES, 'sun-depth') as WaterChoice;
}

// Ultra Water: the FFT sea, its shore atlas, caustics producer and GPU queries.
function createUltraSurface(context: SurfaceContext): SeaSurface {
  const atlas = createShoreAtlas(),
    source = fftWaves(),
    foam = bakeFoam();
  const field = shoreFields(atlas);
  const caustics = createCaustics(source.fft.moments, source.fft.bands.indexOf(2), source.fft.size);
  const ocean = createOcean(source, field, foam, {
    sky: context.sky,
    contactDistance,
    grid: { ...GRID, far: camera.far, outer: Math.min(3000, camera.far * 0.5) },
    fitCameraRange: true,
    fog: context.fog,
  });
  const queries = createWaterQueries(ocean.heightAt, atlas);
  return {
    ocean,
    provider: queries.provider,
    receivers: { field, caustics: caustics.sample },
    sprayAtlas: atlas,
    publish: queries.publish,
    sync: atlas.sync,
    afterOcean(elapsed) {
      caustics.update(seaU.uSun.value);
      queries.dispatch(elapsed);
    },
    async prepare() {
      atlas.sync();
      await source.prepare();
      await queries.prepare();
    },
    start: () => source.update(0),
    warmDraw: () => caustics.update(seaU.uSun.value),
    describe: () => ({ fftBands: source.fft.bands, queries: queries.inspect(), ...atlas.inspect() }),
    dispose() {
      caustics.dispose();
      queries.dispose();
      ocean.dispose();
      source.dispose?.();
      atlas.dispose();
      foam.dispose();
    },
  };
}

function createRealSea() {
  const frozen = createFrozenWaterSky();
  const quality = createWaterQuality();
  quality.update(); // allocate the loading frame at the same scene resolution as the first playable frame
  const fogRange = TSL.uniform(new THREE.Vector2(110, 520));
  const context: SurfaceContext = {
    sky: frozen.sky,
    fog: (distance) => TSL.smoothstep(fogRange.x, fogRange.y, distance),
    far: camera.far,
  };
  const choice = waterChoice();
  const removeChoice = registerGraphics({
    id: 'water',
    label: 'Water',
    choices: WATER_CHOICES,
    default: 'sun-depth',
    audience: 'dev',
    scope: 'Local',
    applyMode: 'reload',
    cost: 'the sea surface: Ultra FFT and screen copies, or the Sunshine plane (depth copy for sun-depth)',
    skips: 'sun and sun-depth skip the FFT, caustics producer, GPU queries, shore atlas and colour copy.',
    read: () => choice,
    apply: () => {},
  });
  let ready = false,
    disposed = false,
    surface: SeaSurface | null = null;
  const finish = (s: SeaSurface) => {
    surface = s;
    const { ocean } = s;
    const removeReceivers = installWaterReceivers(s.receivers.field, s.receivers.caustics);
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
    const underwater = createUnderwater(ocean, frozen.sky);
    const snow = createSnow(ocean, frozen.sky);
    const post = installWaterPost(underwater.outputNode, underwater.cameraDepth);
    const removeProvider = waterField.install(s.provider);
    const spray = createSpray(s.sprayAtlas);
    const entity = spawn({
      kind: 'sea',
      mesh: ocean.mesh,
      prePhysics({ elapsed }) {
        seaU.uTime.value = elapsed;
        s.publish(elapsed);
      },
      lateUpdate({ elapsed, dt }) {
        if (!ready || disposed) return;
        s.sync();
        frozen.update(dt);
        const fog = scene.fog as THREE.Fog;
        fogRange.value.set(fog.near, fog.far);
        ocean.update(camera, elapsed, sun);
        s.afterOcean(elapsed);
        quality.update(); // after adaptive-res, normalize once against its actual DPR
        underwater.update(elapsed, dt);
        snow.update(underwater.near.value && waterField.nearby(camera.position).body === 'sea');
      },
      describe: () => ({
        mode: 'new',
        water: choice,
        ready,
        disposed,
        quality: quality.name,
        resolution: quality.resolution,
        underwater: underwater.inspect(),
        sky: frozen.inspect(),
        tone: post.tone(),
        ...s.describe(),
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
        removeChoice();
        post.dispose();
        frozen.dispose();
        underwater.dispose();
        snow.dispose();
        spray.dispose();
        s.dispose();
        quality.dispose();
      },
    });
    waterMesh = ocean.mesh;
    waterRuntime.inspect = () => entity.describe!();
    waterRuntime.dispose = () => despawn(entity);
    // Compile while the frozen sky is baking; the warm-up below awaits this INSIDE its existing deadline.
    const prepared = rendererReady.then(async () => {
      if (disposed || !entity.alive) return;
      await s.prepare();
      await underwater.prepare();
      await post.prepare();
    });
    return { entity, prepared };
  };
  // Ultra builds in this call, exactly as before the seam; a candidate's code loads only when chosen and finishes
  // when its module arrives. CPU resources exist before the loading precompile; GPU work waits for the renderer.
  let built: ReturnType<typeof finish> | null = null;
  const builtReady =
    choice === 'ultra'
      ? Promise.resolve((built = finish(createUltraSurface(context))))
      : import('./water/sun/index.ts').then((m) => {
          built = finish(m.createSunSurface(context, choice === 'sun-depth'));
        });
  waterReady = Promise.all([rendererReady, frozen.ready, builtReady]).then(() => {
    if (disposed || !built?.entity.alive) return;
    surface?.sync();
  });
  warmUp(
    async () => {
      await waterReady;
      if (disposed || !built?.entity.alive) return;
      // Both FFT parities, both readback slots and the wet lens must exist before the first update.
      // computeAsync only waits for renderer.init in r187; compileComputeAsync waits for native pipelines.
      await built.prepared;
      if (disposed || !built.entity.alive) return;
      surface?.start();
      ready = true;
      // main's whole-scene warm-up includes this mesh; a separate queued compile duplicates that work.
    },
    { beforeScene: true },
  );
  warmDraw(() => {
    if (!ready || disposed) return;
    surface?.warmDraw();
  });
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

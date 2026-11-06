// Late morning by default; the opt-in evening proof prepares both skies behind loading.
// Owner calls, 3–5 November: fixed authored sunlight, no runtime cycle.
import * as THREE from 'three/webgpu';
import { cameraPosition, fog, mix, normalize, positionWorld, rangeFogFactor, uniform, uv, vec3, vec4 } from 'three/tsl';
import { FOG_NEAR, FOG_FAR } from '../../constants.ts';
import { skyState } from '../../sim/sky-clock.ts';
import { clouds } from '../props.ts';
import { renderer, rendererReady, scene, sky, sun } from '../scene.ts';
import { atmosphere, skyNow } from '../sky.ts';
import { SUN_DIR } from '../sun-dir.ts';
import { seaU } from './state.ts';
import { createWaterSky } from './sky.ts';
import { bind, tuningEnabled } from './live.ts';
import { eveningPreview, prepareEvening, skyArt, skyCubeSize, toySkyEnabled } from './flags.ts';
import { toySky } from './toy.ts';
import { paintedSky } from './sky-art.ts';
import { bootMark } from '../../boot/timeline.ts';
import { LIGHTING_SPECS, SKY_AUTHORING_SPECS } from '../lighting-tuning.ts';
import { createEveningTransition } from './evening-transition.ts';

const WATER_TOD = 0.24;
export let frozenSkyActive = false;
let flushLighting: (() => void) | undefined;
let prepareLighting: (() => Promise<void>) | undefined;
let inspectSky: (() => unknown) | undefined;
/** Finish queued Local sky preparation without advancing game or shader time. */
export async function prepareFrozenLighting() {
  await prepareLighting?.();
}
/** Local presentation only: no world tick, shader time, sky bake or transition advancement. */
export function flushFrozenLighting() {
  if (!flushLighting) throw new Error('Frozen lighting is not ready');
  flushLighting();
  const hemi = scene.children.find((o) => (o as THREE.HemisphereLight).isHemisphereLight) as THREE.HemisphereLight;
  return {
    key: { intensity: sun.intensity, color: sun.color.toArray(), position: sun.position.toArray() },
    fill: { intensity: hemi.intensity, color: hemi.color.toArray(), ground: hemi.groundColor.toArray() },
    sky: inspectSky?.(),
  };
}
const noon = new THREE.Vector3(0.45, 0.78, 0.32).normalize();
const east = new THREE.Vector3().crossVectors(noon, new THREE.Vector3(0, 1, 0)).normalize();
const angle = skyState(WATER_TOD, 0.5).sunAngle;
const direction = east.clone().multiplyScalar(Math.cos(angle)).addScaledVector(noon, Math.sin(angle));
let timeOfDay = WATER_TOD;
const CAVE = { fog: new THREE.Color('#15120f'), sky: new THREE.Color('#8f806e'), ground: new THREE.Color('#3d342a') };

/** Same early sky slot: reset route fog ranges before crossing/place apply theirs, with the cave transition intact. */
export function updateFrozenDay() {
  const ug = atmosphere.underground;
  const f = scene.fog as THREE.Fog;
  f.near = THREE.MathUtils.lerp(FOG_NEAR, 6, ug);
  f.far = THREE.MathUtils.lerp(FOG_FAR, 80, ug);
  skyNow.frac = timeOfDay;
  skyNow.phase = 0.5;
  skyNow.illum = 1;
  skyNow.day = 1;
  skyNow.keyLight = true;
  skyNow.sunDir.copy(direction);
  SUN_DIR.copy(direction);
}

export function createFrozenWaterSky() {
  frozenSkyActive = true;
  timeOfDay = WATER_TOD;
  direction.copy(east).multiplyScalar(Math.cos(angle)).addScaledVector(noon, Math.sin(angle));
  // Local loading-time comparison only. Today's 1024 sky remains the default until visual review passes.
  const environment = createWaterSky(
    skyArt ? paintedSky(skyArt) : toySkyEnabled ? toySky : undefined,
    skyCubeSize,
    skyArt === 'windpaint' ? 'painted' : 'physical',
  );
  environment.params.cloudBrightness = SKY_AUTHORING_SPECS[0]!.default;
  environment.params.elevation = THREE.MathUtils.radToDeg(Math.asin(direction.y));
  environment.params.azimuth = THREE.MathUtils.radToDeg(Math.atan2(direction.x, direction.z));
  const hemi = scene.children.find((o) => (o as THREE.HemisphereLight).isHemisphereLight) as
    THREE.HemisphereLight | undefined;
  const prior = {
    background: scene.backgroundNode,
    environment: scene.environment,
    environmentIntensity: scene.environmentIntensity,
    fogNode: scene.fogNode,
    skyVisible: sky.visible,
    clouds: new Map(clouds.map((c) => [c, c.visible])),
    sunColor: sun.color.clone(),
    intensity: sun.intensity,
    direction: SUN_DIR.clone(),
    position: sun.position.clone(),
    shadowIntensity: sun.shadow.intensity,
    shadowUpdate: sun.shadow.autoUpdate,
    exposure: renderer.toneMappingExposure,
    hemi: hemi && { color: hemi.color.clone(), ground: hemi.groundColor.clone(), intensity: hemi.intensity },
  };
  const near = uniform(FOG_NEAR),
    far = uniform(FOG_FAR),
    underground = uniform(0);
  const upper = new THREE.Color(),
    lower = new THREE.Color();
  const evening = prepareEvening ? createWaterSky(undefined, skyCubeSize) : undefined;
  let transition: ReturnType<typeof createEveningTransition> | undefined;
  const filtered: THREE.RenderTarget[] = [];
  let selectedEnvironment: THREE.Texture = environment.cube;
  // Owner: retain round-two gains (5 November), select neutral light colour (6 November).
  const lighting = {
    keyGain: LIGHTING_SPECS[0]!.default,
    fillGain: LIGHTING_SPECS[1]!.default,
    keyTint: new THREE.Color(1, 1, 1),
    fillTint: new THREE.Color(1, 1, 1),
    lightColourProfile: SKY_AUTHORING_SPECS[1]!.default,
  };
  // Linear RGB endpoints normalized to preserve each source light's luminance.
  const luma = (c: THREE.Color) => 0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b;
  const colourProfile = (c: THREE.Color) => {
    if (!lighting.lightColourProfile) return;
    const y = luma(c);
    if (lighting.lightColourProfile === 1) c.setRGB(1, 1, 1);
    else c.setRGB(0.9, 0.97, 1.1);
    c.multiplyScalar(y / luma(c));
  };
  if (tuningEnabled) {
    for (const key of ['keyGain', 'fillGain', 'lightColourProfile'] as const)
      bind(
        `sky.${key}`,
        () => lighting[key],
        (value) => {
          lighting[key] = value as number;
        },
      );
    for (const key of ['keyTint', 'fillTint'] as const)
      bind(
        `sky.${key}`,
        () => lighting[key].toArray(),
        (value) => {
          lighting[key].fromArray(value as number[]);
        },
      );
  }
  const haze = mix(
    environment.skyLod(normalize(positionWorld.sub(cameraPosition)), 3),
    vec3(CAVE.fog.r, CAVE.fog.g, CAVE.fog.b),
    underground,
  );
  const fogNode = fog(haze, rangeFogFactor(near, far));
  let disposed = false,
    baked = false;
  let readyMs = 0;
  function update(dt = 0) {
    if (!baked || disposed) return;
    if (dt) transition?.update(dt);
    scene.backgroundNode = environment.background;
    scene.environment = selectedEnvironment;
    scene.environmentIntensity = 1 - atmosphere.underground; // the outdoor cube cannot reflect through cave roofs
    scene.fogNode = fogNode;
    sky.visible = false;
    for (const cloud of clouds) {
      if (!prior.clouds.has(cloud)) prior.clouds.set(cloud, cloud.visible);
      cloud.visible = false;
    }
    SUN_DIR.copy(direction);
    // Preserve the existing moving shadow target and tight frustum, but keep its real light aligned to the baked sun.
    sun.position.copy(direction).multiplyScalar(80).add(sun.target.position);
    const c = environment.sunColor.value,
      r = Math.max(c.x, 1e-4);
    sun.color.setRGB(c.x / r, c.y / r, c.z / r);
    sun.intensity = Math.PI * r;
    sun.color.multiply(lighting.keyTint);
    colourProfile(sun.color);
    sun.intensity *= lighting.keyGain;
    sun.shadow.intensity = 1;
    sun.shadow.autoUpdate = true;
    const ug = atmosphere.underground;
    if (hemi) {
      hemi.color.copy(upper);
      hemi.color.multiply(lighting.fillTint);
      colourProfile(hemi.color);
      hemi.color.lerp(CAVE.sky, ug);
      hemi.groundColor.copy(lower);
      colourProfile(hemi.groundColor);
      hemi.groundColor.lerp(CAVE.ground, ug);
      hemi.intensity = Math.PI * THREE.MathUtils.lerp(1, 0.8, ug);
      hemi.intensity *= THREE.MathUtils.lerp(lighting.fillGain, 1, ug);
    }
    const f = scene.fog as THREE.Fog;
    near.value = f.near;
    far.value = f.far;
    underground.value = ug;
    seaU.uSun.value.copy(direction);
    seaU.uSpecCol.value.setRGB(c.x, c.y, c.z);
    seaU.uLight.value.setRGB(1, 1, 1);
    renderer.toneMappingExposure = 1;
  }
  async function readFill(source: ReturnType<typeof createWaterSky>) {
    // Lambert toy materials need the same cube's coarse irradiance as their hemisphere fill.
    const target = new THREE.RenderTarget(2, 1, { type: THREE.FloatType, depthBuffer: false });
    const material = new THREE.MeshBasicNodeMaterial({ depthTest: false, depthWrite: false });
    material.fragmentNode = vec4(source.ambient(vec3(0, uv().x.lessThan(0.5).select(1, -1), 0)), 1);
    const previous = renderer.getRenderTarget(),
      face = renderer.getActiveCubeFace(),
      mip = renderer.getActiveMipmapLevel();
    try {
      try {
        renderer.setRenderTarget(target);
        new THREE.QuadMesh(material).render(renderer);
      } finally {
        renderer.setRenderTarget(previous, face, mip);
      }
      const pixels = (await renderer.readRenderTargetPixelsAsync(target, 0, 0, 2, 1)) as Float32Array;
      return { upper: new THREE.Color().fromArray(pixels, 0), lower: new THREE.Color().fromArray(pixels, 4) };
    } finally {
      target.dispose();
      material.dispose();
    }
  }
  async function bake() {
    if (disposed) return;
    bootMark('sky-start');
    const started = performance.now();
    environment.bake();
    if (tuningEnabled) direction.copy(environment.sunDirection.value);
    const fill = await readFill(environment);
    readyMs = performance.now() - started;
    if (disposed) return;
    upper.copy(fill.upper);
    lower.copy(fill.lower);
    baked = true;
    flushLighting = update;
    updateFrozenDay();
    update();
    bootMark('sky-ready');
    console.info('WATER FROZEN SKY ' + JSON.stringify({ tod: timeOfDay, readyMs, ...environment.inspect() }));
  }
  async function prepare() {
    if (!evening) return bake();
    if (disposed) return;
    // Research water-times-of-day recommendations 1–4: two prepared endpoints, no live sunset.
    // Both endpoints use the loading-time comparison size; ordinary visits retain 1024.
    evening.bake({ elevation: 12, azimuth: 255, turbidity: 3.2, sunIntensity: 9, cloudCoverage: 0.3 });
    // Both reads own their GPU resources until settled, even if the other read rejects.
    const [dayBake, eveningRead] = await Promise.allSettled([bake(), readFill(evening)]);
    if (dayBake.status === 'rejected') throw dayBake.reason;
    if (eveningRead.status === 'rejected') throw eveningRead.reason;
    const eveningFill = eveningRead.value;
    if (disposed) return;
    const pmrem = new THREE.PMREMGenerator(renderer);
    try {
      filtered.push(pmrem.fromCubemap(environment.cube));
      filtered.push(pmrem.fromCubemap(evening.cube));
    } finally {
      pmrem.dispose();
    }
    const looks = [
      {
        tod: WATER_TOD,
        direction: direction.clone(),
        radiance: environment.sunColor.value.clone(),
        cube: environment.cube,
        texture: filtered[0]!.texture,
        upper: upper.clone(),
        lower: lower.clone(),
      },
      {
        tod: 0.55,
        direction: evening.sunDirection.value,
        radiance: evening.sunColor.value,
        cube: evening.cube,
        texture: filtered[1]!.texture,
        ...eveningFill,
      },
    ];
    const select = (isEvening: boolean) => {
      const look = looks[+isEvening]!;
      timeOfDay = look.tod;
      direction.copy(look.direction);
      environment.selectPrepared(look.cube, direction, look.radiance);
      selectedEnvironment = look.texture;
      upper.copy(look.upper);
      lower.copy(look.lower);
      updateFrozenDay();
    };
    const initial = eveningPreview === '1';
    select(initial);
    transition = createEveningTransition(initial, select);
    update();
  }
  const ready = rendererReady.then(prepare);
  let pending = ready;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let dirtySky = false;
  const flushSky = () => {
    if (timer) clearTimeout(timer);
    timer = undefined;
    if (dirtySky) {
      dirtySky = false;
      pending = pending.then(bake);
    }
    return pending;
  };
  prepareLighting = flushSky;
  inspectSky = environment.inspect;
  const scheduleBake = (change: () => void) => {
    // Authoring rebakes and prepared endpoints must not mutate one another.
    if (evening || skyArt) return;
    change();
    dirtySky = true;
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      timer = undefined;
      void flushSky()
        .then(() => {
          window.dispatchEvent(new CustomEvent('water-tuning-status', { detail: 'Sun & sky rebaked.' }));
        })
        .catch((error: unknown) => {
          window.dispatchEvent(new CustomEvent('water-tuning-status', { detail: `Sky bake failed: ${String(error)}` }));
        });
    }, 250);
  };
  bind(
    'sky.time',
    () => timeOfDay,
    (value) => {
      scheduleBake(() => {
        timeOfDay = value as number;
        const next = skyState(timeOfDay, 0.5).sunAngle;
        const dir = east.clone().multiplyScalar(Math.cos(next)).addScaledVector(noon, Math.sin(next));
        environment.params.elevation = THREE.MathUtils.radToDeg(Math.asin(dir.y));
        environment.params.azimuth = THREE.MathUtils.radToDeg(Math.atan2(dir.x, dir.z));
      });
    },
  );
  for (const key of ['elevation', 'azimuth', 'sunIntensity', 'cloudCoverage', 'turbidity'] as const)
    bind(
      `sky.${key}`,
      () => environment.params[key],
      (value) => {
        scheduleBake(() => {
          environment.params[key] = value as number;
        });
      },
    );
  // Prepared evening endpoints are immutable; an unavailable edit must not claim success.
  if (!evening)
    bind(
      'sky.cloudBrightness',
      () => environment.params.cloudBrightness,
      (value) => {
        if (typeof value !== 'number' || !Number.isFinite(value) || value < 0.6 || value > 1)
          throw new Error('Cloud brightness must be within 0.6–1');
        scheduleBake(() => {
          environment.params.cloudBrightness = value;
        });
      },
    );
  return {
    sky: environment,
    ready,
    update,
    inspect: () => ({
      tod: timeOfDay,
      art: skyArt ?? (toySkyEnabled ? 'toy' : 'current'),
      readyMs,
      ready: baked,
      disposed,
      ...environment.inspect(),
      evening: evening?.inspect(),
      transition: transition?.inspect(),
    }),
    dispose() {
      if (prepareLighting === flushSky) {
        prepareLighting = undefined;
        inspectSky = undefined;
      }
      if (flushLighting === update) flushLighting = undefined;
      if (disposed) return;
      disposed = true;
      transition?.dispose();
      if (timer) clearTimeout(timer);
      frozenSkyActive = false;
      scene.backgroundNode = prior.background;
      scene.environment = prior.environment;
      scene.environmentIntensity = prior.environmentIntensity;
      scene.fogNode = prior.fogNode;
      sky.visible = prior.skyVisible;
      for (const [cloud, visible] of prior.clouds) cloud.visible = visible;
      sun.color.copy(prior.sunColor);
      sun.intensity = prior.intensity;
      sun.position.copy(prior.position);
      sun.shadow.intensity = prior.shadowIntensity;
      sun.shadow.autoUpdate = prior.shadowUpdate;
      SUN_DIR.copy(prior.direction);
      renderer.toneMappingExposure = prior.exposure;
      if (hemi && prior.hemi) {
        hemi.color.copy(prior.hemi.color);
        hemi.groundColor.copy(prior.hemi.ground);
        hemi.intensity = prior.hemi.intensity;
      }
      // A pending readback owns its source textures until it settles; never dispose a GPU resource beneath it.
      void pending
        .finally(() => {
          environment.dispose();
          evening?.dispose();
          for (const target of filtered) target.dispose();
        })
        .catch(() => {});
    },
  };
}

// Summer late morning by default; the opt-in evening proof prepares both skies behind loading.
// Owner calls, 3–5 November: fixed authored sunlight, no runtime cycle.
import * as THREE from 'three/webgpu';
import {
  cameraPosition,
  cubeTexture,
  float,
  fog,
  max,
  mix,
  normalize,
  normalWorldGeometry,
  positionWorld,
  rangeFogFactor,
  smoothstep,
  uniform,
  uv,
  vec3,
  vec4,
} from 'three/tsl';
import { FOG_HEX, FOG_NEAR, FOG_FAR } from '../../constants.ts';
import { skyState } from '../../sim/sky-clock.ts';
import { clouds } from '../props.ts';
import { hemi, renderer, rendererReady, scene, sky, sun } from '../scene.ts';
import { atmosphere, skyNow } from '../sky.ts';
import { SUN_DIR } from '../sun-dir.ts';
import { seaU } from './state.ts';
import { createWaterSky } from './sky.ts';
import { bind, tuningEnabled } from './live.ts';
import { eveningPreview, prepareEvening, SKY_CUBE_SIZE } from './flags.ts';
import { skyGradient, summerSky } from './sky-art.ts';
import { bootMark } from '../../boot/timeline.ts';
import { playMark } from '../../proto/mark.ts';
import { lightingDefault, SKY_AUTHORING_SPECS } from '../lighting-tuning.ts';
import { validValue } from '../../tunables/spec.ts';
import { createEveningTransition } from './evening-transition.ts';

const WATER_TOD = 0.24;
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
/** The summer day's hemisphere fill, read once (10 November, linear) from a healthy bake: the cube's coarsest level up and
 *  down. The light colour profile then keeps only each one's luma. Rebaking the sky from Dev controls does not move it. */
const FILL = { upper: new THREE.Color(0.6045, 2.1113, 5.293), lower: new THREE.Color(0.3665, 0.448, 0.4888) };
// Caves keep their own fog: the ramp they had before the outdoor view grew (110/520 m closing to 6/80 m).
const CAVE_FOG = { near: [110, 6], far: [520, 80] } as const;

/** The one owner of the outdoor fog range: the shared view outside, the cave ramp underground. Runs in the early sky
 *  slot, so a prototype that wants its own range (?proto=crossing tuning, ?greybox=) writes after it. */
export function updateFrozenDay() {
  const ug = atmosphere.underground;
  const f = scene.fog as THREE.Fog;
  f.near = ug > 0 ? THREE.MathUtils.lerp(CAVE_FOG.near[0], CAVE_FOG.near[1], ug) : FOG_NEAR;
  f.far = ug > 0 ? THREE.MathUtils.lerp(CAVE_FOG.far[0], CAVE_FOG.far[1], ug) : FOG_FAR;
  skyNow.frac = timeOfDay;
  skyNow.day = 1;
  skyNow.keyLight = true;
  skyNow.sunDir.copy(direction);
  SUN_DIR.copy(direction);
}

export function createFrozenWaterSky() {
  timeOfDay = WATER_TOD;
  direction.copy(east).multiplyScalar(Math.cos(angle)).addScaledVector(noon, Math.sin(angle));
  // Owner, 6 November: the summer sky is the daytime sky.
  const environment = createWaterSky(summerSky, SKY_CUBE_SIZE);
  environment.params.cloudBrightness = lightingDefault('sky.cloudBrightness');
  environment.params.elevation = THREE.MathUtils.radToDeg(Math.asin(direction.y));
  environment.params.azimuth = THREE.MathUtils.radToDeg(Math.atan2(direction.x, direction.z));
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
    hemi: { color: hemi.color.clone(), ground: hemi.groundColor.clone(), intensity: hemi.intensity },
  };
  // Read at render time, so whatever range the frame ends with is the one drawn (it was copied in the sea's late
  // update, so a later write never reached the picture). Routes keep setting their own ranges on scene.fog.
  const near = uniform(FOG_NEAR).onRenderUpdate(() => (scene.fog as THREE.Fog | null)?.near ?? FOG_NEAR),
    far = uniform(FOG_FAR).onRenderUpdate(() => (scene.fog as THREE.Fog | null)?.far ?? FOG_FAR),
    underground = uniform(0).onRenderUpdate(() => atmosphere.underground),
    skyReady = uniform(0),
    // The haze before the bake (the fog colour), and the fallback's horizon after a failed one (fallBack).
    flatSky = uniform(new THREE.Color(FOG_HEX));
  const upper = new THREE.Color(),
    lower = new THREE.Color();
  const evening = prepareEvening ? createWaterSky(undefined, SKY_CUBE_SIZE) : undefined;
  let transition: ReturnType<typeof createEveningTransition> | undefined;
  const filtered: THREE.RenderTarget[] = [];
  let selectedEnvironment: THREE.Texture = environment.cube;
  // Owner: retain round-two gains (5 November), select neutral light colour (6 November).
  const lighting = {
    keyGain: lightingDefault('sky.keyGain'),
    fillGain: lightingDefault('sky.fillGain'),
    keyTint: new THREE.Color(1, 1, 1),
    fillTint: new THREE.Color(1, 1, 1),
    lightColourProfile: lightingDefault('sky.lightColourProfile'),
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
  // The haze is the baked sky's two colours (sky-art.ts), not a cube read: below the horizon it is the horizon colour.
  const haze = mix(
    flatSky,
    mix(
      skyGradient(max(normalize(positionWorld.sub(cameraPosition)).y, 0)),
      vec3(CAVE.fog.r, CAVE.fog.g, CAVE.fog.b),
      underground,
    ),
    skyReady,
  );
  const fogNode = fog(haze, rangeFogFactor(near, far));
  // Installed now, before anything compiles: a material built against three's fallback fog for scene.fog kept that
  // fog after the bake (seen 6 November: far greybox islets drew as pure haze). The placeholder colour holds until then.
  scene.fogNode = fogNode;
  let disposed = false,
    baked = false,
    flat = false; // no usable bake: the frozen lighting over a flat sky (fallBack)
  // The fallback sky is a healthy summer bake read back on 9 November (linear): sky radiance at the horizon and, averaged
  // over 45-90 degrees, the zenith. The fog colour scaled up instead drew a slate-grey sky through the tone mapping.
  const FLAT = { horizon: new THREE.Color(4.69, 5.97, 7.17) };
  const flatBackground = mix(flatSky, vec3(0.47, 2.0, 5.27), smoothstep(0, 0.5, normalWorldGeometry.y));
  let readyMs = 0;
  function update(dt = 0) {
    if (!baked || disposed) return;
    if (dt) transition?.update(dt);
    scene.backgroundNode = flat ? flatBackground : environment.background;
    scene.environment = flat ? null : selectedEnvironment;
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
    hemi.color.copy(upper);
    hemi.color.multiply(lighting.fillTint);
    colourProfile(hemi.color);
    hemi.color.lerp(CAVE.sky, ug);
    hemi.groundColor.copy(lower);
    colourProfile(hemi.groundColor);
    hemi.groundColor.lerp(CAVE.ground, ug);
    hemi.intensity = Math.PI * THREE.MathUtils.lerp(1, 0.8, ug);
    hemi.intensity *= THREE.MathUtils.lerp(lighting.fillGain, 1, ug);
    seaU.uSun.value.copy(direction);
    seaU.uSpecCol.value.setRGB(c.x, c.y, c.z);

    renderer.toneMappingExposure = 1;
  }
  async function readFill(source: ReturnType<typeof createWaterSky>) {
    // Lambert toy materials need the same cube's coarse irradiance as their hemisphere fill: the cube's last mip, up
    // and down. The last two texels read the sky itself (level 0, what the background draws) at the zenith and the
    // horizon, so a bake that left the cube black is seen here (healthy, below) rather than as a black sky on a phone.
    const target = new THREE.RenderTarget(4, 1, { type: THREE.FloatType, depthBuffer: false });
    const material = new THREE.MeshBasicNodeMaterial({ depthTest: false, depthWrite: false });
    const x = uv().x;
    const probe = cubeTexture(source.cube, x.lessThan(0.75).select(vec3(0, 1, 0), vec3(0.7, 0.1, 0.7))).level(float(0));
    material.fragmentNode = vec4(
      x.lessThan(0.5).select(source.ambient(vec3(0, x.lessThan(0.25).select(1, -1), 0)), probe.rgb),
      1,
    );
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
      const pixels = (await renderer.readRenderTargetPixelsAsync(target, 0, 0, 4, 1)) as Float32Array;
      return {
        upper: new THREE.Color().fromArray(pixels, 0),
        lower: new THREE.Color().fromArray(pixels, 4),
        zenith: luma(new THREE.Color().fromArray(pixels, 8)),
        horizon: luma(new THREE.Color().fromArray(pixels, 12)),
      };
    } finally {
      target.dispose();
      material.dispose();
    }
  }
  // A bake that left the cube black (no error, no lost device: the 9 November iPhone after its reloads, black sky and
  // no sky light) is baked once more, then falls back to the flat placeholder sky and default fill, never black.
  // Each attempt leaves a 'sky baked' mark with what it read back and any GPU error its draws raised.
  const healthy = (f: Awaited<ReturnType<typeof readFill>>) =>
    [luma(f.upper), f.zenith, f.horizon].every((v) => Number.isFinite(v) && v > 1e-4);
  async function bakeChecked(again: boolean) {
    const device = (renderer.backend as unknown as { device?: GPUDevice }).device;
    device?.pushErrorScope('out-of-memory');
    device?.pushErrorScope('validation');
    let thrown: unknown;
    try {
      environment.bake({}, again);
    } catch (error) {
      thrown = error;
    }
    const errors = device ? await Promise.all([device.popErrorScope(), device.popErrorScope()]).catch(() => []) : [];
    if (thrown) throw thrown;
    return errors.find((e) => e)?.message.slice(0, 120) ?? '';
  }
  const mark = (attempt: number, f: Awaited<ReturnType<typeof readFill>>, error: string, ms: number) =>
    playMark('sky baked', {
      attempt,
      ms: Math.round(ms),
      fill: +luma(f.upper).toPrecision(3),
      zenith: +f.zenith.toPrecision(3),
      horizon: +f.horizon.toPrecision(3),
      hidden: document.hidden,
      error,
    });
  async function bake() {
    if (disposed) return;
    bootMark('sky-start');
    const started = performance.now();
    let fill: Awaited<ReturnType<typeof readFill>> | null = null;
    for (let attempt = 1; attempt <= 2 && !disposed; attempt++) {
      const error = await bakeChecked(attempt > 1);
      if (tuningEnabled) direction.copy(environment.sunDirection.value);
      const read = await readFill(environment);
      mark(attempt, read, error, performance.now() - started);
      if (healthy(read)) {
        fill = read;
        break;
      }
    }
    readyMs = performance.now() - started;
    if (disposed) return;
    if (!fill) {
      fallBack();
      bootMark('sky-ready');
      return;
    }
    // The fill is the summer bake's, as constants (FILL); the read-back only proves the cube is not black.
    upper.copy(FILL.upper);
    lower.copy(FILL.lower);
    baked = true;
    flat = false;
    skyReady.value = 1;
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
    // Both endpoints use the one cube size (SKY_CUBE_SIZE, flags.ts).
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
  document.addEventListener('visibilitychange', recheck);
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
    if (evening) return;
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
  const cloudBrightness = SKY_AUTHORING_SPECS.find((spec) => spec.id === 'sky.cloudBrightness')!;
  if (!evening)
    bind(
      'sky.cloudBrightness',
      () => environment.params.cloudBrightness,
      (value) => {
        if (!validValue(cloudBrightness, value)) throw new Error('Cloud brightness must be within 0.6–1');
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
      art: 'summer',
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
      document.removeEventListener('visibilitychange', recheck);
      restorePrior();
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
  /** The look before the bake: the flat placeholder dome, its fog colour and the default sun and fill. */
  function restorePrior() {
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
    hemi.color.copy(prior.hemi.color);
    hemi.groundColor.copy(prior.hemi.ground);
    hemi.intensity = prior.hemi.intensity;
  }
  /** No usable bake: never black. The sun and fill stay the frozen sky's (from constants), over a two-colour sky (FLAT)
   *  with no reflection cube; the haze is the flat horizon colour while skyReady is 0. Restoring the pre-bake look instead was
   *  tried: its placeholder dome is 700 m round the origin, so Far Head stood outside it under a dark clear colour,
   *  lit by the dimmer pre-bake lights. The next return to visible tries the bake again. */
  function fallBack() {
    baked = true;
    flat = true;
    skyReady.value = 0;
    upper.copy(FILL.upper);
    lower.copy(FILL.lower);
    flatSky.value.copy(FLAT.horizon);
    flushLighting = update;
    updateFrozenDay();
    update();
    playMark('sky fallback', { readyMs: Math.round(readyMs), hidden: document.hidden });
  }
  /** Back from hidden: the cube may not have survived (a GPU process restart reports no lost device on every
   *  browser), so read it again and rebake if it went dark; a fallback sky tries the bake again. */
  function recheck() {
    if (document.hidden || !baked || disposed || evening) return;
    pending = pending.then(async () => {
      if (!baked || disposed) return;
      if (!flat) {
        const read = await readFill(environment);
        if (healthy(read)) return;
        mark(0, read, 'dark after visible', 0);
      }
      await bake();
    });
    void pending.catch(() => {});
  }
}

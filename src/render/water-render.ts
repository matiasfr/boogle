import * as THREE from 'three';
import { MeshBasicNodeMaterial } from 'three/webgpu';
import {
  Fn,
  uniformArray,
  texture,
  vec2,
  vec3,
  vec4,
  float,
  mix,
  smoothstep,
  sin,
  cos,
  exp,
  pow,
  max,
  step,
  clamp as tslClamp,
  normalize,
  dot,
  length,
  positionLocal,
  If,
  positionWorld,
  cameraPosition,
} from 'three/tsl';
import { GRID_RES, HALF, CELL, SEA } from '../constants.ts';
import { clamp } from '../math.ts';
import { heights } from '../island/heights.ts';
import { defineKind, spawn, despawn } from '../entity/entity.ts';
import { protoOn } from '../proto/flags.ts';
import { seaU, seaRipples } from './water/state.ts';
import { registerShoreProvider, gridBedAt, createShoreAtlas } from './water/shore-providers.ts';
import { createOcean } from './water/surface.ts';
import { fftWaves } from './water/fft.ts';
import { bakeFoam } from './water/foam.ts';
import { shoreFields } from './water/shore-nodes.ts';
import { createWaterQuality } from './water/quality.ts';
import { createWaterQueries } from './water/queries.ts';
import { waterField } from '../physics/water-field.ts';
import { GRID } from './water/tuning.ts';
import { TSL } from './water/tsl.ts';
import { gameWaterSky } from './sky-radiance.ts';
import { camera, rendererReady, scene, sun } from './scene.ts';
import { precompile } from './precompile.ts';
export { seaU, seaRipples } from './water/state.ts';
export { registerShoreProvider } from './water/shore-providers.ts';

// Temporary ?proto=sky seam. The plain sea builds its original graph; ?proto=water owns its future.
const softHorizon = protoOn('sky');

// Ground height packed into 16 bits (R = high byte, G = low byte), for a smooth shore depth.
const heightTex = (() => {
  const data = new Uint8Array(GRID_RES * GRID_RES * 4);
  for (let j = 0; j < GRID_RES; j++)
    for (let i = 0; i < GRID_RES; i++) {
      const k = (j * GRID_RES + i) * 4;
      const v = Math.round(clamp((heights[i]![j]! + 10) / 20, 0, 1) * 65535);
      data[k] = v >> 8;
      data[k + 1] = v & 255;
      data[k + 3] = 255;
    }
  const t = new THREE.DataTexture(data, GRID_RES, GRID_RES, THREE.RGBAFormat);
  t.magFilter = t.minFilter = THREE.LinearFilter;
  t.needsUpdate = true;
  return t;
})();

// Uniform handles (TSL nodes): the sea's clock is the frame's `elapsed` (splash.ts stamps ripple starts with it), the
// ripple slots are written by src/render/splash.ts, and src/render/sky.ts tints the sea through uLight, uSky and uSpecCol.
const uRip = uniformArray(seaRipples, 'vec4');

// Shader constants were authored as display (sRGB) values; the maths now runs in linear light.
const lin = (r: number, g: number, b: number) => {
  const c = new THREE.Color().setRGB(r, g, b, THREE.SRGBColorSpace);
  return vec3(c.r, c.g, c.b);
};
const SHALLOW = lin(0.42, 0.9, 0.86);
const MID = lin(0.1, 0.7, 0.8);
const DEEP = lin(0.05, 0.38, 0.64);

// The pieces of the sea a prototype's own look reuses through `waterMat` (src/proto/crossing/sea.ts). Call them inside
// an Fn. Water depth at this pixel, from the ground height:
export const seaDepth = () => {
  const w = positionWorld;
  // The height texture's rows follow the grid's j, so v runs the same way as the old shader (no flip).
  const uv = vec2(w.x.add(HALF).div(CELL).add(0.5), float(HALF).sub(w.z).div(CELL).add(0.5)).div(GRID_RES);
  const ht = texture(heightTex, uv); // sampled before anything conditional
  const ground = ht.r
    .mul(255 * 256)
    .add(ht.g.mul(255))
    .div(65535)
    .mul(20)
    .sub(10);
  return max(w.y.sub(ground), 0);
};

// The shore's foam band, from the depth.
export const seaFoam = (depth: ReturnType<typeof seaDepth>) => {
  const t = seaU.uTime;
  const p = positionWorld.xz;
  const band = float(1).sub(smoothstep(0, 0.6, depth));
  const ripple = sin(
    depth
      .mul(10)
      .sub(t.mul(2.4))
      .add(sin(p.x.mul(0.15).add(p.y.mul(0.11))).mul(3)),
  )
    .mul(0.5)
    .add(0.5);
  return band.mul(smoothstep(0.45, 0.85, ripple.mul(0.7).add(band.mul(0.5))));
};
// The expanding rings of the eight ripple slots.
export const seaRings = () => {
  const t = seaU.uTime;
  const p = positionWorld.xz;
  const ring = float(0).toVar();
  for (let i = 0; i < seaRipples.length; i++) {
    const rp = uRip.element(i) as unknown as ReturnType<typeof vec4>; // a vec4 element (three's types say string)
    // Unused slots (strength 0) skip the maths; the branch is on a uniform, so every pixel takes the same path.
    If(rp.w.greaterThan(0), () => {
      const age = t.sub(rp.z);
      const rad = age.mul(rp.w.mul(1.2).add(1.6));
      const rw = age.mul(0.12).add(0.12);
      const x = length(p.sub(rp.xy)).sub(rad).div(rw);
      ring.addAssign(
        exp(x.mul(x).negate())
          .mul(rp.w)
          .mul(exp(age.mul(-1.1)))
          .mul(step(0, age)),
      );
    });
  }
  return ring;
};

const color = Fn(() => {
  const t = seaU.uTime;
  const w = positionWorld;
  const depth = seaDepth();
  const col = mix(SHALLOW, MID, smoothstep(0, 2.5, depth)).toVar();
  col.assign(mix(col, DEEP, smoothstep(2.5, 9, depth)));
  const p = w.xz;
  const n1 = sin(p.x.mul(0.43).add(t.mul(1.2))).mul(cos(p.y.mul(0.37).sub(t.mul(0.9))));
  const n2 = sin(p.x.add(p.y).mul(1.1).sub(t.mul(1.9)));
  const n3 = cos(p.x.sub(p.y).mul(0.8).add(t.mul(1.4)));
  const nrm = normalize(vec3(n1.mul(0.12).add(n2.mul(0.06)), 1, n3.mul(0.06).sub(n1.mul(0.08))));
  const viewDir = normalize(cameraPosition.sub(w));
  const spec = pow(max(dot(nrm, normalize(seaU.uSun.add(viewDir))), 0), 140);
  const fres = pow(float(1).sub(max(viewDir.y, 0)), 4);
  col.assign(mix(col, seaU.uSky, fres.mul(0.45)));
  const foam = seaFoam(depth).toVar();
  const ring = seaRings();
  col.addAssign(vec3(0.25, 0.3, 0.3).mul(ring));
  foam.assign(max(foam, tslClamp(ring, 0, 1)));
  col.assign(mix(col, vec3(1), foam.mul(0.9)));
  col.mulAssign(seaU.uLight as unknown as typeof col); // a color uniform; three's TSL types want a float
  col.addAssign(seaU.uSpecCol.mul(spec).mul(0.9));
  const alpha = max(mix(0.5, 0.97, smoothstep(0.2, 5, depth)), foam.mul(0.95));
  if (softHorizon) {
    // Angular haze softens the low-view join; three's scene fog still hides the distant plane edge.
    const horizon = smoothstep(0, 0.05, viewDir.y).oneMinus();
    return vec4(mix(col, seaU.uHaze, horizon), mix(alpha, 1, horizon));
  }
  return vec4(col, alpha);
});

// The sea plane never moves, so local = world. Three's fog applies on every page, after any prototype haze above.
// Exported so a prototype can give it another look; nothing else in the game touches it.
export const waterMat = new MeshBasicNodeMaterial({ transparent: true, fog: true });
waterMat.positionNode = Fn(() => {
  const p = positionLocal;
  const wave = sin(p.x.mul(0.21).add(seaU.uTime.mul(1.3)))
    .mul(0.06)
    .add(cos(p.z.mul(0.17).sub(seaU.uTime.mul(1.1))).mul(0.06));
  return vec3(p.x, p.y.add(wave), p.z);
})();
waterMat.colorNode = color();

// late 3010, last hook before render, after the presence send (net.ts, 3000): the sea's clock.
defineKind('sea', { prePhysics: -110, lateUpdate: 3010 });

export const newWaterEnabled = new URLSearchParams(location.search).get('water') === 'new' && !protoOn('water');
let waterMesh: THREE.Mesh | null = null;
export const waterRuntime: { inspect(): Record<string, unknown>; dispose(): void } = {
  inspect: () => ({ mode: 'legacy' }),
  dispose() {},
};

function createRealSea() {
  const atlas = createShoreAtlas(),
    source = fftWaves(),
    foam = bakeFoam(),
    quality = createWaterQuality();
  const fogRange = TSL.uniform(new THREE.Vector2(110, 520));
  const ocean = createOcean(source, shoreFields(atlas), foam, {
    sky: gameWaterSky,
    grid: { ...GRID, far: camera.far, outer: Math.min(3000, camera.far * 0.5) },
    fitCameraRange: true,
    fog: (distance) => TSL.smoothstep(fogRange.x, fogRange.y, distance),
  });
  const queries = createWaterQueries(ocean.heightAt, atlas);
  const removeProvider = waterField.install(queries.provider);
  let ready = false,
    disposed = false;
  const previousVisibility = waterMat.visible;
  waterMat.visible = false; // also hides crossing's retained rectangles, without changing their default path
  const entity = spawn({
    kind: 'sea',
    mesh: ocean.mesh,
    prePhysics({ elapsed }) {
      seaU.uTime.value = elapsed;
      queries.publish(elapsed);
    },
    lateUpdate({ elapsed }) {
      if (!ready || disposed) return;
      atlas.sync();
      gameWaterSky.sunColor.value.copy(sun.color).multiplyScalar(sun.intensity);
      const fog = scene.fog as THREE.Fog;
      fogRange.value.set(fog.near, fog.far);
      ocean.update(camera, elapsed, sun);
      queries.dispatch(elapsed);
      quality.update(); // after adaptive-res, normalize once against its actual DPR
    },
    describe: () => ({
      mode: 'new',
      ready,
      disposed,
      fftBands: source.fft.bands,
      quality: quality.name,
      resolution: quality.resolution,
      queries: queries.inspect(),
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
      queries.dispose();
      ocean.dispose();
      source.dispose?.();
      atlas.dispose();
      foam.dispose();
      quality.dispose();
      waterMat.visible = previousVisibility;
    },
  });
  waterRuntime.inspect = () => entity.describe!();
  waterRuntime.dispose = () => despawn(entity);
  // CPU resources exist before the loading precompile. GPU work begins only after the existing renderer is ready.
  void rendererReady.then(() => {
    if (disposed || !entity.alive) return;
    atlas.sync();
    source.update(0);
    ready = true;
    void precompile(ocean.mesh);
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
  if (newWaterEnabled) return (waterMesh = createRealSea());
  const geo = new THREE.PlaneGeometry(1300, 1300, 100, 100); // ~13 m quads; the vertex wave is ~30 m long
  geo.rotateX(-Math.PI / 2);
  const mesh = new THREE.Mesh(geo, waterMat);
  spawn({
    kind: 'sea',
    mesh,
    lateUpdate({ elapsed }) {
      seaU.uTime.value = elapsed;
    },
  });
  return (waterMesh = mesh);
}

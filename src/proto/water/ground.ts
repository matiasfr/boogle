// Ultra Water terrain.js (30ea65e), translated to reusable TSL builders. Local; no island, scene, frame loop or lights
// owned here. Research: docs/research/ultra-water.md, recommendations 4 and 7 (filter detail, share baked resources).
import * as THREE from 'three/webgpu';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { TSL, type N } from './tsl.ts';
import { CAUSTIC_TEXELS_PER_M, type CausticSample } from './caustics.ts';
import { ISLAND_AT } from './tuning.ts';
import { demoSky } from './sky.ts';

const { Fn, If, abs, clamp, cos, cross, dot, exp, float, fwidth, length, max, min, mix, normalize, refract, sign } =
  TSL;
const { sin, smoothstep: ss, texture, texture3D, vec2, vec3, vec4, cameraViewMatrix } = TSL;

// Mean of terrain.js's seabed endpoints with E[n1*n3] ~= 0.25. Linear, not an sRGB hex colour.
export const SEABED_MEAN = new THREE.Color(0.74, 0.685, 0.53);
const CELLS = 32,
  SIZE = 256,
  VCELLS = 16,
  VSIZE = 64;
const fract = (x: number) => x - Math.floor(x);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

// The source's Hoskins hashes, evaluated once on a periodic lattice, not four/eight times per pixel per octave.
function hash(x: number, y: number, z?: number) {
  let a = fract(x * 0.1031),
    b = fract(y * 0.1031),
    c = fract((z ?? x) * 0.1031);
  const d =
    z === undefined
      ? a * (b + 33.33) + b * (c + 33.33) + c * (a + 33.33)
      : a * (c + 31.32) + b * (b + 31.32) + c * (a + 31.32);
  a += d;
  b += d;
  c += d;
  return fract((a + b) * c);
}

let noiseMaps: ReturnType<typeof bakeNoise> | undefined;
function bakeNoise() {
  // RGBA16F: value and analytic x/y slopes of cubic value noise. The slope channels replace the reference's
  // three ripplePhase evaluations (six noises) with two samples, without throwing away the phase-warp gradient.
  const data = new Uint16Array(SIZE * SIZE * 4);
  for (let j = 0; j < SIZE; j++)
    for (let i = 0; i < SIZE; i++) {
      const x = (i * CELLS) / SIZE,
        y = (j * CELLS) / SIZE;
      const ix = Math.floor(x),
        iy = Math.floor(y),
        fx = fract(x),
        fy = fract(y);
      const u = fx * fx * (3 - 2 * fx),
        v = fy * fy * (3 - 2 * fy);
      const a = hash(ix, iy),
        b = hash((ix + 1) % CELLS, iy);
      const c = hash(ix, (iy + 1) % CELLS),
        d = hash((ix + 1) % CELLS, (iy + 1) % CELLS);
      const k = (j * SIZE + i) * 4;
      const values = [
        lerp(lerp(a, b, u), lerp(c, d, u), v),
        lerp(b - a, d - c, v) * 6 * fx * (1 - fx),
        lerp(c - a, d - b, u) * 6 * fy * (1 - fy),
        1,
      ];
      for (let n = 0; n < 4; n++) data[k + n] = THREE.DataUtils.toHalfFloat(values[n]!);
    }
  const plane = new THREE.DataTexture(data, SIZE, SIZE, THREE.RGBAFormat, THREE.HalfFloatType);
  plane.wrapS = plane.wrapT = THREE.RepeatWrapping;
  plane.minFilter = THREE.LinearMipmapLinearFilter;
  plane.magFilter = THREE.LinearFilter;
  plane.generateMipmaps = true;
  plane.needsUpdate = true;
  // True volume noise: no world-xz streaks down steep rock faces, and one sample instead of triplanar's three.
  const volumeData = new Uint8Array(VSIZE ** 3);
  for (let k = 0; k < VSIZE; k++)
    for (let j = 0; j < VSIZE; j++)
      for (let i = 0; i < VSIZE; i++) {
        const x = (i * VCELLS) / VSIZE,
          y = (j * VCELLS) / VSIZE,
          z = (k * VCELLS) / VSIZE;
        const ix = Math.floor(x),
          iy = Math.floor(y),
          iz = Math.floor(z);
        const f = [fract(x), fract(y), fract(z)].map((t) => t * t * (3 - 2 * t));
        const h = (dx: number, dy: number, dz: number) =>
          hash((ix + dx) % VCELLS, (iy + dy) % VCELLS, (iz + dz) % VCELLS);
        const slice = (dz: number) =>
          lerp(lerp(h(0, 0, dz), h(1, 0, dz), f[0]!), lerp(h(0, 1, dz), h(1, 1, dz), f[0]!), f[1]!);
        volumeData[(k * VSIZE + j) * VSIZE + i] = Math.round(lerp(slice(0), slice(1), f[2]!) * 255);
      }
  const volume = new THREE.Data3DTexture(volumeData, VSIZE, VSIZE, VSIZE);
  volume.format = THREE.RedFormat;
  volume.wrapS = volume.wrapT = volume.wrapR = THREE.RepeatWrapping;
  volume.minFilter = volume.magFilter = THREE.LinearFilter;
  volume.needsUpdate = true;
  return { plane, volume };
}

/** Shared baked noise. Call filtered() only in uniform flow; ripple() uses explicit LOD inside footprint branches. */
export function groundNoise() {
  const maps = (noiseMaps ??= bakeNoise());
  const uv = (p: N) => p.div(CELLS).add(0.5 / SIZE);
  return {
    filtered: (p: N) => texture(maps.plane, uv(p)).r,
    ripple: (p: N) => texture(maps.plane, uv(p)).level(0).rgb,
    volume: (p: N) => texture3D(maps.volume, p.div(VCELLS).add(0.5 / VSIZE)).level(0).r,
  };
}
type Noise = ReturnType<typeof groundNoise>;

/** Also the exact pre-wet bed albedo the ocean's analytic bed reconstruction would need, at its bed-hit position. */
export const seabedAlbedo = (n1: N, n3: N) => mix(vec3(0.78, 0.72, 0.56), vec3(0.62, 0.58, 0.44), n1.mul(n3));

/** Sun/sky absorbed through the water column: sun along its refracted path, sky approximated by vertical depth. */
export function bedTransmission(p: N, sunDirection: N, absorption: N) {
  const depth = max(p.y.negate(), 0);
  const rsun = refract(sunDirection.negate(), vec3(0, 1, 0), 1 / 1.33);
  const path = depth.div(max(rsun.y.negate(), 0.1));
  return exp(absorption.negate().mul(path.mul(0.6).add(depth.mul(0.4))));
}

// The source's sharp crests/broad troughs: h = amp * (sin phase - 0.25 cos 2phase). The baked derivative is
// analytic (the source forward-differences by 0.01 m). Direction is held fixed during differentiation, as there.
function rippleSlope(p: N, d: N, w: number, s: number, a: number, amp: N, noise: Noise) {
  const n = noise.ripple(p.mul(s)).toVar(),
    m = noise.ripple(p.mul(s * 0.27).add(4)).toVar();
  const phase = dot(p, d)
    .add(n.x.sub(0.5).mul(a))
    .add(m.x.sub(0.5).mul(a * 3))
    .mul(w);
  const grad = d
    .add(n.yz.mul(s * a))
    .add(m.yz.mul(s * 0.27 * a * 3))
    .mul(w);
  return grad.mul(amp).mul(cos(phase).add(sin(phase.mul(2)).mul(0.5)));
}

/** World-space sand normals, returned in view space for normalNode. All derivatives precede divergent Ifs. */
export function sandNormal(p: N, normal: N, sandLine: N, noise: Noise) {
  return Fn(() => {
    const fw = fwidth(p.xz).toVar(),
      px = max(fw.x, fw.y).toVar();
    const g = vec2(0).toVar();
    If(px.lessThan(0.5), () => {
      const d = normalize(
        vec2(0.8, 0.6).add(vec2(noise.ripple(p.xz.mul(0.02)).x, noise.ripple(p.xz.mul(0.02).add(5)).x).sub(0.5)),
      ).toVar();
      const a1 = ss(0.25, 0.75, noise.ripple(p.xz.mul(0.06).add(11)).x)
        .mul(0.7)
        .add(0.3)
        .mul(0.02);
      g.assign(rippleSlope(p.xz, d, 3.9, 0.35, 0.8, a1, noise).mul(ss(0.15, 0.5, px).oneMinus()));
      If(px.lessThan(0.09), () => {
        const a2 = ss(0.25, 0.75, noise.ripple(p.xz.mul(0.15).add(3)).x)
          .mul(0.7)
          .add(0.3)
          .mul(0.002);
        const d2 = normalize(d.add(vec2(d.y.negate(), d.x).mul(0.3)));
        g.addAssign(rippleSlope(p.xz, d2, 21, 2.2, 0.1, a2, noise).mul(ss(0.03, 0.09, px).oneMinus()));
      });
    });
    const mask = ss(sandLine.sub(0.5), sandLine.add(0.5), p.y)
      .oneMinus()
      .mul(ss(0.85, 0.95, normal.y))
      .mul(mix(1, 0.25, ss(-0.3, 0.6, p.y))); // faint wind ripples on dry sand
    return cameraViewMatrix.mul(vec4(normalize(normal.sub(vec3(g.x, 0, g.y).mul(mask))), 0)).xyz.normalize();
  })();
}

/** Screen-derivative bump on steep faces. No derivative (including bh's) is inside a data-dependent branch. */
export function rockNormal(p: N, normal: N, r2: N, noise: Noise) {
  return Fn(() => {
    const px = length(fwidth(p));
    const bh = noise
      .volume(p.mul(1.6))
      .mul(0.6)
      .add(r2.mul(0.25))
      .add(
        noise
          .volume(p.mul(9))
          .mul(0.15)
          .mul(ss(0.03, 0.12, px).oneMinus()),
      )
      .toVar();
    const dx = p.dFdx(),
      dy = p.dFdy(),
      r1 = cross(dy, normal),
      r = cross(normal, dx);
    const det = dot(dx, r1);
    const grad = r1.mul(bh.dFdx()).add(r.mul(bh.dFdy())).mul(sign(det)).toVar();
    // Materialize before select: TSL lowers select to If and otherwise pulls these derivatives into that branch.
    const bumped = normal.mul(abs(det)).sub(grad.mul(0.3)).toVar();
    // Degenerate screen triangles must not normalize zero.
    const n = TSL.select(abs(det).greaterThan(1e-12), normalize(bumped), normal);
    return cameraViewMatrix.mul(vec4(n, 0)).xyz.normalize();
  })();
}

export type GroundInputs = {
  position: N;
  normal: N;
  time: N;
  sunDirection: N;
  absorption: N;
  swash: (xz: N, height: N) => N;
  caustics?: CausticSample;
  rock?: boolean;
};

// The source modifies the standard material's direct-sun loop and directDiffuse accumulator. Native TSL's lighting
// model is that extension point: keep the standard BRDF, ambient and specular, refract sunlight below the water and
// apply the area-ratio map only to the direct diffuse contribution (multiplying albedo would also brighten the sky).
class GroundLightingModel extends THREE.PhysicalLightingModel {
  position: N;
  sunDirection: N;
  caustics?: CausticSample;

  constructor(position: N, sunDirection: N, caustics?: CausticSample) {
    super();
    this.position = position;
    this.sunDirection = sunDirection;
    this.caustics = caustics;
  }

  override direct(input: Parameters<THREE.PhysicalLightingModel['direct']>[0], builder: THREE.NodeBuilder) {
    const p = this.position,
      sun = this.sunDirection;
    const under = ss(-0.25, 0.05, p.y).oneMinus().toVar();
    const rsun = refract(sun.negate(), vec3(0, 1, 0), 1 / 1.33).toVar();
    const refracted = cameraViewMatrix.mul(vec4(rsun.negate(), 0)).xyz;
    const ft = max(sun.y, 0).oneMinus().pow(5).mul(0.98).add(0.02);
    const before = vec3(input.reflectedLight.directDiffuse).toVar();
    super.direct(
      {
        ...input,
        lightDirection: normalize(mix(input.lightDirection, refracted, under)),
        lightColor: vec3(input.lightColor).mul(ft.mul(under).oneMinus()),
      },
      builder,
    );
    if (this.caustics) {
      const depth = max(p.y.negate(), 0).toVar();
      const entry = p.xz.add(rsun.xz.div(min(rsun.y, -0.05)).mul(depth)).toVar();
      const fw = fwidth(entry).toVar();
      const lod = TSL.log2(max(max(fw.x, fw.y).mul(CAUSTIC_TEXELS_PER_M), 1));
      const c = this.caustics(entry, depth, lod).toVar();
      const strength = mix(1.35, 1, ss(1.5, 3, depth)).mul(ss(0, 0.3, depth));
      const multiplier = max(mix(1, c, strength), 0);
      const diffuse = input.reflectedLight.directDiffuse as N;
      diffuse.assign(before.add(diffuse.sub(before).mul(multiplier)));
    }
  }
}

/** Slots for a MeshStandardNodeMaterial; normal is geometric WORLD normal (flat or smooth), never normalWorld. */
export function groundNodes({
  position: world,
  normal,
  time,
  sunDirection,
  absorption,
  swash,
  caustics,
  rock = false,
}: GroundInputs) {
  // The prototype lives 2.4 km from home, but the source's procedural landscape is centred at the origin.
  // Keep its noise and refracted caustic entry points in source coordinates; swash and shadows use world coordinates.
  const p = world.sub(vec3(ISLAND_AT.x, 0, ISLAND_AT.z));
  const noise = groundNoise();
  const n1 = noise.filtered(p.xz.mul(0.08)).toVar();
  const n2 = rock ? float(0) : noise.filtered(p.xz.mul(0.6)).toVar();
  const n3 = rock ? float(0) : noise.filtered(p.xz.mul(0.013)).toVar();
  const r1 = rock ? noise.volume(p.mul(0.9)).toVar() : float(0);
  const r2 = rock ? noise.volume(p.mul(3.7).add(7)).toVar() : float(0);
  const sandLine = n3.mul(1.6).add(n1.mul(0.8)).add(2.4);
  const flat = clamp(normal.y, 0, 1);
  // Shared vec4 gives colour and roughness one swash evaluation, rather than recomputing its maps/noise per slot.
  const surface = Fn(() => {
    const albedo = vec3(0).toVar();
    if (rock) {
      const strata = sin(p.y.mul(2.2).add(r1.mul(3)))
        .mul(0.5)
        .add(0.5);
      albedo.assign(
        mix(vec3(0.27, 0.25, 0.23), vec3(0.52, 0.47, 0.41), r1.mul(0.6).add(strata.mul(0.25)).add(r2.mul(0.15))),
      );
      const tide = ss(0.4, r1.mul(0.6).add(1.3), p.y)
        .oneMinus()
        .mul(ss(-3, -0.8, p.y));
      albedo.assign(mix(albedo, vec3(0.1, 0.11, 0.07).mul(r2.mul(0.6).add(0.7)), tide.mul(0.8)));
      const salt = ss(0.7, 0.92, flat)
        .mul(ss(1, 2, p.y))
        .mul(ss(0.55, 0.8, r2))
        .mul(0.55);
      albedo.assign(mix(albedo, vec3(0.8, 0.78, 0.72), salt));
    } else {
      const sand = mix(vec3(0.8, 0.71, 0.53), vec3(0.72, 0.62, 0.45), n1).mul(n2.mul(0.16).add(0.92));
      const grass = mix(vec3(0.2, 0.3, 0.1), vec3(0.33, 0.37, 0.15), n1).mul(n2.mul(0.3).add(0.85));
      const stone = mix(vec3(0.33, 0.31, 0.29), vec3(0.45, 0.41, 0.36), n2).mul(n3.mul(0.4).add(0.8));
      albedo.assign(mix(seabedAlbedo(n1, n3), sand, ss(-0.05, 0.05, p.y)));
      albedo.assign(mix(albedo, grass, ss(sandLine, sandLine.add(1.5), p.y).mul(ss(0.62, 0.8, flat))));
      albedo.assign(
        mix(
          albedo,
          stone,
          ss(0.62, 0.78, flat)
            .oneMinus()
            .mul(ss(-6, 1, p.y)),
        ),
      );
      albedo.assign(mix(albedo, stone.mul(1.1), ss(38, 52, p.y.add(n1.mul(8)))));
    }
    // Compute derivatives/implicit samples uniformly, before swash's branches. Lace averages away below a pixel.
    const fw = fwidth(p.xz).toVar();
    const bubbles = noise
      .filtered(p.xz.mul(3.1).add(time.mul(0.15)))
      .mul(0.6)
      .add(noise.filtered(p.xz.mul(7.3)).mul(0.4))
      .toVar();
    const sw = swash(world.xz, world.y).toVar();
    const wet = max(ss(0.35, n1.mul(0.5).add(1.3), p.y).oneMinus(), sw.z);
    // Light bounces inside wet grains: compounded tint (~albedo squared), not cold grey. Underwater stays flatter.
    albedo.mulAssign(mix(vec3(1), mix(albedo.mul(0.8).add(0.06), vec3(0.6), ss(-0.8, 0, p.y).oneMinus()), wet));
    const film = ss(0, 0.004, sw.x).mul(ss(-0.05, 0.05, p.y)); // sheen from the first millimetres
    albedo.mulAssign(mix(vec3(1), vec3(0.9, 0.97, 0.97), ss(0, 0.06, sw.x).mul(film))); // little absorption in cm of film
    const lace = mix(
      ss(float(0.75).sub(sw.y.mul(0.4)), float(0.92).sub(sw.y.mul(0.3)), bubbles),
      0.3,
      ss(0.05, 0.3, max(fw.x, fw.y)),
    );
    albedo.assign(mix(albedo, albedo.mul(0.4).add(vec3(0.42, 0.41, 0.38)), min(sw.y.mul(1.4), 1).mul(lace).mul(0.7)));
    if (rock) albedo.mulAssign(TSL.vertexColor().rgb); // baked cavities; material.vertexColors stays false to avoid doubling
    albedo.mulAssign(bedTransmission(p, sunDirection, absorption));
    const rough = mix(mix(rock ? 0.85 : 0.92, 0.32, wet.mul(ss(-0.05, 0.05, p.y))), 0.2, film);
    return vec4(albedo, rough);
  })().toVar();
  return {
    fog: false,
    envMapIntensity: 0.9,
    colorNode: surface.rgb,
    roughnessNode: surface.a,
    normalNode: rock ? rockNormal(p, normal, r2, noise) : sandNormal(p, normal, sandLine, noise),
    receivedShadowPositionNode: Fn(() => {
      const under = ss(-0.25, 0.05, p.y).oneMinus();
      const rsun = refract(sunDirection.negate(), vec3(0, 1, 0), 1 / 1.33);
      const entry = world.xz.sub(rsun.xz.div(min(rsun.y, -0.05)).mul(world.y));
      return TSL.select(
        under.greaterThan(0.5).and(rsun.y.lessThan(-0.05)),
        vec3(entry.x, 0.05, entry.y),
        world.add(normal.mul(0.04)),
      );
    })(),
    setupLightingModel: () => new GroundLightingModel(p, sunDirection, caustics),
    outputNode: Fn(() => {
      const toPoint = world.sub(TSL.cameraPosition).toVar();
      const fogAmount = exp(length(toPoint).mul(-1 / 18000)).oneMinus();
      const fogColor = demoSky.skyLod(normalize(toPoint), 3);
      return vec4(mix(TSL.output.rgb, fogColor, fogAmount), TSL.output.a);
    })(),
  };
}

/** Source geometry, including its CPU-only cracks, bedding and cavity colour. Supply a pure signed fBm helper. */
export function rockGeometry(fbm: (x: number, z: number, octaves: number, seed: number) => number) {
  const ico = new THREE.IcosahedronGeometry(1, 4);
  ico.deleteAttribute('normal');
  ico.deleteAttribute('uv');
  const g = mergeVertices(ico);
  ico.dispose();
  const p = g.getAttribute('position'),
    v = new THREE.Vector3();
  const ao = new Float32Array(p.count * 3);
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    const n = fbm(v.x * 1.4 + 3, v.z * 1.4 + v.y * 0.7, 5, 21);
    const facet = Math.abs(fbm(v.x * 3.1, v.y * 3.1 + v.z, 3, 5));
    const crack = Math.abs(fbm(v.x * 5.7 + v.z * 1.9, v.y * 5.7 - v.z * 1.3, 2, 9));
    const d = 1 + 0.38 * n - 0.12 * facet - (0.06 * Math.max(0.12 - crack, 0)) / 0.12;
    v.multiplyScalar(d);
    v.y -= (0.7 * Math.sin(v.y * 8 * Math.PI)) / (8 * Math.PI); // a hint of bedding
    if (v.y < -0.2) v.y = -0.2 + (v.y + 0.2) * 0.4; // flattish base
    p.setXYZ(i, v.x, v.y, v.z);
    const c = Math.min(Math.max(0.78 + 0.9 * (d - 1), 0.42), 1) * (0.65 + 0.35 * Math.min(crack / 0.12, 1));
    ao.fill(c, i * 3, i * 3 + 3);
  }
  g.setAttribute('color', new THREE.BufferAttribute(ao, 3));
  g.computeVertexNormals();
  return g;
}

export type GroundRock = { x: number; z: number; r: number };

/** Two nearest influences in radius units, baked once. World-space records and a caller-supplied tile origin. */
export function rockMaps(rocks: GroundRock[], origin: { x: number; z: number }, extent: number, size = 512) {
  const data = new Float32Array(Math.max(1, rocks.length) * 4);
  rocks.forEach((r, i) => data.set([r.x, r.z, r.r, 0], i * 4));
  const indices = new Float32Array(size * size * 2).fill(-1),
    texel = extent / size;
  rocks.forEach((r, id) => {
    const reach = 4.5 * r.r + 2 + texel;
    const i0 = Math.max(0, Math.floor((r.x - origin.x - reach) / texel + size / 2));
    const i1 = Math.min(size - 1, Math.ceil((r.x - origin.x + reach) / texel + size / 2));
    const j0 = Math.max(0, Math.floor((r.z - origin.z - reach) / texel + size / 2));
    const j1 = Math.min(size - 1, Math.ceil((r.z - origin.z + reach) / texel + size / 2));
    for (let j = j0; j <= j1; j++)
      for (let i = i0; i <= i1; i++) {
        const x = origin.x + (i + 0.5 - size / 2) * texel,
          z = origin.z + (j + 0.5 - size / 2) * texel;
        const d = Math.hypot(x - r.x, z - r.z);
        if (d > reach) continue;
        const k = (j * size + i) * 2,
          q = d / r.r;
        const rank = (slot: number) => {
          const other = rocks[indices[k + slot]!];
          return other ? Math.hypot(x - other.x, z - other.z) / other.r : Infinity;
        };
        if (q < rank(0)) {
          indices[k + 1] = indices[k]!;
          indices[k] = id;
        } else if (q < rank(1)) indices[k + 1] = id;
      }
  });
  const idx = new THREE.DataTexture(indices, size, size, THREE.RGFormat, THREE.FloatType);
  const records = new THREE.DataTexture(data, Math.max(1, rocks.length), 1, THREE.RGBAFormat, THREE.FloatType);
  for (const t of [idx, records]) {
    t.minFilter = t.magFilter = THREE.NearestFilter;
    t.needsUpdate = true;
  }
  // All samples are explicit LOD: this callback is used inside swash's near-shore branch.
  const influence = (xz: N, dir: N) =>
    Fn(() => {
      const uv = xz.sub(vec2(origin.x, origin.z)).div(extent).add(0.5);
      const ids = texture(idx, uv).level(0).rg.toVar(),
        out = vec2(0).toVar();
      If(
        uv.x.greaterThanEqual(0).and(uv.x.lessThanEqual(1)).and(uv.y.greaterThanEqual(0)).and(uv.y.lessThanEqual(1)),
        () => {
          for (const id of [ids.x, ids.y])
            If(id.greaterThanEqual(0), () => {
              const rk = texture(records, vec2(id.add(0.5).div(Math.max(1, rocks.length)), 0.5))
                .level(0)
                .toVar();
              const d = xz.sub(rk.xy),
                r = rk.z,
                l = length(d),
                along = dot(d, dir);
              const across = abs(dir.x.mul(d.y).sub(dir.y.mul(d.x)));
              // Fronts bend round both sides, closing again a few radii behind the rock.
              const lee = ss(r.mul(0.45), r, across.add(along.mul(0.28)))
                .oneMinus()
                .mul(ss(r.mul(-0.3), r.mul(0.4), along));
              const face = ss(-0.25, 0.55, along.negate().div(max(l, 1e-3))).mul(
                ss(0, r.mul(0.2).add(0.6), l.sub(r)).oneMinus(),
              );
              out.assign(max(out, vec2(lee, face)));
            });
        },
      );
      return out;
    })();
  return {
    influence,
    dispose: () => {
      idx.dispose();
      records.dispose();
    },
  };
}

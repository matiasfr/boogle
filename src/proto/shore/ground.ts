// Ultra Water terrain.js (30ea65e), translated to reusable TSL builders. Local; no island, scene, frame loop or lights
// owned here. Research: docs/research/ultra-water.md, recommendations 4 and 7 (filter detail, share baked resources).
import * as THREE from 'three/webgpu';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { TSL, type N } from '../../render/water/tsl.ts';

const { Fn, If, abs, cos, cross, dot, float, fwidth, length, max, mix, normalize, sign } = TSL;
const { sin, smoothstep: ss, texture, texture3D, vec2, vec3, vec4, cameraViewMatrix } = TSL;

export const fineTerrain = TSL.uniform(new URLSearchParams(location.search).get('waterTerrain') !== 'cheap');
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
      If(fineTerrain.and(px.lessThan(0.09)), () => {
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
    const fine = float(0).toVar();
    If(fineTerrain, () => {
      fine.assign(
        noise
          .volume(p.mul(9))
          .mul(0.15)
          .mul(ss(0.03, 0.12, px).oneMinus()),
      );
    });
    const bh = noise.volume(p.mul(1.6)).mul(0.6).add(r2.mul(0.25)).add(fine).toVar();
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

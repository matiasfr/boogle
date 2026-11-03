// The shore field: Ultra Water's shoreMap.js in TypeScript, on the CPU, once. Bakes (bed height, signed coast distance,
// its gradient) into one texture, and into two more the eikonal wave field: travel time from the coast, propagation
// direction, shoaling, and how much of a breaker survives the bars it crossed. Same maths and constants as the demo; the
// textures are half floats rather than RGBA32F, so they filter without the float32-filterable feature. Local.
import * as THREE from 'three/webgpu';

const INF = 1e20;

function edt1d(f: Float64Array, n: number, d: Float64Array, v: Int32Array, z: Float64Array) {
  let k = 0;
  v[0] = 0;
  z[0] = -INF;
  z[1] = INF;
  for (let q = 1; q < n; q++) {
    let s = (f[q]! + q * q - (f[v[k]!]! + v[k]! * v[k]!)) / (2 * q - 2 * v[k]!);
    while (s <= z[k]!) {
      k--;
      s = (f[q]! + q * q - (f[v[k]!]! + v[k]! * v[k]!)) / (2 * q - 2 * v[k]!);
    }
    k++;
    v[k] = q;
    z[k] = s;
    z[k + 1] = INF;
  }
  k = 0;
  for (let q = 0; q < n; q++) {
    while (z[k + 1]! < q) k++;
    d[q] = (q - v[k]!) * (q - v[k]!) + f[v[k]!]!;
  }
}

// Squared distance (texels) from every texel to the nearest texel where mask is set.
function edt2d(mask: Uint8Array, size: number) {
  const out = new Float64Array(size * size);
  for (let i = 0; i < out.length; i++) out[i] = mask[i] ? 0 : INF;
  const f = new Float64Array(size),
    d = new Float64Array(size),
    v = new Int32Array(size),
    z = new Float64Array(size + 1);
  for (let x = 0; x < size; x++) {
    for (let y = 0; y < size; y++) f[y] = out[y * size + x]!;
    edt1d(f, size, d, v, z);
    for (let y = 0; y < size; y++) out[y * size + x] = d[y]!;
  }
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) f[x] = out[y * size + x]!;
    edt1d(f, size, d, v, z);
    for (let x = 0; x < size; x++) out[y * size + x] = d[x]!;
  }
  return out;
}

const clampi = (x: number, hi: number) => (x < 0 ? 0 : x > hi ? hi : x);

// Separable box blur, clamp-to-edge, running sums.
function boxBlur(src: Float32Array, size: number, r: number) {
  const tmp = new Float32Array(src.length),
    dst = new Float32Array(src.length),
    w = 2 * r + 1,
    hi = size - 1;
  for (let y = 0; y < size; y++) {
    const o = y * size;
    let s = 0;
    for (let i = -r; i <= r; i++) s += src[o + clampi(i, hi)]!;
    for (let x = 0; x < size; x++) {
      tmp[o + x] = s / w;
      s += src[o + clampi(x + r + 1, hi)]! - src[o + clampi(x - r, hi)]!;
    }
  }
  for (let x = 0; x < size; x++) {
    let s = 0;
    for (let i = -r; i <= r; i++) s += tmp[clampi(i, hi) * size + x]!;
    for (let y = 0; y < size; y++) {
      dst[y * size + x] = s / w;
      s += tmp[clampi(y + r + 1, hi) * size + x]! - tmp[clampi(y - r, hi) * size + x]!;
    }
  }
  return dst;
}

/** A half-float texture from floats, clamped at the edge and filtered. */
function halfTex(data: Float32Array, size: number, format: THREE.PixelFormat) {
  const half = new Uint16Array(data.length);
  for (let i = 0; i < data.length; i++)
    half[i] = THREE.DataUtils.toHalfFloat(Math.max(-65000, Math.min(65000, data[i]!)));
  const tex = new THREE.DataTexture(half, size, size, format, THREE.HalfFloatType);
  tex.minFilter = tex.magFilter = THREE.LinearFilter;
  tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.needsUpdate = true;
  return tex;
}

// ---------------------------------------------------------------- the wave travel-time field
// tau = seconds a shallow-water front needs from the coastline to here: eikonal |grad tau| = 1/c, c = sqrt(g clamp(depth)),
// solved unsigned on both sides of the coast by fast sweeping (first-order Godunov, Gauss-Seidel in 4 orders), negated on
// land, so tau stays smooth across the waterline. Seeded at sub-texel accuracy from where the bilinear height crosses 0.
const GRAV = 9.81,
  DMIN = 0.3,
  DMAX = 14;
const ISLET = 64; // land blobs smaller than this (texels) don't seed fronts
const RAY_L = 50,
  RAY_STEP = 3,
  RAY_BAND = 300; // ray-tube window (m), march step (texels), offshore band (m)
const KAPPA_MAX = 1 / 25; // front curvature clamp, 1/m

// The sea mask with small islets flooded: seeding them would ring them with bullseye crests.
function wetMask(sea: Uint8Array, size: number) {
  const n = size * size,
    wet = sea.slice(),
    seen = new Uint8Array(n),
    stack = new Int32Array(n),
    comp = new Int32Array(n);
  for (let s = 0; s < n; s++) {
    if (sea[s] || seen[s]) continue;
    let top = 0,
      cnt = 0;
    stack[top++] = s;
    seen[s] = 1;
    while (top > 0) {
      const k = stack[--top]!,
        i = k % size;
      comp[cnt++] = k;
      if (i > 0 && !sea[k - 1] && !seen[k - 1]) {
        seen[k - 1] = 1;
        stack[top++] = k - 1;
      }
      if (i < size - 1 && !sea[k + 1] && !seen[k + 1]) {
        seen[k + 1] = 1;
        stack[top++] = k + 1;
      }
      if (k >= size && !sea[k - size] && !seen[k - size]) {
        seen[k - size] = 1;
        stack[top++] = k - size;
      }
      if (k < n - size && !sea[k + size] && !seen[k + size]) {
        seen[k + size] = 1;
        stack[top++] = k + size;
      }
    }
    if (cnt < ISLET) for (let q = 0; q < cnt; q++) wet[comp[q]!] = 1;
  }
  return wet;
}

function speeds(height: Float32Array, c: Float32Array, slow: Float64Array, texel: number) {
  for (let k = 0; k < c.length; k++) {
    c[k] = Math.sqrt(GRAV * Math.min(DMAX, Math.max(DMIN, -height[k]!)));
    slow[k] = texel / c[k]!;
  }
}

// T and open are padded by a 1-texel border, so the sweep stencil needs no edge tests. Seeds are fixed (open = 2); open = 1
// marks cells to recompute, 0 settled ones.
function seed(
  T: Float64Array,
  open: Uint8Array,
  height: Float32Array,
  wet: Uint8Array,
  slow: Float64Array,
  size: number,
) {
  const W = size + 2;
  open.fill(2);
  for (let j = 0; j < size; j++) open.fill(1, (j + 1) * W + 1, (j + 1) * W + 1 + size);
  for (let j = 0; j < size; j++)
    for (let i = 0; i < size; i++) {
      const k = j * size + i,
        w = wet[k],
        h = height[k]!;
      let dx = Infinity,
        dy = Infinity;
      if (i > 0 && wet[k - 1] !== w) dx = h / (h - height[k - 1]!);
      if (i < size - 1 && wet[k + 1] !== w) dx = Math.min(dx, h / (h - height[k + 1]!));
      if (j > 0 && wet[k - size] !== w) dy = h / (h - height[k - size]!);
      if (j < size - 1 && wet[k + size] !== w) dy = Math.min(dy, h / (h - height[k + size]!));
      if (dx === Infinity && dy === Infinity) continue;
      const d = dx === Infinity ? dy : dy === Infinity ? dx : (dx * dy) / (Math.sqrt(dx * dx + dy * dy) || 1);
      const p = k + 2 * j + W + 1;
      T[p] = d * slow[k]!;
      open[p] = 2;
    }
}

// One Gauss-Seidel pass in sweep order (di, dj). Only open cells are recomputed; a change reopens the 4 neighbours.
function pass(T: Float64Array, open: Uint8Array, slow: Float64Array, size: number, di: number, dj: number) {
  const W = size + 2;
  let changed = 0;
  for (let jj = 0, j = dj > 0 ? 0 : size - 1; jj < size; jj++, j += dj) {
    for (let ii = 0, i = di > 0 ? 0 : size - 1; ii < size; ii++, i += di) {
      const k = j * size + i,
        p = k + 2 * j + W + 1;
      if (open[p] !== 1) continue;
      open[p] = 0;
      const l = T[p - 1]!,
        r = T[p + 1]!,
        u = T[p - W]!,
        v = T[p + W]!;
      const a = l < r ? l : r,
        b = u < v ? u : v,
        f = slow[k]!,
        d = a > b ? a - b : b - a;
      // Infinity - Infinity = NaN fails both tests below, so unreached cells stay put.
      const t = d >= f ? (a < b ? a : b) + f : 0.5 * (a + b + Math.sqrt(2 * f * f - d * d));
      if (t < T[p]! - 1e-4) {
        T[p] = t;
        changed++;
        if (open[p - 1] === 0) open[p - 1] = 1;
        if (open[p + 1] === 0) open[p + 1] = 1;
        if (open[p - W] === 0) open[p - W] = 1;
        if (open[p + W] === 0) open[p + W] = 1;
      }
    }
  }
  return changed;
}

const sweep = (T: Float64Array, open: Uint8Array, slow: Float64Array, size: number) =>
  pass(T, open, slow, size, 1, 1) +
  pass(T, open, slow, size, -1, 1) +
  pass(T, open, slow, size, 1, -1) +
  pass(T, open, slow, size, -1, -1);

function signedTau(T: Float64Array, wet: Uint8Array, size: number) {
  const tau = new Float32Array(size * size);
  for (let j = 0; j < size; j++)
    for (let i = 0; i < size; i++) {
      const k = j * size + i,
        t = T[k + 2 * j + size + 3]!;
      tau[k] = t === Infinity ? 0 : wet[k] ? t : -t;
    }
  return tau;
}

// dir = -grad tau / |grad tau|; coherence |grad tau|*c ~ 1 on clean fronts, collapses on shocks.
function frontDir(
  tau: Float32Array,
  c: Float32Array,
  dirX: Float32Array,
  dirZ: Float32Array,
  coh: Float32Array,
  size: number,
  texel: number,
) {
  for (let j = 0; j < size; j++) {
    const jm = j > 0 ? -size : 0,
      jp = j < size - 1 ? size : 0;
    for (let i = 0; i < size; i++) {
      const k = j * size + i,
        im = i > 0 ? -1 : 0,
        ip = i < size - 1 ? 1 : 0;
      const gx = tau[k + ip]! - tau[k + im]!,
        gz = tau[k + jp]! - tau[k + jm]!;
      const g = Math.sqrt(gx * gx + gz * gz);
      if (g > 1e-9) {
        dirX[k] = -gx / g;
        dirZ[k] = -gz / g;
      }
      const q = Math.min(1, Math.max(0, ((g / (2 * texel)) * c[k]! - 0.7) / 0.25));
      coh[k] = q * q * (3 - 2 * q);
    }
  }
}

// Front curvature, 1/m (> 0 off headlands), clamped and zeroed on shocks so the ray-tube term stays smooth.
function curvature(dirX: Float32Array, dirZ: Float32Array, coh: Float32Array, size: number, texel: number) {
  const kappa = new Float32Array(size * size);
  for (let j = 0; j < size; j++) {
    const jm = j > 0 ? -size : 0,
      jp = j < size - 1 ? size : 0;
    for (let i = 0; i < size; i++) {
      const k = j * size + i,
        im = i > 0 ? -1 : 0,
        ip = i < size - 1 ? 1 : 0;
      const kp = -(dirX[k + ip]! - dirX[k + im]! + dirZ[k + jp]! - dirZ[k + jm]!) / (2 * texel);
      kappa[k] = Math.min(KAPPA_MAX, Math.max(-KAPPA_MAX, kp)) * coh[k]!;
    }
  }
  return kappa;
}

// Ray tube: G = int kappa e^(-s/L) ds marched offshore along the ray; amplitude ~ exp(G/2). Straight coast 1, headland > 1,
// bay < 1. Faded beyond RAY_BAND offshore; smooth, so marched on every other texel and upsampled in pack().
function rayTube(
  kappa: Float32Array,
  dirX: Float32Array,
  dirZ: Float32Array,
  sdf: Float32Array,
  size: number,
  texel: number,
) {
  const h = size >> 1,
    G = new Float32Array(h * h);
  const ds = RAY_STEP * texel,
    steps = Math.ceil((2.5 * RAY_L) / ds);
  const wts = new Float32Array(steps);
  for (let s = 0; s < steps; s++) wts[s] = Math.exp((-s * ds) / RAY_L) * ds;
  for (let J = 0; J < h; J++)
    for (let I = 0; I < h; I++) {
      const i = 2 * I,
        j = 2 * J,
        k = j * size + i,
        band = Math.min(1, Math.max(0, (RAY_BAND - sdf[k]!) / 80));
      if (sdf[k]! < -3 * texel || band === 0) continue;
      let x = i,
        y = j,
        g = 0;
      for (let s = 0; s < steps; s++) {
        const ii = Math.min(size - 2, x | 0),
          jj = Math.min(size - 2, y | 0),
          m = jj * size + ii;
        const fx = x - ii,
          fy = y - jj;
        const w00 = (1 - fx) * (1 - fy),
          w10 = fx * (1 - fy),
          w01 = (1 - fx) * fy,
          w11 = fx * fy;
        g += wts[s]! * (kappa[m]! * w00 + kappa[m + 1]! * w10 + kappa[m + size]! * w01 + kappa[m + size + 1]! * w11);
        x -= RAY_STEP * (dirX[m]! * w00 + dirX[m + 1]! * w10 + dirX[m + size]! * w01 + dirX[m + size + 1]! * w11);
        y -= RAY_STEP * (dirZ[m]! * w00 + dirZ[m + 1]! * w10 + dirZ[m + size]! * w01 + dirZ[m + size + 1]! * w11);
        if (x < 0 || y < 0 || x > size - 1 || y > size - 1) break;
      }
      G[J * h + I] = g * band;
    }
  return G;
}

// (tau, dir.x, dir.z, shoal); shoal = Green's law times the ray-tube factor times the blurred coherence: on shocks the
// directions converge and crests would fold into sheets, so the waves fade out there.
function pack(
  tau: Float32Array,
  dirX: Float32Array,
  dirZ: Float32Array,
  G: Float32Array,
  height: Float32Array,
  fade: Float32Array,
  size: number,
) {
  const h = size >> 1,
    data = new Float32Array(size * size * 4);
  for (let j = 0; j < size; j++) {
    const y = Math.min(h - 1, j * 0.5),
      J = Math.min(h - 2, y | 0),
      fy = y - J;
    for (let i = 0; i < size; i++) {
      const x = Math.min(h - 1, i * 0.5),
        I = Math.min(h - 2, x | 0),
        fx = x - I,
        m = J * h + I;
      const g = (G[m]! * (1 - fx) + G[m + 1]! * fx) * (1 - fy) + (G[m + h]! * (1 - fx) + G[m + h + 1]! * fx) * fy;
      const k = j * size + i;
      const green = 1 / Math.sqrt(Math.sqrt(Math.min(1, Math.max(0.04, Math.max(-height[k]!, 0.6) / DMAX))));
      data[k * 4] = tau[k]!;
      data[k * 4 + 1] = dirX[k]!;
      data[k * 4 + 2] = dirZ[k]!;
      data[k * 4 + 3] = Math.min(2.5, Math.max(0.3, g === 0 ? green : green * Math.exp(0.5 * g))) * fade[k]!;
    }
  }
  return data;
}

// A wave that broke over a bar or reef keeps only ~0.42 x the shallowest depth it crossed. Marching seaward along the ray,
// S = the shallowest depth found past a deeper stretch; land after a trough means fully sheltered. Open beaches keep SMAX.
const SMAX = 6,
  HYST = 0.3,
  S_STEP = 1.5,
  S_DEEP = 12;
function surfShelter(
  height: Float32Array,
  dirX: Float32Array,
  dirZ: Float32Array,
  sdf: Float32Array,
  size: number,
  texel: number,
) {
  const S = new Float32Array(size * size).fill(SMAX),
    steps = Math.ceil(1500 / (S_STEP * texel));
  for (let j = 0; j < size; j++)
    for (let i = 0; i < size; i++) {
      const k = j * size + i;
      if (sdf[k]! > 400 || sdf[k]! < -60) continue;
      let x = i,
        y = j,
        wet = false,
        runMax = -Infinity,
        s = SMAX;
      for (let n = 0; n < steps; n++) {
        const ii = Math.min(size - 2, x | 0),
          jj = Math.min(size - 2, y | 0),
          m = jj * size + ii;
        const fx = x - ii,
          fy = y - jj;
        const w00 = (1 - fx) * (1 - fy),
          w10 = fx * (1 - fy),
          w01 = (1 - fx) * fy,
          w11 = fx * fy;
        const d = -(height[m]! * w00 + height[m + 1]! * w10 + height[m + size]! * w01 + height[m + size + 1]! * w11);
        if (d > 0) wet = true;
        if (wet) {
          if (d <= 0 && runMax > HYST) {
            s = 0;
            break;
          }
          if (d > S_DEEP) break;
          if (d < runMax - HYST && d < s) s = d;
          if (d > runMax) runMax = d;
        }
        x -= S_STEP * (dirX[m]! * w00 + dirX[m + 1]! * w10 + dirX[m + size]! * w01 + dirX[m + size + 1]! * w11);
        y -= S_STEP * (dirZ[m]! * w00 + dirZ[m + 1]! * w10 + dirZ[m + size]! * w01 + dirZ[m + size + 1]! * w11);
        if (x < 0 || y < 0 || x > size - 1 || y > size - 1) break;
      }
      S[k] = Math.max(0, s);
    }
  // Blur: energy diffracts into the lee a little, and the gate shouldn't show texels.
  return boxBlur(boxBlur(S, size, 2), size, 2);
}

function bakeTravel(height: Float32Array, sea: Uint8Array, sdf: Float32Array, size: number, texel: number) {
  const n = size * size,
    wet = wetMask(sea, size);
  const c = new Float32Array(n),
    slow = new Float64Array(n);
  speeds(height, c, slow, texel);
  const T = new Float64Array((size + 2) * (size + 2)).fill(Infinity),
    open = new Uint8Array((size + 2) * (size + 2));
  seed(T, open, height, wet, slow, size);
  for (let it = 0; it < 12 && sweep(T, open, slow, size) > 0; it++);
  const tau = boxBlur(boxBlur(signedTau(T, wet, size), size, 2), size, 2);
  const dirX = new Float32Array(n),
    dirZ = new Float32Array(n),
    coh = new Float32Array(n);
  frontDir(tau, c, dirX, dirZ, coh, size, texel);
  const kappa = boxBlur(boxBlur(curvature(dirX, dirZ, coh, size, texel), size, 2), size, 2);
  const fade = boxBlur(boxBlur(coh, size, 2), size, 2);
  const data = pack(tau, dirX, dirZ, rayTube(kappa, dirX, dirZ, sdf, size, texel), height, fade, size);
  return {
    travel: halfTex(data, size, THREE.RGBAFormat),
    surf: halfTex(surfShelter(height, dirX, dirZ, sdf, size, texel), size, THREE.RedFormat),
  };
}

/**
 * heightFn gives the ground over sea level at a local x, z. obstacle is extra height the wave fronts see (a rock) that the
 * stored bed and the coastline ignore: fronts wrap round it, and the water beside it keeps its real depth.
 */
export function bakeShoreMap(
  heightFn: (x: number, z: number) => number,
  extent: number,
  size: number,
  obstacle: ((x: number, z: number) => number) | null = null,
) {
  const texel = extent / size;
  const bed = new Float32Array(size * size),
    height = new Float32Array(size * size);
  const land = new Uint8Array(size * size),
    sea = new Uint8Array(size * size);
  for (let j = 0; j < size; j++)
    for (let i = 0; i < size; i++) {
      const x = ((i + 0.5) / size - 0.5) * extent,
        z = ((j + 0.5) / size - 0.5) * extent;
      const h = heightFn(x, z);
      const k = j * size + i;
      land[k] = h > 0 ? 1 : 0;
      sea[k] = h <= 0 ? 1 : 0;
      bed[k] = h;
      height[k] = obstacle ? Math.max(h, obstacle(x, z)) : h;
    }
  const toLand = edt2d(land, size),
    toSea = edt2d(sea, size);
  let sdf = new Float32Array(size * size);
  for (let k = 0; k < sdf.length; k++)
    // The half-texel offset puts the zero crossing between land and sea texels.
    sdf[k] = sea[k] ? (Math.sqrt(toLand[k]!) - 0.5) * texel : -(Math.sqrt(toSea[k]!) - 0.5) * texel;
  sdf = boxBlur(boxBlur(sdf, size, 2), size, 2);
  const data = new Float32Array(size * size * 4);
  const s = (x: number, y: number) =>
    sdf[Math.min(size - 1, Math.max(0, y)) * size + Math.min(size - 1, Math.max(0, x))]!;
  for (let j = 0; j < size; j++)
    for (let i = 0; i < size; i++) {
      const k = j * size + i;
      data[k * 4] = bed[k]!;
      data[k * 4 + 1] = sdf[k]!;
      data[k * 4 + 2] = (s(i + 1, j) - s(i - 1, j)) / (2 * texel);
      data[k * 4 + 3] = (s(i, j + 1) - s(i, j - 1)) / (2 * texel);
    }
  return { shore: halfTex(data, size, THREE.RGBAFormat), extent, size, ...bakeTravel(height, sea, sdf, size, texel) };
}

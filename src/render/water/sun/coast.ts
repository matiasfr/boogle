// The Sunshine sea's coast texture (docs/plans/water-sunshine.md, step 3): one RGBA16F texture over the registered
// shores at about 1 m a texel, baked from the providers' own bed functions. No travel-time solve.
//   R  bed height (m, SEA = 0), easing to deep open water within OPEN_FADE of the providers' bounds
//   G  distance to the nearest water contact or provider rock (m, capped at CONTACT_REACH), rebuilt when contacts change
//   B  signed distance to the waterline (m, positive over water), for the receivers' swash and the coast normal
// It also answers the receivers' shore lookups (a ShoreFields with no travel field), so the 72 MB atlas is not built.
import * as THREE from 'three/webgpu';
import { SEA } from '../../../constants.ts';
import { shoreProviders, shoreRevision, type ShoreProvider } from '../shore-providers.ts';
import { waterContacts, waterContactRevision } from '../contacts.ts';
import type { ShoreFields } from '../shore-nodes.ts';
import { TSL, type N } from '../tsl.ts';

const OPEN_BED = -60;
const MARGIN = 120; // m of open sea kept around the shores (the pier head reaches 92 m past the place grid); contacts beyond get no ring
const OPEN_FADE = 60; // m outside the bounds over which the edge bed eases to OPEN_BED
const MAX_SIDE = 2048;
export const CONTACT_REACH = 6;
const SDF_CAP = 250;
const { Fn, abs, float, texture, uniform, vec2, vec4 } = TSL;

type Grid = { x0: number; z0: number; cell: number; nx: number; nz: number };
const smooth = (a: number, b: number, x: number) => {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

// Felzenszwalb & Huttenlocher's 1D squared distance transform, in place over a strided line.
function edt1d(f: Float64Array, n: number, d: Float64Array, v: Int32Array, z: Float64Array) {
  let k = 0;
  v[0] = 0;
  z[0] = -Infinity;
  z[1] = Infinity;
  for (let q = 1; q < n; q++) {
    if (f[q] === Infinity) continue;
    let s = (f[q]! + q * q - (f[v[k]!]! + v[k]! * v[k]!)) / (2 * q - 2 * v[k]!);
    while (k >= 0 && s <= z[k]!) {
      k--;
      if (k < 0) break;
      s = (f[q]! + q * q - (f[v[k]!]! + v[k]! * v[k]!)) / (2 * q - 2 * v[k]!);
    }
    k++;
    v[k] = q;
    z[k] = k === 0 ? -Infinity : s;
    z[k + 1] = Infinity;
  }
  if (f[v[0]!] === Infinity) {
    d.fill(Infinity, 0, n);
    return;
  }
  k = 0;
  for (let q = 0; q < n; q++) {
    while (z[k + 1]! < q) k++;
    d[q] = (q - v[k]!) * (q - v[k]!) + f[v[k]!]!;
  }
}
/** Distance in texels from each texel to the nearest texel where `seed` is true. */
function distanceTo(seed: (k: number) => boolean, nx: number, nz: number) {
  const out = new Float32Array(nx * nz);
  const n = Math.max(nx, nz);
  const f = new Float64Array(n),
    d = new Float64Array(n),
    v = new Int32Array(n),
    z = new Float64Array(n + 1);
  const grid = new Float64Array(nx * nz);
  for (let k = 0; k < nx * nz; k++) grid[k] = seed(k) ? 0 : Infinity;
  for (let i = 0; i < nx; i++) {
    for (let j = 0; j < nz; j++) f[j] = grid[j * nx + i]!;
    edt1d(f, nz, d, v, z);
    for (let j = 0; j < nz; j++) grid[j * nx + i] = d[j]!;
  }
  for (let j = 0; j < nz; j++) {
    for (let i = 0; i < nx; i++) f[i] = grid[j * nx + i]!;
    edt1d(f, nx, d, v, z);
    for (let i = 0; i < nx; i++) out[j * nx + i] = Math.sqrt(d[i]!);
  }
  return out;
}

const within = (p: ShoreProvider, x: number, z: number) =>
  x >= p.bounds.minX && x <= p.bounds.maxX && z >= p.bounds.minZ && z <= p.bounds.maxZ;
function bedAt(providers: ShoreProvider[], x: number, z: number) {
  let nearest: ShoreProvider | null = null,
    gap = Infinity;
  for (const p of providers) {
    if (within(p, x, z)) {
      const s = p.bedAt(x, z);
      if (s.valid) return s.height - p.seaLevel + SEA;
    }
    const b = p.bounds;
    const g = Math.hypot(Math.max(b.minX - x, 0, x - b.maxX), Math.max(b.minZ - z, 0, z - b.maxZ));
    if (g < gap) {
      gap = g;
      nearest = p;
    }
  }
  if (!nearest || gap > OPEN_FADE) return OPEN_BED;
  const b = nearest.bounds;
  const edge = nearest.bedAt(Math.min(Math.max(x, b.minX), b.maxX), Math.min(Math.max(z, b.minZ), b.maxZ));
  const height = edge.valid ? Math.min(edge.height - nearest.seaLevel + SEA, SEA - 0.5) : OPEN_BED;
  return height + (OPEN_BED - height) * smooth(0, OPEN_FADE, gap);
}

export function createCoast() {
  const transform = uniform(new THREE.Vector4(0, 0, 1, 1)); // x0, z0, 1/width, 1/depth (m)
  const texel = uniform(1);
  let grid: Grid = { x0: 0, z0: 0, cell: 1, nx: 2, nz: 2 };
  let bed = new Float32Array(4),
    sdf = new Float32Array(4),
    contact = new Float32Array(4).fill(CONTACT_REACH);
  const blank = () => {
    const t = new THREE.DataTexture(new Uint16Array(16), 2, 2, THREE.RGBAFormat, THREE.HalfFloatType);
    t.needsUpdate = true;
    return t;
  };
  const node = texture(blank());
  let seenShore = -1,
    seenContacts = -1,
    bakeMs = 0,
    contactMs = 0,
    contactCount = 0;

  const pack = () => {
    const tex = node.value as THREE.DataTexture;
    const data = tex.image.data as Uint16Array;
    const { nx, nz } = grid;
    for (let k = 0; k < nx * nz; k++) {
      // The sampler clamps beyond the texture, repeating its outermost texels across the whole sea: those are open
      // water whatever the bake found there (a contact near the edge would otherwise run off as a stripe).
      const i = k % nx,
        j = (k - i) / nx;
      const border = i === 0 || j === 0 || i === nx - 1 || j === nz - 1;
      data[k * 4] = THREE.DataUtils.toHalfFloat(border ? OPEN_BED : bed[k]!);
      data[k * 4 + 1] = THREE.DataUtils.toHalfFloat(border ? CONTACT_REACH : contact[k]!);
      data[k * 4 + 2] = THREE.DataUtils.toHalfFloat(border ? SDF_CAP : sdf[k]!);
      data[k * 4 + 3] = 0;
    }
    tex.needsUpdate = true;
  };
  function bakeContacts(providers: ShoreProvider[]) {
    const start = performance.now();
    contact.fill(CONTACT_REACH);
    const { x0, z0, cell, nx, nz } = grid;
    const circles: { x: number; z: number; radius: number }[] = waterContacts().contacts.map((c) => c);
    for (const p of providers)
      for (const o of p.obstacles ?? [])
        if (o.kind === 'circle') circles.push(o);
        else
          circles.push({
            x: (o.minX + o.maxX) / 2,
            z: (o.minZ + o.maxZ) / 2,
            radius: Math.hypot(o.maxX - o.minX, o.maxZ - o.minZ) / 2,
          });
    for (const c of circles) {
      const reach = c.radius + CONTACT_REACH;
      const i0 = Math.max(0, Math.floor((c.x - reach - x0) / cell)),
        i1 = Math.min(nx - 1, Math.ceil((c.x + reach - x0) / cell));
      const j0 = Math.max(0, Math.floor((c.z - reach - z0) / cell)),
        j1 = Math.min(nz - 1, Math.ceil((c.z + reach - z0) / cell));
      for (let j = j0; j <= j1; j++)
        for (let i = i0; i <= i1; i++) {
          const d = Math.hypot(x0 + (i + 0.5) * cell - c.x, z0 + (j + 0.5) * cell - c.z) - c.radius;
          const k = j * nx + i;
          if (d < contact[k]!) contact[k] = Math.max(d, 0);
        }
    }
    contactCount = circles.length;
    contactMs = performance.now() - start;
  }
  function bake() {
    const start = performance.now();
    const providers = shoreProviders();
    if (!providers.length) return;
    let minX = Infinity,
      maxX = -Infinity,
      minZ = Infinity,
      maxZ = -Infinity;
    for (const p of providers) {
      minX = Math.min(minX, p.bounds.minX);
      maxX = Math.max(maxX, p.bounds.maxX);
      minZ = Math.min(minZ, p.bounds.minZ);
      maxZ = Math.max(maxZ, p.bounds.maxZ);
    }
    minX -= MARGIN;
    minZ -= MARGIN;
    maxX += MARGIN;
    maxZ += MARGIN;
    const cell = Math.max(1, Math.max(maxX - minX, maxZ - minZ) / MAX_SIDE);
    const nx = Math.ceil((maxX - minX) / cell),
      nz = Math.ceil((maxZ - minZ) / cell);
    grid = { x0: minX, z0: minZ, cell, nx, nz };
    bed = new Float32Array(nx * nz);
    for (let j = 0; j < nz; j++)
      for (let i = 0; i < nx; i++) bed[j * nx + i] = bedAt(providers, minX + (i + 0.5) * cell, minZ + (j + 0.5) * cell);
    const toLand = distanceTo((k) => bed[k]! >= SEA, nx, nz),
      toWater = distanceTo((k) => bed[k]! < SEA, nx, nz);
    sdf = new Float32Array(nx * nz);
    for (let k = 0; k < nx * nz; k++)
      sdf[k] = Math.max(-SDF_CAP, Math.min(SDF_CAP, (bed[k]! < SEA ? toLand[k]! - 0.5 : 0.5 - toWater[k]!) * cell));
    contact = new Float32Array(nx * nz);
    bakeContacts(providers);
    const previous = node.value as THREE.Texture;
    const tex = new THREE.DataTexture(new Uint16Array(nx * nz * 4), nx, nz, THREE.RGBAFormat, THREE.HalfFloatType);
    tex.minFilter = tex.magFilter = THREE.LinearFilter;
    tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
    node.value = tex;
    pack();
    previous.dispose();
    transform.value.set(minX, minZ, 1 / (nx * cell), 1 / (nz * cell));
    texel.value = cell;
    bakeMs = performance.now() - start;
  }
  function sync() {
    const shore = shoreRevision(),
      contacts = waterContactRevision();
    if (shore !== seenShore) {
      seenShore = shore;
      seenContacts = contacts;
      bake();
    } else if (contacts !== seenContacts) {
      seenContacts = contacts;
      bakeContacts(shoreProviders());
      pack();
    }
  }

  /** The coast texel at world xz, explicit LOD so it may sit in branches and the vertex stage. */
  const at = (xz: N) => node.sample(xz.sub(transform.xy).mul(transform.zw)).level(0);
  const read = (data: Float32Array, x: number, z: number) => {
    const { x0, z0, cell, nx, nz } = grid;
    const u = Math.min(Math.max((x - x0) / cell - 0.5, 0), nx - 1),
      v = Math.min(Math.max((z - z0) / cell - 0.5, 0), nz - 1);
    const i = Math.min(nx - 2, Math.floor(u)),
      j = Math.min(nz - 2, Math.floor(v));
    const a = u - i,
      b = v - j,
      k = j * nx + i;
    return (data[k]! * (1 - a) + data[k + 1]! * a) * (1 - b) + (data[k + nx]! * (1 - a) + data[k + nx + 1]! * a) * b;
  };
  /** CPU lookups for the water field: bed height and the outward coast normal. */
  function sampleAt(x: number, z: number) {
    sync();
    const h = grid.cell;
    const gx = read(sdf, x + h, z) - read(sdf, x - h, z),
      gz = read(sdf, x, z + h) - read(sdf, x, z - h);
    const l = Math.hypot(gx, gz);
    return {
      bed: read(bed, x, z),
      contact: read(contact, x, z),
      normal: l > 1e-6 ? ([gx / l, gz / l] as const) : ([0, 0] as const),
    };
  }
  // The receivers' shore lookups: (bed, |distance to the waterline|, outward gradient), no travel field (swash then runs
  // up the coast normal), and an exposed shelter everywhere.
  const shore = Fn(([xz]: [N]) => {
    const c = at(xz).toVar();
    const step = texel;
    const gx = at(xz.add(vec2(step, 0))).b.sub(c.b),
      gz = at(xz.add(vec2(0, step))).b.sub(c.b);
    return vec4(c.r, abs(c.b), vec2(gx, gz).div(step));
  });
  const field = { shore, travel: Fn(() => vec4(0)), surf: () => float(6) } as unknown as ShoreFields;
  return {
    at,
    field,
    sync,
    sampleAt,
    inspect: () => ({
      coast: { ...grid, bakeMs, contactMs, contacts: contactCount, textureBytes: grid.nx * grid.nz * 8 },
    }),
    dispose() {
      (node.value as THREE.Texture).dispose();
    },
  };
}
export type Coast = ReturnType<typeof createCoast>;

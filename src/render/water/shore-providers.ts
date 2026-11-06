// Bounded Local bathymetry registry. Terrain owners supply finalized bed data; decks and collider roofs are not beds.
// Positive texture rows mean positive world z (home's heightfield rows run the opposite way).
import * as THREE from 'three/webgpu';
import { uniform, uniformArray } from 'three/tsl';
import { bakeShoreMap } from './shore.ts';

export type ShoreBounds = { minX: number; maxX: number; minZ: number; maxZ: number };
export type BedSample = { valid: boolean; height: number };
export type ShoreObstacle =
  | { kind: 'circle'; x: number; z: number; radius: number; top: number }
  | { kind: 'box'; minX: number; maxX: number; minZ: number; maxZ: number; top: number };
export type ShoreProvider = {
  id: string;
  bounds: ShoreBounds;
  seaLevel: number;
  revision: string | number;
  bedAt(x: number, z: number): BedSample;
  obstacles?: readonly ShoreObstacle[];
  extent: number; // core extent: home 512 m, place 1024 m
  /** Bed vertices align with the atlas texel corners, with the grid's +x/+z anti-diagonal. */
  vertexBed?: boolean;
};

export const SHORE_CAPACITY = 8;
const SHORE_CORE_SIZE = 512;
const SHORE_HALO = 80; // texels retained around the core, including the known-water apron
export const SHORE_SIZE = SHORE_CORE_SIZE + 2 * SHORE_HALO;
const OPEN_BED = -60;
const providers = new Map<string, ShoreProvider>();
let version = 0;
const within = (b: ShoreBounds, x: number, z: number) => x >= b.minX && x <= b.maxX && z >= b.minZ && z <= b.maxZ;
const ordered = () => [...providers.values()].sort((a, b) => a.id.localeCompare(b.id));
export const shoreProviders = ordered;
export const shoreRevision = () => version;
const clamp = (x: number, a: number, b: number) => Math.max(a, Math.min(b, x));

/** A finalized grid, including its last row/column. Axis signs are explicit and exterior points stay invalid. */
export function gridBedAt(grid: {
  x0: number;
  z0: number;
  dx: number;
  dz: number;
  nx: number;
  nz: number;
  height(i: number, j: number): number;
  triangles?: boolean;
}) {
  return (x: number, z: number): BedSample => {
    const u = (x - grid.x0) / grid.dx,
      v = (z - grid.z0) / grid.dz;
    if (u < 0 || v < 0 || u > grid.nx - 1 || v > grid.nz - 1) return { valid: false, height: 0 };
    const i = Math.min(grid.nx - 2, Math.floor(u)),
      j = Math.min(grid.nz - 2, Math.floor(v));
    const a = u - i,
      b = v - j;
    const h00 = grid.height(i, j),
      h10 = grid.height(i + 1, j),
      h01 = grid.height(i, j + 1),
      h11 = grid.height(i + 1, j + 1);
    return {
      valid: true,
      height: grid.triangles
        ? a + b <= 1
          ? h00 + (h10 - h00) * a + (h01 - h00) * b
          : h11 + (h01 - h11) * (1 - a) + (h10 - h11) * (1 - b)
        : (h00 * (1 - a) + h10 * a) * (1 - b) + (h01 * (1 - a) + h11 * a) * b,
    };
  };
}

export function registerShoreProvider(provider: ShoreProvider) {
  if (!providers.has(provider.id) && providers.size === SHORE_CAPACITY)
    throw new Error(`Water shore capacity ${SHORE_CAPACITY} exceeded by ${provider.id}; no visible region was evicted`);
  const { bounds: b, extent } = provider;
  if (!(extent > 0 && b.maxX > b.minX && b.maxZ > b.minZ && b.maxX - b.minX <= extent && b.maxZ - b.minZ <= extent))
    throw new Error(`Invalid water shore bounds: ${provider.id}`);
  providers.set(provider.id, provider);
  version++;
  return () => {
    if (providers.get(provider.id) !== provider) return;
    providers.delete(provider.id);
    version++;
  };
}

/** Only real source samples are valid. Never clamp an out-of-domain lookup onto an edge. */
function shoreBedAt(x: number, z: number) {
  return sampleProviders(ordered(), x, z);
}
function sampleProviders(ps: readonly ShoreProvider[], x: number, z: number) {
  for (const p of ps) {
    if (!within(p.bounds, x, z)) continue;
    const bed = p.bedAt(x, z);
    if (bed.valid && Number.isFinite(bed.height)) return { ...bed, provider: p.id, seaLevel: p.seaLevel };
  }
  return { valid: false, height: OPEN_BED, provider: null, seaLevel: 0 };
}

function obstacleAt(ps: readonly ShoreProvider[], x: number, z: number) {
  let top = -Infinity;
  for (const p of ps)
    for (const o of p.obstacles ?? []) {
      const hit = o.kind === 'circle' ? Math.hypot(x - o.x, z - o.z) <= o.radius : within(o, x, z);
      if (hit) top = Math.max(top, o.top - p.seaLevel);
    }
  return top;
}

function edgeCheck(ps: readonly ShoreProvider[]) {
  for (const p of ps) {
    const b = p.bounds;
    const cell = p.extent / SHORE_CORE_SIZE;
    for (let edge = 0; edge < 4; edge++) {
      const length = edge < 2 ? b.maxZ - b.minZ : b.maxX - b.minX;
      const steps = Math.ceil(length / cell);
      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const x = edge < 2 ? (edge === 0 ? b.minX : b.maxX) : b.minX + t * (b.maxX - b.minX);
        const z = edge >= 2 ? (edge === 2 ? b.minZ : b.maxZ) : b.minZ + t * (b.maxZ - b.minZ);
        const bed = p.bedAt(x, z);
        if (!bed.valid || bed.height <= p.seaLevel) continue;
        const ox = x + (edge === 0 ? -cell : edge === 1 ? cell : 0);
        const oz = z + (edge === 2 ? -cell : edge === 3 ? cell : 0);
        if (!ps.some((other) => other !== p && within(other.bounds, ox, oz) && other.bedAt(ox, oz).valid))
          throw new Error(`Dry water-provider edge at ${p.id} (${x}, ${z}); register adjacent ground before baking`);
      }
    }
  }
}

// A verified underwater edge may continue into an explicit water apron. This is separate from bed validity.
// Its depth reaches OPEN_BED before the resident region ends, so no clamped edge texel fabricates a square coastline.
export function shoreApronHeight(edgeHeight: number, distance: number, extent: number) {
  const t = clamp(distance / ((extent / SHORE_CORE_SIZE) * (SHORE_HALO - 4)), 0, 1);
  const fade = t * t * (3 - 2 * t);
  return edgeHeight * (1 - fade) + OPEN_BED * fade;
}

function bedForBake(ps: readonly ShoreProvider[], x: number, z: number, level: number) {
  for (const p of ps) {
    if (!within(p.bounds, x, z)) continue;
    const bed = p.bedAt(x, z);
    if (bed.valid) return bed.height - level;
  }
  let nearest = Infinity;
  let height = OPEN_BED;
  for (const p of ps) {
    const b = p.bounds;
    const ex = clamp(x, b.minX, b.maxX),
      ez = clamp(z, b.minZ, b.maxZ);
    const d = Math.hypot(x - ex, z - ez);
    if (d >= nearest) continue;
    const bed = p.bedAt(ex, ez);
    if (!bed.valid || bed.height > level) continue;
    nearest = d;
    height = shoreApronHeight(bed.height - level, d, p.extent);
  }
  return height;
}

type Bake = ReturnType<typeof bakeShoreMap>;
type Region = { provider: ShoreProvider; centerX: number; centerZ: number; extent: number; layer: number };
type Solved = { key: string; bake: Bake; minX: number; minZ: number; cell: number };
function disposeBake(b: Bake) {
  b.shore.dispose();
  b.travel.dispose();
  b.surf.dispose();
}
function joins(a: ShoreProvider, b: ShoreProvider) {
  return (
    a.bounds.minX <= b.bounds.maxX &&
    b.bounds.minX <= a.bounds.maxX &&
    a.bounds.minZ <= b.bounds.maxZ &&
    b.bounds.minZ <= a.bounds.maxZ
  );
}
function connected(ps: ShoreProvider[]) {
  const groups: ShoreProvider[][] = [];
  const pending = new Set(ps);
  for (const p of ps) {
    if (!pending.delete(p)) continue;
    const group = [p];
    for (let i = 0; i < group.length; i++)
      for (const other of pending)
        if (joins(group[i]!, other)) {
          pending.delete(other);
          group.push(other);
        }
    groups.push(group.sort((a, b) => a.id.localeCompare(b.id)));
  }
  return groups;
}
function bilinear(data: Float32Array, size: number, x: number, z: number, channels: number, c: number) {
  const u = clamp(x, 0, size - 1),
    v = clamp(z, 0, size - 1);
  const i = Math.min(size - 2, Math.floor(u)),
    j = Math.min(size - 2, Math.floor(v));
  const a = u - i,
    b = v - j,
    k = (j * size + i) * channels + c;
  return (
    (data[k]! * (1 - a) + data[k + channels]! * a) * (1 - b) +
    (data[k + size * channels]! * (1 - a) + data[k + (size + 1) * channels]! * a) * b
  );
}
function arrayTexture(channels: 2 | 4) {
  const data = new Uint16Array(SHORE_SIZE * SHORE_SIZE * SHORE_CAPACITY * channels);
  const texture = new THREE.DataArrayTexture(data, SHORE_SIZE, SHORE_SIZE, SHORE_CAPACITY);
  texture.type = THREE.HalfFloatType;
  texture.format = channels === 4 ? THREE.RGBAFormat : THREE.RGFormat;
  texture.minFilter = texture.magFilter = THREE.LinearFilter;
  texture.needsUpdate = true;
  return texture;
}

/** Created only for the opt-in renderer or diagnostics; the legacy sea pays no bake/GPU allocation cost. */
export function createShoreAtlas() {
  const shore = arrayTexture(4),
    travel = arrayTexture(4),
    surf = arrayTexture(2);
  const transforms = Array.from({ length: SHORE_CAPACITY }, () => new THREE.Vector4());
  const bounds = Array.from({ length: SHORE_CAPACITY }, () => new THREE.Vector4());
  const uTransforms = uniformArray(transforms, 'vec4'),
    uBounds = uniformArray(bounds, 'vec4'),
    vertexBeds = uniformArray(Array<number>(SHORE_CAPACITY).fill(0), 'float'),
    count = uniform(0);
  const cache = new Map<string, Solved>();
  let regions: Region[] = [],
    seen = -1,
    bakeMs = 0,
    disposed = false;
  function sync() {
    if (disposed || seen === version) return;
    const start = performance.now(),
      ps = ordered(),
      used = new Set<string>();
    edgeCheck(ps);
    regions = ps.map((p, layer) => ({
      provider: p,
      layer,
      centerX: (p.bounds.minX + p.bounds.maxX) / 2,
      centerZ: (p.bounds.minZ + p.bounds.maxZ) / 2,
      extent: (p.extent * SHORE_SIZE) / SHORE_CORE_SIZE,
    }));
    for (const group of connected(ps)) {
      const key = group
        .map((p) => `${p.id}:${p.revision}:${p.extent}:${p.seaLevel}:${JSON.stringify(p.bounds)}`)
        .join('|');
      used.add(key);
      let solved = cache.get(key);
      if (!solved) {
        const level = group[0]!.seaLevel;
        if (group.some((p) => p.seaLevel !== level)) throw new Error('Adjacent sea providers must share sea level');
        const cell = Math.min(...group.map((p) => p.extent / SHORE_CORE_SIZE));
        const rs = regions.filter((r) => group.includes(r.provider));
        // One solve for a connected coastline, including every resident halo. Adjacent tiles never restart travel.
        const minX = Math.floor(Math.min(...rs.map((r) => r.centerX - r.extent / 2)) / cell) * cell;
        const minZ = Math.floor(Math.min(...rs.map((r) => r.centerZ - r.extent / 2)) / cell) * cell;
        const width = Math.max(...rs.map((r) => r.centerX + r.extent / 2)) - minX;
        const depth = Math.max(...rs.map((r) => r.centerZ + r.extent / 2)) - minZ;
        const size = Math.ceil(Math.max(width, depth) / cell / 2) * 2,
          extent = size * cell;
        const cx = minX + extent / 2,
          cz = minZ + extent / 2;
        const bake = bakeShoreMap(
          (x, z) => bedForBake(ps, x + cx, z + cz, level),
          extent,
          size,
          (x, z) => obstacleAt(ps, x + cx, z + cz),
        );
        solved = { key, bake, minX, minZ, cell };
        cache.set(key, solved);
      }
      for (const r of regions.filter((r) => group.includes(r.provider))) {
        const b = r.provider.bounds;
        transforms[r.layer]!.set(r.centerX, r.centerZ, r.extent, r.provider.seaLevel);
        bounds[r.layer]!.set(b.minX, b.maxX, b.minZ, b.maxZ);
        vertexBeds.array[r.layer] = r.provider.vertexBed ? 1 : 0;
        for (let j = 0; j < SHORE_SIZE; j++)
          for (let i = 0; i < SHORE_SIZE; i++) {
            const x = r.centerX + ((i + 0.5) / SHORE_SIZE - 0.5) * r.extent;
            const z = r.centerZ + ((j + 0.5) / SHORE_SIZE - 0.5) * r.extent;
            const u = (x - solved.minX) / solved.cell - 0.5,
              v = (z - solved.minZ) / solved.cell - 0.5;
            const k = r.layer * SHORE_SIZE * SHORE_SIZE + j * SHORE_SIZE + i;
            const pack = (tex: THREE.DataArrayTexture, data: Float32Array, n: number, output: number) => {
              const target = tex.image.data as Uint16Array;
              for (let c = 0; c < n; c++)
                target[k * output + c] = THREE.DataUtils.toHalfFloat(bilinear(data, solved!.bake.size, u, v, n, c));
            };
            pack(shore, solved.bake.data, 4, 4);
            // Keep bathymetry on the authored vertices. Filtering centre samples rounded steep banks into
            // metre-high false beds; travel/distance still need their independently smoothed centre samples.
            if (r.provider.vertexBed) {
              const halfCell = r.extent / SHORE_SIZE / 2;
              (shore.image.data as Uint16Array)[k * 4] = THREE.DataUtils.toHalfFloat(
                bedForBake(ps, x - halfCell, z - halfCell, r.provider.seaLevel),
              );
            }
            pack(travel, solved.bake.travelData, 4, 4);
            pack(surf, solved.bake.surfData, 1, 2);
            (surf.image.data as Uint16Array)[k * 2 + 1] = THREE.DataUtils.toHalfFloat(
              sampleProviders(ps, x, z).valid ? 1 : 0,
            );
          }
      }
    }
    for (const [key, solved] of cache)
      if (!used.has(key)) {
        disposeBake(solved.bake);
        cache.delete(key);
      }
    count.value = regions.length;
    shore.needsUpdate = travel.needsUpdate = surf.needsUpdate = true;
    bakeMs = performance.now() - start;
    seen = version;
  }
  function sampleAt(x: number, z: number) {
    sync();
    // Prefer the real provider, then one coherent apron tuple. All three fields always use this same layer.
    const r =
      regions.find((r) => within(r.provider.bounds, x, z)) ??
      regions.find((r) => Math.abs(x - r.centerX) <= r.extent / 2 && Math.abs(z - r.centerZ) <= r.extent / 2);
    if (!r)
      return {
        bed: OPEN_BED,
        distance: 10000,
        normal: [0, 0],
        travel: [0, 0, 0, 0],
        shelter: 6,
        valid: false,
        provider: null,
      };
    const i = ((x - r.centerX) / r.extent) * SHORE_SIZE + SHORE_SIZE / 2 - 0.5;
    const j = ((z - r.centerZ) / r.extent) * SHORE_SIZE + SHORE_SIZE / 2 - 0.5;
    const read = (tex: THREE.DataArrayTexture, n: number, vertexBed = false) => {
      const raw = tex.image.data as Uint16Array;
      const offset = r.layer * SHORE_SIZE * SHORE_SIZE * n;
      // Four half-float texels only; diagnostics and physics do not copy a whole texture per lookup.
      const u = clamp(i + (vertexBed ? 0.5 : 0), 0, SHORE_SIZE - 1),
        v = clamp(j + (vertexBed ? 0.5 : 0), 0, SHORE_SIZE - 1);
      const ix = Math.min(SHORE_SIZE - 2, Math.floor(u)),
        iz = Math.min(SHORE_SIZE - 2, Math.floor(v));
      const a = u - ix,
        b = v - iz;
      return Array.from({ length: n }, (_, c) => {
        const k = offset + (iz * SHORE_SIZE + ix) * n + c;
        const f = (q: number) => THREE.DataUtils.fromHalfFloat(raw[q]!);
        if (vertexBed) {
          const h00 = f(k),
            h10 = f(k + n),
            h01 = f(k + SHORE_SIZE * n),
            h11 = f(k + (SHORE_SIZE + 1) * n);
          return a + b <= 1
            ? h00 + (h10 - h00) * a + (h01 - h00) * b
            : h11 + (h01 - h11) * (1 - a) + (h10 - h11) * (1 - b);
        }
        return (
          (f(k) * (1 - a) + f(k + n) * a) * (1 - b) +
          (f(k + SHORE_SIZE * n) * (1 - a) + f(k + (SHORE_SIZE + 1) * n) * a) * b
        );
      });
    };
    const sh = read(shore, 4),
      tr = read(travel, 4),
      su = read(surf, 2);
    return {
      bed: (r.provider.vertexBed ? read(shore, 4, true)[0]! : sh[0]!) + r.provider.seaLevel,
      distance: sh[1]!,
      normal: [sh[2]!, sh[3]!],
      travel: tr,
      shelter: su[0]!,
      valid: shoreBedAt(x, z).valid,
      provider: r.provider.id,
    };
  }
  return {
    shore,
    travel,
    surf,
    transforms: uTransforms,
    bounds: uBounds,
    vertexBeds,
    count,
    sync,
    sampleAt,
    inspect: () => ({
      regions: regions.map((r) => ({
        id: r.provider.id,
        revision: r.provider.revision,
        layer: r.layer,
        bounds: r.provider.bounds,
        center: [r.centerX, r.centerZ],
        extent: r.extent,
      })),
      coreSize: SHORE_CORE_SIZE,
      size: SHORE_SIZE,
      capacity: SHORE_CAPACITY,
      bakeMs,
      textureBytes: SHORE_SIZE * SHORE_SIZE * SHORE_CAPACITY * 20,
    }),
    dispose() {
      disposed = true;
      shore.dispose();
      travel.dispose();
      surf.dispose();
      for (const s of cache.values()) disposeBake(s.bake);
      cache.clear();
    },
  };
}
export type ShoreAtlas = ReturnType<typeof createShoreAtlas>;

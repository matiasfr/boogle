// Bounded Local bathymetry registry. Terrain owners supply finalized bed data; decks and collider roofs are not beds.
// The coast texture (coast.ts) bakes every provider; the terrain draws the same offshore apron (shoreApronHeight).

export type ShoreBounds = { minX: number; maxX: number; minZ: number; maxZ: number };
export type BedSample = { valid: boolean; height: number };

export type ShoreProvider = {
  id: string;
  bounds: ShoreBounds;
  seaLevel: number;
  revision: string | number;
  bedAt(x: number, z: number): BedSample;

  extent: number; // core extent: home 512 m, place 1024 m
};

const SHORE_CAPACITY = 8;
const APRON_TEXELS = 76; // the apron's reach in 1/512ths of a provider's extent
const OPEN_BED = -60;
const providers = new Map<string, ShoreProvider>();
let version = 0;
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

// A verified underwater edge may continue into an explicit water apron. This is separate from bed validity.
// Its depth reaches OPEN_BED within (extent / 512) * APRON_TEXELS metres of the provider's bounds.
export function shoreApronHeight(edgeHeight: number, distance: number, extent: number) {
  const t = clamp(distance / ((extent / 512) * APRON_TEXELS), 0, 1);
  const fade = t * t * (3 - 2 * t);
  return edgeHeight * (1 - fade) + OPEN_BED * fade;
}


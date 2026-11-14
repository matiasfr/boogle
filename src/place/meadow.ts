// The meadow on Home's ground (docs/game-design/place.md, "The meadow"; owner, 14 November 2026: "I love the meadow").
// This file is what the ground's material needs before the land is built: the meadow's maps as textures, the lawn's
// tint (four of the lawn's own greens in large soft patches, everywhere grass is drawn) and the far flowers, which are
// colour specks painted in the lawn where the planted ones (meadow-flowers.ts) have thinned out. One lawn layer for
// the ground material (ground-material.ts `LawnLayer`); rock, sand and paths are mixed over the lawn afterwards.
// Loaded only when the meadow is on (meadow-flags.ts). Local view only: no sim, world, net or saved state.
import * as THREE from 'three/webgpu';
import {
  clamp as tslClamp,
  dot,
  float,
  floor,
  fract,
  length,
  mix,
  positionView,
  select,
  sin,
  smoothstep,
  texture,
  vec2,
  vec3,
} from 'three/tsl';
import { MATERIAL_PALETTES } from '../render/material-palette-tuning.ts';
import { GRID, ORIGIN } from './layout.ts';
import { KEEP_H, KEEP_W, NOISE_CELL, NOISE_H, NOISE_W, bakeMeadowNoise } from './meadow-field.ts';
import { MEADOW } from './meadow-flags.ts';

// TSL's types don't follow these graphs; kept loose like look.ts.
// oxlint-disable-next-line typescript/no-explicit-any
type N = any;
const linear = (hex: string) => {
  const c = new THREE.Color(hex);
  return vec3(c.r, c.g, c.b);
};

function dataTexture(name: string, data: Uint8Array, width: number, height: number) {
  const map = new THREE.DataTexture(data, width, height, THREE.RGBAFormat, THREE.UnsignedByteType);
  map.name = name;
  map.minFilter = map.magFilter = THREE.LinearFilter;
  map.generateMipmaps = false;
  map.colorSpace = THREE.NoColorSpace;
  map.needsUpdate = true;
  return map;
}
let noise: THREE.DataTexture | null = null;
/** The two slow noises (sun in red, zone in green), 4 m texels over the land's grid: 107 KB, made once. */
export function meadowNoiseTexture() {
  return (noise ??= dataTexture('place-meadow-noise', bakeMeadowNoise(), NOISE_W, NOISE_H));
}
let keep: THREE.DataTexture | null = null;
/** The keep map (meadow-field.ts), 1 m texels: 1.7 MB. It starts all "kept", so nothing grows until
 * meadow-flowers.ts has baked it and called `setMeadowKeep`. */
export function meadowKeepTexture() {
  return (keep ??= dataTexture('place-meadow-keep', new Uint8Array(KEEP_W * KEEP_H * 4), KEEP_W, KEEP_H));
}
export function setMeadowKeep(data: Uint8Array) {
  const map = meadowKeepTexture();
  (map.image.data as Uint8Array).set(data);
  map.needsUpdate = true;
}

const corner = vec2(ORIGIN.x + GRID.x0, ORIGIN.z + GRID.z0);
/** The noise at a world xz. Each texel is eased into the next, so a patch's border has no crease along the grid. */
export function meadowNoiseAt(worldXZ: N): N {
  const grid: N = worldXZ.sub(corner).div(NOISE_CELL);
  const whole: N = floor(grid),
    part: N = grid.sub(whole);
  const eased: N = part.mul(part).mul(part.mul(-2).add(3));
  return texture(meadowNoiseTexture(), whole.add(eased).add(0.5).div(vec2(NOISE_W, NOISE_H)));
}
/** The keep map at a world xz: distance to the nearest kept thing over `KEEP_REACH`, the density cap, the drift lift. */
export const meadowKeepAt = (worldXZ: N): N =>
  texture(meadowKeepTexture(), worldXZ.sub(corner).add(0.5).div(vec2(KEEP_W, KEEP_H)));

/** The lawn's four greens, all already in the game: the land's two grass vertex colours (land.ts) and the lawn's own
 * warm and dry tints of the lighter one (ground-material.ts), the warm one pushed a little. Written before the grass
 * palette is applied, as the lawn is. */
const GREENS = {
  lush: linear('#568740'),
  fresh: linear('#6c9a42'),
  sunny: linear('#6c9a42').mul(vec3(1.24, 1.1, 0.72)),
  pale: linear('#6c9a42').mul(vec3(1.14, 1.12, 0.9)),
};
/** The meadow's green at a noise sample: lush to fresh to sunny along `sun`, with pale where the zone noise peaks. */
export function meadowGreen(sample: N): N {
  const sun: N = sample.r,
    zone: N = sample.g;
  const green: N = mix(
    mix(GREENS.lush, GREENS.fresh, smoothstep(0.08, 0.5, sun)),
    GREENS.sunny,
    smoothstep(0.5, 0.92, sun),
  );
  return mix(green, GREENS.pale, smoothstep(0.6, 0.95, zone).mul(0.6));
}

/** The four flowers, each keeping to its own band of the zone noise: petal and heart. */
const FLOWERS = [
  { petal: '#f3efe2', heart: '#f0b92c' },
  { petal: '#f2c531', heart: '#de7f1c' },
  { petal: '#ee86b0', heart: '#f6e7a0' },
  { petal: '#6f8ff0', heart: '#f3ecc4' },
] as const;
/** Which flower grows at a noise sample, 0 to 3; `stray` (0..1, its own for each flower) lets two kinds mingle along
 * a border only. */
export const flowerKind = (sample: N, stray: N): N =>
  floor(tslClamp(sample.g.mul(4).add(stray.sub(0.5).mul(0.5)), 0, 3.99));
/** One of four values by flower kind. */
export const byKind = (kind: N, values: readonly N[]): N =>
  select(
    kind.lessThan(1),
    values[0],
    select(kind.lessThan(2), values[1], select(kind.lessThan(3), values[2], values[3])),
  );
export const petalColour = (kind: N): N =>
  byKind(
    kind,
    FLOWERS.map((f) => linear(f.petal)),
  );
export const heartColour = (kind: N): N =>
  byKind(
    kind,
    FLOWERS.map((f) => linear(f.heart)),
  );
/** How thick the flowers are at a point, 0..1: the drift noise, lifted and capped by the keep map (thin and even on
 * the town's green, drifts and bare stretches on open ground). */
export const flowerDrift = (sample: N, kept: N): N =>
  tslClamp(smoothstep(0.38, 0.72, sample.r).add(kept.b), 0, 1).mul(kept.g);

const hash = (cell: N): N => fract(sin(dot(cell, vec2(127.1, 311.7))).mul(43758.5453));
/** What the lawn's own colouring does to a pigment after this layer (look.ts selectiveColour 'grass' and the Fresh
 * palette), so a speck's colour can be written to come out as the planted flower's. */
const lawnGain = (() => {
  const anchor = new THREE.Color(MATERIAL_PALETTES.grass[0]),
    fresh = new THREE.Color(MATERIAL_PALETTES.grass[1]);
  const through = (c: number, tilt: number) => 0.7 * (0.65 + 0.35 * tilt) * c;
  return vec3(through(fresh.r / anchor.r, 0.88), through(fresh.g / anchor.g, 1.18), through(fresh.b / anchor.b, 0.94));
})();
/** Distances from the camera, metres: specks come in as the planted flowers thin out and give way to a faint wash of
 * their colour where a speck is smaller than a pixel. */
const SPECKS = { from: 34, full: 48, washFrom: 110, washFull: 200, cell: 0.9 };

/** The far flowers: one speck in a cell of lawn, where the same drift and keep rules as the planted ones allow. */
function specks(lawn: N, world: N, sample: N): N {
  const kept: N = meadowKeepAt(world);
  const open: N = smoothstep(0.3, 0.45, kept.r);
  const drift: N = flowerDrift(sample, kept).mul(open);
  const cell: N = floor(world.div(SPECKS.cell));
  const own: N = hash(cell);
  const centre: N = cell
    .add(
      vec2(hash(cell.add(17.3)), hash(cell.add(5.1)))
        .mul(0.5)
        .add(0.25),
    )
    .mul(SPECKS.cell);
  const spot: N = smoothstep(0.1, 0.2, length(world.sub(centre))).oneMinus();
  const grows: N = smoothstep(0, 0.06, drift.sub(own.mul(0.9).add(0.05)));
  const away: N = positionView.z.negate();
  const wash: N = smoothstep(SPECKS.washFrom, SPECKS.washFull, away);
  const shown: N = smoothstep(SPECKS.from, SPECKS.full, away).mul(wash.oneMinus());
  const speck: N = petalColour(flowerKind(sample, own)).div(lawnGain);
  const far: N = petalColour(flowerKind(sample, float(0.5))).div(lawnGain);
  return mix(mix(lawn, speck, spot.mul(grows).mul(shown)), far, drift.mul(wash).mul(0.1));
}

/** The meadow's lawn layer. `p` is the Place-local position. The tint is one texture tap a pixel and the specks one
 * more; no geometry. Only grass is touched: where the land's own colour is earth, it stays. */
export function meadowLawn(lawn: N, p: N, mottle: N): N {
  const world: N = p.xz.add(vec2(ORIGIN.x, ORIGIN.z));
  const sample: N = meadowNoiseAt(world);
  const grassy: N = smoothstep(-0.05, 0.1, lawn.r.sub(lawn.g)).oneMinus();
  const tinted: N = MEADOW.tint ? mix(lawn, meadowGreen(sample).mul(mottle.add(1)), grassy) : lawn;
  return MEADOW.flowers ? specks(tinted, world, sample) : tinted;
}

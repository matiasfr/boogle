// The wood surface family (docs/research/texturing.md): one seeded, periodic grain recipe baked once at load to a
// 512² mipmapped tile, sampled in object space along each piece's grain axis. The tile is a linear pigment multiplier
// around 1, so the palette stays the colour authority. Owner's pick after the timber proof (6 November): the live
// grain's look, baked, kept subtle; knots scattered by a seeded jittered pattern and every board offset from the next.
import * as THREE from 'three/webgpu';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import {
  abs,
  attribute,
  vertexColor,
  float,
  instanceIndex,
  length,
  materialColor,
  mix,
  modelPosition,
  normalGeometry,
  positionGeometry,
  select,
  sin,
  smoothstep,
  texture,
  vec2,
  vec3,
  vertexStage,
} from 'three/tsl';
import { bakedTile, tileBytes } from './baked-tile.ts';
import { scalar } from './water/live.ts';
import { WOOD_PARAMETERS, type WoodTunableKey } from '../tunables/surfaces.ts';

// TSL's types don't follow these graphs; kept loose like the other material modules.
// oxlint-disable-next-line typescript/no-explicit-any
type N = any;
export type GrainAxis = 'x' | 'y' | 'z';

const SIZE = 512;
const TAU = Math.PI * 2;
/** Stored as multiplier − 0.5, so 0.5–1.5 fits a byte at 1/255 steps. */
const BIAS = 0.5;
/** What `mergeTimber` writes for each piece, so `woodGrain(..., 'merged')` sees it as a separate mesh would. */
const GRAIN = { position: 'grainPosition', normal: 'grainNormal', origin: 'grainOrigin' } as const;
export const woodTileBytes = tileBytes(SIZE);
export const woodBake = { ms: 0 };

type Knot = { u: number; v: number; ru: number; rv: number; dark: number };
/** Seeded jittered strata: a 4 × 5 grid of cells over the tile, about a third holding a knot anywhere inside it, with
 * its own size and darkness. No two cells line up, so no grid reads, and the tile still repeats exactly at 1. */
function scatterKnots() {
  let seed = 0x776f6f64;
  const random = () => {
    seed ^= seed << 13;
    seed ^= seed >>> 17;
    seed ^= seed << 5;
    return (seed >>> 0) / 0x100000000;
  };
  const knots: Knot[] = [];
  const CU = 4,
    CV = 5;
  for (let i = 0; i < CU; i++)
    for (let j = 0; j < CV; j++) {
      const take = random() < 0.34;
      const u = (i + random()) / CU,
        v = (j + random()) / CV,
        ru = 0.026 + random() * 0.026,
        dark = 0.1 + random() * 0.09;
      if (take) knots.push({ u, v, ru, rv: ru * (0.55 + random() * 0.15), dark });
    }
  return knots;
}

/** The grain recipe (the proof's live grain, B), in tile space with u along the grain. Integer frequencies only. */
function bake() {
  const start = performance.now();
  const knots = scatterKnots();
  const values = new Float32Array(SIZE * SIZE);
  const byte = (n: number) => Math.round(Math.max(0, Math.min(1, n - BIAS)) * 255);
  const wrap = (d: number) => d - Math.round(d);
  for (let y = 0; y < SIZE; y++)
    for (let x = 0; x < SIZE; x++) {
      const u = x / SIZE,
        v = y / SIZE,
        au = u * TAU,
        av = v * TAU;
      // Two octaves of periodic warp: long lazy waves along the grain, a smaller wobble on top.
      const warp = Math.sin(au + Math.sin(av * 2) * 0.8) * 1.3 + Math.sin(au * 3 + av + 1.7) * 0.55;
      // Each knot darkens a small core, and the bands bend around a wider halo.
      let core = 0,
        bend = 0,
        dark = 0;
      for (const k of knots) {
        const du = wrap(u - k.u) / k.ru,
          dv = wrap(v - k.v) / k.rv,
          d2 = du * du + dv * dv;
        if (d2 > 60) continue; // the halo is under 1/1000 there
        const c = Math.exp(-d2 * 1.6);
        if (c > core) {
          core = c;
          dark = k.dark;
        }
        bend += Math.exp(-d2 * 0.12);
      }
      const phase = av * 6 + warp + bend * 1.6;
      const bands = ((Math.sin(phase) + 1) * 0.5) ** 2.2;
      const fine = Math.sin(av * 30 + warp * 2);
      values[y * SIZE + x] = 1.03 - bands * 0.11 + fine * 0.03 - core * dark;
    }
  // Normalised to average exactly 1, so wood keeps each colour's brightness and `level` alone sets it.
  const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
  const rgba = new Uint8Array(SIZE * SIZE * 4);
  for (let i = 0; i < values.length; i++) {
    const value = values[i]! / mean,
      log = Math.log(value);
    // Darker grain runs a touch warmer; at the average the multiplier is neutral, so the palette keeps its hue.
    rgba[i * 4] = byte(value);
    rgba[i * 4 + 1] = byte(Math.exp(log * 1.06));
    rgba[i * 4 + 2] = byte(Math.exp(log * 1.18));
    rgba[i * 4 + 3] = 255;
  }
  const tile = bakedTile('wood-grain', SIZE, rgba);
  woodBake.ms = performance.now() - start;
  return tile;
}
let tile: THREE.DataTexture | undefined;
/** The session's one wood tile, baked on first use. Shared: never mutate or dispose it. */
export const woodTile = () => (tile ??= bake());

const settings = Object.fromEntries(Object.entries(WOOD_PARAMETERS).map(([k, s]) => [k, s.default])) as Record<
  WoodTunableKey,
  number
>;
const woodU = (key: WoodTunableKey): N => float(scalar(`wood.${key}`, settings, key));
const hash = (n: N, k: number): N => sin(n.mul(k)).mul(43758.5453).fract();

/**
 * A wood multiplier for a piece whose grain runs along `axis` of its own geometry, `scale` metres per geometry unit.
 * `vary` picks what sets each piece apart: its instance index (batches and anything that moves), or its world position
 * (static single meshes, so neighbouring boards differ without a draw of their own). `plain` sides keep only the
 * rings on the cut ends: bark is not cut timber. `level` is the sides' average brightness.
 */
export function woodGrain(
  axis: GrainAxis,
  vary: 'instance' | 'position' | 'merged',
  scale: readonly [number, number, number] = [1, 1, 1],
  sides: 'grain' | 'plain' = 'grain',
  level = 1,
  /** Added to the instance index: a batch cut from a longer one keeps every piece's grain (the track's chunks). */
  idBase?: N,
) {
  // A merged batch (`mergeTimber`) carries each piece's own geometry space and its origin (x, z) as attributes, so
  // it shades exactly as its separate meshes did.
  const merged = vary === 'merged';
  const p: N = (merged ? attribute(GRAIN.position, 'vec3') : positionGeometry).mul(vec3(...scale));
  const n: N = abs(merged ? attribute(GRAIN.normal, 'vec3') : normalGeometry);
  const origin: N = merged ? attribute(GRAIN.origin, 'vec2') : modelPosition.xz;
  const id: N =
    vary === 'instance'
      ? (idBase ? float(instanceIndex).add(idBase) : float(instanceIndex)).add(1)
      : origin.x.mul(0.37).add(origin.y.mul(0.61));
  // A merged piece's origin is a per-vertex constant. Hashed in the fragment stage, its interpolation error would
  // be multiplied into per-pixel noise, so the vertex stage hashes it; the offset it passes on is constant.
  const hashed: N = vec2(hash(id, 12.9898), hash(id, 78.233));
  const offset: N = merged ? vertexStage(hashed) : hashed;
  const [a, b] = (axis === 'x' ? ['y', 'z'] : axis === 'y' ? ['x', 'z'] : ['x', 'y']) as [GrainAxis, GrainAxis];
  // Across the grain on whichever long face is showing.
  const across: N = select(n[a].greaterThan(0.5), p[b], p[a]);
  const t: N = vec2(p[axis], across).div(woodU('repeat')).add(offset);
  const side: N =
    sides === 'plain'
      ? vec3(level)
      : texture(woodTile(), t)
          .rgb.add(BIAS - 1)
          .mul(woodU('contrast'))
          .add(1)
          .mul(level);
  // Rings on the cut ends, as before: cheap enough to stay live, and ends are small on screen.
  const ra: N = p[a].add(offset.x),
    rb: N = p[b].add(offset.y);
  const rings: N = sin(length(vec2(ra.fract().sub(0.5), rb.fract().sub(0.5))).mul(120))
    .mul(0.5)
    .add(0.5);
  const end: N = float(1.24).sub(rings.mul(0.12));
  return mix(side, vec3(end), smoothstep(float(0.72), float(0.92), n[axis]));
}

const made = new Map<string, THREE.MeshStandardNodeMaterial>();
/** A static timber mesh's material: `base` (a shared flat colour) with grain, varied by world position. Cached and
 * shared like `base`: clone before tinting or patching, and never dispose it. `merged`: the same look for pieces
 * that `mergeTimber` will join into one draw; it reads attributes only that merge writes. */
export function woodMaterial(base: THREE.MeshStandardNodeMaterial, axis: GrainAxis, merged = false) {
  const key = `${base.uuid} ${axis}${merged ? ' merged' : ''}`;
  let m = made.get(key);
  if (!m) {
    m = base.clone();
    m.colorNode = materialColor.mul(woodGrain(axis, merged ? 'merged' : 'position'));
    m.name = `wood-${axis}`;
    made.set(key, m);
  }
  return m;
}

/**
 * Joins static pieces built in one place (a footbridge, a landing) into one draw per material and shadow setting,
 * baked into the frame of the pieces' parent. Each piece keeps its own grain: its geometry-space position and
 * normal and its origin travel as attributes for `woodMaterial(..., true)`. Pieces must not move afterwards
 * and must share a parent at the world origin (that frame is where their ids were measured). The pieces' geometries are
 * disposed; the returned meshes have real bounds and stay frustum culled.
 */
export function mergeTimber(pieces: readonly THREE.Mesh[]) {
  const groups = new Map<string, THREE.Mesh[]>();
  for (const piece of pieces) {
    const material = piece.material as THREE.Material;
    const key = `${material.uuid} ${piece.castShadow} ${piece.receiveShadow}`;
    const group = groups.get(key);
    if (group) group.push(piece);
    else groups.set(key, [piece]);
  }
  return [...groups.values()].map((group) => {
    const parts = group.map((piece) => {
      piece.updateMatrix();
      const geometry = piece.geometry.clone();
      geometry.setAttribute(GRAIN.position, geometry.getAttribute('position').clone());
      geometry.setAttribute(GRAIN.normal, geometry.getAttribute('normal').clone());
      // What `woodGrain` reads from `modelPosition` for a separate mesh, at the same float precision.
      const origin = new Float32Array(geometry.getAttribute('position').count * 2);
      for (let i = 0; i < origin.length; i += 2) {
        origin[i] = piece.position.x;
        origin[i + 1] = piece.position.z;
      }
      geometry.setAttribute(GRAIN.origin, new THREE.BufferAttribute(origin, 2));
      geometry.applyMatrix4(piece.matrix);
      piece.geometry.dispose();
      return geometry;
    });
    const first = group[0]!;
    const mesh = new THREE.Mesh(mergeGeometries(parts)!, first.material);
    for (const part of parts) part.dispose();
    mesh.castShadow = first.castShadow;
    mesh.receiveShadow = first.receiveShadow;
    return mesh;
  });
}

/** For a vertex-coloured mesh that merges timber with other parts (a stored track panel's sleeper slab and its
 * rails): grain only where the vertex colour is warm, so grey steel stays plain. Varies by instance index. */
export function grainWarmVertices(mat: THREE.MeshStandardNodeMaterial, axis: GrainAxis) {
  const vc: N = vertexColor();
  const warm: N = smoothstep(float(0.05), float(0.2), vc.r.sub(vc.b));
  const base: N = mat.colorNode ?? materialColor;
  mat.colorNode = base.mul(mix(vec3(1), woodGrain(axis, 'instance') as N, warm));
}

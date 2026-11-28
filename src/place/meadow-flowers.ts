// The meadow's planted flowers and grass tufts across Home's lawn (docs/game-design/place.md, "The meadow"): low-poly,
// flat-shaded, instanced. Nothing is planted on the CPU: each instance has a seed in a square tile that wraps round a
// point just ahead of the camera, and the vertex stage reads the meadow's maps (meadow-field.ts) and the path field to
// decide where it stands, how big it is and whether it exists at all. A seed's world position is the seed plus whole
// tiles, so it does not depend on the camera: every player sees the same meadow, and a cheaper tier draws the first
// part of the same shuffled list.
// Two rings, so only what is near is drawn in full: a near tile of whole flowers (12 triangles) and tufts (10), and a
// far tile of four-triangle flowers and two-triangle tufts that grow in where the near ones shrink away. Each
// instance shrinks to nothing at its own distance, so no ring has an edge and nothing pops as a tile wraps; beyond
// the far ring the lawn's own specks carry the colour (meadow.ts). No colliders, no shadow casting, no per-frame CPU
// work. The keep map bakes here, a slice at a time after the first frame; until it is in, nothing grows. Local.
import * as THREE from 'three/webgpu';
import {
  attribute,
  cameraPosition,
  cameraViewMatrix,
  cameraWorldMatrix,
  clamp as tslClamp,
  cos,
  floor,
  float,
  length,
  mix,
  normalFlat,
  positionGeometry,
  select,
  sin,
  smoothstep,
  texture,
  time,
  varying,
  vec2,
  vec3,
  vec4,
} from 'three/tsl';
import { isTouch, reducedMotion } from '../constants.ts';
import { windAt } from '../render/wind.ts';
import { mulberry32 } from '../math.ts';
import type { OwnedView } from '../render/owned-view.ts';
import { GRID, ORIGIN } from './layout.ts';
import { selectiveColour } from './look.ts';
import { prof } from '../loop.ts';
import { keepBakeByFrame } from './meadow-field.ts';
import { MEADOW } from './meadow-flags.ts';
import {
  byKind,
  flowerDrift,
  flowerKind,
  heartColour,
  meadowGreen,
  meadowKeepAt,
  meadowNoiseAt,
  petalColour,
  setMeadowKeep,
} from './meadow.ts';
import { FIELD_CELL, FIELD_H, FIELD_W } from './path-field.ts';
import { pathFieldTexture } from './path-surface.ts';
import { CELL, NX, NZ, heights } from './terrain.ts';

// TSL's types don't follow these graphs; kept loose like look.ts.
// oxlint-disable-next-line typescript/no-explicit-any
type N = any;
const linear = (hex: string) => {
  const c = new THREE.Color(hex);
  return vec3(c.r, c.g, c.b);
};

/** A ring: its tile's side (an instance is gone by half of it), how far ahead of the camera its centre sits when the
 * camera looks level, and its seeds before the maps thin them (the drawn count is well under these). */
const NEAR = { tile: 32, lead: 9, flowers: 1700, tufts: 2300 },
  FAR = { tile: 96, lead: 19, flowers: 12000, tufts: 7000 };
/** Metres from the near ring's centre over which the far ring's instances grow in, as the near ones shrink away. */
const HANDOVER = { from: 10.5, to: 16 };
/** The share of each list a device draws. A touch device (the owner's iPad) draws about half; a phone-sized screen
 * draws the near ring thinly, a third of the far flowers and no far tufts. */
const TIERS = {
  desktop: { near: 1, farFlowers: 1, farTufts: 1 },
  touch: { near: 0.6, farFlowers: 0.5, farTufts: 0.35 },
  phone: { near: 0.4, farFlowers: 0.3, farTufts: 0 },
} as const;
function tier() {
  if (MEADOW.tier === 'desktop' || MEADOW.tier === 'touch' || MEADOW.tier === 'phone') return TIERS[MEADOW.tier];
  if (!isTouch) return TIERS.desktop;
  return Math.min(screen.width, screen.height) < 500 ? TIERS.phone : TIERS.touch;
}

/** `count` seeds, evenly spread over the tile and then shuffled, so any leading part of the list is evenly spread
 * too: x, z in the tile and two random numbers. */
function seeds(count: number, tile: number, salt: number) {
  const side = Math.ceil(Math.sqrt(count)),
    step = tile / side,
    random = mulberry32(salt);
  const all: number[][] = [];
  for (let k = 0; k < side * side; k++)
    all.push([((k % side) + random()) * step, (Math.floor(k / side) + random()) * step, random(), random()]);
  for (let k = all.length - 1; k > 0; k--) {
    const other = Math.floor(random() * (k + 1));
    [all[k], all[other]] = [all[other]!, all[k]!];
  }
  return new THREE.InstancedBufferAttribute(new Float32Array(all.slice(0, count).flat()), 4);
}

type Corner = [number, number, number];
type Tri = { at: [Corner, Corner, Corner]; part: [number, number, number] };
let bounds: THREE.Box3 | null = null;
/** The lawn's real bounds: the land's grid and its heights. */
function lawnBounds() {
  if (bounds) return bounds;
  let low = Infinity,
    high = -Infinity;
  for (const h of heights) {
    low = Math.min(low, h);
    high = Math.max(high, h);
  }
  return (bounds = new THREE.Box3(
    new THREE.Vector3(ORIGIN.x + GRID.x0, Math.max(low, 0), ORIGIN.z + GRID.z0),
    new THREE.Vector3(ORIGIN.x + GRID.x1, high + 1.5, ORIGIN.z + GRID.z1),
  ));
}
/** A non-indexed, instanced geometry from triangles, each with one `part` number per corner, drawing `share` of its
 * seeds. */
function instanced(tris: Tri[], seed: THREE.InstancedBufferAttribute, share: number) {
  const geo = new THREE.InstancedBufferGeometry();
  geo.setAttribute(
    'position',
    new THREE.Float32BufferAttribute(
      tris.flatMap((t) => t.at.flat()),
      3,
    ),
  );
  geo.setAttribute(
    'meadowPart',
    new THREE.Float32BufferAttribute(
      tris.flatMap((t) => t.part),
      1,
    ),
  );
  geo.setAttribute('meadowSeed', seed);
  geo.instanceCount = Math.floor(seed.count * share);
  geo.boundingBox = lawnBounds();
  geo.boundingSphere = lawnBounds().getBoundingSphere(new THREE.Sphere());
  return geo;
}

const ring = (n: number, r: number, y: (k: number) => number, turn = 0) =>
  Array.from({ length: n }, (_, k): Corner => {
    const a = turn + (k / n) * Math.PI * 2;
    return [Math.cos(a) * r, y(k), Math.sin(a) * r];
  });
const TOP = 0.4,
  TILT = 0.3;
/** A head's corner, tipped a little off level about the stem's top. */
const tipped = (x: number, y: number, z: number): Corner => [
  x * Math.cos(TILT) - (y - TOP) * Math.sin(TILT),
  TOP + x * Math.sin(TILT) + (y - TOP) * Math.cos(TILT),
  z,
];
/** One flower, metres, 12 triangles: a three-sided stem (part 0), a six-sided head whose rim rises and falls so each
 * petal is its own facet (part 1), and a small three-sided heart (part 2). */
function flowerTriangles() {
  const tris: Tri[] = [];
  const foot = ring(3, 0.035, () => -0.06);
  for (let k = 0; k < 3; k++) tris.push({ at: [foot[k]!, foot[(k + 1) % 3]!, [0, TOP, 0]], part: [0, 0, 0] });
  const rim = ring(6, 0.2, (k) => TOP + (k % 2 ? 0.06 : -0.005)).map((p) => tipped(...p));
  for (let k = 0; k < 6; k++)
    tris.push({ at: [rim[k]!, tipped(0, TOP + 0.015, 0), rim[(k + 1) % 6]!], part: [1, 1, 1] });
  const heart = ring(3, 0.075, () => TOP + 0.02, 0.5).map((p) => tipped(...p));
  for (let k = 0; k < 3; k++)
    tris.push({ at: [heart[k]!, tipped(0, TOP + 0.085, 0), heart[(k + 1) % 3]!], part: [2, 2, 2] });
  return tris;
}
/** The far flower, 4 triangles: one for the stem and a five-cornered head of the same span, tipped the same way. */
function farFlowerTriangles(): Tri[] {
  const rim = ring(5, 0.2, () => TOP + 0.02, 0.4).map((p) => tipped(...p));
  return [
    {
      at: [
        [-0.04, -0.06, 0],
        [0.04, -0.06, 0],
        [0, TOP, 0],
      ],
      part: [0, 0, 0],
    },
    { at: [rim[0]!, rim[1]!, rim[2]!], part: [1, 1, 1] },
    { at: [rim[0]!, rim[2]!, rim[3]!], part: [1, 1, 1] },
    { at: [rim[0]!, rim[3]!, rim[4]!], part: [1, 1, 1] },
  ];
}
/** One tuft, metres, 10 triangles: five chunky blades leaning out, each folded down its spine so its two faces
 * catch the light differently. `part` is the height up the blade, 0 at the root and 1 at the tip. */
function tuftTriangles() {
  const tris: Tri[] = [];
  const blades = [
    { turn: 0.2, lean: 0.1, tall: 0.34, wide: 0.24 },
    { turn: 1.5, lean: 0.22, tall: 0.25, wide: 0.26 },
    { turn: 2.7, lean: 0.16, tall: 0.3, wide: 0.22 },
    { turn: 4.0, lean: 0.24, tall: 0.2, wide: 0.26 },
    { turn: 5.2, lean: 0.14, tall: 0.27, wide: 0.22 },
  ];
  for (const b of blades) {
    const out: [number, number] = [Math.cos(b.turn), Math.sin(b.turn)],
      across: [number, number] = [-out[1], out[0]];
    const root = (side: number, forward: number): Corner => [
      out[0] * (0.03 + forward) + across[0] * side * b.wide * 0.5,
      -0.05,
      out[1] * (0.03 + forward) + across[1] * side * b.wide * 0.5,
    ];
    const tip: Corner = [out[0] * (0.03 + b.lean), b.tall, out[1] * (0.03 + b.lean)];
    const spine = root(0, 0.045);
    tris.push({ at: [root(-1, 0), spine, tip], part: [0, 0, 1] }, { at: [spine, root(1, 0), tip], part: [0, 0, 1] });
  }
  return tris;
}
/** The far tuft, 2 triangles: two fat blades crossed, about the whole tuft's span. */
function farTuftTriangles(): Tri[] {
  return [
    {
      at: [
        [-0.2, -0.05, -0.05],
        [0.2, -0.05, 0.05],
        [0.04, 0.33, 0],
      ],
      part: [0, 0, 1],
    },
    {
      at: [
        [0.05, -0.05, -0.2],
        [-0.05, -0.05, 0.2],
        [-0.03, 0.28, 0.04],
      ],
      part: [0, 0, 1],
    },
  ];
}

let heightMap: THREE.DataTexture | null = null;
/** The land's heights on its own 2 m grid, as two half floats a texel that add up to the height: quarter metres and
 * the rest. One half float alone is 6 cm coarse on the high ground; a stem would float or sink. */
function heightTexture() {
  if (heightMap) return heightMap;
  const data = new Uint16Array(NX * NZ * 4);
  for (let k = 0; k < NX * NZ; k++) {
    const coarse = Math.floor(heights[k]! * 4) / 4;
    data[k * 4] = THREE.DataUtils.toHalfFloat(coarse);
    data[k * 4 + 1] = THREE.DataUtils.toHalfFloat(heights[k]! - coarse);
  }
  heightMap = new THREE.DataTexture(data, NX, NZ, THREE.RGBAFormat, THREE.HalfFloatType);
  heightMap.name = 'place-meadow-heights';
  heightMap.minFilter = heightMap.magFilter = THREE.LinearFilter;
  heightMap.generateMipmaps = false;
  heightMap.colorSpace = THREE.NoColorSpace;
  heightMap.needsUpdate = true;
  return heightMap;
}

type Ring = typeof NEAR;
/** A ring's centre: a little ahead of the camera, by how level it looks, so most of the planting is in view. */
const centreOf = (r: Ring): N => cameraPosition.xz.add(cameraWorldMatrix.mul(vec4(0, 0, -1, 0)).xz.mul(r.lead));

/** Where an instance stands and how much of it there is: its world xz, the collider's height there, the noise and
 * keep samples, how far off a path it is (0 at the verge's start, 1 well clear) and a 0..1 presence that folds in the
 * path, the keep map and the ring's distance fades. `thin` is how much of the reach each instance keeps, so a ring
 * thins toward its edge instead of ending on a line. */
function standing(seed: N, r: Ring, thin: number) {
  const eye: N = centreOf(r);
  const world: N = seed.xy.add(floor(eye.sub(seed.xy).div(r.tile).add(0.5)).mul(r.tile));
  const grid: N = world.sub(vec2(ORIGIN.x + GRID.x0, ORIGIN.z + GRID.z0)).div(CELL);
  const cell: N = tslClamp(floor(grid), vec2(0, 0), vec2(NX - 2, NZ - 2));
  const part: N = tslClamp(grid.sub(cell), 0, 1);
  // Texel centres of a linear texture give the texels themselves: the cell's four corner heights.
  const cornerHeight = (dx: number, dz: number): N => {
    const texel: N = texture(heightTexture(), cell.add(vec2(dx + 0.5, dz + 0.5)).div(vec2(NX, NZ)));
    return texel.r.add(texel.g);
  };
  const a: N = cornerHeight(0, 0),
    b: N = cornerHeight(1, 0),
    c: N = cornerHeight(0, 1),
    d: N = cornerHeight(1, 1);
  // The collider's own two triangles (ground-layers.ts colliderHeight), so a stem meets the ground it stands on.
  const height: N = select(
    part.x.add(part.y).lessThanEqual(1),
    a.add(b.sub(a).mul(part.x)).add(c.sub(a).mul(part.y)),
    d.add(c.sub(d).mul(part.x.oneMinus())).add(b.sub(d).mul(part.y.oneMinus())),
  );
  const pathUv: N = world
    .sub(vec2(ORIGIN.x + GRID.x0, ORIGIN.z + GRID.z0))
    .div(FIELD_CELL)
    .add(0.5)
    .div(vec2(FIELD_W, FIELD_H));
  // Metres off the nearest tread's edge (negative on it). The drawn edge wanders by up to 0.31 m (path-surface.ts)
  // and its verge is darker out to about a metre: planting starts beyond the wander, thin at first.
  const offTread: N = texture(pathFieldTexture(), pathUv).r;
  const kept: N = meadowKeepAt(world);
  // About a metre off a wall, a kerb or a footing: 0.7 m at the least, full size by 1.2 m.
  const open: N = smoothstep(0.175, 0.3, kept.r);
  const away: N = length(world.sub(eye));
  const gone: N = seed.z
    .mul(thin)
    .oneMinus()
    .mul(r.tile / 2);
  const near: N = smoothstep(gone.sub(r.tile / 8), gone, away).oneMinus();
  const grownIn: N = r === FAR ? smoothstep(HANDOVER.from, HANDOVER.to, length(world.sub(centreOf(NEAR)))) : float(1);
  return {
    world,
    height,
    kept,
    sample: meadowNoiseAt(world),
    clearOfPath: smoothstep(1.3, 3.8, offTread),
    presence: smoothstep(0.45, 1.3, offTread).mul(open).mul(near).mul(grownIn),
  };
}

/** The instance's corner, moved to where it stands: turned about its stem, scaled, and leant by a slow gust that
 * travels across the meadow (more the higher up the corner is). */
function planted(seed: N, world: N, height: N, scale: N, sway: N, sharedWind = false) {
  const local: N = positionGeometry;
  const turn: N = seed.w.mul(Math.PI * 2);
  const turned: N = vec2(
    local.x.mul(cos(turn)).sub(local.z.mul(sin(turn))),
    local.x.mul(sin(turn)).add(local.z.mul(cos(turn))),
  );
  const gust: N = sharedWind
    ? windAt(vec3(world.x, height, world.y))
    : sin(time.mul(0.9).add(world.x.mul(0.11)).add(world.y.mul(0.07)))
        .mul(0.7)
        .add(sin(time.mul(2.3).add(world.x.mul(0.53)).sub(world.y.mul(0.31))).mul(0.3));
  const lean: N = reducedMotion ? float(0) : local.y.max(0).mul(local.y.max(0)).mul(gust).mul(sway);
  return vec3(
    world.x.add(turned.x.add(lean).mul(scale)),
    height.add(local.y.mul(scale)),
    world.y.add((sharedWind ? turned.y : turned.y.add(lean.mul(0.45))).mul(scale)),
  );
}

/** Flat facets, each leant toward straight up by `up`: a blade or petal seen side-on would otherwise be lit as a wall
 * and stand dark against the lawn it grows from. */
function material(up: number) {
  const m = new THREE.MeshStandardNodeMaterial({ roughness: 0.95, flatShading: true, side: THREE.DoubleSide });
  m.name = 'place-meadow';
  m.normalNode = normalFlat.add(cameraViewMatrix.mul(vec4(0, 1, 0, 0)).xyz.mul(up)).normalize();
  return m;
}

/** Flowers: four kinds, each keeping to its own band of the zone noise. Thick drifts and bare stretches on open
 * ground, thin and even on the town's green, and lighter along a path's edge so the tread stays the line to follow. */
function flowerMesh(r: Ring, tris: Tri[], share: number, salt: number) {
  const seed: N = attribute('meadowSeed', 'vec4');
  const s = standing(seed, r, 0.5);
  // Each seed has its own threshold, so a drift's edge is loose.
  const own: N = seed.z.mul(7.31).fract();
  const drift: N = flowerDrift(s.sample, s.kept).mul(mix(0.45, 1, s.clearOfPath));
  const grown: N = smoothstep(0, 0.1, drift.sub(own.mul(0.9).add(0.05)));
  const kind: N = flowerKind(s.sample, own);
  const petal: N = varying(petalColour(kind));
  const heart: N = varying(heartColour(kind));
  const tall: N = byKind(kind, [float(1), float(0.8), float(1.15), float(0.95)]);
  const scale: N = grown.mul(s.presence).mul(seed.w.mul(3.7).fract().mul(0.5).add(0.85)).mul(tall);
  const m = material(0.8);
  m.positionNode = planted(seed, s.world, s.height, scale, 0.1);
  const stem: N = selectiveColour(linear('#568740'), 'grass');
  const part: N = attribute('meadowPart', 'float');
  m.colorNode = select(part.lessThan(0.5), stem, select(part.lessThan(1.5), petal, heart));
  const mesh = new THREE.Mesh(instanced(tris, seeds(r.flowers, r.tile, salt), share), m);
  mesh.name = r === NEAR ? 'place-meadow-flowers' : 'place-meadow-flowers-far';
  return mesh;
}

/** Tufts: everywhere on the lawn, thicker where the ground is lush and thinner in the town, in the ground's own green. */
function tuftMesh(r: Ring, tris: Tri[], share: number, salt: number) {
  const seed: N = attribute('meadowSeed', 'vec4');
  const s = standing(seed, r, 0.6);
  const own: N = seed.z.mul(5.17).fract();
  const lush: N = smoothstep(0.2, 0.75, s.sample.r)
    .oneMinus()
    .mul(0.6)
    .add(0.4)
    .mul(mix(0.55, 1, s.kept.g));
  const grown: N = smoothstep(0, 0.12, lush.sub(own));
  const scale: N = grown.mul(s.presence).mul(seed.w.mul(2.9).fract().mul(0.5).add(0.8));
  const m = material(2.5);
  const near = r === NEAR;
  // Only the Camp shoulder's verge gets the deeper bend. Presence already keeps roots off the tread.
  const sway = near ? s.kept.a.mul(s.clearOfPath.oneMinus()).mul(0.9).add(0.16) : 0.16;
  m.positionNode = planted(seed, s.world, s.height, scale, sway, near);
  // The ground's own green here (the tint's, or without it the plain lawn's mean: ground-material.ts), darker at the
  // root and lighter, a little yellower, at the tip.
  const green: N = MEADOW.tint ? varying(meadowGreen(s.sample)) : linear('#618f41').mul(vec3(0.89, 0.97, 0.8));
  const up: N = attribute('meadowPart', 'float');
  m.colorNode = selectiveColour(green.mul(mix(vec3(0.84, 0.9, 0.86), vec3(1.2, 1.18, 0.94), up)), 'grass');
  const mesh = new THREE.Mesh(instanced(tris, seeds(r.tufts, r.tile, salt), share), m);
  mesh.name = r === NEAR ? 'place-meadow-tufts' : 'place-meadow-tufts-far';
  return mesh;
}

/** Plant Home's lawn: up to four draws that leave with `owner`, and the keep map's bake, a slice a frame. */
export function addMeadowFlowers(owner: OwnedView) {
  const share = tier();
  const meshes = [
    flowerMesh(NEAR, flowerTriangles(), share.near, 0x5ca1ab1e),
    tuftMesh(NEAR, tuftTriangles(), share.near, 0x7af7ed),
    flowerMesh(FAR, farFlowerTriangles(), share.farFlowers, 0x0f10e25),
    ...(share.farTufts ? [tuftMesh(FAR, farTuftTriangles(), share.farTufts, 0x7af7ee)] : []),
  ];
  for (const mesh of meshes) {
    mesh.castShadow = false;
    mesh.receiveShadow = true;
    owner.cleanup(() => (mesh.material as THREE.Material).dispose());
    owner.add(mesh);
  }
  // The keep map bakes once a frame has been drawn, about 3 ms a frame, in the view's own frame step: it starts
  // after the game's start and gives way to every frame. Until it is in, nothing grows.
  const bake = keepBakeByFrame(() => prof.last.frames);
  owner.animate(() => {
    const map = bake();
    if (map) setMeadowKeep(map);
  }, 20);
}

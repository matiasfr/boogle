// `?meadow=flowers` (docs/research/small-magic-look.md, "What was built"): low-poly flowers in drifts and chunky grass
// tufts on one lawn wedge of Home, two instanced draws. Nothing is planted on the CPU: each instance has a seed in a
// square tile that wraps round the camera, and the vertex stage reads the meadow field (meadow-field.ts) and the path
// field to decide where it stands, how big it is and whether it exists at all. A seed's world position is the seed
// plus whole tiles, so it does not depend on the camera: every player sees the same meadow, and a touch device draws
// the first half of the same list. Each instance shrinks to nothing at its own distance, so there is no line where
// the meadow stops and nothing pops as the tile wraps. No colliders, no shadow casting, no per-frame CPU work. Local.
import * as THREE from 'three/webgpu';
import {
  attribute,
  cameraPosition,
  cameraViewMatrix,
  cameraWorldMatrix,
  clamp as tslClamp,
  cos,
  float,
  floor,
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
import { isTouch } from '../constants.ts';
import { mulberry32 } from '../math.ts';
import type { OwnedView } from '../render/owned-view.ts';
import { GRID, ORIGIN } from './layout.ts';
import { selectiveColour } from './look.ts';
import { MEADOW_BOUNDS, MEADOW_H, MEADOW_W } from './meadow-field.ts';
import { MEADOW } from './meadow-flags.ts';
import { meadowFieldTexture, meadowGreen, meadowGrid, meadowTap } from './meadow.ts';
import { FIELD_CELL, FIELD_H, FIELD_W } from './path-field.ts';
import { pathFieldTexture } from './path-surface.ts';

// TSL's types don't follow these graphs; kept loose like look.ts.
// oxlint-disable-next-line typescript/no-explicit-any
type N = any;
const linear = (hex: string) => {
  const c = new THREE.Color(hex);
  return vec3(c.r, c.g, c.b);
};

/** The tile's side, metres; an instance is gone by half of it. */
const TILE = 72,
  REACH = TILE / 2;
/** Seeds in the tile, before the field thins them: the drawn count is well under these. Halved on touch devices. */
const FLOWERS = 9000,
  TUFTS = 12000;

/** `count` seeds, evenly spread over the tile and then shuffled, so any leading part of the list is evenly spread
 * too: x, z in the tile and two random numbers. */
function seeds(count: number, salt: number) {
  const side = Math.ceil(Math.sqrt(count)),
    step = TILE / side,
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

type Tri = [number, number, number][];
/** A non-indexed, instanced geometry from triangles, each with one `part` number per corner. */
function instanced(tris: { at: Tri; part: [number, number, number] }[], seed: THREE.InstancedBufferAttribute) {
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
  geo.instanceCount = isTouch ? Math.floor(seed.count / 2) : seed.count;
  // Real bounds, so the frustum drops both draws when the wedge is out of view.
  const box = new THREE.Box3(new THREE.Vector3(...MEADOW_BOUNDS.min), new THREE.Vector3(...MEADOW_BOUNDS.max));
  geo.boundingBox = box;
  geo.boundingSphere = box.getBoundingSphere(new THREE.Sphere());
  return geo;
}

/** One flower, metres, 12 triangles: a three-sided stem (part 0), a six-sided head whose rim rises and falls so each
 * petal is its own facet (part 1), and a small three-sided heart (part 2). The head tips a little off level. */
function flowerTriangles() {
  const tris: { at: Tri; part: [number, number, number] }[] = [];
  const TOP = 0.4,
    tilt = 0.3;
  const tipped = (x: number, y: number, z: number): [number, number, number] => [
    x * Math.cos(tilt) - (y - TOP) * Math.sin(tilt),
    TOP + x * Math.sin(tilt) + (y - TOP) * Math.cos(tilt),
    z,
  ];
  const ring = (n: number, r: number, y: (k: number) => number, turn = 0) =>
    Array.from({ length: n }, (_, k): [number, number, number] => {
      const a = turn + (k / n) * Math.PI * 2;
      return [Math.cos(a) * r, y(k), Math.sin(a) * r];
    });
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

/** One tuft, metres, 10 triangles: five chunky blades leaning out, each folded down its spine so its two faces
 * catch the light differently. `part` is the height up the blade, 0 at the root and 1 at the tip. */
function tuftTriangles() {
  const tris: { at: Tri; part: [number, number, number] }[] = [];
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
    const root = (side: number, forward: number): [number, number, number] => [
      out[0] * (0.03 + forward) + across[0] * side * b.wide * 0.5,
      -0.05,
      out[1] * (0.03 + forward) + across[1] * side * b.wide * 0.5,
    ];
    const tip: [number, number, number] = [out[0] * (0.03 + b.lean), b.tall, out[1] * (0.03 + b.lean)];
    const spine = root(0, 0.045);
    tris.push({ at: [root(-1, 0), spine, tip], part: [0, 0, 1] }, { at: [spine, root(1, 0), tip], part: [0, 0, 1] });
  }
  return tris;
}

/** Where an instance stands and how much of it there is: its world xz, the collider's height there, the field's
 * sample, and a 0..1 presence that folds in the path, the wedge's rules and the distance fade (`thin`: how much of
 * the reach each instance keeps, so the planting thins toward its edge instead of ending on a ring). */
function standing(seed: N, thin: number) {
  // The tile sits a little ahead of the camera, by how level it looks, so most of the planting is in view.
  const eye: N = cameraPosition.xz.add(cameraWorldMatrix.mul(vec4(0, 0, -1, 0)).xz.mul(REACH * 0.4));
  const world: N = seed.xy.add(floor(eye.sub(seed.xy).div(TILE).add(0.5)).mul(TILE));
  const grid: N = meadowGrid(world);
  const cell: N = tslClamp(floor(grid), vec2(0, 0), vec2(MEADOW_W - 2, MEADOW_H - 2));
  const part: N = tslClamp(grid.sub(cell), 0, 1);
  const size = vec2(MEADOW_W, MEADOW_H);
  // Texel centres of a linear texture give the texels themselves: the cell's four corner heights.
  const corner = (dx: number, dz: number): N =>
    texture(meadowFieldTexture(), cell.add(vec2(dx + 0.5, dz + 0.5)).div(size)).r;
  const a: N = corner(0, 0),
    b: N = corner(1, 0),
    c: N = corner(0, 1),
    d: N = corner(1, 1);
  // The collider's own two triangles (ground-layers.ts colliderHeight), so a stem meets the ground it stands on.
  const height: N = select(
    part.x.add(part.y).lessThanEqual(1),
    a.add(b.sub(a).mul(part.x)).add(c.sub(a).mul(part.y)),
    d.add(c.sub(d).mul(part.x.oneMinus())).add(b.sub(d).mul(part.y.oneMinus())),
  );
  const sample: N = meadowTap(grid);
  const pathUv: N = world
    .sub(vec2(ORIGIN.x + GRID.x0, ORIGIN.z + GRID.z0))
    .div(FIELD_CELL)
    .add(0.5)
    .div(vec2(FIELD_W, FIELD_H));
  // Metres off the nearest tread's edge (negative on it). The drawn edge wanders by up to 0.31 m (path-surface.ts)
  // and its verge is darker out to about a metre: planting starts beyond the wander, thin at first.
  const offPath: N = smoothstep(0.45, 1.3, texture(pathFieldTexture(), pathUv).r);
  const allowed: N = smoothstep(0.8, 0.97, sample.g);
  const away: N = length(world.sub(eye));
  const gone: N = seed.z.mul(thin).oneMinus().mul(REACH);
  const near: N = smoothstep(gone.sub(7), gone, away).oneMinus();
  return { world, height, sample, presence: offPath.mul(allowed).mul(near) };
}

/** The instance's corner, moved to where it stands: turned about its stem, scaled, and leant by a slow gust that
 * travels across the meadow (more the higher up the corner is). */
function planted(seed: N, world: N, height: N, scale: N, sway: number) {
  const local: N = positionGeometry;
  const turn: N = seed.w.mul(Math.PI * 2);
  const turned: N = vec2(
    local.x.mul(cos(turn)).sub(local.z.mul(sin(turn))),
    local.x.mul(sin(turn)).add(local.z.mul(cos(turn))),
  );
  const gust: N = sin(time.mul(0.9).add(world.x.mul(0.11)).add(world.y.mul(0.07)))
    .mul(0.7)
    .add(sin(time.mul(2.3).add(world.x.mul(0.53)).sub(world.y.mul(0.31))).mul(0.3));
  const lean: N = local.y.max(0).mul(local.y.max(0)).mul(gust).mul(sway);
  return vec3(
    world.x.add(turned.x.add(lean).mul(scale)),
    height.add(local.y.mul(scale)),
    world.y.add(turned.y.add(lean.mul(0.45)).mul(scale)),
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

/** Flowers: four kinds, each keeping to its own band of the zone noise, in drifts where the `sun` noise is high. */
function flowerMesh() {
  const seed: N = attribute('meadowSeed', 'vec4');
  const s = standing(seed, 0.5);
  // A drift: nothing below the threshold, thick above it. Each seed has its own threshold, so a drift's edge is loose.
  const own: N = seed.z.mul(7.31).fract();
  const drift: N = smoothstep(0.38, 0.72, s.sample.b);
  const grown: N = smoothstep(0, 0.1, drift.sub(own.mul(0.9).add(0.05)));
  // Four bands of the zone noise; a seed strays a little, so two kinds mingle only along a border.
  const kind: N = floor(tslClamp(s.sample.a.mul(4).add(own.sub(0.5).mul(0.5)), 0, 3.99));
  const pick = (values: N[]): N =>
    select(
      kind.lessThan(1),
      values[0],
      select(kind.lessThan(2), values[1], select(kind.lessThan(3), values[2], values[3])),
    );
  const petal: N = varying(pick([linear('#f3efe2'), linear('#f2c531'), linear('#ee86b0'), linear('#6f8ff0')]));
  const heart: N = varying(pick([linear('#f0b92c'), linear('#de7f1c'), linear('#f6e7a0'), linear('#f3ecc4')]));
  const tall: N = pick([float(1), float(0.8), float(1.15), float(0.95)]);
  const scale: N = grown.mul(s.presence).mul(seed.w.mul(3.7).fract().mul(0.5).add(0.85)).mul(tall);
  const m = material(0.8);
  m.positionNode = planted(seed, s.world, s.height, scale, 0.1);
  const stem: N = selectiveColour(linear('#568740'), 'grass');
  const part: N = attribute('meadowPart', 'float');
  m.colorNode = select(part.lessThan(0.5), stem, select(part.lessThan(1.5), petal, heart));
  const mesh = new THREE.Mesh(instanced(flowerTriangles(), seeds(FLOWERS, 0x5ca1ab1e)), m);
  mesh.name = 'place-meadow-flowers';
  return mesh;
}

/** Tufts: everywhere on the wedge's lawn, thicker where the ground is lush, in the ground's own green. */
function tuftMesh() {
  const seed: N = attribute('meadowSeed', 'vec4');
  const s = standing(seed, 0.6);
  const own: N = seed.z.mul(5.17).fract();
  const lush: N = smoothstep(0.2, 0.75, s.sample.b).oneMinus().mul(0.6).add(0.4);
  const grown: N = smoothstep(0, 0.12, lush.sub(own));
  const scale: N = grown.mul(s.presence).mul(seed.w.mul(2.9).fract().mul(0.5).add(0.8));
  const m = material(2.5);
  m.positionNode = planted(seed, s.world, s.height, scale, 0.16);
  // The ground's own green here (the tint's with `?meadow=tint`, else the plain lawn's mean: ground-material.ts),
  // darker at the root and lighter, a little yellower, at the tip.
  const green: N = MEADOW.tint ? varying(meadowGreen(s.sample)) : linear('#618f41').mul(vec3(0.89, 0.97, 0.8));
  const up: N = attribute('meadowPart', 'float');
  m.colorNode = selectiveColour(green.mul(mix(vec3(0.84, 0.9, 0.86), vec3(1.2, 1.18, 0.94), up)), 'grass');
  const mesh = new THREE.Mesh(instanced(tuftTriangles(), seeds(TUFTS, 0x7af7ed)), m);
  mesh.name = 'place-meadow-tufts';
  return mesh;
}

/** Plant the wedge: two draws that leave with `owner`. */
export function addMeadowFlowers(owner: OwnedView) {
  meadowFieldTexture(); // bakes the field, which sets the wedge's bounds
  for (const mesh of [flowerMesh(), tuftMesh()]) {
    mesh.castShadow = false;
    mesh.receiveShadow = true;
    owner.cleanup(() => (mesh.material as THREE.Material).dispose());
    owner.add(mesh);
  }
}

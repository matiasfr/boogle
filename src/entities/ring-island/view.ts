// Ring Island's near view (docs/plans/ring-island-build1.md, R2b): the folk's side as R1 lays it out
// (src/sim/railway-ring-layout.ts). Their half-crossing (the Pilgrims' Way, u 277-470) with laid double track and truss
// posts, the hinge pier, the brace platform with its gold strut and a waving folk, the steps up to their deck, the
// hinge pier's sea ramp, the raised leaf (a pivot group R4c turns through ringIslandPose, its bracket empty and its
// outline painted), the island halt's two platforms (and the foot crossing at their south end) with the RINGWORKS
// board, the fingerpost (emblems only), the low map table, the crossover, the works yard (steel under a tarp, the drop
// hammer, the prophecy mural), the path to the summit lookout with its footbridge over the stack line's cutting (plain
// solid blocks: docs/plans/ring-summit-path.md) and a line of marker rocks on the cutting's summit-side rim, and the
// ground with its sand band. Nothing here does
// anything yet and nothing prompts (call 22). Static geometry merged into one vertex-coloured mesh; the leaf, its bracket, the hammer's head and the board's
// face are their own. Colliders: the ground's heightfield, the decks, ramps, platforms and yard, the leaf (kinematic).
// Local: no state, no sync. Positions in world metres from (u, lat) metres via ringAt.
// The furnishing (the folk, the RINGWORKS board, the works yard, the drop hammer, the works wall and mural, the
// fingerpost, the map table and the summit lookout) is records (content/prefabs/ring-island.ts), standing where
// content/levels/ring-island.ts puts them in the island's frames; their solids come on and off with the near view.
import * as THREE from 'three/webgpu';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { BODY, createBody, type Body, type Shape } from '../../physics/engine.ts';
import { createOwnedView } from '../../render/owned-view.ts';
import { instantiate } from '../../prefab/instantiate.ts';
import { definitions } from '../../prefab/catalogue.ts';
import { loadLevelArtifact } from '../../prefab/validate.ts';
import type { Json, JsonObject, Placement } from '../../prefab/types.ts';
import level from '../../../content/built/levels/ring-island.json' with { type: 'json' };
import { GROUP, groundMat } from '../../physics/physics.ts';
import { getAudio } from '../../render/audio.ts';
import { hearGain } from '../../render/hearing.ts';
import { camera } from '../../render/scene.ts';
import { freezeInPlace } from '../../render/instances.ts';
import { PLAYER_R } from '../../constants.ts';
import { siteExit } from '../../place/site-clearance.ts';
import { outOf } from '../../place/sites.ts';
import type { FrameCtx } from '../../loop.ts';
import {
  RING_BRACE,
  RING_BRACE_PLATFORM,
  RING_END,
  RING_FORMATION,
  RING_GAP,
  RING_HALT,
  RING_RAMPS,
  RING_STEPS,
  ringAt,
  ringDeckY,
  type RingFlight,
  type RingLanding,
} from '../../sim/railway-ring-layout.ts';
import { LANDING, type Cone, type IslandGround } from './ground.ts';
import { SUMMIT_BRIDGE, summitBridge, summitPath, summitPathFoot, summitRimRockShape, summitRimRocks } from './path.ts';
import { RING_CROSSING, RING_MAP_TABLE, ringCrossingPlanks, ringIslandPose } from './state.ts';
import { addFarGround } from '../../place/far-ground.ts';
import { BRACKET_Z, CRADLE, HANGER, PLATE_BOTTOM, WEIGHT, WEIGHT_X } from './bracket.ts';
import {
  LEAF_ORANGE,
  PENNANT_CREAM,
  PENNANT_POLE,
  POLE_PENNANT,
  pennantFooting,
  pennantGeometry,
} from '../ring-island-far/view.ts';

// ---------------------------------------------------------------- the layout, in metres
const FORM = {
  left: RING_FORMATION.left / 100,
  right: RING_FORMATION.right / 100,
  mid: RING_FORMATION.mid / 100,
};
const TRACKS = RING_FORMATION.tracks.map((t) => t / 100);
const HINGE = RING_GAP.hinge / 100,
  GAP = RING_GAP.leaf / 100;
const HALT = [RING_HALT.u0 / 100, RING_HALT.u1 / 100] as const;
const WAY_END = HALT[1] + 2;
const deckY = (u: number) => ringDeckY(Math.round(u * 100)) / 100;
const HINGE_Y = deckY(HINGE),
  HALT_Y = RING_HALT.y / 100,
  PLATFORM_Y = HALT_Y + 0.9;
const BRACE = {
  u0: RING_BRACE_PLATFORM.u0 / 100,
  u1: RING_BRACE_PLATFORM.u1 / 100,
  l0: RING_BRACE_PLATFORM.lat0 / 100,
  l1: RING_BRACE_PLATFORM.lat1 / 100,
  y: RING_BRACE_PLATFORM.y / 100,
};
/** World (x, z) metres of (u, lat) metres. */
const at = (u: number, lat = 0) => {
  const p = ringAt(Math.round(u * 100), Math.round(lat * 100));
  return { x: p.x / 100, z: p.z / 100 };
};
const p3 = (u: number, lat: number, y: number) => ({ ...at(u, lat), y });
/** The line's yaw: a box's local z runs along u. */
const YAW = Math.atan2(0.0272, -1);
/** The drop hammer (call 19): lift 0.6 s, a short hold, drop, thump, every 2.4 s; heard within 120 m. */
const HAMMER = { cycle: 2.4, lift: 0.6, hold: 0.25, drop: 0.18, rise: 2.6, hear: 120 };

// ---------------------------------------------------------------- colours (the greybox's; the furnishing's records
// carry their own, the same palette)
const TIMBER = '#8a6a48',
  TIMBER_DARK = '#6a5038',
  STEEL = '#e8742c', // the folk's orange steel
  STEEL_DARK = '#b8551e',
  GOLD = '#ffc83a',
  RAIL = '#3d3a38',
  BED = '#5d5650',
  CONCRETE = '#a6a29a',
  SAND = '#d6c69c',
  PATH = '#c9b48a',
  LAND = '#4a4d5c', // buildFar's cones
  LAND2 = '#3b3e4c',
  ROCK = '#7d7a78', // the cuttings' faces
  STONE = '#c4beb0'; // the rim's marker rocks, paler than the cut rock behind them

/** Geometry merged into one vertex-coloured mesh, and the solids beside it: `shapes` the island's own body's, `clearance`
 * every fixed solid in build order, records' included (the mount clearance's order). */
function createParts() {
  const list: THREE.BufferGeometry[] = [];
  const shapes: Shape[] = [],
    clearance: Shape[] = [];
  const colour = new THREE.Color();
  function add(color: string, geo: THREE.BufferGeometry, m?: THREE.Matrix4) {
    if (m) geo.applyMatrix4(m);
    const g = geo.index ? geo.toNonIndexed() : geo;
    g.deleteAttribute('uv');
    colour.set(color);
    const n = g.getAttribute('position').count,
      c = new Float32Array(n * 3);
    for (let k = 0; k < n; k++) c.set([colour.r, colour.g, colour.b], k * 3);
    g.setAttribute('color', new THREE.BufferAttribute(c, 3));
    list.push(g);
  }
  function solid(w: number, h: number, d: number, m: THREE.Matrix4) {
    const p = new THREE.Vector3(),
      q = new THREE.Quaternion(),
      s = new THREE.Vector3();
    m.decompose(p, q, s);
    const shape: Shape = {
      kind: 'box',
      hx: w / 2,
      hy: h / 2,
      hz: d / 2,
      offset: { x: p.x, y: p.y, z: p.z },
      rotation: { x: q.x, y: q.y, z: q.z, w: q.w },
    };
    shapes.push(shape);
    clearance.push(shape);
  }
  const merged = () => {
    const geo = mergeGeometries(list);
    for (const g of list) g.dispose();
    list.length = 0;
    return geo;
  };
  return { add, solid, shapes, clearance, merged };
}
type Parts = ReturnType<typeof createParts>;

function clearanceShape(shape: Shape, parent = new THREE.Matrix4()) {
  if (shape.kind !== 'box' && shape.kind !== 'cylinder') throw new Error('Unexpected ring scenery shape');
  const offset = new THREE.Vector3().copy(shape.offset ?? { x: 0, y: 0, z: 0 });
  const rotation = new THREE.Quaternion().copy(shape.rotation ?? { x: 0, y: 0, z: 0, w: 1 });
  const matrix = parent.clone().multiply(new THREE.Matrix4().compose(offset, rotation, new THREE.Vector3(1, 1, 1)));
  const inverse = matrix.clone().invert();
  const extent =
    shape.kind === 'box'
      ? new THREE.Vector3(shape.hx, shape.hy, shape.hz)
      : new THREE.Vector3(Math.max(shape.rBottom, shape.rTop), shape.h / 2, Math.max(shape.rBottom, shape.rTop));
  const local = new THREE.Box3(extent.clone().negate(), extent);
  const bounds = local.clone().applyMatrix4(matrix);
  const centre = bounds.getCenter(new THREE.Vector3()),
    size = bounds.getSize(new THREE.Vector3());
  const foot = { x: centre.x, z: centre.z, c: 1, s: 0, hw: size.x / 2, hd: size.z / 2 };
  const faces: THREE.Triangle[] = [];
  if (shape.kind === 'cylinder') {
    const mesh = new THREE.CylinderGeometry(
      shape.rTop,
      shape.rBottom,
      shape.h,
      shape.segments,
      1,
      false,
      Math.PI / 2,
    ).toNonIndexed();
    const pos = mesh.getAttribute('position');
    const point = (index: number) => new THREE.Vector3().fromBufferAttribute(pos, index);
    for (let index = 0; index < pos.count; index += 3) {
      const face = new THREE.Triangle(point(index), point(index + 1), point(index + 2));
      if (face.getArea() > 0) faces.push(face);
    }
    mesh.dispose();
  }
  const point = new THREE.Vector3(),
    nearest = new THREE.Vector3();
  const distance = (position: THREE.Vector3Like) => {
    point.copy(position).applyMatrix4(inverse);
    if (!faces.length) return local.distanceToPoint(point);
    if (faces.every((face) => face.getNormal(nearest).dot(point) <= nearest.dot(face.a))) return 0;
    return Math.min(...faces.map((face) => face.closestPointToPoint(point, nearest).distanceTo(point)));
  };
  return {
    top: bounds.max.y,
    exit(position: THREE.Vector3Like) {
      if (Math.abs(position.x - foot.x) > foot.hw + PLAYER_R || Math.abs(position.z - foot.z) > foot.hd + PLAYER_R)
        return null;
      return siteExit(position, foot, centre.y, [], outOf, undefined, 0.02, distance);
    },
  };
}

function ringSceneryExit(
  position: THREE.Vector3Like,
  solids: ReturnType<typeof clearanceShape>[],
  height: (x: number, z: number) => number,
) {
  const result = new THREE.Vector3().copy(position);
  function floorAt(x: number, z: number, radius: number) {
    let floor = height(x, z) + radius;
    for (let ring = 1; ring <= 8; ring++) {
      const r = (radius * ring) / 8,
        rise = Math.sqrt(Math.max(0, radius * radius - r * r));
      for (let k = 0; k < 32; k++) {
        const angle = (k * Math.PI) / 16;
        floor = Math.max(floor, height(x + r * Math.cos(angle), z + r * Math.sin(angle)) + rise);
      }
    }
    return floor;
  }
  if (result.y < floorAt(result.x, result.z, PLAYER_R - 0.02)) result.y = floorAt(result.x, result.z, PLAYER_R) + 0.005;
  for (;;) {
    const hit = solids.find((solid) => solid.exit(result));
    if (!hit) break;
    const exit = hit.exit(result)!;
    const ground = floorAt(exit.x, exit.z, PLAYER_R) + 0.005;
    const destination = { ...exit, y: Math.max(result.y, ground) };
    if (Math.abs(ground - result.y) < 0.5 && !solids.some((solid) => solid.exit(destination))) return destination;
    result.y = hit.top + PLAYER_R + 0.02;
  }
  return result.y === position.y ? null : result;
}

/** The greybox's builders on R1's numbers (src/proto/greybox/ring.ts), writing into `parts`. */
function builders({ add, solid }: Parts) {
  const tmp = new THREE.Matrix4();
  /** A box from a to b (its centreline, top surface at a.y and b.y), w wide and h deep. */
  function beam(color: string, a: THREE.Vector3Like, b: THREE.Vector3Like, w: number, h: number, isSolid = true) {
    const dx = b.x - a.x,
      dy = b.y - a.y,
      dz = b.z - a.z,
      len = Math.hypot(dx, dz),
      full = Math.hypot(len, dy);
    const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.atan2(dy, len), Math.atan2(dx, dz), 0, 'YXZ'));
    const m = new THREE.Matrix4().compose(
      new THREE.Vector3((a.x + b.x) / 2, (a.y + b.y) / 2 - h / 2, (a.z + b.z) / 2),
      q,
      new THREE.Vector3(1, 1, 1),
    );
    add(color, new THREE.BoxGeometry(w, h, full + 0.04), m);
    if (isSolid) solid(w, h, full + 0.04, m);
  }
  /** An upright box, its top at `top`, yawed to the line: w across it, d along it. */
  function post(color: string, x: number, z: number, bottom: number, top: number, w: number, d = w, isSolid = true) {
    const m = new THREE.Matrix4().compose(
      new THREE.Vector3(x, (bottom + top) / 2, z),
      new THREE.Quaternion().setFromAxisAngle(THREE.Object3D.DEFAULT_UP, YAW),
      new THREE.Vector3(1, 1, 1),
    );
    add(color, new THREE.BoxGeometry(w, top - bottom, d), m);
    if (isSolid) solid(w, top - bottom, d, m);
  }
  /** An upright box over (u0..u1, l0..l1), bottom to top. */
  function block(
    color: string,
    u0: number,
    u1: number,
    l0: number,
    l1: number,
    bottom: number,
    top: number,
    isSolid = true,
  ) {
    const c = at((u0 + u1) / 2, (l0 + l1) / 2);
    post(color, c.x, c.z, bottom, top, l1 - l0, u1 - u0, isSolid);
  }
  /** A deck between u0 and u1 across [left, right], following `y(u)`, in `step` metre spans. */
  function deck(
    color: string,
    u0: number,
    u1: number,
    left: number,
    right: number,
    y: (u: number) => number,
    step = 10,
  ) {
    const mid = (left + right) / 2,
      w = right - left;
    for (let u = u0; u < u1 - 1e-6; u += step) {
      const v = Math.min(u1, u + step);
      beam(color, p3(u, mid, y(u)), p3(v, mid, y(v)), w, 0.5);
    }
  }
  /** Rails and a bed on each track, visual only. */
  function track(u0: number, u1: number, y: (u: number) => number, step = 10) {
    for (const t of TRACKS)
      for (let u = u0; u < u1 - 1e-6; u += step) {
        const v = Math.min(u1, u + step);
        beam(BED, p3(u, t, y(u) + 0.08), p3(v, t, y(v) + 0.08), 2.4, 0.1, false);
        for (const r of [-0.5, 0.5])
          beam(RAIL, p3(u, t + r, y(u) + 0.22), p3(v, t + r, y(v) + 0.22), 0.12, 0.14, false);
      }
  }
  /** A waist-high handrail with posts, from (u0, lat0) to (u1, lat1) with its foot at y0..y1. Visual only. */
  function handrail(u0: number, lat0: number, u1: number, lat1: number, y0: number, y1: number) {
    beam(STEEL, p3(u0, lat0, y0 + 1.05), p3(u1, lat1, y1 + 1.05), 0.07, 0.07, false);
    const n = Math.max(1, Math.round(Math.hypot(u1 - u0, lat1 - lat0) / 3));
    for (let k = 0; k <= n; k++) {
      const t = k / n,
        c = at(u0 + (u1 - u0) * t, lat0 + (lat1 - lat0) * t),
        y = y0 + (y1 - y0) * t;
      post(STEEL, c.x, c.z, y, y + 1.05, 0.08, 0.08, false);
    }
  }
  /** One ramp flight (RingFlight, cm): a smooth solid ramp, treads, kerbs and rails; a slipway is plain sand. */
  function flight(f: RingFlight) {
    const u0 = f.u0 / 100,
      u1 = f.u1 / 100,
      lat = f.lat / 100,
      y0 = f.y0 / 100,
      y1 = f.y1 / 100,
      W = 1.6;
    beam(f.slip ? SAND : CONCRETE, p3(u0, lat, y0), p3(u1, lat, y1), W, 0.4);
    if (f.slip) return;
    const len = Math.abs(u1 - u0),
      y = (t: number) => y0 + (y1 - y0) * t;
    for (let k = 0; k * 0.4 < len - 0.2; k++) {
      const t0 = (k * 0.4) / len,
        t1 = (k * 0.4 + 0.22) / len;
      beam(
        TIMBER,
        p3(u0 + (u1 - u0) * t0, lat, y(t0) + 0.05),
        p3(u0 + (u1 - u0) * t1, lat, y(t1) + 0.05),
        W - 0.3,
        0.05,
        false,
      );
    }
    for (const s of [-1, 1]) {
      beam(CONCRETE, p3(u0, lat + s * 0.74, y0 + 0.25), p3(u1, lat + s * 0.74, y1 + 0.25), 0.12, 0.25, false);
      handrail(u0, lat + s * 0.85, u1, lat + s * 0.85, y0, y1);
    }
    const c = at((u0 + u1) / 2, lat);
    post(TIMBER_DARK, c.x, c.z, -6, y(0.5) - 0.45, 0.4, 0.4, false);
  }
  /** A flat landing (RingLanding, cm), solid, with a pile under its middle and a rail along its seaward (high-lat) edge. */
  function landing(l: RingLanding) {
    const u0 = Math.min(l.u0, l.u1) / 100,
      u1 = Math.max(l.u0, l.u1) / 100,
      l0 = l.lat0 / 100,
      l1 = l.lat1 / 100,
      y = l.y / 100;
    deck(CONCRETE, u0, u1, l0, l1, () => y, 50);
    const c = at((u0 + u1) / 2, (l0 + l1) / 2);
    post(TIMBER_DARK, c.x, c.z, -6, y - 0.5, 0.6, 0.6, false);
    handrail(u0, l1 - 0.05, u1, l1 - 0.05, y, y);
  }
  return { tmp, beam, post, block, deck, track, handrail, flight, landing };
}

/** The leaf's local frame: +z along it from the heel toward the toe (toward Home when down), its top face at y 0. */
function buildLeaf(group: THREE.Group) {
  const parts = createParts();
  const W = FORM.right - FORM.left;
  const box = (color: string, w: number, h: number, d: number, x: number, y: number, z: number) =>
    parts.add(color, new THREE.BoxGeometry(w, h, d), new THREE.Matrix4().makeTranslation(x, y, z));
  box(LEAF_ORANGE, W, 0.8, GAP, 0, -0.4, GAP / 2); // the deck plate, the far leaf's own orange (no pop at the swap)
  for (const s of [-W / 2 + 0.2, W / 2 - 0.2]) box(STEEL_DARK, 0.4, 1.4, GAP, s, 0.3, GAP / 2); // the side girders
  for (const t of TRACKS)
    for (const r of [-0.5, 0.5]) box(RAIL, 0.12, 0.14, GAP - 0.4, t - FORM.mid + r, 0.15, GAP / 2);
  // The counterweight bracket, empty: a cradle and short hangers under the plate, and the painted outline of where four
  // footings go (call 22's outline, lit by R4c while a footing waits on the railhead rack) on the underside, where the jib
  // hangs them. Nothing of it stands on the running line (./bracket.ts; owner, 11 November).
  const bz = BRACKET_Z;
  box(STEEL_DARK, CRADLE.w, CRADLE.h, CRADLE.d, 0, CRADLE.y, bz);
  for (const x of WEIGHT_X) box(STEEL_DARK, HANGER.w, HANGER.h, HANGER.d, x, HANGER.y, bz);
  for (const s of [-1, 1]) {
    box(GOLD, W - 1, 0.04, 0.12, 0, PLATE_BOTTOM - 0.02, bz + s * 1.3);
    box(GOLD, 0.12, 0.04, 2.6, s * ((W - 1) / 2), PLATE_BOTTOM - 0.02, bz);
  }
  for (const x of WEIGHT_X) box(GOLD, 0.06, 0.04, 2.2, x, PLATE_BOTTOM - 0.02, bz);
  const mesh = new THREE.Mesh(parts.merged(), undefined);
  group.add(mesh);
  // The footings hung in the bracket (ringIslandPose.bracket, 0..4): one instanced draw, none while it's empty.
  const footings = new THREE.InstancedMesh(new THREE.BoxGeometry(WEIGHT.w, WEIGHT.h, WEIGHT.d), undefined, 4);
  const m = new THREE.Matrix4();
  WEIGHT_X.forEach((x, k) => footings.setMatrixAt(k, m.makeTranslation(x, WEIGHT.y, bz)));
  footings.count = 0;
  group.add(footings);
  return { mesh, footings, W };
}

/** The RINGWORKS board's face (the brief's word; copy for the owner, not The Boogler's). */
function boardTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;
  const c = canvas.getContext('2d')!;
  c.fillStyle = STEEL;
  c.fillRect(0, 0, 512, 128);
  c.fillStyle = '#fff6e6';
  c.font = 'bold 76px system-ui, sans-serif';
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.fillText('RINGWORKS', 256, 68);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** The furnishing's placements (content/levels/ring-island.ts), authored in the island's frames. */
const furnishing = loadLevelArtifact(level, definitions).placements;
type Anchors = Readonly<Record<string, number>>;
const object = (v: Json | undefined, what: string) => {
  if (!v || typeof v !== 'object' || Array.isArray(v)) throw new Error(`ring island: ${what} expected`);
  return v as JsonObject;
};
const finite = (v: Json | undefined, what: string) => {
  if (typeof v !== 'number' || !Number.isFinite(v)) throw new Error(`ring island: ${what} expected`);
  return v;
};
/** A value in a frame: a number as is, or [from, ...add], `from` an anchor or a value, each add summed in order. */
function value(v: Json | undefined, anchors: Anchors): number {
  if (typeof v === 'number') return v;
  if (!Array.isArray(v) || !v.length) throw new Error('ring island: expected a value');
  const [from, ...add] = v as readonly Json[];
  let n: number;
  if (typeof from === 'string') {
    if (!Object.hasOwn(anchors, from)) throw new Error(`ring island: no anchor ${from}`);
    n = anchors[from]!;
  } else n = value(from, anchors);
  for (const a of add) n = n + value(a, anchors);
  return n;
}
/** World poses for a furnishing placement: its frame's operands resolved on the island as it stands. */
function resolvePlacement(
  p: Placement,
  frames: { halt: Anchors; brace: Anchors; summit: Anchors },
  ground: (x: number, z: number) => number,
  toward: (to: Json | undefined) => { x: number; z: number },
): Placement {
  const { place: authored, ...params } = p.params ?? {};
  const place = object(authored, `${p.id} place`);
  const frame = place.frame;
  if (frame === 'map-table') {
    const mc = RING_MAP_TABLE,
      gorge = toward(place.gorge),
      canopy = toward(place.canopy);
    return {
      id: p.id,
      prefab: p.prefab,
      pos: [mc.x, mc.top, mc.z],
      params: { ...params, yaw: YAW, gorge: [gorge.x, gorge.z], canopy: [canopy.x, canopy.z] },
    };
  }
  if (frame !== 'halt' && frame !== 'brace' && frame !== 'summit') throw new Error(`ring island: ${p.id} frame`);
  let anchors: Anchors = frames[frame];
  if (place.arch !== undefined) {
    // A tile of the mural's arch: its middle, at angle PI * (from + span * k / steps).
    const arch = object(place.arch, 'arch');
    const a =
      Math.PI *
      (finite(arch.from, 'arch') + (finite(arch.span, 'arch') * finite(arch.k, 'arch')) / finite(arch.steps, 'arch'));
    anchors = {
      ...anchors,
      'arch-u': finite(arch.u, 'arch') + Math.cos(a) * finite(arch.ru, 'arch'),
      'arch-y': finite(arch.y, 'arch') + Math.sin(a) * finite(arch.ry, 'arch'),
    };
  }
  /** (x, z) of a point: (u, lat) on the line, or (x, z) in the summit's frame. */
  const xz = (q: JsonObject) =>
    q.u !== undefined
      ? at(value(q.u, anchors), value(q.lat, anchors))
      : { x: value(q.x, anchors), z: value(q.z, anchors) };
  /** An upright box turned to the line, from bottom to top: the greybox's post. */
  const upright = (c: { x: number; z: number }, bottom: number, top: number, w: number, d: number): Placement => ({
    id: p.id,
    prefab: p.prefab,
    pos: [c.x, (bottom + top) / 2, c.z],
    rot: [YAW, 0, 0],
    scale: [w, top - bottom, d],
    params,
  });
  const span = (v: Json | undefined, ground?: number) => {
    if (!Array.isArray(v) || v.length !== 2) throw new Error(`ring island: ${p.id} span`);
    const with_ = ground === undefined ? anchors : { ...anchors, ground };
    return [value(v[0], with_), value(v[1], with_)] as const;
  };
  if (place.block !== undefined) {
    const b = object(place.block, 'block');
    const [u0, u1] = span(b.u),
      [l0, l1] = span(b.lat),
      [bottom, top] = span(b.y);
    return upright(at((u0 + u1) / 2, (l0 + l1) / 2), bottom, top, l1 - l0, u1 - u0);
  }
  if (place.post !== undefined) {
    const q = object(place.post, 'post'),
      c = xz(q);
    const [bottom, top] = span(q.y, ground(c.x, c.z));
    return upright(c, bottom, top, finite(q.w, 'post width'), finite(q.d, 'post depth'));
  }
  if (place.beam !== undefined) {
    // A box from a to b (its centreline, its top at a.y and b.y), w wide and h deep: the greybox's beam. An end is
    // `d` metres out from the summit's middle along (x, z) `along`.
    const q = object(place.beam, 'beam');
    const end = (e: JsonObject) => {
      const along = e.along;
      if (!Array.isArray(along)) throw new Error('ring island: beam end');
      const ox = finite(along[0], 'along'),
        oz = finite(along[1], 'along'),
        n = Math.hypot(ox, oz),
        d = finite(e.d, 'beam end');
      const x = anchors.cx! + (ox / n) * d,
        z = anchors.cz! + (oz / n) * d;
      return { x, y: value(e.y, { ...anchors, ground: ground(x, z) }), z };
    };
    const a = end(object(q.a, 'beam a')),
      b = end(object(q.b, 'beam b'));
    const w = finite(q.w, 'beam width'),
      h = finite(q.h, 'beam depth');
    const dx = b.x - a.x,
      dy = b.y - a.y,
      dz = b.z - a.z,
      len = Math.hypot(dx, dz),
      full = Math.hypot(len, dy);
    return {
      id: p.id,
      prefab: p.prefab,
      pos: [(a.x + b.x) / 2, (a.y + b.y) / 2 - h / 2, (a.z + b.z) / 2],
      rot: [Math.atan2(dx, dz), -Math.atan2(dy, len), 0],
      scale: [w, h, full + 0.04],
      params,
    };
  }
  const point = object(place.at, `${p.id} at`),
    c = xz(point);
  const y = value(point.y, anchors);
  const turn = place.turn;
  let yaw: number | undefined;
  if (turn === 'line') yaw = YAW;
  // Its face to the west, toward the tracks (local +z along -lat).
  else if (turn === 'west') yaw = Math.atan2(-1, -0.0272);
  else if (turn !== undefined) {
    const dir = toward(object(turn, 'turn').toward);
    yaw = Math.atan2(-dir.z, dir.x);
  }
  return {
    id: p.id,
    prefab: p.prefab,
    pos: [c.x, y, c.z],
    ...(yaw === undefined ? {} : { rot: [yaw, 0, 0] as const }),
    ...(p.prefab === 'ring.summit-deck'
      ? { params: { ...params, yaw: YAW } }
      : Object.keys(params).length
        ? { params }
        : {}),
    ...(p.labels ? { labels: p.labels } : {}),
  };
}

export type RingIslandView = ReturnType<typeof createRingIslandView>;
/** The deck: the walk surface from a to b. The landing before a is the ground itself (ground.ts LANDING). */
function bridgeWalkSurfaces(beam: ReturnType<typeof builders>['beam'], g: IslandGround) {
  const { a, b } = summitBridge(g);
  beam(TIMBER, a, b, SUMMIT_BRIDGE.width, SUMMIT_BRIDGE.thick);
}
export function createRingIslandView(g: IslandGround, cones: readonly Cone[], centre: { x: number; z: number }) {
  const root = new THREE.Group();
  root.name = 'ring-island';
  const material = new THREE.MeshStandardNodeMaterial({ vertexColors: true, roughness: 0.9, flatShading: true });
  const parts = createParts();
  const b = builders(parts);
  const { beam, post, block, deck, track, flight, landing, handrail } = b;

  // ---------------------------------------------------------------- the furnishing's records
  // Instantiated off (no bodies) until the near view mounts: setMounted turns their solids on with the island's own.
  const owner = createOwnedView();
  const records: ReturnType<typeof instantiate>[] = [];
  /** A world direction (x, z) from the halt's middle toward a world (x, z): where the branch read points. */
  const haltMid = at((HALT[0] + HALT[1]) / 2, FORM.mid);
  const toward = (to: Json | undefined) => {
    if (!Array.isArray(to) || to.length !== 2) throw new Error('ring island: toward expected');
    const dx = finite(to[0], 'toward') - haltMid.x,
      dz = finite(to[1], 'toward') - haltMid.z,
      n = Math.hypot(dx, dz);
    return { x: dx / n, z: dz / n };
  };
  const frames = {
    halt: {
      start: HALT[0],
      end: HALT[1],
      east: RING_HALT.downLat[1] / 100,
      west: RING_HALT.offsetLat[0] / 100,
      deck: PLATFORM_Y,
    },
    brace: { u0: BRACE.u0, l1: BRACE.l1, top: BRACE.y },
    summit: {} as Anchors,
  };
  const boardTex = boardTexture();
  const board: { face?: THREE.Mesh } = {};
  /** The RINGWORKS board's face: the record's label, painted here (the copy is the owner's). */
  const makeLabel = (a: { w: number; h: number }) =>
    (board.face = new THREE.Mesh(
      new THREE.PlaneGeometry(a.w, a.h),
      new THREE.MeshStandardNodeMaterial({ map: boardTex, roughness: 0.8 }),
    ));
  /** Instantiates the furnishing `which` picks, in its level order: static pieces into the island's one draw, solids
   * beside its own in the mount clearance's order. */
  function furnish(which: (p: Placement) => boolean) {
    const made = furnishing.filter(which).map((p) => {
      const record = instantiate(p.prefab, resolvePlacement(p, frames, g.islandH, toward), {
        owner,
        // The hammer's head moves every frame; everything else stands still.
        still: p.prefab !== 'ring.hammer-head',
        ...(p.prefab === 'ring.board-face' ? { makeLabel } : {}),
      });
      for (const piece of record.pieces) parts.add(piece.color, piece.geometry, piece.matrix);
      parts.clearance.push(...record.solids);
      records.push(record);
      return record;
    });
    if (!made.length) throw new Error('ring island: no furnishing placed');
    return made;
  }

  // ---------------------------------------------------------------- the hinge pier, the brace platform, the steps
  for (const [u0, u1] of [
    [HINGE - 3, HINGE + 3],
    [HINGE + 3, HINGE + 20],
  ] as const)
    block(STEEL_DARK, u0, u1, FORM.left + 0.2, FORM.right - 0.2, -6, deckY(u1) - 0.5);
  if (POLE_PENNANT)
    for (const f of pennantFooting(deckY(PENNANT_POLE.u))) block(CONCRETE, f.u0, f.u1, f.lat0, f.lat1, f.y0, f.y1);
  deck(CONCRETE, BRACE.u0, BRACE.u1, BRACE.l0, BRACE.l1, () => BRACE.y, BRACE.u1 - BRACE.u0);
  block(STEEL_DARK, BRACE.u0 + 3, BRACE.u0 + 7, BRACE.l0 + 2, BRACE.l1 - 2, -6, BRACE.y - 0.5);
  handrail(BRACE.u0, BRACE.l1 - 0.05, BRACE.u1 - 3.5, BRACE.l1 - 0.05, BRACE.y, BRACE.y);
  {
    // The gold strut under the heel, its foot on the platform (rail.brace's site, RING_BRACE), facing the railhead.
    const foot = { u: 28450 / 100, lat: 3.4 };
    const c = { x: RING_BRACE.x / 100, z: RING_BRACE.z / 100 };
    post(GOLD, c.x, c.z, BRACE.y, BRACE.y + 0.5, 1.4);
    beam(
      GOLD,
      p3(foot.u - 0.4, foot.lat - 0.3, BRACE.y + 0.5),
      p3(HINGE + 0.4, FORM.right - 0.4, HINGE_Y - 0.6),
      0.6,
      0.6,
      false,
    );
    // One of the folk, waving you over (a looker, never Rivet: call 37).
    furnish((p) => p.id.startsWith('brace/'));
  }
  {
    // Steps from the platform's far end up to their deck (RING_STEPS), and a landing onto the deck's east edge.
    const s = RING_STEPS,
      lat = s.lat / 100,
      top = s.y1 / 100;
    beam(CONCRETE, p3(s.u0 / 100, lat, s.y0 / 100), p3(s.u1 / 100, lat, top), 2.8, 0.4);
    deck(CONCRETE, s.u1 / 100, s.u1 / 100 + 2.5, FORM.right - 0.3, lat + 1.4, () => top, 2.5);
    handrail(s.u0 / 100, lat + 1.35, s.u1 / 100, lat + 1.35, s.y0 / 100, top);
  }
  for (const ramp of RING_RAMPS) {
    for (const f of ramp.flights) flight(f);
    for (const l of ramp.landings) landing(l);
  }

  // ---------------------------------------------------------------- the Pilgrims' Way: their stub, laid double track
  deck(STEEL, HINGE, WAY_END, FORM.left, FORM.right, deckY);
  track(HINGE, WAY_END, deckY);
  for (let u = HINGE + 3; u <= HALT[0]; u += 6)
    for (const lat of [FORM.left + 0.15, FORM.right - 0.15]) {
      const c = at(u, lat);
      post(STEEL_DARK, c.x, c.z, deckY(u), deckY(u) + 1.4, 0.25, 0.25, false);
    }
  for (const lat of [FORM.left + 0.15, FORM.right - 0.15])
    for (let u = HINGE + 3; u < HALT[0]; u += 10) {
      const v = Math.min(HALT[0], u + 10);
      beam(STEEL_DARK, p3(u, lat, deckY(u) + 1.4), p3(v, lat, deckY(v) + 1.4), 0.25, 0.3, false);
    }
  for (let u = HINGE + 40; u < HALT[0]; u += 20) {
    const c = at(u, FORM.mid);
    post(STEEL_DARK, c.x, c.z, -6, deckY(u) - 0.5, 6, 1.2, false);
  }

  // ---------------------------------------------------------------- the island halt
  const [upL0, upL1] = RING_HALT.offsetLat.map((l) => l / 100) as [number, number];
  const [dnL0, dnL1] = RING_HALT.downLat.map((l) => l / 100) as [number, number];
  // The platforms, solid down to the fill (ground.ts), so no gap shows under them. They start at the foot crossing's
  // ramp tops (docs/plans/ring-island-crossing.md): their first 6.6 m are its landings and ramps.
  const X = RING_CROSSING;
  for (const [l0, l1] of [
    [upL0, upL1],
    [dnL0, dnL1],
  ] as const) {
    block(CONCRETE, X.rampTop, HALT[1], l0, l1, HALT_Y - 0.8, PLATFORM_Y);
    // A landing at the rail tops, carried on under the ramp as its fill, and the ramp the platform's full width,
    // deep enough that its underside stays inside the fill.
    block(CONCRETE, X.landing[0], X.rampTop, l0, l1, HALT_Y - 0.8, X.top);
    const mid = (l0 + l1) / 2;
    beam(CONCRETE, p3(X.landing[1], mid, X.top), p3(X.rampTop, mid, PLATFORM_Y), l1 - l0, 0.75);
  }
  // The planks between the landings: five timber spans with a flangeway by each rail, drawn only, over one solid slab
  // whose top is the rail tops (drawn a plank's depth lower, as the bed in the flangeways, so the rails show).
  for (const [l0, l1] of ringCrossingPlanks()) block(TIMBER, X.u0, X.u1, l0, l1, X.top - 0.12, X.top, false);
  block(BED, X.u0, X.u1, FORM.left, FORM.right, HALT_Y, X.top - 0.12, false);
  {
    const c = at((X.u0 + X.u1) / 2, (FORM.left + FORM.right) / 2);
    parts.solid(
      FORM.right - FORM.left,
      X.top - HALT_Y,
      X.u1 - X.u0,
      new THREE.Matrix4().compose(
        new THREE.Vector3(c.x, (HALT_Y + X.top) / 2, c.z),
        new THREE.Quaternion().setFromAxisAngle(THREE.Object3D.DEFAULT_UP, YAW),
        new THREE.Vector3(1, 1, 1),
      ),
    );
  }
  // The west platform's ramp off its north end, down onto the slope where the path starts.
  const pathFoot = summitPathFoot();
  beam(
    CONCRETE,
    p3(HALT[1] - 4, upL0 + 0.2, PLATFORM_Y),
    { ...pathFoot, y: g.islandH(pathFoot.x, pathFoot.z) + 0.15 },
    3,
    0.4,
  );
  // The halt's furnishing: the RINGWORKS board's frame and legs on the east platform (its face is below, with the
  // hammer's head), the works yard east of the halt with the steel waiting under a tarp (finding 5), the drop hammer,
  // the works wall with the prophecy mural on its face to the halt, and the branch read (ruling 4) beside the west
  // platform: the fingerpost and the low map table (where it stands is state.ts's; the halt map lies over its paint
  // from the rivet: railway/ring-map-table.ts).
  furnish((p) => p.id.startsWith('halt/') && p.prefab !== 'ring.hammer-head' && p.prefab !== 'ring.board-face');

  // ---------------------------------------------------------------- the run-off, the buffers and the end board
  // Not here since the greybox route (docs/plans/greybox-route.md, leg 1 step 4): line 2 runs on from WAY_END along
  // the stack line's row, which curves west through where R2d's straight bed and buffers stood, so the run-off's deck
  // and rails, the buffers and the end board are route-greybox/leg-view.ts's, drawn at the line's end as it is laid
  // (here until the first section, then at each railhead). The cutting is ground.ts's.

  // ---------------------------------------------------------------- the crossover's rails on the Way (R2d)
  {
    // The offset track's lateral eased from its own (-4, TRACKS[1]: the homeward track since v45) to the original
    // track's (0) over RING_END.cross, as place/layout.ts's crossLat does at Far Head: ballast and a pair of rails, a
    // metre at a time, on the Way's grade. Rails only.
    const [c0, c1] = [RING_END.cross.u0 / 100, RING_END.cross.u1 / 100];
    const ease = (t: number) => t * t * (3 - 2 * t);
    const lat = (u: number) => TRACKS[1]! * (1 - ease((u - c0) / (c1 - c0)));
    for (let u = c0; u < c1 - 1e-6; u += 1) {
      const v = Math.min(c1, u + 1);
      beam(BED, p3(u, lat(u), deckY(u) + 0.08), p3(v, lat(v), deckY(v) + 0.08), 2.4, 0.1, false);
      for (const r of [-0.5, 0.5])
        beam(RAIL, p3(u, lat(u) + r, deckY(u) + 0.22), p3(v, lat(v) + r, deckY(v) + 0.22), 0.12, 0.14, false);
    }
  }

  // ---------------------------------------------------------------- the path up to the summit lookout
  const CX = centre.x,
    CZ = centre.z;
  {
    const { way, bridgeLeg } = summitPath(g, centre);
    for (let i = 0; i < way.length - 1; i++) {
      if (i === bridgeLeg || i === bridgeLeg - 1) continue;
      const [ax, az] = way[i]!,
        [bx, bz] = way[i + 1]!;
      const n = Math.max(1, Math.ceil(Math.hypot(bx - ax, bz - az) / 6));
      for (let k = 0; k < n; k++) {
        const x0 = ax + ((bx - ax) * k) / n,
          z0 = az + ((bz - az) * k) / n,
          x1 = ax + ((bx - ax) * (k + 1)) / n,
          z1 = az + ((bz - az) * (k + 1)) / n;
        beam(
          PATH,
          { x: x0, y: g.islandH(x0, z0) + 0.12, z: z0 },
          { x: x1, y: g.islandH(x1, z1) + 0.12, z: z1 },
          2.6,
          0.3,
          false,
        );
      }
    }
  }
  // The footbridge over the stack line's cutting, blocked out at true size (docs/plans/ring-summit-path.md): a timber
  // deck flush with the path at both rims, two orange parapets low enough to hop, a concrete abutment under each end
  // and two dark steel bents standing just outside the cutting's flat floor. Everything here is solid.
  {
    const { a, b } = summitBridge(g),
      B = SUMMIT_BRIDGE;
    const span = Math.hypot(b.x - a.x, b.z - a.z),
      ax = (b.x - a.x) / span,
      az = (b.z - a.z) / span;
    /** A point `d` metres along the deck from a and `side` metres to its right, `dy` over the deck's top. */
    const on = (d: number, side = 0, dy = 0) => ({
      x: a.x + ax * d - az * side,
      y: a.y + ((b.y - a.y) * d) / span + dy,
      z: a.z + az * d + ax * side,
    });
    bridgeWalkSurfaces(beam, g);
    // The approach's first half, drawn only (the trail is the ground under it, as under the path's beams): from the
    // beams' level 0.12 m at the turn to 4 cm over the ground's own cross-fall, where it meets the landing's top. The
    // landing is the ground (ground.ts LANDING): its top and the sides it stands above the hillside by, drawn as path.
    const surface: number[] = [];
    const face = (points: THREE.Vector3[], toward: THREE.Vector3) => {
      const [p0, p1, p2, p3] = points as [THREE.Vector3, THREE.Vector3, THREE.Vector3, THREE.Vector3];
      const n = new THREE.Vector3().subVectors(p1, p0).cross(new THREE.Vector3().subVectors(p2, p0));
      for (const p of n.dot(toward) < 0 ? [p0, p2, p1, p0, p3, p2] : [p0, p1, p2, p0, p2, p3])
        surface.push(p.x, p.y, p.z);
    };
    const from = -B.approach,
      to = -LANDING.length,
      half = LANDING.half;
    function trail(d: number, side: number) {
      const p = on(d, side),
        c = on(d, 0);
      // The uncut hillside: on the last row the finished ground is already the landing, 1 cm up.
      const follow = g.uncappedH(p.x, p.z) + 0.04,
        level = g.uncappedH(c.x, c.z) + 0.12;
      const y = Math.max(follow, level + (follow - level) * THREE.MathUtils.smoothstep(d, from, from + 3));
      return new THREE.Vector3(p.x, y, p.z);
    }
    const up = new THREE.Vector3(0, 1, 0),
      right = new THREE.Vector3(-az, 0, ax);
    for (let d = from; d < to - 1e-9; d += 0.5) {
      for (let side = -half; side < half - 1e-9; side += 0.65)
        face([trail(d, side), trail(d, side + 0.65), trail(d + 0.5, side + 0.65), trail(d + 0.5, side)], up);
      for (const side of [-half, half]) {
        const top0 = trail(d, side),
          top1 = trail(d + 0.5, side);
        const foot = (p: THREE.Vector3) => new THREE.Vector3(p.x, g.islandH(p.x, p.z) - 0.1, p.z);
        face([top0, top1, foot(top1), foot(top0)], right.clone().multiplyScalar(Math.sign(side)));
      }
    }
    const lift = 0.03; // the ground's own (below)
    const { vertices: v } = g.patch;
    for (const k of g.patch.landing) surface.push(v[k * 3]!, v[k * 3 + 1]! + lift, v[k * 3 + 2]!);
    const trailGeo = new THREE.BufferGeometry();
    trailGeo.setAttribute('position', new THREE.Float32BufferAttribute(surface, 3));
    trailGeo.computeVertexNormals();
    parts.add(PATH, trailGeo);
    for (const s of [-1, 1]) {
      const side = s * (B.width / 2 - 0.06);
      beam(STEEL, on(0, side, B.parapet), on(span, side, B.parapet), 0.12, B.parapet);
    }
    for (const [d0, d1] of [
      [-1.5, 0.5],
      [span - 0.5, span + 1.5],
    ] as const)
      beam(CONCRETE, on(d0, 0, -B.thick), on(d1, 0, -B.thick), 3.4, 1.2);
    const yaw = new THREE.Quaternion().setFromAxisAngle(THREE.Object3D.DEFAULT_UP, Math.atan2(ax, az));
    for (const d of B.bents) {
      const under = on(d, 0, -B.thick).y;
      beam(STEEL_DARK, on(d, -1.7, -B.thick), on(d, 1.7, -B.thick), 0.5, 0.4);
      for (const side of [-1.2, 1.2]) {
        const c = on(d, side),
          bottom = g.islandH(c.x, c.z) - 0.5,
          top = under - 0.4;
        const m = new THREE.Matrix4().compose(
          new THREE.Vector3(c.x, (bottom + top) / 2, c.z),
          yaw,
          new THREE.Vector3(1, 1, 1),
        );
        parts.add(STEEL_DARK, new THREE.BoxGeometry(0.5, top - bottom, 0.5), m);
        parts.solid(0.5, top - bottom, 0.5, m);
      }
    }
  }
  // The cutting's summit-side rim, marked: a sparse line of pale rocks 1.5 m behind the edge where the path runs near
  // it, because from uphill the rim is a convex edge that hides the drop. Low enough to step round or hop, and solid.
  for (const r of summitRimRocks(g, centre)) {
    const { radius, lift, drawn, box } = summitRimRockShape(r),
      q = new THREE.Quaternion().setFromAxisAngle(THREE.Object3D.DEFAULT_UP, r.yaw),
      c = new THREE.Vector3(r.x, r.y + lift, r.z);
    parts.add(
      STONE,
      new THREE.DodecahedronGeometry(radius),
      new THREE.Matrix4().compose(c, q, new THREE.Vector3(drawn.x, drawn.y, drawn.z)),
    );
    // The box is inscribed in the drawn stone (test/ring-island-path.test.ts): nothing solid stands outside it.
    parts.solid(box.x, box.y, box.z, new THREE.Matrix4().compose(c, q, new THREE.Vector3(1, 1, 1)));
  }
  // The summit lookout: its deck, rail posts and one of the folk, and a short ramp from the path's end up onto the deck,
  // whose rim stands about 1.5 m over the slope. The deck's top is `lift` over the ground at the island's middle.
  const summitDeck = furnishing.find((p) => p.prefab === 'ring.summit-deck');
  const summit = g.islandH(CX, CZ) + finite(object(summitDeck?.params?.place, 'summit deck').lift, 'summit lift');
  frames.summit = { cx: CX, cz: CZ, top: summit };
  furnish((p) => p.id.startsWith('summit/'));

  const shell = new THREE.Mesh(parts.merged(), material);
  shell.castShadow = shell.receiveShadow = true;
  root.add(shell);
  const solids = createBody({
    material: groundMat,
    group: GROUP.SCENERY,
    position: { x: 0, y: 0, z: 0 },
    shapes: parts.shapes,
  });

  // ---------------------------------------------------------------- the ground: the grid as one mesh and one heightfield
  const ground = (() => {
    const { nx, nz, x0, z0, cell } = g;
    const pos = new Float32Array(nx * nz * 3 + g.patch.vertices.length),
      col = new Float32Array(pos.length);
    const land = new THREE.Color(LAND),
      land2 = new THREE.Color(LAND2),
      sand = new THREE.Color(SAND),
      rock = new THREE.Color(ROCK),
      c = new THREE.Color();
    function vertex(k: number, x: number, h: number, z: number) {
      // A hair over buildFar's faceted cones, which hide while this view is mounted (src/place/far-hills.ts).
      pos.set([x, h + 0.03, z], k * 3);
      // buildFar's colour of whichever cone stands highest here, sand along the shore and on the halt's fill.
      let best = -Infinity,
        which = 0;
      cones.forEach(([dx, dz, r, hh], n) => {
        const y = hh - 4 - (hh * Math.hypot(x - centre.x - dx, z - centre.z - dz)) / r;
        if (y > best) {
          best = y;
          which = n;
        }
      });
      c.copy(which === 1 || which === 2 ? land2 : land);
      const shore = 1 - THREE.MathUtils.smoothstep(h, 1.6, 2.6);
      const fill = g.fillOut(x, z) < 12 && h > g.cone(x, z) + 0.2 ? 1 : 0;
      c.lerp(sand, Math.max(shore, fill * 0.85));
      // Cut rock where the railway's cuttings took the hillside away (the run-off's notch and the stack line's
      // walls and floor): paler than the hill's skin, so a cutting reads as cut from the track and from above.
      c.lerp(rock, THREE.MathUtils.smoothstep(g.cone(x, z) - h, 0.3, 1.5));
      col.set([c.r, c.g, c.b], k * 3);
    }
    for (let j = 0; j < nz; j++)
      for (let i = 0; i < nx; i++) vertex(i + j * nx, x0 + i * cell, g.at(i, j), z0 + j * cell);
    const patch = g.patch.vertices;
    for (let k = 0; k < patch.length; k += 3) vertex(nx * nz + k / 3, patch[k]!, patch[k + 1]!, patch[k + 2]!);
    // Cells entirely under the sea are left out of the mesh (and so out of its tiles).
    const underwater = (i: number, j: number) =>
      g.inPatch(i, j) || Math.max(g.at(i, j), g.at(i + 1, j), g.at(i, j + 1), g.at(i + 1, j + 1)) < -6.5;
    const index: number[] = [];
    for (let j = 0; j < nz - 1; j++)
      for (let i = 0; i < nx - 1; i++) {
        const a = i + j * nx,
          bb = a + 1,
          cc = a + nx,
          d = cc + 1;
        if (underwater(i, j)) continue;
        // The collider's anti-diagonal split (ground.ts islandH): (a, b, c) and (d, c, b), both facing up.
        index.push(a, cc, bb, d, bb, cc);
      }
    const mainEnd = index.length;
    for (const k of g.patch.ground) index.push(nx * nz + k);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    geo.setIndex(index);
    geo.computeVertexNormals();
    const mesh = new THREE.Mesh(geo, new THREE.MeshStandardNodeMaterial({ vertexColors: true, roughness: 0.95 }));
    mesh.receiveShadow = true;
    mesh.name = 'ring-island-ground';
    return { mesh, underwater, mainEnd };
  })();
  const groundMesh = ground.mesh;
  root.add(groundMesh);
  freezeInPlace(groundMesh); // the root stays at the world origin; the full mesh shows only with farGround off
  // Frustum-culled tiles in three levels of detail, as the main island's far ground (place/far-ground.ts).
  const disposeTiles = addFarGround(groundMesh, g.nx, g.nz, ground.mainEnd, ground.underwater);
  const groundBodies = g.collider().map((tile) =>
    createBody({
      material: groundMat,
      group: GROUP.SCENERY,
      ...tile,
    }),
  );

  // ---------------------------------------------------------------- the raised leaf: a pivot at the heel
  const hinge = p3(HINGE, FORM.mid, HINGE_Y);
  const leaf = new THREE.Group();
  leaf.name = 'ring-island-leaf';
  leaf.position.set(hinge.x, hinge.y, hinge.z);
  const leafParts = buildLeaf(leaf);
  leafParts.mesh.material = material;
  leafParts.mesh.castShadow = leafParts.mesh.receiveShadow = true;
  leafParts.footings.material = material;
  {
    const grey = new THREE.Color(CONCRETE);
    for (let k = 0; k < 4; k++) leafParts.footings.setColorAt(k, grey);
  }
  root.add(leaf);
  const leafBody: Body = createBody({
    type: BODY.KINEMATIC,
    material: groundMat,
    group: GROUP.SCENERY,
    position: hinge,
    shapes: [{ kind: 'box', hx: leafParts.W / 2, hy: 0.4, hz: GAP / 2, offset: { x: 0, y: -0.4, z: GAP / 2 } }],
  });
  let leafAngle = NaN;
  function poseLeaf() {
    const deg = ringIslandPose.leaf;
    leafParts.footings.count = Math.max(0, Math.min(4, Math.round(ringIslandPose.bracket)));
    if (deg === leafAngle) return;
    leafAngle = deg;
    // local +z toward Home (the line's heading turned half round), then the toe tipped up by `deg`
    leaf.rotation.set((-deg * Math.PI) / 180, YAW + Math.PI, 0, 'YXZ');
    const q = leaf.quaternion;
    leafBody.quaternion.set(q.x, q.y, q.z, q.w);
  }
  poseLeaf();
  const fixedClearance = parts.clearance.map((shape) => clearanceShape(shape));
  function clearPosition(position: THREE.Vector3Like) {
    poseLeaf();
    leaf.updateMatrix();
    const solids = [
      ...fixedClearance,
      clearanceShape(
        { kind: 'box', hx: leafParts.W / 2, hy: 0.4, hz: GAP / 2, offset: { x: 0, y: -0.4, z: GAP / 2 } },
        leaf.matrix,
      ),
    ];
    return ringSceneryExit(position, solids, g.islandH);
  }

  // The pennant on its own fixed pole beside the hinge pier (the owner, 11 November), the far leaf's own: one definition
  // (PENNANT_POLE), so the handover at the mount distance matches. It does not turn with the leaf and stays up after the
  // Meet. Visual only.
  let pennant: THREE.Mesh | null = null;
  if (POLE_PENNANT) {
    const c = p3(PENNANT_POLE.u, PENNANT_POLE.lat, deckY(PENNANT_POLE.u));
    pennant = new THREE.Mesh(
      pennantGeometry(),
      new THREE.MeshStandardNodeMaterial({
        color: PENNANT_CREAM,
        emissive: PENNANT_CREAM,
        emissiveIntensity: 0.8,
        side: THREE.DoubleSide,
      }),
    );
    pennant.position.set(c.x, c.y, c.z);
    pennant.rotation.y = YAW + Math.PI; // local +z toward Home, as the leaf's
    root.add(pennant);
  }

  // ---------------------------------------------------------------- the drop hammer's head and the board's face
  // The head rests on the anvil and lifts from there (the hammer's records are the halt's furnishing, above); the face
  // is the board's, its paint makeLabel's.
  const [head] = furnish((p) => p.prefab === 'ring.hammer-head');
  furnish((p) => p.prefab === 'ring.board-face');
  if (!board.face || !head) throw new Error('ring island: no RINGWORKS board or hammer');
  const hammerBase = head.root.position.clone();
  root.add(owner.root);

  let lastPhase = 0;
  function thump(x: number, z: number) {
    const a = getAudio('work');
    if (!a) return;
    const gain = 0.6 * hearGain(Math.hypot(camera.position.x - x, camera.position.z - z), HAMMER.hear);
    if (gain < 0.003) return;
    const { ctx, out } = a,
      t = ctx.currentTime + 0.005;
    const o = ctx.createOscillator(),
      env = ctx.createGain();
    o.frequency.setValueAtTime(80, t);
    o.frequency.exponentialRampToValueAtTime(32, t + 0.22);
    env.gain.setValueAtTime(0.0001, t);
    env.gain.exponentialRampToValueAtTime(gain, t + 0.004);
    env.gain.exponentialRampToValueAtTime(0.0001, t + 0.32);
    o.connect(env).connect(out);
    o.start(t);
    o.stop(t + 0.4);
  }
  /** The hammer's lift above the anvil at time t into its cycle. */
  function hammerLift(t: number) {
    const { lift, hold, drop, rise } = HAMMER;
    if (t < lift) return rise * THREE.MathUtils.smootherstep(t, 0, lift);
    if (t < lift + hold) return rise;
    if (t < lift + hold + drop) {
      const f = (t - lift - hold) / drop;
      return rise * (1 - f * f);
    }
    return 0;
  }
  const strike = HAMMER.lift + HAMMER.hold + HAMMER.drop;

  return {
    root,
    bodies: [solids, ...groundBodies, leafBody] as readonly Body[],
    clearPosition,
    /** The furnishing's solids come and go with the near view's own bodies (its meshes ride `root`). */
    setMounted(on: boolean) {
      for (const record of records) record.setEnabled(on);
    },
    update(ctx: FrameCtx) {
      poseLeaf();
      const phase = ctx.elapsed % HAMMER.cycle;
      head.root.position.set(hammerBase.x, hammerBase.y + hammerLift(phase), hammerBase.z);
      if (lastPhase < strike && phase >= strike) thump(hammerBase.x, hammerBase.z);
      lastPhase = phase;
    },
    inspect() {
      let meshes = 0;
      root.traverse((o) => {
        if (o instanceof THREE.Mesh && o.visible) meshes++;
      });
      return {
        meshes,
        solids: parts.clearance.length,
        ground: { nx: g.nx, nz: g.nz, cell: g.cell, bounds: g.bounds },
        leaf: { ...ringIslandPose },
        summit: +summit.toFixed(2),
      };
    },
    dispose() {
      root.traverse((o) => {
        if (o instanceof THREE.Mesh) o.geometry.dispose();
      });
      material.dispose();
      disposeTiles();
      (groundMesh.material as THREE.Material).dispose();
      (board.face?.material as THREE.Material | undefined)?.dispose();
      owner.dispose();
      boardTex.dispose();
      leafParts.footings.dispose();
      pennant?.geometry.dispose();
      (pennant?.material as THREE.Material | undefined)?.dispose();
    },
  };
}

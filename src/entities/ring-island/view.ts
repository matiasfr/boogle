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
// face are their own. Colliders: the ground's heightfield and the leaf (kinematic) are the view's; every other solid is a
// record's.
// Local: no state, no sync. Positions in world metres from (u, lat) metres via ringAt.
// The furnishing (the folk, the RINGWORKS board, the works yard, the drop hammer, the works wall and mural, the
// fingerpost, the map table and the summit lookout) and the hand-authored massing (the hinge pier, the pennant pole's
// footing, the brace platform with its pier, handrail and gold strut, and the steps) are records
// (content/prefabs/ring-island.ts), standing where content/levels/ring-island.ts puts them in the island's frames; their
// solids come on and off with the near view. So are the sea ramps' flights and landings, the Pilgrims' Way's deck,
// track, truss posts and rails and piers, the halt's platforms with their landings and ramps, the foot crossing (planks,
// bed and slab), the west platform's ramp to the path and the crossover's rails, placed on the catalog's rows (RING_RAMPS,
// RING_GAP, RING_HALT, RING_END, RING_CROSSING; generatedCounts holds the level's counts to them), and the summit
// path's lengths, its footbridge and the rim rocks, placed on the ground (path.ts; summitFrames holds their counts).
// What stays view code: the ground and its heightfield, the approach's trail and the landing (the ground's own), the
// leaf and its footings, the pennant, and the hammer's lift and thump.
import * as THREE from 'three/webgpu';
import { attribute, mix, positionWorld, vec3, vertexColor } from 'three/tsl';
import { beddedRock } from '../../place/ground-material.ts';
import { ORIGIN } from '../../place/layout.ts';
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
} from '../../sim/railway-ring-layout.ts';
import { LANDING, type Cone, type IslandGround } from './ground.ts';
import { SUMMIT_BRIDGE, summitBridge, summitPath, summitPathFoot } from './path.ts';
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
/** The halt's platforms' laterals (RING_HALT): the west (offset, `up`) and east (down) platforms. */
const [upL0, upL1] = RING_HALT.offsetLat.map((l) => l / 100) as [number, number];
const [dnL0, dnL1] = RING_HALT.downLat.map((l) => l / 100) as [number, number];
const X = RING_CROSSING;
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
const STEEL = '#e8742c', // the folk's orange steel
  STEEL_DARK = '#b8551e',
  GOLD = '#ffc83a',
  RAIL = '#3d3a38',
  CONCRETE = '#a6a29a',
  SAND = '#d6c69c',
  PATH = '#c9b48a',
  LAND = '#4a4d5c', // buildFar's cones
  LAND2 = '#3b3e4c';

/** Geometry merged into one vertex-coloured mesh, and `clearance`: every fixed solid in build order, all of them the
 * records' (the mount clearance's order). */
function createParts() {
  const list: THREE.BufferGeometry[] = [];
  const clearance: Shape[] = [];
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
  const merged = () => {
    const geo = mergeGeometries(list);
    for (const g of list) g.dispose();
    list.length = 0;
    return geo;
  };
  return { add, clearance, merged };
}

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
for (const [prefix, n] of generatedCounts())
  if (furnishing.filter((p) => p.id.startsWith(prefix)).length !== n)
    throw new Error(`ring island: ${prefix} is not placed as RING_* lays it out (${n})`);
/** The pennant pole's footing blocks (the far view's one definition), at the deck top where the pole stands. */
const PENNANT_FOOTING = pennantFooting(deckY(PENNANT_POLE.u));
type Anchors = Readonly<Record<string, number>>;
const object = (v: Json | undefined, what: string) => {
  if (!v || typeof v !== 'object' || Array.isArray(v)) throw new Error(`ring island: ${what} expected`);
  return v as JsonObject;
};
const finite = (v: Json | undefined, what: string) => {
  if (typeof v !== 'number' || !Number.isFinite(v)) throw new Error(`ring island: ${what} expected`);
  return v;
};
/** A value in a frame: a number as is, `{ deck: u }` (the Way's deck top at u), or [from, ...add], `from` an anchor or
 * a value, each add summed in order. */
function value(v: Json | undefined, anchors: Anchors): number {
  if (typeof v === 'number') return v;
  // The Way's deck top at u (ringDeckY, cm-rounded).
  if (v && typeof v === 'object' && !Array.isArray(v)) {
    const o = v as JsonObject;
    if (Object.keys(o).length !== 1 || o.deck === undefined) throw new Error('ring island: expected { deck: u }');
    return deckY(value(o.deck, anchors));
  }
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
/** A sea ramp's row (RING_RAMPS[ramp]'s flight or landing, cm) as the frame its pieces stand in, metres. A flight:
 * `u0`, `u1` (its foot and top, either way along u), `lat`, `y0`, `y1`, `len` (its run), `mid` (u of its middle) and
 * `mid-y` (its top there). A landing: `u0` < `u1`, `l0`, `l1`, `y`, `mid` and `lat-mid` (its middle). */
function rampFrame(place: JsonObject): Anchors {
  const ramp = RING_RAMPS[finite(place.ramp, 'ramp')];
  if (place.frame === 'flight') {
    const f = ramp?.flights[finite(place.flight, 'flight')];
    if (!f) throw new Error('ring island: no such flight');
    const u0 = f.u0 / 100,
      u1 = f.u1 / 100,
      y0 = f.y0 / 100,
      y1 = f.y1 / 100;
    return {
      u0,
      u1,
      lat: f.lat / 100,
      y0,
      y1,
      len: Math.abs(u1 - u0),
      mid: (u0 + u1) / 2,
      'mid-y': y0 + (y1 - y0) * 0.5,
    };
  }
  const l = ramp?.landings[finite(place.landing, 'landing')];
  if (!l) throw new Error('ring island: no such landing');
  const u0 = Math.min(l.u0, l.u1) / 100,
    u1 = Math.max(l.u0, l.u1) / 100,
    l0 = l.lat0 / 100,
    l1 = l.lat1 / 100;
  // Its deck is one slab: the greybox laid a landing in 50 m spans.
  if (u1 - u0 > 50) throw new Error('ring island: a landing longer than one span');
  return { u0, u1, l0, l1, y: l.y / 100, mid: (u0 + u1) / 2, 'lat-mid': (l0 + l1) / 2 };
}
/** Metre `k` of the crossover (RING_END.cross): its ends `u0`, `u1` and the eased homeward track's lateral there,
 * `lat0`, `lat1` (eased from its own, TRACKS[1], to the original track's 0, as place/layout.ts's crossLat). */
function crossoverFrame(place: JsonObject): Anchors {
  const [c0, c1] = [RING_END.cross.u0 / 100, RING_END.cross.u1 / 100];
  const ease = (t: number) => t * t * (3 - 2 * t);
  const lat = (u: number) => TRACKS[1]! * (1 - ease((u - c0) / (c1 - c0)));
  const k = finite(place.k, 'crossover k');
  if (!Number.isInteger(k) || k < 0 || !(c0 + k < c1 - 1e-6)) throw new Error('ring island: no such crossover metre');
  const u0 = c0 + k,
    u1 = Math.min(c1, u0 + 1);
  return { u0, u1, lat0: lat(u0), lat1: lat(u1) };
}
/** How many of each generated piece the catalog asks for, by placement id prefix: the greybox's loops on RING_RAMPS,
 * RING_GAP and RING_HALT. The level authors its counts; one that no longer matches the catalog refuses to load. */
function generatedCounts(): [string, number][] {
  const count = (from: number, to: number, step: number, upTo = false) => {
    let n = 0;
    for (let u = from; upTo ? u <= to : u < to - 1e-6; u += step) n++;
    return n;
  };
  const rows: [string, number][] = [];
  RING_RAMPS.forEach((ramp, r) => {
    ramp.flights.forEach((f, k) => {
      const at = `ramp${r + 1}/flight${k + 1}/`,
        len = Math.abs(f.u1 - f.u0) / 100;
      rows.push([at + 'ramp', 1]);
      // A slipway is its sand ramp alone; a flight has a tread every 0.4 m to half a tread short of its top.
      let treads = 0;
      while (treads * 0.4 < len - 0.2) treads++;
      rows.push(f.slip ? [at, 1] : [at + 'tread', treads]);
    });
    rows.push([`ramp${r + 1}/flight${ramp.flights.length + 1}/`, 0]);
    ramp.landings.forEach((_, k) => rows.push([`ramp${r + 1}/landing${k + 1}/deck`, 1]));
    rows.push([`ramp${r + 1}/landing${ramp.landings.length + 1}/`, 0]);
  });
  rows.push([`ramp${RING_RAMPS.length + 1}/`, 0]);
  // The Way: 10 m deck spans from the hinge to WAY_END, truss posts every 6 m from 3 m out to the halt's south end (a
  // pair), the top rails in 10 m lengths over the same (one a side), a pier every 20 m from 40 m out.
  rows.push(['way/deck/', count(HINGE, WAY_END, 10)]);
  rows.push(['way/post/', 2 * count(HINGE + 3, HALT[0], 6, true)]);
  rows.push(['way/rail/', 2 * count(HINGE + 3, HALT[0], 10)]);
  rows.push(['way/pier/', count(HINGE + 40, HALT[0], 20)]);
  // The track on the Way: per track a bed and two rails in 10 m lengths over the deck's spans.
  const lengths = TRACKS.length * count(HINGE, WAY_END, 10);
  rows.push(['track/bed/', lengths], ['track/rail/', 2 * lengths], ['track/', 3 * lengths]);
  // The halt's two platforms (a deck, a landing and a ramp each), the foot crossing's planks, bed and slab, the west
  // platform's ramp, and the crossover's bed and rails a metre at a time.
  rows.push(['platform/', 3 * [RING_HALT.offsetLat, RING_HALT.downLat].length]);
  rows.push(['crossing/plank/', ringCrossingPlanks().length], ['crossing/', ringCrossingPlanks().length + 2]);
  rows.push(['west-ramp', 1]);
  rows.push(['crossover/', 3 * count(RING_END.cross.u0 / 100, RING_END.cross.u1 / 100, 1)]);
  return rows;
}
/** The frames on the ground (path.ts): the summit path's legs (`path`: leg `leg`'s piece `k` of its 6 m lengths, from
 * `x0`, `z0` to `x1`, `z1`), the footbridge (`bridge`: its deck's ends `a-` and `b-` x, y, z, `span`, `width`, `thick`,
 * `under` (its underside, from the top), `parapet` (the parapets' height), `parapet-l` and `parapet-r` (their sides),
 * `yaw` (along the deck), and with `bent` that bent's `bent-d` (along the deck) and `bent-under` (the underside there);
 * `on` is a point `d` along the deck from a, `side` to its right and `dy` over its top) and the rim rocks (`rim`,
 * rock `k`). `counts` are the placements the ground asks for, by id prefix. */
function summitFrames(g: IslandGround, centre: { x: number; z: number }) {
  const { way, bridgeLeg } = summitPath(g, centre),
    { a, b } = summitBridge(g),
    B = SUMMIT_BRIDGE;
  const span = Math.hypot(b.x - a.x, b.z - a.z),
    ax = (b.x - a.x) / span,
    az = (b.z - a.z) / span;
  const on = (d: number, side: number, dy: number) => ({
    x: a.x + ax * d - az * side,
    y: a.y + ((b.y - a.y) * d) / span + dy,
    z: a.z + az * d + ax * side,
  });
  // The path's beams: 6 m lengths a leg, none on the approach's last leg (the trail and the landing) or the deck.
  const legs = way
    .slice(0, -1)
    .map(([ax, az], i) =>
      i === bridgeLeg || i === bridgeLeg - 1
        ? 0
        : Math.max(1, Math.ceil(Math.hypot(way[i + 1]![0] - ax, way[i + 1]![1] - az) / 6)),
    );
  const side = B.width / 2 - 0.06;
  const bridge: Anchors = {
    'a-x': a.x,
    'a-y': a.y,
    'a-z': a.z,
    'b-x': b.x,
    'b-y': b.y,
    'b-z': b.z,
    span,
    width: B.width,
    thick: B.thick,
    under: -B.thick,
    parapet: B.parapet,
    'parapet-l': -1 * side,
    'parapet-r': 1 * side,
    yaw: Math.atan2(ax, az),
  };
  const counts: [string, number][] = [
    ...legs.map((n, i): [string, number] => [`path/leg${i + 1}/`, n]),
    [`path/leg${legs.length + 1}/`, 0],
    ['path/', legs.reduce((s, n) => s + n, 0)],
    ['bridge/deck', 1],
    ['bridge/parapet', 2],
    ['bridge/abutment', 2],
    ...B.bents.map((_, k): [string, number] => [`bridge/bent${k + 1}/`, 3]),
    [`bridge/bent${B.bents.length + 1}/`, 0],
    ['bridge/', 5 + 3 * B.bents.length],
  ];
  return {
    on,
    counts,
    path(place: JsonObject): Anchors {
      const i = finite(place.leg, 'leg'),
        k = finite(place.k, 'leg k'),
        n = legs[i];
      if (!n || !Number.isInteger(k) || k < 0 || k >= n) throw new Error('ring island: no such path length');
      const [ax, az] = way[i]!,
        [bx, bz] = way[i + 1]!;
      return {
        x0: ax + ((bx - ax) * k) / n,
        z0: az + ((bz - az) * k) / n,
        x1: ax + ((bx - ax) * (k + 1)) / n,
        z1: az + ((bz - az) * (k + 1)) / n,
      };
    },
    bridge(place: JsonObject): Anchors {
      if (place.bent === undefined) return bridge;
      const d = B.bents[finite(place.bent, 'bent')];
      if (d === undefined) throw new Error('ring island: no such bent');
      return { ...bridge, 'bent-d': d, 'bent-under': on(d, 0, -B.thick).y };
    },
  };
}
type SummitFrames = ReturnType<typeof summitFrames>;
/** World poses for a furnishing placement: its frame's operands resolved on the island as it stands. */
function resolvePlacement(
  p: Placement,
  frames: Readonly<Record<'halt' | 'brace' | 'line' | 'steps' | 'summit', Anchors>>,
  ground: (x: number, z: number) => number,
  toward: (to: Json | undefined) => { x: number; z: number },
  summitAt: SummitFrames,
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
  /** An upright box turned to the line (or `yaw`), from bottom to top: the greybox's post. */
  const upright = (
    c: { x: number; z: number },
    bottom: number,
    top: number,
    w: number,
    d: number,
    yaw = YAW,
  ): Placement => ({
    id: p.id,
    prefab: p.prefab,
    pos: [c.x, (bottom + top) / 2, c.z],
    rot: [yaw, 0, 0],
    scale: [w, top - bottom, d],
    params,
  });
  /** An upright box over (u0..u1, l0..l1), bottom to top: the greybox's block. */
  const block = (u0: number, u1: number, l0: number, l1: number, bottom: number, top: number) =>
    upright(at((u0 + u1) / 2, (l0 + l1) / 2), bottom, top, l1 - l0, u1 - u0);
  /** A box from a to b (its centreline, its top at a.y and b.y), w wide and h deep: the greybox's beam. */
  const beam = (a: THREE.Vector3Like, b: THREE.Vector3Like, w: number, h: number): Placement => {
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
  };
  if (frame === 'pennant') {
    // One of the pennant pole's footing blocks: the far view's one definition (pennantFooting), at the pole's deck.
    const f = PENNANT_FOOTING[finite(place.footing, 'footing')];
    if (!f) throw new Error(`ring island: ${p.id} footing`);
    return block(f.u0, f.u1, f.lat0, f.lat1, f.y0, f.y1);
  }
  let anchors: Anchors;
  if (frame === 'flight' || frame === 'landing') anchors = rampFrame(place);
  else if (frame === 'crossover') anchors = crossoverFrame(place);
  else if (frame === 'path') anchors = summitAt.path(place);
  else if (frame === 'bridge') anchors = summitAt.bridge(place);
  else if (frame === 'halt' || frame === 'brace' || frame === 'line' || frame === 'steps' || frame === 'summit')
    anchors = frames[frame];
  else throw new Error(`ring island: ${p.id} frame`);
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
  if (place.plank !== undefined) {
    // Plank k of the foot crossing (state.ts's ringCrossingPlanks): its laterals.
    const plank = ringCrossingPlanks()[finite(place.plank, 'plank')];
    if (!plank) throw new Error(`ring island: ${p.id} plank`);
    anchors = { ...anchors, 'plank-l0': plank[0], 'plank-l1': plank[1] };
  }
  /** A point on the footbridge's deck (`d` along it, `side` to its right, `dy` over its top). */
  const onDeck = (v: Json | undefined, dy: boolean) => {
    if (frame !== 'bridge') throw new Error(`ring island: ${p.id} on`);
    const o = object(v, 'on');
    return summitAt.on(value(o.d, anchors), value(o.side, anchors), dy ? value(o.dy, anchors) : 0);
  };
  /** (x, z) of a point: (u, lat) on the line, (x, z) in the summit's frame, or on the footbridge's deck. */
  const xz = (q: JsonObject) =>
    q.u !== undefined
      ? at(value(q.u, anchors), value(q.lat, anchors))
      : q.on !== undefined
        ? onDeck(q.on, false)
        : { x: value(q.x, anchors), z: value(q.z, anchors) };
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
    return block(u0, u1, l0, l1, bottom, top);
  }
  if (place.stanchion !== undefined) {
    // Post k of a handrail's n + 1 from a to b ((u, lat) and the foot's y): the greybox's handrail, its posts every
    // n-th of the way, `rise` tall and w square. n is authored and must be the handrail's own (one per 3 m).
    const q = object(place.stanchion, 'stanchion'),
      a = object(q.a, 'stanchion a'),
      b = object(q.b, 'stanchion b');
    const u0 = value(a.u, anchors),
      lat0 = value(a.lat, anchors),
      y0 = value(a.y, anchors),
      u1 = value(b.u, anchors),
      lat1 = value(b.lat, anchors),
      y1 = value(b.y, anchors);
    const n = finite(q.n, 'stanchion n'),
      k = finite(q.k, 'stanchion k'),
      w = finite(q.w, 'stanchion width');
    if (n !== Math.max(1, Math.round(Math.hypot(u1 - u0, lat1 - lat0) / 3)) || !Number.isInteger(k) || k < 0 || k > n)
      throw new Error(`ring island: ${p.id} stanchion`);
    const t = k / n,
      c = at(u0 + (u1 - u0) * t, lat0 + (lat1 - lat0) * t),
      y = y0 + (y1 - y0) * t;
    return upright(c, y, y + finite(q.rise, 'stanchion rise'), w, w);
  }
  if (place.post !== undefined) {
    const q = object(place.post, 'post'),
      c = xz(q);
    const [bottom, top] = span(q.y, ground(c.x, c.z));
    const yaw = q.yaw === undefined ? YAW : value(q.yaw, anchors);
    return upright(c, bottom, top, finite(q.w, 'post width'), finite(q.d, 'post depth'), yaw);
  }
  if (place.beam !== undefined) {
    // A box from a to b (its centreline, its top at a.y and b.y), w wide and h deep: the greybox's beam. An end is a
    // point (u, lat) on the line, a world (x, z), on the footbridge's deck, or `d` metres out from the summit's middle
    // along (x, z) `along`.
    const q = object(place.beam, 'beam');
    const end = (e: JsonObject) => {
      if (e.u !== undefined) return { ...at(value(e.u, anchors), value(e.lat, anchors)), y: value(e.y, anchors) };
      if (e.on !== undefined) return onDeck(e.on, true);
      if (e.x !== undefined) {
        const x = value(e.x, anchors),
          z = value(e.z, anchors);
        return { x, y: value(e.y, { ...anchors, ground: ground(x, z) }), z };
      }
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
    return beam(end(object(q.a, 'beam a')), end(object(q.b, 'beam b')), value(q.w, anchors), value(q.h, anchors));
  }
  if (place.tread !== undefined) {
    // Tread k of a flight: from k pitches up it, `run` long, `lift` over the ramp's top, w wide and h deep. The last
    // tread starts more than half a pitch short of the flight's top (rampCounts holds the count to the catalog).
    const q = object(place.tread, 'tread'),
      k = finite(q.k, 'tread k'),
      pitch = finite(q.pitch, 'tread pitch'),
      run = finite(q.run, 'tread run'),
      lift = finite(q.lift, 'tread lift');
    const u0 = anchors.u0!,
      u1 = anchors.u1!,
      lat = anchors.lat!,
      y0 = anchors.y0!,
      y1 = anchors.y1!,
      len = anchors.len!;
    if (frame !== 'flight' || !Number.isInteger(k) || k < 0 || !(k * pitch < len - pitch / 2))
      throw new Error(`ring island: ${p.id} tread`);
    const y = (t: number) => y0 + (y1 - y0) * t,
      t0 = (k * pitch) / len,
      t1 = (k * pitch + run) / len;
    return beam(
      p3(u0 + (u1 - u0) * t0, lat, y(t0) + lift),
      p3(u0 + (u1 - u0) * t1, lat, y(t1) + lift),
      value(q.w, anchors),
      finite(q.h, 'tread depth'),
    );
  }
  if (place.slab !== undefined) {
    // A level deck over (u0..u1, l0..l1), its top at y, h deep: the greybox's deck in one span, a beam down its middle.
    const q = object(place.slab, 'slab');
    const [u0, u1] = span(q.u),
      [l0, l1] = span(q.lat),
      y = value(q.y, anchors),
      mid = (l0 + l1) / 2;
    return beam({ ...at(u0, mid), y }, { ...at(u1, mid), y }, l1 - l0, finite(q.h, 'slab depth'));
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
export function createRingIslandView(g: IslandGround, cones: readonly Cone[], centre: { x: number; z: number }) {
  const root = new THREE.Group();
  root.name = 'ring-island';
  const material = new THREE.MeshStandardNodeMaterial({ vertexColors: true, roughness: 0.9, flatShading: true });
  const parts = createParts();

  // ---------------------------------------------------------------- the furnishing's records
  // Instantiated off (no bodies) until the near view mounts: setMounted turns their solids on with the island's own.
  const owner = createOwnedView();
  const records: ReturnType<typeof instantiate>[] = [];
  /** A world direction (x, z) from the halt's middle toward a world (x, z): where the branch read points. */
  const haltMid = at((HALT[0] + HALT[1]) / 2, FORM.mid);
  const pathFoot = summitPathFoot();
  // The path, the footbridge and the rim rocks stand on the ground: a level whose counts no longer match it refuses to
  // load, as generatedCounts' do for the catalog's rows; and the rocks' stones are summitRimRockShape's.
  const summitAt = summitFrames(g, centre);
  for (const [prefix, n] of summitAt.counts)
    if (furnishing.filter((p) => p.id.startsWith(prefix)).length !== n)
      throw new Error(`ring island: ${prefix} is not placed as the ground lays it out (${n})`);
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
      // The platforms' laterals, middles and widths, the rail tops' level (`rail`), the formation's edges, the foot
      // crossing (RING_CROSSING) and where the path starts (`path-x`, `path-z`).
      'up-l0': upL0,
      'up-l1': upL1,
      'down-l0': dnL0,
      'down-l1': dnL1,
      'up-mid': (upL0 + upL1) / 2,
      'down-mid': (dnL0 + dnL1) / 2,
      'up-width': upL1 - upL0,
      'down-width': dnL1 - dnL0,
      rail: HALT_Y,
      left: FORM.left,
      right: FORM.right,
      'x-u0': X.u0,
      'x-u1': X.u1,
      'x-landing0': X.landing[0],
      'x-landing1': X.landing[1],
      'ramp-top': X.rampTop,
      'x-top': X.top,
      'path-x': pathFoot.x,
      'path-z': pathFoot.z,
    },
    brace: {
      u0: BRACE.u0,
      u1: BRACE.u1,
      l0: BRACE.l0,
      l1: BRACE.l1,
      top: BRACE.y,
      hinge: HINGE,
      right: FORM.right,
      'strut-x': RING_BRACE.x / 100,
      'strut-z': RING_BRACE.z / 100,
    },
    line: {
      hinge: HINGE,
      left: FORM.left,
      right: FORM.right,
      mid: FORM.mid,
      width: FORM.right - FORM.left,
      halt: HALT[0],
      end: WAY_END,
      ...Object.fromEntries(TRACKS.map((t, k) => [`track${k + 1}`, t])),
    },
    steps: {
      u0: RING_STEPS.u0 / 100,
      u1: RING_STEPS.u1 / 100,
      lat: RING_STEPS.lat / 100,
      y0: RING_STEPS.y0 / 100,
      top: RING_STEPS.y1 / 100,
      right: FORM.right,
    },
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
      const record = instantiate(p.prefab, resolvePlacement(p, frames, g.islandH, toward, summitAt), {
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
  // Records too (content/levels/ring-island.ts, in this order): the hinge pier's two blocks, the pennant pole's footing,
  // the brace platform (its deck, pier, handrail, the gold strut under the heel on rail.brace's site, RING_BRACE, and
  // one of the folk waving you over: a looker, never Rivet, call 37) and the steps from its far end up to their deck
  // (RING_STEPS) with a landing onto the deck's east edge.
  furnish((p) => p.id.startsWith('pier/'));
  if (POLE_PENNANT && furnish((p) => p.id.startsWith('pennant/')).length !== PENNANT_FOOTING.length)
    throw new Error('ring island: the pennant footing is not all placed');
  furnish((p) => p.id.startsWith('brace/'));
  furnish((p) => p.id.startsWith('steps/'));
  // The sea ramps (RING_RAMPS): each one's flights (the slipway, then switchback flights with treads, kerbs, handrails
  // and a pile), then its landings (a deck, a pile and a seaward handrail). Records too, generated on the catalog.
  furnish((p) => p.id.startsWith('ramp'));

  // ---------------------------------------------------------------- the Pilgrims' Way: their stub, laid double track
  // The deck, the truss posts and top rails and the piers are records (content/levels/ring-island.ts, `way/`), and so
  // is the track between them (`track/`): beds and rails, drawn only.
  furnish((p) => p.id.startsWith('way/deck/'));
  furnish((p) => p.id.startsWith('track/'));
  furnish((p) => p.id.startsWith('way/') && !p.id.startsWith('way/deck/'));

  // ---------------------------------------------------------------- the island halt
  // The platforms, solid down to the fill (ground.ts), so no gap shows under them. They start at the foot crossing's
  // ramp tops (docs/plans/ring-island-crossing.md): their first 6.6 m are its landings and ramps (a landing at the rail
  // tops, carried on under the ramp as its fill, and the ramp the platform's full width). Then the planks between the
  // landings, five timber spans with a flangeway by each rail, drawn only, over one solid slab whose top is the rail
  // tops (drawn a plank's depth lower, as the bed in the flangeways, so the rails show), and the west platform's ramp
  // off its north end, down onto the slope where the path starts. Records (content/levels/ring-island.ts, `platform/`,
  // `crossing/`, `west-ramp`).
  furnish((p) => p.id.startsWith('platform/'));
  furnish((p) => p.id.startsWith('crossing/'));
  furnish((p) => p.id === 'west-ramp');
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
  // The offset track's lateral eased from its own (-4, TRACKS[1]: the homeward track since v45) to the original track's
  // (0) over RING_END.cross, as place/layout.ts's crossLat does at Far Head: ballast and a pair of rails, a metre at a
  // time, on the Way's grade. Rails only; records (content/levels/ring-island.ts, `crossover/`, crossoverFrame).
  furnish((p) => p.id.startsWith('crossover/'));

  // ---------------------------------------------------------------- the path up to the summit lookout
  // Records (content/levels/ring-island.ts, `path/`, `bridge/`, `rim/`, in this order), on the ground's frames
  // (summitFrames): the path's 6 m lengths a leg, drawn only (the trail is the ground under them); the footbridge over
  // the stack line's cutting, blocked out at true size (docs/plans/ring-summit-path.md): a timber deck flush with the
  // path at both rims, two orange parapets low enough to hop, a concrete abutment under each end and two dark steel
  // bents standing just outside the cutting's flat floor, all solid; and the cutting's summit-side rim, marked: a sparse
  // line of pale rocks 1.5 m behind the edge where the path runs near it, because from uphill the rim is a convex edge
  // that hides the drop, each a stone and a box inscribed in it (test/ring-island-path.test.ts), low enough to step
  // round or hop. The approach's trail and the landing are the ground's, drawn here between the deck and the parapets.
  const CX = centre.x,
    CZ = centre.z;
  furnish((p) => p.id.startsWith('path/'));
  furnish((p) => p.id === 'bridge/deck');
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
  }
  furnish((p) => p.id.startsWith('bridge/') && p.id !== 'bridge/deck');
  // The summit lookout: its deck, rail posts and one of the folk, and a short ramp from the path's end up onto the deck,
  // whose rim stands about 1.5 m over the slope. The deck's top is `lift` over the ground at the island's middle.
  const summitDeck = furnishing.find((p) => p.prefab === 'ring.summit-deck');
  const summit = g.islandH(CX, CZ) + finite(object(summitDeck?.params?.place, 'summit deck').lift, 'summit lift');
  frames.summit = { cx: CX, cz: CZ, top: summit };
  furnish((p) => p.id.startsWith('summit/'));

  const shell = new THREE.Mesh(parts.merged(), material);
  shell.castShadow = shell.receiveShadow = true;
  root.add(shell);

  // ---------------------------------------------------------------- the ground: the grid as one mesh and one heightfield
  const ground = (() => {
    const { nx, nz, x0, z0, cell } = g;
    const pos = new Float32Array(nx * nz * 3 + g.patch.vertices.length),
      col = new Float32Array(pos.length),
      cut = new Float32Array(pos.length / 3);
    const land = new THREE.Color(LAND),
      land2 = new THREE.Color(LAND2),
      sand = new THREE.Color(SAND),
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
      cut[k] = THREE.MathUtils.smoothstep(g.cone(x, z) - h, 0.3, 1.5);
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
    geo.setAttribute('cutRock', new THREE.BufferAttribute(cut, 1));
    geo.setIndex(index);
    geo.computeVertexNormals();
    const groundMaterial = new THREE.MeshStandardNodeMaterial({ roughness: 0.95 });
    groundMaterial.colorNode = mix(vertexColor().rgb, beddedRock(positionWorld.sub(vec3(ORIGIN.x, 0, ORIGIN.z))), attribute('cutRock', 'float'));
    const mesh = new THREE.Mesh(geo, groundMaterial);
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
    bodies: [...groundBodies, leafBody] as readonly Body[],
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

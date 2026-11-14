// The look's kit, from assets/src/place-kit.py (Blender, through `npm run assets`): real pieces in place of the greybox's
// boxes, batched by part and material the way the board asks. The track keeps its run, timing and colliders: `lookTrack`
// only reroutes where its matrices land. The file loads after the first frame, so each mesh starts on a speck of geometry
// and takes its piece when the kit arrives. With `mats` or `contact` and no kit, the same routing draws today's unit boxes
// with those looks. The machine keeps its cars' sizes, so its colliders still fit. Local and cosmetic.
import * as THREE from 'three/webgpu';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { guardInstances } from '../render/draw-count.ts';
import kitUrl from '../../assets/built/place-kit.glb?url';
import { camera } from '../render/scene.ts';
import { warmDraw } from '../render/precompile.ts';
import {
  FAR_KINDS,
  SHADOW_GATED,
  castsShadow,
  chunkRuns,
  growBounds,
  isHidden,
  trackLevel,
  type ChunkRun,
} from '../entities/railway/track-chunks.ts';
import { LOCO, TRAILER } from '../render/wagon-look.ts';
import { H } from './land.ts';
import { LOOK, STEEL, addBlob, bakeContact, honeyOf, paint, setBlob, type Paint } from './look.ts';
import type { DropSet } from './pieces.ts';
import { setViewGeometry, type OwnedView } from '../render/owned-view.ts';
import { makeBoiler } from '../render/carry-models.ts';
import { makeProp } from '../render/prop-kit.ts';
import { ENGINE_BOILER, ENGINE_WHEELS } from '../entities/railway/engine.ts';
import { FLAT_RACK } from '../entities/railway/cars.ts';

// ---------------------------------------------------------------- the file
const SPECK = new THREE.BufferGeometry();
SPECK.setAttribute('position', new THREE.BufferAttribute(new Float32Array(9), 3));
SPECK.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(9), 3));
if (LOOK.contact) SPECK.setAttribute('color', new THREE.BufferAttribute(new Float32Array(9), 3));
const waiting = new Map<string, THREE.Mesh[]>();
const baked = new Map<string, THREE.BufferGeometry>();
let loadedKit: THREE.Object3D | null = null;
function kitGeometry(name: string): THREE.BufferGeometry {
  const cached = baked.get(name);
  if (cached) return cached;
  if (name.startsWith('feeder_bed:')) {
    // The kit's bed was cut for the old 3.2 m feeder. Fit it to the span, so it starts at the receiver's side
    // instead of running back through it into its middle, and ends where the feeder's collider ends.
    const span = Number(name.split(':')[1]);
    const geometry: THREE.BufferGeometry = kitGeometry('feeder_bed').clone();
    geometry.computeBoundingBox();
    const box = geometry.boundingBox!;
    const centre = (box.min.x + box.max.x) / 2;
    geometry.translate(-centre, 0, 0).scale(span / (box.max.x - box.min.x), 1, 1);
    geometry.computeBoundingBox();
    geometry.computeBoundingSphere();
    baked.set(name, geometry);
    return geometry;
  }
  if (name.startsWith('feeder_steel:')) {
    const span = Number(name.split(':')[1]);
    const parts = [kitGeometry(`feeder_bed:${span}`).clone()];
    for (let k = 0; k < Math.round(span / 0.3); k++)
      parts.push(
        kitGeometry('roller')
          .clone()
          .translate((k + 0.5) * 0.3 - span / 2, 0.58, 0),
      );
    // Contact colour was baked on each original piece, before placement. The steel
    // material has no local-position grain or instance-index variation to preserve.
    const geometry = mergeGeometries(parts);
    for (const part of parts) part.dispose();
    if (!geometry) throw new Error('Place feeder has incompatible attributes');
    baked.set(name, geometry);
    return geometry;
  }
  const src = loadedKit?.getObjectByName(name);
  let found: THREE.Mesh | undefined;
  src?.traverse((o) => {
    if (o instanceof THREE.Mesh) found = o;
  });
  if (!found) throw new Error(`place-kit has no ${name}`);
  const geometry = bake(found, name);
  baked.set(name, geometry);
  return geometry;
}
const LOG_COLORS = {
  bark: new THREE.Color('#5a3a1f'),
  band: new THREE.Color('#f2a51a'),
  cut: new THREE.Color('#e3b877'),
};

// Meshopt's quantized meshes put their scale on the node: a batch needs it in the vertices, in metres, as floats.
function bake(mesh: THREE.Mesh, name: string) {
  const src = mesh.geometry;
  const g = new THREE.BufferGeometry();
  const copy = (attr: string) => {
    const a = src.getAttribute(attr) as THREE.BufferAttribute;
    const f = new Float32Array(a.count * 3);
    for (let i = 0; i < a.count; i++) f.set([a.getX(i), a.getY(i), a.getZ(i)], i * 3);
    g.setAttribute(attr, new THREE.BufferAttribute(f, 3));
  };
  copy('position');
  copy('normal');
  g.setIndex(src.index);
  g.applyMatrix4(mesh.matrixWorld);
  if (name === 'log') logColors(g);
  if (LOOK.contact && name !== 'log') bakeContact(g);
  return g;
}
/** The log's look is by where on it you are: bark, one amber band, pale ends. */
function logColors(g: THREE.BufferGeometry) {
  const p = g.getAttribute('position') as THREE.BufferAttribute,
    n = g.getAttribute('normal') as THREE.BufferAttribute;
  const col = new Float32Array(p.count * 3),
    c = new THREE.Color();
  for (let i = 0; i < p.count; i++) {
    const end = Math.abs(n.getX(i)) > 0.7,
      x = p.getX(i);
    c.copy(end ? LOG_COLORS.cut : x > 0.14 && x < 0.2 ? LOG_COLORS.band : LOG_COLORS.bark);
    col.set([c.r, c.g, c.b], i * 3);
  }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
}
// The machine feeder requests kit pieces with look=none too.
void import('../render/assets.ts')
  .then((a) => a.loadAsset(kitUrl))
  .then((asset) => {
    asset.gltf.scene.updateMatrixWorld(true);
    loadedKit = asset.gltf.scene;
    for (const [name, meshes] of waiting) {
      const g = kitGeometry(name);
      for (const m of meshes) useKitGeometry(m, g);
    }
    waiting.clear();
    for (const c of liveChunks) c.level = 0; // every batch has just taken its full shape
  });
function useKitGeometry(mesh: THREE.Mesh, geometry: THREE.BufferGeometry) {
  setViewGeometry(mesh, geometry);
  // Static station bounds must include the loaded piece, not the startup speck.
  if (mesh instanceof THREE.InstancedMesh && mesh.frustumCulled) mesh.computeBoundingSphere();
}
function want<M extends THREE.Mesh>(name: string, mesh: M, owner: OwnedView) {
  if (loadedKit) useKitGeometry(mesh, kitGeometry(name));
  else {
    let list = waiting.get(name);
    if (!list) waiting.set(name, (list = []));
    list.push(mesh);
    owner.cleanup(() => {
      const pending = waiting.get(name);
      const at = pending?.indexOf(mesh) ?? -1;
      if (pending && at >= 0) pending.splice(at, 1);
    });
  }
  mesh.castShadow = mesh.receiveShadow = true;
  return mesh;
}
/** One kit piece, drawn once. */
const piece = (name: string, p: Paint, owner: OwnedView) => want(name, new THREE.Mesh(SPECK, paint(p)), owner);
/** A batch of a kit piece. */
export function kitBatch(name: string, p: Paint, n: number, owner: OwnedView) {
  const m = want(name, new THREE.InstancedMesh(SPECK, paint(p), Math.max(1, n)), owner);
  m.frustumCulled = false;
  return guardInstances(m, `place kit ${name}`);
}
/** The same contract as pieceMesh: a log batch, hidden until committed. Its colours are its own, so its tint is white. */
export function kitLogs(max: number, owner: OwnedView) {
  const m = kitBatch(
    'log',
    { color: '#ffffff', own: true, rough: 0.9, grain: { axis: 'x', honey: '#ffffff' } },
    max,
    owner,
  );
  m.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(max * 3), 3);
  m.count = 0;
  m.visible = false;
  return m;
}

// ---------------------------------------------------------------- the track
type Part = { mesh: THREE.InstancedMesh; inv: THREE.Vector3 };
const WOOD_KINDS: Record<string, { axis: 'x' | 'y' | 'z'; unit: [number, number, number] }> = {
  sleeper: { axis: 'x', unit: [2.3, 0.12, 0.42] },
  plank: { axis: 'x', unit: [3.6, 0.12, 0.84] },
  cap: { axis: 'x', unit: [5, 0.55, 1] },
  stringer: { axis: 'z', unit: [0.8, 0.4, 6.6] },
  leg: { axis: 'y', unit: [0.5, 8, 0.5] },
  brace: { axis: 'y', unit: [0.26, 8, 0.26] },
};
// A leg or brace is as long as its drop: its height stays a scale over the kit's 1 m piece. The rest are their own size.
const KIT_SIZE: Record<string, [number, number, number]> = {
  sleeper: [2.3, 0.12, 0.42],
  plank: [3.6, 0.12, 0.84],
  cap: [5, 0.55, 1],
  stringer: [0.8, 0.4, 6.6],
  rail: [0.1, 0.12, 3.05],
  leg: [0.5, 1, 0.5],
  brace: [0.26, 1, 0.26],
};
const KIT_NAME: Record<string, string> = { leg: 'post' };
const unitBox = new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0);
if (LOOK.contact && !LOOK.kit) bakeContact(unitBox, 0.42, 1);
const tm = new THREE.Matrix4();

/** One chunk of one kind: its meshes, the bounds of what has landed in it, and whether it casts. */
type TrackChunk = {
  run: ChunkRun;
  meshes: THREE.InstancedMesh[];
  /** Each mesh with its kit piece, to swap for the plain shape. */
  parts: { mesh: THREE.InstancedMesh; name: string }[];
  /** The level (`TRACK_LOD_FROM`) its parts draw at; far kinds only. */
  level: number;
  /** Where each piece lies (x, y, z per slot; NaN while hidden): a chunk's box is loose on a bend, so its level goes by its nearest piece. */
  at: Float32Array;
  box: THREE.Box3;
  sphere: THREE.Sphere;
  placed: boolean;
  shadow: boolean;
  gated: boolean;
};
const liveChunks = new Set<TrackChunk>();
let warmRegistered = false;

/** Draws a track's pieces by kind and chunk (src/entities/railway/track-chunks.ts), in the looks that are on. The set keeps its timing: only its matrices
 * are redirected. `chunks[k]` is piece k's chunk along the line (`chunkOf(u)`); each chunk is its own instanced batch
 * with the bounds of what has landed in it, hidden until something has, and its tall pieces cast only near the camera. */
export function lookTrack(set: DropSet, kinds: string[], owner: OwnedView, chunks: readonly number[] = []): DropSet {
  if (!LOOK.kit && !LOOK.mats && !LOOK.contact) return set;
  set.mesh.removeFromParent();
  const { runs, of } = chunkRuns(kinds, chunks);
  const state: TrackChunk[] = [];
  const parts = runs.map((run): Part[] => {
    const size = LOOK.kit ? KIT_SIZE[run.kind]! : ([1, 1, 1] as const);
    const inv = new THREE.Vector3(1 / size[0], 1 / size[1], 1 / size[2]);
    const wood = WOOD_KINDS[run.kind];
    const base = set.boxes[kinds.indexOf(run.kind)]!.color;
    const hex = `#${base.getHexString(THREE.SRGBColorSpace)}`;
    const p: Paint = wood
      ? {
          color: hex,
          grain: { axis: wood.axis, honey: honeyOf(hex), ...(LOOK.kit ? {} : { scale: wood.unit }) },
        }
      : STEEL;
    const n = run.count;
    const list: Part[] = [];
    const names: string[] = [];
    if (LOOK.kit) {
      names.push(KIT_NAME[run.kind] ?? run.kind);
      list.push({ mesh: kitBatch(names[0]!, p, n, owner), inv });
    } else {
      const mesh = new THREE.InstancedMesh(unitBox, paint(p), n);
      mesh.castShadow = mesh.receiveShadow = true;
      list.push({ mesh, inv });
    }
    if (LOOK.kit && run.kind === 'sleeper') {
      const plates = kitBatch('sleeper_steel', STEEL, n, owner);
      plates.castShadow = false;
      list.push({ mesh: plates, inv });
      names.push('sleeper_steel');
    }
    // The grain's seed is the instance index (the piece's place in its whole-line batch): this chunk starts at `from`.
    // Bounds come from what has landed (below); nothing is drawn until something has.
    const chunk: TrackChunk = {
      run,
      meshes: list.map((q) => q.mesh),
      parts: LOOK.kit ? list.map((q, k) => ({ mesh: q.mesh, name: names[k]! })) : [],
      level: 0,
      at: new Float32Array(FAR_KINDS.has(run.kind) ? n * 3 : 0).fill(NaN),
      box: new THREE.Box3(),
      sphere: new THREE.Sphere(),
      placed: false,
      shadow: true,
      gated: SHADOW_GATED.has(run.kind),
    };
    for (const q of list) {
      q.mesh.userData.grainBase = run.from;
      q.mesh.frustumCulled = true;
      q.mesh.visible = false;
      // The kit's arrival re-bounds a batch from its geometry; a chunk's bounds are its landed pieces, not that.
      q.mesh.computeBoundingSphere = () => void (q.mesh.boundingSphere = chunk.sphere);
    }
    // What lies flat on its bed has no shadow worth a second draw: the bed's contact blobs already ground it.
    if (run.kind === 'sleeper' || run.kind === 'rail') {
      for (const q of list) q.mesh.castShadow = false;
      chunk.shadow = false;
    }
    for (const q of list) {
      owner.add(q.mesh);
    }
    state.push(chunk);
    liveChunks.add(chunk);
    return list;
  });
  owner.cleanup(() => state.forEach((c) => liveChunks.delete(c)));
  if (!warmRegistered) {
    warmRegistered = true;
    // The warm-up frame draws every caster so its shadow pipelines build off-screen; the gating must not hide one.
    warmDraw(() => {
      for (const c of liveChunks)
        for (const m of c.meshes) {
          m.visible = true;
          if (c.gated) m.castShadow = true;
        }
      return () => {
        for (const c of liveChunks) setChunk(c);
      };
    });
  }
  const route = kinds.map((_, k) => ({ chunk: state[of[k]!.run]!, list: parts[of[k]!.run]!, at: of[k]!.slot }));
  const blobs = new Map<number, number>();
  set.mesh.setMatrixAt = (k: number, m: THREE.Matrix4) => {
    const r = route[k]!;
    for (const q of r.list) {
      q.mesh.setMatrixAt(r.at, tm.copy(m).scale(q.inv));
      q.mesh.instanceMatrix.needsUpdate = true;
    }
    const hidden = isHidden(m);
    if (r.chunk.at.length)
      r.chunk.at.set(hidden ? [NaN, NaN, NaN] : [m.elements[12]!, m.elements[13]!, m.elements[14]!], r.at * 3);
    if (!hidden) {
      growBounds(r.chunk.box, m).getBoundingSphere(r.chunk.sphere);
      if (!r.chunk.placed) {
        r.chunk.placed = true;
        setChunk(r.chunk);
      }
      for (const q of r.list) q.mesh.boundingSphere = r.chunk.sphere;
    }
    if (LOOK.contact && kinds[k] === 'sleeper') sleeperBlob(set, k, m, blobs, owner);
    return set.mesh;
  };
  const update = set.update;
  set.update = (dt: number) => {
    update(dt);
    for (const c of state) {
      if (!c.placed) continue;
      if (c.gated) {
        const casts = castsShadow(c.box.distanceToPoint(camera.position), c.shadow);
        if (casts !== c.shadow) {
          c.shadow = casts;
          setChunk(c);
        }
      } else if (loadedKit && FAR_KINDS.has(c.run.kind) && c.parts.length) {
        const level = trackLevel(nearest(c, camera.position), c.level);
        if (level !== c.level) {
          c.level = level;
          for (const q of c.parts) setViewGeometry(q.mesh, farGeometry(q.name, level));
        }
      }
    }
  };
  return set;
}
/** A kit piece's connected parts (triangles that meet at the same position) whose bounds `keep` accepts, as a geometry with the
 * piece's own attributes: a rail without its joint plates and bolts, the tie plates without their spikes. */
function keepParts(source: THREE.BufferGeometry, keep: (box: THREE.Box3) => boolean) {
  const position = source.getAttribute('position') as THREE.BufferAttribute;
  const index = source.getIndex()!.array;
  const root = new Map<string, string>();
  const find = (k: string): string => {
    let r = root.get(k) ?? k;
    while (r !== (root.get(r) ?? r)) r = root.get(r)!;
    root.set(k, r);
    return r;
  };
  const key = (i: number) =>
    `${position.getX(i).toFixed(4)},${position.getY(i).toFixed(4)},${position.getZ(i).toFixed(4)}`;
  for (let t = 0; t < index.length; t += 3) {
    const a = find(key(index[t]!));
    for (const o of [1, 2]) root.set(find(key(index[t + o]!)), a);
  }
  const boxes = new Map<string, THREE.Box3>();
  const point = new THREE.Vector3();
  for (let t = 0; t < index.length; t += 3) {
    const r = find(key(index[t]!));
    const box = boxes.get(r) ?? boxes.set(r, new THREE.Box3()).get(r)!;
    for (let o = 0; o < 3; o++) box.expandByPoint(point.fromBufferAttribute(position, index[t + o]!));
  }
  const kept: number[] = [];
  for (let t = 0; t < index.length; t += 3)
    if (keep(boxes.get(find(key(index[t]!)))!)) kept.push(index[t]!, index[t + 1]!, index[t + 2]!);
  const g = source.clone();
  g.setIndex(kept);
  g.computeBoundingBox();
  g.computeBoundingSphere();
  return g;
}
const size = new THREE.Vector3();
/** The shapes a heavy track piece (rail, sleeper, tie plates) takes beyond the kit's own (`TRACK_LOD_FROM`), by name and
 * level, in the kit piece's frame and with its vertex attributes, so the same pipeline draws every level. Level 1 drops
 * the hardware; level 2 is boxes over the piece's footprint (12 triangles each: a rail's body, a sleeper, a plate under
 * each rail). */
const lowered = new Map<string, THREE.BufferGeometry>();
function farGeometry(name: string, level: number) {
  if (level === 0) return kitGeometry(name);
  const id = `${name}:${level}`;
  let g = lowered.get(id);
  if (g) return g;
  const near = kitGeometry(name);
  near.computeBoundingBox();
  const b = near.boundingBox!;
  if (level === 1) {
    if (name === 'rail') g = keepParts(near, (box) => box.getSize(size).z > 1);
    else if (name === 'sleeper_steel') g = keepParts(near, (box) => box.getSize(size).x > 0.2);
    else g = near;
  } else {
    const parts: THREE.BufferGeometry[] = [];
    const add = (x0: number, x1: number, y0: number, y1: number, z0: number, z1: number) => {
      const part = new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0);
      part.deleteAttribute('uv');
      parts.push(part.translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2));
    };
    const cx = (b.min.x + b.max.x) / 2;
    if (name === 'rail') add(cx - 0.045, cx + 0.045, b.min.y, b.max.y, b.min.z, b.max.z);
    else if (name === 'sleeper') add(b.min.x, b.max.x, b.min.y, b.max.y, b.min.z, b.max.z);
    else if (name === 'sleeper_steel') {
      // One plate under each rail: 0.3 m across, 0.018 m thick (assets/src/place-kit.py).
      add(b.min.x, b.min.x + 0.3, b.min.y, b.min.y + 0.018, b.min.z, b.max.z);
      add(b.max.x - 0.3, b.max.x, b.min.y, b.min.y + 0.018, b.min.z, b.max.z);
    } else throw new Error(`no plain shape for ${name}`);
    g = mergeGeometries(parts, false);
    for (const part of parts) part.dispose();
    if (!g) throw new Error(`plain ${name}`);
    if (LOOK.contact) bakeContact(g);
    g.computeBoundingBox();
    g.computeBoundingSphere();
  }
  lowered.set(id, g);
  return g;
}
const nearest = (c: TrackChunk, p: THREE.Vector3) => {
  let best = Infinity;
  for (let i = 0; i < c.at.length; i += 3) {
    const dx = c.at[i]! - p.x,
      dy = c.at[i + 1]! - p.y,
      dz = c.at[i + 2]! - p.z;
    const d = dx * dx + dy * dy + dz * dz;
    if (d < best) best = d; // NaN (hidden) never wins
  }
  return Math.sqrt(best);
};
function setChunk(c: TrackChunk) {
  for (const m of c.meshes) {
    m.visible = c.placed;
    if (c.gated) m.castShadow = c.shadow;
  }
}
function sleeperBlob(set: DropSet, k: number, m: THREE.Matrix4, blobs: Map<number, number>, owner: OwnedView) {
  const b = set.boxes[k]!;
  const down = m.elements[0] !== 0 && Math.abs(m.elements[13]! - b.y) < 0.2;
  const yaw = Math.atan2(b.local.elements[8]!, b.local.elements[10]!);
  const h = blobs.get(k);
  if (!down) {
    if (h !== undefined) setBlob(h, 0, -999, 0, 0.01, 0.01, 0, owner);
    return;
  }
  const y = H(b.x, b.z);
  if (h === undefined) blobs.set(k, addBlob(b.x, y, b.z, 2.75, 0.8, yaw, owner));
  else setBlob(h, b.x, y, b.z, 2.75, 0.8, yaw, owner);
}

// ---------------------------------------------------------------- the stack frame and its feeder
const POST: Paint = { color: '#7f5630', grain: { axis: 'y', honey: honeyOf('#7f5630') } },
  LONG: Paint = { color: '#8a6236', grain: { axis: 'z', honey: honeyOf('#8a6236') } },
  SHORT: Paint = { color: '#8a6236', grain: { axis: 'x', honey: honeyOf('#8a6236') } },
  FLOOR: Paint = { color: '#6e4c2a', grain: { axis: 'z', honey: honeyOf('#6e4c2a') } },
  AMBER: Paint = { color: '#f2a51a', rough: 0.6 },
  CREAM: Paint = { color: '#efe0ba', rough: 0.7 },
  DARK: Paint = { color: '#3a3d44', rough: 0.6 },
  BED: Paint = { color: '#4a4d55', steel: true, rough: 0.6 },
  ROLLER: Paint = { color: '#a9adb5', steel: true, rough: 0.5 };
/** The frame and feeder of a station, in its own space (+z along the line, +x across): the greybox's sizes, real pieces. */
export function stationKit(
  g: THREE.Group,
  away: number,
  FRAME_D: number,
  FRAME_W: number,
  SPAN: number,
  corner = false,
  owner: OwnedView,
) {
  const { batches: stationBatches, pict: stationPict } = stationViews(owner);
  // Every station's pieces go in one batch per piece: nothing here moves, and six stations are no more draws than one.
  g.updateMatrix();
  const feederAt = new THREE.Matrix4().makeTranslation(-away * (FRAME_D / 2 + SPAN / 2), 0, 0).premultiply(g.matrix);
  // This station's own instances in the shared batches, with where each stands: `fold` flattens them (below).
  const mine: [THREE.InstancedMesh, number, THREE.Matrix4][] = [];
  const put = (name: string, p: Paint, m: THREE.Matrix4) => {
    const placed = stationPiece(name, p, m, stationBatches, owner);
    if (placed) mine.push([placed[0], placed[1], m.clone()]);
  };
  const at = (name: string, p: Paint, x: number, y: number, z: number, frame = g.matrix) =>
    put(name, p, stationM.makeTranslation(x, y, z).premultiply(frame));
  for (const sx of [-1, 1])
    for (const sz of [-1, 1]) {
      at('frame_post', POST, (sx * FRAME_D) / 2, 0, (sz * FRAME_W) / 2);
      at('frame_tip', AMBER, (sx * FRAME_D) / 2, 1.24, (sz * FRAME_W) / 2);
    }
  for (const sx of [-1, 1]) at('beam_long', LONG, (sx * FRAME_D) / 2, 0.16, 0);
  for (const sz of [-1, 1]) at('beam_short', SHORT, 0, 0.16, (sz * FRAME_W) / 2);
  at('frame_floor', FLOOR, 0, 0.01, 0);
  at('frame_board', CREAM, away * (FRAME_D / 2 + 0.1), 0.15, 0);
  if (stationPict.count < stationPict.instanceMatrix.count) {
    stationM.makeTranslation(away * (FRAME_D / 2 + 0.15), 0.42, 0).premultiply(g.matrix);
    mine.push([stationPict, stationPict.count, stationM.clone()]);
    stationPict.setMatrixAt(stationPict.count++, stationM);
  }
  stationPict.instanceMatrix.needsUpdate = true;
  stationPict.computeBoundingSphere();
  // With mats enabled BED and ROLLER have identical effective steel colour,
  // roughness and metalness. With mats off their authored paints differ.
  at(LOOK.mats ? `feeder_steel:${SPAN}` : `feeder_bed:${SPAN}`, BED, 0, 0, 0, feederAt);
  if (corner) {
    // Rough Station 3 composition: two existing bottom-pivoted timbers lead the eye from receiver to machine.
    // Local only. Inside the unchanged feeder collider: length SPAN, width 0.9, top 0.56. Rollers stay exposed.
    // No new asset, collision, material, delivery timing or saved state (beautiful-corner steps 1–2).
    const runner = new THREE.Matrix4();
    const turn = new THREE.Quaternion().setFromAxisAngle(THREE.Object3D.DEFAULT_UP, Math.PI / 2);
    for (const side of [-1, 1]) {
      runner.compose(new THREE.Vector3(0, 0.16, side * 0.38), turn, new THREE.Vector3(1, 1, SPAN / 2.6));
      put('beam_long', LONG, runner.premultiply(feederAt));
    }
  }
  const rollers = Math.round(SPAN / 0.3);
  if (!LOOK.mats) for (let k = 0; k < rollers; k++) at('roller', ROLLER, (k + 0.5) * 0.3 - SPAN / 2, 0.58, 0, feederAt);
  for (const dx of [-SPAN / 2 + 0.2, SPAN / 2 - 0.2]) at('feeder_leg', DARK, dx, 0, 0, feederAt);
  // A finished frame packs up (src/entities/railway/stations.ts): every piece pressed flat toward the ground by
  // `height` (1 standing, 0 gone). The batches' bounds are left as they were: a superset still culls correctly.
  const ground = g.position.y;
  const press = new THREE.Matrix4();
  return function fold(height: number) {
    press.makeScale(1, height, 1).setPosition(0, ground * (1 - height), 0);
    if (height <= 0) press.makeScale(0, 0, 0);
    for (const [batch, k, m] of mine) {
      batch.setMatrixAt(k, stationM.multiplyMatrices(press, m));
      batch.instanceMatrix.needsUpdate = true;
    }
  };
}
const STATION_PIECES = 64, // the most of a piece, all stations together; only what's placed is drawn
  ROLLERS = 256;
const stationM = new THREE.Matrix4();
function stationPiece(
  name: string,
  p: Paint,
  m: THREE.Matrix4,
  stationBatches: Map<string, THREE.InstancedMesh>,
  owner: OwnedView,
) {
  let b = stationBatches.get(name);
  if (!b) {
    b = kitBatch(name, p, name === 'roller' ? ROLLERS : STATION_PIECES, owner);
    b.count = 0;
    // Settled pieces retain their exact transforms and shader inputs. Cull the
    // existing shared-material batches in both camera and shadow passes.
    b.frustumCulled = true;
    stationBatches.set(name, b);
    owner.add(b);
  }
  if (b.count >= b.instanceMatrix.count) return null;
  const k = b.count++;
  b.setMatrixAt(k, m);
  b.instanceMatrix.needsUpdate = true;
  if (b.frustumCulled) b.computeBoundingSphere();
  return [b, k] as const;
}
// The board's log pictogram.
function createStationView(owner: OwnedView) {
  const stationPictGeo = new THREE.CylinderGeometry(0.11, 0.11, 0.75, 10).rotateX(Math.PI / 2);
  const stationPict = new THREE.InstancedMesh(
    LOOK.contact ? bakeContact(stationPictGeo) : stationPictGeo,
    paint({ color: '#3a2a1a' }),
    16,
  );
  stationPict.count = 0;
  owner.add(stationPict);
  return { batches: new Map<string, THREE.InstancedMesh>(), pict: stationPict };
}
const ownedStations = new WeakMap<OwnedView, ReturnType<typeof createStationView>>();
function stationViews(owner: OwnedView) {
  let view = ownedStations.get(owner);
  if (!view) {
    view = createStationView(owner);
    ownedStations.set(owner, view);
    owner.cleanup(() => ownedStations.delete(owner));
  }
  return view;
}

// ---------------------------------------------------------------- the machine
const RED: Paint = { color: '#e8392a', rough: 0.55 },
  BRASS: Paint = { color: '#d9a23a', rough: 0.5 },
  BLACK: Paint = { color: '#24262c', rough: 0.65 },
  IRON: Paint = { color: '#2c2e34', steel: true, rough: 0.55 },
  DECK: Paint = { color: '#9a7b55', grain: { axis: 'z', honey: honeyOf('#7f5630') } },
  HOPPER: Paint = { color: '#e8d3a2', rough: 0.75 },
  ARM: Paint = { color: '#f0752c', rough: 0.55 };
const SLEEPER_ON_FORK: Paint = { color: '#8a6236', grain: { axis: 'x', honey: honeyOf('#8a6236') } };
export type MachineLook = {
  cars: THREE.Object3D[];
  chimneyTop: THREE.Object3D;
  heldRail: THREE.Object3D;
  /** Rad/s the wheels spin with no ground going by: the wake's slipping start. */
  slip: { rate: number };
  /** The engine's cab doors, hinged on their back posts (+x, then −x), when the loco is the railway's engine. */
  doors?: THREE.Object3D[];
  /** And its cab's walls and roof, which the train view moves out of a rider's view (engine-kit.ts). */
  cab?: ReturnType<EngineKit['engineBodyWithCab']>;
};
/** The railway's engine (./engine-kit.ts), loaded: trainLook draws its loco with it. */
type EngineKit = typeof import('../entities/railway/engine-kit.ts');
/** The track layer's look, the shape of wagonLook's: a red toy loco and a flatbed with its cradle, guard, arm and fork. */
type Wheel = { x: number; y: number; z: number; at: number };
const WHEEL_ZERO = new THREE.Matrix4().makeScale(0, 0, 0),
  WHEEL_AXIS = new THREE.Vector3(1, 0, 0),
  wheelQ = new THREE.Quaternion(),
  wheelP = new THREE.Vector3(),
  wheelS = new THREE.Vector3(),
  wheelM = new THREE.Matrix4();
const wheelSet = (p: Paint, n: number, owner: OwnedView) => {
  let b: THREE.InstancedMesh | null = null;
  return () => {
    if (b) return b;
    // boogle-disable-next-line boogle/input-through-actions -- the wheel batch's name, not the wheel event
    b = kitBatch('wheel', p, n, owner);
    b.castShadow = false;
    b.count = 0;
    owner.add(b);
    return b;
  };
};
// The four trains of a view (v27: three cars each, four wheels each) share one batch of its own.
const trainWheels = new WeakMap<OwnedView, () => THREE.InstancedMesh>();
export const machineLook = (owner: OwnedView): MachineLook => kitCars(1, true, () => false, owner);
/** A train's look: the same loco, the same livery, and plain flatbeds; the railway's trains lead with `engine` (A with
 * its walk-in cab, docs/plans/engine-previz.md) in place of Place's shell. */
export const trainLook = (
  trailers: number,
  boilerShown: () => boolean,
  owner: OwnedView,
  engine?: EngineKit,
): MachineLook => kitCars(trailers, false, boilerShown, owner, engine);
function kitCars(
  trailers: number,
  working: boolean,
  boilerShown: () => boolean,
  owner: OwnedView,
  engine?: EngineKit,
): MachineLook {
  const add = (parent: THREE.Object3D, name: string, p: Paint, x = 0, y = 0, z = 0) => {
    // The timber keeps its grain; only painted and bare metal age with the engine.
    const m = piece(name, { ...p, rust: p.grain ? false : working ? true : 'train' }, owner);
    m.position.set(x, y, z);
    parent.add(m);
    return m;
  };
  // The wheels of all the cars are one batch, posed each frame, and cast no shadow: they're under the deck.
  let shared = trainWheels.get(owner);
  if (!shared) trainWheels.set(owner, (shared = wheelSet({ ...IRON, rust: 'train' }, 48, owner)));
  const wheelBatch = working ? wheelSet({ ...IRON, rust: true }, 8, owner)() : shared();
  const wheels = (hz: number, r: number) => {
    const list: Wheel[] = [];
    for (const sx of [-0.5, 0.5])
      for (const sz of [-1, 1])
        if (wheelBatch.count < wheelBatch.instanceMatrix.count)
          list.push({ x: sx, y: r + 0.15, z: sz * (hz - 0.5), at: wheelBatch.count++ });
    return list;
  };
  const loco = new THREE.Group();
  const boiler = working || engine ? null : makeBoiler();
  let doors: THREE.Object3D[] | undefined;
  let cab: MachineLook['cab'];
  if (engine) {
    // The body, stool and doors; the fitted boiler and its lashing are the train view's (they come with the fit).
    doors = [engine.engineDoor(1), engine.engineDoor(-1)];
    cab = engine.engineBodyWithCab();
    loco.add(cab.body, ...Object.values(cab.faces), cab.shadow, engine.enginePart('engine_stool'), ...doors);
  } else if (working) {
    add(loco, 'loco_body', RED);
    add(loco, 'loco_brass', BRASS);
    add(loco, 'loco_black', BLACK);
  } else {
    // Shared band dimensions author both the boiler and open receiver in the Blender recipe.
    loco.add(makeProp('train_shell'));
    boiler!.position.set(0, 1.2, 0.5);
    boiler!.rotation.y = Math.PI;
    boiler!.visible = boilerShown();
    loco.add(boiler!);
  }
  const locoR = engine ? ENGINE_WHEELS.r : 0.36;
  const locoWheels = engine ? wheels(ENGINE_WHEELS.z + 0.5, locoR) : wheels(LOCO.hz, locoR);
  const chimneyTop = new THREE.Object3D();
  if (engine) chimneyTop.position.set(0, ENGINE_BOILER.chimney.y, ENGINE_BOILER.chimney.z);
  else chimneyTop.position.set(0, working ? 2.5 : 2.07, working ? 1.05 : 0.9);
  loco.add(chimneyTop);
  // The side rods, so the drive reads: they ride the front and back wheels' crank pins. The engine's are one mesh,
  // both sides, drawn at rest round the axles' line.
  const rods = engine
    ? [{ m: loco.add(engine.enginePart('engine_rods')).children.at(-1)!, side: 0 }]
    : [-1, 1].map((side) => {
        const m = add(loco, 'beam_long', ARM, side * 0.62, 0, 0);
        m.scale.set(0.3, 0.2, 0.85);
        return { m, side };
      });

  const beds = Array.from({ length: trailers }, () => {
    const flatbed = new THREE.Group();
    add(flatbed, 'flat_deck', DECK);
    // Named, so the passenger car's body can leave it undrawn (train-view.ts; cars.ts FLAT_RACK).
    add(flatbed, 'flat_black', BLACK).name = FLAT_RACK;
    return { flatbed, wheels: wheels(TRAILER.hz, 0.22) };
  });
  // The machine's flatbed works for a living.
  const bed0 = beds[0]!.flatbed;
  const fork = new THREE.Group();
  let heldRail: THREE.Object3D = fork;
  if (working) {
    add(bed0, 'flat_cream', HOPPER);
    add(bed0, 'flat_guard', RED);
    add(bed0, 'flat_slot', BLACK);
    add(bed0, 'flat_amber', ARM);
    // The rail the gripper holds out over the head.
    heldRail = add(bed0, 'rail', STEEL, 0.5, 0.68, 2.3);
    // The fork, with the next sleeper on it, going down as each one lands.
    add(fork, 'fork', ARM);
    add(fork, 'sleeper', SLEEPER_ON_FORK, 0, 0.05, 0);
    fork.position.z = 2.05;
    bed0.add(fork);
  }

  const cars = [loco, ...beds.map((b) => b.flatbed)].map((inner) => {
    const outer = new THREE.Group();
    outer.add(inner);
    return outer;
  });
  const sets = [{ wheels: locoWheels, r: locoR }, ...beds.map((b) => ({ wheels: b.wheels, r: 0.22 }))];
  const last = cars.map(() => new THREE.Vector3(NaN, 0, 0));
  const angle = cars.map(() => 0);
  let travel = 0;
  const slip = { rate: 0 };
  const animate = ({ dt }: { dt: number }) => {
    if (boiler) boiler.visible = boilerShown();
    cars.forEach((car, n) => {
      const parent = car.parent;
      const { wheels: list, r } = sets[n]!;
      if (!parent?.visible) {
        for (const w of list) wheelBatch.setMatrixAt(w.at, WHEEL_ZERO);
        wheelBatch.instanceMatrix.needsUpdate = true;
        return void last[n]!.set(NaN, 0, 0);
      }
      const at = parent.position,
        yaw = parent.rotation.y;
      const dx = at.x - last[n]!.x,
        dz = at.z - last[n]!.z;
      const ds = Math.abs(dx) + Math.abs(dz) < 2 ? dx * Math.sin(yaw) + dz * Math.cos(yaw) : 0;
      last[n]!.copy(at);
      angle[n]! += ds / r + slip.rate * dt;
      // In the car's own frame, rock and shudder included, as when they were its children.
      const inner = car.children[0]!;
      inner.updateWorldMatrix(true, false);
      wheelQ.setFromAxisAngle(WHEEL_AXIS, angle[n]!);
      wheelS.set(1, r, r);
      for (const w of list) {
        wheelP.set(w.x, w.y, w.z);
        wheelBatch.setMatrixAt(w.at, wheelM.compose(wheelP, wheelQ, wheelS).premultiply(inner.matrixWorld));
      }
      wheelBatch.instanceMatrix.needsUpdate = true;
      if (n === 1) travel += Math.abs(ds);
    });
    const crank = engine ? ENGINE_WHEELS.throw : 0.12;
    for (const { m } of rods) {
      m.position.y = (engine ? 0 : 0.51) + crank * Math.cos(angle[0]!);
      m.position.z = crank * Math.sin(angle[0]!);
    }
    if (working) fork.position.y = 0.2 + 0.3 * Math.abs(Math.cos((travel / 1.2) * Math.PI));
  };
  owner.animate(animate, 8);
  return { cars, chimneyTop, heldRail, slip, ...(doors ? { doors } : {}), ...(cab ? { cab } : {}) };
}

// ---------------------------------------------------------------- what sits on the ground and moves
type Ground = { x: number; y: number; z: number; yaw: number };
/** Ground contact for the machine and trees. The avatar already casts its own articulated shadow. */
export function installContact(cars: Ground[], standing: { x: number; y: number; z: number }[], owner: OwnedView) {
  const under = cars.map(() => addBlob(0, -999, 0, 0.01, 0.01, 0, owner));
  for (const t of standing) addBlob(t.x, t.y, t.z, 1.6, 1.6, 0, owner);
  const update = () => {
    cars.forEach((c, n) => {
      const h = H(c.x, c.z);
      const near = c.y - h < 5;
      setBlob(under[n]!, c.x, near ? h : -999, c.z, 3.1, 4.3, c.yaw, owner);
    });
  };
  owner.animate(update, 9);
}

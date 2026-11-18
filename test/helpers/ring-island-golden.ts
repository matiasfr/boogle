// Ring Island's near view (src/entities/ring-island/view.ts), headless: every merged piece's geometry, full-precision
// world matrix and colour, every other drawn object's world pose and material, every collider's world shape, where the
// mount clearance puts a player standing in each solid, and the leaf, footings, hammer head and thump over a run of
// frames. A box piece is printed as a unit box under its matrix times its size, so a box drawn at its size and one
// scaled from a unit box read the same; full-precision matrices are compared before Float32 vertex quantization.
import fs from 'node:fs';
import * as THREE from 'three/webgpu';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { sourceFunction, sourceModule } from '../../dev/level/source.ts';
import { FAR, ORIGIN } from '../../src/place/layout.ts';
import { RING_CONES } from '../../src/proto/greybox/ring-cones.ts';
import { createIslandGround, LANDING } from '../../src/entities/ring-island/ground.ts';
import * as path from '../../src/entities/ring-island/path.ts';
import * as layout from '../../src/sim/railway-ring-layout.ts';
import * as bracket from '../../src/entities/ring-island/bracket.ts';
import { RING_CROSSING, RING_MAP_TABLE, ringCrossingPlanks } from '../../src/entities/ring-island/state.ts';
import { PLAYER_R } from '../../src/constants.ts';
import { siteExit } from '../../src/place/site-clearance.ts';
import { hearGain } from '../../src/render/hearing.ts';
import { documentStub } from './poi-golden.ts';
const { GROUP } = await import('../../src/physics/physics.ts');

type V3 = { x: number; y: number; z: number };
type Q = { x: number; y: number; z: number; w: number };
type ShapeSpec = Record<string, unknown> & { kind: string; offset?: V3; rotation?: Q };
type BodySpec = { type?: unknown; group?: number; position?: V3; rotation?: Q; shapes: ShapeSpec[] };
type Piece = { geometry: Record<string, unknown>; matrix: number[]; color: string };

const sum = (a: ArrayLike<number>) => [a.length, Array.from(a).reduce((s, n) => s + n, 0)];
const pick = <T extends object>(m: T, keys: (keyof T)[]) => Object.fromEntries(keys.map((k) => [k, m[k]]));
export const ringCentre = { x: FAR.x + ORIGIN.x, z: FAR.z + ORIGIN.z };
const xyz = (v: V3) => [v.x, v.y, v.z];
const canon = (q: Q) => {
  const v = [q.x, q.y, q.z, q.w];
  const lead = [q.w, q.x, q.y, q.z].find((n) => Math.abs(n) > 1e-6) ?? 1;
  return lead < 0 ? v.map((n) => -n) : v;
};

function geometryPrint(g: THREE.BufferGeometry) {
  const params = (g as unknown as { parameters?: Record<string, unknown> }).parameters ?? {};
  const scalars = Object.fromEntries(Object.entries(params).filter(([, v]) => typeof v === 'number'));
  const pos = g.getAttribute('position');
  let x = 0,
    y = 0,
    z = 0;
  for (let i = 0; i < pos.count; i++) {
    x += pos.getX(i);
    y += pos.getY(i);
    z += pos.getZ(i);
  }
  return { type: g.type, ...scalars, count: pos.count, index: g.index?.count ?? 0, sum: [x, y, z] };
}

/** Patch the prototypes while the view builds: each geometry remembers its print before its first transform and the
 * transforms applied to it, through toNonIndexed, so a merge can list its pieces. */
function recordPieces() {
  const proto = THREE.BufferGeometry.prototype;
  const apply = proto.applyMatrix4,
    nonIndexed = proto.toNonIndexed;
  type Mark = { print: ReturnType<typeof geometryPrint>; m: THREE.Matrix4 };
  const marks = new WeakMap<THREE.BufferGeometry, Mark>();
  proto.applyMatrix4 = function (this: THREE.BufferGeometry, m: THREE.Matrix4) {
    let mark = marks.get(this);
    if (!mark) marks.set(this, (mark = { print: geometryPrint(this), m: new THREE.Matrix4() }));
    mark.m.premultiply(m);
    return apply.call(this, m);
  };
  proto.toNonIndexed = function (this: THREE.BufferGeometry) {
    const out = nonIndexed.call(this);
    const mark = marks.get(this);
    if (mark) marks.set(out, { print: mark.print, m: mark.m.clone() });
    return out;
  };
  const merges = new WeakMap<THREE.BufferGeometry, Piece[]>();
  const merge = (list: THREE.BufferGeometry[]) => {
    const pieces = list.map((g): Piece => {
      const mark = marks.get(g) ?? { print: geometryPrint(g), m: new THREE.Matrix4() };
      const colour = g.getAttribute('color');
      const color = colour ? '#' + new THREE.Color(colour.getX(0), colour.getY(0), colour.getZ(0)).getHexString() : '';
      const { print } = mark;
      if (print.type === 'BoxGeometry' && print.widthSegments === 1 && print.heightSegments === 1) {
        const m = mark.m
          .clone()
          .multiply(
            new THREE.Matrix4().makeScale(print.width as number, print.height as number, print.depth as number),
          );
        return { geometry: { type: 'BoxGeometry', unit: true }, matrix: m.toArray(), color };
      }
      return { geometry: print, matrix: mark.m.toArray(), color };
    });
    const out = mergeGeometries(list);
    merges.set(out, pieces);
    return out;
  };
  return {
    merge,
    pieces: (g: THREE.BufferGeometry) => merges.get(g),
    restore() {
      proto.applyMatrix4 = apply;
      proto.toNonIndexed = nonIndexed;
    },
  };
}

function materialPrint(m: THREE.Material) {
  const a = m as THREE.Material & Record<string, unknown>;
  const colour = (c: unknown) => (c instanceof THREE.Color ? '#' + c.getHexString() : undefined);
  const map = a.map as THREE.Texture | null | undefined;
  return {
    type: m.type,
    color: colour(a.color),
    emissive: colour(a.emissive),
    emissiveIntensity: a.emissiveIntensity,
    side: m.side,
    vertexColors: m.vertexColors,
    flatShading: a.flatShading,
    roughness: a.roughness,
    texts: (map?.image as { texts?: string[] } | undefined)?.texts,
  };
}

/** Every collider as its own world shape, in a canonical order (a compound body and one body per shape read alike;
 * where a body is made, at build or at mount, does not reorder it). */
function worldColliders(bodies: BodySpec[]) {
  const out = bodies.flatMap((b) => {
    const at = new THREE.Vector3(b.position?.x ?? 0, b.position?.y ?? 0, b.position?.z ?? 0);
    const q = new THREE.Quaternion(b.rotation?.x ?? 0, b.rotation?.y ?? 0, b.rotation?.z ?? 0, b.rotation?.w ?? 1);
    return b.shapes.map((s) => {
      const { offset, rotation, kind, heights, vertices, indices, ...dims } = s;
      const p = new THREE.Vector3(offset?.x ?? 0, offset?.y ?? 0, offset?.z ?? 0).applyQuaternion(q).add(at);
      const r = q
        .clone()
        .multiply(new THREE.Quaternion(rotation?.x ?? 0, rotation?.y ?? 0, rotation?.z ?? 0, rotation?.w ?? 1));
      const h = heights
        ? Array.from(heights as ArrayLike<ArrayLike<number> | number>).flatMap((r) =>
            typeof r === 'number' ? [r] : Array.from(r),
          )
        : undefined;
      return {
        type: String(b.type ?? 'fixed'),
        group: b.group ?? GROUP.SCENERY,
        kind,
        ...dims,
        ...(h ? { heights: sum(h) } : {}),
        ...(vertices
          ? { vertices: sum(vertices as ArrayLike<number>), indices: sum(indices as ArrayLike<number>) }
          : {}),
        at: xyz(p),
        q: canon(r),
      };
    });
  });
  const key = (c: { at: number[]; kind: string }) =>
    [
      c.kind,
      ...c.at.map((n) =>
        Math.round(n * 1e4)
          .toString()
          .padStart(12, ' '),
      ),
    ].join('|');
  return out.sort((a, b) => (key(a) < key(b) ? -1 : key(a) > key(b) ? 1 : 0));
}

type View = {
  root: THREE.Object3D;
  bodies: readonly unknown[];
  clearPosition(p: V3): V3 | null;
  update(ctx: { elapsed: number }): void;
  inspect(): unknown;
  mount?(): void;
};

/** Bindings the view module reads, its imports stood in by hand. */
export function ringBindings() {
  const bodies: BodySpec[] = [];
  const kinematic: { quaternion: number[] }[] = [];
  const thumps: { at: number; gain: number }[] = [];
  const camera = new THREE.PerspectiveCamera(60);
  let now = 0;
  const audio = {
    ctx: {
      get currentTime() {
        return now;
      },
      createOscillator: () => ({
        frequency: { setValueAtTime() {}, exponentialRampToValueAtTime() {} },
        connect: (n: unknown) => n,
        start(t: number) {
          thumps.push({ at: t, gain: last });
        },
        stop() {},
      }),
      createGain: () => ({
        gain: {
          setValueAtTime() {},
          exponentialRampToValueAtTime(v: number) {
            if (v > 0.0001) last = v;
          },
        },
        connect: (n: unknown) => n,
      }),
    },
    out: {},
  };
  let last = 0;
  const PENNANT_POLE = sourceFunction('src/entities/ring-island-far/view.ts', 'PENNANT_POLE', {});
  const bindings = {
    THREE,
    mergeGeometries,
    BODY: { KINEMATIC: 'kinematic' },
    createBody: (spec: BodySpec) => {
      bodies.push(spec);
      const quaternion: number[] = [];
      if (spec.type) kinematic.push({ quaternion });
      return { ...spec, quaternion: { set: (...q: number[]) => quaternion.splice(0, 4, ...q) } };
    },
    GROUP,
    groundMat: { name: 'ground' },
    getAudio: () => audio,
    hearGain,
    camera,
    freezeInPlace: sourceFunction('src/render/instances.ts', 'freezeInPlace', {}),
    PLAYER_R,
    siteExit,
    outOf: sourceFunction('src/place/sites.ts', 'outOf', {}),
    ...pick(layout, ['RING_BRACE', 'RING_BRACE_PLATFORM', 'RING_END', 'RING_FORMATION', 'RING_GAP', 'RING_HALT']),
    ...pick(layout, ['RING_RAMPS', 'RING_STEPS', 'ringAt', 'ringDeckY']),
    LANDING,
    ...pick(path, ['SUMMIT_BRIDGE', 'summitBridge', 'summitPath', 'summitPathFoot', 'summitRimRockShape']),
    ...pick(path, ['summitRimRocks']),
    RING_CROSSING,
    RING_MAP_TABLE,
    ringCrossingPlanks,
    ringIslandPose: { leaf: 78, bracket: 0, braced: false },
    addFarGround: () => () => {},
    ...pick(bracket, ['BRACKET_Z', 'CRADLE', 'HANGER', 'PLATE_BOTTOM', 'WEIGHT', 'WEIGHT_X']),
    LEAF_ORANGE: sourceFunction('src/entities/ring-island-far/view.ts', 'LEAF_ORANGE', {}),
    PENNANT_CREAM: sourceFunction('src/entities/ring-island-far/view.ts', 'PENNANT_CREAM', {}),
    PENNANT_POLE,
    POLE_PENNANT: sourceFunction('src/entities/ring-island-far/view.ts', 'POLE_PENNANT', {}),
    pennantFooting: sourceFunction('src/entities/ring-island-far/view.ts', 'pennantFooting', { PENNANT_POLE }),
    pennantGeometry: sourceFunction('src/entities/ring-island-far/view.ts', 'pennantGeometry', {
      THREE,
      mergeGeometries,
      PENNANT_POLE,
    }),
    document: documentStub,
  };
  return {
    bodies,
    kinematic,
    thumps,
    camera,
    setNow: (t: number) => (now = t),
    bindings,
  };
}

/** Runs `create` (the view's factory, bound by the caller) and reads back everything it placed. */
export function captureRing(
  c: ReturnType<typeof ringBindings>,
  create: (merge: typeof mergeGeometries, g: ReturnType<typeof createIslandGround>) => View,
) {
  const g = createIslandGround(RING_CONES, ringCentre);
  const recorded = recordPieces();
  try {
    const view = create(recorded.merge as typeof mergeGeometries, g);
    view.mount?.();
    // One frame first: the hammer's head takes its pose in update() (before it, the old head stood at the origin).
    view.update({ elapsed: 0 });
    view.root.updateMatrixWorld(true);
    const meshes: unknown[] = [];
    view.root.traverse((o) => {
      if (!(o instanceof THREE.Mesh)) return;
      const geometry = o.geometry as THREE.BufferGeometry;
      const pieces = recorded.pieces(geometry);
      meshes.push({
        type: o.type,
        name: o.name,
        matrix: o.matrixWorld.toArray(),
        castShadow: o.castShadow,
        receiveShadow: o.receiveShadow,
        material: materialPrint(o.material as THREE.Material),
        ...(o instanceof THREE.InstancedMesh
          ? {
              count: o.count,
              instances: Array.from({ length: 4 }, (_, i) =>
                Array.from(o.instanceMatrix.array.slice(i * 16, i * 16 + 16)),
              ),
            }
          : {}),
        ...(pieces ? { pieces } : { geometry: geometryPrint(geometry) }),
      });
    });
    const colliders = worldColliders(c.bodies);
    // A player standing in each fixed solid (its centre, and half a metre over it), then a few open spots: where the
    // mount clearance puts them, or null where it leaves them be.
    const probes = colliders
      .filter((s) => s.type === 'fixed' && s.kind !== 'heightfield')
      .flatMap((s) => [s.at, [s.at[0]!, s.at[1]! + 0.5, s.at[2]!]]);
    const summit = g.islandH(ringCentre.x, ringCentre.z);
    probes.push([ringCentre.x, summit + 0.75, ringCentre.z], [ringCentre.x + 9, summit, ringCentre.z + 9]);
    const clear = probes.map(([x, y, z]) => {
      const exit = view.clearPosition({ x: x!, y: y!, z: z! });
      return exit ? xyz(exit) : null;
    });
    const inspect = view.inspect();
    // Frames: the hammer's cycle (thumps heard from the camera by the anvil) and the leaf lowered with two footings.
    let headMesh: THREE.Mesh | undefined;
    view.root.traverse((o) => {
      const p = o instanceof THREE.Mesh ? (o.geometry as THREE.BoxGeometry).parameters : undefined;
      if (p?.width === 1.3 && p.height === 1.1) headMesh = o as THREE.Mesh;
    });
    if (!headMesh) throw new Error('ring golden: no hammer head');
    const pose = c.bindings.ringIslandPose;
    const frames: unknown[] = [];
    for (const [k, elapsed] of [0.1, 0.4, 0.7, 0.8, 0.95, 1.05, 1.2, 2.5, 3.3, 4.85].entries()) {
      if (k === 5) {
        pose.leaf = 0;
        pose.bracket = 2;
      }
      c.setNow(elapsed);
      view.update({ elapsed });
      if (k === 0) c.camera.position.set(headMesh.position.x + 20, 10, headMesh.position.z);
      headMesh.updateMatrixWorld(true);
      let leaf: unknown = null;
      view.root.traverse((o) => {
        if (o.name === 'ring-island-leaf') {
          o.updateMatrixWorld(true);
          const footings = o.children.find((x) => x instanceof THREE.InstancedMesh) as THREE.InstancedMesh;
          leaf = { matrix: o.matrixWorld.toArray(), footings: footings.count };
        }
      });
      frames.push({
        elapsed,
        head: headMesh.matrixWorld.toArray(),
        leaf,
        body: c.kinematic.map((b) => [...b.quaternion]),
      });
    }
    return { meshes, colliders, clear, inspect, frames, thumps: c.thumps };
  } finally {
    recorded.restore();
  }
}

/** The pre-record view, run as it was (kept for the record: the fixture's source, at the commit that adds it). */
export function captureRingBefore() {
  const c = ringBindings();
  return captureRing(c, (merge, g) => {
    const { createRingIslandView } = sourceModule<{
      createRingIslandView(g: unknown, cones: unknown, centre: V3 | { x: number; z: number }): View;
    }>(fs.readFileSync('src/entities/ring-island/view.ts', 'utf8'), { ...c.bindings, mergeGeometries: merge });
    return createRingIslandView(g, RING_CONES, ringCentre);
  });
}

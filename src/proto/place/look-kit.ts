// The look's kit, from assets/src/place-kit.py (Blender, through `npm run assets`): real pieces in place of the greybox's
// boxes, batched by part and material the way the board asks. The track keeps its run, timing and colliders: `lookTrack`
// only reroutes where its matrices land. The file loads after the first frame, so each mesh starts on a speck of geometry
// and takes its piece when the kit arrives. With `mats` or `contact` and no kit, the same routing draws today's unit boxes
// with those looks. The machine keeps its cars' sizes, so its colliders still fit. Local and cosmetic.
import * as THREE from 'three/webgpu';
import kitUrl from '../../../assets/built/place-kit.glb?url';
import { onFrame } from '../../loop.ts';
import { scene } from '../../render/scene.ts';
import { LOCO, TRAILER } from '../wagon/look.ts';
import { H } from './land.ts';
import { LOOK, STEEL, addBlob, bakeContact, honeyOf, paint, setBlob, type Paint } from './look.ts';
import type { DropSet } from './pieces.ts';

// ---------------------------------------------------------------- the file
const SPECK = new THREE.BufferGeometry();
SPECK.setAttribute('position', new THREE.BufferAttribute(new Float32Array(9), 3));
SPECK.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(9), 3));
if (LOOK.contact) SPECK.setAttribute('color', new THREE.BufferAttribute(new Float32Array(9), 3));
const waiting = new Map<string, THREE.Mesh[]>();
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
if (LOOK.kit)
  void import('../../render/assets.ts')
    .then((a) => a.loadAsset(kitUrl))
    .then((asset) => {
      asset.gltf.scene.updateMatrixWorld(true);
      for (const [name, meshes] of waiting) {
        const src = asset.gltf.scene.getObjectByName(name) as THREE.Mesh | undefined;
        let found: THREE.Mesh | undefined;
        src?.traverse((o) => {
          if ((o as THREE.Mesh).isMesh) found = o as THREE.Mesh;
        });
        if (!found) throw new Error(`place-kit has no ${name}`);
        const g = bake(found, name);
        for (const m of meshes) m.geometry = g;
      }
    });
function want<M extends THREE.Mesh>(name: string, mesh: M) {
  let list = waiting.get(name);
  if (!list) waiting.set(name, (list = []));
  list.push(mesh);
  mesh.castShadow = mesh.receiveShadow = true;
  return mesh;
}
/** One kit piece, drawn once. */
const piece = (name: string, p: Paint) => want(name, new THREE.Mesh(SPECK, paint(p)));
/** A batch of a kit piece. */
export function kitBatch(name: string, p: Paint, n: number) {
  const m = want(name, new THREE.InstancedMesh(SPECK, paint(p), Math.max(1, n)));
  m.frustumCulled = false;
  return m;
}
/** The same contract as pieceMesh: a log batch, hidden until committed. Its colours are its own, so its tint is white. */
export function kitLogs(max: number) {
  const m = kitBatch('log', { color: '#ffffff', own: true, rough: 0.9, grain: { axis: 'x', honey: '#ffffff' } }, max);
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

/** Draws a track's pieces by kind, in the looks that are on. The set keeps its timing: only its matrices are redirected. */
export function lookTrack(set: DropSet, kinds: string[]): DropSet {
  if (!LOOK.kit && !LOOK.mats && !LOOK.contact) return set;
  scene.remove(set.mesh);
  const counts = new Map<string, number>();
  kinds.forEach((k) => counts.set(k, (counts.get(k) ?? 0) + 1));
  const parts = new Map<string, Part[]>();
  for (const [kind, n] of counts) {
    const size = LOOK.kit ? KIT_SIZE[kind]! : ([1, 1, 1] as const);
    const inv = new THREE.Vector3(1 / size[0], 1 / size[1], 1 / size[2]);
    const wood = WOOD_KINDS[kind];
    const base = set.boxes[kinds.indexOf(kind)]!.color;
    const hex = `#${base.getHexString(THREE.SRGBColorSpace)}`;
    const p: Paint = wood
      ? {
          color: hex,
          grain: { axis: wood.axis, honey: honeyOf(hex), ...(LOOK.kit ? {} : { scale: wood.unit }) },
        }
      : STEEL;
    const list: Part[] = [];
    if (LOOK.kit) list.push({ mesh: kitBatch(KIT_NAME[kind] ?? kind, p, n), inv });
    else {
      const mesh = new THREE.InstancedMesh(unitBox, paint(p), n);
      mesh.frustumCulled = false;
      mesh.castShadow = mesh.receiveShadow = true;
      list.push({ mesh, inv });
    }
    if (LOOK.kit && kind === 'sleeper') {
      const plates = kitBatch('sleeper_steel', STEEL, n);
      plates.castShadow = false;
      list.push({ mesh: plates, inv });
    }
    // What lies flat on its bed has no shadow worth a second draw: the bed's contact blobs already ground it.
    if (kind === 'sleeper' || kind === 'rail') for (const q of list) q.mesh.castShadow = false;
    for (const q of list) scene.add(q.mesh);
    parts.set(kind, list);
  }
  const next = new Map<string, number>();
  const route = kinds.map((k) => {
    const n = next.get(k) ?? 0;
    next.set(k, n + 1);
    return { list: parts.get(k)!, at: n };
  });
  const blobs = new Map<number, number>();
  set.mesh.setMatrixAt = (k: number, m: THREE.Matrix4) => {
    const r = route[k]!;
    for (const q of r.list) {
      q.mesh.setMatrixAt(r.at, tm.copy(m).scale(q.inv));
      q.mesh.instanceMatrix.needsUpdate = true;
    }
    if (LOOK.contact && kinds[k] === 'sleeper') sleeperBlob(set, k, m, blobs);
    return set.mesh;
  };
  return set;
}
function sleeperBlob(set: DropSet, k: number, m: THREE.Matrix4, blobs: Map<number, number>) {
  const b = set.boxes[k]!;
  const down = m.elements[0] !== 0 && Math.abs(m.elements[13]! - b.y) < 0.2;
  const yaw = Math.atan2(b.local.elements[8]!, b.local.elements[10]!);
  const h = blobs.get(k);
  if (!down) {
    if (h !== undefined) setBlob(h, 0, -999, 0, 0.01, 0.01);
    return;
  }
  const y = H(b.x, b.z);
  if (h === undefined) blobs.set(k, addBlob(b.x, y, b.z, 2.75, 0.8, yaw));
  else setBlob(h, b.x, y, b.z, 2.75, 0.8, yaw);
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
) {
  // Every station's pieces go in one batch per piece: nothing here moves, and six stations are no more draws than one.
  g.updateMatrix();
  const feederAt = new THREE.Matrix4().makeTranslation(-away * (FRAME_D / 2 + SPAN / 2), 0, 0).premultiply(g.matrix);
  const at = (name: string, p: Paint, x: number, y: number, z: number, frame = g.matrix) =>
    stationPiece(name, p, stationM.makeTranslation(x, y, z).premultiply(frame));
  for (const sx of [-1, 1])
    for (const sz of [-1, 1]) {
      at('frame_post', POST, (sx * FRAME_D) / 2, 0, (sz * FRAME_W) / 2);
      at('frame_tip', AMBER, (sx * FRAME_D) / 2, 1.24, (sz * FRAME_W) / 2);
    }
  for (const sx of [-1, 1]) at('beam_long', LONG, (sx * FRAME_D) / 2, 0.16, 0);
  for (const sz of [-1, 1]) at('beam_short', SHORT, 0, 0.16, (sz * FRAME_W) / 2);
  at('frame_floor', FLOOR, 0, 0.01, 0);
  at('frame_board', CREAM, away * (FRAME_D / 2 + 0.1), 0.15, 0);
  if (stationPict.count < stationPict.instanceMatrix.count)
    stationPict.setMatrixAt(
      stationPict.count++,
      stationM.makeTranslation(away * (FRAME_D / 2 + 0.15), 0.42, 0).premultiply(g.matrix),
    );
  stationPict.instanceMatrix.needsUpdate = true;
  at('feeder_bed', BED, 0, 0, 0, feederAt);
  if (corner) {
    // Rough Station 3 composition: two existing bottom-pivoted timbers lead the eye from receiver to machine.
    // Local only. Inside the unchanged feeder collider: length SPAN, width 0.9, top 0.56. Rollers stay exposed.
    // No new asset, collision, material, delivery timing or saved state (beautiful-corner steps 1–2).
    const runner = new THREE.Matrix4();
    const turn = new THREE.Quaternion().setFromAxisAngle(THREE.Object3D.DEFAULT_UP, Math.PI / 2);
    for (const side of [-1, 1]) {
      runner.compose(new THREE.Vector3(0, 0.16, side * 0.38), turn, new THREE.Vector3(1, 1, SPAN / 2.6));
      stationPiece('beam_long', LONG, runner.premultiply(feederAt));
    }
  }
  const rollers = Math.round(SPAN / 0.3);
  for (let k = 0; k < rollers; k++) at('roller', ROLLER, (k + 0.5) * 0.3 - SPAN / 2, 0.58, 0, feederAt);
  for (const dx of [-SPAN / 2 + 0.2, SPAN / 2 - 0.2]) at('feeder_leg', DARK, dx, 0, 0, feederAt);
}
const STATION_PIECES = 64, // the most of a piece, all stations together; only what's placed is drawn
  ROLLERS = 256;
const stationM = new THREE.Matrix4();
const stationBatches = new Map<string, THREE.InstancedMesh>();
function stationPiece(name: string, p: Paint, m: THREE.Matrix4) {
  let b = stationBatches.get(name);
  if (!b) {
    b = kitBatch(name, p, name === 'roller' ? ROLLERS : STATION_PIECES);
    b.count = 0;
    stationBatches.set(name, b);
    scene.add(b);
  }
  if (b.count >= b.instanceMatrix.count) return;
  b.setMatrixAt(b.count++, m);
  b.instanceMatrix.needsUpdate = true;
}
// The board's log pictogram.
const stationPictGeo = new THREE.CylinderGeometry(0.11, 0.11, 0.75, 10).rotateX(Math.PI / 2);
const stationPict = new THREE.InstancedMesh(
  LOOK.contact ? bakeContact(stationPictGeo) : stationPictGeo,
  paint({ color: '#3a2a1a' }),
  16,
);
stationPict.count = 0;
stationPict.frustumCulled = false;
scene.add(stationPict);

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
};
/** The track layer's look, the shape of wagonLook's: a red toy loco and a flatbed with its cradle, guard, arm and fork. */
type Wheel = { x: number; y: number; z: number; at: number };
const WHEEL_ZERO = new THREE.Matrix4().makeScale(0, 0, 0),
  WHEEL_AXIS = new THREE.Vector3(1, 0, 0),
  wheelQ = new THREE.Quaternion(),
  wheelP = new THREE.Vector3(),
  wheelS = new THREE.Vector3(),
  wheelM = new THREE.Matrix4();
const wheelSet = (p: Paint, n: number) => {
  let b: THREE.InstancedMesh | null = null;
  return () => {
    if (b) return b;
    b = kitBatch('wheel', p, n);
    b.castShadow = false;
    b.count = 0;
    scene.add(b);
    return b;
  };
};
const machineWheels = wheelSet({ ...IRON, rust: true }, 8),
  trainWheels = wheelSet({ ...IRON, rust: 'train' }, 24); // two lines: three cars each, four wheels each
export const machineLook = (): MachineLook => kitCars(1, true);
/** A train's look: the same loco, the same livery, and plain flatbeds. */
export const trainLook = (trailers: number): MachineLook => kitCars(trailers, false);
function kitCars(trailers: number, working: boolean): MachineLook {
  const add = (parent: THREE.Object3D, name: string, p: Paint, x = 0, y = 0, z = 0) => {
    // The timber keeps its grain; only painted and bare metal age with the engine.
    const m = piece(name, { ...p, rust: p.grain ? false : working ? true : 'train' });
    m.position.set(x, y, z);
    parent.add(m);
    return m;
  };
  // The wheels of all the cars are one batch, posed each frame, and cast no shadow: they're under the deck.
  const wheelBatch = working ? machineWheels() : trainWheels();
  const wheels = (hz: number, r: number) => {
    const list: Wheel[] = [];
    for (const sx of [-0.5, 0.5])
      for (const sz of [-1, 1])
        if (wheelBatch.count < wheelBatch.instanceMatrix.count)
          list.push({ x: sx, y: r + 0.15, z: sz * (hz - 0.5), at: wheelBatch.count++ });
    return list;
  };
  const loco = new THREE.Group();
  add(loco, 'loco_body', RED);
  add(loco, 'loco_brass', BRASS);
  add(loco, 'loco_black', BLACK);
  const locoWheels = wheels(LOCO.hz, 0.36);
  const chimneyTop = new THREE.Object3D();
  chimneyTop.position.set(0, 2.5, 1.05);
  loco.add(chimneyTop);
  // The side rods, so the drive reads: they ride the front and back wheels' crank pins.
  const rods = [-1, 1].map((side) => {
    const m = add(loco, 'beam_long', ARM, side * 0.62, 0, 0);
    m.scale.set(0.3, 0.2, 0.85);
    return { m, side };
  });

  const beds = Array.from({ length: trailers }, () => {
    const flatbed = new THREE.Group();
    add(flatbed, 'flat_deck', DECK);
    add(flatbed, 'flat_black', BLACK);
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
  const sets = [{ wheels: locoWheels, r: 0.36 }, ...beds.map((b) => ({ wheels: b.wheels, r: 0.22 }))];
  const last = cars.map(() => new THREE.Vector3(NaN, 0, 0));
  const angle = cars.map(() => 0);
  let travel = 0;
  const slip = { rate: 0 };
  onFrame(
    ({ dt }) => {
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
      for (const { m } of rods) {
        m.position.y = 0.51 + 0.12 * Math.cos(angle[0]!);
        m.position.z = 0.12 * Math.sin(angle[0]!);
      }
      if (working) fork.position.y = 0.2 + 0.3 * Math.abs(Math.cos((travel / 1.2) * Math.PI));
    },
    { phase: 'update', order: 8 },
  );
  return { cars, chimneyTop, heldRail, slip };
}

// ---------------------------------------------------------------- what sits on the ground and moves
type Ground = { x: number; y: number; z: number; yaw: number };
/** Ground contact for the machine and trees. The avatar already casts its own articulated shadow. */
export function installContact(cars: Ground[], standing: { x: number; y: number; z: number }[]) {
  const under = cars.map(() => addBlob(0, -999, 0, 0.01, 0.01));
  for (const t of standing) addBlob(t.x, t.y, t.z, 1.6, 1.6);
  onFrame(
    () => {
      cars.forEach((c, n) => {
        const h = H(c.x, c.z);
        const near = c.y - h < 5;
        setBlob(under[n]!, c.x, near ? h : -999, c.z, 3.1, 4.3, c.yaw);
      });
    },
    { phase: 'update', order: 9 },
  );
}

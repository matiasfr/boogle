// Train engine previz scenes for the asset stage (docs/plans/engine-previz.md). Inspection only: the game never
// imports this. Each candidate is drawn from character/engine-previz-parts.ts beside the real flatbed and wheel from
// the built kit, on track at the real gauge (rails at ±0.5 m) by a halt deck at the real height (0.72 m over the rail
// line, its near edge 1.65 m from the track's centre: halts-view.ts with lat 2.9, hw 1.25).
import * as THREE from 'three/webgpu';
import { addPart, mergeParts } from '../src/render/geometry-parts.ts';
import {
  A_LONG,
  CANDIDATES,
  DRIVER,
  STATES,
  RED,
  RUST,
  BRASS,
  DULL_BRASS,
  TORUS_RADIAL,
  type EngineId,
  type Module,
  type Part,
  type StateId,
} from './engine-previz-parts.ts';

export type KitPart = (asset: string, node: string) => Promise<THREE.Object3D>;
export type PrevizView = 'turn' | 'long' | 'cab' | 'halt' | 'states';
type Placement = { x: number; y: number; z: number; yaw: number };

const DECK = '#9a7b55',
  BLACK = '#24262c',
  IRON = '#2c2e34',
  STONE = '#bdb8ac',
  UNDER = '#9a9184',
  EDGE = '#f2d36a',
  STEEL = '#4c5058',
  SLEEPER = '#8a6236';
const FLAT_HZ = 1.6,
  GAP = 0.6; // today's gap from the flatbed's deck to the engine's frame (cars.ts TRAIN_OFFSETS)

/** `?engineView=turn|long|cab|halt|states`, or `window.enginePrevizView` set before a stage `select` (one page, many views). */
export function previzView(): PrevizView {
  const v =
    (window as { enginePrevizView?: string }).enginePrevizView ??
    new URLSearchParams(location.search).get('engineView');
  return v === 'long' || v === 'cab' || v === 'halt' || v === 'states' ? v : 'turn';
}

function partGeometry(p: Exclude<Part, { kind: 'wheel' }>) {
  const m = new THREE.Matrix4();
  let g: THREE.BufferGeometry;
  if (p.kind === 'box') {
    const size = p.max.map((v, k) => v - p.min[k]!) as [number, number, number];
    g = new THREE.BoxGeometry(...size);
    if (p.tilt) g.rotateX(p.tilt);
    m.makeTranslation(...(p.max.map((v, k) => (v + p.min[k]!) / 2) as [number, number, number]));
  } else if (p.kind === 'cyl') {
    g = new THREE.CylinderGeometry(p.r1, p.r0, p.len, p.seg);
    if (p.axis === 'z') g.rotateX(Math.PI / 2);
    if (p.axis === 'x') g.rotateZ(-Math.PI / 2);
    m.makeTranslation(...p.at);
  } else if (p.kind === 'sphere') {
    g = new THREE.SphereGeometry(p.r, p.seg, p.seg / 2).scale(1, p.sy, 1);
    m.makeTranslation(...p.at);
  } else {
    g = new THREE.TorusGeometry(p.r, p.tube, TORUS_RADIAL, p.seg);
    if (p.axis === 'y') g.rotateX(Math.PI / 2);
    m.makeTranslation(...p.at);
  }
  return { g, m };
}

/** One merged, vertex-coloured mesh per module: the draw calls a built engine would have, wheels apart. */
function moduleMesh(parts: readonly Part[], module: Module, material: THREE.Material, rusty: boolean) {
  const list: THREE.BufferGeometry[] = [];
  for (const p of parts) {
    if (p.m !== module || p.kind === 'wheel') continue;
    const { g, m } = partGeometry(p);
    const c = rusty && p.c === RED ? RUST : rusty && p.c === BRASS ? DULL_BRASS : p.c;
    addPart(list, g, m, c);
    g.dispose();
  }
  if (!list.length) return null;
  const mesh = new THREE.Mesh(mergeParts(list), material);
  list.forEach((g) => g.dispose());
  mesh.name = `engine_${module}`;
  return mesh;
}

type Owned = { geometries: Set<THREE.BufferGeometry>; materials: Set<THREE.Material> };

export async function enginePreviz(id: EngineId | 'today', kit?: KitPart) {
  const group = new THREE.Group();
  const owned: Owned = { geometries: new Set(), materials: new Set() };
  const flat = (color: string) => {
    const m = new THREE.MeshStandardNodeMaterial({ color, roughness: 0.75 });
    owned.materials.add(m);
    return m;
  };
  const painted = new THREE.MeshStandardNodeMaterial({ vertexColors: true, roughness: 0.7 });
  owned.materials.add(painted);
  const own = (mesh: THREE.Mesh) => {
    owned.geometries.add(mesh.geometry);
    return mesh;
  };
  const boxAt = (color: string, x: [number, number], y: [number, number], z: [number, number]) => {
    const mesh = own(new THREE.Mesh(new THREE.BoxGeometry(x[1] - x[0], y[1] - y[0], z[1] - z[0]), flat(color)));
    mesh.position.set((x[0] + x[1]) / 2, (y[0] + y[1]) / 2, (z[0] + z[1]) / 2);
    group.add(mesh);
    return mesh;
  };
  /** A stand-in little guy at the controls, at the size docs/plans/home-station.md measured from folk.ts: 0.99 m
   * standing, body 0.46 m wide, hat 0.58 m. Not folk.ts's model, which needs the world to build. */
  /** Seated (the driver, owner 10 November): on a tall stool, DRIVER.stool high, squashed to his seated 0.9 m. */
  const littleGuy = (x: number, y: number, z: number, yaw: number, seated = true) => {
    const guy = new THREE.Group();
    const part = (geo: THREE.BufferGeometry, color: string, py: number, pz = 0) => {
      const mesh = own(new THREE.Mesh(geo, flat(color)));
      mesh.position.set(0, py, pz);
      guy.add(mesh);
    };
    const seat = seated ? DRIVER.stool : 0;
    if (seated) {
      part(new THREE.CylinderGeometry(0.2, 0.2, 0.05, 16), '#7f5630', seat - 0.025); // the stool's seat
      part(new THREE.CylinderGeometry(0.04, 0.05, seat - 0.05, 8), '#2c2e34', (seat - 0.05) / 2); // its post
      part(new THREE.CylinderGeometry(0.17, 0.17, 0.03, 12), '#2c2e34', 0.015); // its foot
      part(new THREE.BoxGeometry(0.34, 0.12, 0.3), '#4f6f8f', seat + 0.06, 0.12); // thighs, forward
      part(new THREE.BoxGeometry(0.3, 0.35, 0.1), '#4f6f8f', seat - 0.17, 0.25); // shins, hanging
    }
    // Standing: body 0.3 m up, head 0.73, hat top 0.99. Seated he squashes to 0.9 over the seat (head 0.39–0.84).
    const k = seated ? 0.9 / 0.99 : 1;
    part(new THREE.CylinderGeometry(0.2, 0.23, 0.55 * k, 14), '#4f6f8f', seat + (seated ? 0.28 : 0.3)); // body
    part(new THREE.SphereGeometry(0.19, 14, 8), '#e9c39b', seat + 0.73 * k); // head
    part(new THREE.CylinderGeometry(0.29, 0.29, 0.05, 16), '#5a3b26', seat + 0.86 * k); // hat brim
    part(new THREE.CylinderGeometry(0.17, 0.19, 0.12, 14), '#5a3b26', seat + 0.93 * k); // crown, top at 0.99 m
    guy.position.set(x, y, z);
    guy.rotation.y = yaw;
    group.add(guy);
  };
  // The kit's wheel (r 1 × 0.12 m, scaled by radius as look-kit.ts does), one instanced batch for the whole scene.
  const wheelAt: { x: number; y: number; z: number; r: number }[] = [];
  const kitMesh = async (asset: string, node: string, color?: string) => {
    if (!kit) return null;
    const object = await kit(asset, node);
    object.traverse((o) => {
      if (o instanceof THREE.Mesh) {
        o.userData.shared = true; // the loader's cache owns this geometry
        if (color) o.material = flat(color);
      }
    });
    return object;
  };

  function track(x: number, z: [number, number]) {
    for (const s of [-1, 1]) boxAt(STEEL, [x + s * 0.5 - 0.05, x + s * 0.5 + 0.05], [0.04, 0.16], z);
    const n = Math.floor((z[1] - z[0]) / 0.75);
    const sleeper = new THREE.BoxGeometry(2.3, 0.12, 0.42);
    owned.geometries.add(sleeper);
    const sleepers = new THREE.InstancedMesh(sleeper, flat(SLEEPER), n);
    for (let k = 0; k < n; k++)
      sleepers.setMatrixAt(k, new THREE.Matrix4().makeTranslation(x, -0.02, z[0] + 0.375 + k * 0.75));
    group.add(sleepers);
  }
  function platform(z: [number, number]) {
    boxAt(STONE, [1.65, 4.15], [0.22, 0.72], z);
    boxAt(UNDER, [1.67, 4.13], [-0.03, 0.24], [z[0] + 0.02, z[1] - 0.02]);
    for (const x of [
      [1.67, 1.95],
      [3.85, 4.13],
    ] as [number, number][])
      boxAt(EDGE, x, [0.68, 0.73], [z[0] + 0.02, z[1] - 0.02]);
  }
  /** The real flatbed: the kit's deck and frame, its wheels at look-kit's places, centred at z. */
  async function flatbed(z: number) {
    for (const [node, color] of [
      ['flat_deck', DECK],
      ['flat_black', BLACK],
    ] as const) {
      const o = await kitMesh('place-kit', node, color);
      if (!o) continue;
      o.position.z = z;
      group.add(o);
    }
    for (const sx of [-0.5, 0.5]) for (const sz of [-1, 1]) wheelAt.push({ x: sx, y: 0.37, z: z + sz * 1.1, r: 0.22 });
  }
  /** One engine in a state, its frame's back end at `back` (+z forward) on the track at x. Returns its front. */
  async function engine(state: StateId, x: number, back: number, open = false, driver = false) {
    const holder = new THREE.Group();
    group.add(holder);
    if (id === 'today') {
      // Today's shell and boiler, as train-view.ts fits them; the kit wheels at look-kit's places.
      const shell = await kitMesh('boiler-cart', 'train_shell');
      if (shell) holder.add(shell);
      if (state !== 'base') {
        const boiler = await kitMesh('boiler-cart', 'boiler');
        if (boiler) {
          boiler.position.set(0, 1.2, 0.5);
          boiler.rotation.y = Math.PI;
          holder.add(boiler);
        }
      }
      for (const sx of [-0.5, 0.5])
        for (const sz of [-1, 1]) wheelAt.push({ x: x + sx, y: 0.51, z: back + 1.5 + sz, r: 0.36 });
      holder.position.set(x, 0, back + 1.5);
      return back + 3.16;
    }
    const c = state === 'long' && id === 'a' ? A_LONG : CANDIDATES[id];
    const modules = STATES.find((s) => s.id === state)!.modules as readonly Module[];
    for (const module of [...modules, ...(open ? [] : (['cabNear'] as const))]) {
      if (module === 'wheels') continue;
      const mesh = moduleMesh(c.parts, module, painted, state === 'base');
      if (mesh) holder.add(own(mesh));
    }
    const rods = moduleMesh(c.parts, 'wheels', painted, state === 'base');
    if (rods) holder.add(own(rods));
    const at = back - c.rear;
    for (const p of c.parts)
      if (p.kind === 'wheel') wheelAt.push({ x: x + p.at[0], y: p.at[1], z: at + p.at[2], r: p.r });
    holder.position.set(x, 0, at);
    if (driver) {
      const d = c.cab.driver;
      littleGuy(x + d[0], d[1], at + d[2], 0);
    }
    return back + c.front - c.rear;
  }
  /** Where Buddy stands in a candidate's cab, its frame's back end at `back`, facing `yaw`. */
  const inCab = (back: number, yaw: number): Placement => {
    const c = CANDIDATES[id as EngineId],
      b = c.cab.buddy;
    return { x: b[0], y: b[1], z: back - c.rear + b[2], yaw };
  };
  /** Where Buddy stands on the halt deck beside a candidate's cab door, its frame's back end at `back`. */
  const atDoor = (back: number, yaw: number): Placement => {
    const c = CANDIDATES[id as EngineId];
    return { x: 2.2, y: 0.72, z: back - c.rear + (c.cab.door.z[0] + c.cab.door.z[1]) / 2 - 0.9, yaw };
  };
  const coupler = (x: number, z0: number, z1: number) => boxAt(BLACK, [x - 0.06, x + 0.06], [0.55, 0.66], [z0, z1]);
  const length = id === 'today' ? 3 : CANDIDATES[id].front - CANDIDATES[id].rear;

  const view = previzView();
  let buddy: Placement;
  if (view === 'turn' || view === 'long') {
    // `long`: A with the longer boiler (the frame 0.5 m longer ahead, so the same back end).
    track(0, [-length / 2 - 2.5, length / 2 + 3]);
    platform([-length / 2 - 1.5, length / 2 + 2]);
    await engine(view === 'long' && id === 'a' ? 'long' : 'boiler', 0, -length / 2);
    buddy = { x: 2.35, y: 0.72, z: -length / 2 + 0.6, yaw: -0.5 };
  } else if (view === 'cab') {
    // The platform side's cab wall left out: Buddy standing in the cab, the driver at the controls beside him.
    track(0, [-length / 2 - 2.5, length / 2 + 2.5]);
    platform([-length / 2 - 1.5, length / 2 + 1.5]);
    await engine('boiler', 0, -length / 2, true, true);
    buddy = id === 'today' ? { x: 2.35, y: 0.72, z: -0.9, yaw: 1.2 } : inCab(-length / 2, 1.2);
  } else if (view === 'halt') {
    // A real flatbed at z 0, the engine coupled ahead of it with today's gap; Buddy on the deck by the closed cab door (today: by the cab).
    track(0, [-6, 2 * length + 6]);
    platform([-5, 2 * length + 4]);
    await flatbed(0);
    const back = FLAT_HZ + GAP;
    coupler(0, FLAT_HZ - 0.1, back + 0.15);
    await engine('boiler', 0, back, false, true);
    buddy = id === 'today' ? { x: 2.35, y: 0.72, z: back + 0.5, yaw: Math.PI - 0.7 } : atDoor(back, Math.PI + 0.8);
  } else {
    // The upgrade states side by side, 5 m apart, all facing +z; the second engine leads the first.
    const states: StateId[] =
      id === 'today'
        ? ['base', 'boiler']
        : id === 'a'
          ? ['base', 'boiler', 'long', 'twin']
          : ['base', 'boiler', 'speed', 'twin'];
    for (const [k, state] of states.entries()) {
      const x = k * 5;
      const extra = state === 'twin' ? length + GAP : 0;
      track(x, [-length / 2 - 1.5, length / 2 + extra + 1.5]);
      const front = await engine(state, x, -length / 2);
      if (state === 'twin') {
        coupler(x, front - 0.2, front + GAP + 0.2);
        await engine(state, x, front + GAP);
      }
    }
    buddy = { x: -1.8, y: 0, z: length / 2 + 0.4, yaw: 0.4 };
  }

  if (wheelAt.length) {
    const kitWheel = await kitMesh('place-kit', 'wheel');
    let geometry: THREE.BufferGeometry | undefined;
    kitWheel?.traverse((o) => {
      if (o instanceof THREE.Mesh && !geometry) geometry = o.geometry;
    });
    if (!geometry) owned.geometries.add((geometry = new THREE.CylinderGeometry(1, 1, 0.12, 20).rotateZ(-Math.PI / 2)));
    const batch = new THREE.InstancedMesh(geometry, flat(IRON), wheelAt.length);
    batch.userData.shared = !!kitWheel;
    const q = new THREE.Quaternion(),
      s = new THREE.Vector3(),
      at = new THREE.Vector3();
    wheelAt.forEach((w, k) =>
      batch.setMatrixAt(k, new THREE.Matrix4().compose(at.set(w.x, w.y, w.z), q, s.set(1, w.r, w.r))),
    );
    batch.name = 'engine_wheels';
    group.add(batch);
  }
  group.traverse((o) => {
    if (o instanceof THREE.Mesh) o.castShadow = o.receiveShadow = true;
  });
  return {
    group,
    buddy,
    seek() {
      group.updateMatrixWorld(true);
    },
    advance() {},
    dispose() {
      owned.geometries.forEach((g) => g.dispose());
      owned.materials.forEach((m) => m.dispose());
    },
  };
}

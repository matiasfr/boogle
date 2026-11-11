// Passenger car previz scenes for the asset stage (docs/plans/passenger-car-previz.md). Inspection only: the game
// never imports this. Each candidate is today's flatbed (the built kit's deck and frame) with its fittings from
// character/car-previz-parts.ts, coupled 0.6 m behind the built engine A (the engine GLB's nodes, as the game draws
// them) on track at the real gauge, by a halt deck at the real height (0.72 m, its edge 1.65 m from the track).
// The riders are the stage's real Buddy: seated in the game's seated pose (Driving_Loop, played) or standing.
import * as THREE from 'three/webgpu';
import { addPart, mergeParts } from '../src/render/geometry-parts.ts';
import { merged } from '../src/render/part-geometry.ts';
import { GIFTS } from '../src/render/cosmetic-parts.ts';
import { ENGINE, ENGINE_WHEELS } from '../src/entities/railway/engine.ts';
import { partGeometry, type KitPart } from './engine-previz.ts';
import {
  CARS,
  DECK,
  PAINT,
  PLAYER_R,
  type CarId,
  type CarModule,
  type CarPart,
  type Seat,
} from './car-previz-parts.ts';

/** A stage Buddy for the scene: seated (the game's seated pose) or standing, in a body colour. */
export type Figure = (seated: boolean, color: string) => { group: THREE.Group; dispose(): void };
export type CarView = 'halt' | 'upgraded' | 'plan' | 'plan-upgraded';
const VIEWS: readonly CarView[] = ['halt', 'upgraded', 'plan', 'plan-upgraded'];

const DECK_WOOD = '#9a7b55',
  BLACK = '#24262c',
  IRON = '#2c2e34',
  STONE = '#bdb8ac',
  UNDER = '#9a9184',
  EDGE = '#f2d36a',
  STEEL = '#4c5058',
  SLEEPER = '#8a6236';
const GAP = 0.6; // from the car's deck end to the engine's frame (cars.ts TRAIN_OFFSETS)
/** Body colours for the riders (src/constants.ts COLORS), so each reads apart. */
const RIDER_COLORS = ['#ff6b5a', '#3d9bff', '#7fd14a', '#ffc23d', '#9b6bff', '#ff6fb5'];
/** How far a seated Buddy's drawn body comes down from his capsule (src/entities/railway/seat.ts SEATED_DROP). */
const SEATED_DROP = 0.55;

/** `?carView=halt|upgraded|plan|plan-upgraded`. */
export function carView(): CarView {
  const v = new URLSearchParams(location.search).get('carView') as CarView | null;
  return v && VIEWS.includes(v) ? v : 'halt';
}

/** One merged, vertex-coloured mesh for a module: the one draw a built car would add for it. */
function moduleMesh(parts: readonly CarPart[], module: CarModule, material: THREE.Material, painted: boolean) {
  const list: THREE.BufferGeometry[] = [];
  for (const p of parts) {
    if (p.kind === 'wheel' || p.m !== module) continue;
    const { g, m } = partGeometry(p);
    addPart(list, g, m, (painted && PAINT[p.c]) || p.c);
    g.dispose();
  }
  const mesh = new THREE.Mesh(mergeParts(list), material);
  list.forEach((g) => g.dispose());
  mesh.name = `car_${module}`;
  return mesh;
}

export async function carPreviz(id: CarId, kit?: KitPart, figure?: Figure) {
  const car = CARS[id];
  const view = carView();
  const upgraded = view === 'upgraded' || view === 'plan-upgraded';
  const plan = view.startsWith('plan');
  const group = new THREE.Group();
  const geometries = new Set<THREE.BufferGeometry>(),
    materials = new Set<THREE.Material>();
  const figures: { dispose(): void }[] = [];
  const flat = (color: string) => {
    const m = new THREE.MeshStandardNodeMaterial({ color, roughness: 0.75 });
    materials.add(m);
    return m;
  };
  const painted = new THREE.MeshStandardNodeMaterial({ vertexColors: true, roughness: 0.7 });
  materials.add(painted);
  const boxAt = (color: string, x: [number, number], y: [number, number], z: [number, number]) => {
    const g = new THREE.BoxGeometry(x[1] - x[0], y[1] - y[0], z[1] - z[0]);
    geometries.add(g);
    const mesh = new THREE.Mesh(g, flat(color));
    mesh.position.set((x[0] + x[1]) / 2, (y[0] + y[1]) / 2, (z[0] + z[1]) / 2);
    group.add(mesh);
    return mesh;
  };
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
  const wheelAt: { x: number; y: number; z: number; r: number }[] = [];

  // Track and the halt deck along the +x side, as halts-view.ts builds them.
  const engineAt = DECK.hz + GAP + ENGINE.hz;
  const z0 = -DECK.hz - 2.5,
    z1 = engineAt + ENGINE.hz + 1.5;
  for (const s of [-1, 1]) boxAt(STEEL, [s * 0.5 - 0.05, s * 0.5 + 0.05], [0.04, 0.16], [z0, z1]);
  {
    const n = Math.floor((z1 - z0) / 0.75);
    const sleeper = new THREE.BoxGeometry(2.3, 0.12, 0.42);
    geometries.add(sleeper);
    const sleepers = new THREE.InstancedMesh(sleeper, flat(SLEEPER), n);
    for (let k = 0; k < n; k++)
      sleepers.setMatrixAt(k, new THREE.Matrix4().makeTranslation(0, -0.02, z0 + 0.375 + k * 0.75));
    group.add(sleepers);
  }
  boxAt(STONE, [1.65, 4.15], [0.22, 0.72], [z0 + 0.5, z1 - 0.5]);
  boxAt(UNDER, [1.67, 4.13], [-0.03, 0.24], [z0 + 0.52, z1 - 0.52]);
  for (const x of [
    [1.67, 1.95],
    [3.85, 4.13],
  ] as [number, number][])
    boxAt(EDGE, x, [0.68, 0.73], [z0 + 0.52, z1 - 0.52]);

  // Engine A as built (assets/src/engine.py), boiler fitted, its frame's back end 0.6 m ahead of the car's deck.
  const engine = new THREE.Group();
  engine.position.z = engineAt;
  group.add(engine);
  for (const node of ['engine_body', 'engine_rods', 'engine_boiler', 'engine_lashing', 'engine_stool']) {
    const o = await kitMesh('engine', node);
    if (o) engine.add(o);
  }
  for (const side of [1, -1]) {
    const door = await kitMesh('engine', 'engine_door');
    if (!door) continue;
    door.scale.x = side; // one node, mirrored in code as train-view.ts does
    engine.add(door);
  }
  for (const sx of [-0.5, 0.5])
    for (const sz of [-1, 1])
      wheelAt.push({ x: sx, y: ENGINE_WHEELS.r + 0.15, z: engineAt + sz * ENGINE_WHEELS.z, r: ENGINE_WHEELS.r });
  boxAt(BLACK, [-0.06, 0.06], [0.55, 0.66], [DECK.hz - 0.1, DECK.hz + GAP + 0.15]); // the coupling

  // The car: today's flatbed, the fittings, the upgrade.
  for (const [node, color] of [
    ['flat_deck', DECK_WOOD],
    ['flat_black', BLACK],
  ] as const) {
    const o = await kitMesh('place-kit', node, color);
    if (o) group.add(o);
  }
  for (const sx of [-0.5, 0.5]) for (const sz of [-1, 1]) wheelAt.push({ x: sx, y: 0.37, z: sz * 1.1, r: 0.22 });
  const fit = moduleMesh(car.parts, 'fit', painted, upgraded);
  geometries.add(fit.geometry);
  group.add(fit);
  if (upgraded && !plan) {
    const roof = moduleMesh(car.parts, 'upgrade', painted, true);
    geometries.add(roof.geometry);
    group.add(roof);
  } else if (upgraded) {
    // Seen from above, the roof would hide the seats: draw the upgrade without its canopy.
    const below = car.parts.filter((p) => p.kind !== 'box' || p.min[1] < 2.4 || p.m !== 'upgrade');
    const roof = moduleMesh(below, 'upgrade', painted, true);
    geometries.add(roof.geometry);
    group.add(roof);
  }

  // Riders. In the halt views the last seat is empty and its rider stands on the halt deck beside it, getting on;
  // in the plans every seat is taken.
  const place = (o: THREE.Object3D, s: Seat, dy = 0) => {
    o.position.set(s.at[0], s.at[1] + dy, s.at[2]);
    o.rotation.y = s.yaw;
    group.add(o);
  };
  const seated = plan ? car.seats.length : car.seats.length - 1;
  car.seats.forEach((seat, k) => {
    if (k >= seated || !figure) return;
    const f = figure(true, RIDER_COLORS[k % RIDER_COLORS.length]!);
    figures.push(f);
    // The stage's played Buddy holds his capsule centre 0.45 m over the group (buddy-preview.ts); a seated player's
    // drawn body comes down SEATED_DROP from the capsule (seat.ts), which the stage doesn't do on its own.
    place(f.group, seat, -PLAYER_R - SEATED_DROP);
  });
  // Stowaways, one per seated rider: beside them on the knifeboard's bench; at their feet on the toast rack.
  const critter = GIFTS.find((g) => g.id === 'critter')!;
  const petGeometry = merged(critter.parts);
  geometries.add(petGeometry);
  const petMaterial = new THREE.MeshStandardNodeMaterial({ vertexColors: true, roughness: 0.8 });
  materials.add(petMaterial);
  car.pets.forEach((pet, k) => {
    if (k >= seated) return;
    place(new THREE.Mesh(petGeometry, petMaterial), pet);
  });

  if (wheelAt.length) {
    const kitWheel = await kitMesh('place-kit', 'wheel');
    let geometry: THREE.BufferGeometry | undefined;
    kitWheel?.traverse((o) => {
      if (o instanceof THREE.Mesh && !geometry) geometry = o.geometry;
    });
    if (!geometry) geometries.add((geometry = new THREE.CylinderGeometry(1, 1, 0.12, 20).rotateZ(-Math.PI / 2)));
    const batch = new THREE.InstancedMesh(geometry, flat(IRON), wheelAt.length);
    batch.userData.shared = !!kitWheel;
    const q = new THREE.Quaternion(),
      s = new THREE.Vector3(),
      at = new THREE.Vector3();
    wheelAt.forEach((w, k) =>
      batch.setMatrixAt(k, new THREE.Matrix4().compose(at.set(w.x, w.y, w.z), q, s.set(1, w.r, w.r))),
    );
    group.add(batch);
  }
  group.traverse((o) => {
    if (o instanceof THREE.Mesh) o.castShadow = o.receiveShadow = true;
  });
  // The stage's own Buddy: the last seat's rider, on the halt deck by their empty seat, about to get on.
  const last = car.seats.at(-1)!;
  const buddy = plan
    ? { x: 2.6, y: 0.72, z: -DECK.hz - 1, yaw: -0.6 }
    : { x: 2.15, y: 0.72, z: last.at[2] + (id === 'six' ? 0.5 : 0), yaw: -Math.PI / 2 };
  return {
    group,
    buddy,
    seek() {
      group.updateMatrixWorld(true);
    },
    advance() {},
    dispose() {
      figures.forEach((f) => f.dispose());
      geometries.forEach((g) => g.dispose());
      materials.forEach((m) => m.dispose());
    },
  };
}

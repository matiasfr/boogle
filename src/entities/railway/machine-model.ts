// Pure mesh assembly: no scene, physics, loop or game state. Both the stage and Place use these materials.
import * as THREE from 'three/webgpu';
import { material } from '../../render/materials.ts';
import { panelMechanism, type RailBatch } from './machine-panels.ts';

export const MACHINE_GAP = 3.7;
export const MACHINE_DECK = 0.7;
export const MACHINE_CHAIRS = [-0.55, 0.55] as const;
/** Chair seat top above the deck top (m): Buddy sits with his feet on the deck, his seated pose (Driving_Loop) hips this high. assets/src/track-layer.py CHAIR_SEAT. */
export const MACHINE_CHAIR_SEAT = 0.32;
export const MACHINE_WHEEL_RADIUS = 0.13;
export const wheelAngle = (distance: number) => distance / MACHINE_WHEEL_RADIUS;
/** Wrap logical axle pivots without discarding GLB quantization/decode transforms. Also used by the asset stage. */
export function machineWheelPivots(source: THREE.Object3D) {
  const wheels: [THREE.Group[], THREE.Group[]] = [[], []];
  const parts: THREE.Object3D[] = [];
  source.traverse((part) => {
    if (/^(power|deck)_wheel_[0-3]$/.test(part.name)) parts.push(part);
  });
  for (const part of parts) {
    const match = /^(power|deck)_wheel_([0-3])$/.exec(part.name);
    if (!match) continue;
    const body = match[1] === 'power' ? 0 : 1,
      index = Number(match[2]),
      axle = Math.floor(index / 2);
    const pivot = new THREE.Group();
    pivot.name = `${part.name}-axle`;
    pivot.position.set(
      index % 2 ? 0.52 : -0.52,
      0.235 + MACHINE_WHEEL_RADIUS,
      body === 0 ? -MACHINE_GAP + (axle ? 0.8 : -0.8) : axle ? -0.45 : -1.35,
    );
    part.parent!.add(pivot);
    part.position.sub(pivot.position);
    pivot.add(part);
    wheels[body].push(pivot);
  }
  return wheels;
}
export const MACHINE_CRANK_RADIUS = 0.07;
/** Independent, rigid side rods; their two eyes follow equal-phase wheel crank pins. */
export function machineRodPivots(source: THREE.Object3D) {
  const parts: THREE.Object3D[] = [];
  source.traverse((part) => {
    if (/^power_rod_[01]$/.test(part.name)) parts.push(part);
  });
  return parts.map((part) => {
    const pivot = new THREE.Group();
    pivot.name = `${part.name}-slide`;
    pivot.position.set(
      part.name.endsWith('0') ? -0.72 : 0.72,
      0.235 + MACHINE_WHEEL_RADIUS + MACHINE_CRANK_RADIUS,
      -MACHINE_GAP,
    );
    part.parent!.add(pivot);
    part.position.sub(pivot.position);
    pivot.add(part);
    return pivot;
  });
}
export function poseMachineRods(rods: THREE.Object3D[], angle: number) {
  for (const rod of rods) {
    rod.position.y = 0.235 + MACHINE_WHEEL_RADIUS + MACHINE_CRANK_RADIUS * Math.cos(angle);
    rod.position.z = -MACHINE_GAP + MACHINE_CRANK_RADIUS * Math.sin(angle);
  }
}
/** The shell is rigid. The existing fork action stays owned by rail.ts. */
export function dressMachine(source: THREE.Object3D) {
  const recipes = {
    // Previz art swatches are linear RGB, not hex-constructor sRGB or sampled measurements.
    paint: ['paintedToy', [198 / 255, 90 / 255, 22 / 255]],
    iron: ['steel', [16 / 255, 28 / 255, 41 / 255]],
    trim: ['paintedToy', [197 / 255, 171 / 255, 104 / 255]],
    wood: ['timber', [0.32, 0.2, 0.095]],
    gantry: ['paintedToy', [198 / 255, 90 / 255, 22 / 255]],
    cream: ['paintedToy', [197 / 255, 171 / 255, 104 / 255]],
    teal: ['paintedToy', [36 / 255, 86 / 255, 83 / 255]],
    bogie: ['steel', [16 / 255, 28 / 255, 41 / 255]],
    wheel: ['steel', [1, 1, 1]], // Authored vertex colours distinguish pale hubs/spokes from the dark tread.
    rod: ['paintedToy', [197 / 255, 171 / 255, 104 / 255]],
  } as const;
  const owned = new Map<string, { mat: THREE.MeshStandardNodeMaterial; clean: THREE.Color; aged: THREE.Color }>();
  source.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh) return;
    const role = o.name.split('_')[1] as keyof typeof recipes;
    const recipe = recipes[role];
    if (!recipe) throw new Error(`Unknown track-layer part: ${o.name}`);
    let entry = owned.get(role);
    if (!entry) {
      const mat = material(recipe[0], { normals: 'authored' }).clone();
      mat.vertexColors = recipe === recipes.wheel;
      const [r, g, b] = recipe[1];
      mat.color.setRGB(r, g, b, THREE.LinearSRGBColorSpace);
      const clean = mat.color.clone();
      const aged = clean
        .clone()
        .multiply(new THREE.Color(0.58, 0.5, 0.42))
        .add(new THREE.Color(0.055, 0.035, 0.015));
      entry = { mat, clean, aged };
      owned.set(role, entry);
    }
    mesh.material = entry.mat;
    mesh.castShadow = mesh.receiveShadow = true;
  });
  let last = -1;
  return {
    wear(value: number) {
      if (last === value) return;
      last = value;
      for (const [role, { mat, clean, aged }] of owned) {
        if (role === 'wood') continue;
        mat.color.lerpColors(clean, aged, value);
      }
    },
    dispose: () => owned.forEach(({ mat }) => mat.dispose()),
  };
}

/** Preserve compressed node transforms; only undo the authored inter-body spacing. */
export function mountMachine(
  source: THREE.Object3D,
  power: THREE.Object3D,
  deck: THREE.Object3D,
  chairs: THREE.Object3D,
  gear: THREE.Object3D[],
) {
  const copy = source.clone(true);
  const finish = dressMachine(copy);
  const wheels = machineWheelPivots(copy);
  const rods = machineRodPivots(copy);
  const rear = new THREE.Group();
  rear.position.z = MACHINE_GAP;
  power.add(rear);
  const rearGear = new THREE.Group();
  rearGear.position.z = MACHINE_GAP;
  gear[0]!.add(rearGear);
  const layParts = new Map<string, THREE.Object3D>();
  for (const part of [...copy.children]) {
    if (part.name.includes('_wheel_') || part.name.includes('_rod_') || part.name.endsWith('_bogie'))
      (part.name.startsWith('power_') ? rearGear : gear[1]!).add(part);
    else if (part.name.startsWith('power_')) rear.add(part);
    else if (part.name.startsWith('deck_')) deck.add(part);
    else if (part.name.startsWith('chair_')) chairs.add(part);
    else if (part.name.startsWith('lay_')) layParts.set(part.name, part);
    else throw new Error(`Unexpected track-layer root: ${part.name}`);
  }
  return { ...finish, wheels, rods, layParts };
}

export function machineModel(
  heldRail: THREE.Object3D,
  forkIron: THREE.Object3D,
  sleeper: THREE.Object3D,
  railBatch: RailBatch,
) {
  const power = new THREE.Group(),
    deck = new THREE.Group(),
    chairs = new THREE.Group(),
    fork = new THREE.Group();
  power.name = 'track-layer-power';
  deck.name = 'track-layer-deck';
  chairs.name = 'track-layer-chairs';
  heldRail.position.set(0.5, 0.68, 2.3);
  sleeper.position.y = 0.05;
  fork.add(forkIron, sleeper);
  fork.position.z = 2.05;
  deck.add(fork, heldRail);
  const chimneyTop = new THREE.Object3D();
  chimneyTop.position.set(0, 2.5, 1.05);
  power.add(chimneyTop);
  const cars = [power, deck].map((inner) => {
    const outer = new THREE.Group();
    outer.add(inner);
    return outer;
  });
  const runningGear = [new THREE.Group(), new THREE.Group()];
  runningGear.forEach((g, i) => {
    g.name = `track-layer-bogie-${i}`;
  });
  const pitchedGear = runningGear.map((outer) => {
    const inner = new THREE.Group();
    outer.add(inner);
    return inner;
  });
  const panelRig = panelMechanism(deck, railBatch);
  const odometers = runningGear.map(() => ({ last: new THREE.Vector3(NaN, 0, 0), yaw: 0, distance: 0 }));
  let finish: ReturnType<typeof mountMachine> | undefined;
  let travel = 0;
  const last = new THREE.Vector3(NaN, 0, 0);
  return {
    cars,
    chairs,
    chimneyTop,
    heldRail,
    runningGear,
    panelRig,
    resetWheelTravel: (i: number) => odometers[i]!.last.set(NaN, 0, 0),
    wheelState: () =>
      odometers.map((o, i) => ({ distance: o.distance, angles: finish?.wheels[i]!.map((w) => w.rotation.x) ?? [] })),
    // Retain the wake interface; rail wheels roll only with travel, never this stationary slip request.
    slip: { rate: 0 },
    install: (source: THREE.Object3D) => {
      finish = mountMachine(source, power, deck, chairs, pitchedGear);
      panelRig.install(finish.layParts);
    },
    update(wear: number) {
      finish?.wear(wear);
      runningGear.forEach((gear, i) => {
        const parent = gear.parent,
          o = odometers[i]!;
        if (!parent?.visible) return void o.last.set(NaN, 0, 0);
        pitchedGear[i]!.rotation.x = cars[i]!.rotation.x; // Track pitch, without the shell's cosmetic wake shudder.
        const at = parent.position,
          yaw = parent.rotation.y;
        const dx = at.x - o.last.x,
          dy = at.y - o.last.y,
          dz = at.z - o.last.z;
        // Mid-heading projection excludes lateral turntable orbit; 3D length includes slopes.
        const along = dx * (Math.sin(yaw) + Math.sin(o.yaw)) + dz * (Math.cos(yaw) + Math.cos(o.yaw));
        if (Math.abs(along) > 1e-7) o.distance += Math.sign(along) * Math.hypot(dx, dy, dz);
        o.last.copy(at);
        o.yaw = yaw;
        for (const wheel of finish?.wheels[i] ?? []) wheel.rotation.x = wheelAngle(o.distance);
        if (i === 0 && finish) poseMachineRods(finish.rods, wheelAngle(o.distance));
      });
      const parent = cars[1]!.parent;
      if (!parent?.visible) return void last.set(NaN, 0, 0);
      const at = parent.position,
        yaw = parent.rotation.y;
      const dx = at.x - last.x,
        dz = at.z - last.z;
      if (Math.abs(dx) + Math.abs(dz) < 2) travel += Math.abs(dx * Math.sin(yaw) + dz * Math.cos(yaw));
      last.copy(at);
      // Existing Place fork formula: one down/up cycle per 1.2 m, driven by travelled distance.
      fork.position.y = 0.2 + 0.3 * Math.abs(Math.cos((travel / 1.2) * Math.PI));
    },
  };
}

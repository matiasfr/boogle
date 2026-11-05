// Pure mesh assembly: no scene, physics, loop or game state. Both the stage and Place use these materials.
import * as THREE from 'three/webgpu';
import { material, type ColourToken } from '../../render/materials.ts';

export const MACHINE_GAP = 3.7;
export const MACHINE_CHAIRS = [-0.55, 0.55] as const;
/** The shell is rigid. The existing fork action stays owned by rail.ts. */
export function dressMachine(source: THREE.Object3D) {
  const recipes = {
    paint: ['paintedToy', '#f0752c'],
    iron: ['paintedToy', '#24262c'],
    trim: ['paintedToy', '#f4d58a'],
    wood: ['timber', '#9a7b55'],
    gantry: ['paintedToy', '#f0752c'],
    cream: ['paintedToy', '#e8d3a2'],
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
      const mat = material(recipe[0], { colour: recipe[1] as ColourToken, normals: 'authored' }).clone();
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
export function mountMachine(source: THREE.Object3D, power: THREE.Object3D, deck: THREE.Object3D) {
  const copy = source.clone(true);
  const finish = dressMachine(copy);
  const rear = new THREE.Group();
  rear.position.z = MACHINE_GAP;
  power.add(rear);
  for (const part of [...copy.children]) {
    if (part.name.startsWith('power_')) rear.add(part);
    else if (part.name.startsWith('deck_')) deck.add(part);
    else throw new Error(`Unexpected track-layer root: ${part.name}`);
  }
  return finish;
}

export function machineModel(heldRail: THREE.Object3D, forkIron: THREE.Object3D, sleeper: THREE.Object3D) {
  const power = new THREE.Group(),
    deck = new THREE.Group(),
    fork = new THREE.Group();
  power.name = 'track-layer-power';
  deck.name = 'track-layer-deck';
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
  let finish: ReturnType<typeof dressMachine> | undefined;
  let travel = 0;
  const last = new THREE.Vector3(NaN, 0, 0);
  return {
    cars,
    chimneyTop,
    heldRail,
    // Retain the wake interface. This first crawler shell has static rollers, not locomotive drive rods.
    slip: { rate: 0 },
    install: (source: THREE.Object3D) => {
      finish = mountMachine(source, power, deck);
    },
    update(wear: number) {
      finish?.wear(wear);
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

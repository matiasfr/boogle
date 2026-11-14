// The workshop furnace's fire: a brick firebox with a real recess, a bed of coals, three layers of flame tongues,
// sparks, a flue's smoke and a warm flickering light. Local and cosmetic; the furnace's solid stays with workshop.ts.
import * as THREE from 'three/webgpu';
import { reducedMotion } from '../../constants.ts';
import { addLightSource, removeLightSource } from '../../render/lights.ts';
import type { Part } from '../../render/part-geometry.ts';
import { emit } from '../../render/particles.ts';
import { readableIntensity, readableUnlit } from '../../render/readable-unlit.ts';

const BRICK = '#854a39',
  SOOT = '#1c1210',
  IRON = '#3a3f45';
/** The mouth: 2.1 m wide, from 0.75 to 1.55 m over the floor, 0.45 m deep. */
const MOUTH = { w: 2.1, y0: 0.75, y1: 1.55 };
const BED = 0.84;
type Flame = { x: number; z: number; w: number; h: number; color: string };
// Outer tongues (deep orange), a middle row (amber) and the hot core (pale yellow), front to back.
const FLAMES: Flame[] = [
  ...[-0.82, -0.42, 0, 0.42, 0.82].map((x, i) => ({ x, z: 0.06, w: 0.44, h: 0.5 + (i % 2) * 0.08, color: '#f0431a' })),
  ...[-0.62, -0.2, 0.22, 0.64].map((x, i) => ({ x, z: -0.04, w: 0.32, h: 0.4 + (i % 2) * 0.06, color: '#ff8a1c' })),
  ...[-0.4, 0.02, 0.44].map((x) => ({ x, z: -0.12, w: 0.2, h: 0.27, color: '#ffe08a' })),
];
const COALS = 12;
const COLD = new THREE.Color('#6e1a08'),
  HOT = new THREE.Color('#ffb347');
const SPARK = [new THREE.Color('#ffe9a8'), new THREE.Color('#ff8a1c'), new THREE.Color('#a8260a')] as const;
const SMOKE = new THREE.Color('#5d5a55');

/** The firebox's drawn parts (room-local, floor at y 0): `zc` is the furnace's centre, 0.65 m deep. */
export function fireboxParts(zc: number): Part[] {
  const jamb = (2.8 - MOUTH.w) / 2;
  return [
    ['b', 0, MOUTH.y0 / 2, zc, 2.8, MOUTH.y0, 0.65, BRICK],
    ['b', 0, (MOUTH.y1 + 1.9) / 2, zc, 2.8, 1.9 - MOUTH.y1, 0.65, BRICK],
    ...[-1, 1].map((s): Part => [
      'b',
      (s * (MOUTH.w + jamb)) / 2,
      (MOUTH.y0 + MOUTH.y1) / 2,
      zc,
      jamb,
      MOUTH.y1 - MOUTH.y0,
      0.65,
      BRICK,
    ]),
    // The sooty back and hearth floor of the recess, an iron lip under the lintel, then the hood and its flue.
    ['b', 0, (MOUTH.y0 + MOUTH.y1) / 2, zc + 0.275, MOUTH.w, MOUTH.y1 - MOUTH.y0, 0.1, SOOT],
    ['b', 0, MOUTH.y0 + 0.01, zc - 0.05, MOUTH.w, 0.02, 0.55, SOOT],
    ['b', 0, MOUTH.y1 + 0.05, zc - 0.345, MOUTH.w + 0.2, 0.1, 0.08, IRON],
    ['b', 0, 2.03, zc, 2.1, 0.26, 0.6, IRON],
    ['b', 0, 2.29, zc, 1.3, 0.26, 0.52, IRON],
    ['b', 0, 3.36, zc, 0.5, 1.88, 0.44, '#2d3136'],
  ];
}

/** Flames, coals, sparks, smoke and light for the firebox at room-local `zc`, under `parent` (the room's group). */
export function makeForgeFire(parent: THREE.Object3D, zc: number, world: THREE.Vector3) {
  const material = readableUnlit(new THREE.MeshBasicNodeMaterial({ color: '#ffffff' }));
  const flames = new THREE.InstancedMesh(
    new THREE.ConeGeometry(0.5, 1, 5).translate(0, 0.5, 0),
    material,
    FLAMES.length,
  );
  const coals = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), material, COALS);
  flames.frustumCulled = coals.frustumCulled = false;
  const color = new THREE.Color(),
    m4 = new THREE.Matrix4(),
    q = new THREE.Quaternion(),
    e = new THREE.Euler(),
    at = new THREE.Vector3(),
    scale = new THREE.Vector3();
  FLAMES.forEach((f, i) => flames.setColorAt(i, color.set(f.color)));
  for (let i = 0; i < COALS; i++) {
    // A fixed scatter: lumps in two ragged rows across the bed.
    const u = (i + 0.5) / COALS,
      size = 0.15 + ((i * 7) % 5) * 0.022;
    at.set((u - 0.5) * (MOUTH.w - 0.3), BED - 0.03 + ((i * 3) % 4) * 0.012, zc - 0.12 + ((i * 5) % 3) * 0.1);
    coals.setMatrixAt(i, m4.compose(at, q.setFromEuler(e.set(i * 1.3, i * 2.1, i * 0.7)), scale.setScalar(size)));
    coals.setColorAt(i, COLD);
  }
  const pose = (t: number) => {
    FLAMES.forEach((f, i) => {
      const lick = 1 + 0.22 * Math.sin(t * (7 + i * 1.3) + i * 2.1) + 0.13 * Math.sin(t * (13.7 + i * 0.7) + i);
      e.set(0, t * (0.7 + i * 0.11) + i, 0.14 * Math.sin(t * (3.1 + i * 0.37) + i * 1.7), 'ZYX');
      const w = f.w * (1.12 - 0.24 * (lick - 1));
      flames.setMatrixAt(i, m4.compose(at.set(f.x, BED, zc + f.z), q.setFromEuler(e), scale.set(w, f.h * lick, w)));
    });
    flames.instanceMatrix.needsUpdate = true;
    for (let i = 0; i < COALS; i++)
      coals.setColorAt(
        i,
        color.lerpColors(
          COLD,
          HOT,
          0.5 + 0.35 * Math.sin(t * (1.3 + (i % 4) * 0.45) + i * 1.9) + 0.15 * Math.sin(t * 9 + i),
        ),
      );
    coals.instanceColor!.needsUpdate = true;
  };
  pose(0);
  parent.add(flames, coals);
  // One of the shared pool's two point lights when you are near (render/lights.ts): no light is added to the scene.
  const light = addLightSource({
    // Out over the hearth flags, clear of the guard, so it washes the floor, the anvil and the guard's room side.
    position: new THREE.Vector3(world.x, world.y + 1.5, world.z + zc - 1.9),
    color: '#ff9a4a',
    intensity: 0,
    distance: 9,
  });
  let t = 0,
    sparks = 0,
    smoke = 0;
  return {
    /** `lit`: the room is open; `inside`: this player stands in it (the roof is cut away: the flue's smoke shows). */
    update(dt: number, lit: boolean, inside: boolean) {
      light.intensity = lit ? 22 : 0;
      if (!lit || reducedMotion) return;
      t += dt;
      pose(t);
      light.intensity = 22 * (0.86 + 0.09 * Math.sin(t * 11.3) + 0.05 * Math.sin(t * 23.1 + 1.7));
      if (!inside) return;
      for (sparks += dt * 7; sparks >= 1; sparks--)
        emit({
          x: world.x + (Math.random() - 0.5) * (MOUTH.w - 0.4),
          y: world.y + BED + 0.15,
          z: world.z + zc - 0.2,
          vx: (Math.random() - 0.5) * 0.7,
          vy: 1.1 + Math.random() * 1.3,
          vz: -0.25 - Math.random() * 0.6,
          life: 0.6 + Math.random() * 0.7,
          size: 0.05 + Math.random() * 0.03,
          color: SPARK[0],
          colorCurve: SPARK,
          intensity: readableIntensity(),
          gravity: -1.2,
          drag: 0.6,
          shrink: 1,
          shape: 'quad',
          rotation: Math.random() * 3,
          spin: 4,
        });
      for (smoke += dt * 1.2; smoke >= 1; smoke--)
        emit({
          x: world.x + (Math.random() - 0.5) * 0.2,
          y: world.y + 4.35,
          z: world.z + zc + (Math.random() - 0.5) * 0.2,
          vx: 0.25,
          vy: 1.3 + Math.random() * 0.5,
          vz: 0,
          life: 2.6,
          size: 0.5,
          grow: [1, 2.6],
          alpha: 0.4,
          fade: 0.6,
          color: SMOKE,
          drag: 0.2,
        });
    },
    dispose() {
      removeLightSource(light);
      flames.removeFromParent();
      coals.removeFromParent();
      flames.geometry.dispose();
      coals.geometry.dispose();
      flames.dispose();
      coals.dispose();
      material.dispose();
    },
  };
}

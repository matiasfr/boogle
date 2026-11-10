// The train engine's meshes, from assets/src/engine.py (docs/plans/engine-previz.md, "Build plan: the picked engine"):
// each GLB node baked once to plain float geometry in the car's frame, with its vertex colours, and drawn in the kit's
// own paint (./look.ts), so the old train's body rusts with rustTrainU as the kit's pieces do. Load before use; no scene,
// loop, world or physics dependency. Sizes and the collider are ./../wagon/engine.ts's.
import * as THREE from 'three/webgpu';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import url from '../../../assets/built/engine.glb?url';
import { paint } from './look.ts';
import { ENGINE_CAB } from '../wagon/engine.ts';

const kit = await new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).loadAsync(url);
kit.scene.updateMatrixWorld(true);
export type EnginePart =
  | 'engine_body'
  | 'engine_rods'
  | 'engine_door'
  | 'engine_boiler'
  | 'engine_lashing'
  | 'engine_stool'
  | 'engine_body_long'
  | 'engine_boiler_long'
  | 'engine_lashing_long';

const baked = new Map<EnginePart, THREE.BufferGeometry>();
/** A node's geometry in the car's frame, in metres (meshopt's quantization lives on the node: baked in here). */
function geometry(part: EnginePart) {
  let g = baked.get(part);
  if (g) return g;
  const mesh = kit.scene.getObjectByName(part);
  if (!(mesh instanceof THREE.Mesh)) throw new Error(`engine kit has no ${part}`);
  const src = mesh.geometry as THREE.BufferGeometry;
  g = new THREE.BufferGeometry();
  for (const [name, size] of [
    ['position', 3],
    ['normal', 3],
    ['color', 3],
  ] as const) {
    const a = src.getAttribute(name);
    const f = new Float32Array(a.count * size);
    for (let i = 0; i < a.count; i++) f.set([a.getX(i), a.getY(i), a.getZ(i)], i * size);
    g.setAttribute(name, new THREE.BufferAttribute(f, size));
  }
  g.setIndex(src.index);
  g.applyMatrix4(mesh.matrixWorld);
  baked.set(part, g);
  return g;
}

/** The old train's paint, rusting with rustTrainU; the boiler arrives new and the stool's wood keeps its colour. */
const RUSTED = { color: '#ffffff', own: true, rough: 0.7, rust: 'train' } as const;
const NEW = { color: '#ffffff', own: true, rough: 0.6 } as const;

/** One of the engine's parts, sharing the kit's cached geometry and paint (never dispose either). */
export function enginePart(part: EnginePart, rust = true) {
  const m = new THREE.Mesh(geometry(part), paint(rust ? RUSTED : NEW));
  m.name = part;
  m.castShadow = m.receiveShadow = true;
  return m;
}

/** The door's hinge: its back edge, inside the +x doorway. */
export const DOOR_HINGE = { x: ENGINE_CAB.hx - 0.03, z: ENGINE_CAB.door.z[0] + 0.005 };
const hingedDoor = new Map<number, THREE.BufferGeometry>();
/** A cab door on side `side` (+1 or −1), its origin on its hinge: turn it about y to swing it open (outward is +angle on
 * +x and −angle on −x; ../../entities/railway/train-view.ts swings them). */
export function engineDoor(side: 1 | -1) {
  let g = hingedDoor.get(side);
  if (!g) {
    g = geometry('engine_door').clone().translate(-DOOR_HINGE.x, 0, -DOOR_HINGE.z);
    if (side < 0) {
      g.scale(-1, 1, 1);
      // A mirror turns the triangles inside out: wind them back.
      const index = g.index!;
      for (let i = 0; i < index.count; i += 3) {
        const a = index.getX(i + 1);
        index.setX(i + 1, index.getX(i + 2));
        index.setX(i + 2, a);
      }
    }
    hingedDoor.set(side, g);
  }
  const m = new THREE.Mesh(g, paint(RUSTED));
  m.name = `engine_door_${side > 0 ? 'right' : 'left'}`;
  m.position.set(side * DOOR_HINGE.x, 0, DOOR_HINGE.z);
  m.castShadow = m.receiveShadow = true;
  return m;
}

/** The fitted boiler's middle in the car's frame: the hauled boiler, the loose one and the fitted one share it. */
export const BOILER_CENTRE = (() => {
  const g = geometry('engine_boiler');
  g.computeBoundingBox();
  return g.boundingBox!.getCenter(new THREE.Vector3());
})();

/** The boiler as a thing on its own (on its pedestal, on the rope, flown into the saddles, on its card), centred on its
 * middle. Owned resources: its geometry and material are copies the caller may dispose. */
export function makeEngineBoiler() {
  const group = new THREE.Group();
  group.name = 'engine_boiler';
  const m = new THREE.Mesh(
    geometry('engine_boiler').clone().translate(-BOILER_CENTRE.x, -BOILER_CENTRE.y, -BOILER_CENTRE.z),
    paint(NEW).clone(),
  );
  m.castShadow = m.receiveShadow = true;
  group.add(m);
  return group;
}

/** The lashing round the fitted boiler, in the boiler's centred frame (it goes inside makeEngineBoiler's group). */
export function engineLashing(material: THREE.Material) {
  const m = new THREE.Mesh(geometry('engine_lashing'), material);
  m.name = 'engine_lashing';
  m.position.copy(BOILER_CENTRE).negate();
  m.castShadow = true;
  return m;
}

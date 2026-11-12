// The train engine's meshes, from assets/src/engine.py (docs/plans/engine-previz.md, "Build plan: the picked engine"):
// each GLB node baked once to plain float geometry in the car's frame, with its vertex colours, and drawn in the kit's
// own paint (./look.ts), so the old train's body rusts with rustTrainU as the kit's pieces do. Load before use; no scene,
// loop, world or physics dependency. Sizes and the collider are ./../wagon/engine.ts's.
import * as THREE from 'three/webgpu';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import url from '../../../assets/built/engine.glb?url';
import { paint } from '../../place/look.ts';
import { ENGINE_CAB } from './engine.ts';

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

/** The cab's shell, in the parts the cutaway moves on their own: the roof and each wall (the side walls with their
 * glass). */
export const CAB_FACES = ['roof', 'back', 'front', 'left', 'right'] as const;
export type CabFace = (typeof CAB_FACES)[number];
type Split = { rest: THREE.BufferGeometry; faces: Record<CabFace, THREE.BufferGeometry>; shell: THREE.BufferGeometry };
const splits = new Map<EnginePart, Split>();
/** A body cut in two: the cab's walls and roof by face, and everything else. Each box the recipe makes is its own
 * closed piece of the mesh, so the pieces are the connected triangles, sorted by where their middle is. The longer
 * boiler's body carries the same cab in the same place (engine.py), so it cuts the same way. */
function splitBody(body: 'engine_body' | 'engine_body_long' = 'engine_body'): Split {
  let split = splits.get(body);
  if (split) return split;
  const g = geometry(body),
    pos = g.getAttribute('position'),
    index = g.index!;
  const root = Array.from({ length: pos.count }, (_, i) => i);
  const find = (i: number): number => {
    while (root[i] !== i) i = root[i] = root[root[i]!]!;
    return i;
  };
  for (let i = 0; i < index.count; i += 3) {
    const a = find(index.getX(i));
    for (const k of [1, 2]) root[find(index.getX(i + k))] = a;
  }
  const boxes = new Map<number, THREE.Box3>();
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    const r = find(i);
    let b = boxes.get(r);
    if (!b) boxes.set(r, (b = new THREE.Box3()));
    b.expandByPoint(v.fromBufferAttribute(pos, i));
  }
  const c = ENGINE_CAB,
    mid = new THREE.Vector3();
  const faceOf = new Map<number, CabFace | null>();
  for (const [r, b] of boxes) {
    b.getCenter(mid);
    let face: CabFace | null = null;
    const inCab = mid.z > c.zBack - 0.15 && mid.z < c.zFront + 0.15 && mid.y > c.floor;
    if (inCab && mid.y > c.roofUnder - 0.02) face = 'roof';
    else if (inCab && Math.abs(mid.x) > c.hx - c.wall - 0.03) face = mid.x > 0 ? 'right' : 'left';
    else if (inCab && mid.z < c.zBack + c.wall + 0.03) face = 'back';
    else if (inCab && mid.z > c.zFront - c.wall - 0.03) face = 'front';
    faceOf.set(r, face);
  }
  const lists = { rest: [] as number[], shell: [] as number[] } as Record<CabFace | 'rest' | 'shell', number[]>;
  for (const f of CAB_FACES) lists[f] = [];
  for (let i = 0; i < index.count; i += 3) {
    const face = faceOf.get(find(index.getX(i))) ?? null;
    const tri = [index.getX(i), index.getX(i + 1), index.getX(i + 2)];
    lists[face ?? 'rest'].push(...tri);
    if (face) lists.shell.push(...tri);
  }
  const part = (list: number[]) => {
    const out = new THREE.BufferGeometry();
    for (const name of ['position', 'normal', 'color']) out.setAttribute(name, g.getAttribute(name));
    out.setIndex(list);
    return out;
  };
  const faces = Object.fromEntries(CAB_FACES.map((f) => [f, part(lists[f])])) as Record<CabFace, THREE.BufferGeometry>;
  split = { rest: part(lists.rest), faces, shell: part(lists.shell) };
  splits.set(body, split);
  return split;
}
const shadowOnly = new THREE.MeshBasicNodeMaterial({ colorWrite: false, depthWrite: false });
/** The body with its cab in parts the train view can move out of a rider's way (train-view.ts, the cutaway): the rest
 * of the body, each face of the cab, and a shadow-only copy of the whole shell, so the cab keeps its shade with a
 * face out of the way. The geometry and paint are the kit's (never dispose them). */
export function engineBodyWithCab() {
  const s = splitBody(),
    mat = paint(RUSTED);
  const mesh = (g: THREE.BufferGeometry, name: string): THREE.Mesh => {
    const m = new THREE.Mesh(g, mat);
    m.name = name;
    m.castShadow = m.receiveShadow = true;
    return m;
  };
  const faces = Object.fromEntries(CAB_FACES.map((f) => [f, mesh(s.faces[f], `engine_cab_${f}`)])) as Record<
    CabFace,
    THREE.Mesh
  >;
  const shadow = new THREE.Mesh(s.shell, shadowOnly);
  shadow.name = 'engine_cab_shadow';
  shadow.castShadow = true;
  shadow.visible = false;
  return { body: mesh(s.rest, 'engine_body'), faces, shadow };
}

/** The longer boiler's engine (ring-island-build2, V2), for a train whose row wears boiler 1: its body without the cab
 * (the short body's cab faces stay, so the cutaway still moves them), and the longer boiler with its lashing in `rope`,
 * all in the car's frame. `chimney` is where its steam leaves. The geometry and paint are the kit's (never dispose
 * them). The frame reaches ENGINE_LONG_AHEAD further forward; the cab, drivers and rods are the short engine's. */
export function engineLong(rope: THREE.Material) {
  const body = new THREE.Mesh(splitBody('engine_body_long').rest, paint(RUSTED));
  body.name = 'engine_body_long';
  const boiler = enginePart('engine_boiler_long', false);
  const lashing = new THREE.Mesh(geometry('engine_lashing_long'), rope);
  lashing.name = 'engine_lashing_long';
  body.castShadow = body.receiveShadow = lashing.castShadow = true;
  // The chimney's cap: the middle of the boiler's highest ring of vertices.
  const pos = boiler.geometry.getAttribute('position');
  let top = -Infinity,
    z = 0,
    n = 0;
  for (let i = 0; i < pos.count; i++) top = Math.max(top, pos.getY(i));
  for (let i = 0; i < pos.count; i++)
    if (pos.getY(i) > top - 0.02) {
      z += pos.getZ(i);
      n++;
    }
  return { body, boiler, lashing, chimney: { y: top, z: z / n } };
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

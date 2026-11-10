// The railway's passenger car fittings, from assets/src/passenger-car.py (docs/plans/passenger-car-previz.md, candidate
// Four, the knifeboard): each GLB node baked once to plain float geometry in the flatbed's frame (origin on the rail
// line, deck middle), with its vertex colours, drawn in the kit's own paint (./look.ts). Load before use; no scene,
// loop, world or physics dependency. The seats are registered by ../../entities/railway/train-view.ts.
import * as THREE from 'three/webgpu';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import url from '../../../assets/built/passenger-car.glb?url';
import { paint } from './look.ts';

const kit = await new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).loadAsync(url);
kit.scene.updateMatrixWorld(true);

/** The flatbed's deck top over the rail line (src/proto/wagon/cars.ts TRAILER.top): the recipe's origin is the rail line. */
export const CAR_DECK = 0.7;
/** The bench's seat top over the deck (the track layer's low stool's, seat.ts) and the bench's rider anchors: a rider's
 * capsule centre sits `SEAT_X` from the middle, facing out, at these z along the car. */
export const BENCH = { seatTop: 0.32, seatX: 0.45, z: [-0.85, 0.45] as const };

type CarPart = 'car_fit' | 'car_upgrade';
const baked = new Map<CarPart, THREE.BufferGeometry>();
/** A node's geometry in the car's frame, in metres (meshopt's quantization lives on the node: baked in here). */
function geometry(part: CarPart) {
  let g = baked.get(part);
  if (g) return g;
  const mesh = kit.scene.getObjectByName(part);
  if (!(mesh instanceof THREE.Mesh)) throw new Error(`passenger car kit has no ${part}`);
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

/** The first car's paint, rusting with the train as the engine does; the upgrade arrives new. */
const AGED = { color: '#ffffff', own: true, rough: 0.7, rust: 'train' } as const;
const NEW = { color: '#ffffff', own: true, rough: 0.6 } as const;

/**
 * The passenger car's fittings for one flatbed: a group whose origin is the rail line, so place it at
 * `car.hy - CAR_DECK` in the car's mesh frame. Geometry and paint are the kit's (never dispose them).
 *
 * `upgraded` is the upgrade hook: the roof, posts, lamps and trim (`car_upgrade`). It is built and switched off: no
 * rule turns it on yet, and the fit's repaint (red backs, brass rails) waits with it. Its roof is 2.77 m over the rail
 * line and overhangs the deck to 2.55 m wide, which the upgrade's own plan checks against the halts.
 */
export function passengerCar(upgraded = false) {
  const g = new THREE.Group();
  g.name = 'passenger_car';
  const parts: [CarPart, typeof AGED | typeof NEW][] = [['car_fit', AGED]];
  if (upgraded) parts.push(['car_upgrade', NEW]);
  for (const [part, look] of parts) {
    const m = new THREE.Mesh(geometry(part), paint(look));
    m.name = part;
    m.castShadow = m.receiveShadow = true;
    g.add(m);
  }
  return g;
}

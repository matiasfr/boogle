// What the fall starts on (?proto=fall): a rail that stops in mid-air, a handcar riding it and a deck of cloud that hides
// the island below. Code-built greybox. Local: nobody else sees any of it.
import * as THREE from 'three/webgpu';
import { SPAWN } from '../../constants.ts';
import { groundHeight } from '../../island/heights.ts';
import { cam } from '../../player/player.ts';
import { addPart, mergeParts } from '../../render/props.ts';
import { scene } from '../../render/scene.ts';
import { protoV } from '../flags.ts';

/** Metres from the rail down to the ground. With the player's 20 m/s fall cap: about 3.5, 6 and 10 s in the air. */
const HEIGHTS: Record<string, number> = { '': 120, short: 60, long: 200 };
export const HEIGHT = HEIGHTS[protoV('fall')] ?? HEIGHTS['']!;

// The whole shot lines up with the camera's starting direction: the line runs forward, the sign reads left to right.
export const YAW = cam.yaw;
export const FWD = new THREE.Vector3(-Math.sin(YAW), 0, -Math.cos(YAW));
export const RIGHT = new THREE.Vector3(Math.cos(YAW), 0, -Math.sin(YAW));
export const UP = new THREE.Vector3(0, 1, 0);

/** The middle of the sign, on the ground: where you land. */
export const TARGET = new THREE.Vector3(SPAWN.x, 0, SPAWN.z).addScaledVector(FWD, -3);
TARGET.y = groundHeight(TARGET.x, TARGET.z);

const LANDS_PAST = 2; // m past the rail's end you come down, once the air has braked the roll
export const RAIL_END = TARGET.clone()
  .addScaledVector(FWD, -LANDS_PAST)
  .setY(TARGET.y + HEIGHT);
export const ROLL_DIST = 8.5; // m the handcar rolls before the rail runs out
export const CAR_START = RAIL_END.clone().addScaledVector(FWD, -ROLL_DIST);
export const DECK_Y = TARGET.y + HEIGHT - 32;
export const STAND = { back: -0.55, up: 0.72 }; // where you stand on the handcar, from its middle at rail height: at the front

const RAIL_BACK = 130; // m of rail behind the end: it fades into the fog
const GAUGE = 1.1;
const SLEEPER_GAP = 0.95;
const box = new THREE.BoxGeometry(1, 1, 1);
const m = new THREE.Matrix4();
const q = new THREE.Quaternion();
const p = new THREE.Vector3();
const s = new THREE.Vector3();
function part(
  parts: THREE.BufferGeometry[],
  color: string,
  x: number,
  y: number,
  z: number,
  w: number,
  h: number,
  d: number,
) {
  addPart(parts, box, m.compose(p.set(x, y, z), q.identity(), s.set(w, h, d)), color);
}
const vertexColored = () => new THREE.MeshLambertMaterial({ vertexColors: true });

function buildRail() {
  const steel: THREE.BufferGeometry[] = [];
  for (const side of [-1, 1]) part(steel, '#59616b', (side * GAUGE) / 2, 0.06, RAIL_BACK / 2, 0.11, 0.12, RAIL_BACK);
  const timber: THREE.BufferGeometry[] = [];
  for (let z = 0.35; z < RAIL_BACK; z += SLEEPER_GAP) part(timber, '#7a5a3a', 0, -0.05, z, 1.75, 0.13, 0.32);
  const sleepers = new THREE.Mesh(mergeParts(timber), vertexColored());
  sleepers.castShadow = true;
  const rail = new THREE.Group();
  rail.add(new THREE.Mesh(mergeParts(steel), vertexColored()), sleepers);
  rail.position.copy(RAIL_END);
  rail.rotation.y = YAW; // its local -z is forward, so it runs back along +z from the end
  scene.add(rail);
  return sleepers;
}

/** The handcar: origin at rail height, facing -z. `pump` is the seesaw handle, for rocking. */
function buildCar() {
  const parts: THREE.BufferGeometry[] = [];
  part(parts, '#a9825a', 0, 0.62, 0, 1.7, 0.14, 2.7); // deck
  part(parts, '#5e4630', 0, 0.48, 0, 1.2, 0.14, 2.3); // frame
  part(parts, '#59616b', 0, 1.05, 0.75, 0.16, 0.85, 0.16); // post, behind you
  const body = new THREE.Mesh(mergeParts(parts), vertexColored());
  body.castShadow = true;
  const wheel = new THREE.CylinderGeometry(0.3, 0.3, 0.1, 14).rotateZ(Math.PI / 2);
  const wheelParts: THREE.BufferGeometry[] = [];
  for (const x of [-GAUGE / 2, GAUGE / 2])
    for (const z of [-0.85, 0.85]) addPart(wheelParts, wheel, m.makeTranslation(x, 0.3, z), '#3a3f46');
  const wheels = new THREE.Mesh(mergeParts(wheelParts), vertexColored());
  const pumpParts: THREE.BufferGeometry[] = [];
  part(pumpParts, '#c7513f', 0, 0, 0, 0.1, 0.1, 1.9); // the beam
  for (const z of [-0.95, 0.95]) part(pumpParts, '#c7513f', 0, 0, z, 1, 0.1, 0.1); // its handles
  const pump = new THREE.Mesh(mergeParts(pumpParts), vertexColored());
  pump.position.set(0, 1.5, 0.75);
  const group = new THREE.Group();
  group.add(body, wheels, pump);
  group.position.copy(CAR_START);
  group.rotation.order = 'YXZ';
  group.rotation.y = YAW;
  scene.add(group);
  return { group, pump };
}

/** A flat-shaded puffy deck, one draw call: wide enough that you see no edge of it through the fog. */
function buildDeck() {
  const COUNT = 620,
    R = 430;
  const puff = new THREE.IcosahedronGeometry(1, 3);
  puff.setAttribute('normal', puff.attributes.position!.clone()); // round, so it reads as cloud and not as rock
  const mesh = new THREE.InstancedMesh(
    puff,
    new THREE.MeshLambertMaterial({ color: '#ffffff', emissive: '#e6f0ff', emissiveIntensity: 0.55 }),
    COUNT,
  );
  mesh.frustumCulled = false;
  const puffs: Puff[] = [];
  for (let k = 0; k < COUNT; k++) {
    const a = k * 2.39996, // a sunflower: even cover with no grid to spot
      d = R * Math.sqrt((k + 0.5) / COUNT),
      along = Math.cos(a) * d,
      across = Math.sin(a) * d;
    const puff: Puff = {
      along,
      across,
      chord: Math.sqrt(R * R - across * across), // half the disc's length along the line, here
      y: DECK_Y + (Math.random() - 0.5) * 14,
      r: 18 + Math.random() * 22,
    };
    puffs.push(puff);
    placePuff(mesh, k, puff);
  }
  scene.add(mesh);
  return { mesh, puffs };
}
type Puff = { along: number; across: number; chord: number; y: number; r: number };
function placePuff(mesh: THREE.InstancedMesh, k: number, f: Puff) {
  p.copy(RAIL_END).addScaledVector(FWD, f.along).addScaledVector(RIGHT, f.across).setY(f.y);
  mesh.setMatrixAt(k, m.compose(p, q.identity(), s.set(f.r, f.r * 0.5, f.r)));
  mesh.instanceMatrix.needsUpdate = true;
}

const sleepers = buildRail();
export const car = buildCar();
const deck = buildDeck();
export const deckMesh = deck.mesh;

/** The card's treadmill: the handcar stays put and the world slides back under it, so it's already travelling. `travelled`
 * is metres so far. The rail's steel looks the same anywhere, so only its sleepers move, a sleeper's gap at most. A puff that
 * has gone out the back of the disc comes round to the front. Jump in stops this and rolls the handcar for real, from this speed. */
export function slideWorld(travelled: number) {
  sleepers.position.z = travelled % SLEEPER_GAP;
  deck.mesh.position.copy(FWD).multiplyScalar(-travelled);
  deck.puffs.forEach((f, k) => {
    if (f.along - travelled > -f.chord) return;
    f.along += 2 * f.chord;
    placePuff(deck.mesh, k, f);
  });
}

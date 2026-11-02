// What the fall starts on (?proto=fall): a rail that stops in mid-air, a trolley riding it and a deck of cloud that hides
// the island below. Code-built greybox. Local: nobody else sees any of it.
import * as THREE from 'three/webgpu';
import { defineKind, despawn, spawn } from '../entity/entity.ts';
import { SPAWN } from '../constants.ts';
import { groundHeight } from '../island/heights.ts';
import { cam } from '../player/player.ts';
import { addPart, mergeParts } from '../render/props.ts';

/** Metres from the rail down to the ground: about 7.5 s in the air, at the player's 20 m/s fall cap. It's long because it
 * only happens once, on a first visit, and the title needs room under the cloud to be read. */
export const HEIGHT = 150;

// The whole shot lines up with the camera's starting direction: the line runs forward, the title reads left to right.
export const YAW = cam.yaw;
export const FWD = new THREE.Vector3(-Math.sin(YAW), 0, -Math.cos(YAW));
export const RIGHT = new THREE.Vector3(Math.cos(YAW), 0, -Math.sin(YAW));
export const UP = new THREE.Vector3(0, 1, 0);

/** The spot under the title, on the ground: where you land. */
export const TARGET = new THREE.Vector3(SPAWN.x, 0, SPAWN.z).addScaledVector(FWD, -3);
TARGET.y = groundHeight(TARGET.x, TARGET.z);

const LANDS_PAST = 2; // m past the rail's end you come down, once the air has braked the roll
export const RAIL_END = TARGET.clone()
  .addScaledVector(FWD, -LANDS_PAST)
  .setY(TARGET.y + HEIGHT);
export const ROLL_DIST = 8.5; // m the cart rolls before the rail runs out
export const CAR_START = RAIL_END.clone().addScaledVector(FWD, -ROLL_DIST);
export const DECK_Y = TARGET.y + HEIGHT - 32;
export const STAND = { back: 0, up: 0.69 }; // where you stand on the cart's deck, from its middle at rail height

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
  return { rail, sleepers };
}

/** The cart: a track layer's trolley, origin at rail height, facing -z. Planks on wheels, with a flat open deck, so your
 * whole Buddy shows, feet and hops included. */
function buildCar() {
  const parts: THREE.BufferGeometry[] = [];
  const planks = ['#a9825a', '#9c7650', '#b48c62', '#a07a52', '#ad865d'];
  planks.forEach((c, k) => part(parts, c, -0.72 + k * 0.36, 0.62, 0, 0.34, 0.14, 2.7)); // the deck
  part(parts, '#3a3f46', 0, 0.48, 0, 1.25, 0.14, 2.35); // its iron frame
  for (const z of [-1.42, 1.42]) part(parts, '#3a3f46', 0, 0.5, z, 1.1, 0.16, 0.14); // buffer beams
  const body = new THREE.Mesh(mergeParts(parts), vertexColored());
  body.castShadow = true;
  const wheel = new THREE.CylinderGeometry(0.3, 0.3, 0.1, 14).rotateZ(Math.PI / 2);
  const wheelParts: THREE.BufferGeometry[] = [];
  for (const x of [-GAUGE / 2, GAUGE / 2])
    for (const z of [-0.85, 0.85]) addPart(wheelParts, wheel, m.makeTranslation(x, 0.3, z), '#3a3f46');
  const group = new THREE.Group();
  group.add(body, new THREE.Mesh(mergeParts(wheelParts), vertexColored()));
  group.position.copy(CAR_START);
  group.rotation.order = 'YXZ';
  group.rotation.y = YAW;
  return { group };
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
  return { mesh, puffs };
}
type Puff = { along: number; across: number; chord: number; y: number; r: number };
function placePuff(mesh: THREE.InstancedMesh, k: number, f: Puff) {
  p.copy(RAIL_END).addScaledVector(FWD, f.along).addScaledVector(RIGHT, f.across).setY(f.y);
  mesh.setMatrixAt(k, m.compose(p, q.identity(), s.set(f.r, f.r * 0.5, f.r)));
  mesh.instanceMatrix.needsUpdate = true;
}

// They stand there until the fall has no more use for them; the cart stays where it lands, for the director to clear.
defineKind('fall-prop', {});
function freeMeshes(root: THREE.Object3D) {
  root.traverse((o) => (o as THREE.Mesh).geometry?.dispose());
}
const { rail, sleepers } = buildRail();
const railProp = spawn({ kind: 'fall-prop', mesh: rail, dispose: () => freeMeshes(rail) });
export const car = buildCar();
export const carProp = spawn({ kind: 'fall-prop', mesh: car.group, dispose: () => freeMeshes(car.group) });
const deck = buildDeck();
const deckProp = spawn({
  kind: 'fall-prop',
  mesh: deck.mesh,
  dispose() {
    deck.mesh.geometry.dispose();
    deck.mesh.dispose();
  },
});
/** You've come out of the cloud: it would only hang over the island from here on. */
export const clearDeck = () => despawn(deckProp);
/** You've landed: nobody's going back up. */
export const clearRail = () => despawn(railProp);

/** The card's treadmill: the cart stays put and the world slides back under it, so it's already travelling. `travelled`
 * is metres so far. The rail's steel looks the same anywhere, so only its sleepers move, a sleeper's gap at most. A puff that
 * has gone out the back of the disc comes round to the front. Jump in stops this and rolls the cart for real, from this speed. */
export function slideWorld(travelled: number) {
  sleepers.position.z = travelled % SLEEPER_GAP;
  deck.mesh.position.copy(FWD).multiplyScalar(-travelled);
  deck.puffs.forEach((f, k) => {
    if (f.along - travelled > -f.chord) return;
    f.along += 2 * f.chord;
    placePuff(deck.mesh, k, f);
  });
}

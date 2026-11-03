// The title you smash through: BOOGLE in railway timber, hanging in the sky between the cloud and the ground. Just meshes
// until you hit it; then the letters fall with you, and when you land each gets a physics body and comes down around you. You
// can kick them about until each one shrinks away. Local: each player's own, never sent and never read by the sim, so a
// friend sees you land on nothing.
import * as THREE from 'three/webgpu';
import { fallArrival } from './arrival.ts';
import { defineKind, despawn, spawn, type GameEntity } from '../entity/entity.ts';
import { createBody, setMask, type Body, type Shape } from '../physics/engine.ts';
import { GROUP } from '../physics/physics.ts';
import { emit } from '../render/particles.ts';
import { addPart, mergeParts } from '../render/props.ts';
import { FWD, RIGHT, TARGET, UP } from './stage.ts';

/** How high it hangs: over 2 s of reading it clear of the cloud, and as long again falling with the letters. */
export const TITLE_Y = TARGET.y + 55;

const H = 3.8, // m tall
  W = 2.7, // m wide
  T = 0.66, // plank width
  GAP = 0.8, // m between letters
  DEPTH = 0.3,
  TILT = (66 * Math.PI) / 180, // faced up at you falling on it
  MASS = 9,
  HOLD_OFF_S = 0.7, // the letters leave you alone this long, so they can't shove you where you lie
  LINGER_S = 20, // before the first starts to go
  STAGGER_S = 3, // and the next
  FADE_S = 5;

// Planks in a letter: x0, y0, x1, y1 from its bottom left.
type Plank = [number, number, number, number];
const mid = (H - T) / 2;
const GLYPH: Record<string, Plank[]> = {
  B: [
    [0, 0, T, H],
    [T, H - T, W - 0.25, H],
    [T, mid, W - 0.45, mid + T],
    [T, 0, W, T],
    [W - 0.25 - T, mid + T, W - 0.25, H - T],
    [W - T, T, W, mid],
  ],
  O: [
    [0, 0, T, H],
    [W - T, 0, W, H],
    [T, H - T, W - T, H],
    [T, 0, W - T, T],
  ],
  G: [
    [0, 0, T, H],
    [T, H - T, W, H],
    [T, 0, W, T],
    [W - T, T, W, mid + T],
    [W / 2, mid, W - T, mid + T],
  ],
  L: [
    [0, 0, T, H],
    [T, 0, W, T],
  ],
  E: [
    [0, 0, T, H],
    [T, H - T, W, H],
    [T, mid, W - 0.4, mid + T],
    [T, 0, W, T],
  ],
};
const WORD = 'BOOGLE';
const timber = ['#b98a55', '#a97a48', '#c49660', '#9c6f40'];

const box = new THREE.BoxGeometry(1, 1, 1);
const mat = new THREE.MeshLambertMaterial({ vertexColors: true });
const m4 = new THREE.Matrix4();
const q4 = new THREE.Quaternion();
const p4 = new THREE.Vector3();
const s4 = new THREE.Vector3();
const zAxis = new THREE.Vector3(0, 0, 1);

type Letter = { mesh: THREE.Mesh; shapes: Shape[]; rel: THREE.Vector3; ring: THREE.Vector3; spin: THREE.Quaternion };

defineKind('fall-sign', {});
defineKind('fall-letter', { update: 20 });

function letterOf(ch: string): { geo: THREE.BufferGeometry; shapes: Shape[] } {
  const parts: THREE.BufferGeometry[] = [];
  const shapes: Shape[] = [];
  for (const [x0, y0, x1, y1] of GLYPH[ch]!) {
    const x = (x0 + x1) / 2 - W / 2,
      y = (y0 + y1) / 2 - H / 2;
    const color = timber[Math.floor(Math.random() * timber.length)]!;
    q4.setFromAxisAngle(zAxis, (Math.random() - 0.5) * 0.05); // knocked together by hand
    addPart(parts, box, m4.compose(p4.set(x, y, 0), q4, s4.set(x1 - x0, y1 - y0, DEPTH)), color);
    shapes.push({
      kind: 'box',
      hx: (x1 - x0) / 2,
      hy: (y1 - y0) / 2,
      hz: DEPTH / 2,
      offset: { x, y, z: 0 },
    });
  }
  return { geo: mergeParts(parts), shapes };
}

// The sign's face looks up and back at you: x along the word, y up its lean, z out of its face.
const LEAN = UP.clone().multiplyScalar(Math.cos(TILT)).addScaledVector(FWD, Math.sin(TILT));
const FACE = new THREE.Vector3().crossVectors(RIGHT, LEAN);
const POSE = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(RIGHT, LEAN, FACE));

const letters: Letter[] = [];
const sign = new THREE.Group();
[...WORD].forEach((ch, k) => {
  const along = (k - (WORD.length - 1) / 2) * (W + GAP);
  const foot = TARGET.clone().addScaledVector(RIGHT, along);
  foot.y = TITLE_Y;
  const { geo, shapes } = letterOf(ch);
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.copy(foot).addScaledVector(LEAN, H / 2 + 0.05);
  mesh.quaternion.copy(POSE);
  mesh.castShadow = true;
  sign.add(mesh);
  // Falling with you: a loose ring, the word's order still roughly left to right, and each turning its own way.
  const across = (k - (WORD.length - 1) / 2) * 2.3;
  const ring = RIGHT.clone()
    .multiplyScalar(across)
    .addScaledVector(FWD, 2 + Math.random() * 3)
    .addScaledVector(UP, Math.random() * 3 - 1.5);
  const spin = new THREE.Quaternion().setFromAxisAngle(
    new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize(),
    0.8 + Math.random() * 1.4,
  );
  letters.push({ mesh, shapes, rel: new THREE.Vector3(), ring, spin });
});
const signProp = spawn({ kind: 'fall-sign', mesh: sign });

const DUST = new THREE.Color('#e8d6a6');
const WOOD = new THREE.Color('#a97a48');
/** A burst where you hit: dust out along the ground, splinters up. Also what the cart lands in. */
export function burst(at: THREE.Vector3, dust: number, chips: number) {
  for (let k = 0; k < dust; k++) {
    const a = Math.random() * Math.PI * 2,
      v = 3 + Math.random() * 7;
    emit({
      x: at.x,
      y: at.y + 0.2,
      z: at.z,
      vx: Math.cos(a) * v,
      vy: 0.6 + Math.random() * 2.2,
      vz: Math.sin(a) * v,
      life: 0.6 + Math.random() * 0.6,
      size: 0.45,
      alpha: 0.75,
      color: DUST,
      drag: 3,
      grow: [0.6, 2.4],
      shrink: 0.4,
    });
  }
  for (let k = 0; k < chips; k++) {
    const a = Math.random() * Math.PI * 2,
      v = 2 + Math.random() * 8;
    emit({
      x: at.x,
      y: at.y + 0.3,
      z: at.z,
      vx: Math.cos(a) * v,
      vy: 5 + Math.random() * 8,
      vz: Math.sin(a) * v,
      life: 0.7 + Math.random() * 0.5,
      size: 0.12,
      color: WOOD,
      gravity: 22,
    });
  }
}

/** A letter come to earth: thrown, kickable once it has left you alone a moment, then shrinking away. */
function flyingLetter(l: Letter, body: Body, now: number, k: number): GameEntity {
  const goesAt = now + (LINGER_S + k * STAGGER_S) * 1000,
    goneAt = goesAt + FADE_S * 1000,
    solidAt = now + HOLD_OFF_S * 1000;
  let solid = false;
  const entity: GameEntity = spawn({
    kind: 'fall-letter',
    mesh: l.mesh,
    bodies: [body],
    update({ now }) {
      if (!solid && now > solidAt) {
        solid = true;
        setMask(body, -1); // now you can kick them around
      }
      if (now >= goneAt) return despawn(entity);
      const ip = body.interpolatedPosition;
      l.mesh.position.set(ip.x, ip.y, ip.z);
      l.mesh.quaternion.set(body.quaternion.x, body.quaternion.y, body.quaternion.z, body.quaternion.w);
      l.mesh.scale.setScalar(now > goesAt ? 1 - (now - goesAt) / (FADE_S * 1000) : 1);
    },
    dispose: () => l.mesh.geometry.dispose(),
  });
  return entity;
}

/** You've gone through the title, at `at`. The letters break loose and fall with you. */
export function hitTitle(at: THREE.Vector3) {
  for (const l of letters) l.rel.copy(l.mesh.position).sub(at);
}
const turn = new THREE.Quaternion();
/** Each frame until you land: they drift into a ring around you, tumbling, at your speed. */
export function fallWithYou(at: { x: number; y: number; z: number }, dt: number) {
  const pull = 1 - Math.exp(-dt * 1.7);
  for (const l of letters) {
    l.rel.lerp(l.ring, pull);
    l.mesh.position.set(at.x + l.rel.x, at.y + l.rel.y, at.z + l.rel.z);
    turn.identity().slerp(l.spin, dt);
    l.mesh.quaternion.premultiply(turn);
  }
}

/** You've landed, at `at`: every letter gets a body and comes down around you. */
export function blastLetters(at: THREE.Vector3, now: number) {
  letters.forEach((l, k) => {
    l.mesh.position.y = Math.max(l.mesh.position.y, fallArrival.ground(l.mesh.position.x, l.mesh.position.z) + 1.6);
    const body = createBody({
      mass: MASS,
      group: GROUP.DEFAULT,
      mask: GROUP.SCENERY | GROUP.CAVE, // nothing but the ground for now (HOLD_OFF_S)
      position: { x: l.mesh.position.x, y: l.mesh.position.y, z: l.mesh.position.z },
      rotation: { x: l.mesh.quaternion.x, y: l.mesh.quaternion.y, z: l.mesh.quaternion.z, w: l.mesh.quaternion.w },
      shapes: l.shapes,
      linearDamping: 0.08,
      angularDamping: 0.15,
    });
    const dx = l.mesh.position.x - at.x,
      dz = l.mesh.position.z - at.z,
      d = Math.hypot(dx, dz) || 1;
    // Out from you, and forward, so they crash down where you'll see them when you look up.
    const out = 2.5 + Math.random() * 4,
      ahead = 3 + Math.random() * 4;
    const up = -5 - Math.random() * 5;
    body.velocity.set((dx / d) * out + FWD.x * ahead, up, (dz / d) * out + FWD.z * ahead);
    const spin = () => (Math.random() - 0.5) * 11;
    body.angularVelocity.set(spin(), spin(), spin());
    l.mesh.removeFromParent(); // spawn parents it to the scene; it's posed in the world already, as the sign has no offset
    flyingLetter(l, body, now, k);
  });
  despawn(signProp);
}

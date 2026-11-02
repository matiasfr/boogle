// The sign you land in (?proto=fall): BOOGLE in railway timber, half built and leaning on posts where you fall. Just meshes
// until you hit it, then a physics body per letter, flung out from the impact; you can kick them around until each one
// shrinks away. Local: each player's own, never sent and never read by the sim, so a friend sees you land on nothing.
import * as THREE from 'three/webgpu';
import { groundHeight } from '../../island/heights.ts';
import { addBody, createBody, removeBody, setMask, type Body, type Shape } from '../../physics/engine.ts';
import { GROUP } from '../../physics/physics.ts';
import { emit } from '../../render/particles.ts';
import { addPart, mergeParts } from '../../render/props.ts';
import { scene } from '../../render/scene.ts';
import { FWD, RIGHT, TARGET, UP } from './stage.ts';

const H = 3.8, // m tall
  W = 2.7, // m wide
  T = 0.66, // plank width
  GAP = 0.8, // m between letters
  DEPTH = 0.3,
  TILT = (48 * Math.PI) / 180, // leaning back, so it reads from the sky as well as from the ground
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

type Letter = { mesh: THREE.Mesh; shapes: Shape[]; body: Body | null; goesAt: number; goneAt: number };

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
const postParts: THREE.BufferGeometry[] = [];
[...WORD].forEach((ch, k) => {
  const along = (k - (WORD.length - 1) / 2) * (W + GAP);
  const foot = TARGET.clone().addScaledVector(RIGHT, along);
  foot.y = groundHeight(foot.x, foot.z);
  const { geo, shapes } = letterOf(ch);
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.copy(foot).addScaledVector(LEAN, H / 2 + 0.05);
  mesh.quaternion.copy(POSE);
  mesh.castShadow = true;
  scene.add(mesh);
  letters.push({ mesh, shapes, body: null, goesAt: 0, goneAt: 0 });
  // A post holding it up from behind.
  const height = H * 0.62 * Math.cos(TILT);
  const post = foot.clone().addScaledVector(FWD, H * 0.62 * Math.sin(TILT) + DEPTH);
  addPart(
    postParts,
    box,
    m4.compose(p4.set(post.x, post.y + height / 2, post.z), q4.identity(), s4.set(0.28, height, 0.28)),
    '#7a5a3a',
  );
});
const posts = new THREE.Mesh(mergeParts(postParts), mat);
posts.castShadow = true;
scene.add(posts);

const DUST = new THREE.Color('#e8d6a6');
const WOOD = new THREE.Color('#a97a48');
/** A burst where you hit: dust out along the ground, splinters up. Also what the handcar lands in. */
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

let blasted = -1,
  solid = false;
/** You hit it, at `at`: every letter gets a body and leaves. */
export function blastLetters(at: THREE.Vector3, now: number) {
  blasted = now;
  posts.visible = false;
  letters.forEach((l, k) => {
    const body = createBody({
      mass: MASS,
      group: GROUP.DEFAULT,
      mask: GROUP.SCENERY | GROUP.CAVE, // nothing but the ground for now (HOLD_OFF_S)
      position: { x: l.mesh.position.x, y: l.mesh.position.y, z: l.mesh.position.z },
      rotation: { x: POSE.x, y: POSE.y, z: POSE.z, w: POSE.w },
      shapes: l.shapes,
      linearDamping: 0.08,
      angularDamping: 0.15,
    });
    addBody(body);
    const dx = l.mesh.position.x - at.x,
      dz = l.mesh.position.z - at.z,
      d = Math.hypot(dx, dz) || 1;
    // Out from you, and forward, so they tumble down where you'll see them when you look up.
    const out = 2.5 + Math.random() * 4,
      ahead = 3 + Math.random() * 4;
    body.velocity.set((dx / d) * out + FWD.x * ahead, 6 + Math.random() * 5, (dz / d) * out + FWD.z * ahead);
    const spin = () => (Math.random() - 0.5) * 11;
    body.angularVelocity.set(spin(), spin(), spin());
    l.body = body;
    l.goesAt = now + (LINGER_S + k * STAGGER_S) * 1000;
    l.goneAt = l.goesAt + FADE_S * 1000;
  });
}

export function updateLetters(now: number) {
  if (blasted < 0) return;
  const solidNow = !solid && now - blasted > HOLD_OFF_S * 1000;
  if (solidNow) solid = true;
  for (let k = letters.length - 1; k >= 0; k--) {
    const l = letters[k]!;
    const b = l.body!;
    if (solidNow) setMask(b, -1); // now you can kick them around
    if (now >= l.goneAt) {
      removeBody(b);
      scene.remove(l.mesh);
      l.mesh.geometry.dispose();
      letters.splice(k, 1);
      continue;
    }
    const ip = b.interpolatedPosition;
    l.mesh.position.set(ip.x, ip.y, ip.z);
    l.mesh.quaternion.set(b.quaternion.x, b.quaternion.y, b.quaternion.z, b.quaternion.w);
    l.mesh.scale.setScalar(now > l.goesAt ? 1 - (now - l.goesAt) / (FADE_S * 1000) : 1);
  }
}

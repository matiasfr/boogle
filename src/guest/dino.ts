// The dino, who waits just outside the wine cellar's cave mouth on the north cliff, beside the timber frame, looking
// out at whoever walks up the trench. He hops and says a word when you talk to him. Until this browser has the guest
// engine and the ROM he is built from primitives in the island's flat-shaded style; with both he is the engine's model,
// idling// and blinking (showRealDino).
import * as THREE from 'three';
import { addPart, mergeParts } from '../render/props.ts';
import { scene, toScreen } from '../render/scene.ts';
import { groundHeight } from '../adapters/terrain.ts';
import { NODES } from '../pois/caves/network.ts';
import { getSim } from './engine.ts';
import type { Sim } from './engine.ts';
import type { RomPieces } from './rom.ts';
import type { ModelMesh } from './model.ts';
import { getAtlas, createModelMesh, updateModelMesh } from './model.ts';

const MOUTH = NODES.north; // the tunnel into the wine cellar
const OUT = Math.hypot(...MOUTH.out);
const [OX, OZ] = [MOUTH.out[0] / OUT, MOUTH.out[1] / OUT];
const AHEAD = 2.5, // metres out of the mouth, along the trench
  ASIDE = 2.2; // metres to the right (looking out), clear of the doorway
type Real = { mesh: ModelMesh; sim: Sim; frame: number; drawnAt: number; blinkAt: number };
export const dino = {
  group: null as THREE.Group | null,
  pos: new THREE.Vector3(MOUTH.x + OX * AHEAD - OZ * ASIDE, MOUTH.y, MOUTH.z + OZ * AHEAD + OX * ASIDE),
  head: new THREE.Vector3(),
  hopAt: -1e9,
  bubble: null as HTMLDivElement | null,
  bubbleUntil: 0,
  height: 1.3, // metres, for his head and word bubble
  real: null as Real | null, // once he is the game's model
};
const DRAW_MS = 1000 / 30; // the game's animation rate
const DRAW_NEAR = 90; // metres from the camera; further off he holds his pose

const GREEN = '#46b83a',
  WHITE = '#f6f3e8',
  RED = '#d93226',
  ORANGE = '#ec6a25',
  DARK = '#16202a';

function build() {
  const parts: THREE.BufferGeometry[] = [];
  const m = new THREE.Matrix4(),
    q = new THREE.Quaternion(),
    e = new THREE.Euler();
  const ball = new THREE.SphereGeometry(1, 14, 10),
    cone = new THREE.ConeGeometry(1, 1, 8);
  type V = [number, number, number];
  const put = (
    geo: THREE.BufferGeometry,
    color: string,
    [x, y, z]: V,
    [sx, sy, sz]: V,
    [rx, ry, rz]: V = [0, 0, 0],
  ) => {
    m.compose(new THREE.Vector3(x, y, z), q.setFromEuler(e.set(rx, ry, rz)), new THREE.Vector3(sx, sy, sz));
    addPart(parts, geo, m, color);
  };
  for (const s of [-1, 1]) {
    put(ball, ORANGE, [s * 0.15, 0.09, 0.07], [0.12, 0.09, 0.19]); // shoes
    put(ball, GREEN, [s * 0.15, 0.24, -0.02], [0.11, 0.14, 0.11]); // thighs
    put(ball, GREEN, [s * 0.27, 0.58, 0.1], [0.07, 0.11, 0.07], [0.5, 0, s * 0.4]); // arms
    put(ball, WHITE, [s * 0.085, 1.2, 0.13], [0.075, 0.12, 0.065]); // eyes
    put(ball, DARK, [s * 0.075, 1.2, 0.19], [0.032, 0.055, 0.02]);
    put(ball, DARK, [s * 0.05, 0.99, 0.5], [0.018, 0.026, 0.012]); // nostrils
    put(ball, WHITE, [s * 0.2, 0.62, -0.12], [0.06, 0.05, 0.1]); // saddle rim
  }
  put(ball, GREEN, [0, 0.47, 0], [0.29, 0.33, 0.27]); // body
  put(ball, WHITE, [0, 0.44, 0.11], [0.21, 0.26, 0.19]); // belly
  put(ball, RED, [0, 0.66, -0.12], [0.22, 0.09, 0.2]); // saddle
  put(ball, GREEN, [0, 0.8, 0.04], [0.14, 0.2, 0.14]); // neck
  put(ball, GREEN, [0, 1.0, 0.07], [0.21, 0.2, 0.2]); // head
  put(ball, GREEN, [0, 0.95, 0.32], [0.19, 0.16, 0.21]); // nose
  put(ball, WHITE, [0, 0.85, 0.22], [0.17, 0.09, 0.17]); // chin
  put(cone, GREEN, [0, 0.3, -0.33], [0.1, 0.35, 0.1], [-1.9, 0, 0]); // tail
  put(cone, RED, [0, 1.13, -0.1], [0.06, 0.12, 0.06], [-0.6, 0, 0]); // spikes
  put(cone, RED, [0, 1.0, -0.18], [0.06, 0.12, 0.06], [-1.1, 0, 0]);
  put(cone, RED, [0, 0.85, -0.17], [0.05, 0.1, 0.05], [-1.5, 0, 0]);

  const mesh = new THREE.Mesh(
    mergeParts(parts),
    new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.65 }),
  );
  mesh.castShadow = mesh.receiveShadow = true;
  const group = new THREE.Group();
  group.add(mesh);
  dino.pos.y = groundHeight(dino.pos.x, dino.pos.z);
  dino.head.copy(dino.pos).setY(dino.pos.y + dino.height - 0.15);
  group.position.copy(dino.pos);
  group.rotation.y = Math.atan2(OX, OZ); // facing out of the cave
  scene.add(group);
  dino.group = group;
  return group;
}

function bubble() {
  const el = document.createElement('div');
  el.className = 'dino-bubble';
  el.hidden = true;
  document.querySelector('.hud')?.append(el);
  return el;
}

// A word over his head for a moment.
export function dinoSays(text: string, ms = 2600) {
  const b = (dino.bubble ??= bubble());
  b.textContent = text;
  b.hidden = false;
  dino.bubbleUntil = performance.now() + ms;
  dino.hopAt = performance.now();
}

// Swaps in the engine's dino, drawn with the ROM's textures (src/guest/rom.ts data).
export async function showRealDino(rom: RomPieces) {
  if (dino.real) return;
  const sim = await getSim();
  getAtlas(rom.textures);
  if (dino.real) return;
  const group = dino.group ?? build();
  const mesh = createModelMesh();
  group.children[0].visible = false;
  group.add(mesh);
  dino.real = { mesh, sim, frame: 0, drawnAt: -1e9, blinkAt: 0 };
  dino.height = 2.1;
  dino.head.y = dino.pos.y + dino.height - 0.2;
}

function drawReal(camera: THREE.Camera, now: number, r: Real) {
  if (now - r.drawnAt < DRAW_MS || camera.position.distanceTo(dino.pos) > DRAW_NEAR) return;
  r.drawnAt = now;
  r.frame++;
  if (now > r.blinkAt + 150) r.blinkAt = now + 1500 + Math.random() * 3500;
  r.sim.renderDino(0, r.frame, now > r.blinkAt);
  updateModelMesh(r.mesh, r.sim.verts, r.sim.vertexCount());
}

const over = new THREE.Vector3(),
  px = { x: 0, y: 0, behind: false };
export function updateDino(camera: THREE.Camera, now: number) {
  const group = dino.group ?? build();
  const t = (now - dino.hopAt) / 1000;
  group.position.y = dino.pos.y + (t < 0.5 ? Math.sin((t / 0.5) * Math.PI) * 0.35 : 0);
  if (dino.real) drawReal(camera, now, dino.real);
  else group.children[0].scale.y = 1 + Math.sin(now / 420) * 0.015; // breathing
  const b = dino.bubble;
  if (!b || b.hidden) return;
  if (now > dino.bubbleUntil) {
    b.hidden = true;
    return;
  }
  toScreen(over.copy(dino.head).setY(group.position.y + dino.height + 1.0), px);
  const mx = innerWidth * 0.05,
    my = innerHeight * 0.05;
  const on = !px.behind && px.x > -mx && px.x < innerWidth + mx && px.y > -my && px.y < innerHeight + my;
  b.style.visibility = on ? 'visible' : 'hidden';
  b.style.transform = `translate(${px.x.toFixed(1)}px, ${px.y.toFixed(1)}px)`;
}

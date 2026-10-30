// Yoshi, who waits just outside the wine cellar's cave mouth on the north cliff, beside the timber frame, looking out
// at whoever walks up the trench. He hops and says a word when you talk to him. Until this browser has a Super Mario
// 64 ROM he is built from primitives in the island's flat-shaded style; with one he is the game's own Yoshi, idling
// and blinking (showRealYoshi).
import * as THREE from 'three';
import { addPart, mergeParts } from '../render/props.js';
import { scene } from '../render/scene.js';
import { groundHeight } from '../adapters/terrain.js';
import { NODES } from '../pois/caves/network.js';
import { getSim } from './sim.js';
import { getAtlas, createModelMesh, updateModelMesh } from './model.js';

const MOUTH = NODES.north; // the tunnel into the wine cellar
const OUT = Math.hypot(...MOUTH.out);
const [OX, OZ] = [MOUTH.out[0] / OUT, MOUTH.out[1] / OUT];
const AHEAD = 2.5, // metres out of the mouth, along the trench
  ASIDE = 2.2; // metres to the right (looking out), clear of the doorway
export const yoshi = {
  group: null,
  pos: new THREE.Vector3(MOUTH.x + OX * AHEAD - OZ * ASIDE, MOUTH.y, MOUTH.z + OZ * AHEAD + OX * ASIDE),
  head: new THREE.Vector3(),
  hopAt: -1e9,
  bubble: null,
  bubbleUntil: 0,
  height: 1.3, // metres, for his head and word bubble
  real: null, // { mesh, sim, frame, drawnAt, blinkAt } once he is the game's model
};
const DRAW_MS = 1000 / 30; // the game's animation rate
const DRAW_NEAR = 90; // metres from the camera; further off he holds his pose

const GREEN = '#46b83a',
  WHITE = '#f6f3e8',
  RED = '#d93226',
  ORANGE = '#ec6a25',
  DARK = '#16202a';

function build() {
  const parts = [];
  const m = new THREE.Matrix4(),
    q = new THREE.Quaternion(),
    e = new THREE.Euler();
  const ball = new THREE.SphereGeometry(1, 14, 10),
    cone = new THREE.ConeGeometry(1, 1, 8);
  const put = (geo, color, [x, y, z], [sx, sy, sz], [rx, ry, rz] = [0, 0, 0]) => {
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
  yoshi.pos.y = groundHeight(yoshi.pos.x, yoshi.pos.z);
  yoshi.head.copy(yoshi.pos).setY(yoshi.pos.y + yoshi.height - 0.15);
  group.position.copy(yoshi.pos);
  group.rotation.y = Math.atan2(OX, OZ); // facing out of the cave
  scene.add(group);
  yoshi.group = group;
}

function bubble() {
  const el = document.createElement('div');
  el.className = 'yoshi-bubble';
  el.hidden = true;
  document.querySelector('.hud')?.append(el);
  return el;
}

// A word over his head for a moment.
export function yoshiSays(text, ms = 2600) {
  yoshi.bubble ??= bubble();
  yoshi.bubble.textContent = text;
  yoshi.bubble.hidden = false;
  yoshi.bubbleUntil = performance.now() + ms;
  yoshi.hopAt = performance.now();
}

// Swaps in the game's Yoshi, drawn by sm64.wasm with the ROM's textures (src/mario/rom.js data).
export async function showRealYoshi(rom) {
  if (yoshi.real) return;
  const sim = await getSim();
  getAtlas(rom.textures);
  if (yoshi.real) return;
  if (!yoshi.group) build();
  const mesh = createModelMesh();
  yoshi.group.children[0].visible = false;
  yoshi.group.add(mesh);
  yoshi.real = { mesh, sim, frame: 0, drawnAt: -1e9, blinkAt: 0 };
  yoshi.height = 2.1;
  yoshi.head.y = yoshi.pos.y + yoshi.height - 0.2;
}

function drawReal(camera, now) {
  const r = yoshi.real;
  if (now - r.drawnAt < DRAW_MS || camera.position.distanceTo(yoshi.pos) > DRAW_NEAR) return;
  r.drawnAt = now;
  r.frame++;
  if (now > r.blinkAt + 150) r.blinkAt = now + 1500 + Math.random() * 3500;
  r.sim.renderYoshi(0, r.frame, now > r.blinkAt);
  updateModelMesh(r.mesh, r.sim.verts, r.sim.vertexCount());
}

const ndc = new THREE.Vector3();
export function updateYoshi(camera, now) {
  if (!yoshi.group) build();
  const t = (now - yoshi.hopAt) / 1000;
  yoshi.group.position.y = yoshi.pos.y + (t < 0.5 ? Math.sin((t / 0.5) * Math.PI) * 0.35 : 0);
  if (yoshi.real) drawReal(camera, now);
  else yoshi.group.children[0].scale.y = 1 + Math.sin(now / 420) * 0.015; // breathing
  const b = yoshi.bubble;
  if (!b || b.hidden) return;
  if (now > yoshi.bubbleUntil) {
    b.hidden = true;
    return;
  }
  ndc
    .copy(yoshi.head)
    .setY(yoshi.group.position.y + yoshi.height + 1.0)
    .project(camera);
  const on = ndc.z < 1 && Math.abs(ndc.x) < 1.1 && Math.abs(ndc.y) < 1.1;
  b.style.visibility = on ? 'visible' : 'hidden';
  b.style.transform = `translate(${((ndc.x * 0.5 + 0.5) * innerWidth).toFixed(1)}px, ${((-ndc.y * 0.5 + 0.5) * innerHeight).toFixed(1)}px)`;
}

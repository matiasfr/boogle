// The haul wave's places and water (?proto=haul&v=wave, ./wave.ts): the sandbar off the home beach (a walkable
// overlay: a static heightfield body and a sand mesh over the sea, so the island's own terrain is untouched), the
// awash spit that leads out to it, the high-water stakes on the beach, and the wave itself (a long swell that rises
// on the horizon, then a surge that runs up to the stakes and drains back). Local and cosmetic: ./wave.ts decides when.
import * as THREE from 'three/webgpu';
import { scene } from '../../render/scene.ts';
import { createBody, addBody, material } from '../../physics/engine.ts';
import { GROUP } from '../../physics/physics.ts';
import { groundHeight } from '../../adapters/terrain.ts';

// The places, in world metres (+z is south, out to sea from the court's beach).
export const BAR = { x: 3, z: 71, ax: 14, az: 5, top: 0.55 }; // an ellipse of dry sand
export const SPIT = { x0: 1, z0: 41, x1: 3, z1: 66.5, half: 1.6, top: 0.06 }; // awash: you wade out along it
export const LINE = 36; // z of the high-water line: the surge runs up to here, and north of it you're safe
export const SEAWARD = BAR.z + BAR.az + 2; // z where the crest meets the bar
export const BAND = { x0: -40, x1: 46 }; // x the wave covers (the whole south beach)

const smooth = (a: number, b: number, v: number) => {
  const t = Math.min(1, Math.max(0, (v - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
/** The overlay's surface at (x, z), metres: -9 where there is none. */
export function sandAt(x: number, z: number): number {
  const e = Math.hypot((x - BAR.x) / BAR.ax, (z - BAR.z) / BAR.az);
  const bar = e < 1 ? BAR.top - 0.35 * e * e : BAR.top - 0.35 - 7 * (e - 1);
  // distance to the spit's centre line
  const dx = SPIT.x1 - SPIT.x0,
    dz = SPIT.z1 - SPIT.z0;
  const s = Math.min(1, Math.max(0, ((x - SPIT.x0) * dx + (z - SPIT.z0) * dz) / (dx * dx + dz * dz)));
  const d = Math.hypot(x - SPIT.x0 - s * dx, z - SPIT.z0 - s * dz);
  const spit = d < SPIT.half ? SPIT.top - 0.08 * (d / SPIT.half) ** 2 : SPIT.top - 0.08 - 2.5 * (d - SPIT.half);
  return Math.max(-9, bar, spit);
}
/** Wading: on the spit, ankle-deep (the bar's dry top and the beach are not). */
export const awash = (x: number, z: number) => {
  const h = sandAt(x, z);
  return h > -0.4 && h < 0.2 && h > groundHeight(x, z);
};

// ---------------------------------------------------------------- the sandbar: a static heightfield and its mesh
const CELL = 0.5;
const X0 = BAR.x - BAR.ax - 3,
  X1 = BAR.x + BAR.ax + 3,
  Z0 = SPIT.z0 - 1, // north edge
  Z1 = BAR.z + BAR.az + 3; // south edge
const NX = Math.round((X1 - X0) / CELL),
  NZ = Math.round((Z1 - Z0) / CELL);
const heights: number[][] = [];
for (let i = 0; i <= NX; i++) {
  const col: number[] = [];
  for (let j = 0; j <= NZ; j++)
    col.push(i === 0 || j === 0 || i === NX || j === NZ ? -9 : sandAt(X0 + i * CELL, Z1 - j * CELL));
  heights.push(col);
}
addBody(
  createBody({
    material: material('sandbar', { friction: 1, restitution: 0.2 }),
    group: GROUP.SCENERY,
    position: { x: X0, y: 0, z: Z1 },
    shapes: [{ kind: 'heightfield', heights, cell: CELL }],
  }),
);

const WET = new THREE.Color('#c9ad78'),
  DRY = new THREE.Color('#f2dca4'),
  c = new THREE.Color();
function sandMesh() {
  const pos: number[] = [],
    col: number[] = [];
  const vert = (i: number, j: number) => {
    const h = heights[i][j];
    pos.push(X0 + i * CELL, h, Z1 - j * CELL);
    c.copy(WET).lerp(DRY, smooth(0.08, 0.4, h));
    col.push(c.r, c.g, c.b);
  };
  for (let i = 0; i < NX; i++)
    for (let j = 0; j < NZ; j++) {
      const hs = [heights[i][j], heights[i + 1][j], heights[i][j + 1], heights[i + 1][j + 1]];
      if (Math.max(...hs) < -1.2) continue; // deep under the sea: nobody sees it
      vert(i, j);
      vert(i + 1, j);
      vert(i, j + 1);
      vert(i + 1, j);
      vert(i + 1, j + 1);
      vert(i, j + 1);
    }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.computeVertexNormals();
  const m = new THREE.Mesh(
    g,
    new THREE.MeshStandardNodeMaterial({ vertexColors: true, flatShading: true, roughness: 0.95 }),
  );
  m.receiveShadow = true;
  return m;
}
scene.add(sandMesh());

// ---------------------------------------------------------------- the high-water stakes and the bundles' poles
const stakeMat = new THREE.MeshStandardNodeMaterial({ vertexColors: true, roughness: 0.8 });
function stakes() {
  const g = new THREE.BoxGeometry(0.12, 1, 0.12).translate(0, 0.5, 0);
  const n = Math.floor((BAND.x1 - BAND.x0) / 3) + 1;
  const mesh = new THREE.InstancedMesh(g, stakeMat, n * 2);
  mesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(n * 6), 3);
  const m4 = new THREE.Matrix4(),
    white = new THREE.Color('#f6efe2'),
    red = new THREE.Color('#e0503f');
  let k = 0;
  for (let x = BAND.x0; x <= BAND.x1; x += 3) {
    const y = groundHeight(x, LINE);
    if (y < 0.1) continue; // under the sea there
    const h = 0.9 + (k % 4 === 0 ? 0.4 : 0);
    mesh.setMatrixAt(k, m4.makeScale(1, h, 1).setPosition(x, y - 0.1, LINE));
    mesh.setColorAt(k++, white);
    mesh.setMatrixAt(k, m4.makeScale(1.25, 0.25, 1.25).setPosition(x, y - 0.1 + h * 0.75, LINE)); // a red band
    mesh.setColorAt(k++, red);
  }
  mesh.count = k;
  mesh.castShadow = true;
  scene.add(mesh);
}
stakes();

/** A tall pole with a yellow pennant over each sandbar bundle, so the beach can see where the logs are. */
export function bundlePole(x: number, z: number) {
  const y = sandAt(x, z);
  const pole = new THREE.Mesh(
    new THREE.CylinderGeometry(0.05, 0.06, 3, 6).translate(0, 1.5, 0),
    new THREE.MeshStandardNodeMaterial({ color: '#7a5534', roughness: 0.9 }),
  );
  const pennant = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(0, 2.95, 0),
    new THREE.Vector3(0, 2.35, 0),
    new THREE.Vector3(0.9, 2.65, 0),
  ]);
  pennant.computeVertexNormals();
  const flag = new THREE.Mesh(
    pennant,
    new THREE.MeshStandardNodeMaterial({ color: '#ffc23d', roughness: 0.7, side: THREE.DoubleSide }),
  );
  const g = new THREE.Group();
  g.add(pole, flag);
  g.position.set(x - 0.9, y, z - 0.6);
  scene.add(g);
  return flag;
}

// ---------------------------------------------------------------- the wave
// The swell: one long ridge across the bay, its face toward the shore (-z). A profile (z, y), front first, swept along
// x with a little wobble so the crest isn't ruler-straight; then scaled by height each frame.
const PROFILE: [number, number, string][] = [
  [-1.9, -0.4, '#17748f'],
  [-1.55, 0.2, '#1f8aa6'],
  [-1.25, 0.55, '#33a6bd'],
  [-0.95, 0.86, '#78d3da'],
  [-0.8, 1.03, '#e6fafa'], // the lip leans a little over the face
  [-0.3, 1.1, '#ffffff'],
  [0.3, 1.0, '#d3f3f3'],
  [1.2, 0.75, '#56c0cd'],
  [3, 0.4, '#2c9fb9'],
  [6, 0.1, '#2593af'],
  [10, -0.4, '#2391ad'],
];
const WIDTH = BAND.x1 - BAND.x0 + 60,
  SEG = 90;
function swellGeometry() {
  const pos: number[] = [],
    col: number[] = [];
  const cc = PROFILE.map(([, , h]) => new THREE.Color(h));
  for (let s = 0; s <= SEG; s++) {
    const x = -WIDTH / 2 + (WIDTH * s) / SEG;
    const wob = Math.sin(x * 0.11) * 0.6 + Math.sin(x * 0.037 + 1) * 1.2; // m the crest leads or lags
    const tall = 1 + 0.12 * Math.sin(x * 0.07 + 2);
    PROFILE.forEach(([z, y], k) => {
      pos.push(x, y * tall, z + wob);
      col.push(cc[k].r, cc[k].g, cc[k].b);
    });
  }
  const idx: number[] = [];
  const P = PROFILE.length;
  for (let s = 0; s < SEG; s++)
    for (let k = 0; k < P - 1; k++) {
      const a = s * P + k,
        b = a + P;
      idx.push(a, a + 1, b, b, a + 1, b + 1);
    }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}
export const swell = new THREE.Mesh(
  swellGeometry(),
  new THREE.MeshStandardNodeMaterial({ vertexColors: true, roughness: 0.5, side: THREE.DoubleSide }),
);
swell.position.x = (BAND.x0 + BAND.x1) / 2;
swell.visible = false;
swell.frustumCulled = false;
scene.add(swell);

// The surge's sheet: shallow, foamy water over everything behind the front, drawn as one flat plane that follows it.
export const sheet = new THREE.Mesh(
  new THREE.PlaneGeometry(WIDTH, 36).rotateX(-Math.PI / 2).translate(0, 0, 18),
  new THREE.MeshStandardNodeMaterial({
    color: '#bdf0ea',
    roughness: 0.3,
    transparent: true,
    opacity: 0.45,
    depthWrite: false,
  }),
);
sheet.position.x = swell.position.x;
sheet.visible = false;
sheet.renderOrder = 2;
scene.add(sheet);

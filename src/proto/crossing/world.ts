// The crossing's place (?proto=crossing), greybox: the viaduct and its walkway, the two stations, the far island you
// can see from the start, and a few things in the sea to measure scale by. Repeated parts are instanced. Nothing here
// casts a shadow (the sun's shadow box only covers the player's surroundings), and only the deck and the two stations
// collide. Sea-crossings research, points 2 and 10: the destination stays in view, as a cheap silhouette.
import * as THREE from 'three/webgpu';
import { scene } from '../../render/scene.ts';
import { addBody, createBody, type Shape } from '../../physics/engine.ts';
import { GROUP, groundMat } from '../../physics/physics.ts';
import { mulberry32 } from '../../sim/rng.ts';
import { LENGTH, LOW, ORIGIN, STOP_A, STOP_B, WALK, lineAt, railY, type LinePoint } from './line.ts';

const FLAT = (color: string) => new THREE.MeshStandardNodeMaterial({ color, roughness: 0.95, flatShading: true });
const P: LinePoint = { x: 0, z: 0, ux: 0, uz: 1 };
const pose = new THREE.Object3D();

function addStatic(shape: Shape, position: { x: number; y: number; z: number }, rotation?: THREE.Quaternion) {
  addBody(
    createBody({
      material: groundMat,
      group: GROUP.SCENERY,
      position,
      ...(rotation ? { rotation: { x: rotation.x, y: rotation.y, z: rotation.z, w: rotation.w } } : {}),
      shapes: [shape],
    }),
  );
}

// ---------------------------------------------------------------- the viaduct's deck: one ribbon, one collider
// Each band is a strip along the line between two points of the cross-section [lateral, height over the rails].
type Band = { a: [number, number]; b: [number, number]; color: string };
const BED = '#5d5a55',
  WALKWAY = '#b9ad98',
  SIDE = '#8f8c86',
  RAIL = '#2e2f35';
const railBands = (c: number): Band[] => [
  { a: [c - 0.06, 0], b: [c - 0.06, 0.15], color: RAIL },
  { a: [c - 0.06, 0.15], b: [c + 0.06, 0.15], color: RAIL },
  { a: [c + 0.06, 0.15], b: [c + 0.06, 0], color: RAIL },
];
const BANDS: Band[] = [
  { a: [-1.6, 0], b: [WALK.in, 0], color: BED },
  { a: [WALK.in, 0], b: [WALK.in, WALK.up], color: SIDE },
  { a: [WALK.in, WALK.up], b: [WALK.out, WALK.up], color: WALKWAY },
  { a: [WALK.out, WALK.up], b: [WALK.out, -0.8], color: SIDE },
  { a: [WALK.out, -0.8], b: [-1.6, -0.8], color: SIDE },
  { a: [-1.6, -0.8], b: [-1.6, 0], color: SIDE },
  ...railBands(-0.5),
  ...railBands(0.5),
];
const DECK_STEP = LENGTH > 2000 ? 8 : 5;
const lateral = (l: number, h: number, s: number, out: number[]) => {
  lineAt(s, P);
  // the lateral axis: the line's direction turned a quarter, west when the line runs south
  out.push(P.x - P.uz * l, railY(s) + h, P.z + P.ux * l);
};

function buildDeck() {
  const sections = Math.ceil(LENGTH / DECK_STEP);
  const pos: number[] = [],
    col: number[] = [],
    c = new THREE.Color();
  for (const band of BANDS) {
    c.set(band.color);
    for (let k = 0; k < sections; k++) {
      const s0 = (k * LENGTH) / sections,
        s1 = ((k + 1) * LENGTH) / sections;
      const q: number[] = [];
      lateral(band.a[0], band.a[1], s0, q);
      lateral(band.b[0], band.b[1], s0, q);
      lateral(band.b[0], band.b[1], s1, q);
      lateral(band.a[0], band.a[1], s1, q);
      for (const v of [0, 1, 2, 0, 2, 3]) {
        pos.push(q[v * 3]!, q[v * 3 + 1]!, q[v * 3 + 2]!);
        col.push(c.r, c.g, c.b);
      }
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  geo.computeVertexNormals();
  const mesh = new THREE.Mesh(
    geo,
    new THREE.MeshStandardNodeMaterial({ vertexColors: true, roughness: 0.95, side: THREE.DoubleSide }),
  );
  mesh.receiveShadow = true;
  scene.add(mesh);

  // The collider: the bed, the step up and the walkway. No rails: they're drawn only, and you'd snag on them.
  const verts: number[] = [],
    indices: number[] = [];
  const profile: [number, number][] = [
    [-1.6, 0],
    [WALK.in, 0],
    [WALK.in, WALK.up],
    [WALK.out, WALK.up],
  ];
  for (let k = 0; k <= sections; k++) {
    const s = (k * LENGTH) / sections;
    for (const [l, h] of profile) lateral(l, h, s, verts);
  }
  const w = profile.length;
  for (let k = 0; k < sections; k++)
    for (let m = 0; m < w - 1; m++) {
      const i0 = k * w + m,
        i1 = i0 + 1,
        i2 = i0 + w,
        i3 = i2 + 1;
      indices.push(i0, i1, i3, i0, i3, i2);
    }
  addStatic({ kind: 'trimesh', vertices: verts, indices }, { x: 0, y: 0, z: 0 });
}

// ---------------------------------------------------------------- repeated parts along the line
function along(
  geo: THREE.BufferGeometry,
  color: string,
  every: number,
  place: (s: number, o: THREE.Object3D) => void,
  from = 0,
  to = LENGTH,
) {
  const n = Math.floor((to - from) / every);
  const mesh = new THREE.InstancedMesh(geo, new THREE.MeshStandardNodeMaterial({ color, roughness: 0.9 }), n);
  for (let k = 0; k < n; k++) {
    const s = from + (k + 0.5) * every;
    lineAt(s, P);
    pose.position.set(P.x, railY(s), P.z);
    pose.rotation.set(0, Math.atan2(P.ux, P.uz), 0);
    pose.scale.setScalar(1);
    place(s, pose);
    pose.updateMatrix();
    mesh.setMatrixAt(k, pose.matrix);
  }
  mesh.frustumCulled = false; // the whole line is one mesh, always partly in view
  scene.add(mesh);
}
function buildRepeats() {
  // Sleepers, close together under you. Pale against the dark bed, so they flicker past.
  along(new THREE.BoxGeometry(2.3, 0.1, 0.4), '#a48f70', 1.8, (_, o) => void (o.position.y += 0.05));
  // Markers along the walkway's edge, the near-field pulse of speed.
  const sideX = (o: THREE.Object3D, l: number, h: number) => {
    o.position.x -= P.uz * l;
    o.position.z += P.ux * l;
    o.position.y += h;
  };
  const SPAN = 45; // m at each end the stations stand on
  along(
    new THREE.BoxGeometry(0.12, 0.7, 0.12),
    '#d8553d',
    5,
    (_, o) => sideX(o, WALK.out - 0.08, WALK.up + 0.35),
    SPAN,
    LENGTH - SPAN,
  );
  // Plank seams across the walkway, and a tall mast past the other rail at every pillar: the slow beat at speed.
  const mid = (WALK.in + WALK.out) / 2;
  along(
    new THREE.BoxGeometry(WALK.out - WALK.in, 0.04, 0.18),
    '#8f8574',
    2.5,
    (_, o) => sideX(o, mid, WALK.up + 0.02),
    SPAN,
    LENGTH - SPAN,
  );
  along(new THREE.BoxGeometry(0.14, 3.6, 0.14), '#b4b0a7', 27, (_, o) => sideX(o, -2.4, 1.2), SPAN, LENGTH - SPAN);
  // Pillars from the sea to the deck, with a cap across, every 27 m; the stations stand on their own.
  const PILLAR = 27;
  const tall = (s: number, o: THREE.Object3D) => {
    const h = railY(s) - 0.8 + 2;
    o.scale.y = h;
    o.position.y = -2 + h / 2;
    sideX(o, 0.7, 0);
  };
  along(new THREE.BoxGeometry(2.4, 1, 2.8), '#c9c6bd', PILLAR, tall, SPAN, LENGTH - SPAN);
  along(
    new THREE.BoxGeometry(6.4, 0.8, 3.2),
    '#b4b0a7',
    PILLAR,
    (_, o) => {
      o.position.y -= 1.2;
      sideX(o, 0.7, 0);
    },
    SPAN,
    LENGTH - SPAN,
  );
}

// ---------------------------------------------------------------- stations
/** The boxes you can stand on, with their tops: index.ts lifts you onto one if a spawn lands you inside it. */
export const PADS: { x0: number; x1: number; z0: number; z1: number; top: number }[] = [];
function solidBox(x0: number, x1: number, z0: number, z1: number, top: number, bottom: number, color: string) {
  const hx = (x1 - x0) / 2,
    hy = (top - bottom) / 2,
    hz = (z1 - z0) / 2;
  const at = { x: x0 + hx, y: bottom + hy, z: z0 + hz };
  addStatic({ kind: 'box', hx, hy, hz }, at);
  const m = new THREE.Mesh(new THREE.BoxGeometry(hx * 2, hy * 2, hz * 2), FLAT(color));
  m.position.set(at.x, at.y, at.z);
  m.receiveShadow = true;
  scene.add(m);
  PADS.push({ x0, x1, z0, z1, top });
}
function buildStations() {
  const CONCRETE = '#bdb8ac';
  // Home: a platform level with the flatbeds, on the land side, and a ramp down to the land.
  const home = lineAt(STOP_A, P);
  const top = LOW + WALK.up + 0.03, // a hair over the walkway, so the two never fight in the depth buffer
    near = home.x - WALK.in - 0.02;
  solidBox(near - 7, near, ORIGIN.z + 6, ORIGIN.z + 44, top, -2, CONCRETE);
  // A rotated plank from the platform's edge down to about ground height, further inland.
  const x1 = near - 7,
    x0 = x1 - 11,
    drop = 2;
  const len = Math.hypot(x1 - x0, drop);
  const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, Math.atan2(drop, x1 - x0)));
  const c = { x: (x0 + x1) / 2, y: top - drop / 2 - 0.2, z: ORIGIN.z + 30 };
  addStatic({ kind: 'box', hx: len / 2, hy: 0.2, hz: 5 }, c, q);
  const ramp = new THREE.Mesh(new THREE.BoxGeometry(len, 0.4, 10), FLAT(CONCRETE));
  ramp.position.set(c.x, c.y, c.z);
  ramp.quaternion.copy(q);
  ramp.receiveShadow = true;
  scene.add(ramp);
  // Far stop: a small quay to step off on and look back from, wrapping the end of the line.
  const far = lineAt(STOP_B, P);
  const quay = far.x - WALK.in - 0.02;
  solidBox(quay - 34, quay, far.z - 30, far.z + 52, top, -2, CONCRETE);
  solidBox(far.x - WALK.in, far.x + 30, far.z + 26, far.z + 52, top, -2, CONCRETE);
  // A buffer at the home end of the rails.
  lineAt(0.5, P);
  const buffer = new THREE.Mesh(new THREE.BoxGeometry(3, 1.6, 0.6), FLAT('#c8452f'));
  buffer.position.set(P.x, railY(0.5) + 0.8, P.z);
  scene.add(buffer);
}

// ---------------------------------------------------------------- the far island
function cone(r: number, h: number, x: number, z: number, y = 0, seg = 7, color = '#6f8f58', rTop = 0) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rTop, r, h, seg, 1), FLAT(color));
  m.position.set(x, y + h / 2, z);
  m.rotation.y = x * 0.37 + z * 0.11;
  scene.add(m);
  return m;
}
function buildFarIsland() {
  const end = lineAt(LENGTH, { x: 0, z: 0, ux: 0, uz: 1 });
  const cx = end.x,
    cz = end.z + 200;
  // About 300 m wide and 120 m tall.
  cone(160, 10, cx, cz, -2, 14, '#c9b98a', 150); // the beach
  cone(100, 120, cx - 10, cz + 20, 0, 8);
  cone(75, 78, cx - 92, cz + 10, 0, 7, '#7e9a62');
  cone(68, 64, cx + 88, cz - 2, 0, 7, '#688a55');
  cone(44, 96, cx + 26, cz + 40, 0, 6, '#8a8f80');
  // The landmark: a tall lighthouse-like tower on the summit, with a bright cap. It reads first, from any distance.
  const tower = new THREE.Mesh(new THREE.BoxGeometry(14, 90, 14), FLAT('#f0e6d6'));
  tower.position.set(cx - 10, 112 + 45, cz + 20);
  scene.add(tower);
  const cap = new THREE.Mesh(new THREE.BoxGeometry(22, 14, 22), FLAT('#d8452f'));
  cap.position.set(cx - 10, 112 + 90 + 7, cz + 20);
  scene.add(cap);
  // A blocky town at its foot, facing the line: the part of the island you can compare a person to.
  const rng = mulberry32(7);
  const n = 90,
    town = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardNodeMaterial(), n);
  const colours = ['#e6d6be', '#d8b890', '#c98a6a', '#b9c0c6', '#efe7da', '#a8705a'];
  const c = new THREE.Color();
  for (let k = 0; k < n; k++) {
    const a = rng() * 1.3 - 0.65, // around the shore, either side of the quay
      r = 62 + rng() * 80,
      w = 7 + rng() * 10,
      h = 6 + rng() * rng() * 36;
    pose.position.set(cx + Math.sin(a) * (r + 60), h / 2 + 3, cz - 60 - Math.cos(a) * r * 0.55);
    pose.rotation.set(0, rng() * 0.6, 0);
    pose.scale.set(w, h, 6 + rng() * 10);
    pose.updateMatrix();
    town.setMatrixAt(k, pose.matrix);
    town.setColorAt(k, c.set(colours[Math.floor(rng() * colours.length)]!));
  }
  town.frustumCulled = false;
  scene.add(town);
}

// ---------------------------------------------------------------- the sea's few things: islets, stacks, a wreck
function buildSea() {
  const rock = '#8d897f';
  const at = (frac: number, off: number) => {
    lineAt(frac * LENGTH, P);
    return { x: P.x - P.uz * off, z: P.z + P.ux * off };
  };
  const islet = at(0.3, 170);
  cone(52, 8, islet.x, islet.z, -2, 9, '#c9b98a', 44);
  cone(36, 24, islet.x + 6, islet.z - 4, 0, 7, '#6f8f58');
  const stack = at(0.56, -95);
  cone(13, 44, stack.x, stack.z, -1, 5, rock, 5);
  cone(9, 26, stack.x + 19, stack.z + 8, -1, 5, rock, 3);
  cone(6, 13, stack.x - 15, stack.z + 14, -1, 5, rock, 2);
  const far = at(0.76, 260);
  cone(80, 34, far.x, far.z, -1, 8, '#7e9a62');
  // A wreck, listing and half sunk near the line.
  const w = at(0.43, -58);
  const wreck = new THREE.Group();
  const hull = new THREE.Mesh(new THREE.BoxGeometry(9, 7, 44), FLAT('#5a4638'));
  const house = new THREE.Mesh(new THREE.BoxGeometry(6, 5, 9), FLAT('#8d8678'));
  house.position.set(0, 6, -7);
  const mast = new THREE.Mesh(new THREE.BoxGeometry(0.8, 16, 0.8), FLAT('#3c332c'));
  mast.position.set(0, 11, 8);
  wreck.add(hull, house, mast);
  wreck.position.set(w.x, 0.5, w.z);
  wreck.rotation.set(0.1, 0.8, 0.28);
  scene.add(wreck);
}

export function buildWorld() {
  buildDeck();
  buildRepeats();
  buildStations();
  buildFarIsland();
  buildSea();
}

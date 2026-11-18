// Ring Island's records (src/entities/ring-island/): the greybox box its massing is drawn in, a rim rock, the folk, a fingerpost arm,
// the low map table, the summit deck and the drop hammer's head. Static things are vertex-coloured pieces the island
// merges into its one draw; the head is its own mesh, which the island lifts and drops every frame.
import * as THREE from 'three/webgpu';
import { registerBuilder, type Piece } from '../builders.ts';
import type { JsonObject } from '../types.ts';
declare module '../names.ts' {
  interface BuilderNames {
    'ring.box': true;
    'ring.rim-rock': true;
    'ring.folk': true;
    'ring.fingerpost-arm': true;
    'ring.map-table': true;
    'ring.summit-deck': true;
    'ring.hammer-head': true;
  }
}
const finite = (value: unknown, name: string) => {
  if (typeof value !== 'number' || !Number.isFinite(value)) throw new Error(`prefabs: expected finite ${name}`);
  return value;
};
const colour = (value: unknown, name: string) => {
  if (typeof value !== 'string' || !/^#[0-9a-f]{6}$/i.test(value)) throw new Error(`prefabs: expected ${name} colour`);
  return value;
};
const pair = (value: unknown, name: string) => {
  if (!Array.isArray(value) || value.length !== 2) throw new Error(`prefabs: expected ${name} direction`);
  return { x: finite(value[0], name), z: finite(value[1], name) };
};
/** A piece `color` at (x, y, z), turned by the Euler (rx, ry, rz). */
const put = (color: string, geometry: THREE.BufferGeometry, x: number, y: number, z: number, rx = 0, ry = 0, rz = 0) =>
  ({
    geometry,
    color,
    matrix: new THREE.Matrix4().compose(
      new THREE.Vector3(x, y, z),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)),
      new THREE.Vector3(1, 1, 1),
    ),
  }) satisfies Piece;
/** An upright box turned `yaw` about y (the line's heading), its middle at (x, y, z). */
const upright = (color: string, w: number, h: number, d: number, x: number, y: number, z: number, yaw: number) => ({
  geometry: new THREE.BoxGeometry(w, h, d),
  color,
  matrix: new THREE.Matrix4().compose(
    new THREE.Vector3(x, y, z),
    new THREE.Quaternion().setFromAxisAngle(THREE.Object3D.DEFAULT_UP, yaw),
    new THREE.Vector3(1, 1, 1),
  ),
});

// A unit cube in one colour: the placement's scale sizes it, its rotation lays it along the line or a slope.
registerBuilder('ring.box', (params) => ({
  pieces: [
    { geometry: new THREE.BoxGeometry(1, 1, 1), matrix: new THREE.Matrix4(), color: colour(params.color, 'box') },
  ],
}));

// A rim rock: a dodecahedron of `radius` in one colour; the placement's scale makes it uneven.
registerBuilder('ring.rim-rock', (params) => ({
  pieces: [
    {
      geometry: new THREE.DodecahedronGeometry(finite(params.radius, 'rock radius')),
      matrix: new THREE.Matrix4(),
      color: colour(params.color, 'rock'),
    },
  ],
}));

// One of the folk: a body, a head and an orange hard hat, standing on the origin; `wave` raises an arm.
registerBuilder('ring.folk', (params) => {
  const body = colour(params.body, 'folk body');
  const pieces: Piece[] = [
    put(body, new THREE.CylinderGeometry(0.32, 0.38, 1.0, 8), 0, 0.5, 0),
    put(colour(params.head, 'folk head'), new THREE.SphereGeometry(0.3, 10, 8), 0, 1.3, 0),
    put(colour(params.hat, 'folk hat'), new THREE.CylinderGeometry(0.34, 0.38, 0.16, 10), 0, 1.55, 0),
  ];
  if (params.wave === true) pieces.push(put(body, new THREE.BoxGeometry(0.14, 0.75, 0.14), 0.42, 1.35, 0, 0, 0, -0.5));
  return { pieces };
});

// A fingerpost arm (its board and point along local +x from the post) with a painted emblem on both faces: the Gorge's
// fork, or Canopy's tree. Emblems only; the names are the owner's.
registerBuilder('ring.fingerpost-arm', (params) => {
  const timber = colour(params.timber, 'arm'),
    gold = colour(params.gold, 'gorge emblem'),
    dark = colour(params.dark, 'trunk'),
    leaf = colour(params.leaf, 'canopy');
  const pieces: Piece[] = [
    put(timber, new THREE.BoxGeometry(2.3, 0.52, 0.08), 1.25, 0, 0),
    put(timber, new THREE.ConeGeometry(0.37, 0.55, 4), 2.65, 0, 0, 0, 0, -Math.PI / 2),
  ];
  for (const s of [-1, 1]) {
    const z = s * 0.06;
    if (params.emblem === 'gorge') {
      pieces.push(put(gold, new THREE.BoxGeometry(0.06, 0.2, 0.02), 0.95, -0.1, z));
      pieces.push(put(gold, new THREE.BoxGeometry(0.06, 0.24, 0.02), 0.88, 0.1, z, 0, 0, 0.5));
      pieces.push(put(gold, new THREE.BoxGeometry(0.06, 0.24, 0.02), 1.02, 0.1, z, 0, 0, -0.5));
    } else if (params.emblem === 'canopy') {
      pieces.push(put(dark, new THREE.BoxGeometry(0.06, 0.2, 0.02), 0.95, -0.12, z));
      pieces.push(put(leaf, new THREE.CylinderGeometry(0.17, 0.17, 0.02, 12), 0.95, 0.06, z, Math.PI / 2));
    } else throw new Error('prefabs: expected a fingerpost emblem');
  }
  return { pieces };
});

// The low map table by the west platform (origin: the middle of its top, unturned): its top, four legs down to the
// platform, and the branch lines painted on it: the line south, then dashed toward the Gorge and Canopy (`gorge` and
// `canopy`, world directions the island works out from the halt) with a station dot at each end. Legs are turned to the
// line (`yaw`).
registerBuilder('ring.map-table', (params: JsonObject) => {
  const w = finite(params.w, 'table width'),
    d = finite(params.d, 'table depth'),
    legs = finite(params.legs, 'table legs'),
    yaw = finite(params.yaw, 'table yaw');
  const gorge = pair(params.gorge, 'gorge'),
    canopy = pair(params.canopy, 'canopy');
  const c = (key: string) => colour(params[key], key);
  const pieces: Piece[] = [put(c('top'), new THREE.BoxGeometry(w, 0.08, d), 0, 0.04, 0)];
  for (const [x, z] of [
    [-1.0, -0.8],
    [1.0, -0.8],
    [-1.0, 0.8],
    [1.0, 0.8],
  ] as const)
    pieces.push(upright(c('legColor'), 0.12, legs, 0.12, x, -legs / 2, z, yaw));
  const hx = 1.0,
    hz = 0.35,
    lay = 0.085;
  const line = (color: string, dx: number, dz: number, len: number, dashed: boolean) => {
    const rot = Math.atan2(-dz, dx);
    const seg = dashed ? 0.12 : len;
    for (let k = 0; k < len - 1e-6; k += dashed ? 0.2 : len) {
      const l = Math.min(seg, len - k),
        m = k + l / 2;
      pieces.push(put(color, new THREE.BoxGeometry(l, 0.02, 0.06), hx + dx * m, lay + 0.01, hz + dz * m, 0, rot));
    }
  };
  const station = (color: string, dx: number, dz: number, len: number) =>
    pieces.push(put(color, new THREE.CylinderGeometry(0.1, 0.1, 0.03, 12), hx + dx * len, lay + 0.015, hz + dz * len));
  line(c('home'), 0, -1, 1.2, false);
  station(c('home'), 0, -1, 1.2);
  line(c('gorgeColor'), gorge.x, gorge.z, 1.4, true);
  station(c('stop'), gorge.x, gorge.z, 1.4);
  line(c('canopyColor'), canopy.x, canopy.z, 2.05, true);
  station(c('stop'), canopy.x, canopy.z, 2.05);
  station(c('here'), 0, 0, 0);
  return { pieces };
});

// The summit lookout's deck (origin: the middle of its top) and the rail posts round its rim, turned to the line (`yaw`).
registerBuilder('ring.summit-deck', (params) => {
  const r = finite(params.rail, 'rail radius'),
    posts = finite(params.posts, 'rail posts'),
    rise = finite(params.rise, 'rail height'),
    yaw = finite(params.yaw, 'deck yaw');
  const pieces: Piece[] = [put(colour(params.deck, 'deck'), new THREE.CylinderGeometry(6, 6.5, 1.2, 7), 0, -0.6, 0)];
  for (let i = 0; i < posts; i++) {
    const a = (i / posts) * Math.PI * 2;
    pieces.push(
      upright(colour(params.post, 'post'), 0.15, rise, 0.15, Math.cos(a) * r, rise / 2, Math.sin(a) * r, yaw),
    );
  }
  return { pieces };
});

// The drop hammer's head (origin: its middle at rest on the anvil); the island lifts and drops it.
registerBuilder('ring.hammer-head', (params) => {
  const geometry = new THREE.BoxGeometry(1.3, 1.1, 1.3),
    material = new THREE.MeshStandardNodeMaterial({ color: colour(params.color, 'head'), roughness: 0.6 });
  const head = new THREE.Mesh(geometry, material);
  head.castShadow = true;
  return {
    object: head,
    dispose() {
      geometry.dispose();
      material.dispose();
    },
  };
});

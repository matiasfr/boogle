// The museum: two things worth walking in for, and neither is a shelf of collectibles (Grant: no collecting for collecting's
// sake). The specimen: a stone split open like a book, its rough outside facing away, its inside a cave of blue crystal with light
// going slowly up through it, and a shard turning in the gap. The same blue as the far island's shard; you can catch a sliver of it
// from the street through the door. The miniature: the whole place on a table, its real land from the same heights you walk on,
// with what's actually there on it right now: every building standing and any going up, the track as far as it's laid, the machine
// and the trains moving, trees that are still up, the village's people, and a small orange pin for you. It's read from the shared
// state each time it's drawn, so it shows the same thing to two people (DESIGN.md 9 and 11). Docs: docs/research/town-interiors.md,
// "A museum that rewards the eyes". Local.
import * as THREE from 'three/webgpu';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { abs, float, mix, normalView, positionWorld, sin, time, uv, vertexColor } from 'three/tsl';
import { smoothstep } from '../../math.ts';
import { me } from '../../player/player.ts';
import { TREES, standing } from './chop.ts';
import { job } from './job.ts';
import { H } from './land.ts';
import { lines, machine } from './lines.ts';
import { FORGE, GRID, ORIGIN, SPIRE, railY, toWorld } from './layout.ts';
import { addSolid, plate, roomMesh, rooms, type Part } from './rooms.ts';
import { run } from './run.ts';
import { sites } from './sites.ts';
import { forge } from './forge.ts';
import { pathMask, heights, at as cellAt, NX, NZ, cellX, cellZ, gorgeD } from './terrain.ts';
import { mulberry32 } from '../../sim/rng.ts';
import { softGlow } from './look.ts';
import { BOARDS } from './town-lines.ts';

const r = rooms.museum;
const { w, d, high } = r;
const STONE = '#c8c3b4',
  STONE2 = '#b2ad9f';

// ---------------------------------------------------------------- the room
const floor: Part[] = [];
for (let i = 0; i < 7; i++)
  for (let j = 0; j < 6; j++)
    floor.push([
      'b',
      -w / 2 + (i + 0.5) * (w / 7),
      0.015,
      -d / 2 + (j + 0.5) * (d / 6),
      w / 7 - 0.03,
      0.03,
      d / 6 - 0.03,
      (i + j) % 2 ? '#a9a497' : '#979286',
    ]);
const TABLE = { x: 0, z: 1.05, w: 6.0, d: 4.0, top: 1.0 };
const SPEC = { x: 0, z: -3.75 };
const fixtures: Part[] = [
  ...floor,
  // The dark alcove behind the stone: a screen of its own, so it stands whichever wall is out of the way.
  ['b', SPEC.x, 2.1, -5.65, 8.6, 4.2, 0.14, '#1d2340'],
  ['b', SPEC.x - 4.3, 2.1, -5.2, 0.14, 4.2, 1.0, '#1d2340'],
  ['b', SPEC.x + 4.3, 2.1, -5.2, 0.14, 4.2, 1.0, '#1d2340'],
  // The stone's plinth, low and wide.
  ['b', SPEC.x, 0.18, SPEC.z, 6.6, 0.36, 2.9, '#6f6b63'],
  ['b', SPEC.x, 0.42, SPEC.z, 6.2, 0.12, 2.5, '#4f4c47'],
  // The table: a wide, plain thing, with a rim to hold the sea in.
  ['b', TABLE.x, 0.46, TABLE.z, TABLE.w + 0.1, 0.92, TABLE.d + 0.1, '#5c4530'],
  ['b', TABLE.x, TABLE.top - 0.03, TABLE.z - TABLE.d / 2 - 0.05, TABLE.w + 0.3, 0.1, 0.1, '#7f5630'],
  ['b', TABLE.x, TABLE.top - 0.03, TABLE.z + TABLE.d / 2 + 0.05, TABLE.w + 0.3, 0.1, 0.1, '#7f5630'],
  ['b', TABLE.x - TABLE.w / 2 - 0.05, TABLE.top - 0.03, TABLE.z, 0.1, 0.1, TABLE.d + 0.3, '#7f5630'],
  ['b', TABLE.x + TABLE.w / 2 + 0.05, TABLE.top - 0.03, TABLE.z, 0.1, 0.1, TABLE.d + 0.3, '#7f5630'],
  // A bench for two, facing the stone.
  ['b', -3.9, 0.42, -1.3, 2.4, 0.12, 0.7, '#7f5630'],
  ['b', -4.9, 0.2, -1.3, 0.14, 0.4, 0.6, '#5c4530'],
  ['b', -2.9, 0.2, -1.3, 0.14, 0.4, 0.6, '#5c4530'],
  // Labels on their stands.
  ['b', -2.8, 0.55, -2.5, 0.08, 1.1, 0.08, '#3f4145'],
  ['b', TABLE.x, 0.55, TABLE.z + TABLE.d / 2 + 0.55, 0.08, 1.1, 0.08, '#3f4145'],
  // Brass-lined display cabinetry: the island is an exhibit, not a crate.
  ['b', 0, 0.17, TABLE.z + TABLE.d / 2 + 0.06, 5.8, 0.04, 0.025, '#d9a23a'],
  ['b', 0, 0.79, TABLE.z + TABLE.d / 2 + 0.06, 5.8, 0.04, 0.025, '#d9a23a'],
  // Cushions on the existing visitor bench, clear of the walkway.
  ['b', -4.5, 0.52, -1.3, 1.05, 0.08, 0.58, '#356b74'],
  ['b', -3.3, 0.52, -1.3, 1.05, 0.08, 0.58, '#356b74'],
];
for (const x of [-2, 0, 2])
  fixtures.push(
    ['b', x, 0.48, TABLE.z + TABLE.d / 2 + 0.06, 1.75, 0.48, 0.025, '#7f6244'],
    ['b', x, 0.52, TABLE.z + TABLE.d / 2 + 0.09, 0.22, 0.04, 0.04, '#d9a23a'],
  );
// Mounts and warm reflector dishes sit on the specimen's plinth, within its existing solid.
for (const x of [-2.7, 2.7])
  fixtures.push(
    ['c', x, 0.51, SPEC.z + 0.85, 0.16, 0.08, 0.16, '#3f4145'],
    ['k', x, 0.65, SPEC.z + 0.85, 0.2, 0.22, 0.2, '#d9a23a', Math.PI],
    ['c', x, 0.77, SPEC.z + 0.85, 0.14, 0.015, 0.14, '#fff0c9'],
  );
addSolid(r, SPEC.x, SPEC.z, 3.3, 1.45, 3.4);
addSolid(r, TABLE.x, TABLE.z, TABLE.w / 2 + 0.1, TABLE.d / 2 + 0.1, TABLE.top);
addSolid(r, -3.9, -1.3, 1.2, 0.35, 0.5);
addSolid(r, SPEC.x, -5.65, 4.3, 0.1, 4.2);
addSolid(r, SPEC.x - 4.3, -5.2, 0.1, 0.55, 4.2);
addSolid(r, SPEC.x + 4.3, -5.2, 0.1, 0.55, 4.2);
r.near.add(
  roomMesh(fixtures),
  plate(BOARDS.specimen, 1.6, 0.6, -2.8, 1.3, -2.45),
  plate(BOARDS.table, 2.1, 0.5, TABLE.x, 1.3, TABLE.z + TABLE.d / 2 + 0.6),
);

// ---------------------------------------------------------------- the specimen
const rng = mulberry32(7741);
function jitter(g: THREE.BufferGeometry, amount: number) {
  const p = g.getAttribute('position');
  for (let k = 0; k < p.count; k++) {
    const x = p.getX(k),
      y = p.getY(k),
      z = p.getZ(k);
    // Same point, same push: seams stay shut.
    const n = Math.sin(x * 7.3 + y * 3.1) * Math.cos(z * 6.1 - y * 4.7) + 0.6 * Math.sin(x * 13.1 - z * 11.3);
    const f = 1 + n * amount;
    p.setXYZ(k, x * f, y * f, z * f);
  }
  return g;
}
const paint = (g: THREE.BufferGeometry, fn: (x: number, y: number, z: number, out: THREE.Color) => void) => {
  const p = g.getAttribute('position'),
    col = new Float32Array(p.count * 3),
    c = new THREE.Color();
  for (let k = 0; k < p.count; k++) {
    fn(p.getX(k), p.getY(k), p.getZ(k), c);
    col.set([c.r, c.g, c.b], k * 3);
  }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  return g;
};
const R = 1.42;
const ROCK_A = new THREE.Color('#57524a'),
  ROCK_B = new THREE.Color('#3d3a35');
function halfShell() {
  const g = jitter(new THREE.SphereGeometry(R, 14, 10, Math.PI, Math.PI).toNonIndexed(), 0.05);
  return paint(g, (x, y, z, c) => {
    c.copy(ROCK_A).lerp(ROCK_B, 0.5 + 0.5 * Math.sin(x * 5 + y * 4 + z * 3));
  });
}
/** The cut face's rim: bands of agate round the edge. */
function rim() {
  const g = new THREE.RingGeometry(R * 0.72, R * 1.02, 22, 5).toNonIndexed();
  jitter(g, 0.035);
  const a = new THREE.Color('#e9e4f5'),
    b = new THREE.Color('#6c5bb0'),
    e = new THREE.Color('#3b2f73');
  paint(g, (x, y, _z, c) => {
    const q = (Math.hypot(x, y) / R - 0.72) / 0.3;
    c.copy(Math.sin(q * 18) > 0 ? a : b).lerp(e, smoothstep(0.7, 1, q));
  });
  // The ring's plane is z = 0, which is where the cut is.
  return g;
}
const CRYSTAL = {
  deep: new THREE.Color('#1c3dbb'),
  mid: new THREE.Color('#3f8ee0'),
  tip: new THREE.Color('#8fe0ff'),
  warm: new THREE.Color('#9a6bff'),
};
function liningOf(count: number) {
  const out: THREE.BufferGeometry[] = [];
  const m = new THREE.Matrix4(),
    q = new THREE.Quaternion(),
    from = new THREE.Vector3(0, 1, 0),
    n = new THREE.Vector3(),
    pos = new THREE.Vector3();
  for (let k = 0; k < count; k++) {
    // On the inside of the back half of a ball, pointing in.
    const u = rng() * 2 - 1,
      a = rng() * Math.PI * 2,
      s = Math.sqrt(1 - u * u);
    n.set(s * Math.cos(a), u, -Math.abs(s * Math.sin(a)) - 0.02).normalize();
    const big = rng();
    const len = 0.32 + big * big * 0.95,
      rad = 0.07 + big * 0.14;
    pos.copy(n).multiplyScalar(R * 0.98 - len / 2);
    const g = new THREE.ConeGeometry(rad, len, 5, 1).toNonIndexed();
    // Pointing at the middle, with a little scatter.
    n.negate();
    n.x += (rng() - 0.5) * 0.4;
    n.y += (rng() - 0.5) * 0.4;
    n.normalize();
    q.setFromUnitVectors(from, n);
    m.compose(pos, q, new THREE.Vector3(1, 1, 1));
    const tone = rng();
    paint(g, (_x, y, _z, c) => {
      const t = y / len + 0.5;
      c.copy(tone < 0.16 ? CRYSTAL.warm : CRYSTAL.deep)
        .lerp(CRYSTAL.mid, t)
        .lerp(CRYSTAL.tip, t * t * t);
    });
    g.applyMatrix4(m);
    out.push(g);
  }
  return mergeGeometries(out)!;
}
const rockMat = new THREE.MeshStandardNodeMaterial({
  vertexColors: true,
  roughness: 0.95,
  flatShading: true,
  side: THREE.DoubleSide,
});
const crystalMat = new THREE.MeshStandardNodeMaterial({ vertexColors: true, roughness: 0.28, flatShading: true });
{
  // Light going slowly up through it: built once, and it runs on the clock.
  const band = sin(positionWorld.y.mul(2.4).sub(time.mul(0.8)))
    .mul(0.5)
    .add(0.5);
  crystalMat.emissiveNode = vertexColor().mul(mix(float(0.22), float(1.5), band.mul(band).mul(band)));
}
const specimen = new THREE.Group();
specimen.position.set(SPEC.x, 1.95, SPEC.z);
const CRACK = 1.62, // each half's middle from the gap: two halves, side by side, as a cut stone is shown
  OPEN = 0.38; // turned in a little, towards whoever's in front
for (const side of [-1, 1]) {
  const half = new THREE.Group();
  half.position.x = side * CRACK;
  half.rotation.y = -side * OPEN;
  const shell = new THREE.Mesh(halfShell(), rockMat);
  shell.castShadow = true;
  const band = new THREE.Mesh(rim(), rockMat);
  const lining = new THREE.Mesh(liningOf(90), crystalMat);
  half.add(shell, band, lining);
  specimen.add(half);
}
const core = new THREE.Mesh(
  new THREE.OctahedronGeometry(0.34, 0).toNonIndexed(),
  new THREE.MeshStandardNodeMaterial({
    color: '#bff1ff',
    emissive: '#6fc8ff',
    emissiveIntensity: 3,
    flatShading: true,
  }),
);
core.scale.set(0.8, 1.7, 0.8);
core.position.set(0, 0.25, 0.1);
const haze = new THREE.Mesh(new THREE.SphereGeometry(1.2, 18, 12), softGlow('#4fa8ff', 0.1).mat);
haze.position.set(0, 0.25, 0.1);
specimen.add(core, haze);
// A pool of its light on the floor, and up the screen behind.
const poolMat = new THREE.MeshBasicNodeMaterial({
  color: '#3f8ee0',
  transparent: true,
  depthWrite: false,
  blending: THREE.AdditiveBlending,
});
{
  const f = float(1).sub(uv().sub(0.5).length().mul(2)).clamp(0, 1);
  poolMat.opacityNode = f.mul(f).mul(0.75).mul(abs(normalView.z));
}
const pool = new THREE.Mesh(new THREE.PlaneGeometry(9, 9), poolMat);
pool.rotation.x = -Math.PI / 2;
pool.position.set(SPEC.x, 0.06, SPEC.z + 0.4);
r.near.add(specimen, pool);

// ---------------------------------------------------------------- the miniature's land
const SCALE = 1 / 120,
  UP = SCALE * 1.5;
const SPAN = { x0: -220, x1: 480, z0: -238, z1: 222 };
const toTableX = (x: number) => (x - (SPAN.x0 + SPAN.x1) / 2) * SCALE + TABLE.x;
const toTableZ = (z: number) => (z - (SPAN.z0 + SPAN.z1) / 2) * SCALE + TABLE.z;
const seaY = TABLE.top + 0.012;
const tableY = (h: number) => seaY + Math.max(0, h) * UP;
function relief() {
  const every = 3; // cells of the land's 2 m grid
  const i0 = Math.max(0, Math.round((SPAN.x0 - GRID.x0) / GRID.cell)),
    i1 = Math.min(NX - 1, Math.round((SPAN.x1 - GRID.x0) / GRID.cell)),
    j0 = Math.max(0, Math.round((SPAN.z0 - GRID.z0) / GRID.cell)),
    j1 = Math.min(NZ - 1, Math.round((SPAN.z1 - GRID.z0) / GRID.cell));
  const cols = Math.floor((i1 - i0) / every) + 1,
    rows = Math.floor((j1 - j0) / every) + 1;
  const pos = new Float32Array(cols * rows * 3),
    col = new Float32Array(cols * rows * 3),
    index: number[] = [];
  const c = new THREE.Color();
  const GRASS = new THREE.Color('#6c9a42'),
    GRASS2 = new THREE.Color('#568740'),
    ROCK_ = new THREE.Color('#a08a70'),
    SAND = new THREE.Color('#e8d39a'),
    DIRT = new THREE.Color('#e0b271'),
    SEA = new THREE.Color('#2e7fb8');
  for (let b = 0; b < rows; b++)
    for (let a = 0; a < cols; a++) {
      const i = i0 + a * every,
        j = j0 + b * every,
        k = cellAt(i, j),
        h = heights[k]!,
        x = cellX(i),
        z = cellZ(j);
      const n = a + b * cols;
      pos.set([toTableX(x), tableY(h), toTableZ(z)], n * 3);
      const slope = Math.abs(heights[cellAt(Math.min(NX - 1, i + every), j)]! - h) / (every * GRID.cell);
      c.copy(GRASS).lerp(GRASS2, 0.5 + 0.5 * Math.sin(x * 0.03) * Math.cos(z * 0.04));
      if (slope > 0.5) c.copy(ROCK_);
      if (h < 3) c.lerp(SAND, smoothstep(3, 1, h));
      if (h <= 0.05) c.copy(SEA);
      else if (gorgeD(x, z) < 5 && h < 1) c.copy(SEA);
      c.lerp(DIRT, pathMask[k]!);
      col.set([c.r, c.g, c.b], n * 3);
      if (a < cols - 1 && b < rows - 1) index.push(n, n + cols, n + 1, n + 1, n + cols, n + cols + 1);
    }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  g.setIndex(index);
  return g.toNonIndexed();
}
const land = new THREE.Mesh(
  relief(),
  new THREE.MeshStandardNodeMaterial({ vertexColors: true, roughness: 0.92, flatShading: true }),
);
land.receiveShadow = true;
land.geometry.computeVertexNormals();
r.near.add(land);
// The spire, as a real thing on it.
{
  const m = roomMesh(
    [
      ['k', toTableX(SPIRE.x), TABLE.top + 0.42, toTableZ(SPIRE.z), 0.09, 0.84, 0.09, '#8d8a80', 0.08],
      ['s', toTableX(SPIRE.x), TABLE.top + 0.06, toTableZ(SPIRE.z), 0.11, 0.08, 0.11, '#6d6f78'],
    ],
    false,
  );
  r.near.add(m);
}

// ---------------------------------------------------------------- what's on it now
const MAX = 720;
const bits = new THREE.InstancedMesh(
  new THREE.BoxGeometry(1, 1, 1),
  new THREE.MeshStandardNodeMaterial({ roughness: 0.7 }),
  MAX,
);
bits.frustumCulled = false;
bits.count = 0;
r.near.add(bits);
const m_ = new THREE.Matrix4(),
  q_ = new THREE.Quaternion(),
  p_ = new THREE.Vector3(),
  s_ = new THREE.Vector3(),
  c_ = new THREE.Color();
const UPAXIS = new THREE.Vector3(0, 1, 0);
let n_ = 0;
function bit(x: number, y: number, z: number, sx: number, sy: number, sz: number, color: string, yaw = 0) {
  if (n_ >= MAX) return;
  q_.setFromAxisAngle(UPAXIS, yaw);
  bits.setMatrixAt(n_, m_.compose(p_.set(x, y, z), q_, s_.set(sx, sy, sz)));
  bits.setColorAt(n_, c_.set(color));
  n_++;
}
const inTable = (x: number, z: number) => x > SPAN.x0 && x < SPAN.x1 && z > SPAN.z0 && z < SPAN.z1;
function drawRail(l: (typeof lines)[number]) {
  const { line, dir } = l.spec;
  const head = run.line === l ? run.head : l.open ? (dir > 0 ? line.len : 0) : dir > 0 ? 7 : line.len - 30;
  const stubTo = dir < 0 ? 30 : 0; // line 1 starts with its village stub down
  const lo = dir > 0 ? 0 : head,
    hi = dir > 0 ? head : line.len;
  const STEP = 5;
  const part = (a: number, b: number) => {
    for (let s = a; s < b; s += STEP) {
      const k = Math.floor(s),
        x = line.xs[k]!,
        z = line.zs[k]!;
      if (!inTable(x, z)) continue;
      const kk = Math.min(line.xs.length - 1, k + 1);
      const yaw = Math.atan2(line.xs[kk]! - x, line.zs[kk]! - z);
      const y = railY(line, s),
        ground = H(toWorld(x), z),
        ty = tableY(y);
      bit(toTableX(x), ty + 0.012, toTableZ(z), 0.03, 0.022, STEP * SCALE * 1.1, '#2a2622', yaw);
      // Trestle legs where the track stands off the ground.
      if (y - ground > 3 && k % 10 === 0) {
        const bottom = tableY(ground);
        bit(toTableX(x), (ty + bottom) / 2, toTableZ(z), 0.014, ty - bottom, 0.014, '#a9794c');
      }
    }
  };
  part(lo, hi);
  if (stubTo && lo > stubTo) part(0, stubTo);
}
const peopleAt = (() => {
  const q = mulberry32(551);
  return Array.from({ length: 28 }, () => {
    const a = q() * 6.28,
      d_ = 8 + q() * 30;
    return { x: -102 + Math.cos(a) * d_, z: 12 + Math.sin(a) * d_ };
  });
})();
function drawBits() {
  n_ = 0;
  // Buildings: bigger than their scale, or you couldn't see a village at all. Roof colour on top. One that's going up rises.
  for (const q of sites) {
    if (q.state === 'none') continue;
    const P = q.plan;
    const x = P.x - ORIGIN.x,
      z = P.z - ORIGIN.z;
    if (!inTable(x, z)) continue;
    const grow = q.state === 'done' ? 1 : Math.max(0.05, Math.min(1, q.t / q.doneAt));
    const hgt = (P.top.y - P.y) * SCALE * 2 * grow;
    const fw = Math.max(0.05, P.hw * 2 * SCALE * 1.7),
      fd = Math.max(0.05, P.hd * 2 * SCALE * 1.7);
    const base = tableY(P.y);
    const pieces = P.pieces;
    const wall = pieces[Math.min(pieces.length - 1, P.FRAME)]?.color.getHexString() ?? 'c8c3b4';
    const roof = pieces[Math.max(0, P.ROOFED - 2)]?.color.getHexString() ?? 'c4453a';
    bit(toTableX(x), base + hgt / 2, toTableZ(z), fw, hgt, fd, `#${wall}`, P.yaw);
    bit(toTableX(x), base + hgt + 0.012, toTableZ(z), fw * 1.15, 0.024, fd * 1.15, `#${roof}`, P.yaw);
  }
  // The forge isn't a site: it stands from the start, and it glows when it's lit.
  {
    const x = FORGE.x,
      z = FORGE.z,
      base = tableY(H(toWorld(x), z));
    bit(toTableX(x), base + 0.05, toTableZ(z), 0.14, 0.1, 0.12, '#6d5136');
    if (forge.lit) bit(toTableX(x), base + 0.11, toTableZ(z), 0.05, 0.05, 0.05, '#ff9a3a');
  }
  for (const t of TREES) {
    if (!standing(t)) continue;
    const x = t.x - ORIGIN.x,
      z = t.z - ORIGIN.z;
    if (!inTable(x, z)) continue;
    const base = tableY(H(t.x, t.z)),
      size = t.great ? 0.075 : 0.04;
    bit(toTableX(x), base + size * 0.9, toTableZ(z), size, size * 1.8, size, t.great ? '#3f7a24' : '#4f8a34');
  }
  for (const l of lines) drawRail(l);
  // People: as many as the village has.
  const people = Math.min(peopleAt.length, job.people);
  for (let k = 0; k < people; k++) {
    const q = peopleAt[k]!;
    bit(
      toTableX(q.x),
      tableY(18) + 0.012,
      toTableZ(q.z),
      0.016,
      0.024,
      0.016,
      ['#e4574a', '#3f8ee0', '#f0c030'][k % 3]!,
    );
  }
  // What moves: the machine, the trains.
  const f = machine.flatbed;
  bit(toTableX(f.x - ORIGIN.x), tableY(f.y) + 0.03, toTableZ(f.z - ORIGIN.z), 0.07, 0.05, 0.1, '#f2b134');
  if (job.rung.trains)
    for (const l of lines) {
      const c = l.train.tr.cars[0]!;
      bit(toTableX(c.x - ORIGIN.x), tableY(c.y) + 0.03, toTableZ(c.z - ORIGIN.z), 0.05, 0.05, 0.13, '#d8392b');
    }
  // You.
  const b = me.body;
  if (b) {
    const x = toTableX(b.position.x - ORIGIN.x),
      z = toTableZ(b.position.z - ORIGIN.z),
      y = tableY(b.position.y);
    bit(x, y + 0.09, z, 0.014, 0.18, 0.014, '#ff8a1a');
    bit(x, y + 0.2, z, 0.05, 0.05, 0.05, '#ffa94a');
  }
  bits.count = n_;
  bits.instanceMatrix.needsUpdate = true;
  if (bits.instanceColor) bits.instanceColor.needsUpdate = true;
}

// ---------------------------------------------------------------- the frame
let acc = 0;
export function updateMuseum(dt: number) {
  if (!r.near.visible) return;
  core.rotation.y += dt * 0.5;
  acc += dt;
  if (acc < 0.1) return;
  acc = 0;
  drawBits();
}
// ---------------------------------------------------------------- what it looks like from the street
const COLS = [-5.2, -2.6, 2.6, 5.2];
const front: Part[] = [];
for (const x of COLS) {
  front.push(
    ['c', x, high / 2, d / 2 + 1.5, 0.34, high, 0.34, STONE],
    ['b', x, 0.1, d / 2 + 1.5, 0.95, 0.2, 0.95, STONE2],
    ['b', x, high - 0.1, d / 2 + 1.5, 0.95, 0.22, 0.95, STONE2],
  );
  addSolid(r, x, d / 2 + 1.5, 0.36, 0.36, high);
}
front.push(['b', 0, 0.05, d / 2 + 1.6, w + 1, 0.1, 3.2, '#b2ad9f']); // a stone apron, flush
r.outside.add(roomMesh(front));
r.over.add(
  roomMesh([
    ['b', 0, high + 0.25, d / 2 + 1.5, w + 0.6, 0.5, 1.6, STONE],
    ['b', 0, high + 0.7, d / 2 + 1.5, w + 0.2, 0.42, 1.3, STONE2],
    ['b', 0, high + 1.08, d / 2 + 1.5, w * 0.62, 0.36, 1.1, STONE],
  ]),
  plate(BOARDS.museum, 5.4, 0.95, 0, high + 0.32, d / 2 + 2.33),
);

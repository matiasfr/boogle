// The places along ?proto=net's line: a smoke column and survey stakes telegraph the next destination (DESIGN.md 7), and
// when the line reaches a camp it goes up piece by piece in a few seconds, flying in from the railhead
// (docs/research/construction-you-can-watch.md, recs 1, 4, 5): scaffolding first, then ground, frame, walls, roof, in
// beats, and the scaffolding comes down. The sawmill (Camp 1, wood) and the quarry (Camp 2, stone) are one data table;
// the frontier is a buffer stop, a little jetty and a far island silhouette (open question 13: how do you first reach a
// far island?). Local: what stands comes from the laid count, a reload snaps to it. Greybox boxes only.
import * as THREE from 'three/webgpu';
import { scene } from '../../render/scene.ts';
import { emit } from '../../render/particles.ts';
import { groundHeight } from '../../island/terrain.ts';
import { thump, clank } from '../../render/machine-sfx.ts';
import { arc, ring } from '../../render/motion.ts';
import { ROUTE } from '../../sim/route.ts';
import { box, draw, makeSet, place, type Box, type BoxSet, type Smoke } from '../../render/boxes.ts';

const dust = new THREE.Color('#d8c8a6'),
  white = new THREE.Color('#f4efe4'),
  soot = new THREE.Color('#8d8780');

const GAP = 0.19; // s between one piece and the next
const PHASE_PAUSE = 0.35; // and a short breath between phases
const FLY = 0.5; // s on its arc from the railhead
const SETTLE = 0.5;
const FLY_H = 3; // m its arc rises

/** A piece in the camp's frame: x east of its yard's centre, z south. `phase` names when it goes up. */
export type Piece = {
  phase: number;
  x: number;
  y: number;
  z: number;
  w: number;
  h: number;
  d: number;
  yaw?: number;
  c: string;
};
const SCAFFOLD = 0;
export const poles = (w: number, d: number, h: number): Piece[] =>
  [
    [-1, -1],
    [1, -1],
    [1, 1],
    [-1, 1],
  ].map(([sx, sz]) => ({
    phase: SCAFFOLD,
    x: (sx! * w) / 2,
    y: 0,
    z: (sz! * d) / 2,
    w: 0.18,
    h,
    d: 0.18,
    c: '#c9a86a',
  }));
export const P = (
  phase: number,
  x: number,
  y: number,
  z: number,
  w: number,
  h: number,
  d: number,
  c: string,
  yaw = 0,
): Piece => ({
  phase,
  x,
  y,
  z,
  w,
  h,
  d,
  yaw,
  c,
});

const TIMBER = '#a9794c',
  DARK = '#6b4a2b',
  ROOF = '#c9a86a',
  LOG = '#8c6a44',
  ROCK = '#8f9399',
  ROCK2 = '#74787e',
  IRON = '#3f4145',
  HOPPER = '#c9872e';

// The sawmill: a long open shed on posts, a log ramp in and a tall stack that smokes.
const SAWMILL: Piece[] = [
  ...poles(10, 7, 8),
  P(1, 0, 0, 0, 10, 0.3, 7, DARK),
  P(1, 8.5, 0, 0, 7, 0.6, 2.2, LOG),
  ...[-4, 0, 4].flatMap((x) => [P(2, x, 0.3, -3, 0.5, 4, 0.5, TIMBER), P(2, x, 0.3, 3, 0.5, 4, 0.5, TIMBER)]),
  P(2, 0, 4.3, -3, 10, 0.4, 0.5, DARK),
  P(2, 0, 4.3, 3, 10, 0.4, 0.5, DARK),
  P(3, 0, 0.3, -3, 10, 2.2, 0.2, TIMBER),
  P(3, -5, 0.3, 0, 0.2, 2.8, 6, TIMBER),
  P(3, 0, 0.3, 0, 5, 1.1, 1.1, IRON),
  P(3, 0, 1.4, 0, 0.25, 1.5, 2, '#d7dbe0'),
  P(4, 0, 4.7, -2, 11.5, 0.3, 4, ROOF),
  P(4, 0, 5.5, 0, 11.5, 0.3, 1.5, ROOF),
  P(4, 0, 4.7, 2, 11.5, 0.3, 4, ROOF),
  P(4, -6.8, 0, -2, 1.1, 9, 1.1, '#9a4a3a'),
];
// The quarry: a stepped grey cliff, a crane over it, a hopper to feed the crates.
const QUARRY: Piece[] = [
  ...poles(10, 7, 7),
  P(1, 0, 0, 0, 12, 0.3, 9, '#a39e92'),
  P(2, -3, 0.3, 3, 7, 7, 5, ROCK),
  P(2, 3, 0.3, 3.5, 5, 4.5, 4, ROCK2),
  P(2, -5, 7.3, 3, 4, 3, 4, ROCK2),
  P(3, 2, 0.3, -2, 3, 1.2, 2, ROCK),
  P(3, -1.5, 0.3, -2.5, 2, 0.9, 2, ROCK2),
  P(3, 5, 0.3, -2, 2.2, 3.2, 2.2, HOPPER),
  P(3, 5, 3.5, -2, 3, 0.8, 3, IRON),
  P(4, 7.5, 0.3, 2, 0.7, 11, 0.7, IRON),
  P(4, 3.5, 10.8, 2, 10, 0.5, 0.5, HOPPER),
  P(4, 0, 8.5, 2, 0.15, 2.3, 0.15, IRON),
];

/** A camp: its yard's centre, its pieces and where its crates pile up (world metres, off the stop). */
export type Camp = {
  stop: number;
  kind: 'wood' | 'stone';
  x: number;
  z: number;
  yaw: number;
  pieces: Piece[];
  pile: { x: number; z: number };
  door: { x: number; z: number };
  stack: Smoke | null;
  from?: { x: number; z: number }; // where its pieces fly in from (default: its stop)
  flat?: boolean; // every piece level with the yard's centre, not each on the ground under it
};
/** Stop k of the line: site k, or the far end of the last section. */
export const stopAt = (k: number): { x: number; z: number } => {
  const r = ROUTE[k];
  if (r) return { x: r.x, z: r.z };
  const last = ROUTE[ROUTE.length - 1]!;
  return { x: last.to[0]!, z: last.to[1]! };
};
const c1 = stopAt(1),
  c2 = stopAt(2),
  end = stopAt(3);
export const CAMPS: Camp[] = [
  {
    stop: 1,
    kind: 'wood',
    x: c1.x + 11,
    z: c1.z + 8,
    yaw: 0,
    pieces: SAWMILL,
    pile: { x: c1.x + 3.8, z: c1.z + 5 },
    door: { x: c1.x + 6, z: c1.z + 6.5 },
    stack: { x: c1.x + 11 - 6.8, y: 9.3, z: c1.z + 6 },
  },
  {
    stop: 2,
    kind: 'stone',
    x: c2.x + 5,
    z: c2.z + 16,
    yaw: 0,
    pieces: QUARRY,
    pile: { x: c2.x - 1, z: c2.z + 6.5 },
    door: { x: c2.x + 6, z: c2.z + 11 },
    stack: null,
  },
];
export const campAt = (stop: number) => CAMPS.find((c) => c.stop === stop);

type View = { set: BoxSet; pieces: Piece[]; at: number[]; t: number; landed: boolean[]; done: boolean; camp: Camp };
const views = new Map<Camp, View>();

function boxesOf(c: Camp): Box[] {
  if (c.flat) return c.pieces.map((p) => box(c.x, c.z, place(p.x, p.y, p.z, p.w, p.h, p.d, p.yaw ?? 0), p.c));
  return c.pieces.map((p) => box(c.x + p.x, c.z + p.z, place(0, p.y, 0, p.w, p.h, p.d, p.yaw ?? 0), p.c));
}
function viewOf(c: Camp): View {
  let v = views.get(c);
  if (v) return v;
  let t = 0;
  let phase = -1;
  const at = c.pieces.map((p) => {
    if (p.phase !== phase) {
      if (phase >= 0) t += PHASE_PAUSE;
      phase = p.phase;
    }
    t += GAP;
    return t;
  });
  const set = makeSet(boxesOf(c));
  scene.add(set.mesh);
  v = { set, pieces: c.pieces, at, t: 0, landed: c.pieces.map(() => false), done: false, camp: c };
  views.set(c, v);
  return v;
}

const m4 = new THREE.Matrix4(),
  from = new THREE.Vector3(),
  tp = new THREE.Vector3(),
  tq = new THREE.Quaternion(),
  ts = new THREE.Vector3();

function puff(x: number, y: number, z: number, n: number, r: number) {
  for (let k = 0; k < n; k++) {
    const a = (k / n) * Math.PI * 2;
    emit({
      x: x + Math.cos(a) * r,
      y: y + 0.2,
      z: z + Math.sin(a) * r,
      vx: Math.cos(a) * 2,
      vy: 0.9,
      vz: Math.sin(a) * 2,
      life: 0.8,
      size: 0.6,
      color: dust,
      alpha: 0.8,
      grow: [1, 2.4],
      drag: 2,
      fade: 0.5,
    });
  }
}

/** The camp's build: `live` plays it, otherwise it just stands. How long it takes, in s (0 with no build to watch). */
export function wakeCamp(c: Camp, live: boolean): number {
  const v = viewOf(c);
  if (!live) {
    v.done = true;
    draw(v.set, (k) => (v.pieces[k]!.phase === SCAFFOLD ? 0 : 1));
    return 0;
  }
  v.t = 0;
  v.done = false;
  v.landed.fill(false);
  return v.at[v.at.length - 1]! + FLY + SETTLE + 0.6;
}
export function sleepCamps() {
  for (const v of views.values()) {
    v.done = true;
    draw(v.set, () => 0);
  }
}

function updateBuild(v: View, dt: number) {
  if (v.done) return;
  v.t += dt;
  const { x: sx, z: sz } = v.camp.from ?? stopAt(v.camp.stop);
  from.set(sx, groundHeight(sx, sz) + 1, sz);
  const last = v.at[v.at.length - 1]!;
  v.pieces.forEach((p, k) => {
    const b = v.set.boxes[k]!;
    const u = (v.t - v.at[k]!) / FLY;
    if (u <= 0) return v.set.mesh.setMatrixAt(k, m4.makeScale(0, 0, 0));
    const f = Math.min(1, u);
    // a scaffold pole grows up out of the ground; it comes down once the roof is on
    if (p.phase === SCAFFOLD) {
      const down = (v.t - last - FLY) / 0.5;
      const g = Math.max(0, Math.min(f, 1 - down));
      m4.compose(tp.set(b.x, b.y, b.z), tq.identity(), ts.set(1, Math.max(1e-3, g), 1)).multiply(b.local);
      return v.set.mesh.setMatrixAt(k, g > 0 ? m4 : m4.makeScale(0, 0, 0));
    }
    const settle = u > 1 ? ring(((u - 1) * FLY) / SETTLE, 4, 0.3) : 0;
    tp.set(b.x, b.y, b.z).lerp(from, 1 - f);
    tp.y += arc(f) * FLY_H;
    if (u >= 1 && !v.landed[k]) {
      v.landed[k] = true;
      puff(b.x, b.y + p.y, b.z, 5, Math.min(2, p.w / 2));
      if (p.phase <= 2) thump(b.x, b.z);
      else clank(b.x, b.z);
    }
    m4.compose(tp, tq.identity(), ts.set(1, Math.max(1e-3, 1 - settle * 0.2), 1)).multiply(b.local);
    v.set.mesh.setMatrixAt(k, m4);
  });
  v.set.mesh.visible = true;
  v.set.mesh.instanceMatrix.needsUpdate = true;
  if (v.t > last + FLY + SETTLE + 0.6) {
    v.done = true;
    draw(v.set, (k) => (v.pieces[k]!.phase === SCAFFOLD ? 0 : 1));
  }
}

// ---------------------------------------------------------------- telegraphs: the smoke column and the stakes
const STAKE_EVERY = 7; // m
let stakes: BoxSet[] | null = null;
function buildStakes() {
  stakes = ROUTE.map((r) => {
    const dx = r.to[0]! - r.x,
      dz = r.to[1]! - r.z;
    const len = Math.hypot(dx, dz);
    const yaw = Math.atan2(dx, dz);
    const out: Box[] = [];
    for (let d = STAKE_EVERY; d < len - 2; d += STAKE_EVERY) {
      const x = r.x + (dx * d) / len + (dz / len) * 1.5,
        z = r.z + (dz * d) / len - (dx / len) * 1.5;
      out.push(box(x, z, place(0, 0, 0, 0.12, 1.4, 0.12, yaw), '#e8d9b0'));
      out.push(box(x, z, place(0.14, 1.05, 0, 0.3, 0.3, 0.04, yaw), '#ff7a2f'));
    }
    const set = makeSet(out);
    scene.add(set.mesh);
    return set;
  });
}

let smokeAcc = 0,
  millAcc = 0;
/** Each frame: builds under way, and the telegraphs for section `open` (`open` = ROUTE.length: the line is done). */
export function updateCamps(dt: number, open: number) {
  for (const v of views.values()) updateBuild(v, dt);
  if (!stakes) buildStakes();
  stakes!.forEach((s, k) => {
    const want = k === open ? 1 : 0;
    if (s.mesh.visible !== !!want) draw(s, () => want);
  });
  // The next destination's column of smoke, tall enough to see from the last stop.
  smokeAcc += dt * 9;
  if (open >= ROUTE.length) smokeAcc = Math.min(smokeAcc, 1);
  const p = stopAt(open + 1);
  const y = groundHeight(p.x, p.z);
  for (; smokeAcc >= 1 && open < ROUTE.length; smokeAcc--)
    emit({
      x: p.x + (Math.random() - 0.5) * 1.2,
      y: y + 0.4,
      z: p.z + (Math.random() - 0.5) * 1.2,
      vx: 0.5 + Math.random() * 0.5,
      vy: 7 + Math.random() * 1.5,
      vz: (Math.random() - 0.5) * 0.6,
      life: 8.5,
      size: 2,
      grow: [0.7, 5.5],
      alpha: 0.85,
      fade: 0.5,
      color: white,
      drag: 0.1,
    });
  // Working camps smoke too (the sawmill's stack).
  millAcc += dt * 2.4;
  for (; millAcc >= 1; millAcc--)
    for (const c of CAMPS) {
      const v = views.get(c);
      if (!v?.done || !c.stack || !v.set.mesh.visible) continue;
      const g = groundHeight(c.stack.x, c.stack.z);
      emit({
        x: c.stack.x,
        y: g + c.stack.y,
        z: c.stack.z,
        vx: 0.5,
        vy: 2.4,
        vz: 0,
        life: 4.5,
        size: 1,
        grow: [1, 3.4],
        alpha: 0.7,
        fade: 0.5,
        color: soot,
        drag: 0.2,
      });
    }
}
// ---------------------------------------------------------------- the frontier: buffer stop, jetty, a far island
let frontierBuilt = false;
export function buildFrontier() {
  if (frontierBuilt) return;
  frontierBuilt = true;
  const a = ROUTE[ROUTE.length - 1]!;
  const dx = end.x - a.x,
    dz = end.z - a.z;
  const len = Math.hypot(dx, dz);
  const ux = dx / len,
    uz = dz / len;
  const yaw = Math.atan2(ux, uz);
  const out: Box[] = [];
  // the buffer stop, past where the loco stands, and planks running on toward the sea
  const bx = end.x + ux * 6.5,
    bz = end.z + uz * 6.5;
  out.push(box(bx, bz, place(0, 0, 0, 2.2, 1.1, 0.5, yaw), '#c4453a'));
  for (let d = 9; d < 40; d += 2.2) {
    const x = end.x + ux * d,
      z = end.z + uz * d;
    out.push(box(x, z, place(0, Math.max(0.35, 0.4 - groundHeight(x, z)), 0, 3, 0.2, 1.8, yaw), '#8a6a48'));
  }
  const road = makeSet(out);
  scene.add(road.mesh);
  draw(road, () => 1);
  // The far island: flat colour with no fog, so it reads as a shape on the horizon straight ahead down the last leg.
  const mat = new THREE.MeshBasicNodeMaterial({ color: '#8fa6b8', fog: false });
  const ix = end.x + ux * 340,
    iz = end.z + uz * 340;
  const shapes: [number, number, number, number][] = [
    [0, 0, 90, 46],
    [-90, 30, 60, 24],
    [80, -30, 70, 30],
    [150, -60, 40, 14],
  ];
  for (const [ox, oz, r, h] of shapes) {
    const m = new THREE.Mesh(new THREE.ConeGeometry(r, h, 7), mat);
    m.position.set(ix + ox, h / 2 - 2, iz + oz);
    m.scale.z = 0.7;
    scene.add(m);
  }
}

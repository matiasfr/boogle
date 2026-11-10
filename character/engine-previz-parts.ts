// Train engine previz blockouts (docs/plans/engine-previz.md): pure part data, no three.js, so Node can check it.
// Inspection only: nothing in the game imports this. Engine frame: +z forward, +x across, y up from the rail line
// (the game's car origin; rail tops are at 0.16 m and the halt deck at 0.72 m).
export type V = readonly [number, number, number];
/** What a part belongs to. `body` is always drawn; the others are the upgrade states' separate meshes. */
export type Module = 'body' | 'cabNear' | 'boiler' | 'lashing' | 'speed' | 'steam' | 'wheels';
/** `M`: what the part belongs to (the passenger-car previz, character/car-previz-parts.ts, has its own modules). */
export type Part<M extends string = Module> =
  | { kind: 'box'; m: M; c: string; min: V; max: V; tilt?: number }
  | {
      kind: 'cyl';
      m: M;
      c: string;
      axis: 'x' | 'y' | 'z';
      at: V;
      len: number;
      r0: number;
      r1: number;
      seg: number;
    }
  | { kind: 'sphere'; m: M; c: string; at: V; r: number; sy: number; seg: number }
  | { kind: 'torus'; m: M; c: string; axis: 'y' | 'z'; at: V; r: number; tube: number; seg: number }
  | { kind: 'wheel'; m: 'wheels'; at: V; r: number };
export type EngineId = 'a' | 'b' | 'c';
/** The walk-in cab, in metres over the rail line: floor top, inner half width, its back and front, the roof's underside,
 * the doorway (both sides) and where Buddy and the driver stand. */
export type Cab = {
  floor: number;
  hxIn: number;
  hx: number;
  zBack: number;
  zFront: number;
  roofUnder: number;
  door: { z: [number, number]; top: number };
  buddy: V;
  driver: V;
};
/** `rear` and `front`: the frame's ends along z (buffers stand beyond them); `hx`, `hz` the body's half sizes. */
export type Candidate = {
  id: EngineId;
  name: string;
  scale: number;
  hx: number;
  hz: number;
  rear: number;
  front: number;
  parts: Part[];
  cab: Cab;
};
/** What a builder returns before the cab is fitted: its parts at the first previz's size and its old cab's place. */
type Unit = {
  id: EngineId;
  name: string;
  parts: Part[];
  hx: number;
  hz: number;
  cab: { hx: number; zBack: number; zFront: number; floor: number };
  /** How much longer than `hz` the frame runs ahead of the middle (the longer-boiler upgrade), in the unit's metres. */
  ahead?: number;
};

/** Buddy, measured in the asset stage from the game's body in its idle pose (its skinned vertices, hat and gear off): 1.59 m
 * tall, 0.91 m across the arms, 0.71 m front to back. `shoulders` is the full width, arms included. */
export const BUDDY = { height: 1.59, shoulders: 0.91 };
/** The player's collider (src/constants.ts: PLAYER_R 0.45, HEAD_OFFSET 0.8): 0.9 m across, 1.7 m tall. */
export const COLLIDER = { width: 0.9, height: 1.7 };
/** The little guy at the controls (docs/plans/home-station.md, from folk.ts): 0.99 m standing, his hat 0.58 m wide;
 * seated he is 0.9 m from seat to hat top, his head 0.39–0.84 m over the seat. He drives from a tall stool (owner,
 * 10 November: "the little guys can sit on stools to be higher"): 0.8 m puts his eyes about 1.4 m over the floor, in
 * the front windows (1.35–1.72 m) and over the boiler's back where it passes him. */
export const DRIVER = { height: 0.99, hat: 0.58, seated: 0.9, stool: 0.8 };
/** The owner's call (10 November): Buddy fits in the cab. Headroom over the taller of him and his collider, room beside the driver, a doorway. */
export const CAB_FIT = { headroom: 0.2, between: 0.1, door: 1.0, doorHead: 0.15, wall: 0.06 };
/** All three are scaled by the same factor, the size Home station's layout recommends and is sized beyond (1.5). */
export const SCALE = 1.25;

// The game's flat palette (src/proto/place/look-kit.ts, halts-view.ts, gold-rope.ts).
export const RED = '#e8392a',
  RUST = '#9a5a44',
  DARK = '#24262c',
  BRASS = '#d9a23a',
  DULL_BRASS = '#8f7a4e',
  GOLD_ROPE = '#d9a438',
  DOOR = '#3a3c42',
  GLASS = '#1d2430',
  STEAM = '#f2efe8';

type Parts = Part[];
const box = (p: Parts, m: Module, c: string, x: [number, number], y: [number, number], z: [number, number]) =>
  p.push({ kind: 'box', m, c, min: [x[0], y[0], z[0]], max: [x[1], y[1], z[1]] });
/** A box and its mirror across the engine's centre line; `x` is the +x side. */
const pair = (p: Parts, m: Module, c: string, x: [number, number], y: [number, number], z: [number, number]) => {
  box(p, m, c, x, y, z);
  box(p, m, c, [-x[1], -x[0]], y, z);
};
/** A cylinder along z from z0 to z1; `r1` is the front radius when it tapers. */
const cz = (p: Parts, m: Module, c: string, y: number, z: [number, number], r: number, seg = 20, x = 0) =>
  p.push({ kind: 'cyl', m, c, axis: 'z', at: [x, y, (z[0] + z[1]) / 2], len: z[1] - z[0], r0: r, r1: r, seg });
/** An upright cylinder from y0 to y1, radius r0 at the bottom and r1 at the top. */
const cy = (p: Parts, m: Module, c: string, z: number, y: [number, number], r0: number, r1 = r0, seg = 16, x = 0) =>
  p.push({ kind: 'cyl', m, c, axis: 'y', at: [x, (y[0] + y[1]) / 2, z], len: y[1] - y[0], r0, r1, seg });
const sphere = (p: Parts, m: Module, c: string, at: V, r: number, sy = 1) =>
  p.push({ kind: 'sphere', m, c, at, r, sy, seg: 16 });
const ring = (p: Parts, m: Module, c: string, axis: 'y' | 'z', at: V, r: number, tube: number) =>
  p.push({ kind: 'torus', m, c, axis, at, r, tube, seg: 24 });
const wheels = (p: Parts, zs: number[], r: number) => {
  for (const z of zs) for (const s of [-1, 1]) p.push({ kind: 'wheel', m: 'wheels', at: [s * 0.5, r + 0.15, z], r });
};
/** Buffers off one end: stocks and heads at y, face at `end` (signed: + front, − back). */
const buffers = (p: Parts, end: number, y = 0.62) => {
  const s = Math.sign(end),
    a = Math.abs(end);
  for (const x of [-0.55, 0.55]) {
    cz(p, 'body', DARK, y, s > 0 ? [a - 0.25, a - 0.03] : [-(a - 0.03), -(a - 0.25)], 0.09, 10, x);
    cz(p, 'body', DARK, y, s > 0 ? [a - 0.05, a] : [-a, -(a - 0.05)], 0.13, 14, x);
  }
};
/** The lashing (the boiler fit's mark, boiler-first-choice step 8): two gold rope rings 3 cm off the barrel and a knot
 * on top. `r` is the barrel's radius; the tube sits clear of it so the rings never touch the paint. */
const lashing = (p: Parts, y: number, r: number, zs: [number, number]) => {
  const tube = 0.035,
    rr = r + 0.03 + tube;
  for (const z of zs) ring(p, 'lashing', GOLD_ROPE, 'z', [0, y, z], rr, tube);
  box(p, 'lashing', GOLD_ROPE, [-0.08, 0.08], [y + rr - 0.04, y + rr + 0.08], [zs[1] - 0.07, zs[1] + 0.07]);
};
const steam = (p: Parts, x: number, top: number, z: number) => {
  sphere(p, 'steam', STEAM, [x, top + 0.25, z - 0.05], 0.14);
  sphere(p, 'steam', STEAM, [x, top + 0.5, z - 0.3], 0.19);
  sphere(p, 'steam', STEAM, [x, top + 0.82, z - 0.65], 0.25);
};
/** Every part scaled by `s` about the rail line's origin, except the gauge: wheels stay on the rails at ±0.5 m (their
 * radius scales, so they still touch the rail tops) and the side rods stay just outside them. */
function scaled(parts: readonly Part[], s: number): Part[] {
  const v = (a: V): V => [a[0] * s, a[1] * s, a[2] * s];
  const rodY = (y: number) => y * s - 0.15 * (s - 1); // follows the wheel centres, r·s + 0.15
  return parts.map((p): Part => {
    if (p.kind === 'wheel') return { ...p, at: [p.at[0], p.r * s + 0.15, p.at[2] * s], r: p.r * s };
    if (p.kind === 'box' && p.m === 'wheels')
      return { ...p, min: [p.min[0], rodY(p.min[1]), p.min[2] * s], max: [p.max[0], rodY(p.max[1]), p.max[2] * s] };
    if (p.kind === 'box') return { ...p, min: v(p.min), max: v(p.max) };
    if (p.kind === 'cyl') return { ...p, at: v(p.at), len: p.len * s, r0: p.r0 * s, r1: p.r1 * s };
    if (p.kind === 'sphere') return { ...p, at: v(p.at), r: p.r * s };
    return { ...p, at: v(p.at), r: p.r * s, tube: p.tube * s };
  });
}
/** Lengthen the engine behind z = `cut` by `d`: what lies behind moves back, what spans the cut (frame, footplate,
 * rods) grows back, and what is ahead (the boiler, whose back end becomes the backhead inside the cab) stays. */
function stretchedBack(parts: readonly Part[], cut: number, d: number): Part[] {
  if (d <= 0) return [...parts];
  return parts.map((p): Part => {
    if (p.kind === 'box') {
      if (p.max[2] <= cut + 1e-6)
        return { ...p, min: [p.min[0], p.min[1], p.min[2] - d], max: [p.max[0], p.max[1], p.max[2] - d] };
      if (p.min[2] < cut) return { ...p, min: [p.min[0], p.min[1], p.min[2] - d] };
      return p;
    }
    const back = p.kind === 'cyl' && p.axis === 'z' ? p.at[2] + p.len / 2 : p.at[2];
    return back <= cut ? { ...p, at: [p.at[0], p.at[1], p.at[2] - d] } : p;
  });
}
/** The walk-in cab: a floor on the footplate, side walls with a doorway at the back of each, a front wall with two
 * windows over the backhead, a back wall with one, a roof. The platform side's wall is `cabNear`, so a side view can
 * leave it out and look in. Walls are inset from each other's faces so no two faces share a plane. */
function walkInCab(p: Parts, c: Cab) {
  const { floor, hx, zBack, zFront, roofUnder, door } = c,
    w = CAB_FIT.wall,
    base = floor - 0.04;
  box(p, 'body', DARK, [-(hx - 0.04), hx - 0.04], [floor - 0.05, floor], [zBack + 0.02, zFront - 0.02]); // floor
  for (const side of [-1, 1]) {
    const m: Module = side > 0 ? 'cabNear' : 'body';
    const x: [number, number] = side > 0 ? [hx - w, hx] : [-hx, -(hx - w)];
    box(p, m, RED, x, [base, roofUnder], [zBack, door.z[0]]); // the post behind the doorway
    box(p, m, RED, x, [door.top, roofUnder], door.z); // over the doorway
    // The door, drawn shut (owner, 10 November: "side door closed so it's not visibly open from the side"): a panel
    // set 1 cm into the doorway, a small high window and a brass handle. Hinged on the post behind it.
    const dx: [number, number] = side > 0 ? [hx - 0.05, hx - 0.01] : [-(hx - 0.01), -(hx - 0.05)];
    box(p, m, RED, dx, [base + 0.02, door.top - 0.01], [door.z[0] + 0.005, door.z[1] - 0.005]);
    const dg: [number, number] = side > 0 ? [hx - 0.02, hx + 0.005] : [-(hx + 0.005), -(hx - 0.02)];
    box(p, m, GLASS, dg, [door.top - 0.5, door.top - 0.2], [door.z[0] + 0.3, door.z[1] - 0.3]);
    const dh: [number, number] = side > 0 ? [hx - 0.02, hx + 0.04] : [-(hx + 0.04), -(hx - 0.02)];
    box(p, m, BRASS, dh, [floor + 1.0, floor + 1.06], [door.z[1] - 0.2, door.z[1] - 0.1]);
    box(p, m, RED, x, [base, roofUnder], [door.z[1], zFront]); // ahead of it, with a window
    const gx: [number, number] = side > 0 ? [hx - 0.015, hx + 0.015] : [-hx - 0.015, -hx + 0.015];
    if (zFront - door.z[1] > 0.4)
      box(p, m, GLASS, gx, [roofUnder - 0.55, roofUnder - 0.18], [door.z[1] + 0.08, zFront - 0.1]);
    // A step under the doorway, halfway up from the halt deck (0.72 m).
    const step = (0.72 + floor) / 2;
    const sx: [number, number] = side > 0 ? [hx - 0.1, hx + 0.2] : [-hx - 0.2, -hx + 0.1];
    box(p, m, DARK, sx, [step - 0.04, step + 0.03], [door.z[0] + 0.1, door.z[1] - 0.1]);
  }
  const inner: [number, number] = [-(hx - 0.03), hx - 0.03];
  box(p, 'body', RED, inner, [base + 0.01, roofUnder - 0.005], [zFront - w, zFront - 0.01]); // front wall
  const wy: [number, number] = [roofUnder - 0.55, roofUnder - 0.18];
  pair(p, 'body', GLASS, [0.2, Math.min(0.62, hx - 0.2)], wy, [zFront - 0.025, zFront + 0.005]);
  box(p, 'body', RED, inner, [base + 0.01, roofUnder - 0.005], [zBack + 0.01, zBack + w]); // back wall
  box(p, 'body', GLASS, [-0.35, 0.35], wy, [zBack - 0.005, zBack + 0.025]);
  box(p, 'body', DARK, [-(hx + 0.1), hx + 0.1], [roofUnder - 0.01, roofUnder + 0.1], [zBack - 0.12, zFront + 0.12]);
}
/** Scale a builder's engine, lengthen it behind the cab until the cab holds Buddy, and fit the walk-in cab. */
function fitBuddy(u: Unit, s = SCALE): Candidate {
  const f = CAB_FIT;
  const hxIn = Math.max(u.cab.hx * s - f.wall, (BUDDY.shoulders + DRIVER.hat + 3 * f.between) / 2);
  const hx = hxIn + f.wall;
  const zFront = u.cab.zFront * s;
  // A 0.15 m post, the doorway, and 0.3 m of wall ahead of it (the backhead stands between the doorways).
  const old = (u.cab.zFront - u.cab.zBack) * s;
  const length = Math.max(old, 0.15 + f.door + 0.3);
  const d = length - old;
  const parts = stretchedBack(scaled(u.parts, s), zFront, d);
  const zBack = zFront - length;
  const floor = u.cab.floor * s + 0.02;
  // Over the taller of Buddy and his collider, so the physics fits too: 0.31 m over his head.
  const roofUnder = floor + Math.max(BUDDY.height, COLLIDER.height) + f.headroom;
  const doorZ: [number, number] = [zBack + 0.15, zBack + 0.15 + f.door];
  const cab: Cab = {
    floor,
    hxIn,
    hx,
    zBack,
    zFront,
    roofUnder,
    door: { z: doorZ, top: Math.min(roofUnder - 0.12, floor + Math.max(BUDDY.height, COLLIDER.height) + f.doorHead) },
    buddy: [hxIn - BUDDY.shoulders / 2 - f.between, floor, doorZ[0] + 0.4],
    driver: [-(hxIn - DRIVER.hat / 2 - f.between), floor, zFront - 0.6],
  };
  walkInCab(parts, cab);
  const front = (u.hz + (u.ahead ?? 0)) * s,
    rear = -(u.hz * s + d);
  return { id: u.id, name: u.name, scale: s, hx: Math.max(u.hx * s, hx), hz: (front - rear) / 2, rear, front, parts, cab };
}

/** A: the stubby toy at today's footprint (LOCO 1.6 × 3.0 m): two big drivers, a short fat boiler, a tall chimney. */
function stubby(): Unit {
  const p: Parts = [];
  wheels(p, [-0.75, 0.75], 0.38);
  pair(p, 'wheels', DARK, [0.63, 0.66], [0.48, 0.58], [-0.8, 0.8]); // the side rods
  box(p, 'body', DARK, [-0.4, 0.4], [0.3, 0.96], [-1.42, 1.42]); // inner frame
  box(p, 'body', DARK, [-0.8, 0.8], [0.94, 1.02], [-1.5, 1.5]); // footplate
  box(p, 'body', RED, [-0.8, 0.8], [0.45, 0.8], [1.38, 1.58]); // buffer beams
  box(p, 'body', RED, [-0.8, 0.8], [0.45, 0.8], [-1.58, -1.38]);
  buffers(p, 1.77);
  buffers(p, -1.77);

  pair(p, 'body', BRASS, [0.06, 0.42], [1.0, 1.12], [-0.2, -0.06]); // the empty saddles, as today's shell has
  pair(p, 'body', BRASS, [0.06, 0.42], [1.0, 1.12], [0.8, 0.94]);
  // The boiler: the fitted part, one mesh with its smokebox, chimney and dome.
  cz(p, 'boiler', RED, 1.5, [-0.7, 1.15], 0.5, 24);
  cz(p, 'boiler', DARK, 1.5, [1.0, 1.42], 0.53, 24);
  cz(p, 'boiler', DOOR, 1.5, [1.41, 1.45], 0.3, 20);
  cy(p, 'boiler', DARK, 1.2, [1.9, 2.4], 0.17, 0.21);
  cy(p, 'boiler', DARK, 1.2, [2.36, 2.46], 0.25, 0.25);
  sphere(p, 'boiler', BRASS, [0, 1.98, 0.35], 0.24, 0.8);
  lashing(p, 1.5, 0.5, [0.05, 0.75]);
  // Speed (parked): a brass band round the smokebox, a second dome and a brass chimney ring.
  ring(p, 'speed', BRASS, 'z', [0, 1.5, 1.08], 0.555, 0.03);
  pair(p, 'speed', BRASS, [0.79, 0.82], [0.92, 1.04], [-1.45, 1.45]); // a brass stripe down the footplate
  sphere(p, 'speed', BRASS, [0, 1.95, -0.3], 0.18, 0.85);
  ring(p, 'speed', BRASS, 'y', [0, 2.46, 1.2], 0.25, 0.03);
  steam(p, 0, 2.46, 1.2);
  return {
    id: 'a',
    name: 'Stubby toy',
    hx: 0.8,
    hz: 1.5,
    parts: p,
    cab: { hx: 0.75, zBack: -1.46, zFront: -0.5, floor: 1.02 },
  };
}

/** B: a bit longer (1.7 × 4.2 m), a proper long boiler with a steam dome, three drivers and a pony truck. */
function longer(): Unit {
  const p: Parts = [];
  wheels(p, [-1.15, -0.25, 0.65], 0.36);
  wheels(p, [1.55], 0.24);
  pair(p, 'wheels', DARK, [0.63, 0.66], [0.46, 0.56], [-1.2, 0.7]);
  box(p, 'body', DARK, [-0.4, 0.4], [0.3, 0.96], [-2.0, 2.0]);
  box(p, 'body', DARK, [-0.85, 0.85], [0.94, 1.02], [-2.1, 2.1]);
  pair(p, 'body', RED, [0.84, 0.87], [0.86, 1.0], [-2.05, 2.05]); // the valance under the footplate's edge
  box(p, 'body', RED, [-0.85, 0.85], [0.45, 0.82], [1.98, 2.18]);
  box(p, 'body', RED, [-0.85, 0.85], [0.45, 0.82], [-2.18, -1.98]);
  buffers(p, 2.37);
  buffers(p, -2.37);

  pair(p, 'body', BRASS, [0.06, 0.44], [1.0, 1.14], [-0.6, -0.46]);
  pair(p, 'body', BRASS, [0.06, 0.44], [1.0, 1.14], [0.9, 1.04]);
  cz(p, 'boiler', RED, 1.55, [-1.1, 1.55], 0.55, 24);
  cz(p, 'boiler', DARK, 1.55, [1.4, 1.95], 0.58, 24);
  cz(p, 'boiler', DOOR, 1.55, [1.94, 1.98], 0.34, 20);
  cy(p, 'boiler', DARK, 1.65, [2.0, 2.55], 0.15, 0.19);
  cy(p, 'boiler', DARK, 1.65, [2.5, 2.6], 0.23, 0.23);
  sphere(p, 'boiler', BRASS, [0, 2.07, 0.5], 0.27, 0.85);
  cy(p, 'boiler', BRASS, -0.85, [2.0, 2.25], 0.06, 0.06, 10); // safety valve
  lashing(p, 1.55, 0.55, [-0.15, 1.05]);
  ring(p, 'speed', BRASS, 'z', [0, 1.55, 1.45], 0.605, 0.03);
  pair(p, 'speed', BRASS, [0.86, 0.89], [0.93, 1.03], [-2.0, 2.0]);
  sphere(p, 'speed', BRASS, [0, 2.02, -0.4], 0.2, 0.85);
  ring(p, 'speed', BRASS, 'y', [0, 2.6, 1.65], 0.235, 0.03);
  for (const x of [-0.6, 0.6]) cz(p, 'speed', BRASS, 1.75, [-0.9, 1.35], 0.025, 8, x); // handrails
  steam(p, 0, 2.6, 1.65);
  return {
    id: 'b',
    name: 'Longer, proper boiler',
    hx: 0.85,
    hz: 2.1,
    parts: p,
    cab: { hx: 0.8, zBack: -2.06, zFront: -0.95, floor: 1.02 },
  };
}

/** C: a tank engine (1.7 × 3.6 m): side tanks either side of a slimmer boiler, a coal bunker, a cowcatcher. The
 * empty slot between the tanks is where the boiler is fitted. */
function tank(): Unit {
  const p: Parts = [];
  wheels(p, [-0.9, 0, 0.9], 0.32);
  pair(p, 'wheels', DARK, [0.63, 0.66], [0.42, 0.52], [-0.95, 0.95]);
  box(p, 'body', DARK, [-0.4, 0.4], [0.3, 0.86], [-1.7, 1.7]);
  box(p, 'body', DARK, [-0.85, 0.85], [0.84, 0.92], [-1.8, 1.8]);
  box(p, 'body', RED, [-0.85, 0.85], [0.42, 0.76], [1.68, 1.88]);
  box(p, 'body', RED, [-0.85, 0.85], [0.42, 0.76], [-1.88, -1.68]);
  buffers(p, 2.07, 0.6);
  buffers(p, -2.07, 0.6);
  // The cowcatcher: five slats leaning forward under the buffers.
  for (const x of [-0.5, -0.25, 0, 0.25, 0.5])
    p.push({ kind: 'box', m: 'body', c: DARK, min: [x - 0.05, 0.14, 1.82], max: [x + 0.05, 0.2, 2.28], tilt: 0.6 });
  pair(p, 'body', RED, [0.42, 0.84], [0.9, 1.7], [-0.55, 1.2]); // side tanks
  for (const x of [-0.63, 0.63]) cy(p, 'body', BRASS, 0.9, [1.68, 1.76], 0.1, 0.1, 12, x); // filler caps
  box(p, 'body', RED, [-0.74, 0.74], [0.88, 1.5], [-1.78, -1.4]); // bunker
  box(p, 'body', DARK, [-0.66, 0.66], [1.45, 1.6], [-1.74, -1.44]); // coal

  pair(p, 'body', BRASS, [0.06, 0.4], [0.9, 1.02], [-0.2, -0.06]);
  pair(p, 'body', BRASS, [0.06, 0.4], [0.9, 1.02], [0.9, 1.04]);
  cz(p, 'boiler', RED, 1.4, [-0.6, 1.25], 0.42, 24);
  cz(p, 'boiler', DARK, 1.4, [1.15, 1.6], 0.45, 24);
  cz(p, 'boiler', DOOR, 1.4, [1.59, 1.63], 0.28, 20);
  cy(p, 'boiler', DARK, 1.38, [1.7, 2.3], 0.14, 0.18);
  cy(p, 'boiler', DARK, 1.38, [2.26, 2.36], 0.21, 0.21);
  sphere(p, 'boiler', BRASS, [0, 1.8, 0.35], 0.22, 0.9);
  lashing(p, 1.4, 0.42, [0.0, 0.8]);
  ring(p, 'speed', BRASS, 'z', [0, 1.4, 1.2], 0.475, 0.025);
  pair(p, 'speed', BRASS, [0.845, 0.875], [0.82, 0.94], [-1.75, 1.75]);
  sphere(p, 'speed', BRASS, [0, 1.75, -0.25], 0.16, 0.9);
  ring(p, 'speed', BRASS, 'y', [0, 2.36, 1.38], 0.21, 0.025);
  pair(p, 'speed', BRASS, [0.83, 0.86], [1.3, 1.36], [-0.5, 1.15]); // brass tank bands
  steam(p, 0, 2.36, 1.38);
  return {
    id: 'c',
    name: 'Tank engine',
    hx: 0.85,
    hz: 1.8,
    parts: p,
    cab: { hx: 0.78, zBack: -1.42, zFront: -0.5, floor: 0.92 },
  };
}

export const CANDIDATES: Record<EngineId, Candidate> = {
  a: fitBuddy(stubby()),
  b: fitBuddy(longer()),
  c: fitBuddy(tank()),
};

/** How much the longer-boiler upgrade lengthens A's frame, in A's unit metres: 0.4 (0.5 m built) takes the frame to
 * 4.5 m, the longest the layout tests allow (Home's island deck and the Pier's track layer, 1.5× today's engine). */
export const LONG_AHEAD = 0.4;
/** The longer-boiler upgrade (owner, 10 November: "longer boiler is an upgrade along the upgrade path"): A's cab, chassis
 * and drivers, its frame lengthened ahead of the drivers, B's fatter boiler with its steam dome and safety valve, and
 * B's pony truck in the new length. Only the boiler, its lashing and the frame change. */
function longBoilerA(): Unit {
  const a = stubby(),
    d = LONG_AHEAD,
    cut = 1.2; // ahead of the front drivers, behind the buffer beam
  const p: Parts = a.parts
    .filter((q) => !['boiler', 'lashing', 'speed', 'steam'].includes(q.m))
    .map((q): Part => {
      if (q.kind === 'box') {
        if (q.min[2] >= cut) return { ...q, min: [q.min[0], q.min[1], q.min[2] + d], max: [q.max[0], q.max[1], q.max[2] + d] };
        if (q.max[2] > cut) return { ...q, max: [q.max[0], q.max[1], q.max[2] + d] };
        return q;
      }
      const front = q.kind === 'cyl' && q.axis === 'z' ? q.at[2] - q.len / 2 : q.at[2];
      return front >= cut ? { ...q, at: [q.at[0], q.at[1], q.at[2] + d] } : q;
    });
  wheels(p, [1.5], 0.24); // the pony truck
  cz(p, 'boiler', RED, 1.55, [-0.7, 1.55], 0.55, 24);
  cz(p, 'boiler', DARK, 1.55, [1.4, 1.82], 0.58, 24);
  cz(p, 'boiler', DOOR, 1.55, [1.81, 1.85], 0.34, 20);
  cy(p, 'boiler', DARK, 1.6, [2.0, 2.55], 0.15, 0.19);
  cy(p, 'boiler', DARK, 1.6, [2.5, 2.6], 0.23, 0.23);
  sphere(p, 'boiler', BRASS, [0, 2.07, 0.6], 0.27, 0.85); // steam dome
  sphere(p, 'boiler', BRASS, [0, 2.02, -0.15], 0.18, 0.85); // sand dome
  lashing(p, 1.55, 0.55, [0.2, 1.05]);
  steam(p, 0, 2.6, 1.6);
  return { ...a, name: 'Stubby toy, longer boiler', parts: p, ahead: d };
}
/** A with the longer boiler fitted: the same cab, scaled and fitted to Buddy as A is. */
export const A_LONG = fitBuddy(longBoilerA());

/** The upgrade states the plans name, and the modules each one draws. `twin` is two boiler-state engines coupled. */
export const STATES = [
  { id: 'base', label: 'Old train: no boiler, empty saddles, rust', modules: ['body', 'wheels'] },
  {
    id: 'boiler',
    label: 'Boiler fitted: boiler, gold lashing, steam',
    modules: ['body', 'wheels', 'boiler', 'lashing', 'steam'],
  },
  {
    id: 'long',
    label: 'Longer boiler (A_LONG): the frame 0.5 m longer, B’s boiler, a pony truck',
    modules: ['body', 'wheels', 'boiler', 'lashing', 'steam'],
  },
  {
    id: 'speed',
    label: 'Speed (parked): brass band, second dome',
    modules: ['body', 'wheels', 'boiler', 'lashing', 'steam', 'speed'],
  },
  {
    id: 'twin',
    label: 'Second engine (parked): two coupled',
    modules: ['body', 'wheels', 'boiler', 'lashing', 'steam'],
  },
] as const satisfies readonly { id: string; label: string; modules: readonly Module[] }[];
export type StateId = (typeof STATES)[number]['id'];

/** Triangles three.js builds for one part (Box 12, Cylinder 4·seg, Sphere seg·(2·seg/2 − 2), Torus 2·6·seg). */
export const TORUS_RADIAL = 6;
export function triangles(part: Part<string>, wheelTriangles = 0) {
  if (part.kind === 'box') return 12;
  if (part.kind === 'cyl') return 4 * part.seg;
  if (part.kind === 'sphere') return part.seg * (part.seg - 2);
  if (part.kind === 'torus') return 2 * TORUS_RADIAL * part.seg;
  return wheelTriangles;
}

/** Axis-aligned faces facing the same way, in the same plane, overlapping: the z-fighting the owner saw where the red
 * cab met its dark base (both boxes ended at z −1.5 and −0.5 in today's shell). Boxes and cylinder end caps only;
 * tilted boxes, spheres and rings can't share a plane with an axis-aligned face. */
export function coplanarFaces(parts: readonly Part<string>[], eps = 0.002) {
  type Face = { i: number; axis: 0 | 1 | 2; sign: 1 | -1; at: number; lo: [number, number]; hi: [number, number] };
  const faces: Face[] = [];
  const other = (axis: 0 | 1 | 2) => [0, 1, 2].filter((a) => a !== axis) as [number, number];
  parts.forEach((p, i) => {
    let min: V, max: V, axes: (0 | 1 | 2)[];
    if (p.kind === 'box' && !p.tilt) [min, max, axes] = [p.min, p.max, [0, 1, 2]];
    else if (p.kind === 'cyl') {
      const a = ({ x: 0, y: 1, z: 2 } as const)[p.axis],
        r = Math.max(p.r0, p.r1);
      const lo = [...p.at] as [number, number, number],
        hi = [...p.at] as [number, number, number];
      for (const k of other(a)) [lo[k], hi[k]] = [p.at[k]! - r, p.at[k]! + r];
      [lo[a], hi[a]] = [p.at[a]! - p.len / 2, p.at[a]! + p.len / 2];
      [min, max, axes] = [lo, hi, [a]];
    } else return;
    for (const axis of axes) {
      const [u, v] = other(axis);
      for (const sign of [-1, 1] as const)
        faces.push({
          i,
          axis,
          sign,
          at: sign > 0 ? max[axis]! : min[axis]!,
          lo: [min[u]!, min[v]!],
          hi: [max[u]!, max[v]!],
        });
    }
  });
  const hits: string[] = [];
  for (let a = 0; a < faces.length; a++)
    for (let b = a + 1; b < faces.length; b++) {
      const f = faces[a]!,
        g = faces[b]!;
      if (f.i === g.i || f.axis !== g.axis || f.sign !== g.sign || Math.abs(f.at - g.at) > eps) continue;
      const du = Math.min(f.hi[0], g.hi[0]) - Math.max(f.lo[0], g.lo[0]),
        dv = Math.min(f.hi[1], g.hi[1]) - Math.max(f.lo[1], g.lo[1]);
      if (du > 1e-4 && dv > 1e-4)
        hits.push(`parts ${f.i} and ${g.i}: ${'xyz'[f.axis]}=${f.at} (${f.sign > 0 ? '+' : '−'})`);
    }
  return hits;
}

/** Overall extents of the modules a state draws. */
export function extents(c: Candidate, modules: readonly Module[]) {
  const min = [Infinity, Infinity, Infinity],
    max = [-Infinity, -Infinity, -Infinity];
  const grow = (lo: V, hi: V) =>
    lo.forEach((_, k) => ((min[k] = Math.min(min[k]!, lo[k]!)), (max[k] = Math.max(max[k]!, hi[k]!))));
  for (const p of c.parts) {
    if (!modules.includes(p.m)) continue;
    if (p.kind === 'box') grow(p.min, p.max);
    else if (p.kind === 'wheel')
      grow([p.at[0] - 0.06, p.at[1] - p.r, p.at[2] - p.r], [p.at[0] + 0.06, p.at[1] + p.r, p.at[2] + p.r]);
    else {
      const r = p.kind === 'cyl' ? Math.max(p.r0, p.r1) : p.kind === 'torus' ? p.r + p.tube : p.r;
      const h = p.kind === 'cyl' ? p.len / 2 : r;
      const e = [r, r, r];
      if (p.kind === 'cyl') e[{ x: 0, y: 1, z: 2 }[p.axis]] = h;
      grow([p.at[0] - e[0]!, p.at[1] - e[1]!, p.at[2] - e[2]!], [p.at[0] + e[0]!, p.at[1] + e[1]!, p.at[2] + e[2]!]);
    }
  }
  return { min, max };
}

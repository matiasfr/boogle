// Read-only R1 feasibility probe, 16 November 2026. No production geometry is changed.
// node --import ./dev/sim/hooks.ts dev/level/rider-coach-probe.ts
// Sections: `candidate` (the R1 builder's pinned relay candidate, unchanged), `noRelay` (R2b's coach train at s 21.65
// on today's track, planner's revision), `solves` (other exact-closing relays), `rack` (Q2's depot rack placements on
// its 10 m haul circle against the full criteria), `growth` (Home for one or two cars more than the coach train) and
// `cart` (when the depot cart and line 2's trains coexist).
// Candidate closes the four constraints (x, z, heading, length) at the original line's s 89;
// right radius is free, left radius 18 m. LEG closes x, z and heading with both radii 15 m.
import {
  AXIS,
  BUFFERS,
  HEADS,
  ISLAND,
  ISLAND_A,
  ISLAND_C,
  LEG,
  ROAD2_S,
  axisPoint,
  march,
  roadAt,
  type Seg,
  type XZ,
} from '../../src/place/home-station.ts';
import { LINES, LINKS, CART, FORMATION, lineAt, offsetLat, railY, type Line } from '../../src/place/layout.ts';
import { frameBesideLine, stationColliders, type FrameAt } from '../../src/place/spatial-station.ts';
import { TREE_SOURCES } from '../../src/place/tree-sources.ts';
import { H } from '../../src/place/terrain.ts';
import { deckAt, deckGap, type Deck } from '../../src/entities/railway/car-spacing.ts';
import { ENGINE, ENGINE_LONG_AHEAD } from '../../src/entities/railway/engine.ts';
import { TRAIN_OFFSETS } from '../../src/entities/railway/cars.ts';
import { measure } from './track-continuity.ts';
import { buildSeedWorld } from '../../src/sim/railway-seeds.ts';
import { boiler, cart as cartRow, rail } from '../../src/sim/railway-rows.ts';
import { CART_PHASE, CART_ROAD, cartAlong, cartEnd } from '../../src/sim/railway-cart.ts';
import { QJob } from '../../src/sim/railway-components.ts';
import { qjobId } from '../../src/sim/railway-queries.ts';
import { tracks } from './rail-network.ts';

const head: Seg[] = [
  { len: 28.4 },
  { len: 20.512863866667477, r: 18.936389124222153, side: 1 },
  { len: 26.858309330563564 },
  { len: 13.228826802768955, r: 18, side: -1 },
];
const leg: Seg[] = [
  { len: 8.233888848501495, r: 15, side: -1 },
  { len: 4.982128116635859 },
  { len: 24.43434785593248, r: 15, side: 1 },
];
const length = (segs: Seg[]) => segs.reduce((n, s) => n + s.len, 0);
const distance = (a: XZ, b: XZ) => Math.hypot(a.x - b.x, a.z - b.z);
const blank = () => ({ x: 0, z: 0, ux: 0, uz: 0 });
const old = LINES.east;
const line: Line = { ...old, xs: Float32Array.from(old.xs), zs: Float32Array.from(old.zs) };
for (let s = 0; s <= 89; s++) {
  const p = march(HEADS[1].start, head, s);
  line.xs[s] = p.x;
  line.zs[s] = p.z;
}
const from = roadAt(0, 54),
  start = { ...from, bearing: from.bearing + 180 },
  to = 29.4,
  legLen = length(leg),
  legEnd = 142 + legLen,
  forge = legEnd + to;
const target = lineAt(old, 89, blank());
const end = march(HEADS[1].start, head, 89);
const join = {
  positionError: distance(end, target),
  headingError: Math.abs(end.bearing - (Math.atan2(target.ux, -target.uz) * 180) / Math.PI),
  length: length(head),
  legError: distance(march(start, leg, legLen), march(HEADS[1].start, head, to)),
};
if (join.positionError > 0.03 || join.headingError > 0.5 || join.legError > 0.001)
  throw new Error('The pinned candidate no longer closes on this source tree');

const baseline = tracks().find((t) => t.id === 'line2-up')!;
const beside = (l: typeof line, s: number) => {
  const p = lineAt(l, s, blank()),
    lat = offsetLat(FORMATION.quarry, s) ?? 0;
  return { x: p.x - p.uz * lat + 1000, z: p.z + p.ux * lat, s };
};
const proposed = { ...baseline, pts: baseline.pts.map((p) => ({ ...p, ...beside(line, p.s) })) };
const trackAt = (s: number, out: XZ) => Object.assign(out, lineAt(line, s, blank()));
// The cart view centres on its road point, with heading from the 2.2 m axle chord; deckAt centres a train on its chord.
const cartAt = (d: number) =>
  d < 142
    ? lineAt(LINES.north, 196 - d, blank())
    : d < legEnd
      ? march(start, leg, d - 142)
      : lineAt(line, forge - d, blank());
function cartDeck(d: number): Deck {
  const a = cartAt(Math.max(0, d - 1.1)),
    b = cartAt(Math.min(forge, d + 1.1));
  return { ...cartAt(d), yaw: Math.atan2(b.x - a.x, b.z - a.z), hx: CART.hx, back: CART.hz, front: CART.hz };
}
function sweep(box: Deck) {
  let first: { d: number; gap: number } | null = null;
  let min = { gap: Infinity, d: 0 };
  for (let d = 142; d <= forge; d += 0.25) {
    const gap = deckGap(cartDeck(d), box);
    if (gap < 0.25 && !first) first = { d, gap };
    if (gap < min.gap) min = { gap, d };
  }
  return { firstBelowQuarterMetre: first, min, atLegEnd: deckGap(cartDeck(legEnd), box) };
}
const trainRows = [18.25, 21.65].map((stop) => {
  const engine = deckAt(
    trackAt,
    stop + TRAIN_OFFSETS[0]! + ENGINE_LONG_AHEAD / 2,
    { d: 0, hx: ENGINE.hx, back: ENGINE.hz + ENGINE_LONG_AHEAD / 2, front: ENGINE.hz + ENGINE_LONG_AHEAD / 2 },
    { x: 0, z: 0, yaw: 0, hx: 0, back: 0, front: 0 },
  );
  return { stop, ...sweep(engine) };
});
const spec = LINKS[1]!.stations[1]!;
const frame = frameBesideLine(spec, line, 1),
  oldFrame = frameBesideLine(spec, old, 1);
const rack: Deck = {
  x: frame.x - 1000 - Math.sin(frame.yaw) * 6 - Math.cos(frame.yaw) * spec.side * 8,
  z: frame.z - Math.cos(frame.yaw) * 6 + Math.sin(frame.yaw) * spec.side * 8,
  yaw: frame.yaw - Math.PI / 2,
  hx: 1.2,
  back: 0.87,
  front: 0.87,
};
const posts = [-1.1, 1.1].flatMap((x) =>
  [-0.8, 0.8].map((z) => ({
    ...rack,
    x: rack.x + Math.cos(rack.yaw) * x + Math.sin(rack.yaw) * z,
    z: rack.z - Math.sin(rack.yaw) * x + Math.cos(rack.yaw) * z,
    hx: 0.07,
    back: 0.07,
    front: 0.07,
  })),
);
const dense = (l: typeof line) => Array.from({ length: 6001 }, (_, i) => beside(l, 34 + i / 100));
const nearest = (p: XZ, pts: (XZ & { s: number })[]) =>
  pts.reduce((best, q) => (distance(p, q) < best.d ? { d: distance(p, q), s: q.s } : best), { d: Infinity, s: 0 });
const moved: (XZ & { s: number })[] = [];
// Smallest 0.1-degree change around the same 10 m haul circle that clears the cart's plan envelope.
// This is an alternative to investigate, not a full-stock/static-world clearance certificate.
let rackAlternative: { degrees: number; move: number; x: number; z: number; gap: number } | null = null;
const rx = rack.x - (frame.x - 1000),
  rz = rack.z - frame.z;
for (let tenth = 1; tenth <= 900 && !rackAlternative; tenth++)
  for (const sign of [-1, 1]) {
    const theta = (sign * tenth * Math.PI) / 1800;
    const candidate = {
      ...rack,
      x: frame.x - 1000 + rx * Math.cos(theta) - rz * Math.sin(theta),
      z: frame.z + rx * Math.sin(theta) + rz * Math.cos(theta),
    };
    const gap = sweep(candidate).min.gap;
    if (gap >= 0.25) {
      rackAlternative = {
        degrees: (sign * tenth) / 10,
        move: distance(rack, candidate),
        x: candidate.x + 1000,
        z: candidate.z,
        gap,
      };
      break;
    }
  }
let maxMove = { d: 0, s: 0, dx: 0, dz: 0 };
for (let s = 28; s <= 89; s += 0.25) {
  const a = lineAt(old, s, blank()),
    b = lineAt(line, s, blank()),
    d = distance(a, b);
  if (d > maxMove.d) maxMove = { d, s, dx: b.x - a.x, dz: b.z - a.z };
  moved.push({ x: b.x + 1000, z: b.z, s });
  if (s >= 34) moved.push(beside(line, s));
}
const candidate = {
  candidateOnly: true,
  head,
  leg,
  join,
  legLength: legLen,
  oldLegLength: LEG.len,
  forge,
  pinnedForgeCm: Math.round(forge * 100),
  legToTurnout: FORMATION.quarry.from - to,
  baselineUpRadius: measure(baseline).row.minRadius,
  proposedUpRadius: measure(proposed).row.minRadius,
  proposedUpRadiusAt: measure(proposed).row.minRadiusAt,
  maxMove,
  trainRows,
  frame: {
    old: oldFrame,
    proposed: frame,
    move: distance(frame, oldFrame),
    oldUpDistance: nearest(oldFrame, dense(old)),
    proposedUpDistance: nearest(frame, dense(line)),
    sameStationUpDistance: distance(frame, beside(line, 40.5)),
    fullOffsetDistance: 7.5 - 4,
  },
  rack: {
    ...rack,
    haul: distance({ x: frame.x - 1000, z: frame.z }, rack),
    body: sweep(rack),
    posts: posts.map(sweep),
    ground: H(rack.x + 1000, rack.z),
    railAtLegStart: railY(LINES.north, 54),
    railAtLegEnd: railY(line, to),
  },
  rackAlternative,
  nearestTrees: TREE_SOURCES.filter((t) => !t.cleared)
    .map((t) => ({ id: t.index, ...nearest(t, moved) }))
    .sort((a, b) => a.d - b.d)
    .slice(0, 3),
};

// ---------------------------------------------------------------- the planner's revision (16 November), read-only
const deg = (r: number) => (r * 180) / Math.PI;
const wrap = (d: number) => ((d + 540) % 360) - 180;
const bearingOf = (p: { ux: number; uz: number }) => deg(Math.atan2(p.ux, -p.uz));
/** Newton on residuals `f` from `x0`, numeric Jacobian; throws if it does not close. */
function newton(f: (x: number[]) => number[], x0: number[], tol = 1e-9) {
  let x = x0.slice();
  for (let it = 0; it < 80; it++) {
    const r = f(x);
    if (Math.hypot(...r) < tol) return x;
    const J = x.map((_, j) => {
      const h = 1e-6,
        xp = x.slice();
      xp[j]! += h;
      return f(xp).map((v, i) => (v - r[i]!) / h);
    });
    // Solve J^T-columns system A dx = -r with A[i][j] = J[j][i].
    const n = x.length,
      A = r.map((_, i) => [...x.map((__, j) => J[j]![i]!), -r[i]!]);
    for (let c = 0; c < n; c++) {
      let p = c;
      for (let k = c + 1; k < n; k++) if (Math.abs(A[k]![c]!) > Math.abs(A[p]![c]!)) p = k;
      [A[c], A[p]] = [A[p]!, A[c]!];
      for (let k = 0; k < n; k++)
        if (k !== c) {
          const m = A[k]![c]! / A[c]![c]!;
          for (let j = c; j <= n; j++) A[k]![j]! -= m * A[c]![j]!;
        }
    }
    x = x.map((v, i) => v + A[i]![n]! / A[i]![i]!);
  }
  throw new Error('no closure');
}
const relaid = (h: Seg[], J: number): Line => {
  const l: Line = { ...old, xs: Float32Array.from(old.xs), zs: Float32Array.from(old.zs) };
  for (let s = 0; s <= J; s++) {
    const p = march(HEADS[1].start, h, s);
    l.xs[s] = p.x;
    l.zs[s] = p.z;
  }
  return l;
};
/** A head of `straight` m, right arc (radius solved), straight, left arc of radius `r2`, closing on the old line at J. */
function solveHead(straight: number, J: number, r2: number) {
  const t = lineAt(old, J, blank()),
    tb = bearingOf(t);
  const segs = (x: number[]): Seg[] => [
    { len: straight },
    { len: x[1]!, r: x[0]!, side: 1 },
    { len: J - straight - x[1]! - x[2]! },
    { len: x[2]!, r: r2, side: -1 },
  ];
  const x = newton(
    (x) => {
      const p = march(HEADS[1].start, segs(x), J);
      return [p.x - t.x, p.z - t.z, wrap(p.bearing - tb) / 10];
    },
    [19, 20, 13],
  );
  const h = segs(x);
  if (h.some((g) => g.len <= 0 || (g.r !== undefined && g.r < 0))) throw new Error('degenerate');
  return h;
}
function solveLeg(l: Line, landing: number) {
  const tgt = (() => {
    const p = lineAt(l, landing, blank());
    return { ...p, bearing: bearingOf(p) };
  })();
  const segs = (x: number[]): Seg[] => [
    { len: x[0]!, r: 15, side: -1 },
    { len: x[1]! },
    { len: x[2]!, r: 15, side: 1 },
  ];
  const x = newton(
    (x) => {
      const p = march(start, segs(x), x[0]! + x[1]! + x[2]!);
      return [p.x - tgt.x, p.z - tgt.z, wrap(p.bearing + 180 - tgt.bearing) / 10];
    },
    [8, 5, 24],
  );
  return segs(x);
}
const upOf = (l: Line) => ({ ...baseline, pts: baseline.pts.map((p) => ({ ...p, ...beside(l, p.s) })) });
const standingTrees = TREE_SOURCES.filter((t) => !t.cleared);
/** What one relay does: track movement, curvature, the nearest standing trees, Q2's frame and the cart's distance. */
function relayFacts(h: Seg[], J: number, landing: number) {
  const l = relaid(h, J),
    lg = solveLeg(l, landing);
  let mx = { d: 0, s: 0 };
  const pts: (XZ & { s: number })[] = [];
  for (let s = 25; s <= J; s += 0.25) {
    const a = lineAt(old, s, blank()),
      b = lineAt(l, s, blank());
    if (distance(a, b) > mx.d) mx = { d: distance(a, b), s };
    pts.push({ x: b.x + 1000, z: b.z, s });
    if (s >= 34) pts.push(beside(l, s));
  }
  const f = frameBesideLine(spec, l, 1);
  return {
    straight: h[0]!.len,
    join: J,
    rightRadius: h[1]!.r,
    leftRadius: h[3]!.r,
    maxMove: mx,
    upRadius: measure(upOf(l)).row.minRadius,
    downRadius: Math.min(h[1]!.r!, h[3]!.r!),
    trees: standingTrees
      .map((t) => ({ id: t.index, ...nearest(t, pts) }))
      .sort((a, b) => a.d - b.d)
      .slice(0, 2),
    frameMove: distance(f, oldFrame),
    frameToUp: nearest(f, dense(l)).d,
    legLength: length(lg),
    forgeCm: Math.round((142 + length(lg) + landing) * 100),
    line: l,
    leg: lg,
  };
}
const solves = [] as ReturnType<typeof relayFacts>[];
for (const J of [89, 90, 91, 92, 94, 96])
  for (const r2 of [18, 20, 22, 25])
    try {
      solves.push(relayFacts(solveHead(28.4, J, r2), J, to));
    } catch {
      // No exact closure for this pair.
    }

// ---------------------------------------------------------------- R2b's coach train on today's track (no relay)
const prodAt = (s: number, out: XZ) => Object.assign(out, lineAt(old, s, blank()));
const longEngine = (at: (s: number, out: XZ) => XZ, stop: number) =>
  deckAt(
    at,
    stop + TRAIN_OFFSETS[0]! + ENGINE_LONG_AHEAD / 2,
    { d: 0, hx: ENGINE.hx, back: ENGINE.hz + ENGINE_LONG_AHEAD / 2, front: ENGINE.hz + ENGINE_LONG_AHEAD / 2 },
    { x: 0, z: 0, yaw: 0, hx: 0, back: 0, front: 0 },
  );
const sideOf = (s: number, lat: number) => {
  const p = roadAt(1, s),
    b = (p.bearing * Math.PI) / 180;
  return { x: p.x + Math.cos(b) * lat, z: p.z + Math.sin(b) * lat, yaw: Math.atan2(Math.sin(b), -Math.cos(b)) };
};
// 16 Nov R1b: home-station-view.ts uses station-axis yaw, not the curved road tangent.
// Tangent pose previously measured 1.1293370765247293 m; real view pose is 1.1341593429538008 m.
const lever = { ...sideOf(LEG.to + 1.5, 2.4), yaw: Math.atan2(AXIS.d.x, AXIS.d.z) };
const yawAxis = Math.atan2(AXIS.d.x, AXIS.d.z);
const islandMid = axisPoint((BUFFERS[0] + ISLAND_A.foot) / 2, ISLAND_C);
const island: Deck = {
  ...islandMid,
  yaw: yawAxis,
  hx: ISLAND.width / 2,
  back: (ISLAND_A.foot - BUFFERS[0]) / 2,
  front: (ISLAND_A.foot - BUFFERS[0]) / 2,
};
const coachEngine = longEngine(prodAt, 21.65);
const noseS = 21.65 + TRAIN_OFFSETS[0]! + ENGINE.hz + ENGINE_LONG_AHEAD;
const noRelay = {
  stop: 21.65,
  noseS,
  intoArc: noseS - HEADS[1].segs[0].len,
  // How far the engine's body stands off the straight's extension where its nose is (the arc's own offset).
  arcOffsetAtNose: (() => {
    const a = march(HEADS[1].start, [{ len: 1000 }], noseS),
      b = roadAt(1, noseS);
    return distance(a, b);
  })(),
  legPointsUnderTrain: LEG.to < noseS,
  legPointsBehindNose: noseS - LEG.to,
  leverGap: deckGap(coachEngine, { ...lever, hx: 0.25, back: 0.4, front: 0.4 }),
  islandGap: deckGap(coachEngine, island),
  formationMergeAhead: FORMATION.quarry.from - noseS,
  todayEngineIslandGap: deckGap(longEngine(prodAt, 18.25), island),
};

// ---------------------------------------------------------------- Q2's rack on its 10 m haul circle
type Box = Deck & { id: string };
function rackSearch(l: Line, lg: Seg[], landing: number) {
  const f = frameBesideLine(spec, l, 1),
    fl = { x: f.x - 1000, z: f.z };
  const lgLen = length(lg),
    lgEnd = 142 + lgLen,
    fg = lgEnd + landing;
  const roadPt = (d: number) =>
    d < 142
      ? lineAt(LINES.north, 196 - d, blank())
      : d < lgEnd
        ? march(start, lg, d - 142)
        : d < fg
          ? lineAt(l, fg - d, blank())
          : lineAt(l, d - fg, blank());
  const cartDecks: Deck[] = [];
  for (let d = 120; d <= fg + 120; d += 0.25) {
    const a = roadPt(Math.max(0, d - 1.1)),
      b = roadPt(d + 1.1),
      c = roadPt(d);
    cartDecks.push({
      x: c.x,
      z: c.z,
      yaw: Math.atan2(b.x - a.x, b.z - a.z),
      hx: CART.hx,
      back: CART.hz,
      front: CART.hz,
    });
  }
  const upAt = (s: number, out: XZ) => {
    const p = lineAt(l, s, blank()),
      lat = offsetLat(FORMATION.quarry, s) ?? 0;
    return Object.assign(out, { x: p.x - p.uz * lat, z: p.z + p.ux * lat });
  };
  const downAt = (s: number, out: XZ) => Object.assign(out, lineAt(l, s, blank()));
  const trailer = { d: 0, hx: 1.1, back: 1.6, front: 1.6 };
  const trainDecks: Deck[] = [];
  for (let s = 2; s <= 120; s += 0.5) {
    trainDecks.push(deckAt(downAt, s, trailer, { x: 0, z: 0, yaw: 0, hx: 0, back: 0, front: 0 }));
    if (s >= 36) trainDecks.push(deckAt(upAt, s, trailer, { x: 0, z: 0, yaw: 0, hx: 0, back: 0, front: 0 }));
  }
  const c = stationColliders(f as FrameAt, 0, true);
  const frameBoxes: Box[] = [...c.frame, c.feeder, ...(c.rails ? [c.rails] : [])].map((b) => ({
    id: b.id,
    x: b.position.x - 1000,
    z: b.position.z,
    yaw: b.yaw,
    hx: b.shape.hx,
    back: b.shape.hz,
    front: b.shape.hz,
  }));
  const polylines = {
    down: Array.from({ length: 121 }, (_, s) => lineAt(l, s, blank())),
    up: Array.from({ length: 87 }, (_, k) => upAt(34 + k, { x: 0, z: 0 })),
    leg: Array.from({ length: Math.ceil(lgLen) + 1 }, (_, k) => march(start, lg, Math.min(lgLen, k))),
  };
  const crosses = (a: XZ, b: XZ, pts: XZ[]) => {
    let n = 0;
    for (let k = 1; k < pts.length; k++) {
      const p = pts[k - 1]!,
        q = pts[k]!;
      const d = (b.x - a.x) * (q.z - p.z) - (b.z - a.z) * (q.x - p.x);
      if (Math.abs(d) < 1e-12) continue;
      const t = ((p.x - a.x) * (q.z - p.z) - (p.z - a.z) * (q.x - p.x)) / d,
        u = ((p.x - a.x) * (b.z - a.z) - (p.z - a.z) * (b.x - a.x)) / d;
      if (t >= 0 && t <= 1 && u >= 0 && u <= 1) n++;
    }
    return n;
  };
  const base = {
    x: -Math.sin(f.yaw) * 6 - Math.cos(f.yaw) * spec.side * 8,
    z: -Math.cos(f.yaw) * 6 + Math.sin(f.yaw) * spec.side * 8,
  };
  const evaluate = (degrees: number, facing: boolean) => {
    const th = (degrees * Math.PI) / 180;
    const at = {
      x: fl.x + base.x * Math.cos(th) - base.z * Math.sin(th),
      z: fl.z + base.x * Math.sin(th) + base.z * Math.cos(th),
    };
    // The rack's logs lie along its local x, (cos yaw, -sin yaw); `facing` turns their ends toward the frame.
    const yaw = facing ? Math.atan2(-(fl.z - at.z), fl.x - at.x) : f.yaw - Math.PI / 2;
    const rk: Box = { id: 'rack', ...at, yaw, hx: 1.2, back: 0.87, front: 0.87 };
    // stock-sign: its post at (-1.2, -1.55) in the rack's frame (three.js Y rotation), a 1.3 m board across it.
    const sx = -1.2 * Math.cos(yaw) + -1.55 * Math.sin(yaw),
      sz = 1.2 * Math.sin(yaw) + -1.55 * Math.cos(yaw);
    const sign: Box = {
      id: 'sign',
      x: at.x + sx,
      z: at.z + sz,
      yaw: yaw + Math.PI / 2,
      hx: 0.65,
      back: 0.06,
      front: 0.06,
    };
    const gap = (env: Box[], others: Deck[]) => Math.min(...env.flatMap((e) => others.map((o) => deckGap(e, o))));
    const env = [rk, sign];
    const corners = [-1, 1].flatMap((a) => [-1, 1].map((b) => ({ a, b })));
    const hc = H(at.x + 1000, at.z);
    const ground = Math.max(
      ...corners.map(({ a, b }) =>
        Math.abs(
          H(
            at.x + 1000 + Math.cos(yaw) * a * 1.2 + Math.sin(yaw) * b * 0.87,
            at.z - Math.sin(yaw) * a * 1.2 + Math.cos(yaw) * b * 0.87,
          ) - hc,
        ),
      ),
    );
    const toFrame = Math.atan2(fl.x - at.x, fl.z - at.z),
      logAxis = Math.atan2(Math.cos(yaw), -Math.sin(yaw));
    const endOn = Math.abs(wrap(deg(toFrame - logAxis)));
    return {
      degrees,
      facing,
      // Along the track from the frame (negative: toward Home, the approach) and out from it (positive: away from it).
      along: (at.x - fl.x) * Math.sin(f.yaw) + (at.z - fl.z) * Math.cos(f.yaw),
      out: -((at.x - fl.x) * Math.cos(f.yaw) - (at.z - fl.z) * Math.sin(f.yaw)) * spec.side,
      x: at.x + 1000,
      z: at.z,
      haul: distance(at, fl),
      cart: gap(env, cartDecks),
      trains: gap(env, trainDecks),
      frame: gap(env, frameBoxes),
      tree: Math.min(...standingTrees.map((t) => Math.hypot(t.x - (at.x + 1000), t.z - at.z))) - Math.hypot(1.2, 0.87),
      ground,
      walkCrossings: crosses(fl, at, polylines.down) + crosses(fl, at, polylines.up) + crosses(fl, at, polylines.leg),
      // 0: the logs' ends point at the frame; 90: their side does.
      logEndsFromFrame: Math.min(endOn, 180 - endOn),
    };
  };
  const ok = (r: ReturnType<typeof evaluate>) =>
    r.cart >= 0.25 && r.trains >= 0.25 && r.frame >= 0.25 && r.tree >= 1 && r.ground <= 0.3 && r.walkCrossings === 0;
  const rows = [false, true].flatMap((facing) =>
    Array.from({ length: 721 }, (_, k) => evaluate(-180 + k * 0.5, facing)),
  );
  const pass = rows.filter(ok);
  const score = (r: ReturnType<typeof evaluate>) => Math.min(r.cart, r.trains, r.frame);
  const arcs: { facing: boolean; from: number; to: number }[] = [];
  for (const r of pass) {
    const last = arcs.at(-1);
    if (last && last.facing === r.facing && Math.abs(r.degrees - last.to - 0.5) < 1e-9) last.to = r.degrees;
    else arcs.push({ facing: r.facing, from: r.degrees, to: r.degrees });
  }
  return {
    inherited: evaluate(0, false),
    builderAlternative: evaluate(-9.8, false),
    passingArcs: arcs,
    best: pass.sort((a, b) => score(b) - score(a)).slice(0, 3),
    nearestToInherited: pass.sort((a, b) => Math.abs(a.degrees) - Math.abs(b.degrees)).slice(0, 2),
    // The best placement still on the approach (behind the frame, toward Home): the inherited design's side.
    bestOnApproach: pass
      .filter((r) => r.along <= -1)
      .sort((a, b) => score(b) - score(a))
      .slice(0, 2),
    every10: rows.filter((r) => !r.facing && Number.isInteger(r.degrees / 10)),
  };
}
// The least-moving relay whose arcs stay at or above today's 18 m and whose up track is no tighter than today's 14.07 m.
const best = solves
  .filter((r) => r.downRadius >= 18 && r.upRadius >= baselineUpRadius())
  .sort((a, b) => a.maxMove.d - b.maxMove.d)[0]!;
function baselineUpRadius() {
  return measure(baseline).row.minRadius;
}

// ---------------------------------------------------------------- the cart against the trains' wake (seed chain)
const forgeNow = CART_ROAD.forgeCm / 100,
  legEndNow = 142 + LEG.len;
const whereOnRoad = (d: number) =>
  d < 142
    ? `line 1 s ${(196 - d).toFixed(2)}`
    : d < legEndNow
      ? `leg ${(d - 142).toFixed(2)} m`
      : d <= forgeNow
        ? `road 2 s ${(forgeNow - d).toFixed(2)}`
        : `line 2 s ${(d - forgeNow).toFixed(2)}`;
const cartRows = (['q5-finishing', 'q5-done', 'boiler', 'trains-on'] as const).map((stage) => {
  const seed = buildSeedWorld(stage),
    w = seed.w,
    c = cartRow(w),
    along = cartAlong(c, seed.t) / 100;
  return {
    stage,
    tick: seed.t,
    trains: rail(w).trains,
    boiler: boiler(w).state,
    q5Completion: w.get(QJob, qjobId(w, 4))!.completion,
    cartPhase: Object.entries(CART_PHASE).find(([, v]) => v === c.phase)![0],
    cartPhaseEnds: cartEnd(c),
    cartAt: whereOnRoad(along),
  };
});

// ---------------------------------------------------------------- Home for a longer train than the coach train (option C)
// Each extra car behind the coach train: the tail may not pass the spur's points (s 5.5, as today's 5.55), so the
// stop moves on by the car's pitch and the player car must still stand beside the island's deck.
const legPts = Array.from({ length: Math.ceil(LEG.len) * 4 + 1 }, (_, k) =>
  march(LEG.start, LEG.segs as unknown as Seg[], Math.min(LEG.len, k / 4)),
);
const roadGap = (s: number) => {
  const p = roadAt(1, s);
  let best = Infinity;
  for (let t = 0; t <= 80; t += 0.05) best = Math.min(best, distance(p, roadAt(0, t)));
  return best;
};
const legNear = (s0: number, s1: number) => {
  let best = { d: Infinity, s: 0 };
  for (let s = s0; s <= s1; s += 0.25) {
    const p = roadAt(1, s);
    for (const q of legPts) if (distance(p, q) < best.d) best = { d: distance(p, q), s };
  }
  return best;
};
const deckEnd = ISLAND_A.deck1 + ROAD2_S; // road 2's s at the island deck's far end (23.70)
const growth = [0, 3.4, 3.7, 7.4].map((extra) => {
  const stop = 5.5 + 0.05 + 16.1 + extra,
    deck = stop + 1.6,
    nose = stop + TRAIN_OFFSETS[0]! + ENGINE.hz + ENGINE_LONG_AHEAD;
  let relay: { join: number; r2: number; maxMove: number; tree217: number; upRadius: number } | null = null;
  for (const J of [90, 92, 94, 96, 98, 100])
    for (const r2 of [18, 20, 22, 25, 30])
      try {
        const h = solveHead(Math.ceil((nose + 0.05) * 10) / 10, J, r2);
        if (Math.min(h[1]!.r!, h[3]!.r!) < 18) continue;
        const f = relayFacts(h, J, Math.ceil((nose + 1.05) * 10) / 10);
        if (f.upRadius < 14) continue;
        if (!relay || f.maxMove.d < relay.maxMove)
          relay = {
            join: J,
            r2,
            maxMove: f.maxMove.d,
            tree217: f.trees.find((t) => t.id === 217)?.d ?? Infinity,
            upRadius: f.upRadius,
          };
      } catch {
        // No closure.
      }
  return {
    extra,
    stop,
    deckEndNeeded: deck,
    deckExtension: deck - deckEnd,
    nose,
    noseIntoTodaysArc: nose - HEADS[1].segs[0].len,
    noseOffLine: distance(march(HEADS[1].start, [{ len: 1000 }], nose), roadAt(1, nose)),
    reachAheadToUpMerge: FORMATION.quarry.from - (stop + 8.2),
    legNearDeckExtension: legNear(deckEnd, deck + ISLAND.endRamp),
    roadGapAtDeckEnd: roadGap(deck),
    relayForNoseOnStraight: relay,
  };
});

console.log(
  JSON.stringify(
    {
      candidate,
      noRelay,
      growth,
      solves: solves.map((r) => ({ ...r, line: undefined, leg: undefined })),
      rack: {
        today: rackSearch(old, LEG.segs as unknown as Seg[], LEG.to),
        candidate: rackSearch(line, leg, to),
        recommendedSolve: {
          join: best.join,
          rightRadius: best.rightRadius,
          leftRadius: best.leftRadius,
          ...rackSearch(best.line, best.leg, to),
        },
      },
      cart: cartRows,
    },
    null,
    2,
  ),
);

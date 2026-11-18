// Ring Island's ground (docs/plans/ring-island-build1.md, R2b): a 2 m grid over the island's waterline box, the max of
// the four cones' surfaces (Place's buildFar, src/proto/greybox/ring-cones.ts) carried on below their -4 m base to the
// sea bed, graded to a fill under the island halt and capped under the run-off bed (RING_END.cut, R2d; Level findings 7,
// 15 and 20).
// Pure: no three.js, no physics. The view builds the drawn mesh and the heightfield collider from `heights`; recovery
// and the saved pose read `islandH`, the same triangles the collider has. World metres.
import { RING_END, RING_ORIGIN } from '../../sim/railway-ring-layout.ts';
import { ROW_SHIFT, rowPoint } from '../../sim/railway-route.ts';
import { SUMMIT_BRIDGE, summitBridge } from './path.ts';

/** dx, dz, radius, height from the island's centre, as RING_CONES. */
export type Cone = readonly [number, number, number, number];
export const ISLAND_CELL = 2;
/** The open sea bed off the island's shore (src/world/grid.ts SEABED). */
export const ISLAND_BED = -7.5;
/** The fill under the island halt: its top, under the 8.0 m deck's 0.5 m slab with 10 cm spare, and the embankment's
 * fall per metre outside it (1 in 1.5). */
export const ISLAND_FILL = { top: 7.4, u0: 42700, u1: 46900, lat0: -1030, lat1: 630, fall: 1 / 1.5 } as const;
/** The deepest the run-off's cutting goes into the cones (Level finding 15 counts 1.5 m at the faces; the cone is 9.4 m at the bed's end, so 2 m leaves room). */
export const ISLAND_CUT_MAX = 2;
/** The footbridge's landing at abutment a (terrain-clean step 7; the design call of 17 November): the path's last
 * `length` m before a, `half` m either side of the deck's axis, solid ground from the trail's own height (`lift` over
 * it, so the drawn ground's 3 cm meets the drawn trail) to the deck's top, on a `step` by `stepAcross` grid. */
export const LANDING = {
  length: SUMMIT_BRIDGE.approach / 2,
  half: 1.3,
  lift: 0.01,
  step: 0.5,
  stepAcross: 0.65,
} as const;
/** The stack line's cutting (docs/plans/greybox-route.md, leg 1 step 4): line 2 runs on from the halt along the `ring`
 * row, across the island's north-west hillside (the cones stand up to 26.7 m over its 4.0 m deck there), falling from
 * 8.0 m to that deck. The ground is cut to 0.6 m under the rails across both tracks (the formation's middle is 2 m west
 * of the down track, 4.6 m either side) with rock walls rising 3 in 1 outside, a notch and not a slice through the hill;
 * it stops at the station house terrace (STACK_KEEP: Level finding 20's ground, kept as it was). Samples every 2 m from
 * s 1210 m (the platforms' north end) to s 1580 m, where the hillside has fallen under the deck; world metres. */
const STACK_CUT = (() => {
  const out: { x: number; z: number; y: number }[] = [];
  for (let cm = 121000; cm <= 158000; cm += 200) {
    const p = rowPoint('ring', cm + ROW_SHIFT.ring),
      q = rowPoint('ring', cm + ROW_SHIFT.ring + 100),
      len = Math.hypot(q.x - p.x, q.z - p.z);
    out.push({ x: (p.x + ((q.z - p.z) / len) * 200) / 100, z: (p.z - ((q.x - p.x) / len) * 200) / 100, y: p.y / 100 });
  }
  return out;
})();
// 4.6 m of formation and a 2 m grid cell, so the triangles between nodes stay under the deck's edge.
const STACK_CUT_HALF = 6.6,
  STACK_CUT_WALL = 3;
/** The cutting's samples' box, grown by the reach of its walls: outside it no node is tested against them. */
const STACK_BOX = {
  x0: Math.min(...STACK_CUT.map((p) => p.x)) - 16,
  x1: Math.max(...STACK_CUT.map((p) => p.x)) + 16,
  z0: Math.min(...STACK_CUT.map((p) => p.z)) - 16,
  z1: Math.max(...STACK_CUT.map((p) => p.z)) + 16,
};
/** The station house terrace grown by a metre (src/proto/greybox/ring-house.ts CONCOURSE.terrace; u and lat, m). */
const STACK_KEEP = { u0: 467, u1: 478.5, lat0: -21, lat1: -8.3 };
const UNIT = Math.sqrt(1 + 0.0272 * 0.0272);
/** u and lat (m) of a world point: the inverse of ringAt (its orthogonal unit axes, unrounded). */
export function ringUL(x: number, z: number) {
  const dx = x - RING_ORIGIN.x / 100,
    dz = z - RING_ORIGIN.z / 100;
  return { u: (0.0272 * dx - dz) / UNIT, lat: (dx + 0.0272 * dz) / UNIT };
}

/** The island's ground: `centre` is the cones' origin (Place's FAR + ORIGIN), `cones` RING_CONES. */
export function createIslandGround(cones: readonly Cone[], centre: { x: number; z: number }) {
  // The box: every cone carried down to the sea bed, plus a cell, snapped to the grid.
  let minX = Infinity,
    maxX = -Infinity,
    minZ = Infinity,
    maxZ = -Infinity;
  for (const [dx, dz, r, h] of cones) {
    const reach = (r * (h - 4 - ISLAND_BED)) / h + ISLAND_CELL;
    minX = Math.min(minX, centre.x + dx - reach);
    maxX = Math.max(maxX, centre.x + dx + reach);
    minZ = Math.min(minZ, centre.z + dz - reach);
    maxZ = Math.max(maxZ, centre.z + dz + reach);
  }
  const x0 = Math.floor(minX / ISLAND_CELL) * ISLAND_CELL,
    z0 = Math.floor(minZ / ISLAND_CELL) * ISLAND_CELL;
  const nx = Math.ceil((maxX - x0) / ISLAND_CELL) + 1,
    nz = Math.ceil((maxZ - z0) / ISLAND_CELL) + 1;

  /** The cones alone, carried below their base: ringHeight wherever that stands, the sea bed under the rest. */
  function cone(x: number, z: number) {
    let best = ISLAND_BED;
    for (const [dx, dz, r, h] of cones)
      best = Math.max(best, h - 4 - (h * Math.hypot(x - centre.x - dx, z - centre.z - dz)) / r);
    return best;
  }
  /** Metres outside the halt fill's rect (0 inside). */
  function fillOut(x: number, z: number) {
    const { u, lat } = ringUL(x, z);
    const du = Math.max(ISLAND_FILL.u0 / 100 - u, 0, u - ISLAND_FILL.u1 / 100),
      dl = Math.max(ISLAND_FILL.lat0 / 100 - lat, 0, lat - ISLAND_FILL.lat1 / 100);
    return Math.hypot(du, dl);
  }
  /** Metres outside the run-off bed's rect (0 inside; RING_END.bed, u from the halt's north end to the buffers). */
  function bedOut(x: number, z: number) {
    const { u, lat } = ringUL(x, z),
      B = RING_END.bed;
    return Math.hypot(Math.max(B.u0 / 100 - u, 0, u - B.u1 / 100), Math.max(B.lat0 / 100 - lat, 0, lat - B.lat1 / 100));
  }
  /** The graded ground at a world point (grid nodes sample this): the cones, cut to RING_END.cut under the bed and back up
   * the fill's 1 in 1.5 outside it, the cut at most ISLAND_CUT_MAX deep and gone within ISLAND_CUT_MAX / fall metres of
   * the bed (so the cutting is a notch, not a slice through the hillside), never below the halt's fill. */
  function graded(x: number, z: number) {
    const c = cone(x, z),
      d = bedOut(x, z);
    const depth = Math.max(
      0,
      Math.min(c - RING_END.cut / 100 - ISLAND_FILL.fall * d, ISLAND_CUT_MAX - ISLAND_FILL.fall * d),
    );
    return Math.max(stackCut(x, z, c - depth), ISLAND_FILL.top - ISLAND_FILL.fall * fillOut(x, z));
  }
  /** The height the stack line's cutting caps the ground at (STACK_CUT): 0.6 m under the rails across the formation,
   * rising 3 in 1 outside it; Infinity away from the line and on the station house terrace. */
  function stackCap(x: number, z: number) {
    if (x < STACK_BOX.x0 || x > STACK_BOX.x1 || z < STACK_BOX.z0 || z > STACK_BOX.z1) return Infinity;
    const { u, lat } = ringUL(x, z);
    if (u >= STACK_KEEP.u0 && u <= STACK_KEEP.u1 && lat >= STACK_KEEP.lat0 && lat <= STACK_KEEP.lat1) return Infinity;
    let best = Infinity;
    for (const p of STACK_CUT) {
      const dx = x - p.x,
        dz = z - p.z;
      if (Math.abs(dx) > 16 || Math.abs(dz) > 16) continue;
      const out = Math.max(0, Math.hypot(dx, dz) - STACK_CUT_HALF);
      best = Math.min(best, p.y - 0.6 + STACK_CUT_WALL * out);
    }
    return best;
  }
  const stackCut = (x: number, z: number, h: number) => Math.min(h, stackCap(x, z));

  // Row-major from (x0, z0): heights[i + j * nx], i along +x, j along +z.
  const heights = new Float32Array(nx * nz);
  for (let j = 0; j < nz; j++)
    for (let i = 0; i < nx; i++) heights[i + j * nx] = graded(x0 + i * ISLAND_CELL, z0 + j * ISLAND_CELL);
  const at = (i: number, j: number) => heights[i + j * nx]!;
  const bounds = { minX: x0, maxX: x0 + (nx - 1) * ISLAND_CELL, minZ: z0, maxZ: z0 + (nz - 1) * ISLAND_CELL };

  /** Whether (x, z) is inside the island's grid. */
  const onIsland = (x: number, z: number) =>
    x >= bounds.minX && x <= bounds.maxX && z >= bounds.minZ && z <= bounds.maxZ;
  /** The ground's height at a world point, on the collider's triangles (Place's anti-diagonal split, as
   * src/place/terrain.ts's triangleHeight); -Infinity off the grid. */
  function triangleH(x: number, z: number, read: typeof at) {
    if (!onIsland(x, z)) return -Infinity;
    const fx = (x - x0) / ISLAND_CELL,
      fz = (z - z0) / ISLAND_CELL;
    const i = Math.min(nx - 2, Math.floor(fx)),
      j = Math.min(nz - 2, Math.floor(fz));
    const u = fx - i,
      v = fz - j;
    const a = read(i, j),
      b = read(i + 1, j),
      c = read(i, j + 1),
      d = read(i + 1, j + 1);
    return u + v <= 1 ? a + (b - a) * u + (c - a) * v : d + (c - d) * (1 - u) + (b - d) * (1 - v);
  }
  const uncappedH = (x: number, z: number) => triangleH(x, z, at);
  const { a, b } = summitBridge({ uncappedH });
  // The footbridge's walk-on at a (docs/plans/terrain-clean.md, step 7): two footprints cut exactly into the grid's
  // triangles, a patch drawn and solid in place of those cells. Under the deck's first 4 m and its half-metre shoulders
  // the ground is capped 0.13 m under the timber (0.1 m once drawn a hair high), so nothing stands through the deck. On
  // the landing (LANDING) the ground is the landing: it twists from the trail's cross-fall to the deck's level top.
  const span = Math.hypot(b.x - a.x, b.z - a.z),
    ux = (b.x - a.x) / span,
    uz = (b.z - a.z) / span,
    grade = (b.y - a.y) / span;
  /** Metres along the deck from a, and to its right (summitBridge's frame, as the view's `on`). */
  const along = (x: number, z: number) => (x - a.x) * ux + (z - a.z) * uz;
  const across = (x: number, z: number) => (z - a.z) * ux - (x - a.x) * uz;
  const deckCap = (x: number, z: number) =>
    a.y + grade * along(x, z) - (SUMMIT_BRIDGE.thick / 2) * (1 + Math.hypot(1, grade)) - 0.13001;
  // The landing's surface: a small grid (LANDING.step along, LANDING.stepAcross across) from the trail's own ground at
  // its start, LANDING.lift over it, to the deck's top at a, interpolated on that grid's triangles so the patch below
  // cuts it exactly.
  const L = LANDING,
    nu = Math.round(L.length / L.step),
    nv = Math.round((2 * L.half) / L.stepAcross);
  const fu = (x: number, z: number) => (along(x, z) + L.length) / L.step,
    fv = (x: number, z: number) => (across(x, z) + L.half) / L.stepAcross;
  const landing = new Float64Array((nu + 1) * (nv + 1));
  for (let m = 0; m <= nv; m++) {
    const s = -L.half + m * L.stepAcross,
      start = uncappedH(a.x - ux * L.length - uz * s, a.z - uz * L.length + ux * s) + L.lift;
    for (let k = 0; k <= nu; k++) landing[k * (nv + 1) + m] = start + ((a.y - start) * k) / nu;
  }
  function landingH(x: number, z: number) {
    const u0 = Math.min(nu, Math.max(0, fu(x, z))),
      v0 = Math.min(nv, Math.max(0, fv(x, z)));
    const k = Math.min(nu - 1, Math.floor(u0)),
      m = Math.min(nv - 1, Math.floor(v0));
    const u = u0 - k,
      v = v0 - m;
    const n = (dk: number, dm: number) => landing[(k + dk) * (nv + 1) + m + dm]!;
    return u + v <= 1
      ? n(0, 0) + (n(1, 0) - n(0, 0)) * u + (n(0, 1) - n(0, 0)) * v
      : n(1, 1) + (n(0, 1) - n(1, 1)) * (1 - u) + (n(1, 0) - n(1, 1)) * (1 - v);
  }
  type Vertex = { x: number; y: number; z: number };
  type Line = (p: Vertex) => number;
  /** `set`: the ground is `floor` (the landing); otherwise `floor` caps it (the deck). `lines` split it further. */
  type Footprint = { d0: number; d1: number; half: number; floor: typeof landingH; set: boolean; lines: Line[] };
  const landingLines: Line[] = [];
  for (let k = 1; k < nu; k++) landingLines.push((p) => fu(p.x, p.z) - k);
  for (let m = 1; m < nv; m++) landingLines.push((p) => fv(p.x, p.z) - m);
  for (let n = 1; n < nu + nv; n++) landingLines.push((p) => fu(p.x, p.z) + fv(p.x, p.z) - n);
  const footprints: Footprint[] = [
    {
      d0: 0,
      d1: 4,
      half: SUMMIT_BRIDGE.width / 2 + 0.5,
      floor: deckCap,
      set: false,
      // Where the deck's end meets the landing, so each wall there has one neighbour.
      lines: [(p) => across(p.x, p.z) - L.half, (p) => across(p.x, p.z) + L.half],
    },
    { d0: -L.length, d1: 0, half: L.half, floor: landingH, set: true, lines: landingLines },
  ];
  const within = (f: Footprint, x: number, z: number) => {
    const d = along(x, z);
    return d >= f.d0 - 1e-9 && d <= f.d1 + 1e-9 && Math.abs(across(x, z)) <= f.half + 1e-9;
  };
  /** The finished ground at a world point: the collider's triangles, the patch's included (the deck's footprint wins
   * on the line where it meets the landing's). */
  function islandH(x: number, z: number) {
    const h = uncappedH(x, z),
      f = footprints.find((f) => within(f, x, z));
    return !f ? h : f.set ? f.floor(x, z) : Math.min(h, f.floor(x, z));
  }
  /** A footprint's four sides: distance inside, and the outward unit vector. */
  const sidesOf = (f: Footprint) => [
    { inside: (p: Vertex) => along(p.x, p.z) - f.d0, ox: -ux, oz: -uz },
    { inside: (p: Vertex) => f.d1 - along(p.x, p.z), ox: ux, oz: uz },
    { inside: (p: Vertex) => f.half - across(p.x, p.z), ox: -uz, oz: ux },
    { inside: (p: Vertex) => f.half + across(p.x, p.z), ox: uz, oz: -ux },
  ];
  const corners = footprints.flatMap((f) =>
    [f.d0, f.d1].flatMap((d) => [-f.half, f.half].map((s) => ({ x: a.x + d * ux - s * uz, z: a.z + d * uz + s * ux }))),
  );
  const i0 = Math.floor((Math.min(...corners.map((p) => p.x)) - x0) / ISLAND_CELL),
    i1 = Math.ceil((Math.max(...corners.map((p) => p.x)) - x0) / ISLAND_CELL);
  const j0 = Math.floor((Math.min(...corners.map((p) => p.z)) - z0) / ISLAND_CELL),
    j1 = Math.ceil((Math.max(...corners.map((p) => p.z)) - z0) / ISLAND_CELL);
  /** Whether grid cell (i, j) is drawn and solid by the patch instead of the grid. */
  const inPatch = (i: number, j: number) => i >= i0 && i < i1 && j >= j0 && j < j1;
  // The patch's triangles: `ground` drawn as ground, `landing` (the landing's top and the sides it stands above the
  // ground by) drawn as path; both solid.
  const vertices: number[] = [],
    ground: number[] = [],
    landingTriangles: number[] = [];
  function emit(polygon: Vertex[], onLanding: boolean) {
    if (polygon.length < 3) return;
    const first = vertices.length / 3,
      out = onLanding ? landingTriangles : ground;
    for (const p of polygon) vertices.push(p.x, p.y, p.z);
    for (let k = 2; k < polygon.length; k++) out.push(first, first + k - 1, first + k);
  }
  /** The parts of a convex polygon where `distance` is at least 0 and at most 0, cut along its zero line. */
  function clip(polygon: Vertex[], distance: Line): [Vertex[], Vertex[]] {
    const inside: Vertex[] = [],
      outside: Vertex[] = [];
    for (let k = 0; k < polygon.length; k++) {
      const p = polygon[k]!,
        q = polygon[(k + 1) % polygon.length]!,
        dp = distance(p),
        dq = distance(q);
      if (dp >= 0) inside.push(p);
      if (dp <= 0) outside.push(p);
      if (dp * dq < 0) {
        const t = dp / (dp - dq),
          edge = { x: p.x + (q.x - p.x) * t, y: p.y + (q.y - p.y) * t, z: p.z + (q.z - p.z) * t };
        inside.push(edge);
        outside.push(edge);
      }
    }
    return [inside, outside];
  }
  /** Upright faces on a footprint's sides, from its finished ground to its neighbour's, facing the lower one. Between
   * two footprints only the lower one draws it. */
  function walls(f: Footprint, polygon: Vertex[]) {
    for (const side of sidesOf(f))
      for (let k = 0; k < polygon.length; k++) {
        const p = polygon[k]!,
          q = polygon[(k + 1) % polygon.length]!;
        if (Math.abs(side.inside(p)) > 1e-8 || Math.abs(side.inside(q)) > 1e-8) continue;
        const out = (v: Vertex) => ({ x: v.x + side.ox * 1e-6, z: v.z + side.oz * 1e-6 });
        const op = out(p),
          oq = out(q),
          hp = islandH(op.x, op.z),
          hq = islandH(oq.x, oq.z);
        if (Math.abs(hp - p.y) < 1e-6 && Math.abs(hq - q.y) < 1e-6) continue;
        const mid = out({ x: (p.x + q.x) / 2, y: 0, z: (p.z + q.z) / 2 }),
          neighbour = footprints.find((g) => g !== f && within(g, mid.x, mid.z));
        const higherOutside = hp + hq > p.y + q.y;
        if (neighbour && !higherOutside) continue;
        const quad = [p, q, { ...q, y: hq }, { ...p, y: hp }];
        // Facing the lower side: into this footprint when the neighbour is higher.
        const ex = q.x - p.x,
          ez = q.z - p.z,
          rise = hp - p.y + hq - q.y;
        const facing = (-ez * rise * side.ox + ex * rise * side.oz) * (higherOutside ? -1 : 1);
        emit(facing < 0 ? quad.reverse() : quad, higherOutside ? !!neighbour?.set : f.set);
      }
  }
  function place(f: Footprint, polygon: Vertex[]) {
    let pieces = [polygon];
    for (const line of f.lines) pieces = pieces.flatMap((piece) => clip(piece, line)).filter((p) => p.length >= 3);
    for (const piece of pieces) {
      const parts = f.set ? [piece, []] : clip(piece, (p) => p.y - f.floor(p.x, p.z));
      const finished = [parts[0]!.map((p) => ({ ...p, y: f.floor(p.x, p.z) })), parts[1]!];
      for (const part of finished) {
        if (part.length < 3) continue;
        emit(part, f.set);
        walls(f, part);
      }
    }
  }
  function cut(polygon: Vertex[], k = 0) {
    const f = footprints[k];
    if (polygon.length < 3) return;
    if (!f) return emit(polygon, false);
    let rest = polygon;
    for (const side of sidesOf(f)) {
      const [inside, outside] = clip(rest, side.inside);
      cut(outside, k + 1);
      rest = inside;
      if (rest.length < 3) return;
    }
    place(f, rest);
  }
  const node = (i: number, j: number) => ({ x: x0 + i * ISLAND_CELL, y: at(i, j), z: z0 + j * ISLAND_CELL });
  for (let j = j0; j < j1; j++)
    for (let i = i0; i < i1; i++) {
      const sw = node(i, j),
        nw = node(i, j + 1),
        se = node(i + 1, j),
        ne = node(i + 1, j + 1);
      cut([sw, nw, se]);
      cut([ne, se, nw]);
    }
  const patch = { vertices, ground, landing: landingTriangles };
  const collider = () => {
    const grid = (left: number, top: number, right: number, bottom: number) => ({
      position: { x: x0 + left * ISLAND_CELL, y: 0, z: z0 + bottom * ISLAND_CELL },
      shapes: [
        {
          kind: 'heightfield' as const,
          cell: ISLAND_CELL,
          heights: Array.from({ length: right - left + 1 }, (_, i) =>
            Array.from({ length: bottom - top + 1 }, (_, j) => at(left + i, bottom - j)),
          ),
        },
      ],
    });
    return [
      grid(0, 0, nx - 1, j0),
      grid(0, j1, nx - 1, nz - 1),
      grid(0, j0, i0, j1),
      grid(i1, j0, nx - 1, j1),
      {
        position: { x: 0, y: 0, z: 0 },
        shapes: [{ kind: 'trimesh' as const, vertices, indices: [...ground, ...landingTriangles] }],
      },
    ];
  };
  return {
    x0,
    z0,
    nx,
    nz,
    cell: ISLAND_CELL,
    heights,
    bounds,
    at,
    islandH,
    uncappedH,
    inPatch,
    patch,
    onIsland,
    cone,
    fillOut,
    bedOut,
    stackCap,
    collider,
  };
}
export type IslandGround = ReturnType<typeof createIslandGround>;

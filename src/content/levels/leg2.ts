// Leg 2 authoring. Private frame inputs compile to placements; the checker reads the same JSON.
import { defineLevel } from '../../prefab/types.ts';

import {
  frame,
  unit,
  perp,
  mix,
  offset,
  add,
  sub,
  layoutData,
  type Evaluated,
  type Scalar,
} from '../../prefab/authoring.ts';
import { INCLINE_BORE } from '../../entities/route-greybox/massing.ts';
/** Room kept clear for the rules plan: a rectangle and the heights a leg 2 box may not enter. */
export type Reserve = { id: string; x: number; z: number; yaw: number; w: number; d: number; y0: number; y1: number };
/** The unlaid bed: 7.6 m wide, 0.1 m under rail height (no rails are drawn until a leg lays them). */
const BED = 3.8,
  /** Platforms: 4 m deep, 3.8 to 7.8 m off the row, 0.9 m over the rail (the blockout's). */
  PLAT = 7.8,
  /** What a reserve keeps clear over a floor: a body's height and a lever or a board. */
  CLEAR = 3,
  /** A row's corridor is kept clear to this far over its rail. */
  LOADING = 5;

// ---------------------------------------------------------------- Bell Rock
const BELL_O = { x: -50, z: -850 },
  BELL_N = unit(-0.0612, 0.9981),
  BELL_E = perp(BELL_N),
  IN = unit(0.855, 0.519);
const ne = frame(BELL_O, BELL_N, BELL_E),
  // The same frame with `e` first, for a box whose length runs across.
  en = frame(BELL_O, BELL_E, BELL_N),
  // `lat` + on each half's north side (the outside of the 52 degree kink).
  bayIn = frame(BELL_O, IN, perp(IN));
const LOWER = 4.9,
  UPPER = 15.9,
  ROCK = 14,
  NS_RAIL = 4,
  BAY_RAIL = 15;
/** The pinnacle's map point, moved 6 m east (call 117): docs/world/map-prototypes.html, landmark `bell`. */
const PINNACLE = { x: -24, z: -870 };

/** Chords of the upper bed beneath the train. Their ends overlap across the joints so a lay
 * lifts a standing body onto the rails anywhere across the formation. */
function bellBed() {
  // Centimetres [along, x, z] on the catalog row, from the approach to the outward bed.
  const cuts = [
    [115745, 985, -81367],
    [119800, -2481, -83471],
    [120600, -3190, -83840],
    [121400, -3942, -84112],
    [122200, -4723, -84281],
    [123000, -5520, -84345],
    [123800, -6318, -84303],
    [124600, -7104, -84155],
    [125400, -7863, -83906],
    [129335, -11538, -82499],
  ] as const;
  return cuts.slice(1).map(([end, x, z], i) => {
    const [start, ax, az] = cuts[i]!;
    const dx = (x - ax) / 100,
      dz = (z - az) / 100,
      along = unit(dx, dz);
    const chord = frame({ x: ax / 100, z: az / 100 }, along, perp(along));
    return {
      ...chord.box(
        `bay-bed-chord-${i}`,
        -0.35,
        (end - start + 35) / 100,
        -4.3,
        4.3,
        BAY_RAIL - 0.1,
        sub(BAY_RAIL - 0.1, ROCK - 0.02),
        'dark',
      ),
      over: true,
    };
  });
}

// Two chords on each half. Use the catalog's offset curve so the outside
// platforms get the extra length they need around the bend.
// Portable authoring samples (cm) at s 1197, 1207, 1217, 1233 and 1249 m.
// Each row contains rowSide at the track centre and at +/-580 cm.
const platformCuts = [
  [
    [-2395, -83419],
    [-2095, -83915],
    [-2695, -82923],
  ],
  [
    [-3282, -83880],
    [-3066, -84418],
    [-3498, -83342],
  ],
  [
    [-4232, -84188],
    [-4109, -84755],
    [-4355, -83621],
  ],
  [
    [-5820, -84342],
    [-5843, -84922],
    [-5797, -83762],
  ],
  [
    [-7392, -84073],
    [-7572, -84624],
    [-7212, -83522],
  ],
] as const;
const bellChords = platformCuts.slice(1).map((end, i) => {
  const side = (offset: 0 | 1 | 2) => {
    const [x, z] = platformCuts[i]![offset];
    const [bx, bz] = end[offset];
    const dx = bx - x,
      dz = bz - z;
    const along = unit(dx, dz);
    return {
      frame: frame({ x: x / 100, z: z / 100 }, along, perp(along, -1)),
      lengthCm: Math.round(Math.hypot(dx, dz)),
    };
  };
  return { track: side(0), north: side(1), south: side(2) };
});
const platforms = bellChords.flatMap((c, i) =>
  [c.north, c.south].map((p, j) => {
    const half = i < 2 ? 'in' : 'out';
    const id = `upper-${half}-${j ? 's' : 'n'}`;
    // The square ends overlap on the bend. Keep their inner corners outside
    // the full 7.6 m formation, including the two end ramps.
    const inner = j ? -2 : -1.55;
    const outerEdge = j ? 1.55 : 2;
    const outer = i === 0 || i === 3;
    const edge = i === 0 ? 0 : p.lengthCm / 100;
    const foot = i === 0 ? -4 : (p.lengthCm + 400) / 100;
    return {
      piece: {
        ...p.frame.box(`${id}-${i}`, -0.2, (p.lengthCm + 20) / 100, inner, outerEdge, UPPER, sub(UPPER, ROCK), 'light'),
        over: true,
      },
      ramp: outer
        ? { ...p.frame.ramp(id + '-end', edge, UPPER, foot, ROCK, inner, outerEdge, 'grey'), over: true }
        : null,
      reserve: i % 2 === 0 ? p.frame.reserve(id + ' lever end', 0, 3, inner, outerEdge, UPPER, UPPER + CLEAR) : null,
      middle: p.frame.at(p.lengthCm / 200, 0),
      foot: p.frame.at(foot, 0),
    };
  }),
);

function bell() {
  const pieces: unknown[] = [
    // The lower level, in the cut (the cut is sea: everything here stands on posts).
    { ...ne.box('ns-bed', -60, 60, -BED, BED, NS_RAIL - 0.1, 0.4, 'dark'), posts: true },
    { ...ne.box('lower-east', -20, 20, BED, 9, LOWER, 0.5, 'light'), posts: true },
    { ...ne.box('lower-west', -28, 20, -PLAT, -BED, LOWER, 0.5, 'light'), posts: true },
    { ...ne.box('lower-deck', -26, 26, -24, -PLAT, LOWER, 0.5, 'grey'), posts: true },
    // Nobody is stranded: a swimmer in the cut climbs out here, at the west platform's north end.
    ne.ramp('slipway', -48, -1.4, -28, LOWER, -7.7, -5.3, 'light'),
    // The ramp up the cut's west wall, 5.4 in 10 (the Ring ramps' pitch), a parapet on its open side.
    ne.ramp('ramp', -5.6, LOWER, -26, UPPER, -24, -21, 'light'),
    { ...ne.ramp('ramp-parapet', -5.6, LOWER + 1, -26, UPPER + 1, -21.2, -21, 'pale'), h: 1 },
    { ...ne.box('ramp-landing', -30, -26, -24, -21, UPPER, 0.4, 'grey'), posts: true },
    // The bay beds and platforms follow the eased row.
    ...bellBed(),
    // The bay row climbs onto the rock east of the in half's bed (t 70 to 94; the row's grade knots are at t 79.793,
    // rail 15, and t 99.738, rail 14.22): its unlaid bed carries on there 0.15 m under the rail (the smoothed deck is
    // within 0.1 m of the row's straight pieces), so the bay cut's last lay only lifts a body standing on the rock. Past
    // t 94 the rail is within a body sphere's radius (0.45 m) of the rock's top. Each down into the rock (0.85 m).
    bayIn.box('bay-bed-on', 70, 79.793, -BED, BED, sub(BAY_RAIL, 0.15), 0.85, 'dark'),
    { ...bayIn.ramp('bay-bed-climb', 79.793, sub(BAY_RAIL, 0.15), 94, 14.29, -BED, BED, 'dark'), h: 0.85 },
    ...platforms.flatMap((p) => (p.ramp ? [p.piece, p.ramp] : [p.piece])),
    ne.box('upper-deck', -30, 1, -46, -24, UPPER, sub(UPPER, ROCK), 'grey'),
    // Call 119: the deck stays 1.9 m over the rock, with a short ramp down.
    en.ramp('upper-step', -46, UPPER, -50, ROCK, -15, -11, 'grey'),
  ];
  // The rock itself is not a box here: the `greybox.bell-rock` prefab (../prefabs/bell-rock.ts, placed by `extras`
  // below) makes the map's two Bell Rock lands solid as drawn (their own outlines, top at `rockTop`), so no drawn
  // rock is left without a collider. The pinnacle's collider is the box
  // the backdrop draws (22 m east to west, 18 m north to south, square to the map).
  pieces.push({
    id: 'pinnacle',
    ...PINNACLE,

    yaw: 0,
    w: 22,
    d: 18,
    top: 54,
    h: 54 - ROCK,
    tone: 'grey',
    hidden: true,
  });
  const pad = (id: string, n: number, e: number, y: number) => ({
    id,
    ...ne.at(n, e),
    y,
    yaw: ne.yaw,
    label: `bell.${id}`,
  });
  return {
    origin: BELL_O,
    basis: ne.basis,
    /** The rock's top (the map's `top` for both lands) and how far down its solid walls go. */
    rockTop: ROCK,
    rockBase: -10,
    extras: [{ id: 'rock', prefab: 'greybox.bell-rock', pos: [0, 0, 0] }],
    pieces,
    pads: [
      pad('pad-gorge', -20, -14, LOWER),
      pad('pad-ring', -12, -14, LOWER),
      pad('pad-home', -22, -34, UPPER),
      pad('pad-canopy', -13, -34, UPPER),
      pad('pad-quay', -4, -34, UPPER),
    ],
    // The inert board at the ramp's head, overhead on one post and turned to the walker coming up the ramp.
    posts: [
      {
        id: 'market',
        ...ne.at(-28, -24),
        y: UPPER,
        facing: { compute: 'unit', axis: mix(BELL_E, BELL_N, 1, 1) },
        label: 'bell.market',
        high: true,
      },
    ],
    reserves: [
      ne.reserve('ns row', -60, 60, -BED, BED, NS_RAIL - 0.1, NS_RAIL + LOADING),
      bayIn.reserve('bay approach', 30.5, 70, -BED, BED, BAY_RAIL, BAY_RAIL + LOADING),
      ...bellChords.map((c, i) =>
        c.track.frame.reserve('bay track ' + i, 0, c.track.lengthCm / 100, -BED, BED, BAY_RAIL, BAY_RAIL + LOADING),
      ),
      frame({ x: -73.92, z: -840.73 }, unit(-4.71, 1.67), perp(unit(-4.71, 1.67))).reserve(
        'bay exit curve', 0, 5, -BED, BED, BAY_RAIL, BAY_RAIL + LOADING,
      ),
      frame({ x: -78.63, z: -839.06 }, unit(-36.75, 14.07), perp(unit(-36.75, 14.07))).reserve(
        'bay exit', 0, 39.35, -BED, BED, BAY_RAIL, BAY_RAIL + LOADING,
      ),
      ne.reserve('seeds spot', -5.5, -2.5, -16.5, -13.5, LOWER, LOWER + CLEAR),
      { id: 'Canopy frame and barrier', x: -54.1, z: -848.23, yaw: 0, w: 2, d: 2, y0: UPPER, y1: UPPER + CLEAR },
      { id: 'Canopy rack', x: -43.36, z: -847.01, yaw: 0, w: 2, d: 2, y0: UPPER, y1: UPPER + CLEAR },
      // Each platform's homeward 3 m (a lever, a board).
      ne.reserve('lower-east lever end', -20, -17, BED, 9, LOWER, LOWER + CLEAR),
      ne.reserve('lower-west lever end', -28, -25, -PLAT, -BED, LOWER, LOWER + CLEAR),
      ...platforms.flatMap((p) => (p.reserve ? [p.reserve] : [])),
    ],
    /** Where the level report stands (finding 2 and the design review's change 3). */
    marks: {
      lowerWest: ne.at(-10, -5.8),
      lowerEast: ne.at(0, 6.4),
      seeds: ne.at(-4, -15),
      rampFoot: ne.at(-5, -22.5),
      rampHead: ne.at(-28, -22.5),
      upperDeck: ne.at(-13, -40),
      slipwayFoot: ne.at(-47, -6.5),
      westRock: ne.at(-13, -58),
      eastRock: ne.at(20, 40),
      // In the cut's water on each side of the lower level (west: beside the deck; east: under the east platform's
      // rock wall, north of the platform).
      seaWest: ne.at(40, -16),
      seaEast: ne.at(-40, 6),
      seaOutside: ne.at(-130, 0),
      upperInN: platforms[0]!.middle,
      upperInS: platforms[1]!.middle,
      upperOutN: platforms[6]!.middle,
      upperOutS: platforms[7]!.middle,
      // The feet that must land well inside solid rock (change 2).
      feet: {
        'upper-in-n-end': platforms[0]!.foot,
        'upper-in-s-end': platforms[1]!.foot,
        'upper-out-n-end': platforms[6]!.foot,
        'upper-out-s-end': platforms[7]!.foot,
        'upper-step': ne.at(-13, -50.5),
        // South of the collider's face, on the walk from the in half's end ramps.
        "the pinnacle's foot": ne.at(-5, 25),
      },
    },
  };
}

// ---------------------------------------------------------------- Home's West landing
const WEST_ROOT = { x: 801, z: 10 },
  WEST_S = unit(-0.6155, -0.7881),
  WEST_LAT = perp(WEST_S, -1);
const sl = frame(WEST_ROOT, WEST_S, WEST_LAT);
// Owner Q1, 15 November: every room sees the staked site until the build that starts bay-cut.
// Flip this with that build's station/formation work, never from room progression. Flipped with greybox leg 2's rules
// (docs/plans/greybox-leg2.md, step 2: the build that starts bay-cut), 18 November 2026.
const WEST_STAKED = false;
const WEST_RAIL = 4,
  WEST_SHELF = 3;

function west() {
  const top = WEST_RAIL + 0.9;
  return {
    /** The stop, s 20. */
    origin: sl.at(20, 0),
    basis: sl.basis,
    staked: WEST_STAKED,
    pieces: WEST_STAKED
      ? []
      : [
          { ...sl.box('bed', 0, 60, -BED, BED, WEST_RAIL - 0.1, 1, 'dark'), posts: true },
          // Platform A is the landward one; past s 20 the ground falls under the sea and both stand on posts.
          { ...sl.box('platform-a', 0, 40, BED, PLAT, top, 2, 'light'), posts: true },
          // B starts at s 2: from s 0 its root corner stood 1 m inside the `cave` row's corridor, which leaves this root.
          { ...sl.box('platform-b', 2, 40, -PLAT, -BED, top, 2, 'light'), posts: true },
          sl.ramp('end-ramp', 0, top, -4, WEST_SHELF, BED, PLAT, 'grey'),
          sl.box('apron', 4, 16, PLAT, 11.8, top, 2, 'grey'),
          // Call 120 reversed (start-area S1): the shore path climbs to the commons and meets the end ramp's foot.
          // A second climb here crossed that path and read as the newcomer's way up.
        ],
    pads: [],
    // A single row of short timber survey stakes on the level shelf, beside the first 20 m of the bed.
    // Decorative only: no platforms or hidden platform collision, and the shore path stays clear.
    extras: WEST_STAKED
      ? [0, 1, 2, 3, 4].map((k) => ({
          id: `survey-${k}`,
          prefab: 'greybox.decoration',
          // Authored 5 m steps (-3, -4), along the shelf beside the bed rather than out over the water.
          pos: [805.5 - 3 * k, 3.5, 6.5 - 4 * k],
          scale: [0.14, 1.2, 0.14],
          params: { colour: '#8a6238' },
        }))
      : [],
    // On the shelf beside the shore path's foot, facing the path; keep the existing placeholder copy.
    posts: [
      {
        id: 'board',
        x: WEST_STAKED ? 810 : 805,
        z: WEST_STAKED ? 5.5 : 20.5,
        y: WEST_SHELF,
        nx: WEST_STAKED ? 0 : 1,
        nz: WEST_STAKED ? 1 : 0,
        label: 'west.board',
      },
    ],
    reserves: [
      sl.reserve('bay row', 0, 60, -BED, BED, WEST_RAIL - 0.1, WEST_RAIL + LOADING),
      // The rack and the first frame.
      sl.reserve('apron', 4, 16, PLAT, 11.8, top, top + CLEAR),
      sl.reserve('platform-a lever end', 0, 3, BED, PLAT, top, top + CLEAR),
      sl.reserve('platform-b lever end', 2, 5, -PLAT, -BED, top, top + CLEAR),
    ],
    marks: {
      root: sl.at(0, 0),
      stop: sl.at(20, 0),
      seaEnd: sl.at(40, 0),
      platformA: sl.at(20, 5.8),
      platformB: sl.at(20, -5.8),
      rampFoot: sl.at(-5, 5.8),
      rampHead: sl.at(1, 5.8),
      // One straight line at the cliff, north of the shore path (the walk's control).
      cliffFoot: { x: 808, z: -3 },
      cliffTop: { x: 830, z: -3 },
      /** The commons, 60 m east of the stop, on the cliff's top. */
      commons: offset(sl.at(20, 0), 60, 0),
    },
  };
}

// ---------------------------------------------------------------- High Gorge's incline platforms
const GORGE_O = { x: -103, z: -1988 },
  GORGE_A = { x: 0.8565, z: 0.5162 },
  GORGE_C = { x: -0.5162, z: 0.8565 },
  GORGE_T = { compute: 'unit' as const, axis: mix(GORGE_A, GORGE_C, 0.741, 0.672) };
const tl = frame(GORGE_O, GORGE_T, perp(GORGE_T, -1)),
  ac = frame(GORGE_O, GORGE_A, GORGE_C);
const GORGE_RAIL = 3,
  GORGE_DECK = 3.9;

// ---------------------------------------------------------------- the incline's bore (greybox-leg2.md, step 4)
// The `ns` row through the south stack, in the split's a/c frame: t along the row from the split's origin, l right of
// it going out (+c). a(t, l) = TA t - TC l, c(t, l) = TC t + TA l.
const TN = Math.hypot(0.741, 0.672),
  TA = 0.741 / TN,
  TC = 0.672 / TN;
/** The stack's east face where the row leaves it: the `stack-s` outline's vertices 0 to 2 in the a/c frame
 * (docs/world/map-prototypes.html; the split's wall, where it enters, is c 45). */
const EAST_FACE = [
  [170.234, 135.26],
  [171.269, 152.159],
  [173.688, 168.934],
] as const;
/** Where the line `l` metres off the row meets the split's wall, and the stack's east face (t). */
const wallT = (l: number) => (45 - TA * l) / TC;
function faceT(l: number) {
  for (let i = 1; i < EAST_FACE.length; i++) {
    const [pa, pc] = EAST_FACE[i - 1]!,
      [qa, qc] = EAST_FACE[i]!,
      da = qa - pa,
      dc = qc - pc,
      det = da * TC - TA * dc,
      ra = pa + TC * l,
      rc = pc - TA * l,
      t = (dc * -ra + da * rc) / det,
      u = (TA * rc - TC * ra) / det;
    if (u >= 0 && u <= 1) return t;
  }
  throw new Error('leg2: the bore misses the east face');
}
/** The bore's ends, authored to 0.1 m: [l, t at the split's wall, t at the east face] every half metre across it.
 * Checked against wallT and faceT at load (within 0.1 m), so a moved outline fails the build, not the look. */
const BORE_ENDS: readonly (readonly [number, number, number])[] = [
  [-4.5, 71.9, 226.9],
  [-4, 71.4, 227.4],
  [-3.5, 70.8, 227.9],
  [-3, 70.3, 228.4],
  [-2.5, 69.7, 228.9],
  [-2, 69.2, 229.5],
  [-1.5, 68.6, 230.1],
  [-1, 68.1, 230.7],
  [-0.5, 67.5, 231.3],
  [0, 67, 231.9],
  [0.5, 66.4, 232.5],
  [1, 65.9, 233.1],
  [1.5, 65.3, 233.7],
  [2, 64.8, 234.3],
  [2.5, 64.2, 234.9],
  [3, 63.7, 235.5],
  [3.5, 63.1, 236.1],
  [4, 62.6, 236.8],
  [4.5, 62, 237.4],
];
for (const [l, w, f] of BORE_ENDS)
  if (Math.abs(w - wallT(l)) > 0.1 || Math.abs(f - faceT(l)) > 0.1) throw new Error(`leg2: bore end l ${l} has moved`);
const boreEnds = (l: number) => {
  const e = BORE_ENDS.find((r) => r[0] === l);
  if (!e) throw new Error(`leg2: no bore end at l ${l}`);
  return { wall: e[1], face: e[2] };
};
/** The mouth marks' bounds, a and c (to 0.01 m): 0.8 m frames outside where the lining's inner faces (l ±4) meet each
 * face, and a lintel over each opening to the lining's outer faces (l ±5). */
const MOUTH = {
  in: { s: [42.87, 43.67], n: [55.58, 56.38], lintel: [42.87, 56.38] },
  out: {
    s: { a: [172.69, 173.49], c: [162.01, 162.81] },
    n: { a: [171.12, 171.92], c: [148.99, 149.79] },
    lintel: { a: [171.04, 173.71], c: [148.36, 163.56] },
  },
} as const;
/** The south stack's collider round the bore, in the band between its floor and roof (to 0.1 m, never into the bore):
 * west of where its +c side (l 5) meets the split's wall, a 42.1; the box along the row on that side from there to a
 * 120 (t 61.5 to 166.6, l 5 to 58); over that box, c 115.6 on; east of the -c side's meeting (a 57.06), a stair of
 * slices [a0, a1, c top] whose corners the lining's wall closes. */
const STACK_S = {
  westA: 42.1,
  along: { t0: 61.5, t1: 166.6, l0: 5, l1: 58 },
  overC: 115.6,
  east: [
    [58.1, 59.1, 45.9],
    [59.1, 60.1, 46.8],
    [60.1, 61.1, 47.7],
    [61.1, 65.1, 48.6],
    [65.1, 69.1, 52.2],
    [69.1, 73.1, 55.9],
    [73.1, 77.1, 59.5],
    [77.1, 81.1, 63.1],
    [81.1, 85.1, 66.7],
    [85.1, 89.1, 70.4],
    [89.1, 93.1, 74],
    [93.1, 97.1, 77.6],
    [97.1, 101.1, 81.3],
    [101.1, 105.1, 84.9],
    [105.1, 109.1, 88.5],
    [109.1, 113.1, 92.1],
    [113.1, 117.1, 95.8],
    [117.1, 120, 99.4],
  ],
} as const;
{
  // Never into the bore (l -5 to 5: c - m a within ±5 / TA), and the box along the row reaches a 120.
  const m = TC / TA,
    k = 5 / TA,
    inBore = (a: number, c: number) => Math.abs(c - m * a) < k - 1e-6;
  const bad =
    inBore(STACK_S.westA, 45) ||
    inBore(120, STACK_S.overC) ||
    STACK_S.east.some(([a0, a1, c]) => inBore(a0, c) || a0 >= a1) ||
    Math.abs(STACK_S.along.t0 - wallT(5)) > 0.1 ||
    STACK_S.along.t1 * TA - TC * 5 < 120;
  if (bad) throw new Error('leg2: the south stack collider enters the bore');
}
/** The bore's unlaid bed (as Bell Rock's and the West landing's are), its floor across the deck's 7.6 m: 0.15 m under
 * the row's straight grade pieces (BED_KNOTS), so the deck a lay makes solid only steps a body standing on it up. The
 * drawn rail is smoothed and runs up to 0.103 m under those pieces, so the bed's top is 0.045 to 0.17 m under it: about
 * 0.15 m along most of the bore, the least (0.045 m, measured) at the grade knot near s 79, and it never shows through
 * the deck. It is solid down to the floor's level (`BED_FOOT`, where the floor's edge strips beside the walls have
 * their top), so nothing standable is left under the deck. In 0.95 m strips, each from the split's wall to the east
 * face (reaching both faces for the whole strip: at most 1.2 m past one corner): [l0, l1, t at the wall, its top there,
 * t at the face]. The top then follows the row's grade: up to the knot at t 79.128, on to the one at t 217.598, then
 * level. Checked at load against the row's knots and the stack's faces. */
const BED_FOOT = INCLINE_BORE.floor;
const BED_KNOTS = [
  [56.001, 2.85],
  [79.128, 3.75],
  [217.598, 3.85],
] as const;
const BORE_BED = [
  [-3.8, -2.85, 70.05, 3.4, 228.65],
  [-2.85, -1.9, 68.95, 3.36, 229.75],
  [-1.9, -0.95, 67.95, 3.32, 230.85],
  [-0.95, 0, 66.85, 3.27, 232.05],
  [0, 0.95, 65.85, 3.24, 233.15],
  [0.95, 1.9, 64.75, 3.19, 234.35],
  [1.9, 2.85, 63.75, 3.15, 235.45],
  [2.85, 3.8, 62.65, 3.11, 236.65],
] as const;
for (const [l0, l1, t0, y0, t1] of BORE_BED) {
  const [[ka, ya], [kb, yb]] = BED_KNOTS,
    grade = ya + ((yb - ya) * (t0 - ka)) / (kb - ka);
  if (
    t0 > Math.min(wallT(l0), wallT(l1)) ||
    t1 < Math.max(faceT(l0), faceT(l1)) ||
    t0 < ka ||
    Math.abs(y0 - grade) > 0.01
  )
    throw new Error(`leg2: the bore's bed at l ${l0} has moved`);
}
/** A pale, drawn-only box in the split's a/c frame: a part of a bore mouth's frame. */
const mouthMark = (id: string, a: readonly number[], c: readonly number[], y: Scalar, h: Scalar) => ({
  ...ac.box(id, a[0]!, a[1]!, c[0]!, c[1]!, y, h, 'pale'),
  solid: false,
});
/** The bore's dark lining, its two mouth marks and the south stack's collider round it (the stack's slab over the
 * bore is gorge.ts's). The lining's slabs are cut in strips along l so each strip's ends meet the stack's faces (within
 * half a metre); its walls seal the bore from the collider's corners. */
function bore() {
  const B = INCLINE_BORE,
    side = B.half + B.wall,
    top = B.roof + B.slab,
    bottom = B.floor - B.slab,
    band = top - bottom,
    pieces: unknown[] = [];
  const s = boreEnds(B.half + B.wall / 2),
    n = boreEnds(-B.half - B.wall / 2);
  pieces.push(tl.box('bore-wall-s', s.wall, s.face, B.half, side, top, band, 'black'));
  pieces.push(tl.box('bore-wall-n', n.wall, n.face, -side, -B.half, top, band, 'black'));
  // The roof and floor between the walls (they share no face with them: no coplanar overlap to flicker).
  for (let l = -B.half; l < B.half; l += 1) {
    const e = boreEnds(l + 0.5);
    pieces.push(tl.box(`bore-roof-${l + B.half}`, e.wall, e.face, l, l + 1, top, B.slab, 'black'));
  }
  // The floor's edge strips, between the bed (BORE_BED, below) and each wall.
  for (const [id, l0, l1, at] of [
    ['bore-floor-s', 3.8, B.half, B.half],
    ['bore-floor-n', -B.half, -3.8, -B.half],
  ] as const) {
    const e = boreEnds(at);
    pieces.push(tl.box(id, e.wall, e.face, l0, l1, B.floor, B.slab, 'black'));
  }
  // The mouth marks: a pale frame round each opening (the split's lintel is the old portal, in gorge()). Each frame
  // stands clear of the roof's slab it meets in plan: its lintel 0.1 m over the slab's top.
  const { in: i, out: o } = MOUTH,
    lintel = add(top, 0.1),
    jamb = sub(lintel, B.floor),
    wall: readonly number[] = [44.6, 45];
  pieces.push(mouthMark('mouth-in-s', i.s, wall, lintel, jamb));
  pieces.push(mouthMark('mouth-in-n', i.n, wall, lintel, jamb));
  pieces.push(mouthMark('mouth-out-s', o.s.a, o.s.c, lintel, jamb));
  pieces.push(mouthMark('mouth-out-n', o.n.a, o.n.c, lintel, jamb));
  pieces.push(mouthMark('mouth-out-lintel', o.lintel.a, o.lintel.c, add(lintel, 1.2), 1.2));
  const hidden = (p: object) => ({ ...p, hidden: true });
  const S = STACK_S;
  pieces.push(hidden(ac.box('stack-s-under', -120, 120, 45, 245, bottom, bottom + 10, 'black')));
  pieces.push(hidden(ac.box('stack-s-west', -120, S.westA, 45, 245, top, band, 'black')));
  pieces.push(hidden(tl.box('stack-s-along', S.along.t0, S.along.t1, S.along.l0, S.along.l1, top, band, 'black')));
  pieces.push(hidden(ac.box('stack-s-over', S.westA, 120, S.overC, 245, top, band, 'black')));
  S.east.forEach(([a0, a1, c], j) =>
    pieces.push(hidden(ac.box(`stack-s-east-${j}`, a0, a1, 45, c, top, band, 'black'))),
  );
  const [, [kb, yb], [kc, yc]] = BED_KNOTS;
  BORE_BED.forEach(([l0, l1, t0, y0, t1], k) => {
    pieces.push({ ...tl.ramp(`bore-bed-${k}-a`, t0, y0, kb, yb, l0, l1, 'dark'), h: sub(y0, BED_FOOT) });
    pieces.push({ ...tl.ramp(`bore-bed-${k}-b`, kb, yb, kc, yc, l0, l1, 'dark'), h: sub(yb, BED_FOOT) });
    pieces.push(tl.box(`bore-bed-${k}-c`, kc, t1, l0, l1, yc, sub(yc, BED_FOOT), 'dark'));
  });
  return pieces;
}

function gorge() {
  return {
    origin: GORGE_O,
    basis: tl.basis,
    // Built on call 118 (the stop moves to about t 36): if the owner reverses it, these two boxes move.
    pieces: [
      { ...tl.box('incline-n', 16, 56, BED, PLAT, GORGE_DECK, 0.5, 'light'), posts: true },
      { ...tl.box('incline-s', 16, 56, -PLAT, -BED, GORGE_DECK, 0.5, 'light'), posts: true },
      // Call 116: the tunnel's mouth is marked on the south wall where the row enters the rock. Bored by step 4 of
      // greybox-leg2 (bore(), after these): the old dark panel is the mouth's pale lintel now.
      mouthMark('portal', MOUTH.in.lintel, [44.4, 45], add(add(INCLINE_BORE.roof, INCLINE_BORE.slab), 1.3), 1.2),
      ...bore(),
    ],
    pads: [],
    posts: [],
    reserves: [
      // To 5 m short of the wall, where the mouth's mark stands across the row.
      tl.reserve('ns row', 16, 62, -BED, BED, GORGE_RAIL - 0.1, GORGE_RAIL + LOADING),
      tl.reserve('incline-n lever end', 16, 19, BED, PLAT, GORGE_DECK, GORGE_DECK + CLEAR),
      tl.reserve('incline-s lever end', 16, 19, -PLAT, -BED, GORGE_DECK, GORGE_DECK + CLEAR),
    ],
    marks: {},
  };
}

const bellData = bell();
const data = { bell: { ...bellData, footOrder: Object.keys(bellData.marks.feet) }, west: west(), gorge: gorge() };
export type Leg2Analysis = {
  [K in keyof typeof data]: Omit<Evaluated<(typeof data)[K]>, 'basis' | 'pieces' | 'pads' | 'posts'> & {
    surfaces: { id: string; name: string; over: boolean }[];
    pads: { id: string; name: string }[];
    posts: { id: string; name: string }[];
  };
};
const level = (id: keyof typeof data) =>
  defineLevel({ place: id, placements: [], layout: layoutData({ kind: 'leg2', area: id, data: data[id] }) });
export const levels = [level('bell'), level('west')];
export const inclineLayout = layoutData(data.gorge);

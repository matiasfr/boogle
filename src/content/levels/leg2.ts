// Leg 2 authoring. Private frame inputs compile to placements; the checker reads the same JSON.
import { defineLevel } from '../../prefab/types.ts';

import { frame, unit, perp, mix, offset, sub, layoutData, type Evaluated } from '../../prefab/authoring.ts';
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
  IN = unit(0.855, 0.519),
  OUT = unit(-0.934, 0.357);
const ne = frame(BELL_O, BELL_N, BELL_E),
  // The same frame with `e` first, for a box whose length runs across.
  en = frame(BELL_O, BELL_E, BELL_N),
  // `lat` + on each half's north side (the outside of the 52 degree kink).
  bayIn = frame(BELL_O, IN, perp(IN)),
  bayOut = frame(BELL_O, OUT, perp(OUT, -1));
const LOWER = 4.9,
  UPPER = 15.9,
  ROCK = 14,
  NS_RAIL = 4,
  BAY_RAIL = 15;
/** The pinnacle's map point, moved 6 m east (call 117): docs/world/map-prototypes.html, landmark `bell`. */
const PINNACLE = { x: -24, z: -870 };

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
    // The upper level. PROVISIONAL (design review, change 5): the four upper platforms and the deck's south edge move
    // when the track plan eases the 52 degree kink (about 11 m south at a 100 m radius), so they get no polish.
    { ...bayIn.box('bay-bed-in', -4, 70, -BED, BED, BAY_RAIL - 0.1, sub(BAY_RAIL - 0.1, ROCK), 'dark'), over: true },
    { ...bayOut.box('bay-bed-out', -4, 70, -BED, BED, BAY_RAIL - 0.1, sub(BAY_RAIL - 0.1, ROCK), 'dark'), over: true },
    // The two on the inside of the kink start at t 2: from t -3 their corners stood in the other half's bed.
    { ...bayIn.box('upper-in-n', -3, 20, BED, PLAT, UPPER, sub(UPPER, ROCK), 'light'), over: true, provisional: true },
    { ...bayIn.box('upper-in-s', 2, 20, -PLAT, -BED, UPPER, sub(UPPER, ROCK), 'light'), over: true, provisional: true },
    {
      ...bayOut.box('upper-out-n', -3, 30, BED, PLAT, UPPER, sub(UPPER, ROCK), 'light'),
      over: true,
      provisional: true,
    },
    {
      ...bayOut.box('upper-out-s', 2, 30, -PLAT, -BED, UPPER, sub(UPPER, ROCK), 'light'),
      over: true,
      provisional: true,
    },
    { ...bayIn.ramp('upper-in-n-end', 20, UPPER, 24, ROCK, BED, PLAT, 'grey'), over: true, provisional: true },
    { ...bayIn.ramp('upper-in-s-end', 20, UPPER, 24, ROCK, -PLAT, -BED, 'grey'), over: true, provisional: true },
    { ...bayOut.ramp('upper-out-n-end', 30, UPPER, 34, ROCK, BED, PLAT, 'grey'), over: true, provisional: true },
    { ...bayOut.ramp('upper-out-s-end', 30, UPPER, 34, ROCK, -PLAT, -BED, 'grey'), over: true, provisional: true },
    { ...ne.box('upper-deck', -30, 3, -46, -24, UPPER, sub(UPPER, ROCK), 'grey'), provisional: true },
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
      bayIn.reserve('bay row, in', 0, 70, -BED, BED, BAY_RAIL - 0.1, BAY_RAIL + LOADING),
      bayOut.reserve('bay row, out', 0, 70, -BED, BED, BAY_RAIL - 0.1, BAY_RAIL + LOADING),
      ne.reserve('seeds spot', -5.5, -2.5, -16.5, -13.5, LOWER, LOWER + CLEAR),
      ne.reserve('Canopy frame and barrier', -2, 3, -30, -24, UPPER, UPPER + CLEAR),
      // Each platform's homeward 3 m (a lever, a board).
      ne.reserve('lower-east lever end', -20, -17, BED, 9, LOWER, LOWER + CLEAR),
      ne.reserve('lower-west lever end', -28, -25, -PLAT, -BED, LOWER, LOWER + CLEAR),
      bayIn.reserve('upper-in-n lever end', 17, 20, BED, PLAT, UPPER, UPPER + CLEAR),
      bayIn.reserve('upper-in-s lever end', 17, 20, -PLAT, -BED, UPPER, UPPER + CLEAR),
      bayOut.reserve('upper-out-n lever end', -3, 0, BED, PLAT, UPPER, UPPER + CLEAR),
      bayOut.reserve('upper-out-s lever end', 2, 5, -PLAT, -BED, UPPER, UPPER + CLEAR),
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
      upperInN: bayIn.at(10, 5.8),
      upperInS: bayIn.at(10, -5.8),
      upperOutN: bayOut.at(15, 5.8),
      upperOutS: bayOut.at(15, -5.8),
      // The feet that must land well inside solid rock (change 2).
      feet: {
        'upper-in-n-end': bayIn.at(24.5, 5.8),
        'upper-in-s-end': bayIn.at(24.5, -5.8),
        'upper-out-n-end': bayOut.at(34.5, 5.8),
        'upper-out-s-end': bayOut.at(34.5, -5.8),
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
// World axes, for what follows the cliff and not the row: `a` is x (east), `b` is z (south).
const xz = frame({ x: 0, z: 0 }, { x: 1, z: 0 }, { x: 0, z: 1 });
const WEST_RAIL = 4,
  WEST_SHELF = 3,
  // The stair's top on the commons' edge (the terrain there stands at 17 to 18 m).
  WEST_TOP = 17.2,
  // The stair runs due east from the shelf beside the end ramp, 26 m at the Ring ramps' 5.4 in 10, placed so the
  // cliff's face stays under it and its top is flush with the commons' edge.
  STAIR = { x0: 805, x1: 831, z0: 13.5, z1: 16.5 };

function west() {
  const top = WEST_RAIL + 0.9;
  return {
    /** The stop, s 20. */
    origin: sl.at(20, 0),
    basis: sl.basis,
    pieces: [
      { ...sl.box('bed', 0, 60, -BED, BED, WEST_RAIL - 0.1, 1, 'dark'), posts: true },
      // Platform A is the landward one; past s 20 the ground falls under the sea and both stand on posts.
      { ...sl.box('platform-a', 0, 40, BED, PLAT, top, 2, 'light'), posts: true },
      // B starts at s 2: from s 0 its root corner stood 1 m inside the `cave` row's corridor, which leaves this root.
      { ...sl.box('platform-b', 2, 40, -PLAT, -BED, top, 2, 'light'), posts: true },
      sl.ramp('end-ramp', 0, top, -4, WEST_SHELF, BED, PLAT, 'grey'),
      sl.box('apron', 4, 16, PLAT, 11.8, top, 2, 'grey'),
      // Call 120: the cliff alone is not a way up (a straight walk at it stops at its foot), so a plain grey stair
      // climbs it from the shelf to the commons, with a parapet each side.
      {
        ...xz.ramp('stair', STAIR.x0, WEST_SHELF, STAIR.x1, WEST_TOP, STAIR.z0, STAIR.z1, 'light'),
        h: 0.4,
        posts: true,
      },
      {
        ...xz.ramp(
          'stair-parapet-n',
          STAIR.x0,
          WEST_SHELF + 1,
          STAIR.x1,
          WEST_TOP + 1,
          STAIR.z0 - 0.2,
          STAIR.z0,
          'pale',
        ),
        h: 1,
      },
      {
        ...xz.ramp(
          'stair-parapet-s',
          STAIR.x0,
          WEST_SHELF + 1,
          STAIR.x1,
          WEST_TOP + 1,
          STAIR.z1,
          STAIR.z1 + 0.2,
          'pale',
        ),
        h: 1,
      },
    ],
    pads: [],
    // Change 4: beside the stair's foot, facing east, so the walk down from the commons reads it before the platform.
    posts: [
      {
        id: 'board',
        x: 805,
        z: 20.5,
        y: WEST_SHELF,
        nx: 1,
        nz: 0,
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
      stairFoot: { x: STAIR.x0 - 1.2, z: (STAIR.z0 + STAIR.z1) / 2 },
      /** Round the north parapet's end, between the stair's foot and the end ramp's. */
      stairTurn: { x: STAIR.x0 - 1.2, z: STAIR.z0 - 2.5 },
      stairTop: { x: STAIR.x1 + 2.5, z: (STAIR.z0 + STAIR.z1) / 2 },
      // One straight line at the cliff, 15 m north of the stair (the walk's control).
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

function gorge() {
  return {
    origin: GORGE_O,
    basis: tl.basis,
    // Built on call 118 (the stop moves to about t 36): if the owner reverses it, these two boxes move.
    pieces: [
      { ...tl.box('incline-n', 16, 56, BED, PLAT, GORGE_DECK, 0.5, 'light'), posts: true },
      { ...tl.box('incline-s', 16, 56, -PLAT, -BED, GORGE_DECK, 0.5, 'light'), posts: true },
      // Call 116: the tunnel's mouth is marked on the south wall where the row enters the rock; nothing is bored.
      { ...ac.box('portal', 45.1, 54.1, 44.7, 45, GORGE_RAIL + 7, 7, 'black'), solid: false },
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

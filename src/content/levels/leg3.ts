// Leg 3 authoring (docs/plans/greybox-leg3.md, "The massing (steps 5 and 6)", step 6): Canopy isle, the White Wall's
// two chalk islets either side of the halt, the isle's beach, the bay row's bank and Canopy Town's platforms and deck.
// Private inputs compile to placements (content/built/levels/canopy.json); the level report reads the same JSON.
// The isle, the islets and the trees are drawn by the horizon (entities/sickle-backdrop/view.ts) from the same map:
// this adds their colliders, the beach and the halt. Heads 1 and 2 are the leg view's (route-greybox/leg-view.ts).
import { defineLevel } from '../../prefab/types.ts';
import { add, frame, mix, unit, perp, layoutData, type Axis, type Evaluated } from '../../prefab/authoring.ts';

// <baked> by `node --import ./dev/sim/hooks.ts dev/level/route-leg3.ts --bake` from the map and the drawn row; the level
// report re-bakes and fails if any number here is off by more than 0.01.
/** The map's smoothed outlines (docs/world/map-prototypes.html, option A's `land` rings), world x, z pairs. */
export const CANOPY_LANDS = {
  'canopy-isle': [
    -733.41, -300, -743.42, -269.57, -755.31, -240.78, -766.35, -210.93, -773.23, -178.13, -779.25, -144.26, -791.58,
    -112.3, -812.92, -80.77, -840.57, -51.16, -873.57, -30.9, -913.65, -27.46, -959.07, -33.37, -1003.66, -33.75,
    -1045.29, -18.27, -1086.09, 2.74, -1126.26, 13.14, -1165.19, 3.87, -1203.49, -16.01, -1243.23, -35.54, -1289.95,
    -48.17, -1338.1, -60.45, -1373.09, -81.07, -1383.61, -116.5, -1380.95, -160.27, -1384.48, -201.58, -1406.18,
    -235.57, -1434.07, -267.11, -1451.51, -300, -1452.48, -337.5, -1443.01, -376.34, -1424.57, -410.58, -1392.65,
    -434.99, -1351.76, -454.8, -1316.93, -479.66, -1298.43, -518.46, -1285.99, -562.31, -1263.9, -594.3, -1223.34,
    -604.59, -1173.13, -603.02, -1123.93, -602.13, -1078.23, -610.05, -1033.54, -618.66, -993.1, -616.17, -959.89,
    -593.41, -930.92, -559.54, -900.46, -530.28, -864.99, -513.77, -828.02, -501.85, -794.32, -485.78, -763.11, -462.06,
    -735.16, -434.19, -717.52, -403.88, -715.32, -370.33, -723.42, -334.34,
  ],
  'wall-cn': [
    -1085.05, -342.11, -1094.45, -339.77, -1103.87, -338.08, -1110.47, -342.29, -1112.65, -355.67, -1112.02, -374.95,
    -1110.62, -395.56, -1109.7, -415.61, -1108.01, -436.98, -1103.84, -460.79, -1095.92, -488.19, -1085.52, -518.02,
    -1074.71, -547.85, -1064.35, -577.53, -1053.58, -607.2, -1041.86, -634.85, -1028.64, -659.26, -1014.47, -681.65,
    -1000.43, -703.63, -986.41, -727.96, -972.53, -751.89, -960.21, -768.68, -950.69, -772.76, -942.72, -769.7, -934.03,
    -769.6, -922.71, -779.05, -910.66, -791.45, -901.25, -797.03, -896.83, -789.81, -895.04, -775.78, -892.27, -763.13,
    -885.88, -756.95, -878.5, -752.16, -874.47, -741.64, -875.8, -721.61, -880.47, -695.85, -886.77, -668.63, -894.18,
    -640.64, -903.21, -611.2, -913.68, -582.5, -926.11, -554.95, -939.98, -528.15, -953.48, -503.11, -965.92, -480.69,
    -978, -460.03, -990.09, -439.67, -1002.45, -418.11, -1014.83, -396.85, -1026.79, -378.88, -1038.34, -365.36,
    -1049.46, -355.13, -1059.74, -347.74, -1068.74, -343.76, -1076.89, -342.61,
  ],
  'wall-cs': [
    -1100.95, 219.48, -1109.26, 224.46, -1117.77, 228.83, -1125.31, 226.74, -1131.31, 214.58, -1136.34, 195.96,
    -1141.02, 175.84, -1146.01, 156.4, -1150.64, 135.46, -1153.61, 111.48, -1154.06, 82.96, -1152.83, 51.39, -1151.21,
    19.71, -1149.98, -11.7, -1148.36, -43.23, -1145.23, -73.09, -1139.73, -100.31, -1132.72, -125.86, -1125.72, -150.98,
    -1119.44, -178.35, -1113.15, -205.29, -1106.28, -224.96, -1098.37, -231.64, -1089.86, -231.04, -1081.51, -233.48,
    -1073.45, -245.83, -1065.55, -261.21, -1058.19, -269.3, -1051.84, -263.69, -1046.03, -250.8, -1039.69, -239.51,
    -1031.77, -235.47, -1023.31, -233.04, -1016.38, -224.16, -1011.8, -204.61, -1008.73, -178.61, -1006.8, -150.75,
    -1005.7, -121.81, -1005.73, -91.01, -1007.35, -60.51, -1011.18, -30.53, -1016.61, -0.84, -1022.2, 27.04, -1027.54,
    52.13, -1033.05, 75.41, -1038.66, 98.42, -1044.18, 122.65, -1049.8, 146.6, -1055.98, 167.28, -1063.07, 183.59,
    -1070.72, 196.62, -1078.39, 206.69, -1085.84, 213.13, -1093.29, 216.61,
  ],
} as const;
/** Each ring's centroid: its collider's top is a fan from here (each ring is star-shaped about it). */
export const CANOPY_CENTRES = {
  'canopy-isle': [-1071.21, -300.87],
  'wall-cn': [-995.54, -565.98],
  'wall-cs': [-1080.81, -20.78],
} as const;
/** The beach: [isle edge, centre x, z, yaw (outward), width]. */
export const CANOPY_BEACH = [
  [0, -719.42, -278.54, 1.253, 33.03],
  [1, -730.88, -247.54, 1.1791, 32.15],
  [2, -742.07, -218.92, 1.2165, 32.83],
  [3, -750.22, -190.42, 1.364, 34.51],
  [4, -756.55, -157.7, 1.3949, 35.4],
  [5, -766.76, -121.08, 1.2026, 35.26],
  [6, -785.69, -85.32, 0.9758, 39.07],
  [7, -812.13, -52.31, 0.8196, 41.51],
  [8, -846.61, -23.99, 0.5506, 39.72],
  [9, -891.9, -9.25, 0.0856, 41.23],
  [10, -938.94, -10.58, -0.1294, 46.8],
  [11, -981.54, -13.56, -0.0085, 45.59],
  [16, -1193.55, 11.68, -0.4788, 44.15],
  [17, -1232.18, -7.83, -0.4568, 45.28],
  [18, -1271.81, -22.55, -0.264, 49.4],
  [19, -1318.97, -34.93, -0.2497, 50.69],
  [20, -1365.75, -53.53, -0.5325, 41.61],
  [21, -1397.52, -93.09, -1.2822, 37.96],
  [22, -1402.24, -139.6, -1.6315, 44.85],
  [23, -1402.64, -179.22, -1.4856, 42.46],
  [24, -1412.19, -207.81, -1.0026, 41.33],
  [25, -1435.11, -238.09, -0.8467, 43.1],
  [26, -1460.46, -274.19, -1.0832, 38.23],
  [27, -1471.99, -318.23, -1.5449, 38.51],
  [28, -1467.18, -361.66, -1.81, 40.98],
  [29, -1451.4, -402.94, -2.0648, 39.89],
  [30, -1420.76, -438.67, -2.4887, 41.18],
  [31, -1380.92, -462.89, -2.6904, 46.44],
  [32, -1345.96, -483.51, -2.5217, 43.79],
  [33, -1325.73, -507.67, -2.0157, 43.98],
  [34, -1311.45, -545.84, -1.8472, 46.58],
  [35, -1291.4, -589.67, -2.1751, 39.88],
  [36, -1248.54, -618.83, -2.8931, 42.84],
  [37, -1197.61, -623.8, 3.1103, 51.23],
  [38, -1148.17, -622.57, 3.1235, 50.21],
  [39, -1104.5, -625.8, -2.97, 47.38],
  [40, -1059.67, -633.99, -2.9513, 46.51],
  [44, -901.83, -559.33, 2.3763, 43.24],
  [47, -802.56, -511.87, 2.6966, 38.34],
  [48, -766.61, -489.84, 2.4917, 40.2],
  [49, -735.01, -462.29, 2.3576, 40.47],
  [50, -709.05, -429.1, 2.0979, 36.07],
  [51, -696.46, -388.41, 1.6363, 34.62],
  [52, -699.86, -347.94, 1.3494, 37.89],
  [53, -709.21, -311.58, 1.2877, 36.76],
] as const;
/** The forest's trunks (the map's `forest` on the isle, as the horizon draws them): [id, x, z, width, top, h]. */
export const CANOPY_TRUNKS = [
  ['trunk-0', -875, -300, 12, 44, 32.5],
  ['trunk-1', -901.13, -222, 12, 44, 32.5],
  ['trunk-2', -972.5, -164.9, 12, 44, 32.5],
  ['trunk-3', -1070, -144, 12, 44, 32.5],
  ['trunk-4', -1167.5, -164.9, 12, 44, 32.5],
  ['trunk-5', -1238.87, -222, 12, 44, 32.5],
  ['trunk-6', -1265, -300, 12, 44, 32.5],
  ['trunk-7', -1238.87, -378, 12, 44, 32.5],
  ['trunk-8', -1167.5, -435.1, 12, 44, 32.5],
  ['trunk-9', -1070, -456, 12, 44, 32.5],
  ['trunk-10', -972.5, -435.1, 12, 44, 32.5],
  ['trunk-11', -901.13, -378, 12, 44, 32.5],
  ['mother-0', -930, -360, 10, 120, 108.5],
  ['mother-1', -960, -240, 10, 120, 108.5],
  ['mother-2', -1050, -300, 10, 120, 108.5],
  ['mother-3', -1140, -250, 10, 120, 108.5],
  ['mother-4', -1190, -350, 10, 120, 108.5],
] as const;
/** The drawn row past s 2413 (railway/row-path.ts, smoothed through the kink): [ax, az, bx, bz, length]. */
export const CANOPY_CURVE = [
  [-1090.36, -308.58, -1092.6, -306.59, 3],
  [-1092.6, -306.59, -1095.59, -303.94, 4],
  [-1095.59, -303.94, -1098.61, -301.42, 3.93],
  [-1098.61, -301.42, -1100.01, -300.3, 1.79],
  [-1100.01, -300.3, -1103.42, -297.76, 4.25],
  [-1103.42, -297.76, -1107.61, -295.13, 4.95],
  [-1107.61, -295.13, -1112.06, -292.97, 4.95],
  [-1112.06, -292.97, -1116.73, -291.35, 4.94],
  [-1116.73, -291.35, -1121.56, -290.31, 4.94],
  [-1121.56, -290.31, -1126.48, -289.84, 4.94],
  [-1126.48, -289.84, -1131.43, -289.96, 4.95],
  [-1131.43, -289.96, -1136.32, -290.67, 4.94],
  [-1136.32, -290.67, -1141.09, -291.96, 4.94],
  [-1141.09, -291.96, -1145.68, -293.8, 4.95],
  [-1145.68, -293.8, -1150.02, -296.17, 4.94],
  [-1150.02, -296.17, -1154.04, -299.05, 4.95],
  [-1154.04, -299.05, -1157.7, -302.38, 4.95],
  [-1157.7, -302.38, -1160.93, -306.12, 4.94],
  [-1160.93, -306.12, -1163.69, -310.21, 4.93],
  [-1163.69, -310.21, -1165.95, -314.61, 4.95],
  [-1165.95, -314.61, -1167.69, -319.24, 4.95],
  [-1167.69, -319.24, -1169.01, -324.03, 4.97],
  [-1169.01, -324.03, -1170.02, -328.92, 4.99],
] as const;
export const CANOPY_CLOTH_POST = [-1091.99, -294.01] as const;
// </baked>
export type CanopyLand = keyof typeof CANOPY_LANDS;
/** Each land's flat top (the map's `top`) and how far down its solid walls go (the horizon's -10). */
export const CANOPY_TOPS: Readonly<Record<CanopyLand, number>> = { 'canopy-isle': 12, 'wall-cn': 120, 'wall-cs': 120 };
export const LAND_BASE = -10;
/** A land's outline as points. */
export const landPoints = (id: CanopyLand) => {
  const v = CANOPY_LANDS[id],
    out: { x: number; z: number }[] = [];
  for (let i = 0; i < v.length; i += 2) out.push({ x: v[i]!, z: v[i + 1]! });
  return out;
};
const insideRing = (p: { x: number; z: number }, ring: readonly { x: number; z: number }[]) => {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const a = ring[i]!,
      b = ring[j]!;
    if (a.z > p.z !== b.z > p.z && p.x < ((b.x - a.x) * (p.z - a.z)) / (b.z - a.z) + a.x) inside = !inside;
  }
  return inside;
};
const ISLE_RING = landPoints('canopy-isle');
/** Canopy isle's ground height at (x, z) (its flat top, inside its outline), or null off it. */
export const isleGround = (x: number, z: number) =>
  insideRing({ x, z }, ISLE_RING) ? CANOPY_TOPS['canopy-isle'] : null;

const ISLE = CANOPY_TOPS['canopy-isle'],
  /** The bay row's rail over the isle (the catalog's level 13 m deck). */
  RAIL = 13,
  /** The halt's platforms and deck: 0.9 m over the rails, solid down into the ground. */
  DECK = 13.9,
  /** The halt's boxes from DECK down 0.5 m into the isle, and the bank from 0.15 m under the rail as far down. */
  DECK_H = 2.4,
  BANK_TOP = 12.85,
  BANK_H = 1.35,
  BED = 3.8,
  PLAT = 7.8,
  CLEAR = 3,
  LOADING = 5;

// ---------------------------------------------------------------- the halt's frame
/** Canopy Town's stop, s 2400.93 on the bay row (the catalog's stopCm; railway-lines.ts), and the row's straight
 * heading from the isle's edge to the kink (the catalog's points either side). `n` along it from the stop, `e` right
 * going out (+ the outward platform; the homeward side is -). */
const STOP = { x: -1081.345, z: -316.611 },
  U = unit(-19030, 16944),
  cf = frame(STOP, U, perp(U, -1)),
  // The same frame with `e` first, for a box whose length runs across.
  ce = frame(STOP, perp(U, -1), U);
/** Where the row crosses the isle's outline (s 2107) and the bed's level start (s 2120, rail at 13 m), as n. */
const N_SHORE = -293.93,
  N_LEVEL = -280.93,
  /** Where the drawn row (railway/row-path.ts, smoothed through the 102 degree kink) leaves the straight: s 2413. */
  N_CURVE = 12.07;
// ---------------------------------------------------------------- the bank and the halt
/** The unlaid bed on the isle (as Bell Rock's): 7.6 m wide, 0.15 m under the rail, solid down into the ground, so the
 * deck a lay makes solid only steps a body standing on it up. */
function bank() {
  return [
    // From the shore (the rail 12.74 m there) up to the level.
    { ...cf.ramp('bank-climb', N_SHORE, 12.59, N_LEVEL, BANK_TOP, -BED, BED, 'dark'), h: BANK_H },
    cf.box('bank', N_LEVEL, N_CURVE, -BED, BED, BANK_TOP, BANK_H, 'dark'),
    // The last chords under the smoothed curve, from the straight's end; each overlaps the one before by 0.35 m.
    ...CANOPY_CURVE.slice(0, 4).map(([ax, az, bx, bz, len], i) => {
      const along: Axis = { compute: 'unit', axis: mix({ x: bx, z: bz }, { x: ax, z: az }, 1, -1) };
      return frame({ x: ax, z: az }, along, perp(along, -1)).box(
        `bank-curve-${i}`,
        -0.35,
        len,
        -BED,
        BED,
        BANK_TOP,
        BANK_H,
        'dark',
      );
    }),
  ];
}
/** The forest's twelve trunks and five mother trunks (hidden: the horizon draws them), each down into the isle. */
const trunks = () =>
  CANOPY_TRUNKS.map(([id, x, z, w, top, h]) => ({ id, x, z, yaw: 0, w, d: w, top, h, tone: 'grey', hidden: true }));
/** The isle's beach (the map's sand shelf): a slope off each outline edge, 40 m out from the top's edge to 1.4 m under
 * the sea, so a swimmer climbs out anywhere; none where the edge lies inside a chalk islet (sheer, no beach) or where
 * the bay row's deck crosses it (the bake's choice). Each a metre wider than its edge, so neighbours overlap. */
const beach = () =>
  CANOPY_BEACH.map(([i, x, z, yaw, w]) => ({
    id: `beach-${i}`,
    x,
    z,
    yaw,
    w,
    d: 40,
    top: ISLE,
    rise: -13.4,
    h: 0.5,
    tone: 'pale',
  }));
function canopy() {
  const cloth = { x: CANOPY_CLOTH_POST[0], z: CANOPY_CLOTH_POST[1] };
  const heading = unit(-5, -100);
  const wall = frame({ x: -889.06, z: -89.93 }, heading, perp(heading, -1));
  const bridgeHeading = unit(18.41, -37);
  const bridge = frame({ x: -689.91, z: -605.17 }, bridgeHeading, perp(bridgeHeading));
  const h = DECK_H,
    ramp = (id: string, a0: number, a1: number, b0: number, b1: number, f = cf) => ({
      ...f.ramp(id, a0, DECK, a1, ISLE, b0, b1, 'grey'),
      h: 0.4,
    });
  const pieces: unknown[] = [
    ...trunks(),
    ...beach(),
    ...bank(),
    ...[-1, 1].flatMap((side) => {
      const inner = side * 5.8 - 2,
        outer = inner + 4;
      const id = side > 0 ? 'platform-wall-out' : 'platform-wall-home';
      return [wall.box(id, -20, 20, inner, outer, DECK, h, 'light'), ramp(id + '-ramp', -20, -24, inner, outer, wall)];
    }),
    // Two platforms after the crossover (s 2350 to 2370), round the stop. The outward one stops where the drawn row
    // starts to bend toward it; the homeward one runs on to the end deck.
    cf.box('platform-out', -33, 12, BED, PLAT, DECK, h, 'light'),
    cf.box('platform-home', -33, 23, -PLAT, -BED, DECK, h, 'light'),
    // The deck on the homeward side, beside the cloth post and the Notch board.
    cf.box('deck', -33, 30, -13.8, -PLAT, DECK, h, 'grey'),
    // Down to the isle: each platform's home end, and one off the deck's side.
    ramp('platform-out-ramp', -33, -36.5, BED, PLAT),
    ramp('platform-home-ramp', -33, -36.5, -13.8, -BED),
    ramp('deck-side-ramp', -13.8, -17.3, 10, 16, ce),
  ];
  return {
    origin: STOP,
    basis: cf.basis,
    extras: [{ id: 'lands', prefab: 'greybox.canopy-lands', pos: [0, 0, 0] }],
    pieces,
    pads: [],
    posts: [
      // On the homeward deck beside the cloth post, facing back down the line.
      { id: 'notch-board', ...cf.at(24, -11), y: DECK, facing: unit(19030, -16944), label: 'canopy.notch' },
    ],
    reserves: [
      bridge.reserve('Wall overbridge', -15, 15, -BED, BED, 12, 14),
      cf.reserve('bay row', N_LEVEL, N_CURVE, -BED, BED, RAIL, RAIL + LOADING),
      cf.reserve('platform-out lever end', -10, -7, BED, PLAT, DECK, add(DECK, CLEAR)),
      cf.reserve('platform-out board', -5.5, -2.5, BED, PLAT, DECK, add(DECK, CLEAR)),
      frame(cloth, cf.u, cf.v).reserve('cloth spot', -1, 1, -1, 1, DECK, add(DECK, CLEAR)),
      ...CANOPY_CURVE.map(([ax, az, bx, bz, len], i) => {
        const along: Axis = { compute: 'unit', axis: mix({ x: bx, z: bz }, { x: ax, z: az }, 1, -1) };
        return frame({ x: ax, z: az }, along, perp(along)).reserve(
          'bay curve ' + i,
          0,
          len,
          -BED,
          BED,
          RAIL,
          RAIL + LOADING,
        );
      }),
      // The hub stand-in town's room (open question 5): 30 by 30 m on the ground, homeward side, within 60 m of the
      // platforms, behind the mother trunk that stands 33 m off the homeward side.
      cf.reserve('stand-in town', -72, -42, -50, -20, ISLE, add(ISLE, CLEAR)),
    ],
    /** Where the level report stands. */
    marks: {
      wallOut: wall.at(0, 5.8),
      wallHome: wall.at(0, -5.8),
      platformOut: cf.at(-10, 5.8),
      platformHome: cf.at(-10, -5.8),
      deck: cf.at(0, -11),
      cloth,
      notch: { x: -1086.81, z: -318.18 },
      town: cf.at(-57, -35),
      // On the isle by head 2 (s 2136, n -265), either side of the bank.
      head2North: cf.at(-265, 12),
      head2South: cf.at(-265, -12),
      inland: cf.at(-120, -60),
    },
  };
}

const data = { canopy: canopy() };
export type Leg3Analysis = Omit<Evaluated<(typeof data)['canopy']>, 'basis' | 'pieces' | 'pads' | 'posts'> & {
  surfaces: { id: string; name: string; over: boolean }[];
  pads: { id: string; name: string }[];
  posts: { id: string; name: string }[];
};
export const levels = [
  defineLevel({
    place: 'canopy',
    placements: [],
    layout: layoutData({ kind: 'leg2', area: 'canopy', data: data.canopy }),
  }),
];

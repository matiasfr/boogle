// The railway's lines as data (docs/plans/generic-lines.md, step 1): the only place a line is defined. A line's index
// is its position in RAIL_LINES, a halt's id (rail.call's `id`) its position in RAIL_HALTS, a train's slot its position
// in RAIL_TRAINS; all three follow catalog order, so reordering is a WORLD_NS break. railway-train.ts's TRAIN_STOPS,
// LINE_HALTS, TRAIN_HOME and trainStopsOf are views of it. Pure integers (world cm, cm a tick), no imports but the
// works layout.
import { PIER_STOP_CM } from './railway-works-layout.ts';

export type RailEndKind = 'stub' | 'crossover' | 'loop';
/** Where a line turns back: a stub (the two tracks merge into one terminal track at `mergeCm`), a crossover (a facing
 * crossover at `mergeCm`, used while this halt is the open end), or (v27+) a balloon loop of `loopCm`. */
export type RailEnd = { kind: RailEndKind; mergeCm: number; loopCm?: number };
/** Where a player stands to use a halt: world cm, and the reach of its lever. */
export type RailPlatform = { x: number; z: number; y: number; reach: number };
export type RailHalt = {
  name: string;
  /** Cm along the line where a train stands. */
  s: number;
  /** The QJob slot whose completion opens it; -1 open from the start. */
  opens: number;
  /** [up, down]: the platform a train going +s (track 0) and -s (track 1) stands at; equal until double track. */
  platforms: readonly [RailPlatform, RailPlatform];
  /** Set on a halt that can be the line's open end: how it turns trains back. */
  end?: RailEnd;
};
export type RailLineDef = {
  /** Stable, never reused. */
  id: string;
  name: string;
  /** World (x, z) cm every 10 m along it, sampled from Place's rail curves (src/proto/place/layout.ts). */
  path: readonly number[];
  /** In s order. */
  halts: readonly RailHalt[];
  /** The halt its first train stands at before it wakes. */
  home: number;
  trains: number;
  /** Cruise, cm a tick. */
  speed: number;
  /** Cm a tick². */
  accel: number;
};

const both = (p: RailPlatform) => [p, p] as const;

export const RAIL_LINES: readonly RailLineDef[] = [
  {
    id: 'line1',
    name: 'Line 1',
    path: [
      91800, 1200, 92451, 441, 93103, -318, 93774, -1059, 94378, -1855, 94920, -2695, 95390, -3577, 95751, -4509, 96044,
      -5465, 96322, -6426, 96578, -7392, 96828, -8361, 97099, -9323, 97442, -10263, 97592, -11243, 97320, -12203, 97213,
      -13188, 97478, -14143, 98294, -14683, 99267, -14911, 100264, -14922, 101264, -14900, 102264, -14900,
    ],
    halts: [
      { name: 'Village', s: 1400, opens: -1, platforms: both({ x: 92819, z: -434, y: 1902, reach: 1260 }) },
      { name: 'Camp', s: 20700, opens: -1, platforms: both({ x: 100964, z: -14610, y: 3102, reach: 1360 }) },
    ],
    home: 1,
    trains: 1,
    speed: 200,
    accel: 3.5,
  },
  {
    id: 'line2',
    name: 'Line 2',
    path: [
      91800, 1200, 92507, 1907, 93204, 2624, 93863, 3375, 94762, 3785, 95758, 3828, 96728, 3600, 97662, 3242, 98624,
      2980, 99620, 2900, 100617, 2976, 101600, 3153, 102571, 3391, 103543, 3627, 104527, 3803, 105525, 3865, 106525,
      3850, 107523, 3799, 108509, 3738, 109387, 3260, 110221, 2710, 111042, 2138, 111857, 1559, 112662, 966, 113457,
      359, 114252, -247, 115057, -841, 115881, -1407, 116715, -1959, 117541, -2522, 118349, -3112, 119138, -3725,
      119919, -4350, 120695, -4981, 121471, -5612, 122249, -6240, 123029, -6866, 123808, -7493, 124588, -8119, 125369,
      -8743, 126153, -9363, 126940, -9981, 127726, -10599, 128515, -11214, 129306, -11825, 130103, -12430, 130906,
      -13025, 131718, -13608, 132537, -14183, 133360, -14751, 134185, -15316, 135015, -15874, 135868, -16396, 136720,
      -16919, 137516, -17522, 138198, -18253, 138754, -19083, 139192, -19981, 139523, -20924, 139759, -21895, 139944,
      -22878, 140106, -23865, 140236, -24856, 140330, -25852, 140393, -26850, 140427, -27849, 140438, -28849, 140434,
      -29849, 140421, -30849, 140403, -31849, 140378, -32848, 140343, -33848, 140303, -34847, 140259, -35846, 140215,
      -36845,
    ],
    halts: [
      { name: 'Village, line 2', s: 1700, opens: -1, platforms: both({ x: 92779, z: 2617, y: 1902, reach: 1260 }) },
      { name: 'Quarry', s: 17400, opens: -1, platforms: both({ x: 108132, z: 4114, y: 2502, reach: 1160 }) },
      { name: 'Far Head', s: 52400, opens: -1, platforms: both({ x: 136361, z: -16353, y: 2502, reach: 1260 }) },
      // Place's halt maths at s 719-741 m, lat -2.9 (the side of the pier rack); open once Q6 (slot 5) is laid.
      {
        name: 'Pier',
        s: PIER_STOP_CM,
        opens: 5,
        platforms: both({ x: 139969, z: -35833, y: 2502, reach: 1260 }),
      },
    ],
    home: 0,
    trains: 1,
    speed: 200,
    accel: 3.5,
  },
];

/** One entry per train, in line order: its line and the halt it stands at before it wakes. */
export const RAIL_TRAINS: readonly { line: number; home: number }[] = RAIL_LINES.flatMap((l, line) =>
  Array.from({ length: l.trains }, () => ({ line, home: l.home })),
);
/** Every halt, line by line in s order; its index is the halt id. */
export const RAIL_HALTS: readonly (RailHalt & { line: number; stop: number })[] = RAIL_LINES.flatMap((l, line) =>
  l.halts.map((h, stop) => ({ ...h, line, stop })),
);

// The railway's lines as data (docs/plans/generic-lines.md, step 1): the only place a line is defined. A line's index
// is its position in RAIL_LINES, a halt's id (rail.call's `id`) its position in RAIL_HALTS, a train's slot its position
// in RAIL_TRAINS; all three follow catalog order, so reordering is a WORLD_NS break. railway-train.ts's TRAIN_STOPS,
// LINE_HALTS, TRAIN_HOME and trainStopsOf are views of it. Pure integers (world cm, cm a tick), no imports but the
// works and ring layouts (./railway-ring-layout.ts imports only this file's RailPlatform type, so it is not a cycle).
import { PIER_STOP_CM } from './railway-works-layout.ts';
import {
  RING_END,
  RING_END_BRAKE_CMS2,
  RING_HALT,
  RING_HEAD,
  RING_JOINT_UP,
  RING_PATH,
} from './railway-ring-layout.ts';
import { RAIL_LEGS, ROW_LINE, ROW_SHIFT, legS, pathOf, rowHalt, rowPoint } from './railway-route.ts';
import { WORLD_LINES } from './railway-world-lines.ts';

export type RailEndKind = 'stub' | 'crossover' | 'loop';
/** Where a line turns back: a stub (the two tracks merge into one terminal track at `mergeCm`), a crossover (a facing
 * crossover at `mergeCm`, used while this halt is the open end), or (v27+) a balloon loop of `loopCm`. */
export type RailEnd = {
  kind: RailEndKind;
  mergeCm: number;
  /** Where its block meets the line (cm): the merge, past a stub's turnout. */
  edgeCm: number;
  /** Where a train that can't enter waits, on the inbound track (cm). */
  signalCm: number;
  loopCm?: number;
};
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
  // v27's halt fields (docs/plans/ring-island-build1.md, R3a), read by the pure train code only.
  /** It opens only once Ring Island's rivet is struck (`ring.joined`), on top of its `opens` slot. */
  ring?: true;
  /** Its stop per railhead (`RING_HEAD[k].s`): the stop is `heads[head]`, and its `end` is written for `heads[0]`
   * and moves with the stop (endBlocks). `s` is `heads[0]`. */
  heads?: readonly number[];
  /** While it is not an open end, only trains going this way (-1: down, homeward) stop there: the owner's
   * "homeward-only stop". */
  only?: -1;
  /** A leg ending here on the up track (going +s) brakes at this rate (cm a tick²), not the line's `accel`. */
  brake?: number;
  // The greybox route's halt fields (docs/plans/greybox-route.md, step 3), read by the pure train code only.
  /** It opens once section `section` of RAIL_LEGS[`slot`] is laid (on top of `opens` and `ring`); with `heads`, its
   * stop is `heads[laid - 1 - section]` (the leg's railhead, at the last section laid; the last head once more are). */
  leg?: { slot: number; section: number };
  /** A `heads` halt's platform at each head (absent: Ring Island's railhead, whose platforms are RING_HEAD's). */
  headPlatforms?: readonly RailPlatform[];
  /** A catalog halt a later leg's rules open: shut at every stage until then. */
  shut?: true;
  /** Closed behind (the orchestrator's ruling on call 88): once its line has this many open stops it passes both ways,
   * a stop no train makes and nobody asks for, though it stays in the line's halts (open stops stay a prefix). A passed
   * head of the stack line closes when the section after next lays, so the lay's ride-on (call 88) is over first. */
  closesAt?: number;
};
export type RailLineDef = {
  /** Stable, never reused. */
  id: string;
  name: string;
  /** World (x, z) cm every 10 m along it, sampled from Place's rail curves (src/place/layout.ts). */
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
  /** Set on a line with the balanced hold at its ends (railway-trains.ts, balancedHold): the most ticks past its dwell
   * a train ready to leave an end waits for the gap ahead to grow to the gap behind. A safe integer from 1 to
   * BALANCE_MAX_TICKS (balanceOk; trainPlaces refuses any other). */
  balance?: number;
  /** The greybox route (step 3): how many trains run at each stage of RAIL_LEGS[`leg`], by its sections laid
   * (`trains[0]` is `trains`). A stage's extra trains wait in the shed (TRAIN_PHASE.SHED) until they join at the line's
   * first halt (./railway-trains.ts, fleetJoin). Absent: `trains` at every stage. */
  fleet?: { leg: number; trains: readonly number[] };
  /** Block signals (the greybox route, step 3): cm along the line where a train may hold short of its goal on either
   * track, with no halt, between halts too far apart for the block rule to let a follower start (it needs the whole leg
   * clear of the train ahead). Each stands between two halts of the line, never at one. */
  signals?: readonly number[];
};
/** The longest balanced hold a line may ask for: 3 minutes, about one round trip of line 2 to the island (138.8 s
 * non-stop, about 220 s under heavy asks). */
export const BALANCE_MAX_TICKS = 1800;
/** Whether a line's `balance` is absent or a whole number of ticks from 1 to BALANCE_MAX_TICKS. */
export const balanceOk = (b: number | undefined) =>
  b === undefined || (Number.isSafeInteger(b) && b >= 1 && b <= BALANCE_MAX_TICKS);

const both = (p: RailPlatform) => [p, p] as const;
/** A stub's turnout: past its merge the two tracks part over this length (src/place/layout.ts draws it). */
export const TURNOUT_CM = 2000;
/** How far a train reaches from its along (cm), with the footing wagon: the engine's nose ahead (+s), the wagon's tail
 * behind. The cars are src/entities/railway/cars.ts's TRAIN_CARS at TRAIN_OFFSETS (test/railway-lines.test.ts keeps them
 * in step), so a longer train moves every signal with it. From v28 (ring-island-build2, R3, call 15) the reach ahead
 * is the longer boiler's, rail-map's long train (8.2 m), whichever boiler a train wears: one extent, one block rule.
 * The drawn longer engine reaches less (test/railway-lines.test.ts holds this at least the drawn one). From v33
 * (docs/plans/fourth-car.md, R1) the reach behind is the steel car's tail on the wagon's train (12.7 m, cars.ts's
 * TRAIN_TAIL_M), whichever cars a train pulls: one extent for every train, as ahead. */
export const TRAIN_EXTENT = { aheadCm: 820, behindCm: 1270 } as const;
/** A line end at `mergeCm`, at its line's low end (`side` -1, the first halt) or high end (+1). Its block reaches the
 * merge plus a stub's turnout (`edgeCm`: past it the tracks are apart; a crossover's block starts at the crossover);
 * its signal stands outside that by the reach of an inbound train's leading end, so a train held there is clear of the
 * block and of a train leaving it. */
export const railEnd = (kind: RailEndKind, mergeCm: number, side: -1 | 1): RailEnd => {
  const edgeCm = mergeCm - side * (kind === 'stub' ? TURNOUT_CM : 0),
    lead = side < 0 ? TRAIN_EXTENT.behindCm : TRAIN_EXTENT.aheadCm;
  return { kind, mergeCm, edgeCm, signalCm: edgeCm - side * lead };
};
// Step 2's up platforms (src/place/layout.ts UP_HALTS, lat -6.95), at their deck: Quarry s 154-174.5, Far Head
// s 513-535. Today's platforms serve the down track.
const QUARRY_UP: RailPlatform = { x: 106912, z: 3135, y: 2502, reach: 1160 };
const FAR_HEAD_UP: RailPlatform = { x: 135850, z: -17195, y: 2502, reach: 1260 };
/** The Pier's one platform from Q6 on (ring-island-build1, call 53): s 719-741 m, lat +2.9, east of the down track;
 * the pier rack stands on it. v26's west platform mirrored across the track at s 730, 2.9 m east of the path point
 * (140259, -35846). */
export const PIER_EAST: RailPlatform = { x: 140549, z: -35859, y: 2502, reach: 1260 };

// ---------------------------------------------------------------- the greybox route's rows (greybox-route.md, step 3)
// From ./railway-route.ts's catalog (RAIL_LEGS, derived from the generated WORLD_LINES), appended to the catalog below:
// line 2 runs on from Ring Island along the `ring` row to High Gorge, and the `ns`, `bay` and `cave` rows follow it as
// lines 2 to 4 (ROW_LINE), every halt shut until a later leg's rules open it.
const ringRow = WORLD_LINES.find((l) => l.id === 'ring')!;
/** The leg that grows line 2 (the stack line). */
const STACK_LEG = RAIL_LEGS.findIndex((l) => l.row === 'ring');
const STACK = RAIL_LEGS[STACK_LEG]!;
/** A moving railhead's stop stands 10 m short of the laid end, its stub merging 20 m short of the stop (RING_HEAD's). */
const HEAD_BACK_CM = 1000,
  HEAD_MERGE_CM = 2000;
/** Line 2's path on from s 1220 m (its index stays s / 1000) to the `ring` row's end, past the Gorge's buffers. */
export const LINE2_ON: readonly number[] = (() => {
  const out: number[] = [];
  for (let at = 122000; at <= legS(STACK, ringRow.fromCm + ringRow.lengthCm); at += 1000) {
    const p = rowPoint('ring', at + ROW_SHIFT.ring);
    out.push(p.x, p.z);
  }
  return out;
})();
/** The stack railhead's stop at each section laid but the last (the Gorge's is the last's). */
const STACK_HEADS = STACK.sections.slice(0, -1).map((sec) => legS(STACK, sec.toCm) - HEAD_BACK_CM);
const STACK_HEAD_PLATFORMS = STACK_HEADS.map((at) => rowPoint('ring', at + ROW_SHIFT.ring));
const STACK_HALTS: readonly RailHalt[] = [
  // The stack line's railheads, one halt a head (the step 4 review's call 88): head k opens once section k is laid, a
  // stub end while it is the line's last; when the next section lays the line runs on past it (endMoved) and it stays a
  // stop, so the first train after the lay stops there and takes whoever stands there on to the new head. Heads 1 and
  // 2 close behind when the section after next lays (`closesAt`); the third stays, a request stop both ways (the step 4
  // review's `Stack halt`).
  ...STACK_HEADS.map((at, k): RailHalt => ({
    name: `Stack head ${k + 1}`,
    s: at,
    opens: 6,
    ring: true,
    leg: { slot: STACK_LEG, section: k },
    platforms: both(STACK_HEAD_PLATFORMS[k]!),
    end: railEnd('stub', at - HEAD_MERGE_CM, 1),
    ...(k < STACK_HEADS.length - 1 ? { closesAt: STACK.railheadHalt + k + 3 } : {}),
  })),
  // High Gorge: open once the fourth section is laid; buffers past the platforms, a crossover before them (the row's).
  {
    name: 'High Gorge',
    s: legS(STACK, STACK.sections.at(-1)!.toCm),
    opens: 6,
    ring: true,
    leg: { slot: STACK_LEG, section: STACK.sections.length - 1 },
    platforms: both(rowHalt('ring', STACK.destRowHalt)),
    end: railEnd('crossover', legS(STACK, ringRow.ends.find((e) => e.at === 'end')!.sCm), 1),
  },
];
/** A catalog row as a sim line of its own: its path every 10 m (pathOf), its halts at the row's stops, every one shut
 * (a later leg's rules open them, with their ends and trains). No train runs on it yet. */
function rowLine(id: 'ns' | 'bay' | 'cave'): RailLineDef {
  const r = WORLD_LINES.find((l) => l.id === id)!,
    pts = pathOf(r.pts),
    path: number[] = [];
  for (let k = 0; k < pts.length; k += 3) path.push(pts[k]!, pts[k + 1]!);
  return {
    id: r.id,
    name: r.name,
    path,
    halts: r.halts.map((h, k) => ({
      name: h.name,
      s: r.stops[k]!,
      opens: -1,
      shut: true,
      platforms: both({ x: h.x, z: h.z, y: h.y, reach: h.reach }),
    })),
    home: 0,
    trains: 0,
    speed: r.speed,
    accel: r.accel,
  };
}

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
      // Terminal stubs: the two tracks merge at s 36 and 182 m (generic-lines, "Migrating lines 1 and 2").
      {
        name: 'Village',
        s: 1400,
        opens: -1,
        platforms: both({ x: 92819, z: -434, y: 1902, reach: 1260 }),
        end: railEnd('stub', 3600, -1),
      },
      {
        name: 'Camp',
        s: 20700,
        opens: -1,
        platforms: both({ x: 100964, z: -14610, y: 3102, reach: 1360 }),
        end: railEnd('stub', 18200, 1),
      },
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
      91800,
      1200,
      92507,
      1907,
      93204,
      2624,
      93863,
      3375,
      94762,
      3785,
      95758,
      3828,
      96728,
      3600,
      97662,
      3242,
      98624,
      2980,
      99620,
      2900,
      100617,
      2976,
      101600,
      3153,
      102571,
      3391,
      103543,
      3627,
      104527,
      3803,
      105525,
      3865,
      106525,
      3850,
      107523,
      3799,
      108509,
      3738,
      109387,
      3260,
      110221,
      2710,
      111042,
      2138,
      111857,
      1559,
      112662,
      966,
      113457,
      359,
      114252,
      -247,
      115057,
      -841,
      115881,
      -1407,
      116715,
      -1959,
      117541,
      -2522,
      118349,
      -3112,
      119138,
      -3725,
      119919,
      -4350,
      120695,
      -4981,
      121471,
      -5612,
      122249,
      -6240,
      123029,
      -6866,
      123808,
      -7493,
      124588,
      -8119,
      125369,
      -8743,
      126153,
      -9363,
      126940,
      -9981,
      127726,
      -10599,
      128515,
      -11214,
      129306,
      -11825,
      130103,
      -12430,
      130906,
      -13025,
      131718,
      -13608,
      132537,
      -14183,
      133360,
      -14751,
      134185,
      -15316,
      135015,
      -15874,
      135868,
      -16396,
      136720,
      -16919,
      137516,
      -17522,
      138198,
      -18253,
      138754,
      -19083,
      139192,
      -19981,
      139523,
      -20924,
      139759,
      -21895,
      139944,
      -22878,
      140106,
      -23865,
      140236,
      -24856,
      140330,
      -25852,
      140393,
      -26850,
      140427,
      -27849,
      140438,
      -28849,
      140434,
      -29849,
      140421,
      -30849,
      140403,
      -31849,
      140378,
      -32848,
      140343,
      -33848,
      140303,
      -34847,
      140259,
      -35846,
      140215,
      -36845,
      // v27: on from the pier head over the bents and the Pilgrims' Way to Ring Island (RING_PATH, s 750 m on).
      ...RING_PATH,
      // The greybox route: on along the `ring` row to High Gorge (s 1220 m on).
      ...LINE2_ON,
    ],
    halts: [
      {
        name: 'Village, line 2',
        s: 1700,
        opens: -1,
        platforms: both({ x: 92779, z: 2617, y: 1902, reach: 1260 }),
        end: railEnd('stub', 3400, -1),
      },
      {
        name: 'Quarry',
        s: 17400,
        opens: -1,
        platforms: [QUARRY_UP, { x: 108132, z: 4114, y: 2502, reach: 1160 }],
      },
      // The end until Q6 opens the pier: a facing crossover at s 490-512 m turns trains onto the down track.
      {
        name: 'Far Head',
        s: 52400,
        opens: -1,
        platforms: [FAR_HEAD_UP, { x: 136361, z: -16353, y: 2502, reach: 1260 }],
        end: railEnd('crossover', 49000, 1),
      },
      // s 719-741 m, lat +2.9, east of the down track; the pier rack stands on it. Open once Q6 (slot 5) is laid; the
      // end until Q7 (slot 6) is laid (the far tracks merge at s 556 m, the pier's root), then homeward-only (owner,
      // 10 November: no up train stops there).
      {
        name: 'Pier',
        s: PIER_STOP_CM,
        opens: 5,
        platforms: both(PIER_EAST),
        end: railEnd('stub', 55600, 1),
        only: -1,
      },
      // The moving railhead (ring-island-build1, R3): open once Q7 is laid, its stop at the bent the gap is footed to
      // (`heads`), its end a stub that moves with it; every up train eases in (call 46).
      {
        name: 'Railhead',
        s: RING_HEAD[0]!.s,
        opens: 6,
        platforms: [RING_JOINT_UP, RING_HEAD[0]!.platform],
        end: railEnd('stub', RING_HEAD[0]!.mergeCm, 1),
        heads: RING_HEAD.map((h) => h.s),
        brake: RING_END_BRAKE_CMS2 / 100,
      },
      // Ring Island: open once the rivet is struck; buffers 15 m past the platforms, a crossover before them (R1b).
      {
        name: 'Ring Island',
        s: RING_END.s,
        opens: 6,
        platforms: [RING_HALT.up, RING_HALT.down],
        end: railEnd('crossover', RING_END.mergeCm, 1),
        ring: true,
      },
      // The greybox route (step 3): the stack railhead and High Gorge.
      ...STACK_HALTS,
    ],
    home: 0,
    trains: 3,
    speed: 200,
    accel: 3.5,
    // The balanced hold, capped 60 s past the dwell (R3b, call 47).
    balance: 600,
    // The greybox route: 3, then 5 from the first section laid (ruling A.4, call 63).
    fleet: { leg: STACK_LEG, trains: [3, 5, 5, 5, 5] },
    // Block signals at the stack line's section ends but the last (10 m past each railhead stop), so a train follows
    // another up the 1.5 km from Ring Island block by block (re-measure ruling 1).
    signals: STACK.sections.slice(0, -1).map((sec) => legS(STACK, sec.toCm)),
  },
  // The greybox route's own rows (step 3), every halt shut.
  rowLine('ns'),
  rowLine('bay'),
  rowLine('cave'),
];

/** Line 2's index: the line that carries cargo (the Q6 and Q7 kits, the footing wagon). */
export const LINE2 = RAIL_LINES.findIndex((l) => l.id === 'line2');
/** A line the pure train code runs: its index in RAIL_LINES, or a line the catalog does not hold (a test's fixture
 * line, its trains slots 0 to `trains - 1` of the rows it is given). A catalog row passed as an object is its index
 * (lineIndex), so it never runs as a fixture. */
export type LineRef = number | RailLineDef;
export const lineDef = (line: LineRef): RailLineDef => (typeof line === 'number' ? RAIL_LINES[line]! : line);
/** The catalog index of a line (a catalog row object counts as its own index), or -1 for a fixture line. */
export const lineIndex = (line: LineRef): number => (typeof line === 'number' ? line : RAIL_LINES.indexOf(line));
/** Whether halt `k` of a line with `n` open stops refuses trains going `dir`: an `only` halt that is not an open end
 * serves only its own way (the homeward-only Pier: no up train stops there, for any reason). */
export function trainPassesBy(line: LineRef, k: number, dir: number, n: number) {
  const h = lineDef(line).halts[k];
  // A halt closed behind passes both ways (the greybox route's passed heads).
  if (h?.closesAt !== undefined && n >= h.closesAt) return true;
  const only = h?.only;
  return only !== undefined && dir !== only && k !== 0 && k !== n - 1;
}
/** Halt `halt`'s platform (a RAIL_HALTS id, or a halt) for a train going `way` (+1 up, -1 down): a `heads` halt's
 * down side is the railhead's platform at `head` (the server's reach check and the lever's view read it); a leg's
 * railhead (the greybox route) has one platform a head, both ways. */
export function haltPlatform(halt: number | RailHalt, way: number, head = 0): RailPlatform {
  const h = typeof halt === 'number' ? RAIL_HALTS[halt]! : halt;
  if (h.headPlatforms) return h.headPlatforms[head] ?? h.headPlatforms[0]!;
  return h.heads && way < 0 ? RING_HEAD[head]!.platform : h.platforms[way > 0 ? 0 : 1];
}

// ---------------------------------------------------------------- the circuit (generic-lines, "The state shape" 2)
/** One number round a line for ordering and spacing only (never stored): the up track (0) runs `s - s0` from the start
 * end, the down track (1) on round to `C = 2 (sEnd - s0)`. `stops` are the line's open stops, so its ends are
 * `stops[0]` and the last; a stub or crossover turns in place and adds no length. */
export function circuitCm(stops: readonly number[], track: number, s: number) {
  const s0 = stops[0]!,
    len = stops[stops.length - 1]! - s0;
  return track ? 2 * len - (s - s0) : s - s0;
}
/** The circuit's length for these open stops. */
export const circuitLen = (stops: readonly number[]) => 2 * (stops[stops.length - 1]! - stops[0]!);
/** How far `to` lies ahead of `from` going round a circuit of `c` (0 to c - 1). */
export const circuitAhead = (from: number, to: number, c: number) => (((to - from) % c) + c) % c;
/** Where a line's `n` trains stand before they wake, and again when they wake (rail.boilerFit), over its open stops:
 * train k at the open halt nearest `c = home + k·C/n` round the circuit (its first at `home`), standing on the track
 * whose way out is inward (an end's way out; a middle halt's track by the half of the circuit it is nearest on). A
 * place already taken by an earlier train is skipped (with three trains on line 2's first stops, two are nearest Far
 * Head's down track), so no two trains stand on one spot, and so is a halt that refuses the way out (trainPassesBy:
 * the homeward-only Pier going up). With no place left it throws: the catalog is refused (railway-train.ts checks
 * every stage of every catalog line at load), rather than two trains stacked. `n` is how many to place (a stage's
 * fleet: railway-train.ts, fleetOf); `trains` by default. */
export function trainPlaces(line: LineRef, stops: readonly number[], n = lineDef(line).trains) {
  const l = lineDef(line),
    c = circuitLen(stops),
    last = stops.length - 1;
  if (!balanceOk(l.balance)) throw new Error(`railway: line ${l.id} has a balance of ${l.balance} ticks`);
  const at = (k: number, track: number) => circuitCm(stops, track, stops[k]!);
  const home = at(l.home, l.home === last ? 1 : 0);
  const taken: { stop: number; track: number }[] = [];
  return Array.from({ length: n }, (_v, k) => {
    const want = (home + Math.floor((k * c) / n)) % c;
    let best = { stop: 0, track: 0, d: c + 1 };
    for (let stop = 0; stop <= last; stop++)
      for (const track of stop === 0 ? [0] : stop === last ? [1] : [0, 1]) {
        if (taken.some((t) => t.stop === stop && t.track === track)) continue;
        if (trainPassesBy(line, stop, track ? -1 : 1, stops.length)) continue;
        const p = at(stop, track) % c,
          d = Math.min(circuitAhead(p, want, c), circuitAhead(want, p, c));
        if (d < best.d) best = { stop, track, d };
      }
    if (best.d > c) throw new Error(`railway: line ${l.id} has no place for train ${k} over ${stops.length} stops`);
    const place = { stop: best.stop, track: best.track };
    taken.push(place);
    return place;
  });
}
/** The stops open before any QJob is complete (the pier is the last halt and opens last). */
const FIRST_STOPS = RAIL_LINES.map((l) => l.halts.filter((h) => h.opens < 0).map((h) => h.s));
/** The train rows a line has: its first stage's `trains`, or its fleet's most. */
export const lineRows = (l: RailLineDef) => Math.max(l.trains, ...(l.fleet?.trains ?? []));
/** One entry per train (its slot): its line, and the halt and track it stands at before it wakes. The first stage's
 * trains in line order, then (the greybox route, step 3) each line's fleet rows past its first stage, in line order,
 * standing in the shed (`shed`) at the line's first halt until they join. */
export const RAIL_TRAINS: readonly { line: number; home: number; track: number; shed?: true }[] = [
  ...RAIL_LINES.flatMap((_l, line) =>
    trainPlaces(line, FIRST_STOPS[line]!).map((p) => ({ line, home: p.stop, track: p.track })),
  ),
  ...RAIL_LINES.flatMap((l, line) =>
    Array.from({ length: lineRows(l) - l.trains }, () => ({ line, home: 0, track: 0, shed: true as const })),
  ),
];
/** Every halt, line by line in s order; its index is the halt id. */
export const RAIL_HALTS: readonly (RailHalt & { line: number; stop: number })[] = RAIL_LINES.flatMap((l, line) =>
  l.halts.map((h, stop) => ({ ...h, line, stop })),
);

// The greybox route's catalog checks, at load (a bad row throws at the first import, as trainPlaces does).
if (RAIL_LINES[ROW_LINE.ring]?.id !== 'line2') throw new Error('railway: the ring row is not line 2');
RAIL_LINES.forEach((l) => {
  const f = l.fleet;
  if (!f) return;
  const leg = RAIL_LEGS[f.leg];
  if (
    !leg ||
    RAIL_LINES[leg.line] !== l ||
    f.trains.length !== leg.sections.length + 1 ||
    f.trains[0] !== l.trains ||
    f.trains.some((n, k) => !Number.isSafeInteger(n) || n < (k ? f.trains[k - 1]! : 1)) ||
    l.home !== 0
  )
    throw new Error(`railway: line ${l.id} has a bad fleet`);
});
/** Whether leg k's rules are built: its sim line holds its railhead (step 3 builds the stack leg's only). A leg that is
 * not built is never open, whatever its `after` (./railway-queries-route.ts, legOpen). */
export const legBuilt = (k: number) => {
  const leg = RAIL_LEGS[k];
  return !!leg && RAIL_LINES[leg.line]?.halts[leg.railheadHalt]?.leg?.slot === k;
};
RAIL_LEGS.forEach((leg, k) => {
  if (!legBuilt(k)) return;
  const halts = RAIL_LINES[leg.line]!.halts,
    head = halts[leg.railheadHalt]!,
    last = leg.sections.length - 1;
  // A built leg has a head halt for each section but the last, in order from its railhead halt, each opened by its
  // section; it starts at a halt of its line and its last section opens one more (its destination).
  for (let j = 0; j < last; j++) {
    const h = halts[leg.railheadHalt + j];
    if (h?.leg?.slot !== k || h.leg.section !== j || h.heads || !h.end)
      throw new Error(`railway: leg ${leg.id}'s heads`);
  }
  void head;
  if (
    !halts.some((h) => h.s === legS(leg, leg.fromCm)) ||
    !halts.some(
      (h) => h.leg?.slot === k && h.leg.section === last && !h.heads && h.s === legS(leg, leg.sections[last]!.toCm),
    )
  )
    throw new Error(`railway: leg ${leg.id}'s ends`);
});

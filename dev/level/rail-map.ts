// node --import ./dev/sim/hooks.ts dev/level/rail-map.ts [--check] [--numbers]: the whole network's rail map,
// docs/world/rail-map.html (docs/plans/rail-map.md), from the same data the game and the blockout read: Place's rails
// and the double formation (src/place/layout.ts), the sim catalog (src/sim/railway-lines.ts), Ring Island's R1
// layout (src/sim/railway-ring-layout.ts), the blockout's future lines (src/sim/railway-world-lines.ts, itself generated
// from docs/world/map-prototypes.html) and the Sickle Isles outlines. The track continuity report's worst places are
// marked on it. `--check` writes nothing and exits 1 when the page is stale (test/rail-map.test.ts); `--numbers`
// prints the figures docs/plans/rail-map.md quotes.
//
// The page follows the artifact contract: body content only, a <title> first, inline CSS and JS, colours as custom
// properties with dark values, an explicit body background. The SVG is drawn by the page's script from the JSON
// embedded below, so the two tracks can be spread to stay visible at any zoom (true 4 m centres when zoomed in).
// Home is drawn as layout B (the owner's pick, 9 November; docs/plans/home-station.md): this must evaluate before
// Place's layout reads BOOGLE_HOME. The live game draws the turntable terminus until home-station's flip (step 6).
import './home-b.ts';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import {
  FORGE,
  LINES,
  ORIGIN,
  TURNTABLE,
  LINKS,
  FORMATION as PLACE_FORMATION,
  UP_HALTS,
  upLat,
  TOWN,
  ROOM_PLOTS,
  FORGE_FRAME,
  AXE_STAND,
} from '../../src/place/layout.ts';
import { layout, parseMapPage } from '../../src/sickle/map-data.ts';
import { RING_CONES, ringHeight } from '../../src/proto/greybox/ground.ts';
import { FAR } from '../../src/place/layout.ts';
import { WORLD_LINES, FORMATION } from '../../src/sim/railway-world-lines.ts';
import { RAIL_LINES } from '../../src/sim/railway-lines.ts';
import {
  RING_HALT,
  RING_HEAD,
  RING_LOOP,
  RING_S_HEAD,
  RING_PIER_UP,
  ringAt,
} from '../../src/sim/railway-ring-layout.ts';
import { RECOVERY_RACK } from '../../src/sim/railway-supply.ts';
import {
  BUFFERS,
  HALL,
  ISLAND,
  ISLAND_A,
  ROAD_GAP,
  axisPoint,
  LEG,
  PROPS,
  SPUR,
  STALLS,
  TABLE,
  legPoints,
  spurPoints,
  stallFrame,
} from '../../src/place/home-station.ts';
import { frameBesideLine } from '../../src/place/spatial-station.ts';
import {
  CONSIST,
  LIVE,
  SOURCES,
  alongLive,
  beside,
  liveHalts,
  obstacles,
  tracks,
  type Status,
} from './rail-network.ts';
import { checkContinuity, type Finding } from './track-continuity.ts';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const PAGE = 'docs/world/rail-map.html';
const r1 = (n: number) => Math.round(n * 10) / 10;
/** A Place-local point in world metres. */
const W = (p: { x: number; z: number }) => ({ x: r1(p.x + ORIGIN.x), z: r1(p.z + ORIGIN.z) });

/** The passenger car's distance from buffers at a terminal, either way round (the design review's call 12): the long
 * train's tail behind it plus 2 m. */
const TERMINAL_GAP = r1(-CONSIST.tail + 2);
/** Layout B's buffer stops, by each Village road's s. */
const [BUF1, BUF2] = BUFFERS;
/** One shared stop mark per halt (the design review's call 11): today's TRAIN_STOPS unless a reason moves it. Village:
 * layout B keeps s 14 and 17 abeam (home-station call 10), already more than TERMINAL_GAP from its buffers. */
const MARKS: Record<string, { s: number; why: string }> = {
  Village: {
    s: 14,
    why: `kept (layout B's stops stand abeam, home-station call 10): ${r1(14 - BUF1)} m from the buffers at s ${BUF1}; the ${TERMINAL_GAP} m rule allows down to s ${r1(BUF1 + TERMINAL_GAP)}`,
  },
  'Village, line 2': {
    s: 17,
    why: `kept (abeam with line 1's): ${r1(17 - BUF2)} m from the buffers at s ${BUF2}; the rule allows down to s ${r1(BUF2 + TERMINAL_GAP)}`,
  },
  Camp: { s: r1(220 - TERMINAL_GAP), why: `${TERMINAL_GAP} m from the proposed buffers at s 220 (call 12)` },
  Quarry: {
    s: 170,
    why: 'one mark on both staggered platforms (down s 166-186, up 154-174.5): the passenger car on both, the plank crossing 10.5 m clear',
  },
  'Far Head': { s: 526, why: "the long train's tail clear of the crossover (s 490-512)" },
  Pier: {
    s: 725,
    why: "the longer engine's nose clear of the parked track layer; measure the layer's position first (PIER_STOP_CM's note differs by 1.5 m)",
  },
};

/** Ring Island while it is the end (the design review's call 14): buffers 15 m past the halt's north end (u m along
 * the crossing), and the facing crossover on the Way before the halt, 22 m long as Far Head's. Map proposal only:
 * R1 (src/sim/railway-ring-layout.ts) still has the loop until its amendment. */
const RING_END_U = RING_HALT.u1 / 100 + 15;
const RING_X = [RING_HALT.u0 / 100 - 33, RING_HALT.u0 / 100 - 11] as const;
/** The balloon the plan proposed before the review: centre u 520, lat +45 (east). Undrawn: shown as an alternative. */
const RING_ALT = { u: 520, lat: 45, r: 40 };

// ---------------------------------------------------------------- lines (services)
type LineRow = {
  /** End to end, every halt a stop: seconds at 20 and 25 m/s, and what the longer boiler saves; flagged when short. */
  trip: { t20: number; t25: number; saved: number; direct: number; short: boolean };
  id: string;
  name: string;
  colour: string;
  status: Status;
  build: string;
  length: number;
  halts: string[];
  trains: string;
  ends: [string, string];
  after: [string, string];
};
const COLOURS: Record<string, string> = {
  line1: '#3d6b45',
  line2: '#2f5f9e',
  ring: '#3f7fd8',
  stack: '#e08a1e',
  bay: '#d8412f',
  'bay-trestle': '#b07a7a',
  cave: '#1fa38c',
  wall: '#b8930c',
  notch: '#d1509a',
  causeway: '#8a55cf',
};
/** A rest-to-rest leg of `m` metres at cruise `v` and 3.5 m/s² (the engine-garage brief's own comparison keeps the
 * acceleration, so the upgrade is the cruise alone): triangular when too short to reach cruise. */
const legT = (m: number, v: number, a = 3.5) => (m >= (v * v) / a ? m / v + v / a : 2 * Math.sqrt(m / a));
/** Seconds end to end over stops (m along the line), stopping at each, 5 s a dwell between. */
function trip(stops: number[]) {
  const t = (v: number) =>
    stops.slice(1).reduce((acc, s, i) => acc + legT(s - stops[i]!, v), 0) + 5 * (stops.length - 2);
  const t20 = t(20),
    t25 = t(25);
  const m = stops.at(-1)! - stops[0]!;
  const direct = legT(m, 20) - legT(m, 25);
  // Trains stop on request (10 November), so the usual ride is the non-stop one: the flag reads it.
  return { t20: r1(t20), t25: r1(t25), saved: r1(t20 - t25), direct: r1(direct), short: direct < SHORT_SAVED };
}
/** A per-line speed upgrade is felt when it saves at least this much end to end (s). */
export const SHORT_SAVED = 10;
/** One non-stop leg saves L/100 − 1.43 s from 20 to 25 m/s at 3.5 m/s²: 10 s from about 1.15 km. */
export const MIN_UPGRADE_LINE_M = Math.ceil((SHORT_SAVED + 25 / 3.5 - 20 / 3.5) * 100);
/** The service ladder (sickle-greybox): 20 m/s, 3.5 m/s², 5 s dwell. */
const legSeconds = (m: number) => m / 20 + 20 / 3.5 + 5;
/** Trains a line needs for generic-lines' wait bound (no wait for a train your way over about 60 s): its round trip
 * over 60 s, times the 1.26 that bunching to the hold limit costs (generic-lines finding 1: 58 s worst against 46 s). */
const trainsFor = (cycle: number) => Math.max(1, Math.ceil((1.26 * cycle) / 60));
const stageOf = (l: (typeof WORLD_LINES)[number]) => {
  const st = l.legs.map((g) => g.stage);
  const a = Math.max(...st.map((s) => s[0] ?? -1)),
    b = Math.max(...st.map((s) => s[1] ?? -1));
  return { a: a < 0 ? null : a, b: b < 0 ? null : b };
};
// Line 2 as built to Ring Island (its own row), and grown on to High Gorge by the greybox route (the `ring` row's): a leg
// halt (`leg`) is the route's. The route's three heads are building stops, so the grown trip runs Ring Island to the Gorge.
const TRAIN_STOPS_M = RAIL_LINES.map((l) => l.halts.filter((h) => !h.leg && !h.shut).map((h) => h.s / 100));
const GORGE_M = RAIL_LINES[1]!.halts.findLast((h) => h.leg)!.s / 100;
function lineRows(): LineRow[] {
  const l1 = LINES.north.len,
    l2 = LINES.east.len;
  const rows: LineRow[] = [
    {
      id: 'line1',
      name: 'Line 1 (Village to Camp)',
      colour: COLOURS.line1!,
      status: 'live',
      build: 'live; up track drawn, runs from v26',
      length: l1,
      halts: ['Village', 'Camp'],
      trains: '1 (v26 keeps 1)',
      trip: trip(TRAIN_STOPS_M[0]!),
      ends: [`Village (layout B): buffer stops at s ${BUF1}, the forge's goods dock`, 'Camp: stub, bare rail end'],
      after: ['Village: terminal, buffers and an end board (home-station step 9)', 'Camp: terminal, buffers at s 220'],
    },
    {
      id: 'line2',
      name: 'Line 2 (Village to the pier)',
      colour: COLOURS.line2!,
      status: 'live',
      build: 'live; up track drawn, runs from v26; v27 on to Ring Island',
      length: l2,
      halts: ['Village, line 2', 'Quarry', 'Far Head', 'Pier', '(v27) Railhead', '(v27) Ring Island halt'],
      trains: `1 today, 2 in v26, ${trainsFor(170)} for the v27 wait bound (plan: 3)`,
      trip: trip(TRAIN_STOPS_M[1]!),
      ends: [
        `Village (layout B): buffer stops at s ${BUF2}; the engine spur to the table leaves at s ${SPUR.s}`,
        'Far end: Far Head crossover (before Q6), pier head stub (bare), v27 moving railhead (buffers), Ring Island loop (R1)',
      ],
      after: [
        'Village: terminal, buffers and an end board (home-station step 9)',
        'Ring Island: buffers 15 m past the halt and a crossover on the Way (recommended; the balloon is the undrawn alternative), then through when line 2 runs on',
      ],
    },
  ];
  for (const l of WORLD_LINES) {
    const st = stageOf(l);
    const len = l.lengthCm / 100;
    const cycle =
      2 * (legSeconds(len) + (l.halts.length - 2) * (20 / 3.5 + 5)) +
      l.ends.filter((e) => e.kind === 'loop').length * 25;
    const end = (e?: (typeof l.ends)[number]) =>
      !e
        ? "runs on from line 2's rail end"
        : `${e.kind === 'loop' ? 'turning loop' : 'scissors crossover'} ${e.at === 'start' ? 'after' : 'before'} ${e.at === 'start' ? l.halts[0]!.name : l.halts.at(-1)!.name}`;
    rows.push({
      id: l.id,
      name: l.name,
      colour: COLOURS[l.id] ?? '#888',
      status: l.id === 'ring' ? 'v27' : 'later',
      build:
        l.id === 'ring'
          ? 'v27 (R1 data supersedes this draft)'
          : `stage ${st.a ?? 'never'} (Gorge first) / ${st.b ?? 'never'} (Canopy first)`,
      length: len,
      halts: l.halts.map((h) => h.name),
      trains: l.id === 'ring' ? "line 2's" : `${trainsFor(cycle)} (estimate, ${Math.round(cycle)} s round trip)`,
      trip: trip(l.id === 'ring' ? [...TRAIN_STOPS_M[1]!, GORGE_M] : l.stops.map((x) => x / 100)),
      ends: [end(l.ends.find((e) => e.at === 'start')), end(l.ends.find((e) => e.at === 'end'))],
      after: AFTER[l.id] ?? ['', ''],
    });
  }
  return rows;
}
/** The proposal, per future line's [start, end] (docs/plans/rail-map.md, "The ends audit"). */
const AFTER: Record<string, [string, string]> = {
  ring: [
    'through: line 2 runs on from the Ring Island halt (the island halt is a through halt)',
    "terminal in the High Gorge split: buffers (a crossover before them); the cave row's White Wall ends beside it as a second platform",
  ],
  ns: [
    "terminal at High Gorge's low station (buffers), beside line 2's",
    'turning loop round the Original Island (kept); through Bell Rock at the water',
  ],
  bay: [
    'terminal: a bay platform at the one West landing station, buffers',
    'turning loop at Lantern Notch (kept); Canopy Town is a through stop at stage 8',
  ],
  'bay-trestle': ['terminal with buffers at the island halt (Canopy first only)', 'terminal with buffers at Bell Rock'],
  cave: [
    "terminal: the ring's Home end at West landing, buffers",
    'terminal at High Gorge, beside line 2 (no lap in the greybox); the White Wall grows from Port Quay on this row, and High Port is the crane',
  ],
};

// ---------------------------------------------------------------- every track end, before and after
type EndKind = 'crossover' | 'loop' | 'stub' | 'buffers' | 'through' | 'terminal' | 'temporary';
type End = {
  id: string;
  where: string;
  line: string;
  status: Status;
  x: number;
  z: number;
  /** Heading of the track into the end (radians, atan2(dx, dz)), for the symbol. */
  dir: number;
  before: EndKind;
  beforeText: string;
  complies: 'yes' | 'no' | 'partly';
  after: EndKind;
  afterText: string;
  cost: string;
};
const at = (p: { x: number; z: number }) => ({ x: r1(p.x), z: r1(p.z) });
const dirAt = (line: (typeof LIVE)[number]['line'], s: number, ds: number) => {
  const a = beside(line, s - ds, 0),
    b = beside(line, s, 0);
  return Math.atan2(b.x - a.x, b.z - a.z);
};
function ends(): End[] {
  const N = LINES.north,
    E = LINES.east;
  const ra = (u: number) => ({ x: ringAt(u).x / 100, z: ringAt(u).z / 100 });
  const out: End[] = [
    {
      id: 'l1-village',
      where: `Line 1, Village (layout B: road 1's buffers, s ${BUF1})`,
      line: 'line1',
      status: 'live',
      ...at(beside(N, BUF1, 0)),
      dir: dirAt(N, BUF1, -2),
      before: 'buffers',
      beforeText: `Layout B (the owner's pick, 9 November): road 1 runs straight at bearing 70° along the island (deck s 2.8-20.8) to buffer stops at s ${BUF1}, abeam of road 2's; its last 2.9 m beside the forge's south wall is the forge's goods dock. Today's live game still ends line 1 in the turntable well (no buffers) until home-station's flip.`,
      complies: 'yes',
      after: 'terminal',
      afterText:
        "Buffers, the Village end board and the concourse 1 m behind them: Home is both lines' terminus. Line trains never reach the table (it is on the engine spur).",
      cost: "Home-station step 9 (buffer stops and dressing, look only), after the flip (step 6). Nothing on today's table rim is worth building.",
    },
    {
      id: 'l2-village',
      where: `Line 2, Village (layout B: road 2's buffers, s ${BUF2})`,
      line: 'line2',
      status: 'live',
      ...at(beside(E, BUF2, 0)),
      dir: dirAt(E, BUF2, -2),
      before: 'buffers',
      beforeText: `Layout B: road 2 runs along the island's other edge (deck s 5.7-23.7) to buffer stops at s ${BUF2}. The engine spur leaves it at s ${SPUR.s} to the right for the 9.6 m table; the cart's leg joins it at s ${LEG.to}. Today's live game still ends line 2 on the table's line-2 road.`,
      complies: 'yes',
      after: 'terminal',
      afterText:
        "Buffers and an end board, as line 1's. The cart stops at these buffers beside the forge rack (home-station's ruling 3).",
      cost: 'Home-station step 9 (look only), after the flip.',
    },
    {
      id: 'stall',
      where: `The Roundhouse's open stall (layout B: the table's ${STALLS.open}° road)`,
      line: 'line2',
      status: 'live',
      ...W(stallFrame(STALLS.open).back),
      dir: Math.atan2(stallFrame(STALLS.open).u.x, stallFrame(STALLS.open).u.z),
      before: 'stub',
      beforeText: `Layout B: the engine spur (R 15, 60°) to the table, and three radial stall roads at ${STALLS.bearings.join('°, ')}° (the ${STALLS.open}° one open, the others ruin outlines), each ${STALLS.depth} m deep. No buffer stop at the stall's back.`,
      complies: 'no',
      after: 'buffers',
      afterText:
        "Buffers at the open stall's back wall; the shed is the terminal marking. The table shows stop blocks on the roads it isn't turned to (the spur and the stall roads).",
      cost: 'View only.',
    },
    {
      id: 'l1-camp',
      where: `Line 1, Camp (rail end s ${N.len})`,
      line: 'line1',
      status: 'live',
      ...at(beside(N, N.len, 0)),
      dir: dirAt(N, N.len, 2),
      before: 'stub',
      beforeText: `Single terminal track from the s 182 stub turnout past the Camp platform (s 195-219) to a bare rail end at s ${N.len}. The ridge falls 32.5 m beyond (generic-lines Level findings).`,
      complies: 'no',
      after: 'terminal',
      afterText:
        'Buffers at s 220 and an end board; the platform reads as a terminus. No loop: the ridge falls 32.5 m, so the camp is truly the end of line 1. Behind: the timber camp and the drop.',
      cost: 'View only.',
    },
    {
      id: 'l2-farhead',
      where: 'Line 2, Far Head while it is the end (before Q6)',
      line: 'line2',
      status: 'v26',
      ...at(beside(E, 501, 0)),
      dir: dirAt(E, 501, 2),
      before: 'crossover',
      beforeText:
        "A facing crossover at s 490-512 turns up trains onto the down track short of Far Head (stop 524); the up track runs on past it to the laying frontier, and Far Head's up platform waits, chained.",
      complies: 'partly',
      after: 'temporary',
      afterText:
        "Keep the crossover (a temporary turnback for the first hour); the laid rails' end at the Q6 frontier gets the track layer's own buffer beam and a 'line under construction' board.",
      cost: 'View only. Long trains: Far Head stop from s 524 to 526, so the tail clears the crossover (v26 catalog).',
    },
    {
      id: 'frontier',
      where: 'The laying frontier (each stretch while it is laid)',
      line: 'line2',
      status: 'live',
      ...at(beside(E, 546, 0)),
      dir: dirAt(E, 546, 2),
      before: 'stub',
      beforeText: 'Wherever the machine has stopped, the rails end with the track layer parked on them.',
      complies: 'partly',
      after: 'temporary',
      afterText:
        "The machine is the buffer: a buffer beam on its back end and a board, so the end of the laid line reads as 'being built'.",
      cost: 'View only.',
    },
    {
      id: 'pier',
      where: `Line 2, the pier head (rail end s ${E.len}; Q6 to v27)`,
      line: 'line2',
      status: 'live',
      ...at(beside(E, E.len, 0)),
      dir: dirAt(E, E.len, 2),
      before: 'stub',
      beforeText:
        'One terminal track from the s 556 stub turnout down the pier to a bare end 24.3 m over the sea, the track layer parked on it (its loco back at s 734.4).',
      complies: 'no',
      after: 'temporary',
      afterText:
        'Buffers at s 742.5 with a Pier end board, lifted by the machine when Q7 lays on (v27). Behind: the bents and the raised leaf.',
      cost: 'View only (v27 removes them). Long trains with the longer engine: pier stop from s 726.5 to 725.',
    },
    {
      id: 'railhead',
      where: 'Line 2, the moving railhead over bents 7-13 (v27, before the Meet)',
      line: 'line2',
      status: 'v27',
      ...at(ra(RING_HEAD[7]!.u)),
      dir: Math.atan2(0.0272, -1),
      before: 'buffers',
      beforeText:
        'A stub end with a buffer stop (RING_RAILHEAD_KIT), the railhead platform, lever, rack and jib, moving 20 m per bent; the stub merges 20 m short.',
      complies: 'yes',
      after: 'buffers',
      afterText:
        'As planned, plus an end board on the buffer. A longer-engine train stops 2 m shorter (its nose would reach the buffer face).',
      cost: 'v27 data (the end stop for long trains).',
    },
    {
      id: 'ring-loop',
      where: 'Ring Island halt while it is the end (v27)',
      line: 'line2',
      status: 'v27',
      ...at(ra(RING_END_U * 100)),
      dir: Math.atan2(0.0272, -1),
      before: 'loop',
      beforeText:
        "R1's balloon loop, r 40 m, centred 48 m east of the halt; as laid out its neck runs 12 m on and then 30.6 m back south to the circle (a 165° reversal, then a 12° kink onto the circle): it can't be run as drawn.",
      complies: 'partly',
      after: 'buffers',
      afterText: `Recommended (owner question 2): both tracks run on ${RING_END_U - RING_HALT.u1 / 100} m past the platforms to buffers and an end board at u ${RING_END_U}, facing the way the line will go on; a facing crossover on the Way before the halt (about u ${RING_X[0]}-${RING_X[1]}), as Far Head's; trains stand at the east platform (the works side); the west lever is chained and plaqued with the branch. No train is ever turned. The alternative, a turning loop, is undrawn: a circle wholly east of both tracks can't take the up (west) track without crossing the down track, so it needs a merge to one track first or a teardrop about 80 m wide astride the line, and it cuts up to 12 m into the cone.`,
      cost: "A small R1 amendment (the crossover and buffer positions; RING_LOOP out of line 2's row); R2b drops the loop deck; R3a loses its loop leg. Then through when line 2 itself runs on.",
    },
  ];
  for (const l of WORLD_LINES)
    for (const e of l.ends) {
      const tip = e.at === 'start' ? l.pts[0]! : l.pts.at(-1)!,
        nb = e.at === 'start' ? l.pts[1]! : l.pts.at(-2)!;
      const halt = e.at === 'start' ? l.halts[0]! : l.halts.at(-1)!;
      out.push({
        id: `${l.id}-${e.at}`,
        where: `${l.name}, ${halt.name}`,
        line: l.id,
        status: l.id === 'ring' ? 'v27' : 'later',
        x: r1(e.x / 100),
        z: r1(e.z / 100),
        dir: Math.atan2(tip[0] - nb[0], tip[1] - nb[1]),
        before: e.kind,
        beforeText:
          e.kind === 'loop'
            ? `A 40 m turning loop past ${halt.name}.`
            : `A scissors crossover 35 m inside ${halt.name}; its two tracks still end past the platforms, unmarked.`,
        complies: e.kind === 'loop' ? 'yes' : 'no',
        ...FUTURE_AFTER[`${l.id}-${e.at}`]!,
      });
    }
  return out;
}
const FUTURE_AFTER: Record<string, Pick<End, 'after' | 'afterText' | 'cost'>> = {
  'ring-end': {
    after: 'terminal',
    afterText:
      "Line 2 runs on through the Ring Island halt along the west shore (no Ring top, ruling 3) and ends in the High Gorge split: buffers and a crossover before them, the White Wall's last span arriving beside it as a second platform.",
    cost: "The branch's bump: line 2's row grows (like `extends: 1`); the catalog (src/sim/railway-world-lines.ts) already draws it.",
  },
  'ns-start': {
    after: 'terminal',
    afterText: "A terminal at High Gorge's low station (3 m in the split), beside line 2's platform.",
    cost: 'Map data.',
  },
  'ns-end': {
    after: 'loop',
    afterText:
      "The incline and the causeway are one north-south line through Bell Rock (they are collinear), at the water: it goes on to a sunken causeway, so it never needs height. Kept: The Boogler's island is the ending; the train circles it.",
    cost: "Map data and the hub's station plan; Bell Rock on two levels, the bay line on the skerry at 15 m above it (owner question 3).",
  },
  'bay-start': {
    after: 'terminal',
    afterText:
      "A bay platform at the one West landing station (ruling 6), buffers against the town's shore wall: Home is where lines end, on foot between.",
    cost: 'Map data.',
  },
  'bay-end': {
    after: 'loop',
    afterText:
      'Canopy keeps its loop while it is the end (stages 3/5-8); at stage 8 the bay line runs on to Lantern Notch, where the loop stays (the arch is the end of the world).',
    cost: "Stage 8's bump.",
  },
  'bay-trestle-start': {
    after: 'terminal',
    afterText:
      "Canopy-first only: a terminal with buffers at the island halt's west side. Not a shuttle: it runs on through Bell Rock to Canopy Town as one line (the review's finding 6), so the first trip to the new town needs no change of train.",
    cost: 'Map data.',
  },
  'bay-trestle-end': {
    after: 'through',
    afterText:
      "Canopy first: through Bell Rock (on the skerry, at 15 m, the bay line's level) onto the cleft to Canopy Town. The bay shortcut arrives at stage 4 as the second line into Bell Rock, a terminal there.",
    cost: 'Map data.',
  },
  'cave-start': {
    after: 'terminal',
    afterText:
      "The ring's Home end: buffers at the West landing station, beside the bay line's platform; the walk to the Village halts is the hub (ruling 6).",
    cost: 'Map data.',
  },
  'cave-end': {
    after: 'terminal',
    afterText:
      'The row runs through Port Quay (High Port is the crane) and on as the White Wall to High Gorge, where it ends beside line 2 as a second platform (the greybox route, ruling 2; no lap). Stages 6-7: buffers at the quay while the Wall is unbuilt, the crane behind them.',
    cost: 'Map data (the lift leg leaves the rail catalog).',
  },
};

// ---------------------------------------------------------------- halts: platforms, stopping marks and overhang
type HaltRow = {
  name: string;
  lines: string[];
  status: Status;
  x: number;
  z: number;
  platforms: string;
  stops: string;
  turns: string;
  turnsAfter: string;
  forWhat: string;
  role: string;
  overhang: string[];
  flags: string[];
  /** Each platform: its track's centreline samples and its lateral offset (m, + right of the drawn direction). */
  plats: { pts: [number, number][]; lat: number; label: string }[];
};
const FOR: Record<string, string> = {
  Village:
    "Home: one terminus (layout B), the concourse, the forge's goods dock, the turntable and Roundhouse on the engine spur; deliveries arrive here. Spawn's shore is 100-130 m west.",
  Camp: "Line 1's timber camp: logs.",
  'Village, line 2':
    "Home, line 2: the island's other edge; the wagon comes from the stall over the table and up the spur.",
  Quarry: 'Split-rock Works: the breaker, the kiln, footings; the depot cart.',
  'Far Head': 'The headland: the glide pad, the pier root, Q6.',
  Pier: 'The pier rack: footings for the bents (done once Q7 is laid); Ring Island across the sea.',
  Railhead:
    "The Meet (v27): the rack, the jib, the gap; after the Meet, the Meet's own halt (the rivet, the leaf, the hook ring below; the owner names it).",
  'Ring Island halt': 'The Meet, the shard folk, steel (the longer boiler); the branch junction.',
  'Ring top': 'Superseded (ruling 3): the summit is a walked-up lookout.',
  'High Gorge': 'Copper, the powered pick and hook reel; the stair and lift; the falls cave.',
  'Bell Rock': 'Crystal seeds by hand, hook practice: the bay hub.',
  'West landing (bay)': "Spawn's shore and the sea cave plug: the bay shortcut.",
  'West landing (cave)': "Spawn's shore: the cave line through the plug.",
  'Canopy Town': 'Fibre, the sling and glider cloth; the Notch ledge.',
  'Saltpan Halt': 'Sliding the salt flats.',
  'Port Quay': 'The harbour, and the crane lift up to High Port (town services, the faster engine, the seed cradle).',
  'High Port': 'Town services, the faster engine, the seed cradle (by the crane).',
  'Lantern Notch': 'The sea arch and its lantern.',
  'Original Island': "The Boogler's island: the ending.",
};
const ROLE: Record<string, string> = {
  Village: 'terminus (line 1)',
  Camp: 'terminus',
  'Village, line 2': 'terminus (line 2); walk-between junction with line 1',
  Quarry: 'through halt (request)',
  'Far Head': 'terminus before Q6, then through halt (request)',
  Pier: 'terminus Q6 to v27, then a homeward request stop only (the up platform is not built)',
  Railhead: "moving terminus (v27), then the Meet's halt (through)",
  'Ring Island halt': 'terminus with buffers (v27), then through halt and junction',
  'High Gorge': "junction: the ring through, the N-S line's terminus",
  'Bell Rock': 'junction on two levels: the bay line on the skerry at 15 m, the N-S line at the water',
  'West landing (bay)': "terminus (bay line), one station with the ring's end",
  'West landing (cave)': "terminus (the ring's Home end)",
  'Canopy Town': 'junction: the ring through, the bay line loop terminus then through',
  'Saltpan Halt': 'through halt (request)',
  'Port Quay': 'through halt; the crane to High Port',
  'High Port': "not a rail halt after the ruling: the crane's top",
  'Lantern Notch': 'loop terminus',
  'Original Island': 'loop terminus',
  'Ring top': 'removed',
};
const liveSpan = (line: (typeof LIVE)[number]['line'], s0: number, s1: number): [number, number][] => {
  const out: [number, number][] = [];
  for (let s = s0; s <= s1 + 1e-6; s += 2) {
    const p = beside(line, Math.min(s, s1), 0);
    out.push([r1(p.x), r1(p.z)]);
  }
  return out;
};
const ringSpan = (u0: number, u1: number): [number, number][] =>
  [u0, (u0 + u1) / 2, u1].map((u) => [r1(ringAt(u).x / 100), r1(ringAt(u).z / 100)]);
/** A future line's centreline from `a` to `b` cm along it. */
function worldSpan(l: (typeof WORLD_LINES)[number], a: number, b: number): [number, number][] {
  const out: [number, number][] = [];
  const pt = (cm: number) => {
    let acc = l.fromCm;
    for (let i = 1; i < l.pts.length; i++) {
      const p = l.pts[i - 1]!,
        q = l.pts[i]!;
      const len = Math.hypot(q[0] - p[0], q[1] - p[1]);
      if (acc + len >= cm || i === l.pts.length - 1) {
        const t = Math.max(0, Math.min(1, (cm - acc) / (len || 1)));
        return [r1((p[0] + (q[0] - p[0]) * t) / 100), r1((p[1] + (q[1] - p[1]) * t) / 100)] as [number, number];
      }
      acc += len;
    }
    return [0, 0] as [number, number];
  };
  for (let cm = a; cm <= b; cm += 500) out.push(pt(cm));
  return out;
}
function liveHaltRows(): HaltRow[] {
  const rows: HaltRow[] = [];
  const { pass, engineNose, bigNose, tail, todayTail } = CONSIST;
  for (const h of liveHalts()) {
    const L = LIVE.find((l) => l.id === h.line)!;
    const stop = MARKS[h.name]?.s ?? h.stop;
    const p = beside(L.line, stop, 0);
    const obs = obstacles(h.line);
    const overhang: string[] = [];
    const flags: string[] = [];
    for (const [dir, plat] of [
      ['up (+s, away from Home)', h.up],
      ['down (−s, towards Home)', h.down],
    ] as const) {
      if (!plat) {
        overhang.push(
          `${dir}: no platform (v27 adds the pier's up platform, ${RING_PIER_UP.x / 100}, ${RING_PIER_UP.z / 100})`,
        );
        continue;
      }
      // Engine always at +s today (train-view poses every car with sign 1; push-pull).
      const span = (nose: number) => [stop + tail, stop + nose] as const;
      const [a, b] = span(engineNose),
        [, bb] = span(bigNose);
      const onPlat = stop - pass >= plat.s0 - 0.01 && stop + pass <= plat.s1 + 0.01;
      overhang.push(
        `${dir}: platform s ${r1(plat.s0)}-${r1(plat.s1)} (${r1(plat.s1 - plat.s0)} m, lat ${r1(plat.lat)}); stop s ${stop}: passenger car ${onPlat ? 'on it' : `OFF it (${r1(Math.max(plat.s0 - (stop - pass), stop + pass - plat.s1))} m over)`}; long train s ${r1(a)}-${r1(b)} (${r1(bb)} with the longer engine): ${r1(Math.max(0, plat.s0 - a))} m behind, ${r1(Math.max(0, bb - plat.s1))} m ahead of the platform`,
      );
      if (!onPlat) flags.push(`${dir}: passenger car off the platform at the shared mark s ${stop}`);
      const tracks = dir.startsWith('up') ? ['both', 'up'] : ['both', 'down'];
      for (const o of obs) {
        if (!tracks.includes(o.tracks)) continue;
        const foulLong = a < o.s1 && bb > o.s0;
        const foulToday = stop + todayTail < o.s1 && stop + engineNose > o.s0;
        if (foulLong)
          flags.push(
            `${dir}: the long train (s ${r1(a)}-${r1(bb)}) fouls ${o.what}${foulToday ? ", and so does today's" : ''}`,
          );
      }
    }
    // The next halt's approach on this line.
    rows.push({
      name: h.name,
      lines: [L.id === 'line1' ? 'Line 1' : 'Line 2'],
      status: h.status,
      x: r1(p.x),
      z: r1(p.z),
      platforms: [h.up, h.down]
        .map((q, k) => (q ? `${k ? 'down' : 'up'} ${r1(q.s1 - q.s0)} m at lat ${q.lat}` : `${k ? 'down' : 'up'}: none`))
        .join('; '),
      stops: `one mark for both tracks: s ${h.stop}${stop !== h.stop ? ` → ${stop}` : ' (kept)'}; ${MARKS[h.name]?.why ?? ''}`,
      turns: TURNS[h.name] ?? '',
      turnsAfter: TURNS_AFTER[h.name] ?? '',
      forWhat: FOR[h.name] ?? '',
      role: ROLE[h.name] ?? '',
      overhang,
      flags,
      // Layout B's Village halts are one island, drawn with the station (homeB).
      plats: h.name.startsWith('Village')
        ? []
        : [
            ...(h.up ? [{ pts: liveSpan(L.line, h.up.s0, h.up.s1), lat: h.up.lat, label: 'up' }] : []),
            ...(h.down && h.down !== h.up
              ? [{ pts: liveSpan(L.line, h.down.s0, h.down.s1), lat: h.down.lat, label: 'down' }]
              : []),
          ],
    });
  }
  // v27: the railhead (bent 13) and the island halt.
  const head = RING_HEAD[7]!;
  rows.push({
    name: 'Railhead',
    lines: ['Line 2 (v27)'],
    status: 'v27',
    x: r1(head.platform.x / 100),
    z: r1(head.platform.z / 100),
    platforms:
      'down only, 25 m (u − 25 to u), lat +1.8 to +6.3; after the Meet an up platform on the last bent (call 14)',
    stops: 's = u − 10 m (engine nose u − 3.8; the buffer face u − 1.8)',
    turns: 'buffers (stub, moving)',
    turnsAfter: 'buffers, then through after the Meet',
    forWhat: FOR.Railhead!,
    role: ROLE.Railhead!,
    overhang: [
      `down: passenger car u − 11.6 to u − 8.4 on the platform; long train u ${r1(-10 + tail)} to u ${r1(-10 + engineNose)} (u ${r1(-10 + bigNose)} with the longer engine): ${r1(Math.max(0, -25 - (-10 + tail)))} m behind the platform, the merge at u − 30 clear`,
    ],
    flags: [`the longer engine's nose reaches u ${r1(-10 + bigNose)}, the buffer face (u − 1.8): stop it 2 m shorter`],
    plats: [{ pts: ringSpan(head.u - 2500, head.u), lat: 4.05, label: 'down (railhead at bent 13)' }],
  });
  const halt = RING_HALT;
  const mid = (halt.u0 + halt.u1) / 200;
  rows.push({
    name: 'Ring Island halt',
    lines: ['Line 2 (v27)', 'first branch (later)'],
    status: 'v27',
    x: r1(ringAt(mid * 100).x / 100),
    z: r1(ringAt(mid * 100).z / 100),
    platforms: `up (west, lat ${halt.upLat.join(' to ')} cm) and down (east, lat ${halt.downLat.join(' to ')} cm), each ${(halt.u1 - halt.u0) / 100} m`,
    stops: `u ${mid} m, one mark; while the island is the end trains stand at the east (down) platform, the west lever chained and plaqued with the branch`,
    turns: "balloon loop (R1, can't be run as drawn)",
    turnsAfter: `buffers at u ${RING_END_U} on both tracks and a crossover on the Way (u ${RING_X[0]}-${RING_X[1]}); recommended over a turning loop (undrawn); through when line 2 runs on`,
    forWhat: FOR['Ring Island halt']!,
    role: ROLE['Ring Island halt']!,
    overhang: [
      `down (east), with buffers: never turned, the engine stays at +s: long train u ${r1(mid + tail)} to u ${r1(mid + bigNose)}, inside the 40 m platform (u ${halt.u0 / 100}-${halt.u1 / 100}) with ${r1(mid + tail - halt.u0 / 100)} m and ${r1(halt.u1 / 100 - (mid + bigNose))} m to spare; the passenger car ${r1(RING_END_U - mid)} m from the buffers (at least ${TERMINAL_GAP})`,
      `with R1's loop instead, every train would come back turned (engine at −s): u ${r1(mid - bigNose)} to u ${r1(mid - tail)}, and the cargo cars would swap sides of the mark at every halt`,
    ],
    flags: [],
    plats: [
      { pts: ringSpan(halt.u0, halt.u1), lat: -7.55, label: 'up (west)' },
      { pts: ringSpan(halt.u0, halt.u1), lat: 3.55, label: 'down (east)' },
    ],
  });
  return rows;
}
const TURNS: Record<string, string> = {
  Village: `layout B: buffers at s ${BUF1} (today's game: a stub into the table well)`,
  Camp: 'stub (bare rail end)',
  'Village, line 2': `layout B: buffers at s ${BUF2} (today's game: onto the table road)`,
  Quarry: 'nothing',
  'Far Head': 'crossover s 490-512 (before Q6)',
  Pier: 'stub (bare end, Q6 to v27)',
};
const TURNS_AFTER: Record<string, string> = {
  Village: 'buffers and an end board (home-station step 9)',
  Camp: 'buffers at s 220',
  'Village, line 2': 'buffers and an end board; the table, on its spur, shows stop blocks',
  Quarry: 'nothing',
  'Far Head': 'crossover (temporary), then nothing',
  Pier: 'buffers (temporary), then a homeward request stop only (no up platform)',
};
function futureHaltRows(): HaltRow[] {
  const by = new Map<string, { lines: string[]; x: number; z: number; ends: string[]; plats: HaltRow['plats'] }>();
  for (const l of WORLD_LINES)
    l.halts.forEach((h, i) => {
      const key = h.name.replace(/ \((bay|cave)\)$/, '');
      const name = h.name.startsWith('West landing') ? 'West landing' : key;
      const row = by.get(name) ?? { lines: [], x: h.x / 100, z: h.z / 100, ends: [], plats: [] };
      const span = worldSpan(l, l.stops[i]! - 2000, l.stops[i]! + 2000);
      const off = FORMATION.platformCm / 100;
      row.plats.push({ pts: span, lat: -off, label: `${l.name} up` }, { pts: span, lat: off, label: `${l.name} down` });
      row.lines.push(l.name);
      const e = l.ends.find((x) => (x.at === 'start' && i === 0) || (x.at === 'end' && i === l.halts.length - 1));
      if (e) row.ends.push(`${l.name}: ${e.kind}`);
      by.set(name, row);
    });
  const { tail, bigNose } = CONSIST;
  return [...by.entries()].map(([name, r]) => ({
    name,
    lines: r.lines,
    status: name === 'Ring top' ? 'v27' : 'later',
    x: r1(r.x),
    z: r1(r.z),
    platforms: `${r.lines.length} line(s) × two 40 m platforms, outside each track (5.8 m off the corridor's middle)`,
    stops: "the platform's middle on each track",
    turns: r.ends.join('; ') || 'nothing',
    turnsAfter: FUTURE_TURNS_AFTER[name] ?? '',
    forWhat: FOR[name] ?? FOR[`${name} (bay)`] ?? '',
    role: ROLE[name] ?? ROLE[`${name} (bay)`] ?? '',
    overhang: [
      `40 m platforms; the long train is ${r1(bigNose - tail)} m. With the passenger car at the platform's middle it runs ${r1(-tail)} m back and ${r1(bigNose)} m ahead: ${r1(20 + tail)} m and ${r1(20 - bigNose)} m to spare. At a terminal with buffers the stop mark is ${r1(bigNose + 2)} m from the buffers where the engine faces them (the far end, push-pull) and ${r1(-tail + 2)} m where the cargo cars do (the Home end)`,
    ],
    flags:
      name === 'Bell Rock'
        ? [
            "four lines' platforms cross on the skerry in the blockout (stills): two levels, the bay line on top at 15 m, the north-south line at the water, stairs between (to check with a profile when the hub is built)",
          ]
        : [],
    plats: r.plats,
  }));
}
const FUTURE_TURNS_AFTER: Record<string, string> = {
  'Ring top': 'removed',
  'High Gorge': "buffers for the N-S line's start; the ring passes through",
  'Bell Rock':
    "nothing on the bay line (skerry, 15 m); the N-S line's buffers at the water facing the causeway, stages 4-8",
  'West landing': "buffers × 2 (bay platform, the ring's end)",
  'Canopy Town': 'loop until stage 8, then nothing',
  'Saltpan Halt': 'nothing',
  'Port Quay': 'nothing (buffers stages 6-7)',
  'High Port': 'none (the crane)',
  'Lantern Notch': 'loop',
  'Original Island': 'loop',
};

// ---------------------------------------------------------------- cargo loaders
function loaders() {
  const E = LINES.east,
    N = LINES.north;
  const rows: { name: string; x: number; z: number; text: string }[] = [];
  const rack = W(PROPS.rack),
    stall = W(stallFrame(STALLS.open).back);
  const src: { id: string; name: string; x: number; z: number; line: string; ln: typeof E }[] = [
    ...SOURCES.filter((s) => s.id !== 'stall').map((s) => ({ ...s, ln: E })),
    {
      id: 'forge',
      name: "The forge rack (rails; layout B, on the island's apron by the buffers)",
      ...rack,
      line: 'line2',
      ln: E,
    },
    { id: 'stall', name: "The Roundhouse's open stall (layout B)", ...stall, line: 'line2', ln: E },
    {
      id: 'depot',
      name: "The depot (line 2's camp, the cart)",
      x: LINKS[1]!.camp.x + ORIGIN.x,
      z: LINKS[1]!.camp.z + ORIGIN.z,
      line: 'line2',
      ln: E,
    },
    {
      id: 'timber',
      name: "Line 1's timber camp (logs)",
      x: LINKS[0]!.camp.x + ORIGIN.x,
      z: LINKS[0]!.camp.z + ORIGIN.z,
      line: 'line1',
      ln: N,
    },
  ];
  for (const s of src) {
    const a = alongLive(s.ln, s.x, s.z);
    const halts = liveHalts()
      .filter((h) => h.line === s.line)
      .map((h) => ({ ...h, stop: MARKS[h.name]?.s ?? h.stop }));
    const near = halts.reduce((b, h) => (Math.abs(h.stop - a.s) < Math.abs(b.stop - a.s) ? h : b));
    const off = a.s - near.stop;
    const where = `s ${r1(a.s)}, ${r1(Math.abs(a.lat))} m ${a.lat > 0 ? 'right' : 'left'} of ${s.line === 'line1' ? 'line 1' : 'line 2'}'s track, ${r1(Math.abs(off))} m ${off < 0 ? 'Home-side' : 'pier-side'} of ${near.name}'s mark (s ${near.stop}).`;
    const loader = ` A loader serving a standing train sits at the cargo cars: s ${r1(near.stop - 3.7)} to ${r1(near.stop - 11.1)} (cars 2-4, Home-side of the passenger car in both directions: push-pull, never turned), on the ${a.lat > 0 ? 'down (right)' : 'up (left)'} side.`;
    const text =
      s.id === 'stall'
        ? `${where} Not a loader: the shunter brings stock from the stall over the table and up the spur, which leaves road 2 at s ${SPUR.s}.`
        : s.id === 'forge'
          ? `${where}${loader} The rack stands on the island's apron between the buffers and the deck's head ramp, ${r1(near.stop + CONSIST.tail - a.s)} m behind the last cargo car: the cargo end, on the island, so rails go from rack to car without crossing a track. The recovery rack (the Village yard, today at ${RECOVERY_RACK.x / 100}, ${RECOVERY_RACK.z / 100}) moves beside it in layout B.`
          : where + loader;
    rows.push({ name: s.name, x: r1(s.x), z: r1(s.z), text });
  }
  const ringMid = (RING_HALT.u0 + RING_HALT.u1) / 2;
  const sw = ringAt(ringMid - 700, 900);
  rows.push({
    name: "Ring Island's steel works (build 2)",
    x: r1(sw.x / 100),
    z: r1(sw.z / 100),
    text: `On the down (east, homeward) side of the island halt, where trains stand while it is the end. With buffers the train is never turned, so the cargo cars are Home-side of the mark as everywhere else: the loader at u ${r1((ringMid - 1110) / 100)} to ${r1((ringMid - 370) / 100)} m, east of the platform's south half.`,
  });
  const g = WORLD_LINES.find((l) => l.id === 'ring')!.halts.find((h) => h.name === 'High Gorge')!;
  rows.push({
    name: 'High Gorge copper works (later)',
    x: r1(g.x / 100),
    z: r1(g.z / 100),
    text: "In the split beside the ring's homeward track, at the cargo cars of a train standing at the low station: 4-11 m Home-side of the passenger car's mark; the lift carries the copper down to it.",
  });
  return rows;
}
/** Where this plan and station-deposit's review disagree (the design review's finding 10). */
const LOADER_NOTE =
  "Loaders stand Home-side of the passenger car's mark in both directions: today's trains are push-pull (train-view.ts poses the engine at +s), and with buffers at Ring Island no train is ever turned. docs/brainstorms/station-deposit.md's review puts each yard at the foot of the down platform's back ramp, mid-platform, on the premise that each direction's cargo cars trail at opposite ends. The two agree on the side of the track (the down platform's, the Works side at the Quarry) and differ along it by 4-11 m; the yard's premise holds only where a line turns its trains on a loop (stage 8's two loops). Build 1's yards stay where they are; build 2's gantry has to reach from the back ramp's foot to the cargo cars, across the deck's end ramp, which neither brief has drawn.";

// ---------------------------------------------------------------- keep-clear for the grown Roundhouse
/** The Roundhouse grows as an upgrade (the engine-garage brief: today's 9.6 m table to about a 16 m table and 16 m
 * stalls for end-game engines), and only ever on layout B (the design review's finding 1): a sector south of B's table
 * on its spur, to `r`, plus the grown table. Nothing in town moves. What stands within `r` of the table is listed with
 * its bearing (degrees clockwise from north), and whether it is inside the sector. */
export const GROWN = { table: 8, stalls: 16, wall: 2, from: 130, to: 250 } as const;
function keepClear() {
  const c = W(TABLE);
  const R = GROWN.table + GROWN.stalls + GROWN.wall;
  const items: string[] = [];
  const bearing = (x: number, z: number) => ((Math.atan2(x - c.x, -(z - c.z)) * 180) / Math.PI + 360) % 360;
  const inSector = (b: number) => b >= GROWN.from && b <= GROWN.to;
  const near = (what: string, x: number, z: number, r = 0) => {
    const d = Math.hypot(x - c.x, z - c.z) - r;
    if (d >= R) return;
    const b = bearing(x, z);
    const where =
      d < GROWN.table ? 'inside the grown table' : inSector(b) ? '**inside the sector**' : 'outside the sector';
    items.push(`${what}: ${r1(Math.max(0, d))} m at ${Math.round(b)}° (${where})`);
  };
  const plots = [...TOWN.start, ...TOWN.wood.flat(), ...TOWN.stone.flat(), ...TOWN.camps.flatMap((t) => t.awake)];
  for (const b of plots) near(`a town ${b.type}`, b.x + ORIGIN.x, b.z + ORIGIN.z, Math.max(b.w ?? 5, b.d ?? 5) / 2);
  for (const [id, b] of Object.entries(ROOM_PLOTS))
    near(`the ${id} room`, b.x + ORIGIN.x, b.z + ORIGIN.z, Math.max(b.w, b.d) / 2);
  near('the forge', FORGE.x + ORIGIN.x, FORGE.z + ORIGIN.z, Math.max(FORGE.w, FORGE.d) / 2);
  near("the forge's frame", FORGE_FRAME.x + ORIGIN.x, FORGE_FRAME.z + ORIGIN.z);
  near('the axe stand', AXE_STAND.x + ORIGIN.x, AXE_STAND.z + ORIGIN.z);
  near('the forge crane (layout B)', W(PROPS.crane).x, W(PROPS.crane).z);
  near('the forge rack (layout B)', W(PROPS.rack).x, W(PROPS.rack).z);
  near(
    `the recovery rack, the Village yard (today ${RECOVERY_RACK.x / 100}, ${RECOVERY_RACK.z / 100}; layout B by the buffers)`,
    W(PROPS.rack).x,
    W(PROPS.rack).z,
  );
  near('the concourse', W(HALL).x, W(HALL).z, HALL.w / 2);
  const q1 = LINKS[1]!.stations.find((t) => t.id === 'Q1');
  if (q1) {
    const f = frameBesideLine(q1, LINKS[1]!.line, LINKS[1]!.dir);
    near("Q1's frame (layout B: road 2's south side)", f.x, f.z);
  }
  for (const b of STALLS.bearings) {
    const f = stallFrame(b);
    near(
      `the ${b}° stall's back${b === STALLS.open ? ' (open; it is the thing that grows)' : ' (a ruin outline)'}`,
      W(f.back).x,
      W(f.back).z,
    );
  }
  for (const [k, L] of LIVE.entries()) {
    // the road's nearest approach to the table, and whether it crosses the sector
    let best = { s: 0, d: Infinity, b: 0 };
    let crosses = false;
    for (let s = BUFFERS[k]!; s <= 80; s += 0.5) {
      const p = beside(L.line, s, 0);
      const d = Math.hypot(p.x - c.x, p.z - c.z);
      const b = bearing(p.x, p.z);
      if (d < R && inSector(b)) crosses = true;
      if (d < best.d) best = { s, d, b };
    }
    items.push(
      `${L.name}'s road: nearest ${r1(best.d)} m at s ${best.s} (${Math.round(best.b)}°); ${crosses ? '**crosses the sector**' : 'clear of the sector'}`,
    );
  }
  const sp = spurPoints();
  const spurB = bearing(W(sp[0]!).x, W(sp[0]!).z);
  items.push(
    `the engine spur arrives at the table from ${Math.round((TABLE.spur + 360) % 360)}° (it leaves road 2 at s ${SPUR.s}, ${Math.round(spurB)}° from the table): outside the sector`,
  );
  return {
    x: c.x,
    z: c.z,
    r: R,
    table: GROWN.table,
    from: GROWN.from,
    to: GROWN.to,
    items,
  };
}

// ---------------------------------------------------------------- services, for both branch orders
/** The services the proposals give (docs/plans/rail-map.md, "The shape it gives the network"), for each branch order
 * (the design review's finding 6), as the map links (catalog legs) each runs over. Legs no service uses in an order
 * are drawn grey: not built in that order, or removed by a ruling. */
type Order = 'gorge' | 'canopy';
type Service = { id: string; name: string; colour: string; legs: string[]; text: string };
const RING_LEGS = ['line2', 'ring-v27', 'ledge', 'wall-n', 'wall-s', 'salt-quay', 'seacave'];
const SERVICES: Record<Order, Service[]> = {
  gorge: [
    { id: 'line1', name: 'Line 1', colour: COLOURS.line1!, legs: ['line1'], text: 'Village to Camp: two terminals.' },
    {
      id: 'ring',
      name: 'The ring (line 2 grown)',
      colour: COLOURS.ring!,
      legs: RING_LEGS,
      text: "Village, Quarry, Far Head, the pier (homeward only), the Meet's halt, Ring Island (v27), High Gorge (stage 3), Canopy Town and Port Quay (stage 7, the White Wall line), Saltpan, West landing (stage 6: the cave line, its own row with its own trains until stage 7 joins the halves). Both ends at Home, a walk apart.",
    },
    {
      id: 'bay',
      name: 'Bay line',
      colour: COLOURS.bay!,
      legs: ['bay-cut', 'bell-canopy', 'notch-tunnel'],
      text: 'West landing, Bell Rock on the skerry (stage 4), Canopy Town (stage 5), on to Lantern Notch (stage 8).',
    },
    {
      id: 'ns',
      name: 'North-south line',
      colour: COLOURS.causeway!,
      legs: ['incline', 'final'],
      text: "High Gorge's low station, Bell Rock at the water (stage 4), the Original Island (stage 8).",
    },
  ],
  canopy: [
    { id: 'line1', name: 'Line 1', colour: COLOURS.line1!, legs: ['line1'], text: 'Village to Camp: two terminals.' },
    {
      id: 'ring',
      name: 'The ring (line 2 grown)',
      colour: COLOURS.ring!,
      legs: RING_LEGS,
      text: 'As Gorge first, but line 2 runs on from Ring Island to High Gorge at stage 5.',
    },
    {
      id: 'island-canopy',
      name: 'Island to Canopy line',
      colour: COLOURS.notch!,
      legs: ['ring-bell', 'bell-canopy', 'notch-tunnel'],
      text: "Stage 3: Ring Island (a terminal at the halt's west side), the bay trestle to Bell Rock (on the skerry), the cleft to Canopy Town: one line, so the first trip to the new town needs no change of train. On to Lantern Notch at stage 8.",
    },
    {
      id: 'bay',
      name: 'Bay line (the shortcut)',
      colour: COLOURS.bay!,
      legs: ['bay-cut'],
      text: 'Stage 4: West landing to Bell Rock, the second line into Bell Rock, a terminal there (walk-between).',
    },
    {
      id: 'ns',
      name: 'North-south line',
      colour: COLOURS.causeway!,
      legs: ['incline', 'final'],
      text: "Stage 5: High Gorge's low station, Bell Rock at the water; the Original Island at stage 8.",
    },
  ],
};
/** Legs a ruling removed from the rail catalog (the regenerated blockout catalog no longer carries them). */
const REMOVED: Record<string, string> = {
  lift: "the cave line's climb to High Port: the crane lifts instead (the rulings' knock-on)",
};

// ---------------------------------------------------------------- the network for drawing
type Corridor = {
  id: string;
  /** The catalog leg (or live line) it is, for the services view. */
  leg: string;
  line: string;
  status: Status;
  colour: string;
  dash: string;
  pts: [number, number][];
  a: (number | null)[];
  b: (number | null)[];
  label: string;
};
const DASH: Record<Status, string> = { live: '', v26: '', v27: '10 5', later: '4 4' };
/** A future line's vertices from `a` to `b` cm along it, the ends interpolated. */
function legPts(l: (typeof WORLD_LINES)[number], a: number, b: number): [number, number][] {
  const out: [number, number][] = [];
  let acc = l.fromCm;
  const lerp = (p: readonly number[], q: readonly number[], t: number): [number, number] => [
    r1((p[0]! + (q[0]! - p[0]!) * t) / 100),
    r1((p[1]! + (q[1]! - p[1]!) * t) / 100),
  ];
  for (let i = 1; i < l.pts.length; i++) {
    const p = l.pts[i - 1]!,
      q = l.pts[i]!;
    const len = Math.hypot(q[0] - p[0], q[1] - p[1]);
    const s0 = acc,
      s1 = acc + len;
    if (s1 >= a && s0 <= b) {
      if (!out.length) out.push(lerp(p, q, Math.max(0, (a - s0) / (len || 1))));
      if (s1 <= b) out.push(lerp(q, q, 0));
      else out.push(lerp(p, q, (b - s0) / (len || 1)));
    }
    acc = s1;
  }
  return out;
}
function corridors(): Corridor[] {
  const out: Corridor[] = [];
  for (const L of LIVE) {
    const pts: [number, number][] = [],
      a: (number | null)[] = [],
      b: (number | null)[] = [];
    // From layout B's buffers (behind s 0), then every 2 m.
    const ss = [BUFFERS[L.index]!, ...Array.from({ length: Math.floor(L.line.len / 2) + 1 }, (_, k) => 2 * k)];
    for (const s of ss) {
      const p = beside(L.line, s, 0);
      pts.push([r1(p.x), r1(p.z)]);
      // a: the up track's lateral offset (+ right of the drawn direction, Place's convention); b: today's track
      const u = upLat(L.f, s);
      a.push(u === null ? null : r1(u));
      b.push(0);
    }
    out.push({
      id: L.id,
      leg: L.id,
      line: L.id,
      status: 'live',
      colour: COLOURS[L.id]!,
      dash: '',
      pts,
      a,
      b,
      label: L.name,
    });
  }
  // v27 crossing: down at lat 0, up at -4 (ringAt's lat is east; the line heads north, so east is right: + right), on
  // to the proposed buffers 15 m past the halt.
  const pts: [number, number][] = [],
    a: (number | null)[] = [],
    b: (number | null)[] = [];
  for (let u = 0; u <= RING_END_U * 100; u += 1000) {
    const p = ringAt(Math.min(u, RING_END_U * 100));
    pts.push([r1(p.x / 100), r1(p.z / 100)]);
    a.push(-4);
    b.push(0);
  }
  const pe = ringAt(RING_END_U * 100);
  pts.push([r1(pe.x / 100), r1(pe.z / 100)]);
  a.push(-4);
  b.push(0);
  out.push({
    id: 'ring-v27',
    leg: 'ring-v27',
    line: 'line2',
    status: 'v27',
    colour: COLOURS.line2!,
    dash: DASH.v27,
    pts,
    a,
    b,
    label: `Line 2 to Ring Island (v27, R1; past the halt to u ${RING_END_U} as proposed)`,
  });
  for (const l of WORLD_LINES) {
    const st = l.id === 'ring' ? 'v27' : 'later';
    for (const g of l.legs) {
      const p = legPts(l, g.fromCm, g.toCm);
      out.push({
        id: `${l.id}-${g.id}`,
        leg: g.id,
        line: l.id,
        status: st,
        colour: COLOURS[l.id] ?? '#888',
        dash: l.id === 'ring' ? '2 6' : DASH.later,
        pts: p,
        a: p.map(() => -FORMATION.centresCm / 200),
        b: p.map(() => FORMATION.centresCm / 200),
        label:
          `${l.name}, leg ${g.id} (stage ${g.stage[0] ?? 'never'} Gorge first, ${g.stage[1] ?? 'never'} Canopy first)` +
          (REMOVED[g.id] ? `: removed, ${REMOVED[g.id]}` : ''),
      });
    }
  }
  return out;
}

type Mode = 'both' | 'before' | 'after';
function loopsAndCrossings() {
  const alt = ringAt(RING_ALT.u * 100, RING_ALT.lat * 100);
  const loops: { x: number; z: number; r: number; status: Status; label: string; mode: Mode; alt?: boolean }[] = [
    {
      x: RING_LOOP.x / 100,
      z: RING_LOOP.z / 100,
      r: RING_LOOP.r / 100,
      status: 'v27',
      mode: 'before',
      label: "Ring Island loop (v27, as R1 lays it out): its neck reverses 165° and can't be run as drawn",
    },
    {
      x: r1(alt.x / 100),
      z: r1(alt.z / 100),
      r: RING_ALT.r,
      status: 'v27',
      mode: 'after',
      alt: true,
      label: `The alternative, undrawn: a turning loop beyond the halt (centre u ${RING_ALT.u} lat +${RING_ALT.lat}, r ${RING_ALT.r}). A circle wholly east of both tracks can't take the up (west) track without crossing the down track: it needs a merge to one track first, or a teardrop about 80 m wide astride the line. It cuts up to 12 m into the cone, turns every train round, and is lifted when the line goes on. Not in the continuity report.`,
    },
  ];
  const cross: { x: number; z: number; dir: number; status: Status; label: string; mode: Mode }[] = [];
  for (const l of WORLD_LINES)
    for (const e of l.ends) {
      if (e.kind === 'loop')
        loops.push({
          x: e.x / 100,
          z: e.z / 100,
          r: FORMATION.loopCm / 100,
          status: 'later',
          mode: 'both',
          label: `${l.name}: turning loop`,
        });
    }
  const fh = beside(LINES.east, 501, 0),
    fh2 = beside(LINES.east, 503, 0);
  cross.push({
    x: r1(fh.x),
    z: r1(fh.z),
    dir: Math.atan2(fh2.x - fh.x, fh2.z - fh.z),
    status: 'v26',
    mode: 'both',
    label: "Far Head's crossover, s 490-512 (before Q6)",
  });
  const rx = ringAt(((RING_X[0] + RING_X[1]) / 2) * 100, -200);
  cross.push({
    x: r1(rx.x / 100),
    z: r1(rx.z / 100),
    dir: Math.atan2(0.0272, -1),
    status: 'v27',
    mode: 'after',
    label: `Ring Island: a facing crossover on the Way, u ${RING_X[0]}-${RING_X[1]} (proposed with the buffers; the R1 amendment places it), so up trains reach the east platform`,
  });
  // Stub turnouts
  const stubs = LIVE.flatMap((L) =>
    [L.f.from, L.f.to].map((s) => {
      const p = beside(L.line, s, 0);
      return { x: r1(p.x), z: r1(p.z), label: `${L.name}: stub turnout at s ${s} (the up track merges)` };
    }),
  );
  const planks = UP_HALTS.map((h) => {
    const p = beside(LINES.east, h.crossS, -2);
    return { x: r1(p.x), z: r1(p.z), label: `${h.name.split(',')[0]}: plank crossing at s ${h.crossS}` };
  });
  return { loops, cross, stubs, planks, crossoverZone: PLACE_FORMATION.quarry.crossover };
}

/** Layout B's station furniture, drawn at Home: the engine spur, the stall roads, the cart's leg, the concourse and
 * the island. World metres. */
function homeB() {
  const pl = (ps: { x: number; z: number }[]) => ps.map((p) => [W(p).x, W(p).z] as [number, number]);
  const stalls = STALLS.bearings.map((b) => {
    const f = stallFrame(b);
    return {
      open: b === STALLS.open,
      pts: pl([f.rim, f.back]),
      label: `Stall road at ${b}°${b === STALLS.open ? ' (the open stall)' : ' (a ruin outline)'}`,
    };
  });
  const box = (a0: number, a1: number, c0: number, c1: number) =>
    pl([axisPoint(a0, c0), axisPoint(a1, c0), axisPoint(a1, c1), axisPoint(a0, c1)]);
  const hall = box(HALL.a - HALL.d / 2, HALL.a + HALL.d / 2, HALL.c - HALL.w / 2, HALL.c + HALL.w / 2);
  const island = box(ISLAND_A.buffers, ISLAND_A.foot, ISLAND.edge, ROAD_GAP - ISLAND.edge);
  return {
    spur: pl(spurPoints()),
    leg: pl(legPoints()),
    stalls,
    hall,
    island,
    label: `Layout B (the owner's pick, 9 November; home-station.md): one terminus, both lines at buffer stops beside one island (deck line 1 s 2.8-20.8, line 2 s 5.7-23.7) and one concourse; the 9.6 m table on its own engine spur off road 2 at s ${SPUR.s}; line trains never turn on the table. The live game draws today's turntable terminus until the flip (step 6); ?home=b previews B.`,
  };
}

function land() {
  const html = fs.readFileSync(ROOT + 'docs/world/map-prototypes.html', 'utf8');
  const A = layout(parseMapPage(html), 'sickle', 'A');
  const polys = A.land
    .filter((g) => !g.horizon)
    .map((g) => ({
      id: g.id,
      chalk: g.module === 'chalk',
      pts: g.outline.map((p) => [r1(p[0] + ORIGIN.x), r1(p[1] + ORIGIN.z)]),
    }));
  const cones = RING_CONES.map(([dx, dz, r]) => ({ x: FAR.x + dx + ORIGIN.x, z: FAR.z + dz + ORIGIN.z, r: r * 0.62 }));
  const places = A.places
    .filter((p) => p.id !== 'camp')
    .map((p) => ({
      name: p.name,
      x: r1(p.at[0] + ORIGIN.x),
      z: r1(p.at[1] + ORIGIN.z),
      big: p.kind === 'main' || p.kind === 'branch' || p.kind === 'ending' || p.id === 'home',
    }));
  return { polys, cones, places, original: { x: ORIGIN.x - 1000, z: 0, r: 110 } };
}

// ---------------------------------------------------------------- the page
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
function marks(c: ReturnType<typeof checkContinuity>) {
  const pick = (xs: Finding[]) => xs.filter((x) => Number.isFinite(x.x) && (x.x !== 0 || x.z !== 0));
  const seen = new Set<string>();
  const all = [...pick(c.worstAsRun), ...pick(c.worstPlanned), ...pick(c.worstAll)].filter((x) => {
    const k = `${x.track}|${x.kind}|${Math.round(x.x)}|${Math.round(x.z)}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
  return all.map((x, i) => ({
    n: i + 1,
    x: r1(x.x),
    z: r1(x.z),
    status: x.status,
    text: `${x.track} [${x.status}] s ${Math.round(x.s)}: ${x.text}`,
  }));
}
function page() {
  const c = checkContinuity();
  const data = {
    land: land(),
    corridors: corridors(),
    ends: ends(),
    halts: [...liveHaltRows(), ...futureHaltRows()],
    loaders: loaders(),
    extra: loopsAndCrossings(),
    marks: marks(c),
    table: { x: TURNTABLE.x + ORIGIN.x, z: TURNTABLE.z + ORIGIN.z, r: TURNTABLE.r },
    keep: keepClear(),
    home: homeB(),
    services: SERVICES,
    removed: REMOVED,
  };
  const lines = lineRows();
  const E = data.ends;
  const count = (k: 'before' | 'after') =>
    Object.entries(E.reduce<Record<string, number>>((a, e) => ((a[e[k]] = (a[e[k]] ?? 0) + 1), a), {}))
      .map(([kind, n]) => `${n} ${kind}`)
      .join(', ');
  const lineTable = lines
    .map(
      (l) =>
        `<tr><td><span class="key" style="background:${l.colour}"></span>${esc(l.name)}</td><td>${esc(l.build)}</td><td>${(l.length / 1000).toFixed(2)} km</td><td>${l.halts.map(esc).join(' · ')}</td><td>${l.trip.t20} s / ${l.trip.t25} s stopping everywhere (${l.trip.saved} s saved); ${l.trip.direct} s saved non-stop${l.trip.short ? ' <span class="flag">under 10 s: no speed part offered here (seats, looks, a whistle)</span>' : ''}</td><td>${esc(l.trains)}</td><td>${esc(l.ends[0])}<br/><b>→</b> ${esc(l.after[0])}</td><td>${esc(l.ends[1])}<br/><b>→</b> ${esc(l.after[1])}</td></tr>`,
    )
    .join('\n');
  const haltTable = data.halts
    .map(
      (h) =>
        `<tr id="halt-${esc(h.name).replace(/\W+/g, '-')}"><td><b>${esc(h.name)}</b><br/><span class="muted">${esc(h.status)}</span></td><td>${h.lines.map(esc).join(', ')}</td><td>${esc(h.role)}</td><td>${esc(h.platforms)}</td><td>${esc(h.turns)}<br/><b>→</b> ${esc(h.turnsAfter)}</td><td>${esc(h.forWhat)}</td><td>${h.overhang.map(esc).join('<br/>')}${h.flags.length ? `<br/><span class="flag">${h.flags.map(esc).join('<br/>')}</span>` : ''}</td></tr>`,
    )
    .join('\n');
  const endTable = E.map(
    (e) =>
      `<tr><td>${esc(e.where)}</td><td>${esc(e.status)}</td><td><span class="sym ${e.before}"></span>${esc(e.before)}: ${esc(e.beforeText)}</td><td class="c-${e.complies}">${e.complies}</td><td><span class="sym ${e.after}"></span>${esc(e.after)}: ${esc(e.afterText)}</td><td>${esc(e.cost)}</td></tr>`,
  ).join('\n');
  const serviceList = (o: Order) =>
    SERVICES[o]
      .map(
        (v) => `<li><span class="key" style="background:${v.colour}"></span><b>${esc(v.name)}</b>: ${esc(v.text)}</li>`,
      )
      .join('\n');
  const markList = data.marks.map((m) => `<li value="${m.n}">${esc(m.text)}</li>`).join('\n');
  const loaderList = data.loaders.map((l) => `<li><b>${esc(l.name)}</b>: ${esc(l.text)}</li>`).join('\n');
  return `<title>Boogle Rail Map</title>
<!-- GENERATED by dev/level/rail-map.ts (node --import ./dev/sim/hooks.ts dev/level/rail-map.ts): rerun it, don't edit by hand. -->
<style>
:root { color-scheme: light; --bg: #f4f2e9; --panel: #fffdf5; --ink: #233d3c; --muted: #5d716f; --border: #c4cdc3;
  --sea: #dcebe9; --land: #d7dfc3; --chalk: #ece9df; --edge: #8fa59c; --halt: #fffdf5; --flag: #b3261e; --mark: #c2410c;
  --good: #2f7d4a; --warn: #a15c00; --accent: #2f5f9e; }
@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) { color-scheme: dark; --bg: #132322; --panel: #1b2e2c;
  --ink: #eef2e2; --muted: #a9bdb4; --border: #3f5951; --sea: #173638; --land: #3b523b; --chalk: #7d7b71; --edge: #5f7a70;
  --halt: #22201b; --flag: #ff8a80; --mark: #fdba74; --good: #86d39b; --warn: #f5c26b; --accent: #8fb8ff; } }
:root[data-theme="dark"] { color-scheme: dark; --bg: #132322; --panel: #1b2e2c; --ink: #eef2e2; --muted: #a9bdb4;
  --border: #3f5951; --sea: #173638; --land: #3b523b; --chalk: #7d7b71; --edge: #5f7a70; --halt: #22201b; --flag: #ff8a80;
  --mark: #fdba74; --good: #86d39b; --warn: #f5c26b; --accent: #8fb8ff; }
* { box-sizing: border-box; }
html, body { margin: 0; background: var(--bg); color: var(--ink); }
body { font: 14px/1.5 system-ui, sans-serif; padding: 20px max(16px, env(safe-area-inset-right, 0px)) 32px max(16px, env(safe-area-inset-left, 0px)); overflow-x: hidden; }
main { max-width: 1280px; margin: auto; min-width: 0; }
h1 { font: 700 26px/1.2 Georgia, serif; margin: 0 0 6px; }
h2 { font: 700 19px/1.3 Georgia, serif; margin: 28px 0 8px; }
p, li { max-width: 82ch; }
.muted { color: var(--muted); }
.flag { color: var(--flag); }
.bar { display: flex; flex-wrap: wrap; gap: 6px; margin: 10px 0 8px; align-items: center; }
button { font: inherit; font-size: 13px; padding: 5px 10px; border-radius: 6px; border: 1px solid var(--border); background: var(--panel); color: var(--ink); cursor: pointer; }
button[aria-pressed="true"] { background: var(--ink); color: var(--bg); }
.mapbox { position: relative; background: var(--sea); border: 1px solid var(--border); border-radius: 10px; overflow: hidden; height: min(78vh, 760px); touch-action: none; }
.mapbox svg { width: 100%; height: 100%; display: block; cursor: grab; user-select: none; }
.tip { position: absolute; left: 8px; bottom: 8px; right: 8px; max-height: 45%; overflow: auto; background: var(--panel); border: 1px solid var(--border); border-radius: 8px; padding: 8px 10px; font-size: 13px; display: none; }
.tip.on { display: block; }
.tip b { font-size: 14px; }
.legend { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(100%, 240px), 1fr)); gap: 4px 16px; margin: 10px 2px; font-size: 13px; }
.legend svg { vertical-align: middle; margin-right: 6px; }
.key { display: inline-block; width: 18px; height: 6px; border-radius: 3px; vertical-align: middle; margin-right: 6px; }
.table { overflow-x: auto; -webkit-overflow-scrolling: touch; }
table { border-collapse: collapse; width: 100%; background: var(--panel); font-size: 13px; }
th, td { text-align: left; padding: 6px 8px; border-bottom: 1px solid var(--border); vertical-align: top; }
th { font-weight: 650; position: sticky; top: 0; background: var(--panel); }
td { min-width: 110px; }
.c-yes { color: var(--good); font-weight: 600; } .c-no { color: var(--flag); font-weight: 600; } .c-partly { color: var(--warn); font-weight: 600; }
.sym { display: inline-block; width: 10px; height: 10px; margin-right: 5px; border: 2px solid var(--ink); vertical-align: -1px; }
.sym.loop { border-radius: 50%; } .sym.crossover { transform: rotate(45deg); border-style: dotted; } .sym.through { border-radius: 50%; background: var(--ink); }
.sym.buffers, .sym.terminal { border-width: 0 0 0 5px; } .sym.temporary { border-style: dashed; border-width: 0 0 0 5px; } .sym.stub { border-color: var(--flag); }
.stats { display: flex; flex-wrap: wrap; gap: 8px; margin: 12px 0; }
.stat { background: var(--panel); border: 1px solid var(--border); border-radius: 8px; padding: 6px 12px; }
.stat b { display: block; font-size: 18px; }
svg text { font-family: system-ui, sans-serif; paint-order: stroke; stroke: var(--panel); stroke-linejoin: round; fill: var(--ink); }
</style>
<main>
<h1>Boogle rail map</h1>
<p class="muted">The whole network at true plan position, from the data the game and the blockout read (generated by
<code>dev/level/rail-map.ts</code>). World metres, north up. Every corridor is double track on 4 m centres, left-hand
running (the up track, away from Home, on the left); at this scale the two tracks are spread apart so both stay
visible, and come back to their true 4 m when you zoom in. Plan: <code>docs/plans/rail-map.md</code>.</p>
<p class="muted"><b>Home is drawn as layout B</b>, the owner's pick (9 November): one terminus, both lines at buffer stops beside one island, the table on its own engine spur. The live game still draws today's turntable terminus until home-station's flip; <code>?home=b</code> previews B.</p>
<div class="stats">
  <div class="stat"><b>${lines.length}</b>services (2 live, 1 v27, ${lines.length - 3} tentative)</div>
  <div class="stat"><b>${E.length}</b>track ends, today and planned</div>
  <div class="stat"><b>${data.halts.length}</b>halts</div>
  <div class="stat"><b>${c.failures}</b>gross continuity errors on run track</div>
</div>
<div class="bar" role="group" aria-label="View">
  <button data-go="all" aria-pressed="true">Whole network</button>
  <button data-go="home">Home</button>
  <button data-go="pier">Far Head and pier</button>
  <button data-go="ring">Ring Island</button>
  <button data-go="bell">Bell Rock</button>
  <button data-go="canopy">Canopy Town</button>
  <button data-go="gorge">High Gorge</button>
  <button data-go="port">Port Quay</button>
  <button data-zoom="1.6">+</button><button data-zoom="0.625">−</button>
</div>
<div class="bar" role="group" aria-label="Layers">
  <button data-ends="before" aria-pressed="true">Ends as planned</button>
  <button data-ends="after" aria-pressed="false">Ends as proposed</button>
  <button data-layer="marks" aria-pressed="true">Continuity marks</button>
  <button data-layer="loaders" aria-pressed="true">Cargo loaders</button>
</div>
<div class="bar" role="group" aria-label="Colour">
  <button data-colour="lines" aria-pressed="true">Catalog lines</button>
  <button data-colour="gorge" aria-pressed="false">Services, Gorge first</button>
  <button data-colour="canopy" aria-pressed="false">Services, Canopy first</button>
</div>
<div class="mapbox" id="mapbox"><svg id="map" role="img" aria-label="Rail map of the whole Boogle network"></svg><div class="tip" id="tip" role="status"></div></div>
<div class="legend">
  <span><svg width="34" height="12"><line x1="0" y1="3" x2="34" y2="3" stroke="var(--ink)" stroke-width="2"/><line x1="0" y1="9" x2="34" y2="9" stroke="var(--ink)" stroke-width="2"/></svg>Live: trains run today (solid; up track drawn, runs from v26)</span>
  <span><svg width="34" height="12"><line x1="0" y1="3" x2="34" y2="3" stroke="var(--ink)" stroke-width="2" stroke-dasharray="10 5"/><line x1="0" y1="9" x2="34" y2="9" stroke="var(--ink)" stroke-width="2" stroke-dasharray="10 5"/></svg>v27: Ring Island build 1 (planned data)</span>
  <span><svg width="34" height="12"><line x1="0" y1="3" x2="34" y2="3" stroke="var(--ink)" stroke-width="2" stroke-dasharray="4 4"/><line x1="0" y1="9" x2="34" y2="9" stroke="var(--ink)" stroke-width="2" stroke-dasharray="4 4"/></svg>Later: tentative lines (map stage in the table)</span>
  <span><svg width="34" height="12"><path d="M4 6h20M18 2l6 4-6 4" fill="none" stroke="var(--ink)" stroke-width="2"/></svg>Direction of running on each track</span>
  <span><svg width="20" height="14"><circle cx="10" cy="7" r="6" fill="none" stroke="var(--ink)" stroke-width="2"/></svg>Turning loop (r 40 m)</span>
  <span><svg width="20" height="14"><path d="M3 2l14 10M3 12l14-10" stroke="var(--ink)" stroke-width="2"/></svg>Crossover (scissors)</span>
  <span><svg width="20" height="14"><path d="M4 7h8M12 2v10" stroke="var(--flag)" stroke-width="2"/></svg>Bare stub end (no buffers)</span>
  <span><svg width="20" height="14"><path d="M4 7h8M12 1v12M15 1v12" stroke="var(--ink)" stroke-width="2"/></svg>Terminal with buffer stops</span>
  <span><svg width="20" height="14"><path d="M4 7h8M12 1v12" stroke="var(--ink)" stroke-width="2" stroke-dasharray="2 2"/></svg>Temporary end (buffers until the line runs on)</span>
  <span><svg width="20" height="14"><circle cx="10" cy="7" r="4" fill="var(--ink)"/></svg>Through connection (the end is joined to the next line)</span>
  <span><svg width="20" height="14"><path d="M2 7h16M10 7l6-5" stroke="var(--ink)" stroke-width="2" fill="none"/></svg>Stub turnout (two tracks to one)</span>
  <span><svg width="20" height="14"><rect x="2" y="3" width="16" height="8" fill="var(--halt)" stroke="var(--ink)"/></svg>Platform, one per track (tap a halt)</span>
  <span><svg width="20" height="14"><circle cx="10" cy="7" r="6" fill="var(--mark)"/></svg>Continuity mark (numbered below)</span>
  <span><svg width="20" height="14"><rect x="4" y="2" width="10" height="10" fill="none" stroke="var(--good)" stroke-width="2"/></svg>Cargo loader (where it would stand)</span>
  <span><svg width="20" height="14"><path d="M10 2v6l5 4z" fill="var(--mark)" fill-opacity="0.15" stroke="var(--mark)" stroke-dasharray="3 2"/></svg>Keep clear: the grown Roundhouse, a sector south of layout B's table (tap it)</span>
  <span><svg width="20" height="14"><rect x="2" y="4" width="16" height="6" fill="var(--chalk)" stroke="var(--ink)"/></svg>Home, layout B: the island, the concourse, the spur and stall roads (tap)</span>
  <span><svg width="20" height="14"><circle cx="10" cy="7" r="6" fill="none" stroke="var(--muted)" stroke-dasharray="1.5 3"/></svg>Undrawn alternative (Ring Island's loop, as proposed only)</span>
</div>

<h2>Lines</h2>
<p class="muted">Length along the drawn centreline. Trains: the plans' counts; for tentative lines an estimate from generic-lines' wait bound (no wait for a train your way over about a minute: round trip × 1.26 / 60 s). Each end as planned, then <b>→</b> as proposed. End to end: every halt a stop, 5 s dwell, 3.5 m/s² at both speeds (the engine-garage brief's comparison: engines and cars are bought per line). A line is flagged when the longer boiler saves under ${SHORT_SAVED} s end to end non-stop (trains stop on request); one non-stop leg needs about ${MIN_UPGRADE_LINE_M} m for that.</p>
<div class="table"><table><thead><tr><th>Line</th><th>Build</th><th>Length</th><th>Halts</th><th>End to end, 20 / 25 m/s</th><th>Trains</th><th>Start end</th><th>Far end</th></tr></thead><tbody>
${lineTable}
</tbody></table></div>

<h2>Halts</h2>
<p class="muted">Platform lengths, stopping marks, and how far a long train (engine, the passenger car and three cargo cars; ${CONSIST.engineLength} m engine today, the longer boiler taken as ${CONSIST.bigLength} m) overhangs each end when its passenger car stands on the platform (owner, 10 November: cars may be longer than the platform; only the passenger part has to align). Today every engine stands at the +s end (push-pull).</p>
<div class="table"><table><thead><tr><th>Halt</th><th>Lines</th><th>Role</th><th>Platforms</th><th>Turns back (→ proposed)</th><th>The player comes for</th><th>Stops and overhang</th></tr></thead><tbody>
${haltTable}
</tbody></table></div>

<h2>Every track end</h2>
<p class="muted">The owner's rule (10 November): a track that ends has buffers and is marked a terminal; otherwise it runs through or loops. Before: ${count('before')}. After: ${count('after')}.</p>
<div class="table"><table><thead><tr><th>Where</th><th>Build</th><th>Today / as planned</th><th>Complies</th><th>Proposed</th><th>Cost</th></tr></thead><tbody>
${endTable}
</tbody></table></div>

<h2>Continuity marks</h2>
<p class="muted">From level-check's "Track continuity" report, the worst places on track a train is drawn on, then planned (v27), then the whole network. Regenerate after any layout change.</p>
<ol>
${markList}
</ol>

<h2>Services, for both branch orders</h2>
<p class="muted">The proposals' services (the ring as one line, each line's ends as proposed), drawn on the map with the "Services" buttons. Grey legs aren't built in that order or were removed by a ruling: ${Object.entries(
    REMOVED,
  )
    .map(([k, v]) => `${esc(k)}, ${esc(v)}`)
    .join(
      '; ',
    )}. The blockout catalog (<code>src/sim/railway-world-lines.ts</code>) was regenerated for the greybox route's step 1: it has no lift leg and no Ring top halt, and its line 2 extension ends at the Ring Island halt (R1's data supersedes that draft).</p>
<h3>High Gorge first</h3>
<ul>
${serviceList('gorge')}
</ul>
<h3>Canopy Town first</h3>
<ul>
${serviceList('canopy')}
</ul>

<h2>Keep clear at Home: the grown Roundhouse</h2>
<p class="muted">The table grows from 9.6 m to about 16 m, with 16 m stalls, as an upgrade (the engine-garage brief), and only ever on layout B. Kept clear: a sector from ${data.keep.from}° to ${data.keep.to}° (clockwise from north), r ${data.keep.r} m, south of B's table on its spur, plus the grown table (r ${data.keep.table} m); nothing in town moves. The engine-garage brief's "30 m on the stall side" and this become one footprint. Within ${data.keep.r} m of the table:</p>
<ul>
${data.keep.items.map((i) => `<li>${esc(i).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>')}</li>`).join('\n')}
</ul>

<h2>Cargo loaders</h2>
<p class="muted">${esc(LOADER_NOTE)}</p>
<ul>
${loaderList}
</ul>
</main>
<script>
const D = ${JSON.stringify(data)};
const COL = ${JSON.stringify(COLOURS)};
${CLIENT}
</script>
`;
}

/** The page's script: pan, zoom, layers, and the SVG drawn from D. */
const CLIENT = String.raw`
const svg = document.getElementById('map'), box = document.getElementById('mapbox'), tip = document.getElementById('tip');
const NS = 'http://www.w3.org/2000/svg';
const VIEWS = { all: [-1750, -2350, 3500, 3700], home: [878, -32, 116, 84], pier: [1320, -440, 160, 120], ring: [1372, -938, 146, 190], bell: [-200, -1100, 400, 420], canopy: [-1300, -520, 420, 420], gorge: [-260, -2120, 420, 380], port: [-160, 780, 600, 500] };
let view = VIEWS.all.slice(), endsMode = 'before', colourMode = 'lines';
const SVC = {};
for (const o in D.services) { SVC[o] = {}; for (const v of D.services[o]) for (const l of v.legs) SVC[o][l] = v; }
const modeOn = (m) => m === 'both' || m === endsMode;
const layers = { marks: true, loaders: true };
function fit() {
  const r = box.getBoundingClientRect(), aspect = r.width / Math.max(1, r.height);
  return aspect;
}
function setView(v) {
  const aspect = fit();
  let [x, y, w, h] = v;
  if (w / h < aspect) { const nw = h * aspect; x -= (nw - w) / 2; w = nw; } else { const nh = w / aspect; y -= (nh - h) / 2; h = nh; }
  view = [x, y, w, h];
  draw();
}
const el = (tag, attrs, parent) => { const e = document.createElementNS(NS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); (parent || svg).appendChild(e); return e; };
function offsetLine(pts, lats, k) {
  const out = [];
  for (let i = 0; i < pts.length; i++) {
    if (lats[i] === null) { out.push(null); continue; }
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)];
    let dx = b[0] - a[0], dz = b[1] - a[1]; const n = Math.hypot(dx, dz) || 1; dx /= n; dz /= n;
    // + right of the direction of travel (x east, z south): right is (-dz, dx)
    const l = lats[i] * k;
    out.push([pts[i][0] - dz * l, pts[i][1] + dx * l]);
  }
  return out;
}
function runs(pts) { const r = []; let cur = []; for (const p of pts) { if (p) cur.push(p); else if (cur.length) { r.push(cur); cur = []; } } if (cur.length) r.push(cur); return r; }
function show(html) { tip.innerHTML = html; tip.classList.add('on'); }
function draw() {
  svg.setAttribute('viewBox', view.join(' '));
  svg.textContent = '';
  const px = view[2] / Math.max(1, box.getBoundingClientRect().width); // world m per screen px
  const k = Math.max(1, (7 * px) / 4); // spread so 4 m centres are at least 7 px apart
  el('rect', { x: view[0], y: view[1], width: view[2], height: view[3], fill: 'var(--sea)' });
  for (const g of D.land.polys) el('polygon', { points: g.pts.map((p) => p.join(',')).join(' '), fill: g.chalk ? 'var(--chalk)' : 'var(--land)', stroke: 'var(--edge)', 'stroke-width': 1.2 * px });
  for (const c of D.land.cones) el('circle', { cx: c.x, cy: c.z, r: c.r, fill: 'var(--land)', 'fill-opacity': 0.7, stroke: 'var(--edge)', 'stroke-width': px });
  el('circle', { cx: D.land.original.x, cy: D.land.original.z, r: D.land.original.r, fill: 'var(--land)', stroke: 'var(--edge)', 'stroke-width': px });
  el('circle', { cx: D.table.x, cy: D.table.z, r: Math.max(D.table.r, 3 * px), fill: 'none', stroke: 'var(--ink)', 'stroke-width': 1.5 * px });
  const K = D.keep, bp = (b, r) => [K.x + r * Math.sin(b * Math.PI / 180), K.z - r * Math.cos(b * Math.PI / 180)];
  const k0 = bp(K.from, K.r), k1 = bp(K.to, K.r);
  el('path', { d: 'M' + K.x + ',' + K.z + 'L' + k0.join(',') + 'A' + K.r + ',' + K.r + ' 0 0 1 ' + k1.join(',') + 'Z', fill: 'var(--mark)', 'fill-opacity': 0.1, stroke: 'var(--mark)', 'stroke-width': 1.4 * px, 'stroke-dasharray': 5 * px + ' ' + 3 * px }).addEventListener('click', () => show('<b>Keep clear: the grown Roundhouse</b> (layout B: a sector ' + K.from + '°-' + K.to + '° to r ' + K.r + ' m south of the spur table, and the grown 16 m table)<br>' + K.items.map((i) => i.replace(/\*\*(.+?)\*\*/g, '<b>$1</b>')).join('<br>')));
  // Layout B's station: the island, the concourse, the engine spur, the stall roads and the cart's leg
  const H = D.home, poly = (pts) => pts.map((p) => p.join(',')).join(' ');
  const hb = el('g', {});
  el('polygon', { points: poly(H.island), fill: 'var(--halt)', stroke: 'var(--ink)', 'stroke-width': px }, hb);
  el('polygon', { points: poly(H.hall), fill: 'var(--chalk)', stroke: 'var(--ink)', 'stroke-width': px }, hb);
  el('polyline', { points: poly(H.spur), fill: 'none', stroke: COL.line2, 'stroke-width': 2 * px }, hb);
  el('polyline', { points: poly(H.leg), fill: 'none', stroke: 'var(--muted)', 'stroke-width': 1.4 * px, 'stroke-dasharray': 3 * px + ' ' + 2 * px }, hb);
  for (const t of H.stalls) el('polyline', { points: poly(t.pts), fill: 'none', stroke: t.open ? COL.line2 : 'var(--muted)', 'stroke-width': (t.open ? 2 : 1.2) * px, 'stroke-dasharray': t.open ? '' : 2 * px + ' ' + 2 * px }, hb);
  hb.addEventListener('click', () => show('<b>Home, layout B</b><br>' + H.label));
  el('circle', { cx: D.keep.x, cy: D.keep.z, r: D.keep.table, fill: 'none', stroke: 'var(--mark)', 'stroke-width': px, 'stroke-dasharray': 2 * px + ' ' + 2 * px });
  const W = 2.2 * px;
  for (const c of D.corridors) {
    const svc = colourMode === 'lines' ? null : SVC[colourMode][c.leg];
    const colour = colourMode === 'lines' ? c.colour : svc ? svc.colour : 'var(--edge)';
    const faint = (colourMode !== 'lines' && !svc) || !!D.removed[c.leg];
    for (const [lats, dirSign] of [[c.a, 1], [c.b, -1]]) {
      const line = offsetLine(c.pts, lats, k);
      for (const run of runs(line)) {
        const p = el('polyline', { points: run.map((q) => q.join(',')).join(' '), fill: 'none', stroke: colour, 'stroke-opacity': faint ? 0.55 : 1, 'stroke-width': faint ? W * 0.6 : W, 'stroke-linejoin': 'round', 'stroke-dasharray': c.dash ? c.dash.split(' ').map((v) => v * px).join(' ') : '' });
        p.addEventListener('click', () => show('<b>' + c.label + '</b><br>' + (dirSign > 0 ? 'Up track (+s, away from Home)' : 'Down track (towards Home)') + ' · ' + c.status + (colourMode === 'lines' ? '' : '<br><b>Service (' + (colourMode === 'gorge' ? 'Gorge first' : 'Canopy first') + '):</b> ' + (svc ? svc.name + ': ' + svc.text : D.removed[c.leg] ? 'removed: ' + D.removed[c.leg] : 'not built in this order'))));
        // direction arrows every ~90 px
        let acc = 0;
        for (let i = 1; i < run.length; i++) {
          const a = run[i - 1], b = run[i], seg = Math.hypot(b[0] - a[0], b[1] - a[1]);
          acc += seg;
          if (acc < 90 * px || seg < 1e-6) continue;
          acc = 0;
          let ux = (b[0] - a[0]) / seg, uz = (b[1] - a[1]) / seg;
          if (dirSign < 0) { ux = -ux; uz = -uz; }
          const s = 4 * px, mx = (a[0] + b[0]) / 2, mz = (a[1] + b[1]) / 2;
          if (!faint) el('path', { d: 'M' + (mx - ux * s - uz * s) + ',' + (mz - uz * s + ux * s) + 'L' + (mx + ux * s) + ',' + (mz + uz * s) + 'L' + (mx - ux * s + uz * s) + ',' + (mz - uz * s - ux * s), fill: 'none', stroke: colour, 'stroke-width': 1.4 * px });
        }
      }
    }
    // single (bidirectional) stretches of live lines: where the up track is absent, today's track carries both ways
  }
  for (const L of D.extra.loops) {
    if (!modeOn(L.mode)) continue;
    const g = el('g', {});
    el('circle', { cx: L.x, cy: L.z, r: Math.max(L.r, 5 * px), fill: 'none', stroke: L.alt ? 'var(--muted)' : 'var(--ink)', 'stroke-opacity': L.alt ? 0.8 : 1, 'stroke-width': (L.alt ? 1.2 : 1.6) * px, 'stroke-dasharray': L.alt ? 1.5 * px + ' ' + 3 * px : L.status === 'later' ? 4 * px + ' ' + 3 * px : '' }, g);
    if (L.alt) { const t = el('text', { x: L.x, y: L.z + 4 * px, 'font-size': 10 * px, 'text-anchor': 'middle', 'stroke-width': 3 * px, fill: 'var(--muted)', 'font-style': 'italic' }, g); t.textContent = 'loop: undrawn alternative'; }
    g.addEventListener('click', () => show('<b>' + L.label + '</b>'));
  }
  for (const s of D.extra.stubs) { const g = el('g', {}); el('path', { d: 'M' + (s.x - 5 * px) + ',' + s.z + 'h' + 10 * px + 'M' + s.x + ',' + s.z + 'l' + 5 * px + ',' + (-4 * px), stroke: 'var(--ink)', 'stroke-width': 1.4 * px, fill: 'none' }, g); g.addEventListener('click', () => show('<b>' + s.label + '</b>')); }
  for (const s of D.extra.planks) el('rect', { x: s.x - 2 * px, y: s.z - 2 * px, width: 4 * px, height: 4 * px, fill: '#a0703a' }).addEventListener('click', () => show('<b>' + s.label + '</b>'));
  for (const c of D.extra.cross) if (modeOn(c.mode)) el('path', { d: 'M' + (c.x - 5 * px) + ',' + (c.z - 5 * px) + 'l' + 10 * px + ',' + 10 * px + 'M' + (c.x - 5 * px) + ',' + (c.z + 5 * px) + 'l' + 10 * px + ',' + (-10 * px), stroke: 'var(--ink)', 'stroke-width': 1.6 * px }).addEventListener('click', () => show('<b>' + c.label + '</b>'));
  for (const e of D.ends) {
    const kind = endsMode === 'before' ? e.before : e.after;
    const g = el('g', { transform: 'translate(' + e.x + ',' + e.z + ') rotate(' + (-e.dir * 180 / Math.PI + 90) + ')' });
    const s = 6 * px, st = 'var(--ink)';
    if (kind === 'crossover') el('path', { d: 'M' + -s + ',' + -s + 'L' + s + ',' + s + 'M' + -s + ',' + s + 'L' + s + ',' + -s, stroke: st, 'stroke-width': 1.8 * px }, g);
    else if (kind === 'loop') el('circle', { r: s, fill: 'none', stroke: st, 'stroke-width': 1.8 * px }, g);
    else if (kind === 'through') el('circle', { r: s * 0.7, fill: st }, g);
    else if (kind === 'stub') el('path', { d: 'M0,' + -s + 'V' + s, stroke: 'var(--flag)', 'stroke-width': 2.2 * px }, g);
    else el('path', { d: 'M0,' + -s + 'V' + s + 'M' + 2.5 * px + ',' + -s + 'V' + s, stroke: st, 'stroke-width': 2 * px, 'stroke-dasharray': kind === 'temporary' ? 2 * px + ' ' + 1.5 * px : '' }, g);
    el('circle', { r: 9 * px, fill: 'transparent' }, g);
    g.addEventListener('click', () => show('<b>' + e.where + '</b> (' + e.status + ')<br><b>As planned:</b> ' + e.before + ': ' + e.beforeText + '<br><b>Complies:</b> ' + e.complies + '<br><b>Proposed:</b> ' + e.after + ': ' + e.afterText + '<br><b>Cost:</b> ' + e.cost));
  }
  for (const h of D.halts) {
    const g = el('g', { class: 'halt' });
    for (const q of h.plats) {
      const line = offsetLine(q.pts, q.pts.map(() => q.lat), k).filter(Boolean);
      const pts = line.map((v) => v.join(',')).join(' ');
      el('polyline', { points: pts, fill: 'none', stroke: 'var(--ink)', 'stroke-width': Math.max(3.1, 4.6 * px), 'stroke-linecap': 'butt' }, g);
      el('polyline', { points: pts, fill: 'none', stroke: 'var(--halt)', 'stroke-width': Math.max(2.5, 3 * px), 'stroke-linecap': 'butt' }, g);
    }
    const t = el('text', { x: h.x + 8 * px, y: h.z - 6 * px, 'font-size': 12 * px, 'stroke-width': 3 * px, 'font-weight': 600 }, g);
    t.textContent = h.name;
    el('circle', { cx: h.x, cy: h.z, r: 10 * px, fill: 'transparent' }, g);
    g.addEventListener('click', () => show('<b>' + h.name + '</b> · ' + h.lines.join(', ') + ' · ' + h.status + '<br><b>Role:</b> ' + h.role + '<br><b>Platforms:</b> ' + h.platforms + '<br><b>Stops:</b> ' + h.stops + '<br><b>Turns back:</b> ' + h.turns + ' → ' + h.turnsAfter + '<br><b>Comes for:</b> ' + h.forWhat + '<br>' + h.overhang.join('<br>') + (h.flags.length ? '<br><span class="flag">' + h.flags.join('<br>') + '</span>' : '')));
  }
  if (layers.loaders) for (const l of D.loaders) el('rect', { x: l.x - 3 * px, y: l.z - 3 * px, width: 6 * px, height: 6 * px, fill: 'none', stroke: 'var(--good)', 'stroke-width': 1.6 * px }).addEventListener('click', () => show('<b>' + l.name + '</b><br>' + l.text));
  if (layers.marks) for (const m of D.marks) {
    const g = el('g', {});
    el('circle', { cx: m.x, cy: m.z, r: 7 * px, fill: 'var(--mark)', 'fill-opacity': 0.9 }, g);
    const t = el('text', { x: m.x, y: m.z + 3.5 * px, 'font-size': 9 * px, 'text-anchor': 'middle', 'stroke-width': 0, fill: '#fff', 'font-weight': 700 }, g);
    t.textContent = m.n;
    g.addEventListener('click', () => show('<b>Continuity mark ' + m.n + '</b><br>' + m.text));
  }
  for (const p of D.land.places) if (p.big || px < 1.2) { const t = el('text', { x: p.x + 10 * px, y: p.z + 16 * px, 'font-size': (p.big ? 14 : 11) * px, 'stroke-width': 3 * px, fill: 'var(--muted)', 'font-style': 'italic' }); t.textContent = p.name; }
  const bar = el('g', {}); const want = view[2] / 5, e10 = Math.pow(10, Math.floor(Math.log10(want))); const L = [1, 2, 5, 10].map((f) => f * e10).filter((v) => v <= want).pop(); el('line', { x1: view[0] + 12 * px, y1: view[1] + view[3] - 14 * px, x2: view[0] + 12 * px + L, y2: view[1] + view[3] - 14 * px, stroke: 'var(--ink)', 'stroke-width': 2 * px }, bar); const bt = el('text', { x: view[0] + 12 * px, y: view[1] + view[3] - 20 * px, 'font-size': 11 * px, 'stroke-width': 3 * px }, bar); bt.textContent = L >= 1000 ? L / 1000 + ' km' : L + ' m';
}
// pan and zoom: drag, wheel, pinch
const ptrs = new Map(); let last = null;
const toWorld = (cx, cy) => { const r = box.getBoundingClientRect(); return [view[0] + ((cx - r.left) / r.width) * view[2], view[1] + ((cy - r.top) / r.height) * view[3]]; };
function zoomAt(f, cx, cy) { const [wx, wz] = toWorld(cx, cy); const nw = Math.min(6000, Math.max(30, view[2] / f)); const s = nw / view[2]; view = [wx - (wx - view[0]) * s, wz - (wz - view[1]) * s, nw, view[3] * s]; draw(); }
svg.addEventListener('wheel', (e) => { e.preventDefault(); zoomAt(e.deltaY < 0 ? 1.25 : 0.8, e.clientX, e.clientY); }, { passive: false });
svg.addEventListener('pointerdown', (e) => { ptrs.set(e.pointerId, [e.clientX, e.clientY]); last = null; });
window.addEventListener('pointerup', (e) => { ptrs.delete(e.pointerId); last = null; });
window.addEventListener('pointercancel', (e) => { ptrs.delete(e.pointerId); last = null; });
svg.addEventListener('pointermove', (e) => {
  if (!ptrs.has(e.pointerId)) return;
  const prev = ptrs.get(e.pointerId); ptrs.set(e.pointerId, [e.clientX, e.clientY]);
  const r = box.getBoundingClientRect();
  if (ptrs.size === 1) { const dx = e.clientX - prev[0], dy = e.clientY - prev[1]; if (Math.abs(dx) + Math.abs(dy) < 1) return; view[0] -= (dx / r.width) * view[2]; view[1] -= (dy / r.height) * view[3]; draw(); }
  else if (ptrs.size === 2) { const [a, b] = [...ptrs.values()]; const d = Math.hypot(a[0] - b[0], a[1] - b[1]); if (last) zoomAt(d / last, (a[0] + b[0]) / 2, (a[1] + b[1]) / 2); last = d; }
});
document.querySelectorAll('[data-go]').forEach((b) => b.addEventListener('click', () => { document.querySelectorAll('[data-go]').forEach((x) => x.setAttribute('aria-pressed', String(x === b))); setView(VIEWS[b.dataset.go]); }));
document.querySelectorAll('[data-zoom]').forEach((b) => b.addEventListener('click', () => { const r = box.getBoundingClientRect(); zoomAt(Number(b.dataset.zoom), r.left + r.width / 2, r.top + r.height / 2); }));
document.querySelectorAll('[data-ends]').forEach((b) => b.addEventListener('click', () => { endsMode = b.dataset.ends; document.querySelectorAll('[data-ends]').forEach((x) => x.setAttribute('aria-pressed', String(x === b))); draw(); }));
document.querySelectorAll('[data-colour]').forEach((b) => b.addEventListener('click', () => { colourMode = b.dataset.colour; document.querySelectorAll('[data-colour]').forEach((x) => x.setAttribute('aria-pressed', String(x === b))); draw(); }));
document.querySelectorAll('[data-layer]').forEach((b) => b.addEventListener('click', () => { const k = b.dataset.layer; layers[k] = !layers[k]; b.setAttribute('aria-pressed', String(layers[k])); draw(); }));
tip.addEventListener('click', () => tip.classList.remove('on'));
new ResizeObserver(() => setView(view)).observe(box);
setView(VIEWS.all);
`;

// ---------------------------------------------------------------- numbers for the plan
function numbers() {
  const c = checkContinuity();
  const E = ends();
  const tally = (k: 'before' | 'after') =>
    E.reduce<Record<string, number>>((a, e) => ((a[e[k]] = (a[e[k]] ?? 0) + 1), a), {});
  console.log('ends before', tally('before'), 'after', tally('after'), 'total', E.length);
  for (const h of liveHaltRows()) console.log(h.name, '|', h.overhang.join(' || '), '|', h.flags.join(' || '));
  for (const l of loaders()) console.log('loader', l.name, l.text);
  for (const l of lineRows()) console.log('line', l.id, (l.length / 1000).toFixed(2), l.trains, l.build);
  // Hub turn angles: the arrival and departure headings of each proposed through join, and the arc at r 40 / 60.
  const H = (l: string, from: 'start' | 'end') => {
    const p = WORLD_LINES.find((x) => x.id === l)!.pts;
    const [a, b] = from === 'end' ? [p.at(-2)!, p.at(-1)!] : [p[1]!, p[0]!];
    return Math.atan2(b[0] - a[0], b[1] - a[1]); // heading arriving at the hub
  };
  const turn = (name: string, arrive: number, leaveReverse: number) => {
    const leave = leaveReverse + Math.PI;
    const d = Math.abs(Math.atan2(Math.sin(leave - arrive), Math.cos(leave - arrive)));
    console.log(
      'hub',
      name,
      `${((d * 180) / Math.PI).toFixed(0)}°`,
      `arc ${(d * 40).toFixed(0)} m at r 40, ${(d * 60).toFixed(0)} m at r 60`,
    );
  };
  // line 2's ledge arrives at the Gorge end-on; the cave row's White Wall arrives beside it
  turn('High Gorge: line 2 beside the cave row', H('ring', 'end'), H('cave', 'end'));
  // Ring Island loop: ground under a redrawn balloon beyond the halt's north end.
  for (const [label, cu, cl] of [
    ['R1 as laid out', null, null],
    ['beyond the halt, centre u 540 lat +40', 54000, 4000],
    ['beyond the halt, centre u 540 lat -40', 54000, -4000],
    ['beyond the halt, centre u 520 lat +45', 52000, 4500],
  ] as const) {
    const c = cu === null ? { x: RING_LOOP.x, z: RING_LOOP.z } : ringAt(cu, cl!);
    let lo = Infinity,
      hi = -Infinity;
    for (let k = 0; k < 72; k++) {
      const t = (k / 72) * 2 * Math.PI;
      const x = c.x / 100 + 40 * Math.cos(t) - ORIGIN.x,
        z = c.z / 100 + 40 * Math.sin(t) - ORIGIN.z;
      const h = ringHeight(x, z);
      lo = Math.min(lo, h);
      hi = Math.max(hi, h);
    }
    console.log(
      'ring loop',
      label,
      `centre (${(c.x / 100).toFixed(0)}, ${(c.z / 100).toFixed(0)})`,
      `ground on the circle ${lo.toFixed(1)} to ${hi.toFixed(1)} m (deck 8.0)`,
    );
  }
  console.log('keep clear', JSON.stringify(keepClear(), null, 1));
  for (const l of lineRows()) console.log('trip', l.id, l.length.toFixed(0), JSON.stringify(l.trip));
  console.log('min upgrade line', MIN_UPGRADE_LINE_M);
  console.log(
    'stops',
    RAIL_LINES.map((l) => l.halts.map((h) => h.s)),
  );
  console.log('consist', CONSIST, 'S_HEAD', RING_S_HEAD);
  console.log('continuity failures', c.failures);
  void tracks;
}

// Prettier would reflow the embedded script and JSON: the page is in .prettierignore and written as generated.
const text = page();
const check = process.argv.includes('--check');
const now = fs.existsSync(ROOT + PAGE) ? fs.readFileSync(ROOT + PAGE, 'utf8') : '';
if (process.argv.includes('--numbers')) numbers();
else if (now !== text) {
  if (check) {
    console.log(`stale: ${PAGE} (node --import ./dev/sim/hooks.ts dev/level/rail-map.ts)`);
    process.exit(1);
  }
  fs.writeFileSync(ROOT + PAGE, text);
  console.log(`wrote ${PAGE} (${(text.length / 1024).toFixed(0)} KB)`);
}

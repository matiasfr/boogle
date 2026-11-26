// The greybox route's built legs, their views (docs/plans/greybox-route.md, leg 1 step 4, as its design review rules
// it: answers b, e, g, i, j, k and l; docs/plans/greybox-leg2.md, step 4, for the incline and the bay cut). A Local
// view of accepted state, mounted by the railway's works seam (railway/works-live.ts) because its prompts send through
// the adapter only that view holds. Everything is read from `adapter.read.world()` at the head of each entry point;
// nothing is kept from a world. Each built leg (RAIL_LEGS with its rules built: the stack, the incline, the bay cut) is
// one LegSpec below, drawn the same way:
//
//   the deck      a slab, two tracks and sea bents as far as the line's end (each section's end; a section laying grows
//                 over its lay clock), with the buffers and the end board at that end. The stack line runs on from Ring
//                 Island's platforms along line 2 (at stage 0 its end is the island's run-off), with a crossover at
//                 each head and before High Gorge's platforms (J12, src/place/junctions.ts: timbers, wing and check
//                 rails, the blades cut out of its rails, which railway/turnout-blades.ts draws moving); the incline and the
//                 bay cut are lines of their own (railway/row-path.ts), with buffers at their start and their turnouts
//   the site      the current section's frame, its bill sign, the rack and its plate (on Ring Island's west platform,
//                 High Gorge's and the West landing's for section 1, then at each railhead), and High Gorge's yard
//   the heads     a 25 m platform with a sea ramp at every head that is a stop (the levers are railway/halts-view.ts's)
//   the signals   a post, an arm and a plate at each section end the line has passed
//   High Gorge    the pickup post on the north rim, the incline's barrier at its first frame, the stand-in town's
//                 board (the massing is ./massing.ts's, resident by distance)
//   the prompts   Feed the frame, Take logs, Take rails, the pickup and the barrier
//
// Grey boxes and placeholder labels (none is The Boogler's), no effects and no sound (owner-calls, "mechanisms,
// systems, greybox, details"). The objective line's texts go to the play record (src/proto/mark.ts): the route has no
// on-screen objective line and this adds no HUD element. Until line 2 wears the longer boiler, the line names the
// steel loop's step (STEEL_OBJECTIVES, from the Steel, Shed and Line rows); then the leg's.
import * as THREE from 'three/webgpu';
import type { RailwayAdapter } from '../../adapters/railway-session.ts';
import type { OwnedView } from '../../render/owned-view.ts';
import type { Body, Shape } from '../../physics/engine.ts';
import type { Interactable } from '../../player/hands.ts';
import type { LinePoint } from '../../place/layout.ts';
import { me } from '../../player/player.ts';
import { frameOccupied } from '../railway/frame-occupied.ts';
import { camera } from '../../render/scene.ts';
import { signBoard } from '../../render/sign-board.ts';
import { playObjective } from '../../proto/mark.ts';
import { LINE2, RAIL_LINES, legBuilt, trainPassesBy } from '../../sim/railway-lines.ts';
import { LINE_SLOTS } from '../../sim/railway-trains.ts';
import { TRAIN_PHASE } from '../../sim/railway-train.ts';
import { trainStops } from '../../sim/railway-queries-trains.ts';
import { RING_S_HEAD } from '../../sim/railway-ring-layout.ts';
import {
  LEG_TUNE,
  RAIL_ARRIVAL,
  RAIL_GATES,
  RAIL_GRANTS,
  RAIL_LEGS,
  legFrame,
  legRack,
  legS,
  type RouteLeg,
} from '../../sim/railway-route.ts';
import { account, aperture, line, rail, shed, steel, train, type ReadWorld } from '../../sim/railway-rows.ts';
import { heldBig, LOGS, roomOf } from '../../sim/railway-queries.ts';
import { RAILS } from '../../sim/railway-line2-layout.ts';
import { gateLeg, legDone, legOpen, legReached, legRow, legYard, routeRow } from '../../sim/railway-queries-route.ts';
import { createBoxBatch } from '../railway/works-box-view.ts';
import { legKitFlight, paintPlate } from '../railway/kit-board.ts';
import { legYardFlight, legYardSpot } from '../railway/leg-yard.ts';
import { LINE2_END_S, line2At, line2World, line2Y } from '../railway/line2-path.ts';
import type { TrackPoint } from '../railway/track.ts';
import { crossoverPlan, seaCrossovers, uncut, type RailCut } from '../../place/junctions.ts';
import { KIT } from '../../place/turnout.ts';
import {
  BAY_CUT_END,
  CANOPY_KINK,
  ROW_PLATFORM,
  ROW_TRACK,
  rowAt,
  rowEndSwing,
  rowStartCrossing,
  rowWorld,
  rowY,
  type RowSwing,
} from '../railway/row-path.ts';
import { islandGround, ringIslandNear } from '../ring-island/state.ts';
import { GATE_AT, GORGE_DECK, PICK_AT, TOWN_PAD, gorgeAt } from './massing.ts';
import { bellPads } from './massing-bell.ts';
import { canopyGround } from './massing-canopy.ts';
import { liftOrWait } from '../../prefab/instantiate.ts';
import type { Clearing } from '../../place/clearance.ts';
import { AREA_CENTRES, LEG2_TEXT } from './leg2-layout.ts';
import { areaBoardVisibility, areaLabels } from './state.ts';
import type { GreyBox } from './boxes.ts';

// Placeholder labels (the step 4 design review's answers b, e, i, k and l; none is The Boogler's).
const FEED = 'Feed the frame',
  TAKE_LOGS = 'Take logs',
  TAKE_RAILS = 'Take rails',
  BRING_LOGS = 'Bring logs',
  BRING_RAILS = 'Bring rails',
  BRING_BOTH = 'Bring logs or rails',
  LOGS_FULL = 'Logs full',
  RAILS_FULL = 'Rails full',
  HANDS_FULL = 'Hands full',
  TAKE_PICK = 'Take the powered pick',
  NOT_YET = 'Not yet',
  OPEN_GATE = 'Open the barrier',
  NEEDS_PICK = 'Needs the powered pick',
  NO_LINE = 'No line beyond yet',
  UNDER_WAY = 'UNDER CONSTRUCTION',
  // Greybox leg 2's (docs/plans/greybox-leg2.md, "Controls and copy", and step 4; placeholders, none The Boogler's).
  TAKE_SEEDS = 'Take the crystal seeds',
  SEEDS_NOT_YET = "The incline isn't laid yet",
  CONNECTED = 'Connected (placeholder)',
  HOME_LINE = 'LINE TO HOME (WEST LANDING)',
  BUILT_FROM_HOME = 'BUILT FROM HOME',
  // Greybox leg 3's (docs/plans/greybox-leg3.md, "Controls and copy"; placeholders, none The Boogler's).
  TAKE_CLOTH = 'Take the glider cloth',
  CLOTH_NOT_YET = "The line to Canopy isn't laid yet";
export const LEG_OBJECTIVES = {
  first: "Build the line to High Gorge: section 1 of 4. The frame is on Ring Island's west platform.",
  next: (n: number, of: number) => `Build the line to High Gorge: section ${n} of ${of}. Ride line 2 to the railhead.`,
  open: 'High Gorge is open. Ride line 2 to its end and climb the stair.',
  // Greybox leg 2's (docs/plans/greybox-leg2.md, "Controls and copy"; placeholders): the barrier moved onto the
  // incline's first frame, so its line is the plan's now.
  gate: "Open the incline's barrier",
  incline: 'Build the incline to Bell Rock',
  seeds: 'Take the crystal seeds',
  bay: 'Build the bay line from the West landing',
  // Greybox leg 3's (docs/plans/greybox-leg3.md, "Controls and copy"; placeholders).
  canopyGate: 'Open the barrier to Canopy',
  canopy: 'Build the line to Canopy Town',
  cloth: 'Take the glider cloth',
  plug: 'Open the sea-cave plug at the West landing',
  cave: 'Build the cave line to Port Quay',
  wall: 'Build the line along the White Wall to High Gorge (placeholder)',
  deepSpan: "Open the deep span's barrier (placeholder)",
  notchGate: 'Open the Notch barrier at Canopy Town (placeholder)',
  notch: 'Build the line to Lantern Notch (placeholder)',
  lantern: 'Take the lantern at Lantern Notch (placeholder)',
  causewayGate: "Open the causeway's barrier at Bell Rock (placeholder)",
  causeway: 'Build the causeway to the Original Island (placeholder)',
  island: 'Ride to the Original Island (placeholder)',
  arrived: 'Arrived (placeholder)',
} as const;
/** The steel loop's steps, from the rivet to the longer boiler (docs/plans/ring-island-build2.md, section 1). Draft
 * copy for the owner to reword (docs/agent-calls.md; decision d-2026-11-18-decisions-page-rail). */
const STEEL_OBJECTIVES = {
  kit: "Light Ring Island's steel works. Ride line 2 to the island; the train brings its kit.",
  feed: "Light the steel works: carry the kit from Ring Island's yard into the shed.",
  cast: 'The steel works is casting. Line 2 carries its steel Home to the Roundhouse.',
  install: 'Steel is in the Roundhouse bay. Hold Install at the table for the longer boiler.',
} as const;

const GREY = '#9c9ea1',
  GREY_DARK = '#6f7275',
  GREY_LIGHT = '#b4b6b8',
  LOG = '#9a8f80',
  RAIL = '#45474b',
  BED = '#77705f',
  DANGER = '#c8402c',
  TIMBER = '#5e574a',
  CLEAR = '#3c8f4a',
  CLOTH_LIT = '#e8dcc0';
const SEG = 10,
  SEA_BED = -8;

// ---------------------------------------------------------------- the legs' geometry
/** A leg's line as the views stand it: world (x, z) of `lat` metres right (going out) of its line at `s`, the heading
 * there (`at`'s ux, uz; its x and z are the path's own frame) and the rail height. */
type Geo = {
  at(s: number, out: LinePoint): LinePoint;
  world(s: number, lat: number, out: { x: number; z: number }): { x: number; z: number };
  y(s: number): number;
};
const LINE2_GEO: Geo = { at: (s, o) => line2At(s, o), world: line2World, y: line2Y };
const rowGeo = (ln: number): Geo => ({
  at: (s, o) => rowAt(ln, s, o),
  world: (s, lat, o) => rowWorld(ln, s, lat, o),
  y: (s) => rowY(ln, s),
});

const metres = (p: { x: number; y: number; z: number }) => ({ x: p.x / 100, y: p.y / 100, z: p.z / 100 });
const boxTurn = new THREE.Quaternion(),
  boxEuler = new THREE.Euler(0, 0, 0, 'YXZ');
/** A greybox box's turn (yaw, then pitch about its x), as its collider is built. */
const boxQuat = (b: GreyBox) => boxTurn.setFromEuler(boxEuler.set(-(b.pitch ?? 0), b.yaw, 0)).clone();
/** A greybox box as a physics shape, placed in the world. */
function boxShape(b: GreyBox): Shape {
  const q = boxQuat(b);
  return {
    kind: 'box',
    hx: b.w / 2,
    hy: b.h / 2,
    hz: b.d / 2,
    offset: { x: b.x, y: b.y, z: b.z },
    rotation: { x: q.x, y: q.y, z: q.z, w: q.w },
  };
}
/** A deck slab's box, as place/land.ts slab builds its collider: 0.4 m thick, its top from (a, ya) to (b, yb). */
function slabBox(
  a: { x: number; z: number },
  b: { x: number; z: number },
  ya: number,
  yb: number,
  w: number,
  over: number,
) {
  const run = Math.hypot(b.x - a.x, b.z - a.z);
  return {
    x: (a.x + b.x) / 2,
    y: (ya + yb) / 2 - 0.2,
    z: (a.z + b.z) / 2,
    w,
    h: 0.4,
    d: Math.hypot(run, yb - ya) + 2 * over,
    yaw: Math.atan2(b.x - a.x, b.z - a.z),
    pitch: Math.atan2(yb - ya, run),
  } satisfies GreyBox;
}
const within = (p: { x: number; y: number; z: number }, site: { x: number; y: number; z: number }, reach: number) =>
  Math.hypot(p.x - site.x, p.z - site.z) <= reach / 100 - 0.4 && Math.abs(p.y - site.y) <= 2.6;

/** A site's frame: its point, the line's outbound heading there and the unit vector toward the tracks. */
type Site = { x: number; y: number; z: number; hx: number; hz: number; tx: number; tz: number; yaw: number };
const P = { x: 0, z: 0, ux: 0, uz: 1 },
  q = { x: 0, z: 0 };
function siteAt(p: { x: number; y: number; z: number }, geo: Geo, s: number, toTrack: 1 | -1): Site {
  geo.at(s, P);
  // lat + is (-uz, ux); `toTrack` is the sign of the way from the site to the rails along it.
  return {
    ...metres(p),
    hx: P.ux,
    hz: P.uz,
    tx: -P.uz * toTrack,
    tz: P.ux * toTrack,
    yaw: Math.atan2(P.ux, P.uz),
  };
}
const local = (site: Site, along: number, toTrack: number) => ({
  x: site.x + site.hx * along + site.tx * toTrack,
  z: site.z + site.hz * along + site.tz * toTrack,
});

/** One built leg as the views draw it. */
type LegSpec = {
  k: number;
  leg: RouteLeg;
  geo: Geo;
  /** Each section's end, metres along the leg's line. */
  R: number[];
  /** The line's end by sections laid (index `laid`). */
  END: number[];
  /** Where its rails and deck start. */
  from: number;
  /** The two tracks' offsets from the line, the slab's middle and width. */
  tracks: readonly number[];
  mid: number;
  width: number;
  /** A head's platform: the 25 m before the section's end, its centre `lat` from the line, `w` wide, `up` over the rails. */
  plat: { len: number; lat: number; w: number; up: number };
  /** The end board's first line. */
  name: string;
  frames: Site[];
  racks: Site[];
  /** Its own line (not line 2): buffers at its start, its turnouts drawn, its deck's colliders merged on straights. */
  row: boolean;
  /** Stretches with no sea bents (the bore, the level's own beds on posts and Bell Rock's rock). */
  noBents: readonly (readonly [number, number])[];
  /** The leg whose deck end it runs on from, on the same line (leg 3 from the bay cut's at Bell Rock): no buffers
   * and no crossover at its start, and that leg's end buffers go once this one has a section laid. */
  joins?: string;
  /** Solid land under it that is not Ring Island's (Canopy isle): its height at (x, z), or null over the sea. A bent
   * stands on it and a head's steps come down to it. */
  ground?: (x: number, z: number) => number | null;
};
const sectionEnds = (leg: RouteLeg) => leg.sections.map((sec) => legS(leg, sec.toCm) / 100);
/** The stack leg (RAIL_LEGS slot 0): line 2 on from Ring Island. */
function stackSpec(): LegSpec {
  const k = 0,
    leg = RAIL_LEGS[k]!,
    R = sectionEnds(leg),
    ring = RING_S_HEAD / 100,
    // Section 1's at u `first` on Ring Island's west platform (the rails east of it); then `back` metres short of the
    // railhead, right of the rails.
    site = (p: { x: number; y: number; z: number }, j: number, first: number, back: number) =>
      siteAt(p, LINE2_GEO, j === 0 ? ring + first : R[j - 1]! - back, j === 0 ? 1 : -1);
  return {
    k,
    leg,
    geo: LINE2_GEO,
    R,
    // The run-off's (u 483.5), each section's, the row's (20 m past High Gorge's stop).
    END: [ring + 483.5, ...R.slice(0, -1), LINE2_END_S],
    // u 470: ring-island/view.ts ends the Way's there.
    from: ring + 470,
    // The down track at lat 0, the up track 4 m west.
    tracks: [0, -4],
    mid: -2,
    width: 8.6,
    // RING_HEAD's: lat +1.8 to +6.3, 90 cm over the rails.
    plat: { len: 25, lat: 4.05, w: 4.5, up: 0.9 },
    name: 'LINE TO HIGH GORGE',
    // Section k's frame and rack: on Ring Island's west platform (the rails are east of it), then at its railhead.
    frames: leg.sections.map((_s, j) => site(legFrame(leg, j), j, 453, 8)),
    racks: leg.sections.map((_s, j) => site(legRack(leg, j), j, 446, 18)),
    row: false,
    noBents: [],
  };
}
/** A leg of its own row line (greybox leg 2: the incline, the bay cut; leg 3: Bell Rock to Canopy). `first`: section
 * 1's frame and rack, metres along their line, the side the rails are on and (when not the leg's own) the line's
 * geometry; `start`, where its rails start; `face`, its buffers' face at the destination; `more`, its end board's
 * name and the fields a leg that joins another's deck sets. */
type FirstSite = readonly [s: number, toTrack: 1 | -1, geo?: Geo];
function rowSpec(
  id: string,
  first: { frame: FirstSite; rack: FirstSite },
  start: number,
  face: (R: readonly number[]) => number,
  noBents: readonly (readonly [number, number])[],
  more: Partial<Pick<LegSpec, 'name' | 'joins' | 'ground'>> = {},
): LegSpec {
  const k = RAIL_LEGS.findIndex((l) => l.id === id),
    leg = RAIL_LEGS[k]!,
    geo = rowGeo(leg.line),
    R = sectionEnds(leg);
  const site = (p: { x: number; y: number; z: number }, j: number, at: FirstSite, back: number) =>
    j === 0 ? siteAt(p, at[2] ?? geo, at[0], at[1]) : siteAt(p, geo, R[j - 1]! - back, -1);
  return {
    k,
    leg,
    geo,
    R,
    END: [start, ...R.slice(0, -1), face(R) + 1.8],
    from: start,
    // Right-hand running about the row (railway/row-path.ts): the outward track right going out.
    tracks: [ROW_TRACK, -ROW_TRACK],
    mid: 0,
    // The level's unlaid bed (src/content/levels/leg2.ts, BED: 3.8 m either side).
    width: 7.6,
    // The platforms' 3.8 to 7.8 m off the row (the halts' 5.8 m, railway-lines.ts legPlatforms), 90 cm up.
    plat: { len: 25, lat: ROW_PLATFORM, w: 4, up: 0.9 },
    name: 'LINE TO BELL ROCK',
    frames: leg.sections.map((_s, j) => site(legFrame(leg, j), j, first.frame, 8)),
    racks: leg.sections.map((_s, j) => site(legRack(leg, j), j, first.rack, 18)),
    row: true,
    noBents,
    ...more,
  };
}
/** Line 2's High Gorge stop, metres along line 2, and the line 2 kit car's offset behind it there (railway-route.ts). */
const GORGE_S = sectionEnds(RAIL_LEGS[0]!).at(-1)!,
  GORGE_KIT_CAR = 7.1;
const QUAY_STOP = sectionEnds(RAIL_LEGS[4]!).at(-1)!;
const CANOPY_STOP = sectionEnds(RAIL_LEGS[3]!).at(-1)!;
const BELL_STOP = sectionEnds(RAIL_LEGS[1]!).at(-1)!;
const SPECS: readonly LegSpec[] = [
  stackSpec(),
  // The incline: its rails from incline-s's and incline-n's start (t 16; leg 1's south platform crosses the row to t
  // 15.3), the frame at t 24 on incline-s (the rails right of it), the rack on line 2's south platform abreast of its
  // kit car; buffers 15 m past Bell Rock's stop. No bents through the bore (s 62 to 237, with its mouths) nor under
  // Bell Rock's lower bed (n -60 to 60 about the stop).
  rowSpec('incline', { frame: [24, 1], rack: [GORGE_S - GORGE_KIT_CAR, 1, LINE2_GEO] }, 16, (R) => R.at(-1)! + 15, [
    [62, 237],
    [1096, 1216],
  ]),
  // The bay cut: its rails from the West landing's bed (s 0), the frame and rack on the apron, right of the rails
  // going out (lat 9.8); buffers at the kink. No bents under the landing's bed (s 0 to 60) nor over Bell Rock.
  rowSpec('bay-cut', { frame: [12, -1], rack: [6, -1] }, 0.5, () => BAY_CUT_END, [
    [0, 60],
    [1150, 1240],
  ]),
  // Bell Rock to Canopy (greybox-leg3.md, step 6): on from the bay cut's deck end (its buffers stand until this leg's
  // first lay), the frame and rack on Bell Rock's outward upper platform (railway-route.ts FIRST_SITE); over the strait
  // on bents, onto Canopy isle's bank (no bents on the isle, steps down at head 2); buffers 2 m short of the kink. No
  // bents on Bell Rock (to s 1341, where the row leaves the rock).
  rowSpec(
    'bell-canopy',
    { frame: [1229, -1], rack: [1219, -1] },
    BAY_CUT_END + 1.8,
    () => CANOPY_KINK - 2,
    [[1150, 1341]],
    { name: 'LINE TO CANOPY TOWN', joins: 'bay-cut', ground: canopyGround },
  ),
  // The West bed, the Saltpan flats and the made ground at the quay carry the track.
  rowSpec(
    'cave',
    { frame: [12, 1], rack: [6, 1] },
    0.5,
    (ends) => ends.at(-1)! + 23,
    [
      [0, 60],
      [625, 885],
      [1195, 1248],
    ],
    {
      name: 'LINE TO PORT QUAY',
    },
  ),
  rowSpec(
    'wall',
    { frame: [QUAY_STOP + 12, -1], rack: [QUAY_STOP + 2, -1] },
    QUAY_STOP + 23 + 1.8,
    (ends) => ends.at(-1)! + 23.01,
    [
      [1246, 1300],
      [3498, 3528],
    ],
    { name: 'LINE TO HIGH GORGE', joins: 'cave', ground: canopyGround },
  ),
  rowSpec(
    'notch-tunnel',
    { frame: [CANOPY_STOP + 3, -1], rack: [CANOPY_STOP - 7, -1] },
    CANOPY_KINK - 0.2,
    (ends) => ends.at(-1)! + 18.2,
    [],
    { name: 'LINE TO LANTERN NOTCH', joins: 'bell-canopy', ground: canopyGround },
  ),
  rowSpec(
    'causeway',
    { frame: [BELL_STOP + 3, -1], rack: [BELL_STOP - 7, -1] },
    BELL_STOP + 16.8,
    (ends) => ends.at(-1)! + 18.2,
    [[BELL_STOP, BELL_STOP + 60]],
    { name: 'LINE TO THE ORIGINAL ISLAND', joins: 'incline' },
  ),
].filter((sp) => legBuilt(sp.k));

/** Bell Rock (greybox leg 2): the seeds post, the Canopy barrier (RAIL_GATES[1], shut until leg 3 is built: it stands
 * in view) on the out half's heading (the line to Canopy leaves that way), and the stalls that rise by ruling 2's
 * table: High Gorge's and Ring Island's with the incline, Home's with the bay cut. */
const SEEDS = RAIL_GRANTS.findIndex((g) => g.id === 'seeds'),
  SEEDS_AT = metres(RAIL_GRANTS[SEEDS]!.at),
  CANOPY = RAIL_GATES.findIndex((g) => g.id === 'canopy'),
  canopyIndex = RAIL_LEGS.findIndex((l) => l.id === 'bell-canopy'),
  canopyLeg = RAIL_LEGS[canopyIndex]!,
  canopyGeo = rowGeo(canopyLeg.line),
  CANOPY_SITE = siteAt(legFrame(canopyLeg, 0), canopyGeo, 1229, -1);
const PLUG = RAIL_GATES.findIndex((g) => g.id === 'plug');
const plugSite = SPECS.find((sp) => sp.leg.id === 'cave')?.frames[0];
const wall = SPECS.find((sp) => sp.leg.id === 'wall')!;
const deepSpan = RAIL_GATES.findIndex((g) => g.id === 'deep-span');
const deepSite = wall.frames[5]!;
const STALLS: Readonly<Record<string, string>> = {
  'bell.pad-gorge': 'incline',
  'bell.pad-ring': 'incline',
  'bell.pad-home': 'bay-cut',
  'bell.pad-canopy': 'bell-canopy',
  'bell.pad-quay': 'cave',
};
const notch = SPECS.find((sp) => sp.leg.id === 'notch-tunnel')!;
const causeway = SPECS.find((sp) => sp.leg.id === 'causeway')!;
const CLOTH = RAIL_GRANTS.findIndex((g) => g.id === 'cloth'),
  CLOTH_AT = metres(RAIL_GRANTS[CLOTH]!.at),
  NOTCH = RAIL_GATES.findIndex((g) => g.id === 'notch'),
  CAUSEWAY = RAIL_GATES.findIndex((g) => g.id === 'causeway'),
  LANTERN = RAIL_GRANTS.findIndex((g) => g.id === 'lantern'),
  LANTERN_AT = metres(RAIL_GRANTS[LANTERN]!.at),
  MEETING_AT = metres(RAIL_ARRIVAL);
/** The board at the end of Bell Rock's upper in-half platform, where the bay line will arrive (the review's finding
 * 1): on the bay row's bed 19.5 m in from the kink, facing the deck, from the incline's last lay to the bay cut's. */
const HOME_BOARD_S = BAY_CUT_END - 19.5;

export async function createLegView(adapter: RailwayAdapter, owner: OwnedView) {
  const [{ addStatic, slab }, ground] = await Promise.all([import('../../place/land.ts'), islandGround()]);
  // The earlier routes fit 10,500 instances. Each added 10 m chord has a slab, two beds and four rails,
  // with up to three bent pieces and a turnout at the destination.
  const endingCapacity = [notch, causeway].reduce(
    (sum, sp) => sum + 10 * Math.ceil((sp.END.at(-1)! - sp.from) / SEG) + 8,
    0,
  );
  const deck = createBoxBatch(owner, 10500 + endingCapacity, false),
    things = createBoxBatch(owner, 700, false);
  // Named, so a look can count what the leg's views add to a frame (dev/look/evals/stack-draws.ts).
  deck.mesh.name = 'route-greybox:deck';
  things.mesh.name = 'route-greybox:things';

  // ---------------------------------------------------------------- signs
  const sign = (w: number, h: number, foot: number, posts: 'one' | 'two' | 'none', px = 512) => {
    const s = signBoard(owner, { w, h, px, foot, posts, wood: '#5d6063' });
    s.mesh.visible = false;
    s.mesh.name = 'route-greybox:sign';
    return { ...s, text: '' };
  };
  type Sign = ReturnType<typeof sign>;
  /** Paints `lines` on `s` if they changed, and stands it at (x, y, z) facing (nx, nz). */
  function show(
    s: Sign,
    at: { x: number; z: number },
    y: number,
    nx: number,
    nz: number,
    lines: readonly { t: string; size: number }[],
    badge = '',
  ) {
    const text = `${badge}|${lines.map((l) => l.t).join('|')}`;
    if (text !== s.text) {
      s.text = text;
      paintPlate(s, lines, badge);
    }
    s.mesh.position.set(at.x, y, at.z);
    s.mesh.rotation.y = Math.atan2(nx, nz);
    s.mesh.visible = true;
  }
  // The bill's foot clears the frame's top rail (1.7 m), which covered its last line from across the tracks. One bill,
  // rack plate and yard plate: one leg is open at a time on the whole route.
  const bill = sign(4.2, 1.8, 1.8, 'one', 768),
    plate = sign(1.9, 0.8, 1.3, 'one', 384),
    pickPlate = sign(2.2, 0.9, 1.7, 'one', 384),
    gatePlate = sign(3, 1, 2.3, 'none', 384),
    townBoard = sign(3.2, 1.3, 1.2, 'two', 512),
    homeBoard = sign(5.2, 1.4, 0.9, 'two', 768),
    causewayBoard = sign(5.2, 1.4, 0.9, 'two', 768),
    meetingBoard = sign(3.2, 1.3, 1.2, 'one', 512);

  // ---------------------------------------------------------------- one leg's deck, pieces and signs
  function legView(sp: LegSpec) {
    const { geo, R, END, tracks, mid } = sp,
      n = sp.leg.sections.length;
    const endBoard = sign(5.2, 1.4, 0.9, 'two', 768),
      signalPlates = R.slice(0, -1).map(() => sign(1.5, 0.8, 2.6, 'one', 256));
    // A row line's plain departure boards (greybox-leg2.md, step 4; the halt map's drawing stays line 2's): one on each
    // of its built halts' outward platform, at its back edge facing the rails, a few metres from the halt's lever
    // (railway/halts-view.ts rowSpot), listing the line's open stops by their catalog names.
    const halts = sp.row ? RAIL_LINES[sp.leg.line]!.halts : [],
      departures = halts.flatMap((h, stop) => {
        // Each leg stands its own halts' boards (the bay line's are the bay cut's and leg 3's).
        if (h.leg?.slot !== sp.k) return [];
        const at = h.s / 100 - (stop === 0 ? 14 : h.end?.kind === 'stub' ? 5 : 4);
        return [{ stop, at, board: sign(2.6, 1.3, 1.4, 'two', 512) }];
      });
    /** The departure boards' lines: the line's open stops, rebuilt when their count changes. */
    let listed = -1,
      stopLines: { t: string; size: number }[] = [];
    let deckEnd = -1,
      deckLaid = -1,
      stood = -1;
    const deckBodies: Body[] = [];
    const standing = { boxes: [] as GreyBox[], bodies: new Map<GreyBox, Body>() };
    const temporaryHeads = new Map<number, GreyBox[]>();
    let endBuffers: GreyBox[] = [];
    const retiring = new Map<GreyBox[], { clearance: Clearing<{ shapes: Shape[]; on(): void }>; bodies: Body[] }>();
    /** A box along the line from (`s0`, `lat0`) to (`s1`, `lat1`), its top `up` over the rails. */
    function along(s0: number, s1: number, lat0: number, lat1: number, up: number, w: number, h: number, c: string) {
      geo.world(s0, lat0, q);
      const ax = q.x,
        az = q.z,
        ay = geo.y(s0) + up;
      geo.world(s1, lat1, q);
      const by = geo.y(s1) + up,
        run = Math.hypot(q.x - ax, q.z - az),
        pitch = Math.atan2(by - ay, run);
      deck.box(
        (ax + q.x) / 2,
        (ay + by) / 2 - h / 2,
        (az + q.z) / 2,
        w,
        h,
        Math.hypot(run, by - ay) + 0.02,
        c,
        Math.atan2(q.x - ax, q.z - az),
        -pitch,
      );
    }
    /** A track from (`s0`, `lat0`) to (`s1`, `lat1`): its bed and two rails, less the blades `cuts` takes out. */
    function track(s0: number, s1: number, lat0: number, lat1: number, cuts: readonly RailCut[] = []) {
      along(s0, s1, lat0, lat1, 0.13, 2.4, 0.1, BED);
      for (const r of [-0.5, 0.5])
        for (const [a, b] of uncut(s0, s1, lat0 + r, cuts)) along(a, b, lat0 + r, lat1 + r, 0.29, 0.12, 0.14, RAIL);
    }
    // The stack's crossovers (J12): each drawn once the deck reaches past its far toe's headblocks, its two toes'
    // blades cut out of the plain rails from then on.
    const crossings = sp.row
      ? []
      : seaCrossovers()
          .filter((c) => c.view === 'stack')
          .map((c) => ({ c, plan: crossoverPlan(c), reach: c.s1 + KIT.head }));
    /** One crossover's timbers (on the beds, under the rails), its two rails, and its wing and check rails. */
    function crossover({ plan }: (typeof crossings)[number]) {
      for (const t of plan.timbers) {
        const mid = (t.lo + t.hi) / 2;
        along(t.s - 0.15, t.s + 0.15, mid, mid, 0.17, t.hi - t.lo, 0.08, TIMBER);
      }
      for (const r of plan.rails) along(r.a.s, r.b.s, r.a.lat, r.b.lat, 0.29, 0.12, 0.14, RAIL);
      // A rail piece's centre is TOP (0.1 m) over its centreline (junctions.ts puts that 0.12 m over line2Y).
      for (const { a, b, w } of plan.wings) deck.between(a, b, 0.12 * w, 0.14, RAIL, 0.1);
    }
    const bentFree = (s: number) => !sp.noBents.some(([a, b]) => s >= a && s <= b);
    /** Into the shared deck batch: the deck to `end`, and (a row's) the turnouts the line uses at `laid`. */
    function drawDeck(end: number, laid: number) {
      const down = crossings.filter((x) => end >= x.reach),
        cuts = down.flatMap((x) => x.plan.cuts);
      for (const x of down) crossover(x);
      for (let s0 = sp.from; s0 < end - 1e-6; s0 += SEG) {
        const s1 = Math.min(end, s0 + SEG);
        if (lay?.waiting.some((x) => s0 < x.s1 - 1e-6 && s1 > x.s0 + 1e-6)) continue;
        const slabStart = sp === causeway ? Math.max(s0, BELL_STOP + 60) : s0;
        if (s1 > slabStart) along(slabStart, s1, mid, mid, 0, sp.width, 0.5, GREY);
        for (const t of tracks) track(s0, s1, t, t, cuts);
        // A bent every 20 m where the deck stands clear of the ground: two posts to the sea bed and a cap.
        if (Math.round((s0 - sp.from) / SEG) % 2 === 0 && bentFree(s0)) {
          const y = geo.y(s0);
          geo.world(s0, mid, q);
          const foot = Math.max(
            SEA_BED,
            ground.onIsland(q.x, q.z) ? ground.islandH(q.x, q.z) : SEA_BED,
            sp.ground?.(q.x, q.z) ?? SEA_BED,
          );
          if (foot < y - 1.5) {
            geo.at(s0, P);
            const yaw = Math.atan2(P.ux, P.uz);
            for (const lat of [mid - sp.width / 2 + 0.9, mid + sp.width / 2 - 0.9]) {
              geo.world(s0, lat, q);
              deck.box(q.x, (y - 0.5 + foot) / 2, q.z, 0.5, y - 0.5 - foot, 0.5, GREY_DARK, yaw);
            }
            geo.world(s0, mid, q);
            deck.box(q.x, y - 0.75, q.z, sp.width, 0.5, 0.6, GREY_DARK, yaw);
          }
        }
      }
      if (!sp.row || laid < 1) return;
      // The turnouts (railway/row-path.ts rowLat): the start's crossover (homeward trains cross to the outward track on
      // their way in), the end's stub at a head, the crossover before the destination's platforms (outward trains
      // cross to the homeward track as they leave). Each a diagonal track between the two.
      const swing = (w: RowSwing | null) => w && track(w.s0, w.s1, w.from, w.to),
        open = halts[sp.leg.railheadHalt + Math.min(laid, n) - 1]?.end;
      if (!sp.joins) swing(rowStartCrossing(sp.leg.line));
      if (open) swing(rowEndSwing(open));
    }
    /** The deck's walkable top as far as the laid end (a section still laying is drawn, not yet solid). A row's
     * merges 10 m lengths that run straight and level into one slab. */
    function solidDeck(laid: number) {
      for (const b of deckBodies.splice(0)) owner.removeBody(b);
      lay = null;
      const slabs: Slab[] = [];
      const end = END[laid]!,
        a = { x: 0, z: 0 },
        b = { x: 0, z: 0 },
        c = { x: 0, z: 0 };
      // Bell Rock's lower bed already carries the rails for 60 m beyond the stop.
      let s0 = sp === causeway ? BELL_STOP + 60 : sp.from;
      while (s0 < end - 1e-6) {
        let s1 = Math.min(end, s0 + SEG);
        geo.world(s0, mid, a);
        if (sp.row)
          for (;;) {
            const next = Math.min(end, s1 + SEG);
            if (next <= s1 + 1e-6) break;
            geo.world(s1, mid, b);
            geo.world(next, mid, c);
            const h0 = Math.atan2(b.x - a.x, b.z - a.z),
              h1 = Math.atan2(c.x - b.x, c.z - b.z),
              g0 = (geo.y(s1) - geo.y(s0)) / (s1 - s0),
              g1 = (geo.y(next) - geo.y(s1)) / (next - s1);
            if (Math.abs(h1 - h0) > 0.002 || Math.abs(g1 - g0) > 0.0005) break;
            s1 = next;
          }
        geo.world(s1, mid, b);
        // Copies: a and b are rewritten for the next slab.
        const y0 = geo.y(s0),
          y1 = geo.y(s1),
          from = { ...a },
          to = { ...b };
        slabs.push({
          s0,
          s1,
          shapes: [boxShape(slabBox(a, b, y0, y1, sp.width, 0.05))],
          on: () => deckBodies.push(slab(from.x, from.z, to.x, to.z, y0, y1, sp.width, owner, 0.05)),
        });
        s0 = s1;
      }
      // A body where the slabs go (on the bed under them, or on Bell Rock's rock under leg 3's descent) is lifted onto
      // them if its feet are within a step of their top and it fits standing there; else the slabs that hold it wait,
      // as one set, neither solid nor drawn (drawDeck), until it is clear of them all (src/place/clearance.ts).
      lay = liftOrWait(slabs, me.body, { lift: true });
    }
    type Slab = { s0: number; s1: number; shapes: Shape[]; on(): void };
    /** The lay's slabs held off while you stand in them, retried each frame (solid), and not drawn meanwhile
     * (drawDeck). */
    let lay: Clearing<Slab> | null = null;
    /** The boxes that stand for a state of the line: buffers at its end (and a row's start), and each stopping head's
     * platform and ramp. */
    function pieces(laid: number, through: boolean): GreyBox[] {
      const out: GreyBox[] = [];
      const box = (s0: number, s1: number, lat: number, up0: number, up1: number, w: number, h: number, c: string) => {
        geo.world(s0, lat, q);
        const a = { x: q.x, z: q.z, y: geo.y(s0) + up0 };
        geo.world(s1, lat, q);
        const b = { x: q.x, z: q.z, y: geo.y(s1) + up1 },
          run = Math.hypot(b.x - a.x, b.z - a.z),
          pitch = Math.atan2(b.y - a.y, run);
        out.push({
          x: (a.x + b.x) / 2,
          y: (a.y + b.y) / 2 - (h / 2) * Math.cos(pitch),
          z: (a.z + b.z) / 2,
          w,
          h,
          d: Math.hypot(run, b.y - a.y),
          yaw: Math.atan2(b.x - a.x, b.z - a.z),
          pitch,
          colour: c,
        });
      };
      // A row line has no track before its first lay.
      if (sp.row && laid < 1) return out;
      // The buffers: a timber stop on each track, its face half a metre short of the run-off's end and 1.8 m short of
      // a railhead's (the review's g) and of the Gorge's concourse; a row's also at its start.
      const end = END[laid]!,
        face = laid === 0 ? end - 0.5 : end - 1.8;
      for (const t of tracks) {
        if (!through) {
          box(face, face + 0.6, t, 1.4, 1.4, 2.6, 1.2, GREY_DARK);
          endBuffers.push(out.at(-1)!);
        }
        if (sp.row && !sp.joins) box(sp.from, sp.from + 0.6, t, 1.4, 1.4, 2.6, 1.2, GREY_DARK);
      }
      // The heads that are stops now: head j from its section's lay until it closes behind two lays on; the last
      // stays (the request stop: the stack's `Stack halt`, the incline's and the bay cut's one head).
      const { plat } = sp;
      for (let j = 1; j < n; j++) {
        // Saltpan Halt and the Wall's Canopy stop use the area's permanent platforms.
        if ((sp.leg.id === 'cave' && j === 2) || (sp.leg.id === 'wall' && j === 3)) continue;
        const closes = RAIL_LINES[sp.leg.line]!.halts[sp.leg.railheadHalt + j - 1]!.closesAt;
        if (laid < j || (closes !== undefined && laid >= j + 2)) continue;
        const first = out.length;
        const r = R[j - 1]!;
        // A row line's head has a platform each side (right-hand running: the homeward lever's is the left one).
        for (const side of sp.row ? [1, -1] : [1]) {
          const lat = side * plat.lat;
          for (let s = r - plat.len; s < r - 1e-6; s += 5) {
            box(s, s + 5, lat, plat.up, plat.up, plat.w, 0.5, GREY_LIGHT);
            geo.world(s + 2.5, lat, q);
            const top = geo.y(s + 2.5) + plat.up - 0.5;
            out.push({
              x: q.x,
              y: (top + SEA_BED) / 2,
              z: q.z,
              w: 0.5,
              h: top - SEA_BED,
              d: 0.5,
              yaw: 0,
              colour: GREY_DARK,
            });
          }
          // The sea ramp (the deck is 4 m over open water): a landing behind the platform's home end, then a slip
          // down along the line to under the surface, at the Ring ramps' pitch; on land (head 2 on Canopy isle),
          // steps down to the ground.
          const ramp = side * (plat.lat + plat.w / 2 + 1);
          geo.world(r - plat.len + 3, ramp, q);
          const land = sp.ground?.(q.x, q.z),
            drop = geo.y(r) + plat.up - (land ?? -1.3);
          box(r - plat.len, r - plat.len + 3, ramp, plat.up, plat.up, 2, 0.4, GREY);
          box(r - plat.len + 3, r - plat.len + 3 + drop / 0.54, ramp, plat.up, plat.up - drop, 2, 0.3, GREY);
        }
        if (sp === wall && closes !== undefined) temporaryHeads.set(j, out.slice(first));
      }
      return out;
    }
    /** The standing pieces whose colliders wait, undrawn, as one set, until you are out of them all (measured in each
     * box's own frame, pitch and all). The Wall can lift a player a small step onto a supporting top. */
    let standClear: Clearing<{ box: GreyBox; shapes: Shape[]; on(): void }> | null = null;
    function stand(laid: number, through: boolean) {
      const key = 2 * laid + Number(through);
      if (key === stood) {
        standClear?.retry(me.body);
        for (const head of retiring.values()) head.clearance.retry(null);
        return;
      }
      stood = key;
      const removed = [...temporaryHeads].filter(([head]) => laid >= head + 2).map(([, boxes]) => boxes);
      if (through && endBuffers.length) removed.push(endBuffers);
      endBuffers = [];
      for (const boxes of removed) {
        // Keep the whole closed head under its occupant, including across later lays. Only geometry
        // actually mounted on this client can retire, so a fresh view never creates an old head.
        const active = boxes.filter((box) => standing.bodies.has(box));
        const bodies = active.map((box) => standing.bodies.get(box)!);
        for (const box of active) standing.bodies.delete(box);
        const release = {
          shapes: active.map(boxShape),
          on() {
            for (const body of bodies) owner.removeBody(body);
            retiring.delete(active);
          },
        };
        const clearance = liftOrWait([release], null, { lift: false, occupied: frameOccupied });
        if (clearance.waiting.length) retiring.set(active, { clearance, bodies });
      }
      temporaryHeads.clear();
      for (const body of standing.bodies.values()) owner.removeBody(body);
      standing.bodies.clear();
      standing.boxes = pieces(laid, through);
      standClear = liftOrWait(
        standing.boxes.map((b) => ({
          box: b,
          shapes: [boxShape(b)],
          on: () =>
            standing.bodies.set(
              b,
              addStatic({ kind: 'box', hx: b.w / 2, hy: b.h / 2, hz: b.d / 2 }, b, boxQuat(b), undefined, owner),
            ),
        })),
        me.body,
        { lift: sp.leg.id === 'wall' || sp.leg.id === 'notch-tunnel' || sp.leg.id === 'causeway' },
      );
    }
    /** Takes the deck's slabs and the standing pieces' colliders away (and forgets what was drawn), until next shown. */
    function clear() {
      for (const b of deckBodies.splice(0)) owner.removeBody(b);
      for (const body of standing.bodies.values()) owner.removeBody(body);
      standing.bodies.clear();
      temporaryHeads.clear();
      for (const head of retiring.values()) for (const body of head.bodies) owner.removeBody(body);
      retiring.clear();
      lay = standClear = null;
      standing.boxes = [];
      deckLaid = stood = deckEnd = -1;
    }
    /** A train of this leg's line held at the block signal at `s` metres (standing at no halt, within 80 m of it). */
    const heldAt = (wd: ReadWorld, s: number) =>
      LINE_SLOTS[sp.leg.line]!.some((slot) => {
        const t = train(wd, slot);
        return t.phase === TRAIN_PHASE.STAND && t.at < 0 && Math.abs(t.from / 100 - s) < 80;
      });
    /** Its crossovers' toes for turnout-blades.ts: laid while the deck as drawn reaches past them. */
    const points: TrackPoint[] = crossings.flatMap((x) =>
      x.plan.toes.map((p) => ({ ...p, from: 0, laid: () => deckEnd >= x.reach, retired: () => false })),
    );
    return {
      sp,
      points,
      endBoard,
      signalPlates,
      departures,
      clear,
      /** The deck's end this frame (to the laid end, and on over a laying section's lay clock in 2 m steps), or -1 for
       * none drawn. */
      end(r: LegRows | null, here: boolean) {
        if (!r || !here) return -1;
        const laying = r.open && r.row.start >= 0 && r.laid < n;
        if (sp.row && r.laid < 1 && !laying) return -1;
        const grown = laying
          ? Math.max(0, Math.min(1, (adapter.read.tick() - r.row.start) / LEG_TUNE.layTicks)) *
            (END[r.laid + 1]! - END[r.laid]!)
          : 0;
        return END[r.laid]! + Math.floor(grown / 2) * 2;
      },
      drawDeck(end: number, laid: number) {
        deckEnd = end;
        drawDeck(end, laid);
      },
      /** The slabs that wait, as a key: the deck batch is redrawn when it changes. */
      held: () => (lay?.waiting ?? []).map((x) => x.s0).join('/'),
      /** The slabs and standing pieces for `laid` (once each change). */
      solid(laid: number, through: boolean) {
        if (laid !== deckLaid) solidDeck((deckLaid = laid));
        else lay?.retry(me.body);
        stand(laid, through);
      },
      /** Into `things`: the standing pieces, the end board, the passed block signals and a row's departure boards. */
      draw(r: LegRows, wd: ReadWorld, joined: boolean) {
        const open = departures.length ? trainStops(wd, sp.leg.line).length : 0,
          // An open stop a train stops at one way or the other (a head closed behind is passed both ways).
          served = (k: number) =>
            k < open && !(trainPassesBy(sp.leg.line, k, 1, open) && trainPassesBy(sp.leg.line, k, -1, open));
        if (open !== listed) {
          listed = open;
          const stops = halts.filter((_h, k) => served(k));
          const size = Math.min(0.2, 0.72 / stops.length);
          stopLines = stops.map((h) => ({ t: h.name, size }));
        }
        for (const d of departures) {
          if (!served(d.stop)) continue;
          geo.at(d.at, P);
          geo.world(d.at, sp.plat.lat + 1.5, q);
          show(d.board, q, geo.y(d.at) + sp.plat.up, P.uz, -P.ux, stopLines);
        }
        const held = standClear?.waiting ?? [];
        for (const b of standing.boxes)
          if (!held.some((x) => x.box === b))
            things.box(b.x, b.y, b.z, b.w, b.h, b.d, b.colour ?? GREY, b.yaw, -(b.pitch ?? 0));
        for (const boxes of retiring.keys())
          for (const b of boxes) things.box(b.x, b.y, b.z, b.w, b.h, b.d, b.colour ?? GREY, b.yaw, -(b.pitch ?? 0));
        const laid = r.laid;
        // The end board, 1.5 m behind the buffers' faces, facing back down the line: the stack's blank until the
        // rivet, then the line's name; it travels with the head and is gone at the destination (answer i). A row's
        // stands from its first lay (the West landing's own board says the same before it).
        if ((laid < n || sp === wall) && (!sp.row || laid > 0)) {
          const s = !sp.row && laid === 0 ? END[0]! + 0.6 : END[laid]! - 0.3;
          geo.at(s, P);
          geo.world(s, mid, q);
          show(
            endBoard,
            q,
            geo.y(s),
            -P.ux,
            -P.uz,
            sp === wall && laid === n
              ? [{ t: 'WHITE WALL LINE (placeholder)', size: 0.34 }]
              : joined
                ? [
                    { t: sp.name, size: 0.34 },
                    { t: UNDER_WAY, size: 0.22 },
                  ]
                : [],
          );
        }
        // The block signals the line has passed (answer e): a post between the tracks 3 m beyond each section end,
        // its arm at danger while a train is held there.
        signalPlates.forEach((s, k) => {
          if (laid <= k + 1) return;
          const at = R[k]! + 3;
          geo.at(at, P);
          geo.world(at, mid, q);
          const y = geo.y(at);
          show(s, q, y, -P.ux, -P.uz, [
            { t: 'SIGNAL', size: 0.36 },
            { t: 'TRAIN AHEAD', size: 0.22 },
          ]);
          const held = heldAt(wd, R[k]!);
          things.box(
            q.x,
            y + 3.9,
            q.z,
            1.3,
            0.22,
            0.12,
            held ? DANGER : CLEAR,
            Math.atan2(P.ux, P.uz),
            0,
            held ? 0 : 0.7,
          );
        });
      },
      inspect: () => ({
        deckEnd,
        deckSolids: deckBodies.length,
        standing: standing.boxes.length,
        waiting: standClear?.waiting.length ?? 0,
        endBoard: endBoard.mesh.visible ? endBoard.text : null,
        signals: signalPlates.filter((s) => s.mesh.visible).length,
      }),
    };
  }
  const legs = SPECS.map(legView);
  /** The stack leg's view (its Ring Island run-off and the steel loop's objectives are its own). */
  const legIndex = new Map(legs.map((l, i) => [l.sp.leg.id, i])),
    stack = legs[legIndex.get('stack')!]!,
    incline = legs.find((l) => l.sp.leg.id === 'incline'),
    bay = legs.find((l) => l.sp.leg.id === 'bay-cut');
  /** Whether the built leg `id` is complete. */
  const done = (r: { per: readonly LegRows[] }, id: string) => {
    const i = legIndex.get(id);
    return i !== undefined && r.per[i]!.done;
  };
  const deepFrameBuilt = (r: { per: readonly LegRows[] }) => r.per[legIndex.get('wall')!]!.laid >= 5;
  /** Whether a leg's views stand: the stack's only with a section laid or Ring Island's near view mounted (its end is
   * the island's run-off till then); every other leg's always. */
  const shown = (l: (typeof legs)[number], lr: LegRows | null) =>
    !!lr && (l !== stack || lr.laid > 0 || ringIslandNear.mounted);
  /** Every sign the legs' views stand (each frame hides them all, then stands those wanted). */
  const signs = [
    bill,
    plate,
    pickPlate,
    gatePlate,
    townBoard,
    homeBoard,
    causewayBoard,
    meetingBoard,
    ...legs.flatMap((l) => [l.endBoard, ...l.signalPlates, ...l.departures.map((d) => d.board)]),
  ];

  // ---------------------------------------------------------------- reads
  type LegRows = ReturnType<typeof legRows>;
  function legRows(wd: ReadWorld, k: number) {
    const row = legRow(wd, k);
    return {
      row,
      open: legOpen(wd, k),
      done: legDone(wd, k),
      reached: legReached(wd, k),
      laid: Math.min(RAIL_LEGS[k]!.sections.length, row.laid),
    };
  }
  function rows() {
    if (!adapter.read.whole()) return null;
    const wd = adapter.read.world(),
      route = routeRow(wd),
      stock = rail(wd),
      per = legs.map((l) => legRows(wd, l.sp.k)),
      open = legs.findIndex((_l, i) => per[i]!.open);
    return {
      wd,
      per,
      /** The open leg's index into `legs`, or -1 (one is open at a time on the whole route). */
      open,
      joined: aperture(wd).joined >= 0,
      // The racks are the open leg's only once it is open (before, Rail.depot is a Q job's).
      rack: open >= 0 ? { logs: stock.depot, rails: stock.depotRails } : { logs: 0, rails: 0 },
      grants: route.grants,
      gates: route.gates,
      reached: route.reached >= 0,
      arrived: route.arrived >= 0,
      pick: !!(route.grants & 1),
      gate: !!(route.gates & 1),
      steelStep: steelStep(wd),
    };
  }
  /** The steel loop's step, or null before the rivet and once line 2 wears the longer boiler (BOILER_SPEED row 2). */
  function steelStep(wd: ReadWorld): keyof typeof STEEL_OBJECTIVES | null {
    if (aperture(wd).joined < 0 || line(wd, LINE2).boiler >= 2) return null;
    const s = steel(wd);
    if (shed(wd).steel > 0) return 'install';
    if (s.lit >= 0) return 'cast';
    return s.yardLogs + s.yardRails + s.logs + s.rails > 0 ? 'feed' : 'kit';
  }
  /** Whether the camera or your body is within `radius` metres of `c`. */
  const near = (c: { x: number; z: number }, radius: number) => {
    const b = me.body?.position;
    return (
      Math.hypot(camera.position.x - c.x, camera.position.z - c.z) < radius ||
      (!!b && Math.hypot(b.x - c.x, b.z - c.z) < radius)
    );
  };
  const nearGorge = () => near(gorgeAt(0, 0), 700);

  let objective = '',
    drawnDeck = '';
  function draw() {
    const r = rows();
    for (const s of signs) s.mesh.visible = false;
    things.mesh.visible = deck.mesh.visible = !!r;
    // With nothing laid the stack line's end is Ring Island's run-off, which belongs to the island's near view: its
    // deck, its slabs and the buffers (drawn and solid) stand only while that view is mounted. Across the sea the
    // island is its far cones, and a slab there would float over the bare hillside.
    const ends = legs.map((l, i) => {
      const lr = r?.per[i] ?? null,
        e = l.end(lr, shown(l, lr));
      if (e < 0) l.clear();
      return e;
    });
    // The slabs and standing pieces first, so a slab that waits for you is not drawn this frame either.
    if (r)
      legs.forEach((l, i) => {
        if (ends[i]! >= 0)
          l.solid(
            r.per[i]!.laid,
            legs.some((o, j) => o.sp.joins === l.sp.leg.id && r.per[j]!.laid > 0),
          );
      });
    // The deck batch is shared: rewritten when any leg's end moves or a slab starts or stops waiting.
    const key = `${ends.join()}|${legs.map((l) => l.held()).join()}`;
    if (key !== drawnDeck) {
      drawnDeck = key;
      deck.begin();
      legs.forEach((l, i) => {
        if (ends[i]! >= 0) l.drawDeck(ends[i]!, r!.per[i]!.laid);
      });
      deck.commit();
    }
    things.begin();
    if (!r) return things.commit();
    legs.forEach((l, i) => {
      if (ends[i]! >= 0) l.draw(r.per[i]!, r.wd, r.joined);
    });
    // The open leg's current section: its frame, bill, rack and plate (the stack's while Ring Island's near view
    // stands, as its deck does with nothing laid).
    const o = r.open >= 0 ? legs[r.open]! : null;
    if (o && shown(o, r.per[r.open]!)) site(o, r, r.per[r.open]!);
    yard(r);
    gorge(r);
    bell(r);
    areaBoardVisibility.get('quay.wall')?.(legRow(r.wd, wall.k).laid === 0);
    if (plugSite && near(plugSite, 450)) barrier(plugSite, !!(r.gates & (1 << PLUG)));
    if (deepFrameBuilt(r) && near(deepSite, 450)) barrier(deepSite, !!(r.gates & (1 << deepSpan)));
    canopy(r);
    if (near(causeway.frames[0]!, 450)) {
      const sp = causeway;
      barrier(sp.frames[0]!, !!(r.gates & (1 << CAUSEWAY)));
      if (!done(r, 'causeway')) {
        const s = BELL_STOP + 15;
        sp.geo.at(s, P);
        sp.geo.world(s, -ROW_PLATFORM, q);
        show(causewayBoard, q, sp.geo.y(s) + 0.9, -P.ux, -P.uz, [
          { t: sp.name, size: 0.34 },
          { t: legOpen(r.wd, sp.k) ? UNDER_WAY : 'LATER', size: 0.22 },
        ]);
      }
    }
    if (near(LANTERN_AT, 450) && !(r.grants & (1 << LANTERN))) {
      // The reef is below rail height. Raise the lamp above the buffer faces on the train's approach.
      things.box(LANTERN_AT.x, LANTERN_AT.y + 2.4, LANTERN_AT.z, 0.4, 4.8, 0.4, GREY_DARK);
      things.box(
        LANTERN_AT.x,
        LANTERN_AT.y + 5.2,
        LANTERN_AT.z,
        1.1,
        0.9,
        1.1,
        done(r, 'notch-tunnel') ? '#ffd46b' : GREY,
      );
    }
    if (near(MEETING_AT, 450)) {
      show(meetingBoard, MEETING_AT, MEETING_AT.y, 0, -1, [
        { t: r.arrived ? 'Arrived' : 'Meeting (placeholder)', size: 0.28 },
      ]);
    }
    things.commit();
    note(r);
  }
  const put = (site: Site, a: number, t: number, y: number, w: number, h: number, d: number, c: string) => {
    const p = local(site, a, t);
    things.box(p.x, site.y + y, p.z, w, h, d, c, site.yaw);
  };
  /** `logs` logs and `rails` rails stacked at `k` (a frame's fill, a pallet's load). */
  function load(k: Site, logs: number, rails: number) {
    for (let i = 0; i < logs; i++)
      put(k, -1.05 + (i % 5) * 0.22, 0, 0.24 + Math.floor(i / 5) * 0.22, 1.7, 0.2, 0.2, LOG);
    for (let i = 0; i < rails; i++)
      put(k, 0.2 + (i % 5) * 0.2, 0, 0.18 + Math.floor(i / 5) * 0.12, 1.7, 0.1, 0.1, RAIL);
  }
  /** Up to 40 logs and 40 rails lying on a pallet at `k`. */
  function pile(k: Site, logs: number, rails: number) {
    put(k, 0, 0, 0.06, 1.9, 0.12, 2.6, GREY_DARK);
    load(k, Math.min(logs, 40), Math.min(rails, 40));
  }
  function framePosts(f: Site) {
    // The frame: 2.6 m along, 2.0 m across: a pallet, four posts and two top rails; the fed logs and rails inside.
    put(f, 0, 0, 0.06, 2.0, 0.12, 2.6, GREY_DARK);
    for (const a of [-1.25, 1.25]) for (const t of [-0.95, 0.95]) put(f, a, t, 0.85, 0.1, 1.7, 0.1, GREY);
    for (const t of [-0.95, 0.95]) put(f, 0, t, 1.65, 0.1, 0.1, 2.6, GREY);
  }
  function site(l: (typeof legs)[number], r: NonNullable<ReturnType<typeof rows>>, lr: LegRows) {
    const { sp } = l,
      laid = lr.laid,
      n = sp.leg.sections.length,
      f = sp.frames[laid]!,
      k = sp.racks[laid]!,
      sec = sp.leg.sections[laid]!,
      num = String(laid + 1),
      laying = lr.row.start >= 0;
    framePosts(f);
    load(f, Math.min(lr.row.logs, sec.logs), Math.min(lr.row.rails, sec.rails));
    const where = laying
      ? 'LAYING THE SECTION'
      : r.rack.logs + r.rack.rails > 0
        ? 'KIT: ON THE RACK'
        : 'KIT: ON A TRAIN';
    show(
      bill,
      local(f, 1.5, 0),
      f.y,
      f.tx,
      f.tz,
      [
        { t: sp.name, size: 0.2 },
        { t: `SECTION ${num} OF ${n}`, size: 0.15 },
        { t: `LOGS ${lr.row.logs}/${sec.logs}   RAILS ${lr.row.rails}/${sec.rails}`, size: 0.15 },
        { t: where, size: 0.13 },
      ],
      num,
    );
    // The rack: a pallet, the logs and rails a train has set down, and the plate with the section's number. A unit
    // still in the air from a kit car (railway/kit-board.ts) is drawn on the rack once it lands.
    pile(k, r.rack.logs - legKitFlight.logs, r.rack.rails - legKitFlight.rails);
    show(plate, local(k, -1.6, 0), k.y, k.tx, k.tz, [{ t: `KIT ${num}`, size: 0.5 }], num);
  }
  /** High Gorge's yard (the incline's, greybox leg 2): the units line 2 has set down past what its first rack lacks,
   * on a pallet beside that rack, until the `ns` trains take them on. Unlabelled (no new copy). */
  const yards = legs.flatMap((l, i) => (l.sp.leg.kit !== 'home' ? [{ l, i }] : []));
  function yard(r: NonNullable<ReturnType<typeof rows>>) {
    for (const { l, i } of yards) {
      if (!r.per[i]!.open) continue;
      const y = legYard(r.wd, l.sp.k),
        logs = y.logs - legYardFlight.logs,
        rails = y.rails - legYardFlight.rails;
      if (logs <= 0 && rails <= 0) continue;
      const rack = l.sp.racks[0]!,
        at = legYardSpot(l.sp.k);
      pile({ ...rack, x: at.x, z: at.z }, logs, rails);
    }
  }
  /** High Gorge: the pickup post, the barrier on the incline's first frame and the stand-in town's board, while you
   * are near it (into `things`). */
  function gorge(r: NonNullable<ReturnType<typeof rows>>) {
    if (!nearGorge()) return;
    const north = gorgeAt(0, -1),
      o = gorgeAt(0, 0),
      toSplit = { x: o.x - north.x, z: o.z - north.z },
      alongA = { x: gorgeAt(1, 0).x - o.x, z: gorgeAt(1, 0).z - o.z },
      yawA = Math.atan2(alongA.x, alongA.z),
      stackDone = done(r, 'stack');
    if (!r.pick)
      things.box(PICK_AT.x, PICK_AT.y + 0.7, PICK_AT.z, 0.5, 1.4, 0.5, stackDone ? '#e8b72c' : GREY_DARK, yawA);
    show(pickPlate, { x: PICK_AT.x - alongA.x * 1.6, z: PICK_AT.z - alongA.z * 1.6 }, PICK_AT.y, toSplit.x, toSplit.z, [
      { t: 'POWERED PICK', size: 0.34 },
      { t: r.pick ? 'TAKEN' : stackDone ? 'TAKE IT' : 'NOT YET', size: 0.26 },
    ]);
    // The barrier on the incline's first frame (greybox-leg2.md, step 4: moved from the pad behind the south platform,
    // which stays), barring it from the platform's side; its plate over it, facing the platform.
    const f = incline?.sp.frames[0];
    if (f) {
      barrier(f, r.gate);
      show(gatePlate, local(f, 0, -1.35), f.y, -f.tx, -f.tz, [
        { t: 'BARRIER: THE INCLINE', size: 0.3 },
        { t: r.gate ? 'OPEN' : r.pick ? 'SHUT' : 'NEEDS THE POWERED PICK', size: 0.24 },
      ]);
    }
    const t = gorgeAt(TOWN_PAD.a1 - 1.2, (TOWN_PAD.c0 + TOWN_PAD.c1) / 2);
    show(townBoard, t, GORGE_DECK, alongA.x, alongA.z, [
      { t: 'HIGH GORGE TOWN', size: 0.3 },
      { t: 'STAND-IN: 3 PLOTS STAKED', size: 0.2 },
    ]);
  }
  /** A barrier on a frame `site`: two posts and a panel on the side away from the rails, lifted to a bar once open. */
  function barrier(site: Site, open: boolean) {
    for (const a of [-1.85, 1.85]) put(site, a, -1.35, 1.3, 0.3, 2.6, 0.3, GREY_DARK);
    put(site, 0, -1.35, open ? 2.5 : 1.1, 0.2, open ? 0.2 : 1.6, 3.4, open ? CLEAR : DANGER);
  }
  const nearBell = () => near(AREA_CENTRES.bell, 450);
  /** What each pad's sign was last painted with, by the relabel it was painted through (a remount paints again). */
  const padPainted = new Map<string, { by: (lines: readonly string[]) => void; text: string }>();
  /** Bell Rock, while you are near it: the seeds post (until taken), the Canopy barrier, the stalls risen on their
   * pads with the pads reading connected, and the board for the bay line. */
  function bell(r: NonNullable<ReturnType<typeof rows>>) {
    if (!nearBell()) return;
    if (!(r.grants & (1 << SEEDS)))
      things.box(SEEDS_AT.x, SEEDS_AT.y + 0.7, SEEDS_AT.z, 0.5, 1.4, 0.5, done(r, 'incline') ? '#4fd1c5' : GREY_DARK);
    // Frame 1 and rack 1 are the leg's own site (site(), while it is open); the barrier stands on that frame.
    barrier(CANOPY_SITE, !!(r.gates & (1 << CANOPY)));
    for (const pad of bellPads) {
      const leg = STALLS[pad.id],
        on = !!leg && done(r, leg);
      // A stall's box: a counter on the pad's +e half, low enough that its sign (on the -e edge, facing +e) reads over
      // it. Drawn only: it holds nobody.
      if (on)
        things.box(
          pad.x + Math.cos(pad.yaw) * 0.8,
          pad.y + 0.45,
          pad.z - Math.sin(pad.yaw) * 0.8,
          2.2,
          0.9,
          4,
          GREY_LIGHT,
          pad.yaw,
        );
      const base = LEG2_TEXT[pad.id],
        relabel = areaLabels.get(pad.id);
      if (!base || !relabel) continue;
      const lines = on ? [base[0]!, CONNECTED] : base,
        text = lines.join('|'),
        was = padPainted.get(pad.id);
      if (was?.by === relabel && was.text === text) continue;
      relabel(lines);
      padPainted.set(pad.id, { by: relabel, text });
    }
    if (bay && done(r, 'incline') && !done(r, 'bay-cut')) {
      bay.sp.geo.at(HOME_BOARD_S, P);
      bay.sp.geo.world(HOME_BOARD_S, 0, q);
      show(homeBoard, q, bay.sp.geo.y(HOME_BOARD_S), P.ux, P.uz, [
        { t: HOME_LINE, size: 0.3 },
        { t: BUILT_FROM_HOME, size: 0.22 },
      ]);
    }
  }
  const nearCanopy = () => near(AREA_CENTRES.canopy, 450);
  /** Canopy's cloth post, construction board and barrier on the Notch frame. */
  function canopy(r: NonNullable<ReturnType<typeof rows>>) {
    if (!nearCanopy()) return;
    areaBoardVisibility.get('canopy.notch')?.(!done(r, 'notch-tunnel'));
    const label = 'canopy.notch';
    const relabel = areaLabels.get(label);
    const text = legOpen(r.wd, legIndex.get('notch-tunnel')!) ? UNDER_WAY : 'LATER';
    const previous = padPainted.get(label);
    if (relabel && (previous?.by !== relabel || previous.text !== text)) {
      relabel(['LINE TO LANTERN NOTCH', text]);
      padPainted.set(label, { by: relabel, text });
    }
    if (!(r.grants & (1 << CLOTH)))
      things.box(
        CLOTH_AT.x,
        CLOTH_AT.y + 0.7,
        CLOTH_AT.z,
        0.5,
        1.4,
        0.5,
        done(r, 'bell-canopy') ? CLOTH_LIT : GREY_DARK,
      );
    barrier(notch.frames[0]!, !!(r.gates & (1 << NOTCH)));
  }
  /** Leg 2's steps once the incline's barrier is open: build the incline, take the seeds, build the bay line (beats 3
   * to 10; the seeds first, though the bay cut does not need them); then leg 3's (greybox-leg3.md, "Controls and
   * copy"): open the Canopy barrier, build the line, take the cloth, ride home. */
  function leg2Objective(r: NonNullable<ReturnType<typeof rows>>) {
    if (!incline) return '';
    if (!done(r, 'incline')) return LEG_OBJECTIVES.incline;
    if (!(r.grants & (1 << SEEDS))) return LEG_OBJECTIVES.seeds;
    if (!bay) return '';
    if (!done(r, 'bay-cut')) return LEG_OBJECTIVES.bay;
    if (!(r.gates & (1 << CANOPY))) return LEG_OBJECTIVES.canopyGate;
    if (!done(r, 'bell-canopy')) return LEG_OBJECTIVES.canopy;
    if (!(r.grants & (1 << CLOTH))) return LEG_OBJECTIVES.cloth;
    if (!(r.gates & (1 << PLUG))) return LEG_OBJECTIVES.plug;
    if (!done(r, 'cave')) return LEG_OBJECTIVES.cave;
    if (done(r, 'wall')) {
      if (!(r.gates & (1 << NOTCH))) return LEG_OBJECTIVES.notchGate;
      if (!done(r, 'notch-tunnel')) return LEG_OBJECTIVES.notch;
      if (!(r.grants & (1 << LANTERN))) return LEG_OBJECTIVES.lantern;
      if (!(r.gates & (1 << CAUSEWAY))) return LEG_OBJECTIVES.causewayGate;
      if (!done(r, 'causeway')) return LEG_OBJECTIVES.causeway;
      return r.arrived ? LEG_OBJECTIVES.arrived : LEG_OBJECTIVES.island;
    }
    if (legRow(r.wd, wall.k).laid === 5 && !(r.gates & (1 << deepSpan))) return LEG_OBJECTIVES.deepSpan;
    return LEG_OBJECTIVES.wall;
  }
  /** The objective line's text, to the play record (no on-screen line on the route). */
  function note(r: NonNullable<ReturnType<typeof rows>>) {
    const s = r.per[legIndex.get('stack')!]!,
      laid = s.laid,
      of = RAIL_LEGS[0]!.sections.length;
    const text = !s.reached
      ? ''
      : !s.done
        ? r.steelStep
          ? STEEL_OBJECTIVES[r.steelStep]
          : laid === 0
            ? LEG_OBJECTIVES.first
            : LEG_OBJECTIVES.next(laid + 1, of)
        : !r.pick
          ? LEG_OBJECTIVES.open
          : !r.gate
            ? LEG_OBJECTIVES.gate
            : leg2Objective(r);
    if (text !== objective) {
      objective = text;
      if (text) playObjective(text);
    }
  }

  const v3 = (p: { x: number; z: number }, y: number) => new THREE.Vector3(p.x, y, p.z);
  draw();
  return {
    /** The stack's crossovers' toes (J12), for railway/turnout-blades.ts. */
    points: legs.flatMap((l) => l.points),
    restore: draw,
    update: draw,
    accepted() {},
    /** Feed the frame and the rack's two takes while a leg is open; the pickup and the barrier at High Gorge. An
     * empty or wrong back meets "Feed the frame" blocked with its reason, never silence; a shut barrier's frame
     * meets the barrier's own prompt, on the same spot. */
    targets(): Interactable[] {
      const p = me.body?.position,
        r = rows();
      if (!p || !r || !adapter.read.ready()) return [];
      const { wd } = r,
        mine = account(wd, adapter.read.pid),
        out: Interactable[] = [];
      const o = r.open >= 0 ? legs[r.open]! : null,
        lr = o ? r.per[r.open]! : null;
      if (o && lr && shown(o, lr)) {
        const { sp } = o,
          laid = lr.laid,
          f = sp.frames[laid]!,
          k = sp.racks[laid]!,
          sec = sp.leg.sections[laid]!,
          shut = sec.gate !== undefined && !(r.gates & (1 << sec.gate));
        if (lr.row.start < 0 && !shut && within(p, f, legFrame(sp.leg, laid).reach)) {
          const needLogs = lr.row.logs < sec.logs,
            needRails = lr.row.rails < sec.rails;
          if (needLogs || needRails) {
            const fills = ((mine?.carry ?? 0) > 0 && needLogs) || ((mine?.rails ?? 0) > 0 && needRails);
            const target = { id: 'railway-leg-feed', verb: FEED, at: v3(f, f.y + 1.5) };
            out.push(
              fills
                ? { ...target, run: () => void adapter.feedLeg(sp.k) }
                : { ...target, blocked: needLogs && needRails ? BRING_BOTH : needLogs ? BRING_LOGS : BRING_RAILS },
            );
          }
        }
        if (within(p, k, legRack(sp.leg, laid).reach)) {
          // A blocked prompt carries its reason and no `run`.
          const take = (id: string, verb: string, kind: number, along: number, run: () => void): Interactable => {
            const target = { id, verb, at: v3(local(k, along, 0), k.y + 1.3) };
            const full =
              mine && roomOf(wd, mine, kind) <= 0
                ? heldBig(wd, mine)
                  ? HANDS_FULL
                  : kind === RAILS
                    ? RAILS_FULL
                    : LOGS_FULL
                : null;
            return full ? { ...target, blocked: full } : { ...target, run };
          };
          if (r.rack.logs > 0)
            out.push(take('railway-leg-take-logs', TAKE_LOGS, LOGS, -0.6, () => void adapter.depotTake()));
          if (r.rack.rails > 0)
            out.push(take('railway-leg-take-rails', TAKE_RAILS, RAILS, 0.6, () => void adapter.depotRailTake()));
        }
      }
      // The pickup refuses until the fourth section is laid ("Not yet": call 28); the barrier until the room holds
      // the pick, and then until the leg it shuts is open.
      const stackDone = done(r, 'stack');
      if (!r.pick && within(p, PICK_AT, 400)) {
        const target = { id: 'railway-leg-pick', verb: TAKE_PICK, at: v3(PICK_AT, PICK_AT.y + 1.6) };
        out.push(stackDone ? { ...target, run: () => void adapter.takeGrant(0) } : { ...target, blocked: NOT_YET });
      }
      if (!r.gate && within(p, GATE_AT, 1260)) {
        const target = { id: 'railway-leg-gate', verb: OPEN_GATE, at: v3(GATE_AT, GATE_AT.y + 1.6) },
          shuts = gateLeg(0);
        out.push(
          !r.pick
            ? { ...target, blocked: NEEDS_PICK }
            : shuts && legOpen(wd, shuts.leg)
              ? { ...target, run: () => void adapter.openGate(0) }
              : { ...target, blocked: NO_LINE },
        );
      }
      // A key's post (RAIL_GRANTS k at `at`) refuses until the leg `after` is laid: the seeds at Bell Rock after the
      // incline (greybox leg 2), the glider cloth at Canopy after leg 3.
      const grant = (
        k: number,
        id: string,
        verb: string,
        at: Site | typeof SEEDS_AT,
        after: string,
        notYet: string,
      ) => {
        if (r.grants & (1 << k) || !within(p, at, RAIL_GRANTS[k]!.at.reach)) return;
        const target = { id, verb, at: v3(at, at.y + 1.6) };
        out.push(done(r, after) ? { ...target, run: () => void adapter.takeGrant(k) } : { ...target, blocked: notYet });
      };
      grant(SEEDS, 'railway-leg-seeds', TAKE_SEEDS, SEEDS_AT, 'incline', SEEDS_NOT_YET);
      grant(CLOTH, 'railway-leg-cloth', TAKE_CLOTH, CLOTH_AT, 'bell-canopy', CLOTH_NOT_YET);
      // A barrier opens at its current frame when the room holds the key.
      const gate = (k: number, id: string, at: { x: number; y: number; z: number }, blocked = NO_LINE) => {
        if (r.gates & (1 << k) || !within(p, at, RAIL_GATES[k]!.at.reach)) return;
        const target = { id, verb: OPEN_GATE, at: v3(at, at.y + 1.6) },
          shuts = gateLeg(k);
        out.push(
          shuts &&
            legOpen(wd, shuts.leg) &&
            legRow(wd, shuts.leg).laid === shuts.section &&
            r.grants & (1 << RAIL_GATES[k]!.needs)
            ? { ...target, run: () => void adapter.openGate(k) }
            : { ...target, blocked },
        );
      };
      gate(CANOPY, 'railway-leg-canopy', CANOPY_SITE);
      if (plugSite)
        gate(PLUG, 'railway-leg-plug', plugSite, r.pick ? 'After the line to Canopy (placeholder)' : NEEDS_PICK);
      gate(
        NOTCH,
        'railway-leg-notch',
        notch.frames[0]!,
        r.grants & (1 << CLOTH) ? 'After the White Wall (placeholder)' : 'Needs the glider cloth',
      );
      gate(
        CAUSEWAY,
        'railway-leg-causeway',
        causeway.frames[0]!,
        r.grants & (1 << LANTERN) ? 'After the line to Lantern Notch (placeholder)' : 'Needs the lantern',
      );
      grant(
        LANTERN,
        'railway-leg-lantern',
        'Take the lantern',
        LANTERN_AT,
        'notch-tunnel',
        "The line to the Notch isn't laid yet",
      );
      if (!r.arrived && within(p, MEETING_AT, RAIL_ARRIVAL.reach)) {
        const target = {
          id: 'railway-leg-arrive',
          verb: 'Arrive (placeholder)',
          at: v3(MEETING_AT, MEETING_AT.y + 1.6),
        };
        out.push(r.reached ? { ...target, run: () => void adapter.arrive() } : { ...target, blocked: NOT_YET });
      }
      if (deepFrameBuilt(r))
        gate(
          deepSpan,
          'railway-leg-deep-span',
          deepSite,
          r.grants & (1 << SEEDS) ? NO_LINE : 'Needs the crystal seeds',
        );
      return out;
    },
    inspect: () => {
      const r = rows(),
        s = r?.per[legIndex.get('stack')!];
      return {
        legView: {
          laid: s?.laid ?? null,
          ...stack.inspect(),
          boxes: deck.count + things.count,
          bill: bill.mesh.visible ? bill.text : null,
          plate: plate.mesh.visible ? plate.text : null,
          frame: s ? { logs: s.row.logs, rails: s.row.rails, laying: s.row.start >= 0 } : null,
          rack: r?.rack ?? null,
          open: r && r.open >= 0 ? legs[r.open]!.sp.leg.id : null,
          pick: r?.pick ?? false,
          gate: r?.gate ?? false,
          objective,
          legs: Object.fromEntries(
            legs.map((l, i) => [l.sp.leg.id, { laid: r?.per[i]?.laid ?? null, ...l.inspect() }]),
          ),
        },
      };
    },
  };
}

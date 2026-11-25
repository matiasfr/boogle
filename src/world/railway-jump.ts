// Playtest jump-ins (docs/plans/playtest-jump-in.md): the owner-readable catalog of stages a fresh private room can be
// seeded at, and the room names and wire shapes of POST /jump. Headless: the game (the Jump in page, the ?from= link,
// the arrival's landing) and the server (server/src/jump.ts) both import it. Only `type SeedStage` comes from the seed
// builders, so none of their code reaches the client bundle. Adding a row: src/sim/railway-seeds.ts's header.
import type { SeedStage } from '../sim/railway-seeds.ts';
import { AXIS, HALL, TILL } from '../place/home-station.ts';
import {
  LINE2_BOILER,
  LINE2_GLIDE,
  LINE2_HOOK,
  LINE2_LEVER,
  LINE2_SEA,
  LINE2_STATIONS,
} from '../sim/railway-line2-layout.ts';
import { RING_HALT, RING_HEAD, RING_JOINT_UP, RING_STEEL_WORKS, ringAt } from '../sim/railway-ring-layout.ts';
import { CROSSING_BENTS, PIER_STOP, SHED_TABLE, WORKS_KILN, WORKS_RACK } from '../sim/railway-works-layout.ts';
import { RAIL_LINES } from '../sim/railway-lines.ts';
import { RAIL_GRANTS, RAIL_LEGS, legFrame, legRack } from '../sim/railway-route.ts';

/** Where a jump-in lands, in metres on world axes; y is the surface stood on (terrain, pad or deck). */
export type JumpLand = { x: number; y: number; z: number; yaw?: number };
export type Jump = {
  stage: SeedStage | 'start';
  label: string; // owner-readable, shown in the menu and in playtest summaries
  line: string; // one short line under the label
  land?: JumpLand; // omitted: the usual spawn
  /** `false`: tooling only (bots, looks, checkpoints, `?from=<stage>`), never a button in a menu: the owner's call for one
   * live game and a fast-forward in the room, not new jump-in rooms (docs/agents/owner-calls.md). */
  menu?: false;
};

type Cm = { readonly x: number; readonly z: number };
/** A landing `dx`, `dz` metres from a layout anchor (world cm), standing on surface `y`, facing `toward` (or `yaw`). */
function near(anchor: Cm, dx: number, dz: number, y: number, toward: Cm | number): JumpLand {
  const x = anchor.x / 100 + dx,
    z = anchor.z / 100 + dz;
  // Forward is (-sin yaw, -cos yaw).
  const yaw = typeof toward === 'number' ? toward : Math.atan2(x - toward.x / 100, z - toward.z / 100);
  return { x, y, z, yaw: Math.round(yaw * 1000) / 1000 };
}

/** The Pier's three landings (call 57, v27): the east platform's south end, s 720.5 m, lat +2.9 (the path point plus
 * 2.9 m east, worked from Place's line), on its deck (rail 24.3 m + 0.72), facing the crossing; the spots before v27
 * (lat +3 and +4 on the apron) are inside the platform and the rack. R4a draws the platform: until then this lands
 * 0.7 m above the apron and drops onto it. */
const PIER_LAND = near(PIER_STOP, 3.15, 5.87, 25.0, CROSSING_BENTS[0]!);

/** The ring's landings (R5): the Railhead's platform at its last bent (middle, deck + 90 cm) and the joint's west platform
 * (where the outbound lever stands), both facing out along the line toward the island. `y` is the platform's top. */
const ringLand = (p: { x: number; z: number; y: number }, lat: number): JumpLand =>
  near(p, 0, 0, p.y / 100, ringAt(28500, lat));
const RAILHEAD_LAND = ringLand(RING_HEAD[7]!.platform, 405);
const JOINT_LAND = ringLand(RING_JOINT_UP, -770);

/** Ring Island build 2 (R4, v31). The island halt's east (down) platform at u 444, lat +4, on its deck, facing the
 * works' doorway (u 452, lat +6.5), beside the loader's mast (V1). */
const STEEL_LAND = near({ ...ringAt(44400, 400) }, 0, 0, RING_HALT.down.y / 100, RING_STEEL_WORKS);
/** Beside Home's spur table, 5.2 m east and 1.7 m south, facing its centre. The garage's radial stand and the
 * stall roads clear this landing, inside the table's 6 m reach (home-flip X1). */
const TABLE_LAND = near(SHED_TABLE, 9.2, 1.7, 18.1, SHED_TABLE);
/** Line 1's Village and Camp platforms (slice 5's freight-running lands on the first, facing the second). */
const VILLAGE_LINE1 = RAIL_LINES[0]!.halts[0]!.platforms[0],
  CAMP_LINE1 = RAIL_LINES[0]!.halts[1]!.platforms[0];
/** Line 2's Village and Quarry platforms (slice 5's fares-running lands on the first, where riders board, facing the
 * second: along the line; boiler-long lands there too, to ride out at 25 m/s). */
const VILLAGE_LINE2 = RAIL_LINES[1]!.halts[0]!.platforms[0],
  QUARRY_LINE2 = RAIL_LINES[1]!.halts[1]!.platforms[0];
const LOADER_LAND = near(QUARRY_LINE2, 0, 0, QUARRY_LINE2.y / 100, WORKS_RACK);

/** The greybox route's leg 1 (step 5). Ring Island's first frame and rack stand on the island's west platform, 7 m
 * apart (deck 8.9 m): land between them, in the 4 m reach of both, facing the frame. The Gorge: the north platform at
 * the halt's stop, on its deck (the halt's catalog point is the rail, 3.0 m, and the deck stands 0.9 m over it),
 * facing the pickup post on the north rim, where the objective points. */
function betweenRackAndFrame(slot: number, section: number): JumpLand {
  const leg = RAIL_LEGS[slot]!,
    frame = legFrame(leg, section),
    rack = legRack(leg, section);
  return near({ x: (frame.x + rack.x) / 2, z: (frame.z + rack.z) / 2 }, 0, 0, frame.y / 100, frame);
}
const STACK_LAND = betweenRackAndFrame(0, 0);
const GORGE_HALT = RAIL_LINES[1]!.halts.find((h) => h.name === 'High Gorge')!.platforms[0],
  // The halt's point is on the rails; the north platform (the down track's, lat +1.8 to +6.3: route-greybox/massing.ts)
  // lies 4 m to the north, along -C of the split's frame (-0.5162, 0.8565), and a train stands on the rails.
  GORGE_LAND = near(GORGE_HALT, 0.5162 * 4.05, -0.8565 * 4.05, GORGE_HALT.y / 100 + 0.9, RAIL_GRANTS[0]!.at);

// B2: clear of the first board's post, 1.8 m toward the hall; the built landing is on the green,
// east of the statue, facing the house. Surface/clearance checked in the live collision probe and both stills.
// World x = Place-local x + 1000. These are landing coordinates only, not simulation/save state.
const HOUSE_READY: JumpLand = { x: 904.6, y: 18, z: 33.4, yaw: 3.142 };
const HOUSE_BUILT: JumpLand = { x: 890, y: 17.2, z: 22, yaw: -2.076 };

/** In route order. Labels and lines are UI text (not The Boogler's), logged in docs/agent-calls.md. Each `land` was
 * checked with a still (docs/plans/playtest-jump-in.md, step 7); `y` is the surface measured there. */
export const JUMPS: readonly Jump[] = [
  { stage: 'start', label: 'From the beginning', line: 'A fresh world, nothing built' },
  { stage: 'awake', label: 'Just woke', line: "The track layer is awake; T1's logs are next" },
  { stage: 't1-pack-first', menu: false, label: 'Pack first', line: 'Station 1 is laid with the pack taken' },
  { stage: 't1-jump-first', menu: false, label: 'Jump first', line: 'Station 1 is laid with the jump taken' },
  {
    stage: 'q1-done',
    label: 'Cart starts',
    line: "Q1 laid; the cart brings Q2's logs",
    land: near(LINE2_STATIONS[1]!, -4, 4, 18.1, LINE2_STATIONS[1]!), // by Q2's frame
  },
  {
    stage: 'hook-taken',
    label: 'Hook earned',
    line: 'Q2 laid and the hook shot is yours; Q3 is next',
    land: near(LINE2_HOOK, -2, 2.5, LINE2_HOOK.y / 100, LINE2_STATIONS[2]!), // on pillar p2's pad, facing Q3
  },
  {
    stage: 'hook-earned',
    label: 'Quarry gate',
    line: 'Q3 laid, hook in hand; the quarry lever is next',
    land: near(LINE2_LEVER, 2, 3, 26.2, LINE2_LEVER), // on the quarry apron, facing the lever
  },
  {
    stage: 'q4-done',
    label: 'Sea switch',
    line: 'Q4 laid; the sea gate switch is next',
    land: near(LINE2_STATIONS[4]!, -3, 4, 24.3, LINE2_SEA), // beside Q5's frame, facing the gate's jamb
  },
  {
    stage: 'q5-done',
    label: 'Boiler waiting',
    line: 'Q5 laid; the boiler sits on its pedestal',
    land: near(LINE2_BOILER, -3.5, 3, 18.3, LINE2_BOILER), // beside the pedestal, off the track
  },
  {
    stage: 'glide-earned',
    label: 'Glide earned',
    line: "The glider is yours, up on Needle Bell's summit",
    land: near(LINE2_GLIDE, -2, -0.5, LINE2_GLIDE.y / 100, LINE2_STATIONS[0]!), // on the summit deck, facing the glide home
  },
  { stage: 'trains-on', label: 'Trains running', line: 'The boiler is fitted and both lines run' },
  // Slice 5 (R1, R2). Its position was checked with a still on Windows/Edge, 12 November (on the platform, not
  // clipped); not on a device. Facing: camera and yaw toward the Camp, measured on Windows/Edge 12 November; the
  // avatar is drawn face to camera on landing, as on other rows.
  {
    stage: 'freight-running',
    label: 'Timber home',
    line: "Line 1's first load of timber is at the Village; plot 1 is staked",
    land: near(VILLAGE_LINE1, 0, 0, VILLAGE_LINE1.y / 100, CAMP_LINE1), // the Village's line 1 platform, facing the Camp
  },
  // Slice 5 (R3). 5 m on along the platform from where riders board, so the station canopy's post and roof are
  // behind the follow camera; checked with a still on Windows/Edge, 12 November (on the platform, not clipped, yaw
  // -1.647); not on a device.
  {
    stage: 'fares-running',
    label: 'Fares paid',
    line: "Riders board at the Village's line 2 platform; the strongbox holds 100 Boogles",
    land: near(VILLAGE_LINE2, 4.7, -1.71, VILLAGE_LINE2.y / 100, QUARRY_LINE2), // 5 m on along Home's 70° island axis, facing the Quarry
  },
  {
    stage: 'house-ready',
    menu: false,
    label: 'Ready to build',
    line: 'The first plot is staked and the strongbox can pay for its house',
    land: HOUSE_READY,
  },
  {
    stage: 'house-built',
    menu: false,
    label: 'House built',
    line: 'The first house is built and sends riders to the trains',
    land: HOUSE_BUILT,
  },
  {
    stage: 'sack-waiting',
    menu: false,
    label: 'Sack waiting',
    line: 'Back after a night: the coin sack is on the counter',
    // Tooling-only C1 landing, inside the hall facing the till; visual proof belongs to C2.
    land: {
      x: 1000 + TILL.x + AXIS.n.x * 2,
      y: HALL.floor,
      z: TILL.z + AXIS.n.z * 2,
      yaw: TILL.yaw - Math.PI / 2,
    },
  },
  {
    stage: 'q6-done',
    label: 'Pier reached',
    line: 'Q6 laid to the pier; the forge has cast the breaker',
    land: PIER_LAND, // the Pier platform's south end, facing the crossing
  },
  {
    stage: 'works-open',
    label: 'Works open',
    line: 'Split-rock Works is open; the kiln is cold',
    land: near(WORKS_KILN, -6, 0, 24, WORKS_KILN), // in front of the kiln, clear of its walls
  },
  {
    stage: 'yard-wagon',
    menu: false,
    label: 'Loader yard',
    line: 'The loader yard stands; footings ride every line 2 train',
    land: LOADER_LAND,
  },
  {
    stage: 'crossing-finishing',
    label: 'Crossing almost finished',
    line: 'Ten pier footings set; the last two wait on the pier rack',
    land: PIER_LAND, // crossing-done's spot, by the rack
  },
  {
    stage: 'crossing-done',
    label: 'Crossing built',
    line: 'The Split-rock crossing is complete',
    land: PIER_LAND, // the Pier platform's south end, facing the crossing
  },
  // v27 (ring-island-build1, R3b). Both land at the Pier until R4 draws Q7's deck and the island's halt.
  {
    stage: 'deck-laid',
    label: 'Deck laid',
    line: "Q7 laid over the six bents; the wagon brings the ring's footings",
    land: PIER_LAND, // the Pier platform's south end, facing the crossing
  },
  {
    stage: 'gap-footed',
    label: 'Gap footed',
    line: "All fourteen bent footings are set; the leaf is raised and the counterweight's footings wait on the rack",
    land: RAILHEAD_LAND, // the Railhead platform's middle, facing the gap
  },
  {
    stage: 'ring-joined',
    label: 'Ring joined',
    line: 'The leaf is down and riveted; trains run to Ring Island',
    land: JOINT_LAND, // the joint's west platform by the outbound lever, facing the island
  },
  // Ring Island build 2 (R4, v31). Labels and lines are placeholders (owner direction, 11 November).
  {
    stage: 'steel-kit',
    label: 'Steel kit landed',
    line: 'The kit is in the island yard; the works is cold',
    land: STEEL_LAND, // the island halt's east platform, facing the works
  },
  {
    stage: 'steel-lit',
    label: 'Steel works lit',
    line: 'The works is casting; steel is on its rack',
    land: STEEL_LAND,
  },
  {
    stage: 'steel-home',
    label: 'Steel at Home',
    line: 'The first steel is on the pallet by Home’s table',
    land: TABLE_LAND, // east of the table, facing it
  },
  {
    stage: 'boiler-long',
    label: 'Longer boiler',
    line: "Line 2's trains wear the longer boiler",
    land: near(VILLAGE_LINE2, 0, 0, VILLAGE_LINE2.y / 100, QUARRY_LINE2), // the Village's line 2 platform
  },
  // The greybox route's leg 1 (step 5). Labels and lines are placeholders, logged in docs/agent-calls.md.
  {
    stage: 'gorge-open',
    menu: false,
    label: 'Stack line open',
    line: "The ring is joined; the first kit is on Ring Island's rack and the frame is bare",
    land: STACK_LAND, // Ring Island's west platform between the first rack and frame, facing the frame
  },
  {
    stage: 'gorge-reached',
    menu: false,
    label: 'High Gorge reached',
    line: 'The stack line is laid to High Gorge; the powered pick waits on the rim',
    land: GORGE_LAND, // the Gorge halt's north platform, facing the pickup on the rim
  },
  // Greybox leg 2 (docs/plans/greybox-leg2.md, step 3): the room fast-forward's rows, tooling only. Labels and lines are
  // placeholders. No `land` yet: a jump land is a checked landing (src/place/return-spot.ts reads every one as checked
  // with a still, by x and z alone, which cannot tell Bell Rock's two levels apart), so each waits for step 4's still.
  {
    stage: 'incline-open',
    menu: false,
    label: 'Incline open',
    line: "The barrier is open; the incline's first kit is on the Gorge rack",
  },
  {
    stage: 'bell-reached',
    menu: false,
    label: 'Bell Rock reached',
    line: 'The incline is laid to Bell Rock; the crystal seeds wait on the lower deck',
  },
  {
    stage: 'bay-open',
    menu: false,
    label: 'Bay cut open',
    line: "The seeds are taken; the bay cut's first kit is on the West landing's rack",
  },
  {
    stage: 'bay-reached',
    menu: false,
    label: 'Bay cut laid',
    line: 'Both new lines run to Bell Rock; Home is a minute away',
  },
  // Placeholder tooling copy for the owner. Landings measured in step 6 (docs/plans/greybox-leg3.md, its stills).
  // canopy-open has none, for leg 2's reason above: its spot is Bell Rock's upper platform over the cut, which
  // return-spot.ts (by x and z alone, within 30 m) would also give a rider of the lower level's line. canopy-reached
  // has none either: arrival.ts probes a landing's surface from the spawn, before Canopy's massing (resident by
  // distance) has mounted there, so it would keep the spawn; head 1's platform (canopy-mid) is the leg view's, always up.
  { stage: 'canopy-open', menu: false, label: 'Canopy gate open', line: 'The first kit is on the Bell Rock rack' },
  {
    stage: 'canopy-mid',
    menu: false,
    label: 'Canopy line building',
    line: 'The second kit is aboard a bay train',
    // Head 1's outward platform over the strait, between rack 2 and frame 2 (legRack, legFrame), facing the frame.
    land: { x: -525.13, y: 4.9, z: -673.36, yaw: 1.935 },
  },
  { stage: 'canopy-reached', menu: false, label: 'Canopy reached', line: 'The cloth waits at Canopy Town' },
  // Placeholder tooling rows. The head platform and quay arrive with leg 4's views (step 5).
  { stage: 'cave-open', menu: false, label: 'Cave line open', line: 'The plug is open at the West landing' },
  {
    stage: 'cave-mid',
    menu: false,
    label: 'Cave line building',
    line: 'The second kit is aboard a cave train',
    // Between rack 2 and frame 2. Arrival requires a supporting surface and keeps spawn until step 5 builds it.
    land: betweenRackAndFrame(4, 1),
  },
  { stage: 'port-reached', menu: false, label: 'Port Quay reached', line: 'The cave line runs to Port Quay' },
  {
    stage: 'wall-mid',
    menu: false,
    label: 'White Wall building',
    line: 'The third kit rides a cave train',
    land: betweenRackAndFrame(5, 2),
  },
  {
    stage: 'wall-deep',
    menu: false,
    label: 'Deep span reached',
    line: 'The barrier stands at the last frame',
    land: betweenRackAndFrame(5, 5),
  },
  {
    stage: 'wall-closed',
    menu: false,
    label: 'White Wall laid',
    line: 'The cave line reaches High Gorge',
    land: { x: -132.55, z: -1999.03, y: 3.9, yaw: -2.11 },
  },
  {
    stage: 'notch-open',
    menu: false,
    label: 'Notch open',
    line: 'Open the Notch barrier at Canopy Town (placeholder)',
  },
  {
    stage: 'notch-reached',
    menu: false,
    label: 'Notch reached',
    line: 'Take the lantern at Lantern Notch (placeholder)',
    // Keep the spawn for canopy-reached's reason: the halt mounts by distance.
  },
  {
    stage: 'causeway-open',
    menu: false,
    label: 'Causeway open',
    line: 'Build the causeway to the Original Island (placeholder)',
    land: betweenRackAndFrame(7, 0),
  },
  {
    stage: 'island-reached',
    menu: false,
    label: 'Island reached',
    line: 'Arrive (placeholder)',
    // Keep the spawn for canopy-reached's reason: the halt mounts by distance.
  },
  { stage: 'arrived', menu: false, label: 'Arrived', line: 'Arrived (placeholder)' },
  // Garage step 4 (docs/plans/garage-step4.md, step 3): placeholder tooling copy for the owner, no landings (the usual
  // spawn at Home is the post's side of the island; trade-held's train stands at Bell Rock, which canopy-open's note
  // above keeps unlanded).
  { stage: 'trade-ready', menu: false, label: 'Trade ready', line: 'Steel is home; both new lines can be fitted' },
  {
    stage: 'trade-fitted',
    menu: false,
    label: 'Trade fitted',
    line: 'The north-south line runs Quick, the bay line Strong',
  },
  {
    stage: 'trade-held',
    menu: false,
    label: 'Strong train held',
    line: 'A Strong bay train waits at Bell Rock with kit',
  },
];
/** The rows a menu lists: every row but the tooling-only ones. */
export const MENU_JUMPS: readonly Jump[] = JUMPS.filter((j) => j.menu !== false);
export const jumpOf = (stage: string): Jump | undefined => JUMPS.find((j) => j.stage === stage);
/** The seed stages a jump-in offers (production prebuilds only these). */
export const OFFERED_STAGES: readonly SeedStage[] = JUMPS.flatMap((j) => (j.stage === 'start' ? [] : [j.stage]));

/** A jump room's plain name: the stage, then six base-36 characters. `boogle` and hand-named rooms never match. */
export const JUMP_ROOM_RE = /^[a-z0-9-]{1,15}-[a-z0-9]{6}$/;
/** At most 22 characters, so railwayRoomId never hashes it and the stage stays readable in the room id. */
export function jumpRoomName(stage: string, suffix: string): string {
  return `${stage.slice(0, 15).replace(/-+$/, '')}-${suffix}`;
}

/** POST /jump (wire shape): sent as text/plain JSON. */
export type JumpRequest = { stage: string; ns: string };
export type JumpReply = { room: string; stage: string };
/** POST /jump's `error` for its two day budgets (429), which the splash tells apart from the per-minute rate limit. */
export const JUMP_DAY_ERROR = 'too many jump-ins today';
export const JUMP_ADDRESS_ERROR = 'too many jump-ins from here today';
/** A claim's world (a railway room id) is a jump room's: its plain name has the jump room shape. */
export function isJumpWorld(world: string): boolean {
  const name = /^rail-v\d+-(.+)$/.exec(world)?.[1];
  return !!name && JUMP_ROOM_RE.test(name);
}
/** Whether a reward claimed in `claimWorld` dresses you in `world`. A jump room keeps to itself both ways (playtest-
 * jump-in.md, call 22): a crate opened there never grants its hat or scarf anywhere else, and the wardrobe there starts
 * empty. Between other rooms a claim counts everywhere, as before. */
export const claimCountsIn = (claimWorld: string, world: string): boolean =>
  claimWorld === world || (!isJumpWorld(claimWorld) && !isJumpWorld(world));
/** `seed` on GET /rooms/:id/host, and the playdata session's `seed` field. */
export type RoomSeed = { stage: string; at: string };

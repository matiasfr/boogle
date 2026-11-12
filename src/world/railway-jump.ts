// Playtest jump-ins (docs/plans/playtest-jump-in.md): the owner-readable catalog of stages a fresh private room can be
// seeded at, and the room names and wire shapes of POST /jump. Headless: the game (the Jump in page, the ?from= link,
// the arrival's landing) and the server (server/src/jump.ts) both import it. Only `type SeedStage` comes from the seed
// builders, so none of their code reaches the client bundle. Adding a row: src/sim/railway-seeds.ts's header.
import type { SeedStage } from '../sim/railway-seeds.ts';
import { LINE2_BOILER, LINE2_HOOK, LINE2_LEVER, LINE2_SEA, LINE2_STATIONS } from '../sim/railway-line2-layout.ts';
import { RING_HALT, RING_HEAD, RING_JOINT_UP, RING_STEEL_WORKS, ringAt } from '../sim/railway-ring-layout.ts';
import { CROSSING_BENTS, PIER_STOP, SHED_TABLE, WORKS_KILN } from '../sim/railway-works-layout.ts';
import { RAIL_LINES } from '../sim/railway-lines.ts';

/** Where a jump-in lands, in metres on world axes; y is the surface stood on (terrain, pad or deck). */
export type JumpLand = { x: number; y: number; z: number; yaw?: number };
export type Jump = {
  stage: SeedStage | 'start';
  label: string; // owner-readable, shown in the menu and in playtest summaries
  line: string; // one short line under the label
  land?: JumpLand; // omitted: the usual spawn
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
/** 5.5 m east of the Roundhouse table's centre (5.2 m east, 1.7 m south), on the open ground between line 2's two
 * roads (surface 18.1 m by `jump-land-probe`), facing the table's centre with the stall behind it. Inside the table's
 * 6 m reach. The spot before (4 m west, 2 m south) put the camera inside the stall's shell. */
const TABLE_LAND = near(SHED_TABLE, 5.2, 1.7, 18.1, SHED_TABLE);
/** Line 1's Village and Camp platforms (slice 5's freight-running lands on the first, facing the second). */
const VILLAGE_LINE1 = RAIL_LINES[0]!.halts[0]!.platforms[0],
  CAMP_LINE1 = RAIL_LINES[0]!.halts[1]!.platforms[0];
/** Line 2's Village and Quarry platforms (slice 5's fares-running lands on the first, where riders board, facing the
 * second: along the line; boiler-long lands there too, to ride out at 25 m/s). */
const VILLAGE_LINE2 = RAIL_LINES[1]!.halts[0]!.platforms[0],
  QUARRY_LINE2 = RAIL_LINES[1]!.halts[1]!.platforms[1];

/** In route order. Labels and lines are UI text (not The Boogler's), logged in docs/agent-calls.md. Each `land` was
 * checked with a still (docs/plans/playtest-jump-in.md, step 7); `y` is the surface measured there. */
export const JUMPS: readonly Jump[] = [
  { stage: 'start', label: 'From the beginning', line: 'A fresh world, nothing built' },
  { stage: 'awake', label: 'Just woke', line: "The track layer is awake; T1's logs are next" },
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
    line: 'Q4 laid; the summit switch is next',
    land: near(LINE2_HOOK, -3, 0.5, LINE2_HOOK.y / 100, LINE2_SEA), // on p2's pad, facing the rings up to the summit
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
    land: near(LINE2_SEA, 2.2, 1, 102.4, LINE2_STATIONS[0]!), // on the summit deck, facing the glide home
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
    land: near(VILLAGE_LINE2, 3.1, 3.56, VILLAGE_LINE2.y / 100, QUARRY_LINE2), // 5 m on along the platform (s 22), facing the Quarry
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
];
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

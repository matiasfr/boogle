// Playtest jump-ins (docs/plans/playtest-jump-in.md): the owner-readable catalog of stages a fresh private room can be
// seeded at, and the room names and wire shapes of POST /jump. Headless: the game (the Jump in page, the ?from= link,
// the arrival's landing) and the server (server/src/jump.ts) both import it. Only `type SeedStage` comes from the seed
// builders, so none of their code reaches the client bundle. Adding a row: src/sim/railway-seeds.ts's header.
import type { SeedStage } from '../sim/railway-seeds.ts';
import { LINE2_BOILER, LINE2_HOOK, LINE2_LEVER, LINE2_SEA, LINE2_STATIONS } from '../sim/railway-line2-layout.ts';
import { CROSSING_BENTS, PIER_STOP, WORKS_KILN } from '../sim/railway-works-layout.ts';

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
    land: near(LINE2_HOOK, -2, 2.5, 23.5, LINE2_STATIONS[2]!), // on pillar p2's pad, facing Q3
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
    land: near(LINE2_HOOK, -3, 0.5, 23.5, LINE2_SEA), // on p2's pad, facing the rings up to the summit
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
  {
    stage: 'q6-done',
    label: 'Pier reached',
    line: 'Q6 laid to the pier; the forge has cast the breaker',
    land: near(PIER_STOP, 4, -2, 24.3, 0), // on the pier deck, facing north to Ring Island
  },
  {
    stage: 'works-open',
    label: 'Works open',
    line: 'Split-rock Works is open; the kiln is cold',
    land: near(WORKS_KILN, -6, 0, 24, WORKS_KILN), // in front of the kiln, clear of its walls
  },
  {
    stage: 'crossing-done',
    label: 'Crossing built',
    line: 'The Split-rock crossing is complete',
    land: near(PIER_STOP, 3, -4, 24.3, CROSSING_BENTS[0]!), // on the halt's deck (the frame's side is the jib's), facing the crossing
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

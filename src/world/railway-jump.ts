// Playtest jump-ins (docs/plans/playtest-jump-in.md): the owner-readable catalog of stages a fresh private room can be
// seeded at, and the room names and wire shapes of POST /jump. Headless: the game (the Jump in page, the ?from= link,
// the arrival's landing) and the server (server/src/jump.ts) both import it. Only `type SeedStage` comes from the seed
// builders, so none of their code reaches the client bundle. Adding a row: src/sim/railway-seeds.ts's header.
import type { SeedStage } from '../sim/railway-seeds.ts';

/** Where a jump-in lands, in metres on world axes; y is the surface stood on (terrain, pad or deck). */
export type JumpLand = { x: number; y: number; z: number; yaw?: number };
export type Jump = {
  stage: SeedStage | 'start';
  label: string; // owner-readable, shown in the menu and in playtest summaries
  line: string; // one short line under the label
  land?: JumpLand; // omitted: the usual spawn
};

/** In route order. Labels and lines are UI text (not The Boogler's), logged in docs/agent-calls.md. */
export const JUMPS: readonly Jump[] = [
  { stage: 'start', label: 'From the beginning', line: 'A fresh world, nothing built' },
  { stage: 'awake', label: 'Just woke', line: "The track layer is awake; T1's logs are next" },
  { stage: 'q1-done', label: 'Cart starts', line: "Q1 laid; the cart brings Q2's logs" },
  { stage: 'hook-taken', label: 'Hook earned', line: 'Q2 laid and the hook shot is yours; Q3 is next' },
  { stage: 'hook-earned', label: 'Quarry gate', line: 'Q3 laid, hook in hand; the quarry lever is next' },
  { stage: 'q4-done', label: 'Sea switch', line: 'Q4 laid; the summit switch is next' },
  { stage: 'q5-done', label: 'Boiler waiting', line: 'Q5 laid; the boiler sits on its pedestal' },
  { stage: 'trains-on', label: 'Trains running', line: 'The boiler is fitted and both lines run' },
  { stage: 'q6-done', label: 'Pier reached', line: 'Q6 laid to the pier; the forge has cast the breaker' },
  { stage: 'works-open', label: 'Works open', line: 'Split-rock Works is open; the kiln is cold' },
  { stage: 'crossing-done', label: 'Crossing built', line: 'The Split-rock crossing is complete' },
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
/** `seed` on GET /rooms/:id/host, and the playdata session's `seed` field. */
export type RoomSeed = { stage: string; at: string };

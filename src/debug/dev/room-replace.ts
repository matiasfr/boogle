// Replace room with stage, the request side of Dev → Room (docs/plans/room-fast-forward.md; the endpoint's contract is
// server/README.md, "Operator tools"). Pure: the stages offered, the request, and the server's answer in plain words.
// The server is the only authority: it checks the key, the typed room name, the stage and who is present. Nothing here
// is trusted by it, and no room message can ask for a replacement.
//
// The key (the server's ADVANCE_KEY) lives in this tab's sessionStorage only, so the reload a replacement causes does
// not ask for it again. It travels only in the Authorization header of this one request: never in a URL, a command's
// arguments, a result message, a snapshot, a report, playdata or a log.
import { JUMPS, jumpOf, type Jump } from '../../world/railway-jump.ts';
import { railwayRoomId } from '../../world/railway-namespace.ts';

/** Every stage a room can be replaced with, in route order: the seed stages' rows ('start' is no seed). */
export const REPLACE_STAGES: readonly Jump[] = JUMPS.filter((j) => j.stage !== 'start');
export const stageLabel = (stage: string) => jumpOf(stage)?.label ?? stage;

/** What a replacement loses: the plan's four categories, as the operator CLI prints them (dev/server-admin.ts). */
export const LOSSES: readonly string[] = [
  'The world: everything built, stocked or earned, the trains, cart, wagon and town economy become the stage\'s. Progress past the stage is lost: "forward" is checked against the last record, never against play.',
  "What is carried: everything on anyone's back, and every account row.",
  "Personal to this room, in each browser that was here: wardrobe and finds (their claims pruned), the saved pose, seen state, the visit marker, and The Boogler's memory of the player. Nothing puts these back.",
  'On an operator restore: the old world returns with its old born. Browsers that joined the replaced world reset again; browsers that never joined it keep everything. Play after the replacement is discarded.',
];

export type ReplaceArgs = { stage: string; confirm: string; override: boolean };
/** A command's arguments (the dock's fields, or `boogle.dev.run('room', 'replace', ...)`), or why they can't be sent. */
export function replaceArgs(args: Record<string, unknown>): ReplaceArgs | string {
  const { stage, confirm, override } = args;
  if (typeof stage !== 'string' || !REPLACE_STAGES.some((j) => j.stage === stage)) return 'Pick a stage from the list.';
  if (typeof confirm !== 'string' || !confirm) return "Type this room's name to replace it.";
  if (override !== undefined && typeof override !== 'boolean') return 'override is true or false.';
  return { stage, confirm, override: override === true };
}

/** The one request. `room` is the room this page is in (its plain name); the typed name goes in the body for the
 * server to compare. */
export function replaceRequest(server: string, room: string, key: string, args: ReplaceArgs) {
  return {
    url: new URL(`/admin/rooms/${railwayRoomId(room)}/replace`, server).href,
    init: {
      method: 'POST',
      cache: 'no-store',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ stage: args.stage, confirm: args.confirm, ...(args.override && { override: true }) }),
    } satisfies RequestInit,
  };
}

/** The server's answer to a refused or failed replacement, in plain words. Never echoes the request. */
export function refusal(status: number, body: unknown): string {
  const { error, players } = (body && typeof body === 'object' ? body : {}) as { error?: unknown; players?: unknown };
  const why = typeof error === 'string' ? error : '';
  switch (status) {
    case 401:
      return 'Wrong key.';
    case 404:
      return 'This server has no replacement key, so rooms cannot be replaced here.';
    case 403:
      return 'Replacing the shared island is not enabled on this server.';
    case 429:
      return 'Too many attempts. Wait a minute and try again.';
    case 422:
      return "That stage failed the server's check. Nothing was changed.";
    case 503:
      return 'The server cannot build that stage right now. Nothing was changed.';
    case 409:
      if (why === 'confirm the room name') return "Wrong room name. Type this room's name exactly.";
      if (why === 'busy') return 'This room is already being replaced.';
      if (why === 'players in the room')
        return `${typeof players === 'number' ? players : 'Other'} players are here. Tick "Replace it under them" to go ahead.`;
      if (why.startsWith('earlier stage'))
        return 'This room was already replaced with a later stage. Going back is an operator restore of the pinned backup.';
      break;
    case 400:
      if (why === 'unknown stage') return 'The server does not know that stage.';
      if (why === 'not a current railway room') return 'The server cannot replace this room.';
      break;
    case 500:
      return 'The server failed while replacing the room. Check the room with the operator tools before trying again.';
  }
  return `The server refused (${status}${why ? `: ${why}` : ''}).`;
}

export type Replaced = { stage: string; backup: string; restore: string };
/** What the server says it did, for the status line and the output (its record: the pinned backup and the restore). */
export function replacedReply(body: unknown): Replaced | null {
  const { ok, stage, backup, restore } = (body && typeof body === 'object' ? body : {}) as Record<string, unknown>;
  return ok === true && typeof stage === 'string'
    ? { stage, backup: typeof backup === 'string' ? backup : '', restore: typeof restore === 'string' ? restore : '' }
    : null;
}

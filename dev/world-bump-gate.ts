// The daily world wipe (owner, 27 November 2026: docs/decisions-process.md, "world wipes are daily, and only with
// nobody on the server"). A WORLD_NS bump wipes every room when its server deploy lands, so a branch that carries one
// ships only when (1) no wipe has gone out today, and (2) nobody is on the production server. ship-queue.sh runs this
// before it takes the ship lock and again once it holds it; a held branch is tried again in 30 to 60 minutes (the
// hourly heartbeat does). The wipe itself lands with the server deploy some minutes after the merge, so this is a
// check at the moment of shipping, not a guarantee at the moment of the wipe.
//
//   node dev/world-bump-gate.ts <worktree>   exit 0: the branch has no bump, or its bump may ship now
//                                            exit 9: held; the reason and when to look again are printed
// "Today" is 20 hours since the last wipe, so the daily slot does not creep later each day. Bumps that land within an
// hour of each other are one wipe: branches waiting on the same slot go out together.
// Players come from GET /admin/rooms (REPORT_TOKEN, scripts/report-token.ts): every saved room of the current world.
// The public room status covers one room, so it cannot say the server is empty: with no token, or a server that
// cannot be read, the bump holds, since wiping under a player is the harm this guards. Not counted: a brand-new room
// in the seconds before its first checkpoint (the list is of saves). Server: BOOGLE_SERVER (default production).
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { reportToken } from '../scripts/report-token.ts';

const HOUR = 3_600_000;
export const DAY_MS = 20 * HOUR;
export const WINDOW_MS = HOUR;

export type Verdict = { ship: true; why: string } | { ship: false; why: string };

/** May a world bump ship now? `bumps` are the times (ms) earlier bumps landed on main; `players` is null if unread. */
export function decide(now: number, bumps: readonly number[], players: number | null): Verdict {
  const past = bumps.filter((t) => t <= now).sort((a, b) => b - a);
  const last = past[0];
  if (last !== undefined && now - last < DAY_MS) {
    // The run of bumps the last one belongs to: the wipe it is part of began with the run's first.
    let first = last;
    for (const t of past.slice(1)) {
      if (first - t > WINDOW_MS) break;
      first = t;
    }
    if (now - first > WINDOW_MS)
      return {
        ship: false,
        why: `a world wipe went out at ${new Date(last).toISOString()}; the next may ship after ${new Date(last + DAY_MS).toISOString()}`,
      };
  }
  if (players === null)
    return {
      ship: false,
      why: 'could not read who is on the server (it needs REPORT_TOKEN and an answer); look again in 30 to 60 minutes',
    };
  if (players > 0)
    return {
      ship: false,
      why: `${players} player${players === 1 ? ' is' : 's are'} on the server; look again in 30 to 60 minutes`,
    };
  return { ship: true, why: 'no wipe yet today and nobody is on the server' };
}

const VERSION = /^export const WORLD_NS = '([^']+)';/m;
/** The world version in a source text, or null. */
export const worldVersion = (source: string) => VERSION.exec(source)?.[1] ?? null;

const FILE = 'src/world/namespace.ts';
function git(cwd: string, ...args: string[]) {
  return execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
}

/** The bump a branch carries against where it left main: `{ from, to }`, or null when it carries none. */
export function branchBump(worktree: string) {
  const base = git(worktree, 'merge-base', 'origin/main', 'HEAD');
  const from = worldVersion(git(worktree, 'show', `${base}:${FILE}`));
  const to = worldVersion(git(worktree, 'show', `HEAD:${FILE}`));
  return from && to && from !== to ? { from, to } : null;
}

/** When bumps landed on main in the last three days, in ms. */
function recentBumps(worktree: string) {
  const out = git(
    worktree,
    'log',
    'origin/main',
    '--first-parent',
    '--diff-merges=first-parent',
    '-s', // the merge diff feeds -G only: without this the format's lines come with patches
    '--since=3.days',
    '-G',
    '^export const WORLD_NS = ',
    '--format=%ct',
    '--',
    FILE,
  );
  return out
    .split('\n')
    .filter(Boolean)
    .map((s) => Number(s) * 1000);
}

/** Everyone on the server, across its rooms; null when that cannot be known (no token, no answer, an odd answer). */
export async function playersOn(
  server: string,
  token: string | null,
  get: typeof fetch = fetch,
): Promise<number | null> {
  if (!token) return null;
  try {
    const r = await get(`${server}/admin/rooms`, {
      headers: { authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(15_000),
    });
    if (r.status !== 200) return null;
    const list = (await r.json()) as { rooms?: { players?: unknown }[] };
    if (!Array.isArray(list.rooms)) return null;
    let players = 0;
    for (const room of list.rooms) {
      if (typeof room.players !== 'number' || !(room.players >= 0)) return null;
      players += room.players;
    }
    return players;
  } catch {
    return null;
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const worktree = process.argv[2];
  if (!worktree) {
    console.error('usage: node dev/world-bump-gate.ts <worktree>');
    process.exit(1);
  }
  const bump = branchBump(worktree);
  if (!bump) process.exit(0);
  const server = process.env.BOOGLE_SERVER || 'https://boogle-server.fly.dev';
  const verdict = decide(Date.now(), recentBumps(worktree), await playersOn(server, reportToken()));
  console.log(`world bump ${bump.from} to ${bump.to}: ${verdict.ship ? 'may ship' : 'held'}: ${verdict.why}.`);
  process.exit(verdict.ship ? 0 : 9);
}

// The world wipe's gate (owner, 27 November 2026: docs/decisions-process.md, "world wipes ship any time nobody is
// playing"). A WORLD_NS bump wipes every room when its server deploy lands, so a branch that carries one ships only
// while nobody is on the production server; there is no limit on how many ship in a day. ship-queue.sh runs this
// before it takes the ship lock and again once it holds it; a held branch is tried again in 30 to 60 minutes (the
// hourly heartbeat does). The wipe itself lands with the server deploy some minutes after the merge, so this is a
// check at the moment of shipping, not a guarantee at the moment of the wipe.
//
//   node dev/world-bump-gate.ts <worktree>   exit 0: the branch has no bump, or its bump may ship now
//                                            exit 9: held; the reason and when to look again are printed
// Players come from GET /admin/rooms (REPORT_TOKEN, scripts/report-token.ts): every saved room of the current world.
// The public room status covers one room, so it cannot say the server is empty: with no token, or a server that
// cannot be read, the bump holds, since wiping under a player is the harm this guards. Not counted: a brand-new room
// in the seconds before its first checkpoint (the list is of saves). Server: BOOGLE_SERVER (default production).
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { reportToken } from '../scripts/report-token.ts';

export type Verdict = { ship: boolean; why: string };

/** May a world bump ship now? `players` is everyone on the server, or null when that could not be read. */
export function decide(players: number | null): Verdict {
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
  return { ship: true, why: 'nobody is on the server' };
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
  const verdict = decide(await playersOn(server, reportToken()));
  console.log(`world bump ${bump.from} to ${bump.to}: ${verdict.ship ? 'may ship' : 'held'}: ${verdict.why}.`);
  process.exit(verdict.ship ? 0 : 9);
}

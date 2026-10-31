// Roster rules: the `who.set` op and the `roster` state (../../sim/roster.ts): who each player id (pid) is, in order of
// first sight. Every later table stores a player as their roster index. The pid is the host-stamped `e.u`
// (../sync.js), never something the edit claims. Lockstep: everything here runs the same on every peer (see ./README.md).
import {
  createRoster,
  canSet,
  setWho,
  ensure,
  indexOf,
  serializeRoster,
  loadRoster,
  hashRoster,
  MAX_PLAYERS,
  N_COLORS,
} from '../../sim/roster.ts';
import { JUNK, bad } from './edit-gen.ts';
import type { SyncView, Stream } from './types.ts';

export const name = 'roster';

export type RosterApi = ReturnType<typeof install>;

export function install(sync: SyncView) {
  const roster = createRoster();
  sync.registerOp<{ n: string; c: number }>('who.set', {
    validate: (e) => canSet(roster, e.u, e.n, e.c),
    apply: (e) => setWho(roster, e.u, e.n, e.c),
  });
  sync.registerState('roster', {
    serialize: () => serializeRoster(roster),
    load: (json: unknown) => loadRoster(roster, json),
    hash: () => hashRoster(roster),
  });
  return {
    roster,
    indexOf: (pid: unknown) => indexOf(roster, pid), // -1: never seen
    ensure: (pid: string) => ensure(roster, pid), // apply only (it adds the player): -1 when the roster is full
    nameOf: (k: number) => roster.names[k] ?? '',
    colorOf: (k: number) => roster.colors[k] ?? 0,
    size: () => roster.pids.length,
  };
}

// Replay-test generators (./README.md): a name and colour, sometimes the same as before (refused), or junk.
const NAMES = ['Ana', 'Bo', '  Sam  ', 'Dat Frinco', 'x'.repeat(30), 'Zoë', ''];
export const edits = {
  'who.set': (r: Stream) =>
    r.chance(JUNK) ? bad(r, 'who.set') : { op: 'who.set', i: 0, j: 0, n: r.pick(NAMES), c: r.int(-1, N_COLORS) },
};

// Indexes are dense and unique, and names are clean.
export function invariants({ roster }: RosterApi): string | null {
  const { pids, index } = roster;
  if (pids.length > MAX_PLAYERS) return `${pids.length} players`;
  if (index.size !== pids.length) return 'index out of step';
  for (let k = 0; k < pids.length; k++) if (index.get(pids[k]) !== k) return `pid ${pids[k]} not at ${k}`;
  if (roster.names.some((n) => n.length > 16)) return 'a long name';
  return null;
}

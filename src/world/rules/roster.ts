// Roster authority: durable server who.set and the roster state (../../sim/roster.ts), in first-sight ordinal order.
// The command boundary supplies authenticated e.u; client mirrors never allocate ordinals. Server stacks still
// read this API directly. Classic prototype installation remains until step 5 retires its dependent tables.
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
import type { ServerOps } from '../server-ops.ts';
import type { Replicator } from '../replicate-server.ts';

export const name = 'roster';

export type RosterApi = ReturnType<typeof install>;

// Classic prototypes retain their old registration until their retirement in step 5.
export function install(sync: SyncView) {
  return create(sync);
}
export function installServer(sync: SyncView, ops: ServerOps, replication: Replicator) {
  return create(sync, { ops, replication });
}
function create(sync: SyncView, server?: { ops: ServerOps; replication: Replicator }) {
  const roster = createRoster();
  const changed = () => server?.replication.touchAll('player');
  if (server)
    server.ops.define('who.set', {
      durable: true,
      validate: (e) => canSet(roster, e.u, e.n, e.c),
      apply: (e) => {
        const result = setWho(roster, e.u, e.n as string, (e.c as number) || 0);
        changed();
        return result;
      },
    });
  else
    sync.registerOp<{ n: string; c: number }>('who.set', {
      validate: (e) => canSet(roster, e.u, e.n, e.c),
      apply: (e) => setWho(roster, e.u, e.n, e.c),
    });
  sync.registerState(
    'roster',
    {
      serialize: () => serializeRoster(roster),
      load: (json: unknown) => {
        loadRoster(roster, json);
        changed();
      },
      hash: () => hashRoster(roster),
    },
    server ? { server: true } : undefined,
  );
  return {
    roster,
    indexOf: (pid: unknown) => indexOf(roster, pid), // -1: never seen
    ensure: (pid: string) => {
      const k = ensure(roster, pid);
      changed();
      return k;
    }, // server apply only
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
  for (let k = 0; k < pids.length; k++) if (index.get(pids[k]!) !== k) return `pid ${pids[k]} not at ${k}`;
  if (roster.names.some((n) => n.length > 16)) return 'a long name';
  return null;
}

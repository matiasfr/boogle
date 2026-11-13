// Roster authority: durable server who.set and the roster state (../../sim/roster.ts), in first-sight ordinal order.
// The command boundary supplies authenticated e.u; client mirrors never allocate ordinals.
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
} from '../../sim/roster.ts';
import type { SyncView } from './types.ts';
import type { ServerOps } from '../server-ops.ts';
import type { Replicator } from '../replicate-server.ts';

// Host wall time, never the action's client-supplied clock. No persisted/wire state.
export const ROSTER_CHANGE_MS = 3000;

export type RosterApi = ReturnType<typeof installServer>;

export function installServer(sync: SyncView, ops: ServerOps, replication: Replicator, now: () => number) {
  const roster = createRoster();
  // At most MAX_PLAYERS entries: only a valid, changing roster command spends a slot.
  // Key by authenticated pid so reconnects and replacement sockets cannot reset the bound.
  const lastChange = new Map<string, number>();
  const changed = () => replication.touchAll('player');
  ops.define('who.set', {
    durable: true,
    validate: (e) => {
      if (!canSet(roster, e.u, e.n, e.c)) return false;
      const at = now();
      if (at - (lastChange.get(e.u) ?? -Infinity) < ROSTER_CHANGE_MS) return false;
      lastChange.set(e.u, at);
      return true;
    },
    apply: (e) => {
      const result = setWho(roster, e.u, e.n as string, (e.c as number) || 0);
      changed();
      return result;
    },
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
    { server: true },
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

// Indexes are dense and unique, and names are clean.
export function invariants({ roster }: RosterApi): string | null {
  const { pids, index } = roster;
  if (pids.length > MAX_PLAYERS) return `${pids.length} players`;
  if (index.size !== pids.length) return 'index out of step';
  for (let k = 0; k < pids.length; k++) if (index.get(pids[k]!) !== k) return `pid ${pids[k]} not at ${k}`;
  if (roster.names.some((n) => n.length > 16)) return 'a long name';
  return null;
}

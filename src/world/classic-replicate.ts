// Closure-backed Server states share the railway's packet stream. Publish only complete packet sets, so a late
// join or reconnect never exposes part of a tune revision. Catalog indices remain the wire ids.
import { createTune, RAIL_TUNABLES, TUNABLES, type TuneKey } from '../sim/tune.ts';
import { defineReplicated, GLOBAL_CELL } from './replicate.ts';
import { RULE_STEPS } from './room-clock.ts';
import type { Mirror } from './replicate-client.ts';
import type { Replicator } from './replicate-server.ts';
import type { RailTuneApi } from './rules/tune.ts';
import { createRoster, loadRoster, serializeRoster, indexOf, type RosterJson } from '../sim/roster.ts';
import type { RosterApi } from './rules/roster.ts';

export const TUNE_VALUE = defineReplicated('tuneValue', { key: 'str', v: 'int' });
export const TUNE_REV = defineReplicated('tuneRev', { revision: 'int' });
export const PLAYER = defineReplicated('player', { pid: 'str', name: 'str', color: 'u8' });
export const CLASSIC_SCHEMAS = [TUNE_VALUE, TUNE_REV, PLAYER];
const rows = TUNABLES.flatMap((spec, id) => (spec.key.startsWith('rail') ? [{ ...spec, id }] : []));

export function projectRailTune(replication: Replicator, api: RailTuneApi) {
  replication.define({
    schema: TUNE_VALUE,
    ids: () => rows.map((row) => row.id),
    project: (id) => {
      const row = rows.find((row) => row.id === id);
      return row ? { key: row.key, v: api.get(row.key) } : null;
    },
    cell: () => GLOBAL_CELL,
  });
  replication.define({
    schema: TUNE_REV,
    ids: () => [0],
    project: (id) => (id === 0 ? { revision: api.tune.revision } : null),
    cell: () => GLOBAL_CELL,
  });
  for (const schema of [TUNE_VALUE, TUNE_REV]) replication.touchAll(schema.kind);
}

export function projectRoster(replication: Replicator, api: RosterApi) {
  replication.define({
    schema: PLAYER,
    ids: () => api.roster.pids.map((_, id) => id),
    project: (id) => {
      if (typeof id !== 'number') return null;
      const pid = api.roster.pids[id];
      return pid === undefined ? null : { pid, name: api.nameOf(id), color: api.colorOf(id) };
    },
    cell: () => GLOBAL_CELL,
  });
  replication.touchAll(PLAYER.kind);
}

/** Read-only roster published at complete packet boundaries, including late joins and changed refills. */
export function createRosterMirror(mirror: Mirror) {
  const roster = createRoster();
  const listeners = new Set<(event: { rows: RosterJson; tick: number }) => void>();
  mirror.onPacket((packet) => {
    if (!mirror.whole() || packet.m) return;
    const entries = [...mirror.entries(PLAYER.kind)].sort(([a], [b]) => Number(a) - Number(b));
    const rows: RosterJson = [];
    for (const [id, row] of entries) {
      if (
        id !== rows.length ||
        typeof row.pid !== 'string' ||
        typeof row.name !== 'string' ||
        typeof row.color !== 'number'
      )
        return;
      rows.push([row.pid, row.name, row.color]);
    }
    if (JSON.stringify(rows) === JSON.stringify(serializeRoster(roster))) return;
    loadRoster(roster, rows);
    for (const fn of listeners) fn({ rows, tick: Math.floor(packet.tk / RULE_STEPS) });
  });
  return {
    roster,
    indexOf: (pid: unknown) => indexOf(roster, pid),
    // Inactive classic readers may look up ordinals, but a client never allocates one.
    ensure: (pid: string) => indexOf(roster, pid),
    nameOf: (k: number) => roster.names[k] ?? '',
    colorOf: (k: number) => roster.colors[k] ?? 0,
    size: () => roster.pids.length,
    onChange(fn: (event: { rows: RosterJson; tick: number }) => void) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
  };
}

type TuneChange = {
  changes: { key: TuneKey; old: number; value: number }[];
  revision: number;
  tick: number;
};

export function createClassicMirror(mirror: Mirror) {
  const tune = createTune(RAIL_TUNABLES);
  const listeners = new Set<(event: TuneChange) => void>();
  mirror.onPacket((packet) => {
    if (!mirror.whole() || packet.m) return;
    const revision = mirror.get(TUNE_REV.kind, 0)?.revision;
    if (typeof revision !== 'number') return;
    const values = { ...tune.v };
    for (const row of rows) {
      const value = mirror.get(TUNE_VALUE.kind, row.id);
      if (!value || value.key !== row.key || typeof value.v !== 'number') return;
      values[row.key] = value.v;
    }
    if (tune.revision === revision && rows.every(({ key }) => tune.v[key] === values[key])) return;
    const changes = rows.flatMap(({ key }) =>
      tune.v[key] === values[key] ? [] : [{ key, old: tune.v[key], value: values[key] }],
    );
    tune.v = values;
    tune.revision = revision;
    tune.rev++;
    for (const fn of listeners) fn({ changes, revision, tick: Math.floor(packet.tk / RULE_STEPS) });
  });
  return {
    tune,
    get: (key: TuneKey) => tune.v[key],
    /** Complete replicated configurations, on every peer; unchanged receipts/refills do not notify. */
    onChange(fn: (event: TuneChange) => void) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
  };
}

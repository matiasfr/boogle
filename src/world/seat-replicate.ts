// Transient Server seats: publish a complete occupancy table at packet boundaries, including empty refills.
import { defineReplicated, GLOBAL_CELL } from './replicate.ts';
import { RULE_STEPS } from './room-clock.ts';
import type { Mirror } from './replicate-client.ts';
import type { Replicator } from './replicate-server.ts';
import type { SeatRow } from '../sim/seats.ts';
import type { SeatsApi } from './rules/seats.ts';

export const SEAT = defineReplicated('seat', { pid: 'str' });

export function projectSeats(replication: Replicator, api: SeatsApi) {
  replication.define({
    schema: SEAT,
    ids: () => api.seats.bySeat.keys(),
    project: (id) => {
      const pid = typeof id === 'string' ? api.seats.bySeat.get(id) : undefined;
      return pid === undefined ? null : { pid };
    },
    cell: () => GLOBAL_CELL,
  });
  replication.touchAll(SEAT.kind);
}

export function createSeatMirror(mirror: Mirror) {
  let rows: SeatRow[] = [];
  let bySeat = new Map<string, string>();
  let byPid = new Map<string, string>();
  const listeners = new Set<(event: { rows: SeatRow[]; tick: number }) => void>();
  const snapshot = () => rows.map((row) => ({ ...row }));
  mirror.onPacket((packet) => {
    if (!mirror.whole() || packet.m) return;
    const next: SeatRow[] = [];
    const nextBySeat = new Map<string, string>();
    const nextByPid = new Map<string, string>();
    for (const [id, row] of mirror.entries(SEAT.kind)) {
      if (typeof id !== 'string' || typeof row.pid !== 'string' || nextByPid.has(row.pid)) return;
      next.push({ id, pid: row.pid });
      nextBySeat.set(id, row.pid);
      nextByPid.set(row.pid, id);
    }
    next.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
    if (!packet.w && JSON.stringify(next) === JSON.stringify(rows)) return;
    rows = next;
    bySeat = nextBySeat;
    byPid = nextByPid;
    for (const fn of listeners) fn({ rows: snapshot(), tick: Math.floor(packet.tk / RULE_STEPS) });
  });
  return {
    occupant: (id: string) => bySeat.get(id) ?? null,
    seatOf: (pid: string) => byPid.get(pid) ?? null,
    rows: snapshot,
    onChange(fn: (event: { rows: SeatRow[]; tick: number }) => void) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
  };
}

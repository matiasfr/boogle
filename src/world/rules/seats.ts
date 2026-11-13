// Transient Server seats: authenticated commands, replicated occupancy, never checkpointed.
import {
  createSeats,
  validSeatList,
  pickSeat,
  sit,
  stand,
  releasePid,
  clear,
  seatOf,
  type SeatRow,
} from '../../sim/seats.ts';
import type { ServerOps, ServerEdit } from '../server-ops.ts';
import type { Replicator } from '../replicate-server.ts';

export const SEAT_SIT_MS = 400;
const choices = (e: ServerEdit) => (e.alt === undefined ? [e.id] : Array.isArray(e.alt) ? [e.id, ...e.alt] : null);

export function installSeats(ops: ServerOps, replication: Replicator, now: () => number) {
  const seats = createSeats();
  const lastSit = new Map<string, number>();
  const changed = () => replication.touchAll('seat');
  ops.define('seat.sit', {
    validate(e) {
      const ids = choices(e);
      if (!validSeatList(ids)) return false;
      const at = now();
      if (at - (lastSit.get(e.u) ?? -Infinity) < SEAT_SIT_MS) return 'rate';
      if (pickSeat(seats, e.u, ids) === null) return 'taken';
      lastSit.set(e.u, at); // Only an accepted sit spends cadence; stand keeps it until actual departure.
      return true;
    },
    apply(e) {
      const result = sit(seats, e.u, pickSeat(seats, e.u, choices(e))!);
      changed();
      return result;
    },
  });
  ops.define('seat.stand', {
    validate: (e) => seatOf(seats, e.u) !== null,
    apply(e) {
      const result = stand(seats, e.u);
      changed();
      return result;
    },
  });
  return {
    seats,
    release(pid: string) {
      releasePid(seats, pid);
      lastSit.delete(pid);
      changed();
    },
    clear() {
      clear(seats);
      lastSit.clear();
      changed();
    },
    rows: (): SeatRow[] => [...seats.bySeat].map(([id, pid]) => ({ id, pid })),
  };
}
export type SeatsApi = ReturnType<typeof installSeats>;

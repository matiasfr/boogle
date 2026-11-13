// Step 1: server shadow only. No projection, checkpoint registration or client decision reads these rows.
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

export const SEAT_SIT_MS = 400;
const choices = (e: ServerEdit) => (e.alt === undefined ? [e.id] : Array.isArray(e.alt) ? [e.id, ...e.alt] : null);

export function installSeats(ops: ServerOps, now: () => number) {
  const seats = createSeats();
  const lastSit = new Map<string, number>();
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
      return sit(seats, e.u, pickSeat(seats, e.u, choices(e))!);
    },
  });
  ops.define('seat.stand', {
    validate: (e) => seatOf(seats, e.u) !== null,
    apply: (e) => stand(seats, e.u),
  });
  return {
    seats,
    release(pid: string) {
      releasePid(seats, pid);
      lastSit.delete(pid);
    },
    clear() {
      clear(seats);
      lastSit.clear();
    },
    rows: (): SeatRow[] => [...seats.bySeat].map(([id, pid]) => ({ id, pid })),
  };
}

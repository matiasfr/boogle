// Every peer records authoritative occupants, independently of which tab sent the command.
// Incremental changes spend the recorder's normal mark allowance; full/refill state uses its bounded channel.
import type { createSeatMirror } from '../world/seat-replicate.ts';
import { playMark, recordSeatSnapshot } from '../proto/mark.ts';

export function recordSeats(seats: ReturnType<typeof createSeatMirror>) {
  let recorded: Map<string, string> | undefined;
  return seats.onChange(({ rows, tick }) => {
    recordSeatSnapshot({ rows, tick });
    const next = new Map(rows.map(({ id, pid }) => [pid, id]));
    if (recorded) {
      for (const [pid, id] of next) if (recorded.get(pid) !== id) playMark('seat.player', { pid, id, tick });
      for (const pid of recorded.keys()) if (!next.has(pid)) playMark('seat.player', { pid, id: null, tick });
    }
    recorded = next;
  });
}

// Pure presentation selection for remote seats; authority remains in the server rows.
import type { SeatRow } from '../../sim/seats.ts';

export type SeatPose = SeatRow & { at: number };

export function seatViews(
  rows: readonly SeatRow[],
  poses: readonly SeatPose[],
  now: number,
  localSeat: string | null = null,
) {
  const drawn = new Map(rows.map((row) => [row.pid, row.id]));
  const occupied = new Set(rows.map((row) => row.id));
  const fresh = poses.filter((pose) => now - pose.at < 200);
  for (const pose of fresh) {
    // Confirmed chairs win even with no presence. An unconfirmed re-sit can bridge its receipt gap only while
    // nobody else claims that picture: neither a server occupant, another fresh Owner pose nor this tab's sitter.
    if (drawn.has(pose.pid) || occupied.has(pose.id) || pose.id === localSeat) continue;
    if (fresh.some((other) => other.id === pose.id && other.pid !== pose.pid)) continue;
    drawn.set(pose.pid, pose.id);
  }
  return drawn;
}

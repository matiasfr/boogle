// Transient seat ownership. No positions or rendering: the caller orders the chairs it can reach.
export const SEAT_ID = /^[A-Za-z0-9:/._-]{1,64}$/;
export const createSeats = () => ({ bySeat: new Map<string, string>(), byPid: new Map<string, string>() });
export type Seats = ReturnType<typeof createSeats>;
export type SeatRow = { id: string; pid: string };
export type SeatSit = { id: string; alt?: string[] };
export const validSeatId = (id: unknown): id is string => typeof id === 'string' && SEAT_ID.test(id);
export const validSeatList = (ids: unknown): ids is string[] =>
  Array.isArray(ids) && ids.length > 0 && ids.length <= 8 && ids.every(validSeatId);
export const seatOf = (s: Seats, pid: string) => s.byPid.get(pid) ?? null;
export const occupant = (s: Seats, id: string) => s.bySeat.get(id) ?? null;
export function pickSeat(s: Seats, pid: string, ids: unknown): string | null {
  if (!validSeatList(ids)) return null;
  return ids.find((id) => !s.bySeat.has(id) || occupant(s, id) === pid) ?? null;
}
export function stand(s: Seats, pid: string): boolean {
  const id = seatOf(s, pid);
  if (id === null) return false;
  s.bySeat.delete(id);
  s.byPid.delete(pid);
  return true;
}
export function sit(s: Seats, pid: string, id: string): boolean {
  if (!validSeatId(id) || (s.bySeat.has(id) && occupant(s, id) !== pid)) return false;
  stand(s, pid);
  s.bySeat.set(id, pid);
  s.byPid.set(pid, id);
  return true;
}
export const releasePid = stand;
export function clear(s: Seats) {
  s.bySeat.clear();
  s.byPid.clear();
}
export function invariants(s: Seats): string | null {
  if (s.bySeat.size !== s.byPid.size) return 'seat/player counts differ';
  for (const [id, pid] of s.bySeat) if (!validSeatId(id) || seatOf(s, pid) !== id) return 'seat/player maps differ';
  for (const [pid, id] of s.byPid) if (occupant(s, id) !== pid) return 'player/seat maps differ';
  return null;
}

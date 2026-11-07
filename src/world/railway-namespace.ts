// The current production railway rooms. The isolated t1v01 spine (2026-11-04) went with the railway's lockstep path
// at v14 (replication R1a): the railway is Server-kind state in these rooms only.
import { WORLD_NS } from './namespace.ts';
// Put the realm first: classic's `${WORLD_NS}-<arbitrary name>` can never encode this prefix.
export const RAILWAY_PLAY_NS = `rail-${WORLD_NS}`;
export const isRailwayRoom = (room: string) =>
  room.startsWith(`${RAILWAY_PLAY_NS}-`) && /^[a-z0-9-]{1,32}$/.test(room) && room.length > RAILWAY_PLAY_NS.length + 1;
export function railwayRoomId(room: string) {
  let h = 2166136261;
  for (const c of room) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  const max = 31 - RAILWAY_PLAY_NS.length;
  const name = room.length <= max ? room : `${room.slice(0, max - 8)}-${(h >>> 0).toString(36).padStart(7, '0')}`;
  return `${RAILWAY_PLAY_NS}-${name}`;
}

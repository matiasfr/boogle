// Isolated headless T1 proof and version-fenced production railway rooms.
import { WORLD_NS } from './namespace.ts';
// History: t1v01 (2026-11-04): authority, receipts and recovery envelope, no imported prototype progress.
export const RAILWAY_NS = 't1v01';
export const RAILWAY_ROOM = `${RAILWAY_NS}-proto-production-core`;
// t1v02 (2026-11-04): playable default T1, with the existing base registry followed by railway.
// Old Place and classic rooms retain their mainline namespace. No prototype progress or profiles are imported.
export const RAILWAY_LEGACY_PLAY_NS = 't1v02';
// 2026-11-05: clean development-world break. Never import t1v02 saves into the new line-one authority.
// Put the realm first: classic's `${WORLD_NS}-<arbitrary name>` can never encode this prefix.
export const RAILWAY_PLAY_NS = `rail-${WORLD_NS}`;
export const isLineRailwayRoom = (room: string) =>
  room.startsWith(`${RAILWAY_PLAY_NS}-`) && /^[a-z0-9-]{1,32}$/.test(room) && room.length > RAILWAY_PLAY_NS.length + 1;
export const isLegacyPlayableRailwayRoom = (room: string) => /^t1v02-[a-z0-9-]{1,26}$/.test(room);
export const isPlayableRailwayRoom = (room: string) => isLegacyPlayableRailwayRoom(room) || isLineRailwayRoom(room);
export const isRailwayRoom = (room: string) =>
  /^t1v01-proto-[a-z0-9-]{1,20}$/.test(room) || isPlayableRailwayRoom(room);
export function railwayRoomId(room: string) {
  let h = 2166136261;
  for (const c of room) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  const max = 31 - RAILWAY_PLAY_NS.length;
  const name = room.length <= max ? room : `${room.slice(0, max - 8)}-${(h >>> 0).toString(36).padStart(7, '0')}`;
  return `${RAILWAY_PLAY_NS}-${name}`;
}

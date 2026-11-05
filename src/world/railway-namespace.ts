// Isolated headless T1 proof. The default classic world and its save/protocol stay unchanged.
// History: t1v01 (2026-11-04): authority, receipts and recovery envelope, no imported prototype progress.
export const RAILWAY_NS = 't1v01';
export const RAILWAY_ROOM = `${RAILWAY_NS}-proto-production-core`;
// t1v02 (2026-11-04): playable default T1, with the existing base registry followed by railway.
// Old Place and classic rooms retain their mainline namespace. No prototype progress or profiles are imported.
export const RAILWAY_PLAY_NS = 't1v02';
export const isPlayableRailwayRoom = (room: string) => /^t1v02-[a-z0-9-]{1,26}$/.test(room);
export const isRailwayRoom = (room: string) =>
  /^t1v01-proto-[a-z0-9-]{1,20}$/.test(room) || isPlayableRailwayRoom(room);
export function railwayRoomId(room: string) {
  let h = 2166136261;
  for (const c of room) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  const name = room.length <= 26 ? room : `${room.slice(0, 18)}-${(h >>> 0).toString(36).padStart(7, '0')}`;
  return `${RAILWAY_PLAY_NS}-${name}`;
}

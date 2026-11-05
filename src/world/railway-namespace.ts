// Isolated headless T1 proof. The default v06 world and its save/protocol stay unchanged.
// History: t1v01 (2026-11-04): authority, receipts and recovery envelope, no imported prototype progress.
export const RAILWAY_NS = 't1v01';
export const RAILWAY_ROOM = `${RAILWAY_NS}-proto-production-core`;
export const isRailwayRoom = (room: string) => /^t1v01-proto-[a-z0-9-]{1,20}$/.test(room);

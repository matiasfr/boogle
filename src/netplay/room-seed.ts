// The stage this room was seeded at, if it is a playtest jump room (docs/plans/playtest-jump-in.md): one memoized
// GET /rooms/<id>/host, whose `seed` the server reads from the room's sidecar (server/src/jump.ts). Room metadata, not
// world state: it comes from the room, not the URL, so a friend who joined by invite gets the same answer. Null for
// every other room, and when the server can't be reached. Read by the Jump in page, the arrival's landing and playdata.
import { getRoomId } from './net.ts';
import { railwayRoomId } from '../world/railway-namespace.ts';
import type { RoomSeed } from '../world/railway-jump.ts';

let memo: Promise<RoomSeed | null> | null = null;
export function roomSeed(): Promise<RoomSeed | null> {
  return (memo ??= (async () => {
    const server = import.meta.env.VITE_BOOGLE_SERVER;
    if (!server) return null;
    try {
      const r = await fetch(new URL(`/rooms/${railwayRoomId(getRoomId())}/host`, server), {
        cache: 'no-store',
        signal: AbortSignal.timeout(10_000),
      });
      if (!r.ok) return null;
      const seed = ((await r.json()) as { seed?: unknown }).seed as Partial<RoomSeed> | undefined;
      return typeof seed?.stage === 'string' && typeof seed.at === 'string' ? { stage: seed.stage, at: seed.at } : null;
    } catch {
      return null;
    }
  })());
}

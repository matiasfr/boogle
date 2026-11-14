// The stage this room was seeded at, if it is a playtest jump room (docs/plans/playtest-jump-in.md): one memoized
// GET /rooms/<id>/host, whose `seed` the server reads from the room's sidecar (server/src/jump.ts). Room metadata, not
// world state: it comes from the room, not the URL, so a friend who joined by invite gets the same answer. Null for
// every other room, and when the server can't be reached. Read by the Jump in page, the arrival's landing and playdata.
// The same status carries `replaced`, the room's last replacement by a stage (docs/plans/room-fast-forward.md).
import { getRoomId } from './net.ts';
import { railwayRoomId } from '../world/railway-namespace.ts';
import type { RoomSeed } from '../world/railway-jump.ts';

/** The room's last recorded replacement by a stage (docs/plans/room-fast-forward.md), and the `born` of that world. */
export type RoomReplaced = { stage: string; born: string };
type HostMeta = { seed: RoomSeed | null; replaced: RoomReplaced | null };
const NONE: HostMeta = { seed: null, replaced: null };

/** The two records out of a host status body; anything malformed reads as absent. */
export function hostMeta(body: unknown): HostMeta {
  const { seed, replaced } = (body && typeof body === 'object' ? body : {}) as {
    seed?: Partial<RoomSeed> | null;
    replaced?: Partial<RoomReplaced> | null;
  };
  return {
    seed: typeof seed?.stage === 'string' && typeof seed.at === 'string' ? { stage: seed.stage, at: seed.at } : null,
    replaced:
      typeof replaced?.stage === 'string' && typeof replaced.born === 'string'
        ? { stage: replaced.stage, born: replaced.born }
        : null,
  };
}

async function read(timeoutMs: number): Promise<HostMeta> {
  const server = import.meta.env.VITE_BOOGLE_SERVER;
  if (!server) return NONE;
  try {
    const r = await fetch(new URL(`/rooms/${railwayRoomId(getRoomId())}/host`, server), {
      cache: 'no-store',
      signal: AbortSignal.timeout(timeoutMs),
    });
    return r.ok ? hostMeta(await r.json()) : NONE;
  } catch {
    return NONE;
  }
}

let memo: Promise<HostMeta> | null = null;
const atLoad = () => (memo ??= read(10_000));
export const roomSeed = (): Promise<RoomSeed | null> => atLoad().then((m) => m.seed);
/** The replacement on record when this page loaded (playdata). */
export const roomReplaced = (): Promise<RoomReplaced | null> => atLoad().then((m) => m.replaced);
/** Asked now, never memoized: the room's world just changed under this page (src/features/room-reset.ts). */
export const roomReplacedNow = (): Promise<RoomReplaced | null> => read(4000).then((m) => m.replaced);

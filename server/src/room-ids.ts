// The durable room-name contract shared by admission, Store writes and boot cleanup.
import { WORLD_NS } from '../../src/world/namespace.ts';
import { RAILWAY_PLAY_NS } from '../../src/world/railway-namespace.ts';

export type RoomNamespaces = { world: string; rail: string; currentRooms?: readonly string[] };
export const validRoomId = (id: string) => /^[a-z0-9-]{1,32}$/.test(id);
export const roomNamespace = (id: string) => /^((?:rail-)?v\d+)-/.exec(id)?.[1] ?? null;
export const roomIdFromFile = (name: string) => /^([a-z0-9-]{1,32})\.json(?:\.\d+\.[0-9a-f]{8}\.tmp)?$/.exec(name)?.[1];

export function roomNamespaces(serverRooms: readonly string[] = []): RoomNamespaces {
  return { world: WORLD_NS, rail: RAILWAY_PLAY_NS, currentRooms: serverRooms.filter(validRoomId) };
}

export function currentRoomId(id: string, ns: RoomNamespaces): boolean {
  return (
    validRoomId(id) &&
    (id.startsWith(`${ns.world}-`) ||
      id.startsWith(`${ns.rail}-`) ||
      !roomNamespace(id) ||
      !!ns.currentRooms?.includes(id))
  );
}

export function currentRoomFile(name: string, ns: RoomNamespaces): boolean {
  // Protect even a malformed current-prefix file independently of candidate classification.
  if (name.startsWith(`${ns.world}-`) || name.startsWith(`${ns.rail}-`)) return true;
  const id = roomIdFromFile(name);
  return id !== undefined && currentRoomId(id, ns);
}

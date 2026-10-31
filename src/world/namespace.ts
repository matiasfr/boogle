// The world namespace: bumped on a clean break (a new world that old tabs must never meet). It prefixes the room id
// the world syncs under, which moves the PeerJS host id, the localStorage save and the server snapshot together, while
// the URL (?room=) and everything shown to players keep the plain room name. PeerJS ids allow no dots, hence 'v01', 'v02'.
// dev/registry skips its mixed-build comparison with main when this differs from main's (no old tab can join). A
// bump wipes every room's world: it is a deliberate clean break, never a way to quiet that check.
// History: v01 (0.1 groundwork); v02 (2026-11): refocus cleanup: no fruit, no shore leftovers, catalog renumbered.
// Pure: read by src/netplay/net.ts, the registry check and tests.
export const WORLD_NS = 'v02';

// The id a room's world lives under. The server and peer-room take [a-z0-9-]{1,32}: a room name too long to fit keeps
// its start plus a short hash of the whole name, so two long names practically never share a world.
const MAX = 31 - WORLD_NS.length;
function shortHash(s: string): string {
  let h = 2166136261;
  for (let k = 0; k < s.length; k++) h = Math.imul(h ^ s.charCodeAt(k), 16777619);
  return (h >>> 0).toString(36);
}
export function worldRoomId(room: string): string {
  const r = String(room);
  const id = r.length <= MAX ? r : `${r.slice(0, MAX - 8)}-${shortHash(r).padStart(7, '0').slice(0, 7)}`;
  return `${WORLD_NS}-${id}`;
}

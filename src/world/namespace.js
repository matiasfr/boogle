// The world namespace: bumped on a clean break (a new world that old tabs must never meet). It prefixes the room id
// the world syncs under, which moves the PeerJS host id, the localStorage save and the server snapshot together, while
// the URL (?room=) and everything shown to players keep the plain room name. PeerJS ids allow no dots, hence 'v01'.
// dev/registry skips its mixed-build comparison with main when this differs from main's (no old tab can join).
// Pure: read by src/netplay/net.js, the registry check and tests.
export const WORLD_NS = 'v01';

// The id a room's world lives under. The server and peer-room take [a-z0-9-]{1,32}, so the room is cut to fit.
export const worldRoomId = (room) => `${WORLD_NS}-${String(room).slice(0, 31 - WORLD_NS.length)}`;

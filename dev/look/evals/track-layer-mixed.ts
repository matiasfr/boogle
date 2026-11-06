// Mixed-build transport fixture for track-layer.ts?mixedSeats=1. The real server must reject
// v07's room prefix before it can elect a seat lead. This is not a rendered older binary.
import { createWsRoom } from '../../../src/net/ws-room.ts';
import { rand } from '../../../src/net/ids.ts';
import { getRoomId } from '../../../src/netplay/net.ts';
import { worldRoomId } from '../../../src/world/namespace.ts';

export async function rejectLegacySeatLead() {
  const currentRoom = worldRoomId(getRoomId());
  const oldRoom = currentRoom.replace(/^[^-]+-/, 'v07-');
  if (oldRoom === currentRoom) throw new Error('MIXED SEATS: older room lead can still arbitrate new seats');
  let room;
  try {
    room = await createWsRoom({
      server: import.meta.env.VITE_BOOGLE_SERVER,
      roomId: oldRoom,
      pid: rand(16),
      key: rand(32),
      build: 'v07-seat-fixture',
    });
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'incompatible') {
      console.log('MIXED SEATS REJECTED LEGACY ROOM ' + JSON.stringify({ oldRoom, currentRoom }));
      return;
    }
    throw error;
  }
  room.close();
  throw new Error('MIXED SEATS: server accepted an incompatible legacy room');
}

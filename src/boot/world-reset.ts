// Evaluate before arrival or any feature reads progress. Accessing localStorage itself can be blocked.
import { resetForWorld, resetForRoom, pruneProfiles, readRoomReset, ROOM_RESET_KEY } from '../player/world-reset.ts';
import { WORLD_NS } from '../world/namespace.ts';
import { RAILWAY_PLAY_NS } from '../world/railway-namespace.ts';

let newWorld = false;
let stage = '';
function reset() {
  try {
    const storage = localStorage;
    newWorld = resetForWorld(storage, { world: WORLD_NS, rail: RAILWAY_PLAY_NS }).newWorld;
    const room = resetRoom();
    if (room) {
      resetForRoom(storage, room.id, room.name);
      newWorld = true;
      stage = room.stage;
    }
    return pruneProfiles(storage, navigator.locks, RAILWAY_PLAY_NS, room?.id);
  } catch {
    return Promise.resolve();
  }
}

// The last load found its room's world had started over (src/netplay/net.ts) and reloaded into this one.
function resetRoom() {
  try {
    const note = readRoomReset(sessionStorage.getItem(ROOM_RESET_KEY));
    sessionStorage.removeItem(ROOM_RESET_KEY);
    return note;
  } catch {
    return null;
  }
}

export const claimsPruned = reset();
/** This load is the first since the world, or the room joined last load, was reset: the player starts the game over
 * (src/player/arrival.ts). */
export const worldWasReset = newWorld;
/** The stage this room was just replaced with, when that replacement is why this load starts over; else ''. The
 * player lands at the stage with no fall or card and reads one line (docs/plans/room-fast-forward.md, "Client"). */
export const replacedStage = stage;

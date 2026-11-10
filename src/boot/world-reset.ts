// Evaluate before arrival or any feature reads progress. Accessing localStorage itself can be blocked.
import { resetForWorld, resetForRoom, pruneProfiles, ROOM_RESET_KEY } from '../player/world-reset.ts';
import { WORLD_NS } from '../world/namespace.ts';
import { RAILWAY_PLAY_NS } from '../world/railway-namespace.ts';

let newWorld = false;
function reset() {
  try {
    const storage = localStorage;
    newWorld = resetForWorld(storage, { world: WORLD_NS, rail: RAILWAY_PLAY_NS }).newWorld;
    const room = resetRoom();
    if (room) {
      resetForRoom(storage, room.id, room.name);
      newWorld = true;
    }
    return pruneProfiles(storage, navigator.locks, RAILWAY_PLAY_NS, room?.id);
  } catch {
    return Promise.resolve();
  }
}

// The last load found its room's world had started over (src/netplay/net.ts) and reloaded into this one.
function resetRoom() {
  try {
    const [id, name] = (sessionStorage.getItem(ROOM_RESET_KEY) ?? '').split(' ');
    sessionStorage.removeItem(ROOM_RESET_KEY);
    return id && name ? { id, name } : null;
  } catch {
    return null;
  }
}

export const claimsPruned = reset();
/** This load is the first since the world, or the room joined last load, was reset: the player starts the game over
 * (src/player/arrival.ts). */
export const worldWasReset = newWorld;

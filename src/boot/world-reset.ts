// Evaluate before arrival or any feature reads progress. Accessing localStorage itself can be blocked.
import { resetForWorld, pruneProfiles } from '../player/world-reset.ts';
import { WORLD_NS } from '../world/namespace.ts';
import { RAILWAY_PLAY_NS } from '../world/railway-namespace.ts';

let newWorld = false;
function reset() {
  try {
    const storage = localStorage;
    newWorld = resetForWorld(storage, { world: WORLD_NS, rail: RAILWAY_PLAY_NS }).newWorld;
    return pruneProfiles(storage, navigator.locks, RAILWAY_PLAY_NS);
  } catch {
    return Promise.resolve();
  }
}

export const claimsPruned = reset();
/** This load is the first since the world was reset: the player starts the game over (src/player/arrival.ts). */
export const worldWasReset = newWorld;

// Evaluate before arrival or any feature reads progress. Accessing localStorage itself can be blocked.
import { resetForWorld, pruneProfiles } from '../player/world-reset.ts';
import { WORLD_NS } from '../world/namespace.ts';
import { RAILWAY_PLAY_NS } from '../world/railway-namespace.ts';

function reset() {
  try {
    const storage = localStorage;
    resetForWorld(storage, { world: WORLD_NS, rail: RAILWAY_PLAY_NS });
    return pruneProfiles(storage, navigator.locks, RAILWAY_PLAY_NS);
  } catch {
    return Promise.resolve();
  }
}

export const claimsPruned = reset();

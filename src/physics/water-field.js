// Tiny bridge so physics.js and splash.js can ask "where is the water here?" without importing the
// world modules (which import physics). world/water-world.js fills these in. Defaults = sea only.
import { SEA } from '../constants.js';

export const waterField = {
  // Highest water surface at x, z: the sea, or a pool/stream from the sim where that is higher.
  surfaceAt: () => SEA,
  // Flow velocity (m/s) of sim water at x, z; writes into out {x, z}. Zero in the sea and on dry ground.
  currentAt: (x, z, out) => {
    out.x = out.z = 0;
    return out;
  },
  // Set by the world: the ball owner calls this on a big landing in a pool (speed in m/s).
  onBallImpact: null,
};

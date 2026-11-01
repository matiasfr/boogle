// Tiny bridge so physics.js and splash.js can ask "where is the water here?" without importing the world modules (which
// import physics). Defaults to the sea; the caves add their pond.
import { SEA } from '../constants.ts';

export const waterField = {
  // Highest water surface at x, z: the sea, or the cave pond where that is higher.
  surfaceAt: (_x: number, _z: number) => SEA, // eslint-disable-line @typescript-eslint/no-unused-vars -- the caves replace it
};

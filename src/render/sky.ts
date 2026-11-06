// The sky's shared, read-only state. Every place in the world uses the summer sky at one fixed time of day
// (src/render/water/frozen-sky.ts, owner calls 3–6 November); there is no day/night cycle. Everything here is cosmetic.
import * as THREE from 'three';
export { skyU } from './sky-radiance.ts';

// Set every frame by features that take the camera somewhere the sky can't reach: underground = 0..1 (the caves).
// The fog closes in, dark, and the sky's light turns warm and dims a little; the cave meshes bake their own darkening
// with depth (aAmb in src/pois/caves/), so the global dip stays mild.
export const atmosphere = { underground: 0 };

// Read-only view of the current sky for other modules, filled by frozen-sky.ts: day (0 night .. 1 day), frac, phase,
// illum, keyLight (a sun bright enough to cast shadows) and the sun's direction.
export const skyNow = { frac: 0, phase: 0, illum: 0, day: 1, keyLight: true, sunDir: new THREE.Vector3() };

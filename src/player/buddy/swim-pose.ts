// Local presentation only. Wave bobs briefly leave the physics swim threshold without leaving the water.
const GRACE = 0.3; // s: observed passive gaps were 0.03–0.22 s
const EXIT_SPEED = 3; // m/s: above passive resurfacing (2.5), below a swim jump (4.5)

export function swimPoseGrace(previous: number, swimming: boolean, airborne: boolean, vy: number, dt: number) {
  if (swimming) return GRACE;
  if (!airborne || vy > EXIT_SPEED) return 0; // land/wade or launch: do not delay the real pose
  return Math.max(0, previous - dt);
}

// Wade or swim, for your own body. The physics floats you once the water over the bed is deeper than `float` (a body
// standing there would have the surface SWIM_DEPTH over its centre), so at that depth the body bobs about its threshold:
// waves and a sloping bed toggle `swimming` and seabed contact every few frames. The pose instead follows the depth of
// water at your feet, against a wave-smoothed surface, with a band either side: deep water swims even when the bob
// touches the bed, shallow water wades even when a wave lifts you. Presence still carries the physics flag.
const SURFACE_TAU = 0.6; // s: longer than a wave bob, short enough to follow the swell
const BAND = 0.15; // m either side of the float depth

export type WaterColumn = { surface: number; deep: boolean; ready: boolean };
export const waterColumn = (): WaterColumn => ({ surface: 0, deep: false, ready: false });

/** Updates `c` and returns whether the water at the feet is deep enough to swim. */
export function deepWater(c: WaterColumn, surface: number, bed: number, float: number, dt: number) {
  c.surface = c.ready ? c.surface + (surface - c.surface) * (1 - Math.exp(-dt / SURFACE_TAU)) : surface;
  c.ready = true;
  const depth = c.surface - bed;
  if (depth > float + BAND) c.deep = true;
  else if (depth < float - BAND) c.deep = false;
  return c.deep;
}

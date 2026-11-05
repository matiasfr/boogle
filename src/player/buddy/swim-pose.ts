// Local presentation only. Wave bobs briefly leave the physics swim threshold without leaving the water.
const GRACE = 0.3; // s: observed passive gaps were 0.03–0.22 s
const EXIT_SPEED = 3; // m/s: above passive resurfacing (2.5), below a swim jump (4.5)

export function swimPoseGrace(previous: number, swimming: boolean, airborne: boolean, vy: number, dt: number) {
  if (swimming) return GRACE;
  if (!airborne || vy > EXIT_SPEED) return 0; // land/wade or launch: do not delay the real pose
  return Math.max(0, previous - dt);
}

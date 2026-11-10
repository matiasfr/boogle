// The float near a jump's top: gravity at APEX_GRAVITY while you rise slowly. The controller (state.ts, shapeJump) gives
// it to a held first jump; an air jump gives its own, held or not. The two never stack: a second jump launched while the
// first is still rising would otherwise get both halves, hang weightless just under the apex speed and climb for as long
// as Jump is held (P1, live v24).
export const APEX_GRAVITY = 0.5;

/**
 * An air jump's vertical force near its top, given the force already on the body this step (the controller's) and the
 * body's weight (mass x gravity). It lifts by the float at most, so gravity always wins while you rise.
 */
export function airJumpApexForce(force: number, weight: number) {
  const lift = weight * (1 - APEX_GRAVITY);
  return Math.min(force + lift, lift);
}

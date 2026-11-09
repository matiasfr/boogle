// Local/Owner glide maths, ported from Place's moves.ts (toggleGlide, openGlide, closeGlide, stepGlide). Plain numbers
// keep the step independent of render and campaign owners, as hook-path.ts does for the hook.
//
// The glide spends height and never gives it back: no boost, no lift, and closing and reopening can never beat keeping it
// open (docs/research/botw-glide-target.md). The canopy is armed while you rise, and holds you from the apex down.
export type GlideMove = {
  glideSpeed: number;
  glideSink: number;
  glideAccel: number;
  glideBrake: number;
  glideOver: number;
  glideTurnTau: number;
  glideTurnMax: number;
  glideDeploy: number;
};
export type Glide = {
  /** The canopy's out; it holds you once you're coming down. */
  open: boolean;
  /** And it's holding you. */
  holding: boolean;
  deployT: number;
  deployV0: number;
  /** performance.now() until which a press as you stepped off still opens it. */
  armUntil: number;
  opened: number;
  flights: number;
};
export type Vec = { x: number; y: number; z: number };
const FIXED = 1 / 60;
/** A press as you step off still counts for this long (Place's armUntil). */
export const GLIDE_ARM_MS = 180;
export const createGlide = (): Glide => ({
  open: false,
  holding: false,
  deployT: 0,
  deployV0: 0,
  armUntil: 0,
  opened: 0,
  flights: 0,
});
export function openGlide(g: Glide) {
  g.open = true;
  g.holding = false;
  g.armUntil = 0;
  g.opened++;
}
export function closeGlide(g: Glide) {
  g.open = g.holding = false;
}
/** An air jump while the canopy is out: it stays armed, and catches you again when you come down. */
export function rearmGlide(g: Glide) {
  if (g.open) g.holding = false;
}
const TAU = Math.PI * 2;
const wrap = (a: number) => a - TAU * Math.round(a / TAU);
/**
 * One fixed step with the canopy out. `before` is the body's velocity before the controller's steering this step (thrown
 * away); `wish` the unit input. Writes `v` and returns true when it cancels gravity, false while rising (armed only).
 */
export function stepGlide(
  g: Glide,
  before: { x: number; z: number },
  v: Vec,
  wish: { x: number; z: number },
  m: GlideMove,
) {
  // Rising: it stays armed, and the jump you earned keeps its height.
  if (!g.holding) {
    if (v.y > 0) return false;
    g.holding = true;
    g.flights++;
    g.deployT = 0;
    g.deployV0 = v.y;
  }
  // Down: over glideDeploy from whatever you were falling at, with no overshoot. Reopening starts from where you are, so
  // it never beats staying open.
  g.deployT += FIXED;
  const q = Math.min(1, g.deployT / m.glideDeploy);
  const sink = -m.glideSink;
  // Already slower than the sink (off the apex): no quicker fall than gravity's, and never a lift.
  v.y = g.deployV0 + (sink - g.deployV0) * (q * q * (3 - 2 * q));
  // Across: a heading and a speed.
  let sp = Math.hypot(before.x, before.z);
  const u = Math.min(1, Math.hypot(wish.x, wish.z));
  let th = Math.atan2(before.x, before.z);
  const want = m.glideSpeed * u;
  if (u > 0.05) {
    const goal = Math.atan2(wish.x, wish.z);
    if (sp < 0.3) th = goal;
    else {
      const e = wrap(goal - th);
      th += Math.max(-m.glideTurnMax, Math.min(m.glideTurnMax, e / m.glideTurnTau)) * FIXED;
    }
  }
  if (sp < want) sp = Math.min(want, sp + m.glideAccel * FIXED);
  else if (u <= 0.05) sp = Math.max(0, sp - m.glideBrake * FIXED);
  else sp = Math.max(want, sp - (sp > m.glideSpeed ? m.glideOver : m.glideBrake) * FIXED);
  v.x = Math.sin(th) * sp;
  v.z = Math.cos(th) * sp;
  return true;
}

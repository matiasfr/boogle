// Animation maths for cosmetic motion (docs/research/procedural-animation.md, rec 1): a frame-rate-independent damper,
// a spring integrated exactly, and a few easing curves. Plain numbers, no three.js or DOM, so it unit-tests in Node
// (test/motion.test.ts). Local only: uses Math.exp/sin/cos, so never import it from src/sim/ or src/world/rules/.
//
// Why exact: `x += (goal - x) * k` changes with the frame rate, and an Euler-stepped spring drifts (and blows up once
// stiff enough at a long frame). These closed forms give the same curve at 20 fps as at 120 (Holden, "Spring-It-On",
// theorangeduck.com/page/spring-roll-call).
// Users: feel.ts (squash, lean), the build prototype's settles, the wagon's look. Still to port: the soapbox's Euler
// suspension spring and its exp() smoothing (src/proto/soapbox/index.ts), left alone while its feel pass is in flight.

const LN2 = Math.LN2;

/** The fraction of the way to its goal a damper moves in `dt` seconds, for a half-life in seconds (Holden's form). */
export const dampK = (halfLife: number, dt: number): number => 1 - Math.pow(2, -dt / Math.max(1e-5, halfLife));
/** Moves `x` toward `goal`, halving the gap every `halfLife` seconds, whatever the frame rate. */
export const damp = (x: number, goal: number, halfLife: number, dt: number): number =>
  x + (goal - x) * dampK(halfLife, dt);
/** The half-life of the older `1 - Math.exp(-dt * rate)` form, to port one without changing how it looks. */
export const halfLifeOf = (rate: number): number => LN2 / rate;

/** A spring's position and speed. */
export type Spring = { x: number; v: number };
/** Stiffness (1/s²) for a natural frequency in Hz; damping (1/s) for that and a damping ratio (1 critical, < 1 bouncy). */
export const stiffnessOf = (hz: number): number => (2 * Math.PI * hz) ** 2;
export const dampingOf = (hz: number, zeta: number): number => 2 * zeta * 2 * Math.PI * hz;

/**
 * Advances `s` by `dt` seconds of x'' = -stiffness (x - goal) - damping x', exactly (under-, critically or
 * over-damped), and returns it. Kick it by adding to `s.v`; the goal may move between calls. stiffness > 0.
 */
export function springStep(s: Spring, goal: number, stiffness: number, damping: number, dt: number): Spring {
  const w = Math.sqrt(stiffness),
    zeta = damping / (2 * w),
    a = damping / 2; // the decay rate, zeta * w
  const y = s.x - goal,
    v = s.v;
  if (Math.abs(zeta - 1) < 1e-4) {
    const e = Math.exp(-a * dt),
      c = v + a * y;
    s.x = goal + (y + c * dt) * e;
    s.v = (v - a * c * dt) * e;
  } else if (zeta < 1) {
    const wd = w * Math.sqrt(1 - zeta * zeta),
      e = Math.exp(-a * dt),
      cs = Math.cos(wd * dt),
      sn = Math.sin(wd * dt);
    s.x = goal + e * (y * cs + ((v + a * y) / wd) * sn);
    s.v = e * (v * cs - ((stiffness * y + a * v) / wd) * sn);
  } else {
    const r = w * Math.sqrt(zeta * zeta - 1),
      r1 = -a + r,
      r2 = -a - r,
      c2 = (v - r1 * y) / (r2 - r1),
      c1 = y - c2,
      e1 = c1 * Math.exp(r1 * dt),
      e2 = c2 * Math.exp(r2 * dt);
    s.x = goal + e1 + e2;
    s.v = r1 * e1 + r2 * e2;
  }
  return s;
}

/**
 * A spring's answer to a unit kick at t = 0, as a function of time alone (for things drawn from a start time, not
 * stepped): starts at 0, swings to about +1 first, then rings down. hz is how fast it rings, zeta how fast it stops.
 */
export function ring(t: number, hz: number, zeta: number): number {
  if (t <= 0) return 0;
  const w = 2 * Math.PI * hz,
    wd = w * Math.sqrt(Math.max(1e-6, 1 - zeta * zeta));
  return Math.exp(-zeta * w * t) * Math.sin(wd * t);
}

// ---------------------------------------------------------------- easing curves, t in 0..1 (clamped), 0 -> 0, 1 -> 1
const c01 = (t: number) => (t <= 0 ? 0 : t >= 1 ? 1 : t);
export const outQuad = (t: number): number => ((t = c01(t)), 1 - (1 - t) * (1 - t));
export const outCubic = (t: number): number => ((t = c01(t)), 1 - (1 - t) ** 3);
export const inOutSine = (t: number): number => (1 - Math.cos(Math.PI * c01(t))) / 2;
/** Overshoots past 1 and comes back; `over` 1.70158 is Penner's classic ~10 % overshoot. */
export const outBack = (t: number, over = 1.70158): number => {
  const u = c01(t) - 1;
  return 1 + (over + 1) * u * u * u + over * u * u;
};
/** Snaps past 1 and wobbles in; `period` is the wobble's length as a fraction of the whole. */
export const outElastic = (t: number, period = 0.3): number => {
  t = c01(t);
  if (t === 0 || t === 1) return t;
  return Math.pow(2, -10 * t) * Math.sin(((t - period / 4) * (2 * Math.PI)) / period) + 1;
};
/** The lift of a thrown arc: 0 at both ends, 1 in the middle (a parabola). Add `height * arc(t)` to a lerp. */
export const arc = (t: number): number => ((t = c01(t)), 4 * t * (1 - t));

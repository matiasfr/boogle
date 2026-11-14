// Two threads of air off the wing's tips while the canopy holds you and you're moving: it reads as speed, against the
// sky. Place's moves-view.ts had them; the port to the railway (glide-view.ts) left them behind, so they live here as
// plain numbers a unit test can hold (test/railway-glide-wisps.test.ts). Local and cosmetic: no shared state.

/** Place's numbers: tips 1.25 m either side and 1.45 m up, 50 pairs a second from 8 m/s, each 0.35 s and 3.5 cm. */
export const WISP = {
  span: 1.25,
  up: 1.45,
  rate: 50,
  fullAt: 8,
  life: 0.35,
  size: 0.035,
  alpha: 0.5,
  rise: 0.1,
  fade: 0.5,
};

/**
 * The air of a flight (the wisps and glide-wind.ts's wind) shows while the canopy has the body and nothing full-screen
 * has the screen: a shot, a reward card or the pause view over a flight is quiet, and the air resumes after it. Place
 * had no such gate and kept both going through its celebration shots.
 */
export const glideAir = (holding: boolean, momentBusy: boolean) => holding && !momentBusy;

export type WispAt = (x: number, y: number, z: number) => void;

export function createGlideWisps() {
  let owed = 0;
  /**
   * One frame. `holding`: the canopy has the body; `p`: the body; `yaw`: its heading; `speed`: horizontal m/s.
   * Calls `at` once per tip for each pair due, and returns how many wisps it asked for.
   */
  return (
    dt: number,
    holding: boolean,
    p: { x: number; y: number; z: number },
    yaw: number,
    speed: number,
    at: WispAt,
  ) => {
    if (!holding) return 0;
    const sx = Math.cos(yaw) * WISP.span,
      sz = -Math.sin(yaw) * WISP.span;
    let n = 0;
    for (owed += dt * WISP.rate * Math.min(1, speed / WISP.fullAt); owed >= 1; owed--) {
      at(p.x - sx, p.y + WISP.up, p.z - sz);
      at(p.x + sx, p.y + WISP.up, p.z + sz);
      n += 2;
    }
    return n;
  };
}

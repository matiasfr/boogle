// A place-bound view's redraw gate (docs/plans/world-streaming.md, step 4, the verb "sleep"): a view that rebuilds a
// box batch every frame skips the rebuild while the place is far, nothing there is moving and nothing it draws has
// changed, so the batch keeps standing as last drawn. Only the redraw sleeps: the view's own logic, its cues and
// everything it hands other views run every frame, so a wake has nothing to catch up on and the first redraw is a
// plain draw of the current state. Distance is `viewDistance` (the telescope counts as near). Local rendering only.
import { resident } from './lod-level.ts';
import { viewDistance } from './view-distance.ts';

/** Metres past a place's own reach: back in from SLEEP.near, out at SLEEP.far. At 250 m a pixel is about 0.4 m tall at
 * 800 px and 62° (0.2 m at DPR 2), so a still pulse or flutter there is under a pixel. */
export const SLEEP = { near: 250, far: 300 } as const;

/** A gate around the place `points` span (its centre, plus the farthest point's reach on both distances). */
export function createRedrawSleep(points: readonly { x: number; z: number }[]) {
  const n = Math.max(1, points.length);
  const cx = points.reduce((s, p) => s + p.x, 0) / n,
    cz = points.reduce((s, p) => s + p.z, 0) / n;
  const reach = points.reduce((r, p) => Math.max(r, Math.hypot(p.x - cx, p.z - cz)), 0);
  let awake = true,
    wasMoving = false,
    drawn: string | null = null;
  return {
    /** Whether to rebuild this frame: near (resident), something is `moving` or stopped moving this frame, or `key`
     * (what the draw reads) changed. The frame movement stops is always drawn, so a key that misses something a
     * motion leaves behind (a line, a lamp) never strands the last moving frame. */
    redraw(moving: boolean, key: string) {
      awake = resident(viewDistance(cx, cz), awake, SLEEP.near + reach, SLEEP.far + reach);
      const stopped = wasMoving && !moving;
      wasMoving = moving;
      if (!awake && !moving && !stopped && key === drawn) return false;
      drawn = key;
      return true;
    },
    awake: () => awake,
  };
}

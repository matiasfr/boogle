// The hand-off cut (docs/plans/forge-call-handoff.md, step 1): the last 2.5 s of Far Head's shot and of the pier's show
// look at the forge's pedestal, where the crane lifts the thing the forge just cast, and the camera comes home facing
// the forge. Pure (layout only), for tests; far-head-view.ts and pier-view.ts play it.
import { LINE2_BOILER } from '../../sim/railway-line2-layout.ts';

type Point = { x: number; y: number; z: number };
/** Seconds the cut holds, and the cut home after it (a blend across 500 m would be a smear, so it is a cut). */
export const FORGE_CUT = { seconds: 2.5, back: 0.001 } as const;
/** Metres from the pedestal's foot: where the camera stands as the cut lands, where it has drifted by its end, and
 * what it looks at (over the pedestal, toward the forge behind it, so the chimney's plume starts in frame). The
 * camera stands on Grant's side of the apron, across road 1 from the pedestal (his 7 m pass at 24:57), west of the
 * halt's post, which filled a third of the frame from 3 m further east (looked at, 15 November). */
const VIEW = { from: [1.9, 3.7, 9.3], to: [1.5, 3.4, 8.3], at: [-1.2, 2.9, -1.8] } as const;
/** The breaker's cut (the pier's show): nearer and from low down, looking up, so the hammer the crane stands up under
 * its hook is tall in the frame with the sky behind its head, not a grey stick against the bush and the fence
 * (looked at, 15 November: the playtester quit at the pier not knowing a hammer waited). It stands clear of the
 * halt's roof and post, which the boiler's view starts under. */
const BREAKER_VIEW = { from: [0.8, 1.3, 5], to: [0.6, 1.2, 4.4], at: [-0.1, 3.0, 0] } as const;

const foot = (): Point => ({ x: LINE2_BOILER.x / 100, y: LINE2_BOILER.y / 100, z: LINE2_BOILER.z / 100 });
const off = (o: readonly [number, number, number]): Point => {
  const p = foot();
  return { x: p.x + o[0], y: p.y + o[1], z: p.z + o[2] };
};
/** The cut as `createCameraPullOut`'s `end` takes it. */
export const forgeCut = (part: 'boiler' | 'breaker' = 'boiler'): { pos: Point; to: Point; at: Point } => {
  const view = part === 'breaker' ? BREAKER_VIEW : VIEW;
  return { pos: off(view.from), to: off(view.to), at: off(view.at) };
};
/** The follow camera's yaw that looks from (x, z) toward the pedestal (camera yaw: behind a Buddy facing that way). */
export function yawToForge(x: number, z: number) {
  const p = foot();
  return Math.atan2(x - p.x, z - p.z);
}

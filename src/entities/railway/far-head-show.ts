// Far Head's shot (./far-head-view.ts plays it on Q5's live completion edge), as world points. Authored along line 2,
// so it moves with the line: back along the trestle, beside it and above the rail, drifting further out, looking over
// the rail's end where the rockets burst. Pure (layout only), for tests.
import { LINKS, railY } from '../../place/layout.ts';
import { besideLine } from './line-geometry.ts';

type Point = { x: number; y: number; z: number };
/** Metres along line 2 to the rail's end at Far Head. */
export const FAR_HEAD_S = 546;
/** Metres along the line, beside it and above the rail, at the shot's start and end; `aimUp` over the rail's end. */
export const FAR_HEAD_SHOT = {
  seconds: 5,
  from: { s: 482, side: 22, up: 24 },
  to: { s: 474, side: 27, up: 31 },
  aimUp: 32,
} as const;

const line = () => LINKS[1]!.line;
/** A world point `s` metres along line 2, `side` metres beside it, `up` metres over the rail. */
export function alongFarHead(s: number, side: number, up: number): Point {
  const p = besideLine(line(), s, side);
  return { x: p.x, y: railY(line(), s) + up, z: p.z };
}
/** The rail's end at Far Head, on the rail. */
export const farHeadEnd = (): Point => alongFarHead(FAR_HEAD_S, 0, 0);
/** The shot as `createCameraPullOut.play` takes it: from, drifting to, looking at, seconds. */
export function farHeadShot(): { from: Point; to: Point; at: Point; seconds: number } {
  const { from, to, aimUp, seconds } = FAR_HEAD_SHOT;
  return {
    from: alongFarHead(from.s, from.side, from.up),
    to: alongFarHead(to.s, to.side, to.up),
    at: alongFarHead(FAR_HEAD_S, 0, aimUp),
    seconds,
  };
}

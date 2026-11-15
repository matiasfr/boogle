// Far Head's shot (./far-head-view.ts plays it on Q5's live completion edge), as world points. Authored along line 2,
// so it moves with the line: back along the trestle, beside it and above the rail, drifting further out, looking over
// the rail's end where the rockets burst. Then the hand-off cut to the forge (./forge-cut.ts; owner, 15 November: "the
// Far Head cutscene could be longer, that's fine"). Pure (layout only), for tests.
import { LINKS, railY } from '../../place/layout.ts';
import { besideLine } from './line-geometry.ts';
import { FORGE_CUT, forgeCut } from './forge-cut.ts';

type Point = { x: number; y: number; z: number };
/** Metres along line 2 to the rail's end at Far Head. */
export const FAR_HEAD_S = 546;
/** Metres along the line, beside it and above the rail, at the shot's start and end; `aimUp` over the rail's end. */
/** `seconds` is the Far Head leg and `title` the part of it the Act 2 card is timed to: the card comes up with 3.5 s
 * of that left and stays 4.5 s (acts.ts), so 1.5 s in, as before, and gone at 6 s as the leg ends. The cut follows:
 * 8.5 s in all. */
export const FAR_HEAD_SHOT = {
  seconds: 6,
  title: 5,
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
/** The shot as `createCameraPullOut.play` takes it: from, drifting to, looking at over `leg` seconds, then the cut
 * to the forge (`end`) until `seconds`, and the cut home (`back`). */
export function farHeadShot() {
  const { from, to, aimUp, seconds: leg, title } = FAR_HEAD_SHOT;
  return {
    from: alongFarHead(from.s, from.side, from.up),
    to: alongFarHead(to.s, to.side, to.up),
    at: alongFarHead(FAR_HEAD_S, 0, aimUp),
    leg,
    title,
    seconds: leg + FORGE_CUT.seconds,
    back: FORGE_CUT.back,
    end: forgeCut(),
  };
}

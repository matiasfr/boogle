// Home's West landing in grey (docs/plans/greybox-leg2-massing.md, step 5; calls 108, 114 and 120): on the 3 m shelf
// under the commons' cliff, the `bay` row's unlaid bed pointing out to sea, a 40 m platform each side of it (on posts
// past the shore), platform A's end ramp down to the shelf, the apron behind A, a plain grey stair up the cliff to the
// commons, and one board facing the walk in: "LINE TO BELL ROCK / UNDER CONSTRUCTION" (placeholder). Live for
// everyone on finished Home; nothing to press. The numbers are ./leg2-layout.ts's; the level report walks the same
// ones (dev/level/route-leg2.ts).
import type { OwnedView } from '../../render/owned-view.ts';
import { leg2Boxes, leg2Signs } from './leg2-draw.ts';
import { LEG2 } from './leg2-layout.ts';

const W = LEG2.west;

export const westMassing = () => leg2Boxes(W.pieces, W.pads);
export function westExtras(owner: OwnedView) {
  leg2Signs(owner, [], { nx: 1, nz: 0 }, W.posts);
}

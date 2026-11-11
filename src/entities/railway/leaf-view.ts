// The bridge leaf, live from accepted state (docs/plans/ring-island-build1.md, R4c): the only writer of
// `ringIslandPose` (ring-island/view.ts draws it, ring-island-far/view.ts reads it). It rests raised on the pawl; braced,
// each counterweight footing dips it a quarter; the last brings it down onto the bents in 2.5 s, ease-in, with a thump.
// A restore or a page that joins after the join sees the rest at once. Local view over the read facade; the sim reads
// none of it. The brace and the counterweight ops, the rivet's glint and the player under the toe are R3/R4d's and a
// leftover (see the step's note).
import type { RailwayAdapter } from '../../adapters/railway.ts';
import { thump } from '../../render/machine-sfx.ts';
import { RING_GAP } from '../../sim/railway-ring-layout.ts';
import { aperture } from '../../sim/railway-rows.ts';
import { line2Trains } from '../../sim/railway-queries-line2.ts';
import { ringIslandPose } from '../ring-island/state.ts';
import { RING_S, line2World } from './line2-path.ts';
import { BRACE, LEAF_UP, createLeafMotion, leafRest } from './leaf-shape.ts';

export function createRailwayLeaf(adapter: RailwayAdapter) {
  const motion = createLeafMotion(),
    toe = { x: 0, z: 0 };
  line2World(RING_S + RING_GAP.toe / 100, 0, toe);
  // Whether a real row has been read: until then (the facade loading) the leaf is placed, never swung, so a page that
  // joins after the rivet sees it flat at once.
  let seen = false;
  /** The row's rest, or the raised one while Q7 or the row is not there. Once a frame; nothing kept between frames. */
  function rest() {
    const wd = adapter.read.world();
    const a = adapter.read.ready() && line2Trains(wd) ? aperture(wd) : null;
    ringIslandPose.bracket = a ? Math.min(4, a.cw) : 0;
    ringIslandPose.braced = !!a && a.brace === BRACE.BRACED;
    return a ? leafRest(a.brace, a.cw, a.joined) : LEAF_UP;
  }
  function write() {
    ringIslandPose.leaf = motion.deg;
  }
  function snap() {
    motion.snap(rest());
    seen = adapter.read.ready();
    write();
  }
  snap();
  return {
    restore: snap,
    update(dt: number) {
      if (!seen) return snap();
      motion.aim(rest());
      if (motion.step(dt)) thump(toe.x, toe.z);
      write();
    },
    accepted() {},
    inspect: () => ({ leafView: { deg: motion.deg, moving: motion.moving } }),
  };
}

// The bridge leaf, live from accepted state (docs/plans/ring-island-build1.md, R4c): the only writer of
// `ringIslandPose` (ring-island/view.ts draws it, ring-island-far/view.ts reads it). It rests raised on the pawl; braced,
// each counterweight footing dips it a quarter; the last brings it down onto the bents in 2.5 s, ease-in, with a thump.
// A restore or a page that joins after the join sees the rest at once. Local view over the read facade; the sim reads
// none of it. The brace prompt is here; the counterweight prompt is the jib's, in railhead-view.ts. The rivet's glint is R4d's.
import * as THREE from 'three/webgpu';
import type { RailwayAdapter } from '../../adapters/railway.ts';
import type { Interactable } from '../../player/hands.ts';
import { me } from '../../player/player.ts';
import { thump } from '../../render/machine-sfx.ts';
import { RING_BRACE, RING_GAP } from '../../sim/railway-ring-layout.ts';
import { aperture } from '../../sim/railway-rows.ts';
import { line2Trains } from '../../sim/railway-queries-line2.ts';
import { ringIslandPose } from '../ring-island/state.ts';
import { RING_S, line2World } from './line2-path.ts';
import { BRACE, LEAF_UP, braceOffered, createLeafMotion, leafRest } from './leaf-shape.ts';

export function createRailwayLeaf(adapter: RailwayAdapter) {
  const motion = createLeafMotion(),
    toe = { x: 0, z: 0 };
  // The gold strut's prompt: the brace platform's foot, only once the gap is footed and the leaf is still on the pawl.
  const strut = {
      id: 'railway-brace-leaf',
      verb: 'Pull',
      at: new THREE.Vector3(RING_BRACE.x / 100, RING_BRACE.y / 100 + 1.6, RING_BRACE.z / 100),
      run: () => void adapter.braceLeaf(),
    } satisfies Interactable,
    offered: Interactable[] = [strut],
    none: Interactable[] = [];
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
    /** The brace prompt (call 9): `set === 14`, the pawl in, you within the strut's reach (the server's own test). */
    targets(): Interactable[] {
      const pos = me.body?.position,
        wd = adapter.read.world();
      if (!pos || !adapter.read.ready() || !line2Trains(wd)) return none;
      const a = aperture(wd);
      if (!a || !braceOffered(a.set, a.brace)) return none;
      const near = Math.hypot(pos.x - RING_BRACE.x / 100, pos.z - RING_BRACE.z / 100) <= RING_BRACE.reach / 100 - 0.4;
      return near && Math.abs(pos.y - RING_BRACE.y / 100) <= 2.6 ? offered : none;
    },
    inspect: () => ({ leafView: { deg: motion.deg, moving: motion.moving } }),
  };
}

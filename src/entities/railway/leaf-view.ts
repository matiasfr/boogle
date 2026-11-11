// The bridge leaf, live from accepted state (docs/plans/ring-island-build1.md, R4c): the only writer of
// `ringIslandPose` (ring-island/view.ts draws it, ring-island-far/view.ts reads it). It rests raised on the pawl; braced,
// each counterweight footing dips it a quarter; the last brings it down onto the bents in 2.5 s, ease-in, with a thump.
// A restore or a page that joins after the join sees the rest at once. Local view over the read facade; the sim reads
// none of it. The brace prompt ("Knock out the pawl") is here; the counterweight prompt ("Hang the weight") is the jib's,
// in railhead-view.ts. The rivet's glint is R4d's.
import * as THREE from 'three/webgpu';
import type { RailwayAdapter } from '../../adapters/railway.ts';
import type { Interactable } from '../../player/hands.ts';
import { me } from '../../player/player.ts';
import { thump } from '../../render/machine-sfx.ts';
import { RING_BRACE, RING_GAP } from '../../sim/railway-ring-layout.ts';
import { aperture } from '../../sim/railway-rows.ts';
import { line2Trains } from '../../sim/railway-queries-line2.ts';
import { ringIslandPose } from '../ring-island/state.ts';
import { createFirstReady } from './first-ready.ts';
import { line2World } from './line2-path.ts';
import { RING_S, line2Y } from './line2-path.ts';
import { BRACE, BRACE_VERB, LEAF_UP, TOE_U, toeShove, braceOffered, createLeafMotion, leafRest } from './leaf-shape.ts';

export function createRailwayLeaf(adapter: RailwayAdapter) {
  const motion = createLeafMotion(),
    toe = { x: 0, z: 0 };
  // The gold strut's prompt: the brace platform's foot, only once the gap is footed and the leaf is still on the pawl.
  const strut = {
      id: 'railway-brace-leaf',
      verb: BRACE_VERB,
      at: new THREE.Vector3(RING_BRACE.x / 100, RING_BRACE.y / 100 + 1.6, RING_BRACE.z / 100),
      run: () => void adapter.braceLeaf(),
    } satisfies Interactable,
    offered: Interactable[] = [strut],
    none: Interactable[] = [];
  line2World(RING_S + RING_GAP.toe / 100, 0, toe);
  // The way back along the deck, away from the hinge (unit, ground plane), and the deck under the toe.
  const back = { x: 0, z: 0 },
    toeY = line2Y(RING_S + TOE_U);
  line2World(RING_S + TOE_U - 1, 0, back);
  back.x -= toe.x;
  back.z -= toe.z;
  // Whether the first whole state is in (first-ready.ts): until then the leaf is placed, never swung, so a page that
  // joins after the rivet sees it flat at once. Not read.ready(), which is also false with a full pending window or the
  // link down: a landed leaf must not rise then (nor a landing stop walking you clear).
  const firstReady = createFirstReady(adapter.read.ready);
  /** Placed at a real row's rest at least once: the frame the first whole state arrives snaps, never swings. */
  let placed = false;
  /** The row's rest, or the raised one while Q7 or the row is not there. Once a frame; nothing kept between frames. */
  function rest() {
    const wd = adapter.read.world();
    const a = firstReady() && line2Trains(wd) ? aperture(wd) : null;
    ringIslandPose.bracket = a ? Math.min(4, a.cw) : 0;
    ringIslandPose.braced = !!a && a.brace === BRACE.BRACED;
    return a ? leafRest(a.brace, a.cw, a.joined) : LEAF_UP;
  }
  /** Someone under the toe as the leaf lands is walked back along the deck, never pinned (R4c, finding 4). Local body;
   * u is read off the line's straight run past the toe, so nothing is allocated. */
  function shove(dt: number) {
    const b = me.body;
    if (!b) return;
    const u = TOE_U - ((b.position.x - toe.x) * back.x + (b.position.z - toe.z) * back.z),
      v = toeShove(u, b.position.y - toeY, motion.deg, motion.falling);
    if (v === 0) return;
    b.position.x += back.x * v * dt;
    b.position.z += back.z * v * dt;
  }
  function write() {
    ringIslandPose.leaf = motion.deg;
  }
  // A restore (the first readiness, a hard reset, a soft rebuild after a reconnect: view.ts) places the leaf at its rest
  // with no swing and so no walk back; a landed plate lies below the toe deck's top, so it is never inside anyone there.
  function snap() {
    motion.snap(rest());
    write();
  }
  snap();
  return {
    restore: snap,
    update(dt: number) {
      if (!placed) {
        snap();
        placed = firstReady();
        return;
      }
      motion.aim(rest());
      if (motion.step(dt)) thump(toe.x, toe.z);
      shove(dt);
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

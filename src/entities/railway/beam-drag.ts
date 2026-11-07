// The great beam on its rope (the great beam pass, K2): the near end hangs at the carrier's hip on a short gold rope,
// the far end drags on the ground like a towed rod, and a friend's Help carry lifts it level between two shoulders.
// Local presentation derived from the carrier's smoothed pose: every tab computes the same look, nothing is sent.
import * as THREE from 'three/webgpu';
import { reducedMotion } from '../../constants.ts';
import { dustRing } from '../../render/particle-effects.ts';
import { placeSound } from '../../render/place-sfx.ts';
import { createRope } from '../../render/gold-rope.ts';

/** The carried trunk's length (the worn beam model's). */
export const BEAM_LENGTH = 5.4;
const RADIUS = 0.24;
/** Seconds for a helper's lift (and the drop when they let go). */
const LIFT_S = 0.3;
/** Metres of drag between scrapes. */
const SCRAPE_EVERY = 1.6;
const Z = new THREE.Vector3(0, 0, 1);
const smooth = (t: number) => t * t * (3 - 2 * t);
const a = new THREE.Vector3(),
  b = new THREE.Vector3(),
  d = new THREE.Vector3();

export type BeamDrag = ReturnType<typeof createBeamDrag>;
/** One carried beam's drag. `beam` is the worn model's trunk mesh; it is moved into world space under `world`. */
export function createBeamDrag(
  world: THREE.Object3D,
  beam: THREE.Mesh,
  ground: (x: number, z: number) => number,
  ropeMaterial: THREE.Material,
) {
  const rope = createRope(world, ropeMaterial, 8, 0.04);
  const far = new THREE.Vector3(),
    near = new THREE.Vector3(),
    liftedA = new THREE.Vector3(),
    liftedB = new THREE.Vector3(),
    last = new THREE.Vector3();
  let started = false,
    lift = 0,
    scrape = 0;
  const groundAt = (v: THREE.Vector3) => ground(v.x, v.z) + RADIUS;
  /** Pull the far end to `BEAM_LENGTH` from the near end along the line it trails on, resting on the ground. */
  function follow() {
    d.set(far.x - near.x, 0, far.z - near.z);
    let length = d.length();
    if (length < 1e-3) {
      d.set(1, 0, 0);
      length = 1;
    }
    for (let k = 0; k < 2; k++) {
      const dy = near.y - groundAt(far);
      const flatLength = Math.sqrt(Math.max(0.25, BEAM_LENGTH * BEAM_LENGTH - dy * dy));
      far.set(near.x + (d.x / length) * flatLength, 0, near.z + (d.z / length) * flatLength);
      far.y = Math.min(near.y, groundAt(far));
    }
  }
  return {
    /** Where a friend reaches for the dragging end (the Help carry prompt). */
    grip: new THREE.Vector3(),
    reset() {
      started = false;
      lift = 0;
    },
    /**
     * anchor: the rope's end on the carrier's load frame; hip: where the trunk's near end hangs; from: where the far end
     * starts on the first frame (the trunk as it lay); helped: the two shoulders when a friend lifts it, else null.
     */
    update(
      dt: number,
      anchor: THREE.Vector3,
      hip: THREE.Vector3,
      from: THREE.Vector3,
      helped: [THREE.Vector3, THREE.Vector3] | null,
    ) {
      if (beam.parent !== world) world.add(beam);
      beam.visible = true;
      rope.visible = true;
      near.copy(hip);
      if (!started) {
        far.copy(from);
        last.copy(from);
        started = true;
        // Snap taut: the near end comes up off the ground with a puff where it lay.
        dustRing(hip.x, ground(hip.x, hip.z), hip.z, 6, 1, 0.2);
      }
      const wasLifted = lift;
      lift = Math.min(1, Math.max(0, lift + (helped ? dt : -dt) / LIFT_S));
      if (helped) {
        // Level between the two shoulders, centred as today's helper re-aim.
        d.subVectors(helped[1], helped[0]);
        if (d.lengthSq() < 0.04) d.set(far.x - near.x, 0, far.z - near.z);
        d.normalize();
        a.addVectors(helped[0], helped[1]).multiplyScalar(0.5);
        liftedA.copy(a).addScaledVector(d, -BEAM_LENGTH / 2);
        liftedB.copy(a).addScaledVector(d, BEAM_LENGTH / 2);
      }
      follow();
      const s = smooth(lift);
      a.lerpVectors(near, liftedA, s);
      b.lerpVectors(far, liftedB, s);
      if (lift > 0) {
        // While held up the trailing end goes where the friend carries it, so letting go drops it from there.
        far.set(b.x, Math.min(b.y, groundAt(b)), b.z);
      }
      if (wasLifted > 0 && lift === 0) {
        dustRing(far.x, ground(far.x, far.z), far.z, 10, 1.8, 0.3);
        placeSound('beamDrop', far.x, far.z);
      }
      beam.position.addVectors(a, b).multiplyScalar(0.5);
      d.subVectors(b, a);
      if (d.lengthSq() > 1e-6) beam.quaternion.setFromUnitVectors(Z, d.normalize());
      // The rope sags when slack (lifted, the hip end rises toward the anchor) and runs straight when it pulls.
      const span = anchor.distanceTo(a);
      rope.set(anchor, a, Math.max(0.02, 0.35 * (1 - Math.min(1, span / 1.25))));
      this.grip.lerpVectors(a, b, 0.7);
      this.grip.y += 0.5;
      // The dragging end scuffs a little dust and scrapes now and then while it moves.
      const moved = Math.hypot(far.x - last.x, far.z - last.z);
      last.copy(far);
      if (s < 0.5 && moved > 0.002 && moved < 1) {
        scrape += moved;
        if (!reducedMotion && Math.random() < moved * 4) dustRing(far.x, ground(far.x, far.z), far.z, 2, 0.6, 0.18);
        if (scrape >= SCRAPE_EVERY) {
          scrape = 0;
          placeSound('beamScrape', far.x, far.z);
        }
      }
    },
    hide() {
      rope.visible = false;
      started = false;
      lift = 0;
    },
    dispose() {
      rope.dispose();
    },
  };
}

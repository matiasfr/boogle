// The great beam on its rope (the great beam pass, K2): the near end hangs at the carrier's hip on a short gold rope,
// the far end drags on the ground like a towed rod, and a friend's Help carry lifts it level between two shoulders.
// Local presentation derived from smoothed Owner poses: independent bounded springs, nothing is sent.
import * as THREE from 'three/webgpu';
import { reducedMotion } from '../../constants.ts';
import { dustRing } from '../../render/particle-effects.ts';
import { placeSound, type PlaceCue } from '../../render/place-sfx.ts';
import { createRope } from '../../render/gold-rope.ts';
import { bind } from '../../render/water/live.ts';
import { beamCarry, BEAM_CARRY_PARAMETERS, type BeamCarryKey } from '../../player/beam-carry-tuning.ts';
import { validValue } from '../../tunables/spec.ts';

for (const [name, spec] of Object.entries(BEAM_CARRY_PARAMETERS)) {
  const key = name as BeamCarryKey;
  bind(
    `beamCarry.${key}`,
    () => beamCarry[key],
    (value) => {
      if (validValue({ ...spec, integer: false }, value)) beamCarry[key] = value;
    },
  );
}

/** A dragged load: its length end to end and its radius (m), and the sounds its far end makes on the ground. */
export type DragShape = { length: number; radius: number; scrape: PlaceCue; drop: PlaceCue };
/** The great beam's trunk (the worn beam model's). */
export const BEAM_SHAPE: DragShape = { length: 5.4, radius: 0.24, scrape: 'beamScrape', drop: 'beamDrop' };
/** The carried trunk's length. */
export const BEAM_LENGTH = BEAM_SHAPE.length;
/** Seconds for a helper's lift (and the drop when they let go). */
const LIFT_S = 0.3;
/** Metres of drag between scrapes. */
const SCRAPE_EVERY = 1.6;
/** How fast (1/s) the trailing line settles toward the shoulder side. */
const TRAIL_PULL = 1.5;
const Z = new THREE.Vector3(0, 0, 1);
const smooth = (t: number) => t * t * (3 - 2 * t);
const a = new THREE.Vector3(),
  b = new THREE.Vector3(),
  d = new THREE.Vector3();

/**
 * Where a helper takes hold of a dragged load of length `span`, from the hauler's pose alone: the rest point of the
 * drag's own grip (the hip a short rope behind, then 0.7 of the load along the trail 35° off the `side` shoulder).
 * Help carry measures and eases to it; it never follows the helper, so lifting the load can't move it.
 */
export function restGrip(avatar: THREE.Object3D, span: number, side: number, out: THREE.Vector3) {
  const yaw = avatar.rotation.y,
    bx = Math.sin(yaw),
    bz = Math.cos(yaw),
    px = Math.cos(yaw) * side,
    pz = -Math.sin(yaw) * side,
    reach = span * 0.7;
  return out.set(
    avatar.position.x + bx * 1.05 + px * 0.4 + (bx * 0.82 + px * 0.57) * reach,
    avatar.position.y,
    avatar.position.z + bz * 1.05 + pz * 0.4 + (bz * 0.82 + pz * 0.57) * reach,
  );
}

export type BeamDrag = ReturnType<typeof createBeamDrag>;
/** One carried load's drag. `beam` is the load's model (the worn trunk mesh, or a group whose +Z is the load's long
 * axis, centred on it); it is moved into world space under `world`. `shape` is the load's size and sounds; the great
 * beam's by default. */
export function createBeamDrag(
  world: THREE.Object3D,
  beam: THREE.Object3D,
  ground: (x: number, z: number) => number,
  ropeMaterial: THREE.Material,
  shape: DragShape = BEAM_SHAPE,
) {
  const { length: span, radius } = shape;
  const rope = createRope(world, ropeMaterial, 8, 0.055);
  const far = new THREE.Vector3(),
    near = new THREE.Vector3(),
    ropeEnd = new THREE.Vector3(),
    liftedA = new THREE.Vector3(),
    liftedB = new THREE.Vector3(),
    last = new THREE.Vector3();
  const centre = new THREE.Vector3(),
    velocity = new THREE.Vector3(),
    target = new THREE.Vector3(),
    offset = new THREE.Vector3(),
    grip = new THREE.Vector3();
  let springReady = false,
    yaw = 0,
    turn = 0;
  let started = false,
    lift = 0,
    scrape = 0;
  const groundAt = (v: THREE.Vector3) => ground(v.x, v.z) + radius;
  const wrapped = (angle: number) => Math.atan2(Math.sin(angle), Math.cos(angle));
  function present(dt: number) {
    target.addVectors(a, b).multiplyScalar(0.5);
    d.subVectors(b, a);
    const heading = Math.atan2(d.x, d.z),
      flat = Math.hypot(d.x, d.z),
      dy = d.y;
    // No inherited momentum on pickup, reload or a teleport. The caller already caps frame time at 0.1 s.
    if (!springReady || reducedMotion || centre.distanceToSquared(target) > 16) {
      centre.copy(target);
      velocity.set(0, 0, 0);
      yaw = heading;
      turn = 0;
      springReady = true;
    } else {
      // Lab k=520, c=95, mass=12, expressed as acceleration. This decorates the existing rod, never a body.
      const steps = Math.max(1, Math.ceil(dt * 120)),
        h = dt / steps;
      for (let i = 0; i < steps; i++) {
        velocity.x += ((target.x - centre.x) * beamCarry.stiffness - velocity.x * beamCarry.damping) * h;
        velocity.z += ((target.z - centre.z) * beamCarry.stiffness - velocity.z * beamCarry.damping) * h;
        centre.addScaledVector(velocity, h);
        turn += (wrapped(heading - yaw) * beamCarry.stiffness - turn * beamCarry.damping) * h;
        yaw += turn * h;
        // Clamp displacement and discard only velocity pushing out of the bound; stops can still settle inward.
        offset.subVectors(centre, target).setY(0);
        if (offset.length() > beamCarry.maxLag) {
          offset.normalize();
          centre.copy(target).addScaledVector(offset, beamCarry.maxLag);
          velocity.addScaledVector(offset, -Math.max(0, velocity.dot(offset)));
        }
        const error = wrapped(yaw - heading);
        if (Math.abs(error) > beamCarry.maxAngle) {
          yaw = heading + Math.sign(error) * beamCarry.maxAngle;
          if (turn * error > 0) turn = 0;
        }
      }
    }
    // Retain the terrain/lift pitch and height. Only horizontal translation and turning have inertia.
    centre.y = target.y;
    beam.position.copy(centre);
    d.set(Math.sin(yaw) * flat, dy, Math.cos(yaw) * flat).normalize();
    if (d.lengthSq() > 1e-6) beam.quaternion.setFromUnitVectors(Z, d);
    ropeEnd.copy(centre).addScaledVector(d, -span / 2);
    grip.copy(centre).addScaledVector(d, span * 0.2);
    grip.y += 0.5;
  }
  /** Pull the far end to the load's `span` from the near end along the line it trails on, resting on the ground, eased
   * toward `trail` (off the shoulder side) so it swings wide on turns but settles out of the follow camera's way. */
  function follow(dt: number, trail: THREE.Vector3) {
    d.set(far.x - near.x, 0, far.z - near.z);
    if (d.lengthSq() < 1e-6) d.copy(trail);
    d.normalize().addScaledVector(trail, Math.min(1, dt * TRAIL_PULL));
    let length = d.length();
    if (length < 1e-3) {
      d.copy(trail);
      length = 1;
    }
    for (let k = 0; k < 2; k++) {
      const dy = near.y - groundAt(far);
      const flatLength = Math.sqrt(Math.max(0.25, span * span - dy * dy));
      far.set(near.x + (d.x / length) * flatLength, 0, near.z + (d.z / length) * flatLength);
      far.y = Math.min(near.y, groundAt(far));
    }
  }
  return {
    /** Where a friend reaches for the dragging end (the Help carry prompt). */
    grip,
    /** The far end's axis point as last drawn, on the ground unless lifted (read only). */
    tail: far as Readonly<THREE.Vector3>,
    /** Whether it has been drawn since the last hide or reset. */
    shown: () => started,
    reset() {
      started = false;
      springReady = false;
      lift = 0;
    },
    /**
     * hip: where the trunk's near end hangs; from: where the far end
     * starts on the first frame (the trunk as it lay); trail: the unit ground direction it settles toward (behind, off
     * the shoulder side); helped: the two shoulders when a friend lifts it, else null.
     */
    update(
      dt: number,
      hip: THREE.Vector3,
      from: THREE.Vector3,
      trail: THREE.Vector3,
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
        liftedA.copy(a).addScaledVector(d, -span / 2);
        liftedB.copy(a).addScaledVector(d, span / 2);
      }
      follow(dt, trail);
      const s = smooth(lift);
      a.lerpVectors(near, liftedA, s);
      b.lerpVectors(far, liftedB, s);
      if (lift > 0) {
        // While held up the trailing end goes where the friend carries it, so letting go drops it from there.
        far.set(b.x, Math.min(b.y, groundAt(b)), b.z);
      }
      if (wasLifted > 0 && lift === 0) {
        dustRing(far.x, ground(far.x, far.z), far.z, 10, 1.8, 0.3);
        placeSound(shape.drop, far.x, far.z);
      }
      present(dt);
      // The dragging end scuffs a little dust and scrapes now and then while it moves.
      const moved = Math.hypot(far.x - last.x, far.z - last.z);
      last.copy(far);
      if (s < 0.5 && moved > 0.002 && moved < 1) {
        scrape += moved;
        if (!reducedMotion && Math.random() < moved * 4) dustRing(far.x, ground(far.x, far.z), far.z, 2, 0.6, 0.18);
        if (scrape >= SCRAPE_EVERY) {
          scrape = 0;
          placeSound(shape.scrape, far.x, far.z);
        }
      }
    },
    /** Draw after Buddy's final animation/squash, so the pulling end stays in the animated mitt. */
    drawRope(hand: THREE.Vector3) {
      if (started) rope.set(hand, ropeEnd, 0.02);
    },
    /**
     * The one-comparison float (K1, `&beamcarry=float`): the trunk hovers beside the carrier at shoulder height with a
     * slow bob, along their path; helped, it floats level between the two shoulders. The caller adds the glints.
     */
    float(now: number, at: THREE.Vector3, yaw: number, side: number, helped: [THREE.Vector3, THREE.Vector3] | null) {
      if (beam.parent !== world) world.add(beam);
      beam.visible = true;
      rope.visible = false;
      started = false;
      springReady = false;
      if (helped) {
        beam.position.addVectors(helped[0], helped[1]).multiplyScalar(0.5);
        d.subVectors(helped[1], helped[0]);
        if (d.lengthSq() > 1e-6) beam.quaternion.setFromUnitVectors(Z, d.normalize());
        return;
      }
      beam.position.set(
        at.x + Math.cos(yaw) * side * 1.1,
        at.y + 0.9 + Math.sin(now / 600) * 0.08,
        at.z - Math.sin(yaw) * side * 1.1,
      );
      beam.quaternion.setFromAxisAngle(THREE.Object3D.DEFAULT_UP, yaw);
    },
    hide() {
      rope.visible = false;
      started = false;
      springReady = false;
      lift = 0;
    },
    dispose() {
      rope.dispose();
    },
  };
}

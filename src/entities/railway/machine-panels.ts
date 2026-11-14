// Local rigid transforms only. Both the live machine and asset stage use this choreography.
// Storyboard beats: return, lower, pick, lift to gauge, travel, sweep (pieces fall as it passes), seat, contact.
import * as THREE from 'three/webgpu';
import { carriedPiece, panelEase, panelGlide, panelPose, type PanelBeats } from './track-panels.ts';

export const PANEL_BEAM_Y = 4;
/** The slewing beam's reach from its pivot over the deck, as built (assets/src/track-layer.py BEAM; 5.8 m before the
 * second track, 17.5 m before rail pairs). A pair is 2.3-3.3 m and the deck rides 5.73 m behind the head; the up track's
 * pair sits 4 m to the side, so the trolley runs about 6.3 m out at its seat; the level check holds the built beam to
 * this constant and every sampled line-one trolley position, plus its 0.35 m half length, inside it. */
export const PANEL_BEAM_LENGTH = 7.0;
/** The small rail stack on the gantry's shoulders: one pair per rail pair still to lay (drawn up to 36), left rail
 * left, right rail right.
 * Each layer fills inner column to outer before the next goes on, so a few pairs lie low and wide; the gantry takes
 * the top layer's outermost pair. Rail bases, rig frame. */
export const STACK = { y: 2.86, z: 1.5, x: 0.3, dx: 0.12, dy: 0.13, layers: 6, columns: 6 } as const;
export const STACK_PAIRS = STACK.layers * STACK.columns;
/** Slot `n` from the bottom; a stack holding more pairs than it draws (line one starts with 56) picks from the top. */
export const stackSlot = (n: number, side: number, out: THREE.Vector3) => {
  const k = Math.min(n, STACK_PAIRS - 1);
  return out.set(
    side * (STACK.x + (k % STACK.columns) * STACK.dx),
    STACK.y + Math.floor(k / STACK.columns) * STACK.dy,
    STACK.z,
  );
};
/** Rail base below the jaw slide origin, and the closed jaw's rail centre. */
const GRIP_Y = 0.23,
  GRIP_X = 0.45,
  GAUGE = 0.5,
  SWEEP_Y = 1.5,
  RAIL_KIT_LENGTH = 3.05;
/** Instances ahead of the stack in the rail batch: the carried pair and the up track's pair. */
const CARRIED = 4;
/** A double-track panel's timeline. The hand's loop is stack, down seat, up seat, stack, about 14 m in one panel's time
 * (0.33 s on line 2's fast stretches, 0.6 s on line 1), and the 4 m crossing gets its share of that distance: the first
 * pair is seated by FIRST_SEATED, then the jaws cross over UP_CROSS of the panel on a trapezoid (panelGlide) and are
 * back over the stack by DOUBLE_BEATS[0] of the next. Until 14 November the first pair's cycle took 0.80 of the panel
 * and the crossing 0.09 (two or three drawn frames, read as a teleport; owner playtest). The second pair rides UP_LIFT m
 * over the first and the crossing hops UP_HOP m. */
const DOUBLE_BEATS: PanelBeats = [0.27, 0.32, 0.35, 0.38, 0.54, 0.6, 0.64];
export const FIRST_SEATED = DOUBLE_BEATS[6];
export const UP_CROSS = 0.32;
const UP_LIFT = 0.14,
  UP_HOP = 0.6;
/** The up track's carried pair: its seat (rail bases' midpoint) and heading in the rig frame. */
export type UpSeat = { seat: THREE.Vector3; yaw: number; pitch: number };
/** Kit rail batch: native 0.1 x 0.12 x 3.05 m, base origin. */
export type RailBatch = (n: number) => THREE.InstancedMesh;

/** ?layer=wing greybox (docs/brainstorms/track-layers-double.md, "Wing greybox"): the second hand's own beam length and
 * the numbers its frame is drawn from, in the flatbed's rig frame. The main hand keeps the built 7.0 m beam; with the
 * flag both hands are held to this reach, as the single beam was before the second track. */
export const WING_BEAM_LENGTH = 5.8;
export const WING = {
  postZ: 1.2,
  fold: 1.4,
  set: 1.8,
  lift: 0.9,
  armY: 3.55,
  armBase: 1.3,
  stackFolded: 1.95,
  stackOpen: 2.9,
};
const smooth = (a: number, b: number, x: number) => {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
/** The side of the machine the up track is on: +1 its left (+x), -1 its right, from the up seat's x in the rig frame. */
export const wingSide = (upSeatX: number): 1 | -1 => (upSeatX < 0 ? -1 : 1);
/** The wing's drawn state for a gap (m) between the flatbed's side and the up track at the post's s: where the post
 * stands (x, unsigned), how far the truck is lifted (0 on the rails from a gap of `set`, fully lifted at `fold`), and the
 * stack's centre x (unsigned) between the tracks when open and outboard of the flatbed when folded. */
export function wingState(gap: number) {
  const g = Math.max(0, gap);
  return {
    post: Math.max(g, WING.fold),
    lift: WING.lift * (1 - smooth(WING.fold, WING.set, g)),
    stack: WING.stackFolded + (WING.stackOpen - WING.stackFolded) * Math.min(1, g / 4),
  };
}

export function panelMechanism(parent: THREE.Object3D, railBatch: RailBatch, stackX = 0) {
  // The wing's stack stands off its post (x in this frame); the main hand's is centred on its pivot.
  let shift = stackX;
  const root = new THREE.Group();
  root.name = 'panel-mechanism';
  parent.add(root);
  const beam = new THREE.Group(),
    trolley = new THREE.Group();
  const sleeves = [new THREE.Group(), new THREE.Group(), new THREE.Group()];
  const jaws = [new THREE.Group(), new THREE.Group()];
  beam.name = 'panel-beam-pivot';
  trolley.name = 'panel-trolley-slide';
  beam.position.set(0, PANEL_BEAM_Y, 0);
  root.add(beam, trolley);
  trolley.add(sleeves[0]!);
  sleeves[0]!.add(sleeves[1]!);
  sleeves[1]!.add(sleeves[2]!);
  sleeves[2]!.add(...jaws);
  sleeves.forEach((s, i) => (s.name = `panel-hoist-${i}-slide`));
  sleeves[2]!.name = 'panel-hoist-2-slide-pitch';
  jaws.forEach((s, i) => (s.name = `panel-jaw-${i}-slide`));
  const payload = new THREE.Object3D();
  payload.name = 'panel-payload-frame';
  sleeves[2]!.add(payload);
  // One draw: instances 0-1 are the carried pair, 2-3 the up track's pair over it on a double-track panel (each
  // zero-scaled when not in the jaws), then the stack.
  const rails = railBatch(CARRIED + STACK_PAIRS * 2);
  rails.name = 'rail-stack';
  rails.count = CARRIED;
  root.add(rails);
  const ZERO = new THREE.Matrix4().makeScale(0, 0, 0);
  let carrying = false,
    carryingUp = false,
    upLift = 0,
    stackDrawn = 0;
  const batches: { mesh: THREE.InstancedMesh; pivots: THREE.Object3D[]; local: THREE.Matrix4[] }[] = [];
  const inverse = new THREE.Matrix4(),
    matrix = new THREE.Matrix4(),
    grip = new THREE.Matrix4();
  let carriedLength = 3;
  const updateBatches = () => {
    inverse.copy(root.matrixWorld).invert();
    for (const { mesh, pivots, local } of batches) {
      pivots.forEach((pivot, i) => {
        matrix.multiplyMatrices(inverse, pivot.matrixWorld).multiply(local[i]!);
        mesh.setMatrixAt(i, matrix);
      });
      mesh.instanceMatrix.needsUpdate = true;
    }
    jaws.forEach((jaw, i) => {
      grip.makeTranslation((i ? 1 : -1) * GRIP_X, -GRIP_Y, 0).scale(scale.set(1, 1, carriedLength / RAIL_KIT_LENGTH));
      matrix.multiplyMatrices(inverse, jaw.matrixWorld).multiply(grip);
      rails.setMatrixAt(i, carrying ? matrix : ZERO);
      // The second pair rides a rail's depth over the first, and settles into the jaws once the first is let go.
      grip
        .makeTranslation((i ? 1 : -1) * GRIP_X, -GRIP_Y + upLift, 0)
        .scale(scale.set(1, 1, carriedLength / RAIL_KIT_LENGTH));
      matrix.multiplyMatrices(inverse, jaw.matrixWorld).multiply(grip);
      rails.setMatrixAt(2 + i, carryingUp ? matrix : ZERO);
    });
    rails.instanceMatrix.needsUpdate = true;
  };
  const scale = new THREE.Vector3(),
    slot = new THREE.Vector3(),
    at = new THREE.Vector3(),
    from = new THREE.Vector3(),
    seatJaw = new THREE.Vector3(),
    seatUpJaw = new THREE.Vector3(),
    upAxis = new THREE.Vector3(),
    up = new THREE.Vector3(),
    q = new THREE.Quaternion(),
    e = new THREE.Euler(0, 0, 0, 'YXZ');
  const last = { at: new THREE.Vector3(shift, PANEL_BEAM_Y, STACK.z), yaw: 0, pitch: 0, slide: GAUGE - GRIP_X };
  let hasContact = false,
    stackCount = 0,
    stackLengths: number[] = [],
    selecting = 0;
  function drawStack() {
    const shown = Math.min(STACK_PAIRS, stackCount),
      n = Math.max(0, shown - selecting);
    for (let k = 0; k < n; k++) {
      // Slot k from the bottom holds the pair laid (shown - 1 - k)th from now; pairs beyond the drawn stack follow.
      const length = carriedPiece(stackLengths[shown - 1 - k] ?? 3).length;
      for (let side = 0; side < 2; side++) {
        stackSlot(k, side ? 1 : -1, slot);
        matrix.makeTranslation(slot.x + shift, slot.y, slot.z).scale(scale.set(1, 1, length / RAIL_KIT_LENGTH));
        rails.setMatrixAt(CARRIED + k * 2 + side, matrix);
      }
    }
    stackDrawn = n;
    rails.count = CARRIED + n * 2;
    rails.instanceMatrix.needsUpdate = true;
  }
  function place(x: number, y: number, z: number, yaw: number, pitch: number, slide: number) {
    trolley.position.set(x, PANEL_BEAM_Y, z);
    trolley.rotation.y = yaw;
    // Beam yaws about the header to keep the trolley on it; idle near the pivot it points straight ahead.
    if (Math.hypot(x, z) > 0.5) beam.rotation.y = Math.atan2(x, z);
    const extension = (PANEL_BEAM_Y - Math.min(PANEL_BEAM_Y, y)) / 3;
    for (const sleeve of sleeves) sleeve.position.y = -extension;
    sleeves[2]!.rotation.x = -pitch;
    jaws[0]!.position.x = -slide;
    jaws[1]!.position.x = slide;
    root.updateWorldMatrix(true, true);
    updateBatches();
  }
  return {
    root,
    beam,
    trolley,
    sleeves,
    jaws,
    payload,
    rails,
    /** For evidence: pairs drawn on the stack and whether a pair is in (or about to be in) the jaws. */
    stackPairs: () => stackDrawn,
    carrying: () => carrying,
    install(parts: Map<string, THREE.Object3D>) {
      const attach = (name: string, to: THREE.Object3D) => {
        const part = parts.get(name);
        if (part) to.add(part);
      };
      attach('lay_gantry_beam', beam);
      attach('lay_paint_trolley', trolley);
      const instance = (name: string, pivots: THREE.Object3D[], local: THREE.Matrix4[]) => {
        const source = parts.get(name);
        if (!(source instanceof THREE.Mesh)) return;
        source.updateMatrix();
        // Retain GLB decode transforms. Only the fixed section width differs between sleeves;
        // motion still comes from three independent slides, never animated scaling.
        for (const transform of local) transform.multiply(source.matrix);
        const mesh = new THREE.InstancedMesh(source.geometry, source.material, pivots.length);
        mesh.name = `${name}-instances`;
        mesh.castShadow = mesh.receiveShadow = true;
        mesh.frustumCulled = false;
        root.add(mesh);
        batches.push({ mesh, pivots, local });
      };
      instance(
        'lay_cream_upper',
        sleeves,
        [1, 0.25 / 0.32, 0.18 / 0.32].map((width) => new THREE.Matrix4().makeScale(width, 1, width)),
      );
      instance('lay_cream_jaw_left', jaws, [new THREE.Matrix4(), new THREE.Matrix4().makeRotationY(Math.PI)]);
      root.updateWorldMatrix(true, true);
      updateBatches();
    },
    /** Held pairs in use order (index 0 is laid next) and how many of the top pairs the gantry has (true: one). */
    drawStack(count: number, lengths: number[], selected: boolean | number) {
      stackCount = count;
      stackLengths = lengths;
      selecting = Math.min(count, Number(selected));
      drawStack();
    },
    /** The wing's stack follows its platform: move it (and redraw) when the stack's x in this frame changes. */
    setStackX(x: number) {
      if (Math.abs(x - shift) < 1e-4) return;
      shift = x;
      drawStack();
    },
    /** Next free slot's left rail base, where a delivered rail lands. */
    nextSlot: (out: THREE.Vector3) => stackSlot(Math.min(STACK_PAIRS - 1, stackCount), -1, out).setX(out.x + shift),
    /**
     * One panel cycle in this rig frame. `seat` is the midpoint of the carried pair's committed rail bases,
     * `yaw`/`pitch` its travel heading, `start` the rail-level point the sweep starts from and `length` the
     * carried rails' length. Returns the jaw frame: the track drops each piece as this passes its place.
     */
    pose(
      phase: number,
      n: number,
      seat: THREE.Vector3,
      yaw: number,
      pitch: number,
      start: THREE.Vector3,
      length = 3,
      second: UpSeat | null = null,
    ) {
      // A double-track panel carries both pairs in one trip: the first cycle runs to its seat by FIRST_SEATED, then the
      // jaws let go, cross to the up track and set the second pair down.
      const two = !!second && n > 1;
      const p = panelPose(phase, two ? DOUBLE_BEATS : undefined);
      carriedLength = length;
      carryingUp = two;
      upLift = UP_LIFT;
      stackSlot(Math.max(0, n - 1), 1, slot);
      const slotSlide = slot.x - GRIP_X,
        pickY = slot.y + GRIP_Y;
      up.set(0, 1, 0).applyQuaternion(q.setFromEuler(e.set(-pitch, yaw, 0, 'YXZ')));
      seatJaw.copy(seat).addScaledVector(up, GRIP_Y);
      if (!p.picked) {
        // Return from the last seat (or home) to the top pair, then reach down for it.
        const r = p.returnT;
        at.lerpVectors(last.at, slot.set(shift, 0, STACK.z), r);
        const y =
          r < 1
            ? THREE.MathUtils.lerp(last.at.y, PANEL_BEAM_Y, panelEase(r * 2))
            : THREE.MathUtils.lerp(PANEL_BEAM_Y, pickY, p.lower);
        const slide = THREE.MathUtils.lerp(last.slide, slotSlide + 0.04, r) - 0.04 * p.grip;
        carrying = n > 0;
        place(at.x, y, at.z, last.yaw * (1 - r), last.pitch * (1 - r), slide);
        // Before the pick the top pair (both top pairs on a double panel) still lies in its slot, held by nothing.
        for (let i = 0; i < 2 && n > 0; i++) {
          stackSlot(n - 1, i ? 1 : -1, slot);
          matrix.makeTranslation(slot.x + shift, slot.y, slot.z).scale(scale.set(1, 1, length / RAIL_KIT_LENGTH));
          rails.setMatrixAt(i, matrix);
          if (!two) continue;
          stackSlot(n - 2, i ? 1 : -1, slot);
          matrix.makeTranslation(slot.x + shift, slot.y, slot.z).scale(scale.set(1, 1, length / RAIL_KIT_LENGTH));
          rails.setMatrixAt(2 + i, matrix);
        }
        rails.instanceMatrix.needsUpdate = true;
        return payload.matrixWorld;
      }
      carrying = true;
      const slide = THREE.MathUtils.lerp(slotSlide, GAUGE - GRIP_X, p.gauge);
      from.set(shift, 0, STACK.z);
      let x: number, y: number, z: number, heading: number, tilt: number;
      if (p.travel < 1) {
        // Lift out of the stack, then run out along the beam to the start of the pending panel.
        x = THREE.MathUtils.lerp(from.x, start.x, p.travel);
        z = THREE.MathUtils.lerp(from.z, start.z, p.travel);
        const sweepY = start.y + GRIP_Y + SWEEP_Y;
        y =
          p.travel > 0
            ? THREE.MathUtils.lerp(PANEL_BEAM_Y, sweepY, panelEase((p.travel - 0.5) * 2))
            : THREE.MathUtils.lerp(pickY, PANEL_BEAM_Y, p.gauge);
        heading = yaw * p.travel;
        tilt = 0;
      } else if (p.seat <= 0) {
        // Sweep along the panel; the track lays each piece from under the jaws as they pass.
        x = THREE.MathUtils.lerp(start.x, seatJaw.x, p.sweep);
        z = THREE.MathUtils.lerp(start.z, seatJaw.z, p.sweep);
        y = THREE.MathUtils.lerp(start.y + GRIP_Y, seatJaw.y, p.sweep) + SWEEP_Y;
        heading = yaw;
        tilt = 0;
      } else {
        x = seatJaw.x;
        z = seatJaw.z;
        y = THREE.MathUtils.lerp(seatJaw.y + SWEEP_Y, seatJaw.y, p.seat);
        heading = yaw;
        tilt = pitch * p.seat;
      }
      if (two && second && phase >= FIRST_SEATED) {
        // Let go of the first pair (the track shows it seated), lift a little, cross to the up seat and lower.
        carrying = false;
        const k = panelGlide((phase - FIRST_SEATED) / UP_CROSS),
          lower = panelEase((phase - FIRST_SEATED) / (0.97 - FIRST_SEATED));
        upAxis.set(0, 1, 0).applyQuaternion(q.setFromEuler(e.set(-second.pitch, second.yaw, 0, 'YXZ')));
        seatUpJaw.copy(second.seat).addScaledVector(upAxis, GRIP_Y);
        x = THREE.MathUtils.lerp(seatJaw.x, seatUpJaw.x, k);
        z = THREE.MathUtils.lerp(seatJaw.z, seatUpJaw.z, k);
        y = THREE.MathUtils.lerp(seatJaw.y, seatUpJaw.y, k) + UP_HOP * Math.sin(Math.PI * k);
        heading = THREE.MathUtils.lerp(yaw, second.yaw, k);
        tilt = THREE.MathUtils.lerp(pitch, second.pitch, k);
        upLift = UP_LIFT * (1 - lower);
      }
      place(x, y, z, heading, tilt, slide);
      if (phase >= 0.98) {
        last.at.set(x, y, z);
        last.yaw = heading;
        last.pitch = tilt;
        last.slide = slide;
        hasContact = true;
      }
      return payload.matrixWorld;
    },
    /** Not laying: go home over the stack on local time and wait there, jaws open over the next pair. */
    home(t: number, n: number) {
      const r = panelEase(t);
      carryingUp = false;
      stackSlot(Math.max(0, n - 1), 1, slot);
      const slotSlide = slot.x - GRIP_X;
      at.lerpVectors(last.at, slot.set(shift, 0, STACK.z), r);
      const y = THREE.MathUtils.lerp(last.at.y, PANEL_BEAM_Y, panelEase(r * 2));
      carrying = false;
      place(at.x, y, at.z, last.yaw * (1 - r), last.pitch * (1 - r), THREE.MathUtils.lerp(last.slide, slotSlide, r));
      if (!hasContact) beam.rotation.y = 0;
      if (t >= 1) {
        last.at.set(shift, PANEL_BEAM_Y, STACK.z);
        last.yaw = last.pitch = 0;
        last.slide = slotSlide;
      }
    },
  };
}

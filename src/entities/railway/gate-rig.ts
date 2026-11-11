// A line-two gate's frame and hoist, drawn over its slab's drawn height: two stone jambs and a headstock of two beams across
// them, a sheave over each end of the slab, and a chain from each end of the slab's top, up between the beams, over its
// sheave and on to where it winds: the lever's winch (the quarry gate) or a drum on the headstock (the sea gate).
// The chain is measured from the slab, so its links ride down with it and pay out over the sheaves; the sheaves and the
// winding drum turn by the same length. Local presentation only: nothing here reads or changes shared state.
import * as THREE from 'three/webgpu';
import type { OwnedView } from '../../render/owned-view.ts';
import type { Part } from '../../render/cosmetic-parts.ts';

type Deps = {
  land: typeof import('../../place/land.ts');
  shapes: typeof import('../../render/part-geometry.ts');
  flat: (typeof import('../../render/flat.ts'))['flat'];
  partMat: THREE.Material;
};
export type GateSlab = { w: number; h: number; d: number; pillar: number };
type Spec = {
  /** The gate's base (the slab's foot when closed) and its yaw; the slab spans local x, the track runs along local z. */
  x: number;
  y: number;
  z: number;
  yaw: number;
  slab: GateSlab;
  /** The winch drum the chain winds onto, its axle along world x. Without one, the chain winds on the headstock. */
  winch?: { x: number; y: number; z: number; r: number };
};

const STONE = '#917b5e',
  IRON = '#4e4c46',
  BRASS = '#c79a3e',
  LINK = '#3a3530';
/** Sheave radius; the chain rides CHAIN_R from its axle. */
const R = 0.35,
  CHAIN_R = R + 0.04,
  /** Link spacing along the chain. */
  STEP = 0.2,
  /** The headstock's beams: 0.7 m tall, 0.3 m deep, centred 0.4 m either side of the slab's plane (a 0.5 m slot). */
  BEAM_H = 0.7,
  BEAM_D = 0.3,
  BEAM_Z = 0.4,
  /** The sea gate's winding drum, sitting on two bearing blocks over the middle of the headstock. */
  DRUM_R = 0.3;
const UP = THREE.Object3D.DEFAULT_UP,
  FORWARD = new THREE.Vector3(0, 0, 1),
  AXLE = new THREE.Vector3(0, 0, 1);

/** Across the slab from its middle to each chain's eye (local x). */
export const gateEyeAt = (slab: GateSlab) => slab.w / 2 - 0.3;
/** The two eyes on the slab's top that the chains hang it by, for the slab's merged geometry (its centre is the origin). */
export function gateEyes(slab: GateSlab): Part[] {
  return [-1, 1].map((side) => ['b', side * gateEyeAt(slab), slab.h / 2 + 0.06, 0, 0.18, 0.12, 0.3, LINK] as Part);
}

export function createGateRig(owner: OwnedView, deps: Deps, spec: Spec) {
  const { land, shapes, flat, partMat } = deps;
  const { w, h, pillar } = spec.slab;
  const JAMB = h + 0.8,
    // The sheaves' axles sit just over the beams in pillow blocks, so the wheels stand clear and read from the ground.
    SHEAVE_Y = JAMB + BEAM_H + 0.12,
    RUN_Y = SHEAVE_Y + CHAIN_R,
    EYE = gateEyeAt(spec.slab),
    OUT = w / 2 + pillar;
  const q = new THREE.Quaternion().setFromAxisAngle(UP, spec.yaw);
  const frameMatrix = new THREE.Matrix4().compose(
    new THREE.Vector3(spec.x, spec.y, spec.z),
    q,
    new THREE.Vector3(1, 1, 1),
  );
  const toLocal = frameMatrix.clone().invert();
  const world = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z).applyMatrix4(frameMatrix);
  const sources: THREE.BufferGeometry[] = [];
  const inFrame = <T extends THREE.Object3D>(o: T) => {
    o.position.set(spec.x, spec.y, spec.z);
    o.quaternion.copy(q);
    o.castShadow = true;
    o.receiveShadow = true;
    owner.add(o);
    return o;
  };

  // `near` is the side the chain leaves for (the winch's); without a winch both chains run in to the drum at the middle.
  const winchLocal = spec.winch
    ? new THREE.Vector3(spec.winch.x, spec.winch.y, spec.winch.z).applyMatrix4(toLocal)
    : null;
  const near = winchLocal && winchLocal.x > 0 ? 1 : -1;
  // The winch side's sheave stands outside its chain (which leaves outward); the others inside theirs (they lead in).
  const nearSheave = near * (EYE + R);
  const sheaves = winchLocal ? [nearSheave, -near * (EYE - R)] : [-(EYE - R), EYE - R];

  // ---------------------------------------------------------------- the stone frame: jambs, beams and bearing blocks
  const blockW = OUT - (EYE + 2 * R) - 0.05;
  const parts: Part[] = [];
  for (const c of sheaves)
    for (const side of [-1, 1]) parts.push(['b', c, JAMB + BEAM_H + 0.1, side * BEAM_Z, 0.26, 0.2, BEAM_D, STONE]);
  for (const side of [-1, 1]) {
    parts.push(['b', (side * (w + pillar)) / 2, JAMB / 2, 0, pillar, JAMB, pillar, STONE]);
    parts.push(['b', 0, JAMB + BEAM_H / 2, side * BEAM_Z, 2 * OUT, BEAM_H, BEAM_D, STONE]);
    // Over each jamb, outside its sheave, a block closes the slot between the beams.
    parts.push(['b', side * (OUT - blockW / 2), JAMB + BEAM_H / 2, 0, blockW, BEAM_H, pillar, STONE]);
    if (!spec.winch) {
      // The drum's bearing blocks, up to its axle over the chains' run.
      const axle = SHEAVE_Y + CHAIN_R + DRUM_R + 0.1 - (JAMB + BEAM_H);
      parts.push(['b', 0, JAMB + BEAM_H + axle / 2, side * BEAM_Z, 0.3, axle, BEAM_D, STONE]);
    }
  }
  const frameGeometry = shapes.merged(parts);
  sources.push(frameGeometry);
  inFrame(new THREE.Mesh(frameGeometry, flat(STONE, 0.9)));
  for (const side of [-1, 1])
    land.addStatic(
      { kind: 'box', hx: pillar / 2, hy: JAMB / 2, hz: pillar / 2 },
      world((side * (w + pillar)) / 2, JAMB / 2, 0),
      q,
      undefined,
      owner,
    );
  land.addStatic(
    { kind: 'box', hx: OUT, hy: BEAM_H / 2, hz: BEAM_Z + BEAM_D / 2 },
    world(0, JAMB + BEAM_H / 2, 0),
    q,
    undefined,
    owner,
  );

  // ---------------------------------------------------------------- the chains' paths, in the gate's frame
  const winchTop = winchLocal ? winchLocal.clone().add(new THREE.Vector3(0, spec.winch!.r, 0)) : null;
  /** Points over a sheave at `c` (local x) from angle a0 to a1 (0 is the sheave's side at +x, PI/2 its top). */
  const arc = (out: THREE.Vector3[], c: number, z: number, a0: number, a1: number) => {
    const n = 5;
    for (let k = 1; k <= n; k++) {
      const a = a0 + ((a1 - a0) * k) / n;
      out.push(new THREE.Vector3(c + CHAIN_R * Math.cos(a), SHEAVE_Y + CHAIN_R * Math.sin(a), z));
    }
  };
  // Where the winch run leaves the near sheave: the angle it falls at from the sheave's top towards the drum.
  const fall = winchTop ? Math.atan2(SHEAVE_Y - winchTop.y, Math.hypot(winchTop.x - nearSheave, winchTop.z)) : 0;
  type Chain = { from: number; z: number };
  // Quarry: one chain from each end, both to the winch over the near sheave. Sea: each end's chain to the middle drum.
  const chains: Chain[] = winchTop
    ? [
        { from: near, z: -0.06 },
        { from: -near, z: 0.06 },
      ]
    : [
        { from: -1, z: -0.07 },
        { from: 1, z: 0.07 },
      ];
  /** A chain's polyline from its eye at slab-top height `top` (local y) to where it winds on. */
  function chainPath(c: Chain, top: number) {
    const eye = c.from * EYE;
    const pts = [new THREE.Vector3(eye, top + 0.1, c.z), new THREE.Vector3(eye, SHEAVE_Y, c.z)];
    // Up the inner side of the near sheave (it leaves outward), or the outer side of the others (they lead inward).
    const toward = winchTop ? near : -c.from;
    const centre = eye + toward * R;
    // Angles are measured on the mirrored sheave so the same sweep serves both sides: 0 at the chain's side, PI/2 on top.
    const side = (a: number) => (toward < 0 ? a : Math.PI - a);
    arc(pts, centre, c.z, side(0), side(Math.PI / 2));
    if (!winchTop) {
      pts.push(new THREE.Vector3(0, RUN_Y, c.z));
      return pts;
    }
    if (c.from !== near) pts.push(new THREE.Vector3(nearSheave, RUN_Y, c.z));
    arc(pts, nearSheave, c.z, side(Math.PI / 2), side(Math.PI / 2 + fall));
    const from = pts[pts.length - 1]!.clone();
    const to = winchTop.clone().setZ(winchTop.z + c.z);
    for (let k = 1; k <= 12; k++) {
      const u = k / 12;
      const p = from.clone().lerp(to, u);
      p.y -= 4 * u * (1 - u) * 0.3;
      pts.push(p);
    }
    return pts;
  }
  const pathLength = (pts: THREE.Vector3[]) => pts.reduce((sum, p, k) => (k ? sum + p.distanceTo(pts[k - 1]!) : 0), 0);
  const closedTop = h,
    lowest = -0.6; // the open slab's top, local: both views drop it h + 0.6
  const capacity = chains.reduce((n, c) => n + Math.ceil(pathLength(chainPath(c, lowest)) / STEP) + 1, 0);
  const link = new THREE.TorusGeometry(0.1, 0.028, 5, 8).rotateY(Math.PI / 2).scale(1, 1, 1.35);
  sources.push(link);
  const links = inFrame(new THREE.InstancedMesh(link, flat(LINK, 0.8), capacity));
  links.receiveShadow = false;

  // ---------------------------------------------------------------- the sheaves and the drum: one instanced wheel
  const wheelGeometry = shapes.merged([
    ['c', 0, 0, 0, R, 0.16, R, IRON, Math.PI / 2],
    ['b', 0, 0, 0.085, 0.1, R * 1.8, 0.03, BRASS],
    ['b', 0, 0, -0.085, 0.1, R * 1.8, 0.03, BRASS],
    ['b', 0, 0, 0.085, R * 1.8, 0.1, 0.03, BRASS],
    ['b', 0, 0, -0.085, R * 1.8, 0.1, 0.03, BRASS],
    ['c', 0, 0, 0, 0.07, 0.9, 0.07, LINK, Math.PI / 2],
  ]);
  sources.push(wheelGeometry);
  type Wheel = { at: THREE.Vector3; base: THREE.Quaternion; scale: THREE.Vector3; turn: number };
  const ONE = new THREE.Vector3(1, 1, 1);
  const wheels: Wheel[] = [];
  // Each wheel turns `turn` radians per metre of chain paid out, its sign set by which way the chain runs over it.
  if (winchTop) {
    for (const c of [nearSheave, -near * (EYE - R)])
      wheels.push({
        at: new THREE.Vector3(c, SHEAVE_Y, 0),
        base: new THREE.Quaternion(),
        scale: ONE,
        turn: near / CHAIN_R,
      });
    // The winch's crank wheel, outside its frame on the drum's axle (world x): its top turns towards the gate.
    const w0 = spec.winch!;
    const crank = new THREE.Vector3(w0.x + 0.72, w0.y, w0.z).applyMatrix4(toLocal);
    const axle = new THREE.Quaternion().setFromAxisAngle(UP, Math.PI / 2);
    const base = q.clone().invert().multiply(axle);
    const gateward = Math.sign(spec.z - w0.z) || 1;
    wheels.push({ at: crank, base, scale: new THREE.Vector3(0.85, 0.85, 0.3), turn: gateward / w0.r });
  } else {
    for (const c of chains) {
      wheels.push({
        at: new THREE.Vector3(c.from * (EYE - R), SHEAVE_Y, 0),
        base: new THREE.Quaternion(),
        scale: ONE,
        turn: -c.from / CHAIN_R,
      });
      // Each end winds on its own half of the drum, the halves turning opposite ways.
      wheels.push({
        at: new THREE.Vector3(0, RUN_Y + DRUM_R, c.z),
        base: new THREE.Quaternion(),
        scale: new THREE.Vector3(DRUM_R / R, DRUM_R / R, 0.8),
        turn: c.from / DRUM_R,
      });
    }
  }
  const wheelMesh = inFrame(new THREE.InstancedMesh(wheelGeometry, partMat, wheels.length));
  owner.cleanup(() => {
    for (const g of sources) g.dispose();
  });

  // ---------------------------------------------------------------- posing over the slab's drawn height
  const o = new THREE.Object3D(),
    spin = new THREE.Quaternion(),
    m = new THREE.Matrix4(),
    ahead = new THREE.Vector3();
  let shown = Number.NaN;
  function pose(slabY: number) {
    const top = slabY - spec.y + h / 2;
    if (top === shown) return;
    shown = top;
    const paid = closedTop - top;
    let n = 0;
    for (const c of chains) {
      const pts = chainPath(c, top);
      // Links stay put along the chain from the slab's eye; any past the path's end are wound on.
      let seg = 1,
        i = 0,
        segStart = 0,
        segLen = pts[1]!.distanceTo(pts[0]!);
      for (let s = 0; n < capacity; s += STEP) {
        while (s > segStart + segLen && seg < pts.length - 1) {
          segStart += segLen;
          seg++;
          segLen = pts[seg]!.distanceTo(pts[seg - 1]!);
        }
        if (s > segStart + segLen) break;
        const a = pts[seg - 1]!,
          b = pts[seg]!;
        o.position.lerpVectors(a, b, segLen > 0 ? (s - segStart) / segLen : 0);
        // Along the chain (lookAt would fold on the vertical drops), every other link turned a quarter about it.
        o.quaternion.setFromUnitVectors(FORWARD, ahead.subVectors(b, a).normalize());
        if (i++ % 2) o.rotateZ(Math.PI / 2);
        o.updateMatrix();
        links.setMatrixAt(n++, o.matrix);
      }
    }
    links.count = n;
    links.instanceMatrix.needsUpdate = true;
    links.computeBoundingSphere();
    wheels.forEach((wheel, k) => {
      spin.setFromAxisAngle(AXLE, wheel.turn * paid).premultiply(wheel.base);
      m.compose(wheel.at, spin, wheel.scale);
      wheelMesh.setMatrixAt(k, m);
    });
    wheelMesh.instanceMatrix.needsUpdate = true;
    wheelMesh.computeBoundingSphere();
  }
  return {
    /** Pose the chain and wheels for the slab at this drawn centre height (world y); cheap when it hasn't moved. */
    pose,
    inspect: () => ({ links: links.count, top: shown, headstockUnderside: spec.y + JAMB }),
  };
}

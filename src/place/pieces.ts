// How things move in ?proto=place: nothing scales and nothing vanishes. A piece that joins a build falls into place and
// lands with a thud (`dropSet`, for the track and the forge), and a piece on its way somewhere is a real piece in the air
// (`send`, for logs and rails between trees, backs, frames, machine and rack). docs/decisions.md, "construction
// is physical". Local and cosmetic.
import * as THREE from 'three/webgpu';
import { material } from '../render/materials.ts';
export { chips, dustRing } from '../render/particle-effects.ts';
import { scene } from '../render/scene.ts';
import { PIECE, pieceColor, pieceMesh, commitPieces } from '../render/haul-pieces.ts';
import { makeSet, type Box, type BoxSet } from '../render/boxes.ts';
import { LOOK, STEEL, lookBackLogs } from './look.ts';
import { kitBatch, kitLogs } from './look-kit.ts';
import { RAIL_SIZE } from '../render/carry-models.ts';
import type { OwnedView } from '../render/owned-view.ts';
export { RAIL_SIZE };

// ---------------------------------------------------------------- falling into place
const GRAVITY = 24; // m/s²
const pos = new THREE.Matrix4(),
  tilt = new THREE.Matrix4(),
  e = new THREE.Euler();
const ZERO = new THREE.Matrix4().makeScale(0, 0, 0);
export type DropSet = BoxSet & {
  /** Piece k starts falling from `h` metres above its place, after `delay` s. */
  drop: (k: number, h: number, delay?: number) => void;
  /** Piece k is there, or not, with no show. */
  snap: (k: number, on: boolean) => void;
  /** Piece k, `y` metres above or below its place. */
  lift: (k: number, y: number) => void;
  update: (dt: number) => void;
  busy: () => boolean;
  /** Whatever's in the air stops where it is: start over. */
  clear: () => void;
};
export function dropSet(boxes: Box[], onLand: (k: number) => void, owner?: OwnedView): DropSet {
  const set = makeSet(boxes);
  if (owner) owner.add(set.mesh);
  else scene.add(set.mesh);
  const air: { k: number; t: number; fall: number; h: number; landed: boolean }[] = [];
  const write = (k: number, y: number, a: number) => {
    const b = boxes[k]!;
    pos.makeTranslation(b.x, b.y + y, b.z);
    if (a) pos.multiply(tilt.makeRotationFromEuler(e.set(a, 0, a * 0.5)));
    set.mesh.setMatrixAt(k, pos.multiply(b.local));
  };
  return {
    ...set,
    drop(k, h, delay = 0) {
      air.push({ k, t: -delay, fall: Math.sqrt((2 * h) / GRAVITY), h, landed: false });
      set.mesh.visible = true;
    },
    snap(k, on) {
      if (on) write(k, 0, 0);
      else set.mesh.setMatrixAt(k, ZERO);
      if (on) set.mesh.visible = true;
      set.mesh.instanceMatrix.needsUpdate = true;
    },
    update(dt) {
      for (let n = air.length - 1; n >= 0; n--) {
        const a = air[n]!;
        a.t += dt;
        if (a.t < 0) continue;
        if (a.t < a.fall) {
          const left = a.fall - a.t;
          write(a.k, 0.5 * GRAVITY * left * left, (left / a.fall) * 0.22);
        } else {
          if (!a.landed) {
            a.landed = true;
            onLand(a.k);
          }
          const u = (a.t - a.fall) / 0.14;
          if (u >= 1) {
            write(a.k, 0, 0);
            air.splice(n, 1);
          } else write(a.k, Math.sin(u * Math.PI) * 0.05, 0);
        }
        set.mesh.instanceMatrix.needsUpdate = true;
      }
    },
    lift(k, y) {
      write(k, y, 0);
      set.mesh.instanceMatrix.needsUpdate = true;
    },
    busy: () => air.length > 0,
    clear: () => void (air.length = 0),
  };
}

// ---------------------------------------------------------------- pieces in the air
export type PieceKind = 'log' | 'rail' | 'stone';
function createPieceFlights(owner?: OwnedView) {
  const railGeo = new THREE.BoxGeometry(1, 1, 1);
  const railMat = new THREE.MeshStandardNodeMaterial({ color: '#4c5058', roughness: 0.45, metalness: 0.6 });
  const MAX = 96;
  const logs = LOOK.kit ? kitLogs(MAX, owner) : pieceMesh(MAX);
  const rails = LOOK.kit ? kitBatch('rail', STEEL, MAX, owner) : new THREE.InstancedMesh(railGeo, railMat, MAX);
  const RAIL_DRAW = LOOK.kit ? new THREE.Vector3(1, 1, 1) : RAIL_SIZE; // the kit's rail comes at its own size
  lookBackLogs(pieceMesh(1).material as THREE.Material, pieceColor(0));
  rails.count = 0;
  rails.frustumCulled = false;
  rails.castShadow = true;
  if (owner) owner.add(logs, rails);
  else scene.add(logs, rails);
  // A lump of stone: one shape, tumbling.
  const stones = new THREE.InstancedMesh(new THREE.DodecahedronGeometry(0.2, 0), material('stone'), 32);
  stones.count = 0;
  stones.frustumCulled = false;
  stones.castShadow = true;
  if (owner) owner.add(stones);
  else scene.add(stones);

  type Trip = {
    kind: PieceKind;
    t: number;
    dur: number;
    from: THREE.Vector3;
    to: THREE.Vector3;
    aim?: (out: THREE.Vector3) => void; // moves `to` each frame (your back, a moving machine)
    apex: number;
    size0: number;
    size1: number;
    land: () => void;
  };
  const trips: Trip[] = [];
  /** A piece travels from a world point to another on an arc, full size all the way (`size`: a log's length factor). */
  function send(
    kind: PieceKind,
    from: THREE.Vector3,
    to: THREE.Vector3,
    o: {
      dur: number;
      delay?: number;
      apex?: number;
      size?: [number, number];
      aim?: Trip['aim'];
      land?: () => void;
    },
  ) {
    const trip: Trip = {
      kind,
      t: -(o.delay ?? 0),
      dur: o.dur,
      from: from.clone(),
      to: to.clone(),
      aim: o.aim,
      apex: o.apex ?? 1,
      size0: o.size?.[0] ?? 1,
      size1: o.size?.[1] ?? 1,
      land: o.land ?? (() => {}),
    };
    trips.push(trip);
    // Local presentation can follow this flight, including cancellation by clearTrips.
    return () => trips.includes(trip);
  }
  const sending = () => trips.length;
  function clearTrips() {
    trips.length = 0;
  }
  const m = new THREE.Matrix4(),
    q = new THREE.Quaternion(),
    v = new THREE.Vector3(),
    sc = new THREE.Vector3();
  const color = LOOK.kit ? new THREE.Color(1, 1, 1) : pieceColor(0);
  function updatePieces(dt: number) {
    let nl = 0,
      nr = 0,
      ns = 0;
    for (let k = trips.length - 1; k >= 0; k--) {
      const t = trips[k]!;
      t.t += dt;
      if (t.t < 0) continue;
      t.aim?.(t.to);
      const u = Math.min(1, t.t / t.dur);
      v.lerpVectors(t.from, t.to, u);
      v.y += Math.sin(u * Math.PI) * t.apex;
      q.setFromEuler(e.set(u * 2.6, u * 1.4 + k, 0));
      if (t.kind === 'log' && nl < MAX) {
        const s = t.size0 + (t.size1 - t.size0) * u;
        logs.setMatrixAt(nl, m.compose(v, q, sc.set(s, 1 + (s - 1) * 0.4, 1 + (s - 1) * 0.4)));
        logs.setColorAt(nl++, color);
      } else if (t.kind === 'rail' && nr < MAX) {
        rails.setMatrixAt(nr++, m.compose(v, q.setFromEuler(e.set(0, u * 0.8, 0)), RAIL_DRAW));
      } else if (t.kind === 'stone' && ns < 32) {
        stones.setMatrixAt(ns++, m.compose(v, q, sc.setScalar(t.size0 + (t.size1 - t.size0) * u)));
      }
      if (u >= 1) {
        trips.splice(k, 1);
        t.land();
      }
    }
    if (nl || logs.count) commitPieces(logs, nl);
    if (nr || rails.count) {
      rails.count = nr;
      rails.instanceMatrix.needsUpdate = true;
    }
    if (ns || stones.count) {
      stones.count = ns;
      stones.instanceMatrix.needsUpdate = true;
    }
  }
  owner?.cleanup(clearTrips);
  owner?.cleanup(() => railMat.dispose());
  return { send, sending, clearTrips, updatePieces };
}

let legacyFlights: ReturnType<typeof createPieceFlights> | undefined;
const ownedFlights = new WeakMap<OwnedView, ReturnType<typeof createPieceFlights>>();
function flights(owner?: OwnedView) {
  if (!owner) return (legacyFlights ??= createPieceFlights());
  let view = ownedFlights.get(owner);
  if (!view) {
    view = createPieceFlights(owner);
    ownedFlights.set(owner, view);
    owner.cleanup(() => ownedFlights.delete(owner));
  }
  return view;
}
export const send = (
  kind: PieceKind,
  from: THREE.Vector3,
  to: THREE.Vector3,
  options: Parameters<ReturnType<typeof createPieceFlights>['send']>[3],
  owner?: OwnedView,
) => flights(owner).send(kind, from, to, options);
export const sending = (owner?: OwnedView) => flights(owner).sending();
export const clearTrips = (owner?: OwnedView) => flights(owner).clearTrips();
export const updatePieces = (dt: number, owner?: OwnedView) => flights(owner).updatePieces(dt);

// ---------------------------------------------------------------- stacks of real pieces standing somewhere
/** A log as it lies in a frame or on the machine: the same log, cut to a length that reads at this distance. */
export const STACK_LOG = { size: 2.2, thick: 1.5 };
export const logStackMesh = (max: number, owner?: OwnedView) => {
  const g = LOOK.kit ? kitLogs(max, owner) : pieceMesh(max);
  if (owner) owner.add(g);
  else scene.add(g);
  return g;
};
const stackM = new THREE.Matrix4(),
  stackQ = new THREE.Quaternion(),
  stackP = new THREE.Vector3(),
  stackS = new THREE.Vector3(STACK_LOG.size, STACK_LOG.thick, STACK_LOG.thick);
const logH = PIECE.r * STACK_LOG.thick * 2;
const color = LOOK.kit ? new THREE.Color(1, 1, 1) : pieceColor(0);
/** Log `n` of a stack `perRow` wide: at the frame's `at`, turned to `yaw`, its layers off-set like a real pile. */
export function stackSlot(n: number, perRow: number, at: THREE.Vector3, yaw: number, out: THREE.Vector3) {
  const row = Math.floor(n / perRow),
    c = n % perRow;
  const across = (c - (perRow - 1) / 2 + (row % 2) * 0.25) * logH * 1.04;
  return out.set(at.x + Math.sin(yaw) * across, at.y + logH * 0.5 + row * logH * 0.92, at.z + Math.cos(yaw) * across);
}
export function setStackLog(mesh: THREE.InstancedMesh, k: number, at: THREE.Vector3, yaw: number) {
  stackQ.setFromAxisAngle(THREE.Object3D.DEFAULT_UP, yaw);
  mesh.setMatrixAt(k, stackM.compose(stackP.copy(at), stackQ, stackS));
  mesh.setColorAt(k, color);
}

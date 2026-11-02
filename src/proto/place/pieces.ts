// How things move in ?proto=place: nothing scales and nothing vanishes. A piece that joins a build falls into place and
// lands with a thud (`dropSet`, for the track and the forge), and a piece on its way somewhere is a real piece in the air
// (`send`, for logs and rails between trees, backs, frames, machine and rack). docs/proposals/boogle-2.md, "construction
// is physical". Local and cosmetic.
import * as THREE from 'three/webgpu';
import { emit } from '../../render/particles.ts';
import { scene } from '../../render/scene.ts';
import { PIECE, pieceColor, pieceMesh, commitPieces } from '../../render/haul-pieces.ts';
import { makeSet, type Box, type BoxSet } from '../net/boxes.ts';
import { LOOK } from './look.ts';
import { kitLogs } from './look-kit.ts';

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
  update: (dt: number) => void;
  busy: () => boolean;
};
export function dropSet(boxes: Box[], onLand: (k: number) => void): DropSet {
  const set = makeSet(boxes);
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
    busy: () => air.length > 0,
  };
}

// ---------------------------------------------------------------- pieces in the air
export type PieceKind = 'log' | 'rail';
/** Where the machine and the racks draw a rail: one length of steel. */
export const RAIL_SIZE = new THREE.Vector3(0.14, 0.16, 2.6);
const railGeo = new THREE.BoxGeometry(1, 1, 1);
const railMat = new THREE.MeshStandardNodeMaterial({ color: '#4c5058', roughness: 0.45, metalness: 0.6 });
const MAX = 96;
const logs = LOOK.kit ? kitLogs(MAX) : pieceMesh(MAX);
const rails = new THREE.InstancedMesh(railGeo, railMat, MAX);
rails.count = 0;
rails.frustumCulled = false;
rails.castShadow = true;
scene.add(logs, rails);

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
export function send(
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
  trips.push({
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
  });
}
export const sending = () => trips.length;
export function clearTrips() {
  trips.length = 0;
}
const m = new THREE.Matrix4(),
  q = new THREE.Quaternion(),
  v = new THREE.Vector3(),
  sc = new THREE.Vector3();
const color = LOOK.kit ? new THREE.Color(1, 1, 1) : pieceColor(0);
export function updatePieces(dt: number) {
  let nl = 0,
    nr = 0;
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
      rails.setMatrixAt(nr++, m.compose(v, q.setFromEuler(e.set(0, u * 0.8, 0)), RAIL_SIZE));
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
}

// ---------------------------------------------------------------- stacks of real pieces standing somewhere
/** A log as it lies in a frame or on the machine: the same log, cut to a length that reads at this distance. */
export const STACK_LOG = { size: 2.2, thick: 1.5 };
export const logStackMesh = (max: number) => {
  const g = LOOK.kit ? kitLogs(max) : pieceMesh(max);
  scene.add(g);
  return g;
};
const stackM = new THREE.Matrix4(),
  stackQ = new THREE.Quaternion(),
  stackP = new THREE.Vector3(),
  stackS = new THREE.Vector3(STACK_LOG.size, STACK_LOG.thick, STACK_LOG.thick);
const logH = PIECE.r * STACK_LOG.thick * 2;
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

// ---------------------------------------------------------------- a thud's dust and a saw's chips
const dust = new THREE.Color('#cdb48c'),
  chip = new THREE.Color('#d9b07a');
export function dustRing(x: number, y: number, z: number, n = 10, speed = 2.2, size = 0.3) {
  for (let k = 0; k < n; k++) {
    const a = (k / n) * Math.PI * 2 + Math.random() * 0.3,
      sp = speed * (0.6 + Math.random() * 0.6);
    emit({
      x: x + Math.cos(a) * 0.3,
      y: y + 0.1,
      z: z + Math.sin(a) * 0.3,
      vx: Math.cos(a) * sp,
      vy: 0.5 + Math.random() * 0.8,
      vz: Math.sin(a) * sp,
      life: 0.6 + Math.random() * 0.4,
      size,
      color: dust,
      alpha: 0.85,
      gravity: 1,
      drag: 3,
      grow: [0.8, 2.4],
      fade: 0.6,
    });
  }
}
export function chips(x: number, y: number, z: number, n = 10) {
  for (let k = 0; k < n; k++) {
    const a = Math.random() * Math.PI * 2,
      sp = 2 + Math.random() * 3;
    emit({
      x,
      y,
      z,
      vx: Math.cos(a) * sp,
      vy: 2 + Math.random() * 3,
      vz: Math.sin(a) * sp,
      life: 0.45 + Math.random() * 0.25,
      size: 0.07 + Math.random() * 0.05,
      color: chip,
      gravity: 12,
      shrink: 0.4,
    });
  }
}

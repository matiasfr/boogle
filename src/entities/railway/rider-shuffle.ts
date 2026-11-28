import { Vector3, type Object3D } from 'three/webgpu';
import type { CoachSeat } from './coach-kit.ts';

export type RiderWalk = {
  points: Vector3[];
  lengths: number[];
  length: number;
  elapsed: number;
  boards: boolean;
};

/** Capture the stopped coach's landmarks once. The queue and deck are in world space. */
export function riderWalk(
  coach: Object3D,
  seat: CoachSeat,
  steps: readonly Object3D[],
  side: number,
  queue: Vector3,
  boards: boolean,
  delay: number,
): RiderWalk | null {
  const hinge = steps
    .filter((step) => step.userData.side === side)
    .sort((a, b) => Math.abs(a.position.z - seat.position[2]) - Math.abs(b.position.z - seat.position[2]))[0];
  if (!hinge) return null;
  const world = (x: number, y: number, z: number) => coach.localToWorld(new Vector3(x, y, z));
  const { x, y, z } = hinge.position;
  const landing = world(x + side * 0.68, y, z);
  landing.y = queue.y;
  const points = [
    world(...seat.position),
    world(0, 0.7, seat.position[2]),
    world(0, 0.7, z),
    world(x, 0.7, z),
    world(x + side * 0.14, y, z),
    landing,
    queue,
  ];
  if (boards) points.reverse();
  const lengths = points.slice(1).map((p, i) => p.distanceTo(points[i]!));
  return { points, lengths, length: lengths.reduce((a, b) => a + b, 0), elapsed: -delay, boards };
}

/** Walk at a steady ground speed, including across the platform and down the tread. */
export function poseRiderWalk(walk: RiderWalk, dt: number, out: Vector3) {
  walk.elapsed += dt;
  const duration = 3;
  let distance = Math.max(0, walk.elapsed / duration) * walk.length;
  for (const [i, length] of walk.lengths.entries()) {
    const a = walk.points[i]!,
      b = walk.points[i + 1]!;
    if (distance <= length || i === walk.lengths.length - 1) {
      out.lerpVectors(a, b, Math.min(1, distance / Math.max(length, 0.0001)));
      return { yaw: Math.atan2(b.x - a.x, b.z - a.z), done: walk.elapsed >= duration };
    }
    distance -= length;
  }
  throw new Error('Empty rider path');
}

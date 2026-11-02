// What the wagon's riding variants (./show.ts, ./bench.ts, ./snatch.ts; docs/research/train-riding.md, recs 1-3) read
// from the wagon (./index.ts): its cars and where the timetable has it now, and the line as a polyline. Local: all of
// it follows from the shared tick, so every tab sees the same train in the same place.
import type * as THREE from 'three/webgpu';
import type { Body } from '../../physics/engine.ts';
import type { Platform } from '../../physics/platforms.ts';
import type { WagonState } from '../../sim/wagon.ts';
import type { CarSpec } from './look.ts';

/** One car: its body (the physics step's pose), `mesh` (drawn, interpolated, level) and `rock` (its look inside the
 *  mesh, rocked over the joints: origin on the ground under the car's centre, +z the way the line runs out). */
export type WagonCar = {
  spec: CarSpec;
  off: number; // m from the timetable's point along the line
  body: Body;
  mesh: THREE.Object3D;
  rock: THREE.Object3D;
  ground: number; // rock's height in the mesh's frame, before the joints' dip (the ground under the car)
  platform: Platform;
};

export type WagonCtx = {
  cars: WagonCar[];
  /** The timetable now (null: no wagon running). `dist` is cm along the line; `speed` m/s, signed (+: outbound). */
  state: () => WagonState | null;
  /** The point `d` m along the line from the first site. */
  lineAt: (d: number, out: { x: number; z: number }) => { x: number; z: number };
};

/** A spot beside the line: `d` m along it, `lat` m to the right going out (negative: left; on the home layout, left
 *  going out is the sea side). Also the line's direction there (ux, uz) and the right (rx, rz). */
export function besideLine(ctx: WagonCtx, d: number, lat: number) {
  const a = ctx.lineAt(d - 0.5, { x: 0, z: 0 }),
    b = ctx.lineAt(d + 0.5, { x: 0, z: 0 });
  const len = Math.hypot(b.x - a.x, b.z - a.z) || 1;
  const ux = (b.x - a.x) / len,
    uz = (b.z - a.z) / len;
  const rx = -uz,
    rz = ux;
  const c = ctx.lineAt(d, { x: 0, z: 0 });
  return { x: c.x + rx * lat, z: c.z + rz * lat, ux, uz, rx, rz, yaw: Math.atan2(ux, uz) };
}

/** The train's leading end, m along the line, going `dir` (1 out, -1 back): the loco's nose, or the last car's tail. */
export function frontOf(ctx: WagonCtx, d: number, dir: number) {
  let f = dir > 0 ? -Infinity : Infinity;
  for (const c of ctx.cars) f = dir > 0 ? Math.max(f, d + c.off + c.spec.hz) : Math.min(f, d + c.off - c.spec.hz);
  return f;
}

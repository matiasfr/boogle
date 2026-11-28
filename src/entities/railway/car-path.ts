import { ORIGIN, type LinePoint } from '../../place/layout.ts';
import { LAP_S0, LINE2, RAIL_LINES } from '../../sim/railway-lines.ts';
import { lapAt, lapCarAt, lapY, line2At, line2Lat, line2Y, type LatRow } from './line2-path.ts';
import { isRowLine, rowAt, rowY } from './row-path.ts';

type CarPath = { at: (s: number, out: LinePoint) => void; y: (s: number) => number; ox: number; oz: number };
const LINE2_PATH: CarPath = {
  at: (s, out) => line2At(s, out, true),
  y: line2Y,
  ox: ORIGIN.x,
  oz: ORIGIN.z,
};
const LAP_PATH: CarPath = { ...LINE2_PATH, at: lapAt, y: lapY };
const CAVE_LAP_PATH: CarPath = { ...LINE2_PATH, at: lapCarAt, y: (s) => lapY(LAP_S0 / 100 - s) };
const ROW_PATHS = new Map(
  RAIL_LINES.flatMap((_l, k): [number, CarPath][] =>
    isRowLine(k) ? [[k, { at: (s, out) => rowAt(k, s, out), y: (s) => rowY(k, s), ox: 0, oz: 0 }]] : [],
  ),
);
/** The running track locates the car, while its original formation fixes its facing. */
export function carPath(origin: number, running: number, joined: boolean) {
  if (origin !== running) return CAVE_LAP_PATH;
  if (running === LINE2) return joined ? LAP_PATH : LINE2_PATH;
  return ROW_PATHS.get(running);
}
export const carAlong = (cm: number, mirrored: boolean) => (mirrored ? LAP_S0 - cm : cm) / 100;
export const mirroredLat = (row: LatRow, s: number, stops: readonly number[], merge: number) =>
  -line2Lat(row, LAP_S0 / 100 - s, stops, merge, true);
export const BOTTOM = 0.4;
export type CarPose = { x: number; y: number; z: number; yaw: number; pitch: number; hy: number };
const a2: LinePoint = { x: 0, z: 0, ux: 0, uz: 1 },
  b2: LinePoint = { x: 0, z: 0, ux: 0, uz: 1 };
/** Poses a car on `path`, each axle end set across by `lat` (as car.ts poseCarOnLine does on a layout line). */
export function poseOnPath(c: CarPose, path: CarPath, s: number, lat: (s: number) => number) {
  path.at(s + 1.1, a2);
  path.at(s - 1.1, b2);
  const la = lat(s + 1.1),
    lb = lat(s - 1.1);
  a2.x -= a2.uz * la;
  a2.z += a2.ux * la;
  b2.x -= b2.uz * lb;
  b2.z += b2.ux * lb;
  c.x = (a2.x + b2.x) / 2 + path.ox;
  c.z = (a2.z + b2.z) / 2 + path.oz;
  c.yaw = Math.atan2(a2.x - b2.x, a2.z - b2.z);
  const ya = path.y(s + 1.1),
    yb = path.y(s - 1.1);
  c.y = (ya + yb) / 2 + BOTTOM + c.hy;
  c.pitch = Math.atan2(ya - yb, 2.2);
}

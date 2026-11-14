// Local browser memory only. No wall clock is read here: callers supply the observation time.
import { RAIL_LINES } from '../sim/railway-lines.ts';
import { JUMPS } from '../world/railway-jump.ts';

type Position = { x: number; y: number; z: number };
export type ReturnSpot = Position & { yaw: number; at: number; ride?: Position };
const finite = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n);
function position(value: unknown): value is Position {
  if (!value || typeof value !== 'object') return false;
  const p = value as Position;
  return (
    finite(p.x) &&
    finite(p.y) &&
    finite(p.z) &&
    Math.abs(p.x) <= 5000 &&
    Math.abs(p.z) <= 5000 &&
    p.y >= -50 &&
    p.y <= 500
  );
}
export function readReturnSpot(value: unknown, now: number, windowMs: number): ReturnSpot | null {
  try {
    if (!position(value) || !finite(now) || !finite(windowMs) || windowMs <= 0) return null;
    const p = value as ReturnSpot;
    if (!finite(p.yaw) || !finite(p.at) || now - p.at < 0 || now - p.at > windowMs) return null;
    if (p.ride !== undefined && !position(p.ride)) return null;
    return { x: p.x, y: p.y, z: p.z, yaw: p.yaw, at: p.at, ...(p.ride === undefined ? {} : { ride: { ...p.ride } }) };
  } catch {
    return null;
  }
}
export function captureReturnSpot(
  prev: ReturnSpot | null,
  state: { standing: boolean; pos: Position; yaw: number; standable: boolean },
  now: number,
): ReturnSpot | null {
  if (!position(state.pos) || !finite(state.yaw) || !finite(now)) return prev;
  if (state.standing && state.standable) return { ...state.pos, yaw: state.yaw, at: now };
  return prev ? { ...prev, at: now, ride: { ...state.pos } } : null;
}
/** One candidate per catalogue platform; coincident up/down platforms share a candidate. */
export function haltLandings(): Position[] {
  const points = RAIL_LINES.flatMap((line) => line.halts.flatMap((halt) => halt.platforms));
  const unique = new Map<string, Position>();
  for (const point of points) {
    const platform = { x: point.x / 100, y: point.y / 100, z: point.z / 100 };
    const jump = JUMPS.flatMap((j) => (j.land ? [j.land] : []))
      .filter((p) => Math.hypot(p.x - platform.x, p.z - platform.z) <= 30)
      .sort(
        (a, b) => Math.hypot(a.x - platform.x, a.z - platform.z) - Math.hypot(b.x - platform.x, b.z - platform.z),
      )[0];
    const landing = jump ?? platform;
    unique.set(`${landing.x}:${landing.y}:${landing.z}`, { x: landing.x, y: landing.y, z: landing.z });
  }
  return [...unique.values()];
}
export function returnCandidates(spot: ReturnSpot, halts: readonly Position[]): Position[] {
  const near = spot.ride ?? spot;
  const distance = (p: Position) => Math.hypot(p.x - near.x, p.z - near.z);
  const closest = [...halts].sort((a, b) => distance(a) - distance(b)).slice(0, 2);
  return !spot.ride || distance(spot) <= 25 ? [{ x: spot.x, y: spot.y, z: spot.z }, ...closest] : closest;
}

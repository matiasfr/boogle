// Local browser memory only. No wall clock is read here: callers supply the observation time.
import { RAIL_LINES } from '../sim/railway-lines.ts';
import { JUMPS } from '../world/railway-jump.ts';

export type ReturnPosition = { x: number; y: number; z: number };
type Position = ReturnPosition;
export type ReturnCandidate = Position & { halt?: string; checked?: boolean };
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
export function haltLandings(): ReturnCandidate[] {
  const points = RAIL_LINES.flatMap((line) =>
    line.halts.flatMap((halt, k) => halt.platforms.map((point) => ({ point, halt: `${line.id}:${k}` }))),
  );
  const unique = new Map<string, ReturnCandidate>();
  for (const { point, halt } of points) {
    const platform = { x: point.x / 100, y: point.y / 100, z: point.z / 100 };
    const jump = JUMPS.flatMap((j) => (j.land ? [j.land] : []))
      .filter((p) => Math.hypot(p.x - platform.x, p.z - platform.z) <= 30)
      .sort(
        (a, b) => Math.hypot(a.x - platform.x, a.z - platform.z) - Math.hypot(b.x - platform.x, b.z - platform.z),
      )[0];
    const landing = jump ?? platform;
    unique.set(`${halt}:${landing.x}:${landing.y}:${landing.z}`, {
      x: landing.x,
      y: landing.y,
      z: landing.z,
      halt,
      checked: !!jump,
    });
  }
  return [...unique.values()];
}
export function returnCandidates(spot: ReturnSpot, halts: readonly ReturnCandidate[]): ReturnCandidate[] {
  const near = spot.ride ?? spot;
  const distance = (p: Position) => Math.hypot(p.x - near.x, p.z - near.z);
  const seen = new Set<string>();
  const closest = [...halts]
    .sort((a, b) => distance(a) - distance(b))
    .filter((p) => {
      if (!p.halt) return true;
      if (seen.has(p.halt)) return false;
      seen.add(p.halt);
      return true;
    })
    .slice(0, 2);
  return !spot.ride || distance(spot) <= 25 ? [{ x: spot.x, y: spot.y, z: spot.z }, ...closest] : closest;
}

/** Local placement search; seconds and surface queries are supplied by the arrival owner. */
export function createReturnSearch(spot: ReturnSpot | null, halts: readonly ReturnCandidate[]) {
  const list = spot ? returnCandidates(spot, halts) : [];
  let k = 0,
    since: number | null = null,
    done = false;
  return {
    current: () => (done ? null : (list[k] ?? null)),
    step(
      now: number,
      probes: {
        settled: (p: Position) => boolean;
        standable: (p: Position) => boolean;
        near: (p: Position, radii: readonly number[]) => Position | null;
      },
    ): { kind: 'hold' } | { kind: 'home' } | { kind: 'land'; at: Position } {
      const p = list[k];
      if (done || !p) {
        done = true;
        return { kind: 'home' };
      }
      if (since === null) {
        since = now;
        return { kind: 'hold' };
      }
      if (now - since < 2.5 && !probes.settled(p)) return { kind: 'hold' };
      if (now - since < 2.5) {
        const exact = (!p.halt || p.checked) && probes.standable(p);
        const at = exact ? p : probes.near(p, p.halt && !p.checked ? [3, 4.5, 6, 8] : [1.4, 3, 6]);
        if (at) {
          done = true;
          return { kind: 'land', at };
        }
      }
      k++;
      since = now;
      if (k >= list.length) {
        done = true;
        return { kind: 'home' };
      }
      return { kind: 'hold' };
    },
  };
}

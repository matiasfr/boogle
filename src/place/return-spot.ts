// Local browser memory only. No wall clock is read here: callers supply the observation time.
import { RAIL_LINES } from '../sim/railway-lines.ts';
import { JUMPS } from '../world/railway-jump.ts';

export type ReturnPosition = { x: number; y: number; z: number };
type Position = ReturnPosition;
/** A halt's landing carries its catalogue place (`line` index, `stop` index: the room's state says whether it stands)
 * and the track's centre beside it (`track`, metres), which a fallback arrival faces: the boarding edge. */
export type ReturnCandidate = Position & {
  halt?: string;
  checked?: boolean;
  line?: number;
  stop?: number;
  track?: { x: number; z: number };
};
/** `ride.halt`: the halt (`<line id>:<stop>`) the train you were on was running to, when the record knew. */
export type ReturnSpot = Position & { yaw: number; at: number; ride?: Position & { halt?: string } };
const HALT_ID = /^[\w-]{1,24}:\d{1,3}$/;
/** Every halt tried on one return, however many stand: with the remembered spot it stays inside the cover's wait. */
export const RETURN_BUDGET_S = 8;
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
    const halt = p.ride?.halt;
    if (halt !== undefined && (typeof halt !== 'string' || !HALT_ID.test(halt))) return null;
    const ride = p.ride && { x: p.ride.x, y: p.ride.y, z: p.ride.z, ...(halt === undefined ? {} : { halt }) };
    return { x: p.x, y: p.y, z: p.z, yaw: p.yaw, at: p.at, ...(ride ? { ride } : {}) };
  } catch {
    return null;
  }
}
export function captureReturnSpot(
  prev: ReturnSpot | null,
  state: { standing: boolean; pos: Position; yaw: number; standable: boolean; halt?: string },
  now: number,
): ReturnSpot | null {
  if (!position(state.pos) || !finite(state.yaw) || !finite(now)) return prev;
  if (state.standing && state.standable) return { ...state.pos, yaw: state.yaw, at: now };
  const halt = state.halt !== undefined && HALT_ID.test(state.halt) ? { halt: state.halt } : {};
  return prev ? { ...prev, at: now, ride: { x: state.pos.x, y: state.pos.y, z: state.pos.z, ...halt } } : null;
}
/** The point of a line's track nearest `p`, in metres: its path is world (x, z) cm every 10 m. Nearest, not the
 * halt's `s`: the Railhead's joint platform stands well along the line from the stop its halt is written at. */
function trackNear(path: readonly number[], p: { x: number; z: number }) {
  const at = (i: number) => ({ x: path[2 * i]! / 100, z: path[2 * i + 1]! / 100 });
  let best = at(0),
    least = Infinity;
  for (let i = 0; i + 1 < path.length / 2; i++) {
    const a = at(i),
      b = at(i + 1),
      dx = b.x - a.x,
      dz = b.z - a.z,
      t = Math.min(1, Math.max(0, ((p.x - a.x) * dx + (p.z - a.z) * dz) / (dx * dx + dz * dz || 1))),
      q = { x: a.x + dx * t, z: a.z + dz * t },
      d = Math.hypot(p.x - q.x, p.z - q.z);
    if (d < least) {
      least = d;
      best = q;
    }
  }
  return best;
}
/** The yaw that faces `toward` from `from` (forward is (-sin yaw, -cos yaw), as a jump landing's). */
export const yawToward = (from: { x: number; z: number }, toward: { x: number; z: number }) =>
  Math.atan2(from.x - toward.x, from.z - toward.z);
/** One candidate per catalogue platform; coincident up/down platforms share a candidate. */
export function haltLandings(): ReturnCandidate[] {
  const jumps = JUMPS.flatMap((j) => (j.land ? [j.land] : []));
  const points = RAIL_LINES.flatMap((line, index) =>
    line.halts.flatMap((halt, k) =>
      halt.platforms.map((point) => ({
        point,
        halt: `${line.id}:${k}`,
        line: index,
        stop: k,
        path: line.path,
      })),
    ),
  );
  const unique = new Map<string, ReturnCandidate>();
  for (const { point, halt, line, stop, path } of points) {
    const platform = { x: point.x / 100, y: point.y / 100, z: point.z / 100 };
    const jump = jumps
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
      line,
      stop,
      track: trackNear(path, platform),
    });
  }
  return [...unique.values()];
}
/** The order a return tries: the spot (unless the last sighting was over 25 m from it), then the halt the train was
 * running to when the record knows it, then every other halt nearest first. Only halts that `stands` says are built
 * in this room now are listed, one landing per halt (its nearest) and one halt per physical landing (two catalogue
 * halts can share one: a future line's first halt at Gorge), so a slot is never spent on a halt that cannot work
 * or on the same spot twice. The search's time budget, not a count, bounds how many are tried. */
export function returnCandidates(
  spot: ReturnSpot,
  halts: readonly ReturnCandidate[],
  stands: (halt: ReturnCandidate) => boolean = () => true,
): ReturnCandidate[] {
  const near = spot.ride ?? spot;
  const distance = (p: Position) => Math.hypot(p.x - near.x, p.z - near.z);
  const seenHalt = new Set<string>(),
    seenLanding = new Set<string>();
  const standing = halts.filter(stands).sort((a, b) => distance(a) - distance(b));
  // The halt the train was running to goes first, before duplicates are dropped: another line's halt on the same
  // landing (the Village's two lines) must not take its place and lose it.
  const next = spot.ride?.halt === undefined ? undefined : standing.find((p) => p.halt === spot.ride!.halt);
  const order = (next ? [next, ...standing.filter((p) => p !== next)] : standing).filter((p) => {
    const landing = `${p.x}:${p.y}:${p.z}`;
    if (seenLanding.has(landing) || (p.halt && seenHalt.has(p.halt))) return false;
    seenLanding.add(landing);
    if (p.halt) seenHalt.add(p.halt);
    return true;
  });
  return !spot.ride || distance(spot) <= 25 ? [{ x: spot.x, y: spot.y, z: spot.z }, ...order] : order;
}

/** Local placement search; seconds and surface queries are supplied by the arrival owner. `land` names the
 * candidate it came from (`from`), so a halt fallback can face its track. */
export function createReturnSearch(
  spot: ReturnSpot | null,
  halts: readonly ReturnCandidate[],
  stands?: (halt: ReturnCandidate) => boolean,
) {
  const list = spot ? returnCandidates(spot, halts, stands) : [];
  let k = 0,
    since: number | null = null,
    began: number | null = null,
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
    ): { kind: 'hold' } | { kind: 'home' } | { kind: 'land'; at: Position; from: ReturnCandidate } {
      const p = list[k];
      began ??= now;
      if (done || !p || now - began > RETURN_BUDGET_S) {
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
          return { kind: 'land', at, from: p };
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

// Where the beach ball last came to rest, saved with the room's world so the next visitor finds it there. The ball's
// physics is Owner state (src/physics/ball.js); only this resting spot crosses into the world, as an edit, the way a
// thrown item reports its landing. Integer centimetres, one accepted rest per REST_GAP ticks. Pure and deterministic
// (lockstep): no tick work, so it costs nothing until the ball settles.
import { FNV_SEED, fold } from './hash.ts';

export const REST_GAP = 20; // ticks (2 s) between accepted rests
export const MAX_XZ_CM = 25500; // the world's half size in cm (HALF * 100 in src/world/grid.ts; a test pins it)
export const MIN_Y_CM = -1500;
export const MAX_Y_CM = 20000;

export type BallRest = { p: [number, number, number] | null; at: number };
export type BallRestJSON = { p: [number, number, number] | null; at: number };

const isInt = (v: unknown): v is number => Number.isSafeInteger(v);
const inRange = (x: number, y: number, z: number) =>
  Math.abs(x) <= MAX_XZ_CM && Math.abs(z) <= MAX_XZ_CM && y >= MIN_Y_CM && y <= MAX_Y_CM;

export const createBallRest = (): BallRest => ({ p: null, at: 0 });

export function canRest(s: BallRest, x: unknown, y: unknown, z: unknown, tick: unknown): boolean {
  if (!isInt(x) || !isInt(y) || !isInt(z) || !isInt(tick)) return false;
  return inRange(x, y, z) && (s.p === null || tick - s.at >= REST_GAP);
}

export function rest(s: BallRest, x: number, y: number, z: number, tick: number): [number, number, number] {
  s.p = [x, y, z];
  s.at = tick;
  return s.p;
}

export const serializeBallRest = (s: BallRest): BallRestJSON => ({
  p: s.p ? [s.p[0], s.p[1], s.p[2]] : null,
  at: s.at,
});

// Throws on a bad shape, so sync starts the state fresh (and counts the failure) instead of keeping half of it.
export function loadBallRest(s: BallRest, json: unknown) {
  const j = json as { p?: unknown; at?: unknown } | null;
  if (!j || typeof j !== 'object') throw new Error('ball: bad snapshot');
  if (!isInt(j.at) || j.at < 0) throw new Error('ball: bad tick');
  let p: [number, number, number] | null = null;
  if (j.p !== null) {
    if (!Array.isArray(j.p) || j.p.length !== 3) throw new Error('ball: bad spot');
    const [x, y, z] = j.p;
    if (!isInt(x) || !isInt(y) || !isInt(z) || !inRange(x, y, z)) throw new Error('ball: bad spot');
    p = [x, y, z];
  }
  s.p = p;
  s.at = j.at;
}

export function hashBallRest(s: BallRest): number {
  let h = fold(FNV_SEED, s.p === null ? 1 : 0);
  h = fold(h, s.p?.[0] ?? 0);
  h = fold(h, s.p?.[1] ?? 0);
  h = fold(h, s.p?.[2] ?? 0);
  return fold(h, s.at);
}

// The wagon's steam (?proto=wagon&v=stoke; docs/research/roblox-patterns.md, pattern 2, Dead Rails' furnace): logs
// fed into the loco's firebox burn down one unit a tick, and steam is speed. With a cold firebox the wagon still runs,
// at walking pace. Pure and deterministic (lockstep): integers only.
//
// Why a clock and not a speed: the wagon's place stays `wagonAt` (./wagon.ts), a pure function of its timetable, but
// read at the wagon's own clock `tau` instead of the room's tick. Each tick tau moves on by `rate` (thousandths of a
// tick): while the wagon runs, rate follows the steam (walking pace to fast) and changes by at most RATE_STEP a tick,
// so its speed never jumps; while it stands at a stop, tau moves at real time, so a dwell lasts 6 s however cold the
// fire. tau only ever grows by whole integers, so the place is continuous (no teleports) and the same on every peer.
import { FNV_SEED, foldAll } from './hash.ts';

export const STEAM_PER_LOG = 100; // ticks one log burns (10 s)
export const STEAM_MAX = 1200; // the firebox holds 12 logs' worth (2 min)
export const STEAM_FULL = 300; // at or over this much steam the wagon runs flat out; under it, slower down to walking
export const WALK = 15; // cm per tick with no steam (1.5 m/s)
export const FAST = 65; // cm per tick at full steam (6.5 m/s)
export const STOKE_MAX = 12; // logs one stoke may put in
export const RATE_ONE = 1000; // tau per tick at the timetable's own pace
export const RATE_STEP = 15; // the most the rate changes in one tick (about 4 s from walking to fast)

/** steam: ticks of burn left; rate: tau per tick while running; tau: the wagon's clock, thousandths of a tick;
 *  fed: logs ever stoked; rev counts changes, for views (neither saved nor hashed). */
export type Steam = { steam: number; rate: number; tau: number; fed: number; rev: number };
export type SteamJson = [number, number, number, number];

const isInt = (v: unknown): v is number => Number.isSafeInteger(v);
const TWO32 = 4294967296;

export function createSteam(): Steam {
  return { steam: 0, rate: 0, tau: 0, fed: 0, rev: 0 };
}

/** The speed steam gives, cm per tick: WALK cold, FAST at STEAM_FULL or more, a straight line between. */
export const speedOf = (steam: number): number =>
  WALK + Math.floor(((FAST - WALK) * Math.min(Math.max(steam, 0), STEAM_FULL)) / STEAM_FULL);

/** The running rate that gives that speed on a timetable cruising at `cruise` cm per tick (never over RATE_ONE). */
export const rateFor = (steam: number, cruise: number): number =>
  Math.min(RATE_ONE, Math.floor((speedOf(steam) * RATE_ONE) / Math.max(1, cruise)));

/** How many of `n` logs the firebox takes now: room for at least part of each, never more than STOKE_MAX. */
export function stokeRoom(s: Steam, n: number): number {
  if (!isInt(n) || n < 1) return 0;
  const room = Math.ceil((STEAM_MAX - s.steam) / STEAM_PER_LOG);
  return Math.max(0, Math.min(n, STOKE_MAX, room));
}

/** Puts n logs in (already checked against stokeRoom); returns the steam after. */
export function stoke(s: Steam, n: number): number {
  s.steam = Math.min(STEAM_MAX, s.steam + n * STEAM_PER_LOG);
  s.fed += n;
  s.rev++;
  return s.steam;
}

/** One tick: the fire burns, the running rate eases toward the steam's, and the clock moves on (at real time while
 *  `standing` at a stop). */
export function steamTick(s: Steam, cruise: number, standing: boolean): void {
  if (s.steam > 0) {
    s.steam--;
    if (s.steam % 10 === 0) s.rev++; // views redraw the gauge a few times a second, not every tick
  }
  const want = rateFor(s.steam, cruise);
  s.rate += Math.max(-RATE_STEP, Math.min(RATE_STEP, want - s.rate));
  s.tau += standing ? RATE_ONE : s.rate;
}

export function serializeSteam(s: Steam): SteamJson {
  return [s.steam, s.rate, s.tau, s.fed];
}
export function loadSteam(s: Steam, json: unknown): void {
  const [steam, rate, tau, fed] = Array.isArray(json) ? json : [];
  const ok = isInt(steam) && steam >= 0 && steam <= STEAM_MAX && isInt(rate) && rate >= 0 && rate <= RATE_ONE;
  if (!ok || !isInt(tau) || tau < 0 || !isInt(fed) || fed < 0) throw new Error('steam: bad snapshot');
  Object.assign(s, { steam, rate, tau, fed, rev: s.rev + 1 });
}
// tau and fed can pass 2^32: fold their low and high words.
export const hashSteam = (s: Steam): number =>
  foldAll(FNV_SEED, [
    s.steam,
    s.rate,
    s.tau % TWO32,
    Math.floor(s.tau / TWO32),
    s.fed % TWO32,
    Math.floor(s.fed / TWO32),
  ]);

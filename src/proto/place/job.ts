// What ?proto=place remembers, in one place. `job` is the railway's shared state: the ladder, the paths, the town's numbers and
// the score. Everything else that's kept (lines, forge, trees, heaps, your back, gifts) registers a slice here, so saving and
// the co-op snapshot both read the same list:
//   sharedSlice('town', { get, set })     what everyone in a `&coop=1` room has in common; goes in the save and the snapshot
//   personalSlice('gifts', { get, set })  this tab's own; goes in the save only
// A later system adds a field to `job`, or a slice of its own. `get` returns plain JSON; `set` gets back what `get` made, or
// garbage from another build's save or another tab, so it checks what it reads (`num`, `count`) and keeps its defaults when
// something's missing. Local, or shared by ./coop.ts behind the flag. Never read by the sim.
import { getRoomId } from '../../netplay/net.ts';
import { TUNE } from './layout.ts';
import { pageQuery } from '../flags.ts';

export const COOP = pageQuery().get('coop') === '1';

export type ChestId = 'axe' | 'pack';
/** The ladder: each rung answers something you were already wishing for. */
export type Rungs = {
  axe: number; // 0 the old axe, 1 the proper one
  multi: boolean; // the multi-axe, from waking the machine: trees and rocks
  pack: number; // 0 your back, 1 the pack frame
  depot: boolean; // the camp's cart brings logs to a rack by the next frame
  trains: boolean; // trains are running: the top of the ladder
};
export const job = {
  awake: false,
  turned: false, // the machine has gone over to line 2
  people: TUNE.people,
  wood: 0, // crates of timber that have reached the village's heap
  stone: 0,
  loose: 0, // logs out of an opened crate at the heap, not yet taken
  rung: { axe: 0, multi: false, pack: 0, depot: false, trains: false } as Rungs,
  /** Ancient technology you've found (./tech.ts), the room's, and the two slabs across the line. */
  tech: { jump: false, hook: false, glide: false },
  gate: { quarry: false, sea: false },
  chest: null as ChestId | null, // a tool chest is waiting
  boiler: 0, // 0 not cast, 1 standing by the forge, 2 on someone's shoulder, 3 fitted
  longBeam: { x: 868, z: -30, yaw: 0, set: false }, // optional co-op toy; world coordinates, clear of the museum
  forgeBill: 0, // which of FORGE_BILLS its frame is on
  kitSent: 0, // crates of the pier's kit that have gone aboard a train
  ended: false, // the pier's out: the test is over, and you can wander
  /** Your own walks, in seconds: the long way round to the machine, and the new way along what you built. */
  ways: { long: 0, short: 0 },
  score: { money: 0, logs: 0, rails: 0, stone: 0, metres: 0 },
};
export type Job = typeof job;
const fresh = JSON.stringify(job);

export const num = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
export const count = (v: unknown, max = 1e7): v is number =>
  Number.isInteger(v) && (v as number) >= 0 && (v as number) <= max;
/** Copies what's there and of the same type as the default onto `to`, one level at a time. A missing field keeps its default. */
function fill<T extends object>(to: T, from: unknown) {
  if (!from || typeof from !== 'object') return;
  for (const k of Object.keys(to) as (keyof T)[]) {
    const a = to[k],
      b = (from as T)[k];
    if (a && typeof a === 'object' && !Array.isArray(a)) fill(a as object, b);
    else if (a === null ? b === null || typeof b === 'string' : typeof a === typeof b) to[k] = b;
  }
}

// ---------------------------------------------------------------- slices
type Slice = { key: string; get: () => unknown; set: (v: unknown) => void };
const shared: Slice[] = [],
  personal: Slice[] = [];
export const sharedSlice = (key: string, s: Omit<Slice, 'key'>) => void shared.push({ key, ...s });
export const personalSlice = (key: string, s: Omit<Slice, 'key'>) => void personal.push({ key, ...s });
sharedSlice('job', {
  get: () => JSON.parse(JSON.stringify(job)),
  set: (v) => {
    Object.assign(job, JSON.parse(fresh));
    fill(job, v);
    if (job.awake) job.rung.multi = true;
  },
});
const gather = (list: Slice[]) => Object.fromEntries(list.map((s) => [s.key, s.get()]));
/** Everything the room has in common, as plain JSON. */
export const captureShared = () => gather(shared);
/** Puts it back. Each slice sets its own numbers; the show of it is ./run.ts's `snapAll`. */
export function applyShared(j: Record<string, unknown>) {
  for (const s of shared) s.set(j[s.key]);
}
export const resetJob = () => {
  Object.assign(job, JSON.parse(fresh));
};

// ---------------------------------------------------------------- the save
// A new key each round: an older save's shape can't break this one.
const KEY = COOP ? `boogle-place-coop-v2:${getRoomId()}` : `boogle-place-v4:${getRoomId()}`;
let saving = true;
/** Forget this person's round-four saves, including every personal slice in either mode. */
export function forgetSaves() {
  saving = false; // pagehide and late gift/co-op callbacks must not write the old run back
  try {
    for (const key of Object.keys(localStorage))
      if (key.startsWith('boogle-place-v4:') || key.startsWith('boogle-place-coop-v2:')) localStorage.removeItem(key);
  } catch {
    // Storage is unavailable: there is no persistent run to clear.
  }
}
export function save() {
  if (!saving) return;
  try {
    localStorage.setItem(KEY, JSON.stringify({ shared: captureShared(), personal: gather(personal) }));
  } catch {
    // private mode: a reload starts over
  }
}
/** True if there was a save. */
export function restore() {
  try {
    const j = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (!j) return false;
    applyShared(j.shared ?? {});
    for (const s of personal) s.set(j.personal?.[s.key]);
    return true;
  } catch {
    return false; // an old shape: start fresh
  }
}

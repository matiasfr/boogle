// Work sites (brief 7 loop A, brief 10 M5): one per route section. Players pour their stack into a site's Track ring
// (which lays the section once a run is started) or its Helper ring (which builds the station's helper hut). Every
// pour is credited on the site's plaque in points (1 point = 1% of that age's section cost), keeping the remainder per
// player so integer rounding never loses credit. Pure and deterministic (lockstep); the rules (src/world/rules/sites.ts)
// check that a pour comes from the pourer's own stack.
import { ROUTE, AGES, TRACK, HELPER, costOf } from './route.ts';
import { runAt, lengthOf, MACHINE_RUN, PUSH_TICKS, type Phase, type RunState } from './scripted-run.ts';
import { FNV_SEED, fold, foldAll } from './hash.ts';

// A ring's cost (route.ts costOf by default; a playtest room passes its tuned one, ./tune.ts). Plaque credit always uses
// the age's default cost, so points mean the same in every room.
export type CostFn = (s: number, ring: number) => number;
export const RUN_BONUS = 5; // points to whoever starts a machine run
export const HELPER_EVERY = 270; // ticks per piece of freight each helper hut adds (brief 7: ~0.15x a hand rate)
const isInt = (v: unknown): v is number => Number.isSafeInteger(v);

/** A plaque row: [roster index, points, remainder (in 1/cost of a point)]. */
export type PlaqueRow = [number, number, number];
export type Site = {
  stock: [number, number];
  used: number;
  poured: number;
  freight: number;
  helpers: number;
  t0: number;
  starter: number;
  bonus: number;
  plaque: PlaqueRow[];
};
export type Sites = { open: number; list: Site[]; rev: number };
/** Saved form: open, then per site [track, helper, ...FIELDS, flat plaque rows]. */
export type SitesJson = { o: number; s: (number | number[])[][] };

function freshSite(): Site {
  // stock: units in each ring; used: units consumed (laid track, built huts); poured / freight: what came in from
  // players and from helpers; t0: tick a run started (-1); starter: who started it; plaque: [[idx, pts, rem], ...]
  return {
    stock: [0, 0],
    used: 0,
    poured: 0,
    freight: 0,
    helpers: 0,
    t0: -1,
    starter: -1,
    bonus: 0,
    plaque: [],
  };
}
// open: the first section not laid yet (sections are laid in order, so s < open means laid). rev counts every change,
// for views to redraw on; it is neither saved nor hashed.
export function createSites(): Sites {
  return { open: 0, list: ROUTE.map(freshSite), rev: 0 };
}
export const isDone = (st: Sites, s: number): boolean => s < st.open;

export const siteOpen = (st: Sites, s: unknown): s is number => isInt(s) && s === st.open && s < st.list.length;
// How many more units ring can take at site s right now.
export function ringRoom(st: Sites, s: number, ring: unknown, cost: CostFn = costOf): number {
  const site = st.list[s];
  if (!site || isDone(st, s)) return 0;
  if (ring === TRACK) return site.t0 >= 0 ? 0 : cost(s, TRACK) - site.stock[TRACK];
  if (ring === HELPER) return site.helpers ? 0 : cost(s, HELPER) - site.stock[HELPER];
  return 0;
}

function row(site: Site, idx: number): PlaqueRow {
  let r = site.plaque.find((p) => p[0] === idx);
  if (!r) site.plaque.push((r = [idx, 0, 0]));
  return r;
}
// Credits idx with `units` poured at site s. Returns the whole points added.
export function credit(st: Sites, s: number, idx: number, units: number): number {
  const r = row(st.list[s], idx);
  const cost = AGES[ROUTE[s].age].cost;
  const total = r[2] + units * 100;
  const pts = Math.floor(total / cost);
  r[1] += pts;
  r[2] = total % cost;
  return pts;
}
export function bonus(st: Sites, s: number, idx: number, pts: number): void {
  row(st.list[s], idx)[1] += pts;
  st.list[s].bonus += pts;
}

// Moves n units (already taken off idx's stack) into a ring; a full Helper ring builds the hut.
// Returns { pts, built }.
export function stock(
  st: Sites,
  s: number,
  ring: number,
  idx: number,
  n: number,
  cost: CostFn = costOf,
): { pts: number; built: boolean } {
  const site = st.list[s];
  st.rev++;
  site.stock[ring] += n;
  site.poured += n;
  const pts = idx >= 0 ? credit(st, s, idx, n) : 0;
  let built = false;
  if (ring === HELPER && site.stock[HELPER] >= cost(s, HELPER)) {
    site.used += site.stock[HELPER];
    site.stock[HELPER] = 0;
    site.helpers = 1;
    built = true;
  }
  return { pts, built };
}

// A run can start at the open site once its Track ring holds a whole section and nothing is running there.
export const canRun = (st: Sites, s: unknown, cost: CostFn = costOf): boolean =>
  siteOpen(st, s) && st.list[s].t0 < 0 && st.list[s].stock[TRACK] >= cost(s, TRACK);
export function startRun(st: Sites, s: number, idx: number, tick: number): void {
  st.rev++;
  st.list[s].t0 = tick;
  st.list[s].starter = idx;
}
// script: the room's run (MACHINE_RUN unless a playtest room tunes another, ./tune.ts `run`).
export const runOf = (st: Sites, s: number, tick: number, script: readonly Phase[] = MACHINE_RUN): RunState =>
  runAt(script, st.list[s]?.t0 ?? -1, tick);

// The push variant (./scripted-run.ts PUSH_RUN): while the open site's run is laying, its clock stands still unless
// pushed. stallRun (every tick, after ops) moves t0 on by one once the lay phase has begun, so tick - t0 stays put;
// pushRun (site.push) moves t0 back by PUSH_TICKS, as far as the end of the lay phase, never below 0 (t0 < 0 means no
// run). Scripts are warm, lay, whistle. Integer only.
export function stallRun(st: Sites, tick: number, script: readonly Phase[]): boolean {
  const site = st.list[st.open];
  if (!site || site.t0 < 0 || runOf(st, st.open, tick, script).name !== 'lay') return false;
  if (tick - site.t0 <= script[0].len) return false; // the first lay tick stays: the run waits laying, not warming
  site.t0++;
  return true;
}
export const canPush = (st: Sites, s: unknown, tick: number, script: readonly Phase[]): boolean =>
  siteOpen(st, s) && st.list[s].t0 >= 0 && runOf(st, s, tick, script).name === 'lay';
export function pushRun(st: Sites, s: number, tick: number, script: readonly Phase[]): number {
  if (!canPush(st, s, tick, script)) return 0;
  const site = st.list[s];
  const layEnd = lengthOf(script) - script[script.length - 1].len; // warm + lay
  const n = Math.min(PUSH_TICKS, layEnd - (tick - site.t0), site.t0);
  if (n <= 0) return 0;
  st.rev++;
  site.t0 -= n;
  return n;
}

// Ends the open site's run once its script is done: the section is laid, the starter gets RUN_BONUS, the next site
// opens. Returns the laid section's index, or -1.
export function finishRun(
  st: Sites,
  tick: number,
  cost: CostFn = costOf,
  script: readonly Phase[] = MACHINE_RUN,
): number {
  const s = st.open;
  const site = st.list[s];
  if (!site || site.t0 < 0 || !runOf(st, s, tick, script).done) return -1;
  const n = cost(s, TRACK);
  st.rev++;
  site.stock[TRACK] -= n;
  site.used += n;
  if (site.starter >= 0) bonus(st, s, site.starter, RUN_BONUS);
  st.open = s + 1;
  return s;
}

// Prototype shortcut (`open.lay`, proto- rooms only; src/world/rules/opening.ts): every section from the open one on
// counts as laid at once, with no run, credit or freight. Units stay where they are, so conservation holds. Returns
// how many sections it laid.
export function layRest(st: Sites): number {
  const n = st.list.length - st.open;
  if (n <= 0) return 0;
  st.rev++;
  st.open = st.list.length;
  return n;
}

// The age the route has reached: the age of the open section, or one past the last once the route is laid.
export const ageAt = (st: Sites): number =>
  st.open < ROUTE.length ? ROUTE[st.open].age : ROUTE[ROUTE.length - 1].age + 1;

// Helper huts send freight: every HELPER_EVERY ticks, one piece per built hut into the open site's Track ring (as far
// as it has room; a full or running ring just waits). Returns the pieces added.
export const helpersOf = (st: Sites): number => st.list.reduce((t, x) => t + x.helpers, 0);
export const helperFreight = (st: Sites, tick: number, cost: CostFn = costOf): number =>
  tick % HELPER_EVERY === 0 ? addFreight(st, helpersOf(st), cost) : 0;
export function addFreight(st: Sites, n: number, cost: CostFn = costOf): number {
  const s = st.open;
  const add = Math.min(n, ringRoom(st, s, TRACK, cost));
  if (add <= 0) return 0;
  st.rev++;
  st.list[s].stock[TRACK] += add;
  st.list[s].freight += add;
  return add;
}
// Points per roster index over every site's plaque.
export function pointsOf(st: Sites, idx: number): number {
  let t = 0;
  for (const site of st.list) for (const r of site.plaque) if (r[0] === idx) t += r[1];
  return t;
}

const FIELDS = ['used', 'poured', 'freight', 'helpers', 't0', 'starter', 'bonus'] as const;
// { o: open, s: [[track, helper, used, poured, freight, helpers, t0, starter, bonus, [idx, pts, rem, ...]], ...] }
export function serializeSites(st: Sites): SitesJson {
  return { o: st.open, s: st.list.map((x) => [...x.stock, ...FIELDS.map((f) => x[f]), x.plaque.flat()]) };
}
export function loadSites(st: Sites, json: unknown): void {
  const { o, s: rows } = (json ?? {}) as Partial<SitesJson>;
  if (!isInt(o) || o < 0 || !Array.isArray(rows) || rows.length > ROUTE.length) throw new Error('sites: bad snapshot');
  const list = ROUTE.map(freshSite);
  const n = 2 + FIELDS.length;
  rows.forEach((row: unknown, s) => {
    if (!Array.isArray(row) || row.length !== n + 1) throw new Error('sites: bad site');
    const nums: unknown[] = row.slice(0, n),
      flat: unknown = row[n];
    if (!nums.every(isInt) || !Array.isArray(flat)) throw new Error('sites: bad site');
    if (flat.length % 3 || !flat.every(isInt)) throw new Error('sites: bad plaque');
    const site = list[s];
    site.stock = [nums[0], nums[1]];
    FIELDS.forEach((f, k) => (site[f] = nums[2 + k]));
    for (let k = 0; k < flat.length; k += 3) site.plaque.push([flat[k], flat[k + 1], flat[k + 2]]);
  });
  Object.assign(st, { open: Math.min(o, ROUTE.length), list, rev: st.rev + 1 });
}
export function hashSites(st: Sites): number {
  let h = fold(FNV_SEED, st.open);
  for (const x of st.list) {
    h = foldAll(h, [...x.stock, ...FIELDS.map((f) => x[f])]);
    for (const r of x.plaque) h = foldAll(h, r);
  }
  return h;
}

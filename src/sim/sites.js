// Work sites (brief 7 loop A, brief 10 M5): one per route section. Players pour their stack into a site's Track ring
// (which lays the section once a run is started) or its Helper ring (which builds the station's helper hut). Every
// pour is credited on the site's plaque in points (1 point = 1% of that age's section cost), keeping the remainder per
// player so integer rounding never loses credit. Pure and deterministic (lockstep); the rules (src/world/rules/sites.js)
// check that a pour comes from the pourer's own stack.
import { ROUTE, AGES, TRACK, HELPER, costOf } from './route.js';
import { runAt, MACHINE_RUN } from './scripted-run.js';

export const RUN_BONUS = 5; // points to whoever starts a machine run
export const HELPER_EVERY = 270; // ticks per piece of freight each helper hut adds (brief 7: ~0.15x a hand rate)
const isInt = Number.isSafeInteger;

function freshSite() {
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
    done: 0,
    bonus: 0,
    plaque: [],
  };
}
export function createSites() {
  return { age: 0, open: 0, list: ROUTE.map(freshSite) };
}

export const siteOpen = (st, s) => isInt(s) && s === st.open && s < st.list.length;
// How many more units ring can take at site s right now.
export function ringRoom(st, s, ring) {
  const site = st.list[s];
  if (!site || site.done) return 0;
  if (ring === TRACK) return site.t0 >= 0 ? 0 : costOf(s, TRACK) - site.stock[TRACK];
  if (ring === HELPER) return site.helpers ? 0 : costOf(s, HELPER) - site.stock[HELPER];
  return 0;
}

function row(site, idx) {
  let r = site.plaque.find((p) => p[0] === idx);
  if (!r) site.plaque.push((r = [idx, 0, 0]));
  return r;
}
// Credits idx with `units` poured at site s (or, with pts, a flat bonus). Returns the whole points added.
export function credit(st, s, idx, units) {
  const r = row(st.list[s], idx);
  const cost = AGES[ROUTE[s].age].cost;
  const total = r[2] + units * 100;
  const pts = Math.floor(total / cost);
  r[1] += pts;
  r[2] = total % cost;
  return pts;
}
export function bonus(st, s, idx, pts) {
  row(st.list[s], idx)[1] += pts;
  st.list[s].bonus += pts;
}

// Moves n units (already taken off idx's stack) into a ring; a full Helper ring builds the hut.
// Returns { pts, built }.
export function stock(st, s, ring, idx, n) {
  const site = st.list[s];
  site.stock[ring] += n;
  site.poured += n;
  const pts = idx >= 0 ? credit(st, s, idx, n) : 0;
  let built = false;
  if (ring === HELPER && site.stock[HELPER] >= costOf(s, HELPER)) {
    site.used += site.stock[HELPER];
    site.stock[HELPER] = 0;
    site.helpers = 1;
    built = true;
  }
  return { pts, built };
}

// A run can start at the open site once its Track ring holds a whole section and nothing is running there.
export const canRun = (st, s) =>
  siteOpen(st, s) && st.list[s].t0 < 0 && !st.list[s].done && st.list[s].stock[TRACK] >= costOf(s, TRACK);
export function startRun(st, s, idx, tick) {
  st.list[s].t0 = tick;
  st.list[s].starter = idx;
}
export const runOf = (st, s, tick) => runAt(MACHINE_RUN, st.list[s]?.t0 ?? -1, tick);

// Ends the open site's run once its script is done: the section is laid, the starter gets RUN_BONUS, the next site
// opens. Returns the laid section's index, or -1.
export function finishRun(st, tick) {
  const s = st.open;
  const site = st.list[s];
  if (!site || site.t0 < 0 || site.done || !runOf(st, s, tick).done) return -1;
  const cost = costOf(s, TRACK);
  site.stock[TRACK] -= cost;
  site.used += cost;
  site.done = 1;
  if (site.starter >= 0) bonus(st, s, site.starter, RUN_BONUS);
  st.open = s + 1;
  return s;
}

// The age the route has reached: the age of the open section, or one past the last once the route is laid.
export const ageAt = (st) => (st.open < ROUTE.length ? ROUTE[st.open].age : ROUTE.at(-1).age + 1);

// Helper huts send freight: every HELPER_EVERY ticks, one piece per built hut into the open site's Track ring (as far
// as it has room; a full or running ring just waits). Returns the pieces added.
export function helperFreight(st, tick) {
  if (tick % HELPER_EVERY !== 0) return 0;
  return addFreight(
    st,
    st.list.reduce((t, x) => t + x.helpers, 0),
  );
}
export function addFreight(st, n) {
  const s = st.open;
  const add = Math.min(n, ringRoom(st, s, TRACK));
  if (add <= 0) return 0;
  st.list[s].stock[TRACK] += add;
  st.list[s].freight += add;
  return add;
}
export const helpersOf = (st) => st.list.reduce((t, x) => t + x.helpers, 0);

// Points per roster index over every site's plaque.
export function pointsOf(st, idx) {
  let t = 0;
  for (const site of st.list) for (const r of site.plaque) if (r[0] === idx) t += r[1];
  return t;
}

const FIELDS = ['used', 'poured', 'freight', 'helpers', 't0', 'starter', 'done', 'bonus'];
// { a: age, o: open, s: [[track, helper, used, poured, freight, helpers, t0, starter, done, bonus, [idx, pts, rem, ...]]] }
export function serializeSites(st) {
  return {
    a: st.age,
    o: st.open,
    s: st.list.map((x) => [...x.stock, ...FIELDS.map((f) => x[f]), x.plaque.flat()]),
  };
}
export function loadSites(st, json) {
  if (!isInt(json?.a) || !isInt(json?.o) || !Array.isArray(json?.s) || json.s.length > ROUTE.length)
    throw new Error('sites: bad snapshot');
  const list = ROUTE.map(freshSite);
  json.s.forEach((row, s) => {
    if (!Array.isArray(row) || row.length !== 11 || !row.slice(0, 10).every(isInt) || !Array.isArray(row[10]))
      throw new Error('sites: bad site');
    const flat = row[10];
    if (flat.length % 3 || !flat.every(isInt)) throw new Error('sites: bad plaque');
    const site = list[s];
    site.stock = [row[0], row[1]];
    FIELDS.forEach((f, k) => (site[f] = row[2 + k]));
    for (let k = 0; k < flat.length; k += 3) site.plaque.push(flat.slice(k, k + 3));
  });
  Object.assign(st, { age: json.a, open: Math.min(json.o, ROUTE.length), list });
}
export function hashSites(st) {
  let h = Math.imul(2166136261 ^ st.age, 16777619) ^ st.open;
  for (const x of st.list) {
    for (const v of [...x.stock, ...FIELDS.map((f) => x[f])]) h = Math.imul(h ^ v, 16777619);
    for (const r of x.plaque) for (const v of r) h = Math.imul(h ^ v, 16777619);
  }
  return h >>> 0;
}

// The playable 2D economy prototype's simulation: one to three players haul, explore and wait in real time on the
// Sickle Isles map, against the ring model's bills, producers, ladders, prices and away credit. Every number comes from
// ring-data.ts through ring-sim.ts's formulas; the map's lines give the distances. Pure (no DOM, no Node), so
// docs/world/economy-prototype.html bundles this file and test/economy-prototype.test.ts drives it headlessly.
// With `trade` set it also runs the passenger trade (play-trade.ts, on trade-model.ts's rules): riders, the shared
// strongbox, houses, and seats hauled for by the players; left out, the world is the ring model's alone.
//
// Where the closed-form model and this agent sim differ, on purpose:
// - Steps run in the map's stage order (second branch before High Port), not ring-data's ROUTE order.
// - Hand hauls walk or ride the real distance from the material's island to the work, not the model's localM.
// - An upgrade works from the moment its row is built, not from the start of its step.
// - Players may explore the next step, or a return, while machines fill the yard (the model adds waits instead).
import {
  GOALS,
  LADDERS,
  MATERIALS,
  PRICES,
  PRODUCERS,
  RECIPES,
  RESOURCES,
  RETURNS,
  ROUTE,
  STORAGE,
  type Bill,
  type Branch,
  type Material,
} from './ring-data.ts';
import {
  awayCredit,
  defaultSettings,
  freightRate,
  handFactor,
  handTripS,
  milestoneOf,
  rideS,
  type Settings,
} from './ring-sim.ts';
import type { PlayLine, PlayMap } from './play-map.ts';
import {
  awayBoogles,
  buy as buyTrade,
  createTrade,
  finishSeatJob,
  startSeatJob,
  tradeStep,
  isCrowd,
  offered,
  type SeatMode,
  type Trade,
} from './play-trade.ts';
import { ARRIVES, type StepDone } from './trade-model.ts';
import { TOWNS, townName, type Town } from './trade-data.ts';

export type XZ = [number, number];
export type Use = 'haul' | 'explore' | 'wait';
export const USES: Use[] = ['haul', 'explore', 'wait'];
/** model: hands only where no machine makes the material yet (ring-sim's rule). eager: also when a load beats waiting. */
export type Policy = 'model' | 'eager';
export type Choice = 'branchFirst' | 'trainFirst';
export const CHOICES: Record<Choice, { label: string; options: [string, string]; names: [string, string] }> = {
  branchFirst: {
    label: 'The fork at Ring Island: which branch first?',
    options: ['gorge', 'canopy'],
    names: ['High Gorge (copper)', 'Canopy Town (fibre)'],
  },
  trainFirst: {
    label: 'First Roundhouse upgrade at the spoke',
    options: ['boiler', 'chassis'],
    names: ['Boiler (speed)', 'Chassis (freight)'],
  },
};

type RowKind = 'recipe' | 'producer' | 'yard';
export type Job = {
  id: string;
  name: string;
  kind: RowKind;
  bill: Bill;
  got: Bill;
  done: boolean;
  effect: string;
};
export type Activity = { place: string; needS: number; doneS: number; what: string };
export type Step = {
  i: number;
  key: string;
  name: string;
  slot: string;
  place: string;
  stage: number;
  jobs: Job[];
  act: Activity;
  back: Activity | null;
  startedAt: number | null;
  doneAt: number | null;
};
export type Task =
  | { kind: 'travel'; to: string; use: Use; left: number; total: number; pts: XZ[] }
  | { kind: 'gather'; m: Material; n: number; left: number; total: number }
  | { kind: 'drop' }
  | { kind: 'place'; m: Material; n: number; left: number; total: number }
  | { kind: 'explore'; act: Activity; left: number }
  | { kind: 'wait'; left: number };
export type Player = {
  id: number;
  at: string;
  queue: Task[];
  load: { m: Material; n: number } | null;
  auto: boolean;
  time: Record<Use, number>;
  doing: string;
};
export type Event = { t: number; kind: string; text: string };
export type Sample = { t: number; step: number; wallet: number; yard: number[]; use: number[][] };
export type Rates = {
  speed: number;
  wagon: number;
  trains: number;
  carry: number;
  tool: number;
  bay: number;
  level: Record<Material, number>;
  rate: Record<Material, number>;
  cap: Record<Material, number>;
  km: Record<Material, number>;
  freight: Record<Material, number>;
  auto: Record<Material, number>;
  /** One player's hand rate to the Home Yard (ring-sim's `manual`), and the party's (`group`). */
  hand: Record<Material, number>;
  party: Record<Material, number>;
};
export type Options = {
  players: number;
  policy?: Policy;
  /** Preset order choices; unset ones pause the world and ask (the page) or take ring-data's default (headless). */
  branchFirst?: Branch;
  trainFirst?: string;
  /** Break into ring-data's sittings and apply the away credit at each new join. */
  sittings?: boolean;
  /** Which players the bot drives; the rest wait for commands. Default: all. */
  auto?: boolean[];
  settings?: Settings;
  /** Turns the passenger trade on (riders, fares, houses, seats); left out, the world is the ring model's alone. */
  trade?: {
    seats: SeatMode;
    seed?: number;
    /** The bots spend Boogles on the cheapest house on offer, as the model's house room does; the page leaves it to you. */
    autoBuy?: boolean;
  };
};
export type World = {
  map: PlayMap;
  s: Settings;
  n: number;
  policy: Policy;
  t: number;
  sittingT: number;
  sittings: boolean;
  sitting: number;
  choice: Partial<Record<Choice, string>>;
  pending: Choice | null;
  route: string[];
  steps: Step[];
  cur: number;
  built: Set<string>;
  yard: Record<Material, number>;
  wallet: number;
  sold: number;
  goal: number;
  goalGot: Bill;
  override: Partial<Record<Material, number>>;
  players: Player[];
  events: Event[];
  samples: Sample[];
  crossed: Set<Material>;
  mainDoneAt: number | null;
  /** Each player's hauling, exploring and waiting seconds when the main game ended. */
  mainUse: Record<Use, number>[] | null;
  done: boolean;
  /** The passenger trade (play-trade.ts), or null when the world is the ring model's alone. */
  trade: Trade | null;
  tradeAutoBuy: boolean;
  memo: { key: string; rates: Rates; dist: Map<string, Path | null> } | null;
};
type Path = { m: number; pts: XZ[] };

const num = (s: Settings, key: string) => Number(s[key]);
const zero = () => Object.fromEntries(MATERIALS.map((m) => [m, 0])) as Record<Material, number>;
const EPS = 1e-9;
export const NAMES = Object.fromEntries(RESOURCES.map((r) => [r.id, r.name])) as Record<Material, string>;
const res = (m: Material) => RESOURCES.find((r) => r.id === m)!;

// ---------------------------------------------------------------- the map
const pickIndex = (w: World) => (w.choice.branchFirst === 'canopy' ? 1 : 0);
/** The map stage the built lines have reached: the current step's (it lays its own line), the last one's while a choice waits. */
export const stageNow = (w: World) =>
  w.map.stepStage[w.route[Math.max(0, Math.min(w.cur - (w.pending ? 1 : 0), w.route.length - 1))]!] ?? 0;
export const lineOpen = (w: World, l: PlayLine, stage = stageNow(w)) => {
  const s = l.stage[pickIndex(w)];
  return s !== null && s !== undefined && s <= stage;
};
export const placeOpen = (w: World, id: string, stage = stageNow(w)) => {
  const p = w.map.places.find((x) => x.id === id);
  const s = p?.reach[pickIndex(w)];
  return s !== null && s !== undefined && s <= stage;
};
/** Ring-model slot to map place; b1/b2 need the branch choice. */
export function placeOfSlot(w: World, slot: string): string | null {
  if (slot === 'b1' || slot === 'b2') {
    const first = w.choice.branchFirst as Branch | undefined;
    if (!first) return null;
    const b = slot === 'b1' ? first : first === 'canopy' ? 'gorge' : 'canopy';
    return w.map.branches[b];
  }
  if (slot.startsWith('branch:')) return w.map.branches[slot.slice(7) as Branch];
  return w.map.slots[slot] ?? null;
}
export const sourceOf = (w: World, m: Material) => placeOfSlot(w, res(m).source);
export const placeAt = (w: World, id: string): XZ => w.map.places.find((p) => p.id === id)!.at;
export const placeName = (w: World, id: string) => w.map.places.find((p) => p.id === id)?.name ?? id;

/** Shortest open route between two places over the drawn lines (Dijkstra; the graph is a dozen places). */
export function route(w: World, from: string, to: string): Path | null {
  if (from === to) return { m: 0, pts: [placeAt(w, from)] };
  const memo = memoFor(w);
  const key = `${from}>${to}`;
  if (memo.dist.has(key)) return memo.dist.get(key)!;
  const open = w.map.lines.filter((l) => lineOpen(w, l));
  const best = new Map<string, { m: number; pts: XZ[] }>([[from, { m: 0, pts: [placeAt(w, from)] }]]);
  const done = new Set<string>();
  for (;;) {
    let at: string | null = null;
    for (const [id, v] of best) if (!done.has(id) && (at === null || v.m < best.get(at)!.m)) at = id;
    if (at === null) break;
    if (at === to) break;
    done.add(at);
    const here = best.get(at)!;
    for (const l of open) {
      const fwd = l.from === at ? l.to : l.to === at ? l.from : null;
      if (!fwd || done.has(fwd)) continue;
      const m = here.m + l.m;
      if (best.has(fwd) && best.get(fwd)!.m <= m) continue;
      best.set(fwd, { m, pts: [...here.pts, ...(l.from === at ? l.pts : [...l.pts].reverse())] });
    }
  }
  const out = best.get(to) ?? null;
  memo.dist.set(key, out);
  return out;
}

// ---------------------------------------------------------------- the economy at this moment
function memoFor(w: World) {
  const key = `${w.built.size}|${stageNow(w)}|${pickIndex(w)}|${w.goal}`;
  if (!w.memo || w.memo.key !== key) w.memo = { key, rates: null as unknown as Rates, dist: new Map() };
  return w.memo;
}
export function rates(w: World): Rates {
  const memo = memoFor(w);
  if (memo.rates) return memo.rates;
  const s = w.s;
  const ladder = (key: string) => {
    const l = LADDERS.find((x) => x.key === key)!;
    const k = RECIPES.filter((r) => r.ladder === key && w.built.has(r.id)).length;
    return l.steps[Math.min(3, k)]!;
  };
  const speed = ladder('speed'),
    wagon = ladder('wagon'),
    trains = ladder('trains'),
    carry = ladder('carry'),
    tool = ladder('tool');
  const bay = Math.max(0, ...STORAGE.filter((y) => w.built.has(y.id)).map((y) => y.bay));
  const level = zero(),
    rate = zero(),
    cap = zero(),
    km = zero(),
    freight = zero(),
    auto = zero(),
    hand = zero(),
    party = zero();
  for (const p of PRODUCERS) if (w.built.has(p.id) && p.level > level[p.res]) level[p.res] = p.level;
  const remote = (['S', 'Fi', 'U', 'X'] as Material[]).filter((m) => level[m] > 0).length;
  for (const m of MATERIALS) {
    const src = sourceOf(w, m);
    const path = src ? route(w, src, w.map.slots.home!) : null;
    km[m] = path ? path.m / 1000 : Infinity;
    const prod = level[m] ? PRODUCERS.find((p) => p.res === m && p.level === level[m])! : null;
    rate[m] = prod ? (w.override[m] ?? prod.rate) : 0;
    cap[m] = prod ? prod.cap + bay : 0;
    freight[m] = Number.isFinite(km[m]) ? freightRate(s, km[m], speed, wagon, trains, remote) : 0;
    auto[m] = Math.min(rate[m], freight[m]);
    const r = res(m);
    hand[m] =
      r.manual && Number.isFinite(km[m])
        ? (carry * 3600) / handTripS(s, r.harvestS, tool, carry, rideS(s, km[m], speed))
        : 0;
    party[m] = hand[m] * handFactor(s, w.n);
  }
  memo.rates = { speed, wagon, trains, carry, tool, bay, level, rate, cap, km, freight, auto, hand, party };
  return memo.rates;
}
/** Each player's share of the party's hands: little-guy helpers solo, contention at the frames in a group. */
export const handShare = (w: World) => handFactor(w.s, w.n) / w.n;
/** Units one player moves per load, helpers included. */
export const loadSize = (w: World) => Math.max(1, Math.round(rates(w).carry * handShare(w)));
export const travelS = (w: World, m: number) => (m === 0 ? 0 : rideS(w.s, m / 1000, rates(w).speed));

// ---------------------------------------------------------------- steps and their bills
type AnyRow = (typeof RECIPES)[number] | (typeof PRODUCERS)[number] | (typeof STORAGE)[number];
const rowsAt = (key: string, s: Settings) =>
  [
    ...PRODUCERS.map((r) => ({ r: r as AnyRow, kind: 'producer' as RowKind })),
    ...STORAGE.map((r) => ({ r: r as AnyRow, kind: 'yard' as RowKind })),
    ...RECIPES.map((r) => ({ r: r as AnyRow, kind: 'recipe' as RowKind })),
  ].filter(({ r }) => milestoneOf(r, s) === key);
const settingsWith = (w: World, extra: Partial<Record<Choice, string>> = {}): Settings => ({
  ...w.s,
  ...w.choice,
  ...extra,
});
/** Whether a step's rows or place depend on a choice nobody has made yet. */
export function choiceFor(w: World, key: string): Choice | null {
  const r = ROUTE.find((x) => x.key === key)!;
  for (const c of ['branchFirst', 'trainFirst'] as Choice[]) {
    if (w.choice[c]) continue;
    if (c === 'branchFirst' && (r.slot === 'b1' || r.slot === 'b2')) return c;
    const [a, b] = CHOICES[c].options.map((o) =>
      rowsAt(key, settingsWith(w, { [c]: o }))
        .map((x) => x.r.place + (x.r as { id: string }).id)
        .join(),
    );
    if (a !== b) return c;
  }
  return null;
}
const rowName = (x: { r: AnyRow; kind: RowKind }) => {
  if (x.kind === 'producer') {
    const p = x.r as (typeof PRODUCERS)[number];
    return `${NAMES[p.res]} works, level ${p.level} (${p.rate}/h)`;
  }
  if (x.kind === 'yard') return `Home Yard, level ${(x.r as (typeof STORAGE)[number]).level}`;
  return (x.r as (typeof RECIPES)[number]).name;
};
function makeStep(w: World, i: number): Step | null {
  const key = w.route[i]!;
  if (choiceFor(w, key)) return null;
  const r = ROUTE.find((x) => x.key === key)!;
  const place = placeOfSlot(w, r.slot)!;
  const back = RETURNS[key];
  const rows = rowsAt(key, settingsWith(w));
  // Upgrades first: an upgrade frees hands from the moment it's built.
  const order = (x: { r: AnyRow; kind: RowKind }) =>
    x.kind === 'recipe' ? ((x.r as (typeof RECIPES)[number]).ladder ? 1 : 2) : 0;
  rows.sort((a, b) => order(a) - order(b));
  return {
    i,
    key,
    name: r.name,
    slot: r.slot,
    place,
    stage: w.map.stepStage[key]!,
    jobs: rows.map((x) => ({
      id: (x.r as { id: string }).id,
      name: rowName(x),
      kind: x.kind,
      bill: { ...x.r.bill },
      got: {},
      done: false,
      effect: x.kind === 'recipe' ? (x.r as (typeof RECIPES)[number]).effect : (x.r as { look: string }).look,
    })),
    act: { place, needS: r.activityMin * 60, doneS: 0, what: r.note },
    back: back ? { place: placeOfSlot(w, back.slot)!, needS: back.activityMin * 60, doneS: 0, what: back.note } : null,
    startedAt: null,
    doneAt: null,
  };
}
export const step = (w: World) => w.steps[w.cur] ?? null;
export const actDone = (a: Activity | null) => !a || a.doneS >= a.needS - EPS;
const jobNeed = (j: Job, m: Material) => Math.max(0, (j.bill[m] ?? 0) - (j.got[m] ?? 0));
/** Units of `m` the current work still needs: the step's bill, or the end-game goal's. */
export function need(w: World, m: Material) {
  const st = step(w);
  if (st) return st.jobs.reduce((t, j) => t + jobNeed(j, m), 0);
  if (w.mainDoneAt === null) return 0; // waiting on a choice
  const g = GOALS[w.goal];
  return g ? Math.max(0, (g.bill[m] ?? 0) - (w.goalGot[m] ?? 0)) : 0;
}
/** What's already on its way: carried, queued to gather, or taken off the rack to place. */
export function inFlight(w: World, m: Material) {
  let n = 0;
  for (const p of w.players) {
    if (p.load?.m === m) n += p.load.n;
    for (const t of p.queue) if ((t.kind === 'gather' || t.kind === 'place') && t.m === m) n += t.n;
  }
  return n;
}
const open = (w: World, m: Material) => need(w, m) - inFlight(w, m);

function log(w: World, kind: string, text: string) {
  w.events.push({ t: w.t, kind, text });
}
const hours = (t: number) => `${(t / 3600).toFixed(2)} h`;

/** Into the current step's jobs in order; what nobody needs goes to the Home Yard. */
function deliver(w: World, m: Material, n: number) {
  const st = step(w);
  let left = n;
  if (st)
    for (const j of st.jobs) {
      const k = Math.min(left, jobNeed(j, m));
      if (k <= 0) continue;
      j.got[m] = (j.got[m] ?? 0) + k;
      left -= k;
    }
  if (left > EPS) toYard(w, m, left);
  settle(w);
}
/** A hand drop that no step needs: the seats being hauled for first (see the trade, below), then the Home Yard. */
function toYard(w: World, m: Material, n: number) {
  const j = w.trade?.job;
  if (j) {
    const k = Math.min(n, seatNeed(w, m));
    if (k > EPS) {
      j.got[m] = (j.got[m] ?? 0) + k;
      n -= k;
    }
  }
  if (n > EPS) stockpile(w, m, n);
  installSeats(w);
}
/** Into the yard up to its cap; past that it's sold to the town for the shared wallet. */
function stockpile(w: World, m: Material, n: number) {
  const cap = rates(w).cap[m];
  const room = Math.max(0, cap - w.yard[m]);
  const k = Math.min(room, n);
  w.yard[m] += k;
  const sold = n - k;
  if (sold > EPS) {
    w.wallet += sold * PRICES[m];
    w.sold += sold * PRICES[m];
  }
}
function produce(w: World, m: Material, n: number) {
  if (w.mainDoneAt !== null && GOALS[w.goal]) {
    const k = Math.min(n, need(w, m));
    w.goalGot[m] = (w.goalGot[m] ?? 0) + k;
    n -= k;
  }
  stockpile(w, m, n);
}
/** Marks finished jobs built (their upgrades apply now), then moves on when the step is done. */
function settle(w: World) {
  for (;;) {
    const st = step(w);
    if (!st) return;
    for (const j of st.jobs)
      if (!j.done && MATERIALS.every((m) => jobNeed(j, m) <= EPS)) {
        j.done = true;
        w.built.add(j.id);
        if (Object.keys(j.bill).length) log(w, 'built', `Built ${j.name}`);
      }
    if (!st.jobs.every((j) => j.done) || !actDone(st.act) || !actDone(st.back)) return;
    st.doneAt = w.t;
    log(w, 'step', `Done: ${st.name} (${placeName(w, st.place)}), ${hours(w.t)}`);
    w.cur++;
    if (w.cur >= w.route.length) {
      w.mainDoneAt = w.t;
      w.mainUse = w.players.map((p) => ({ ...p.time }));
      log(w, 'end', `The Original Island: the main game ends at ${hours(w.t)}`);
      return;
    }
    if (!begin(w)) return;
  }
}
/** Starts the current step, or pauses for its choice. */
function begin(w: World): boolean {
  const key = w.route[w.cur]!;
  const c = choiceFor(w, key);
  if (c) {
    w.pending = c;
    return false;
  }
  if (!w.steps[w.cur]) w.steps[w.cur] = makeStep(w, w.cur)!;
  const st = w.steps[w.cur]!;
  st.startedAt = w.t;
  log(w, 'start', `Next: ${st.name} at ${placeName(w, st.place)}`);
  return true;
}
export function choose(w: World, c: Choice, option: string) {
  if (!CHOICES[c].options.includes(option)) throw new Error(`${option} isn't a ${c} option`);
  w.choice[c] = option;
  w.memo = null;
  log(w, 'choice', `Chose ${CHOICES[c].names[CHOICES[c].options.indexOf(option)]}`);
  if (w.pending === c) {
    w.pending = null;
    if (begin(w)) settle(w);
  }
}

// ---------------------------------------------------------------- what a player can do
const travelTask = (w: World, from: string, to: string, use: Use): Task | null => {
  const p = route(w, from, to);
  if (!p) return null;
  const s = travelS(w, p.m);
  return { kind: 'travel', to, use, left: s, total: s, pts: p.pts };
};
/** Where the player will be once its queue has run. */
const endsAt = (p: Player) => {
  let at = p.at;
  for (const t of p.queue) if (t.kind === 'travel') at = t.to;
  return at;
};
function gatherPlan(w: World, p: Player, m: Material, n: number, dest?: string): Task[] | null {
  const src = sourceOf(w, m);
  const st = step(w);
  const site = dest ?? (st ? st.place : w.map.slots.home!);
  if (!src || !placeOpen(w, src)) return null;
  const go = travelTask(w, endsAt(p), src, 'haul');
  const back = travelTask(w, src, site, 'haul');
  if (!go || !back) return null;
  const r = rates(w);
  const g = res(m);
  // ring-sim's hand load: harvest and pick-up, and the walk out to the patch and back (localM each way).
  const s = handTripS(w.s, g.harvestS, r.tool, n, g.localM / num(w.s, 'walkMps')) / handShare(w);
  return [go, { kind: 'gather', m, n, left: s, total: s }, back, { kind: 'drop' }];
}
function placePlan(w: World, p: Player, m: Material, n: number): Task[] | null {
  const st = step(w);
  if (!st) return null;
  const go = travelTask(w, endsAt(p), st.place, 'haul');
  if (!go) return null;
  w.yard[m] -= n; // off the rack now, so nobody else takes it
  const s = (n * num(w.s, 'lastCarryS')) / handShare(w);
  return [go, { kind: 'place', m, n, left: s, total: s }];
}
function explorePlan(w: World, p: Player, a: Activity, use: Use = 'explore'): Task[] | null {
  if (actDone(a) || !placeOpen(w, a.place)) return null;
  const go = travelTask(w, endsAt(p), a.place, use);
  return go ? [go, { kind: 'explore', act: a, left: 120 }] : null;
}
/** The activities open to a player now: this step's, its return, then the next step's while machines work. */
export function activities(w: World): Activity[] {
  const st = step(w);
  if (!st) return [];
  const out = [st.act, ...(st.back ? [st.back] : [])];
  if (w.cur + 1 < w.route.length) {
    if (!w.steps[w.cur + 1]) {
      const next = makeStep(w, w.cur + 1);
      if (next) w.steps[w.cur + 1] = next;
    }
    const next = w.steps[w.cur + 1];
    if (next) out.push(next.act, ...(next.back ? [next.back] : []));
  }
  return out.filter((a) => !actDone(a) && placeOpen(w, a.place) && route(w, w.map.slots.home!, a.place));
}

/** Names an activity by its role: this step's place, a return to an earlier one, or the next step scouted early. */
export function activityLabel(w: World, a: Activity) {
  const st = step(w);
  const next = w.steps[w.cur + 1];
  if (st && a === st.act) return `Explore ${placeName(w, a.place)}`;
  if (st && a === st.back) return `Return to ${placeName(w, a.place)}`;
  if (next && a === next.act) return `Explore ahead: ${next.name}`;
  if (next && a === next.back) return `Return ahead to ${placeName(w, a.place)}`;
  return 'Explore';
}

/** The bot: carry what you hold to where it's needed, place stock, haul by hand, explore, else wait. */
export function decide(w: World, p: Player): Task[] {
  const st = step(w);
  const site = st ? st.place : w.map.slots.home!;
  if (p.load) {
    const to = need(w, p.load.m) > 0 ? site : w.map.slots.home!;
    const go = travelTask(w, p.at, to, 'haul');
    if (go) return [go, { kind: 'drop' }];
  }
  const r = rates(w);
  const load = loadSize(w);
  const wanted = MATERIALS.filter((m) => open(w, m) > EPS);
  const placing = (): Task[] | null => {
    if (!st) return null;
    for (const m of wanted) {
      const k = Math.min(open(w, m), Math.floor(w.yard[m] + EPS));
      // A load's worth, all that's still needed or a full rack: not one unit at a time as it trickles in.
      if (k >= 1 && k >= Math.min(open(w, m), load, Math.floor(r.cap[m]))) return placePlan(w, p, m, k);
    }
    return null;
  };
  const hauling = (): Task[] | null => {
    if (!st) return null;
    for (const m of wanted) {
      if (!res(m).manual) continue;
      const left = open(w, m) - w.yard[m];
      if (left <= EPS) continue;
      if (r.auto[m] > 0) {
        if (w.policy === 'model') continue;
        // Eager: haul by hand only when the machines would take longer than one load's round trip.
        const plan = gatherPlan(w, p, m, Math.min(load, Math.ceil(left)));
        const tripS = plan ? plan.reduce((t, x) => t + ('total' in x ? x.total : 0), 0) : Infinity;
        if ((left / r.auto[m]) * 3600 <= tripS) continue;
        if (plan) return plan;
        continue;
      }
      const plan = gatherPlan(w, p, m, Math.min(load, Math.ceil(left)));
      if (plan) return plan;
    }
    return null;
  };
  // Hauling for the seats a crowd asked for comes first, as the trade model puts it ahead of the route.
  const seating = (): Task[] | null => {
    for (const m of MATERIALS) {
      if (!res(m).manual || seatOpen(w, m) - w.yard[m] <= EPS) continue;
      if (r.auto[m] > 0 && w.policy === 'model') continue;
      const plan = gatherPlan(w, p, m, Math.min(load, Math.ceil(seatOpen(w, m) - w.yard[m])), w.map.slots.home!);
      if (plan) return plan;
    }
    return null;
  };
  const acts = activities(w);
  const exploring = (ahead: boolean): Task[] | null => {
    for (const a of acts) {
      const isAhead = !st || (a !== st.act && a !== st.back);
      if (isAhead !== ahead) continue;
      const plan = explorePlan(w, p, a);
      if (plan) return plan;
    }
    return null;
  };
  // In a group the first player leads the exploring while the others haul; solo, hands first, then explore while
  // the machines fill the yard.
  const order =
    w.n > 1 && p.id === 0
      ? [() => exploring(false), placing, hauling, () => exploring(true)]
      : [placing, hauling, () => exploring(false), () => exploring(true)];
  if (w.trade?.job) order.unshift(seating);
  for (const f of order) {
    const plan = f();
    if (plan) return plan;
  }
  return [{ kind: 'wait', left: 10 }];
}

// ---------------------------------------------------------------- commands (the page's buttons and keys)
export type Action = { id: string; label: string; run: () => void };
const setQueue = (p: Player, q: Task[]) => {
  p.queue = q;
};
export function goTo(w: World, pid: number, to: string): string | null {
  const p = w.players[pid]!;
  dropQueue(w, p);
  if (!placeOpen(w, to)) return `${placeName(w, to)} isn't reachable yet`;
  const st = step(w);
  const exploring = activities(w).some((a) => a.place === to);
  const sourcing = MATERIALS.some((m) => sourceOf(w, m) === to && (open(w, m) > 0 || seatOpen(w, m) > 0));
  const use: Use = p.load || (st && to === st.place && !exploring) || sourcing ? 'haul' : 'explore';
  const t = travelTask(w, p.at, to, use);
  if (!t) return `No line to ${placeName(w, to)} yet`;
  setQueue(p, [t]);
  return null;
}
/** Cancelling a queue returns what it had reserved. */
function dropQueue(w: World, p: Player) {
  for (const t of p.queue) if (t.kind === 'place') w.yard[t.m] += t.n;
  p.queue = [];
}
export function actionsFor(w: World, pid: number): Action[] {
  const p = w.players[pid]!;
  // Busy hands (on the move, gathering, placing) finish first; exploring or waiting can switch.
  const busy = p.queue[0]?.kind;
  if (busy === 'travel' || busy === 'gather' || busy === 'place') return [];
  const out: Action[] = [];
  const st = step(w);
  const here = p.at;
  const load = loadSize(w);
  if (p.load) {
    const target = st && here === st.place && need(w, p.load.m) > 0;
    if (target || here === w.map.slots.home)
      out.push({
        id: 'drop',
        label: target ? `Deliver ${p.load.n} ${NAMES[p.load.m]}` : `Stack ${p.load.n} ${NAMES[p.load.m]} in the yard`,
        run: () => setQueue(p, [{ kind: 'drop' }]),
      });
  } else {
    for (const m of MATERIALS) {
      if (!res(m).manual || sourceOf(w, m) !== here || open(w, m) <= EPS) continue;
      const n = Math.min(load, Math.ceil(open(w, m)));
      const plan = gatherPlan(w, p, m, n);
      if (plan)
        out.push({ id: `gather-${m}`, label: `Gather ${n} ${NAMES[m]}`, run: () => setQueue(p, plan.slice(1, 2)) });
    }
    // Hauling for the seats a crowd asked for: carry it to Home, where it is stacked and installed.
    for (const m of MATERIALS) {
      if (!res(m).manual || sourceOf(w, m) !== here || open(w, m) > EPS || seatOpen(w, m) <= EPS) continue;
      const n = Math.min(load, Math.ceil(seatOpen(w, m)));
      const plan = gatherPlan(w, p, m, n, w.map.slots.home!);
      if (plan)
        out.push({
          id: `gather-seat-${m}`,
          label: `Gather ${n} ${NAMES[m]} for the seats`,
          run: () => setQueue(p, plan.slice(1, 2)),
        });
    }
  }
  if (st && here === st.place)
    for (const m of MATERIALS) {
      const k = Math.min(Math.max(0, open(w, m)), Math.floor(w.yard[m] + EPS));
      if (k >= 1)
        out.push({
          id: `place-${m}`,
          label: `Place ${k} ${NAMES[m]} from the yard`,
          run: () => setQueue(p, placePlan(w, p, m, k)!.slice(1)),
        });
    }
  for (const a of activities(w))
    if (a.place === here)
      out.push({
        id: `explore-${w.steps.findIndex((s) => s?.act === a || s?.back === a)}`,
        label: `${activityLabel(w, a)} (${Math.ceil((a.needS - a.doneS) / 60)} min left)`,
        run: () => setQueue(p, [{ kind: 'explore', act: a, left: Infinity }]),
      });
  return out;
}

// ---------------------------------------------------------------- the passenger trade
// play-trade.ts holds the state and calls trade-model.ts's rules; this is where the world meets it: the route's finished
// steps open the towns, a minute of play is a minute of riding, and seats are hauled for by the players.
/** Which route steps are finished, as the trade model's rules ask it. */
export const stepDone =
  (w: World): StepDone =>
  (key) =>
    key === 'end' ? w.mainDoneAt !== null : w.steps.some((s) => s?.key === key && s.doneAt !== null);
/** The map place a town sits at: the Village is a stop by Home; the branch towns are whichever branch came first or second. */
export function townPlace(w: World, tw: Town): string | null {
  if (tw === 'village') return w.map.slots.home!;
  if (tw === 'canopy') return placeOfSlot(w, 'b1');
  if (tw === 'gorge') return placeOfSlot(w, 'b2');
  return tw === 'ring' ? w.map.slots.ring! : (w.map.places.find((p) => p.id === 'quay')?.id ?? null);
}
/** Where a town is drawn: the Village a little way from Home, the rest at their places. */
export function townAt(w: World, tw: Town): XZ | null {
  const p = townPlace(w, tw);
  if (!p) return null;
  const at = placeAt(w, p);
  return tw === 'village' ? [at[0] - 330, at[1] + 230] : at;
}
export const townLabel = (w: World, tw: Town) => {
  const p = townPlace(w, tw);
  return tw === 'village' || !p ? townName(tw) : placeName(w, p);
};
/** What the seats being hauled for still need of a material. */
export function seatNeed(w: World, m: Material) {
  const j = w.trade?.job;
  return j ? Math.max(0, (j.bill[m] ?? 0) - (j.got[m] ?? 0)) : 0;
}
/** The seat need nobody carries or is on the way to gather: a load beyond what the step wants counts for the seats. */
export function seatOpen(w: World, m: Material) {
  const n = seatNeed(w, m);
  return n <= EPS ? 0 : Math.max(0, n - Math.max(0, inFlight(w, m) - need(w, m)));
}
/** Materials the seats are waiting on that nobody can fetch yet: their source isn't on the line (or no hand can gather them). */
export function seatBlockers(w: World): Material[] {
  return MATERIALS.filter((m) => {
    if (seatNeed(w, m) <= EPS || w.yard[m] >= seatNeed(w, m)) return false;
    const src = sourceOf(w, m);
    return !res(m).manual || !src || !placeOpen(w, src);
  });
}
/** Installs the seats once the bill is in, from what was hauled for them and any stock the machines stacked at Home. */
function installSeats(w: World) {
  const tr = w.trade;
  const j = tr?.job;
  if (!tr || !j) return;
  const mats = Object.keys(j.bill) as Material[];
  for (const m of mats) if ((j.got[m] ?? 0) + Math.floor(w.yard[m] + EPS) + EPS < j.bill[m]!) return;
  for (const m of mats) {
    const take = Math.min(Math.max(0, j.bill[m]! - (j.got[m] ?? 0)), Math.floor(w.yard[m] + EPS));
    w.yard[m] -= take;
    j.got[m] = j.bill[m]!;
  }
  const done = finishSeatJob(tr);
  if (done) log(w, 'trade', `Seats installed at ${townLabel(w, done.town)} (${done.step}); the Boogles didn't move`);
}
function tradeClock(w: World, dt: number) {
  const tr = w.trade!;
  const done = stepDone(w);
  if (!tr.started) {
    if (!done(ARRIVES.village)) return;
    tr.started = true;
    tr.secs = 0;
    log(w, 'trade', 'The Village line is open: the first riders come in a minute');
  }
  tr.secs += dt;
  while (tr.secs >= 60) {
    tr.secs -= 60;
    tradeMinute(w, done);
  }
  installSeats(w);
}
function tradeMinute(w: World, done: StepDone) {
  const tr = w.trade!;
  const open = TOWNS.filter((tw) => tr.rt[tw].open);
  const crowded = TOWNS.filter((tw) => isCrowd(tr, tw));
  const houses = TOWNS.map((tw) => tr.rt[tw].houses);
  const full = tr.minute > 0 && tr.wallet >= tr.cap - 1e-6;
  tradeStep(tr, done);
  TOWNS.forEach((tw, i) => {
    if (tr.rt[tw].open && !open.includes(tw)) log(w, 'trade', `Riders start coming at ${townLabel(w, tw)}`);
    if (tr.rt[tw].houses > houses[i]!) log(w, 'trade', `A new house stands at ${townLabel(w, tw)}: more riders`);
    if (isCrowd(tr, tw) && !crowded.includes(tw))
      log(w, 'trade', `A crowd of ${tr.rt[tw].waiting} waits at ${townLabel(w, tw)}: the train stops there`);
  });
  if (!full && tr.wallet >= tr.cap - 1e-6)
    log(w, 'trade', `The strongbox is full at ${Math.round(tr.cap)}: fares stop landing`);
  const had = tr.job;
  const job = startSeatJob(tr);
  if (job && !had)
    log(w, 'trade', `The crowd at ${townLabel(w, job.town)} asks for seats (${job.step}): haul the bill`);
  if (w.tradeAutoBuy) autoBuy(w, done);
}
/** The bots' buying, as the model's house room: the cheapest house, building or fit-out on offer, saving for it. */
function autoBuy(w: World, done: StepDone) {
  const tr = w.trade!;
  for (;;) {
    const groups =
      tr.seats === 'boogles' ? [['seat'], ['house', 'building', 'fitout']] : [['house', 'building', 'fitout']];
    let pick: string | null = null;
    for (const kinds of groups) {
      const c = offered(tr, done)
        .filter((it) => kinds.includes(it.kind) && (it.kind !== 'seat' || isCrowd(tr, it.town!)))
        .sort((a, b) => a.price - b.price || (a.id < b.id ? -1 : 1))[0];
      if (!c) continue;
      if (c.price <= tr.wallet) pick = c.id;
      break;
    }
    if (!pick || buyItem(w, pick)) return;
  }
}
/** Spends Boogles from the strongbox on something on offer; returns why not, or null when bought. */
export function buyItem(w: World, id: string): string | null {
  const tr = w.trade;
  if (!tr) return 'The trade is off in this run';
  const it = tr.items.find((x) => x.id === id);
  const err = buyTrade(tr, stepDone(w), id);
  if (!err && it) log(w, 'trade', `Bought ${it.label} for ${it.price.toLocaleString('en')} Boogles`);
  return err;
}

// ---------------------------------------------------------------- the clock
export function createWorld(map: PlayMap, o: Options): World {
  const s = { ...defaultSettings(), ...o.settings };
  // Steps in the map's stage order (stable within a stage).
  const routeKeys = ROUTE.map((r, k) => ({ key: r.key, k }))
    .sort((a, b) => map.stepStage[a.key]! - map.stepStage[b.key]! || a.k - b.k)
    .map((x) => x.key);
  const w: World = {
    map,
    s,
    n: o.players,
    policy: o.policy ?? 'model',
    t: 0,
    sittingT: 0,
    sittings: o.sittings ?? true,
    sitting: 1,
    choice: {
      ...(o.branchFirst ? { branchFirst: o.branchFirst } : {}),
      ...(o.trainFirst ? { trainFirst: o.trainFirst } : {}),
    },
    pending: null,
    route: routeKeys,
    steps: [],
    cur: 0,
    built: new Set(),
    yard: zero(),
    wallet: 0,
    sold: 0,
    goal: 0,
    goalGot: {},
    override: {},
    players: Array.from({ length: o.players }, (_, id) => ({
      id,
      at: map.slots.home!,
      queue: [],
      load: null,
      auto: o.auto?.[id] ?? true,
      time: { haul: 0, explore: 0, wait: 0 },
      doing: 'Starting out',
    })),
    events: [],
    samples: [],
    crossed: new Set(),
    mainDoneAt: null,
    mainUse: null,
    done: false,
    trade: o.trade ? createTrade(o.trade.seats, { seed: o.trade.seed }) : null,
    tradeAutoBuy: o.trade?.autoBuy ?? false,
    memo: null,
  };
  log(w, 'start', `${o.players} player${o.players > 1 ? 's' : ''} on ${map.name}`);
  if (begin(w)) settle(w);
  return w;
}
const describe = (w: World, t: Task | undefined, p: Player) => {
  if (!t) return p.auto ? 'Thinking' : 'Idle: pick a place or an action';
  switch (t.kind) {
    case 'travel':
      return `${t.use === 'haul' ? (p.load ? `Carrying ${p.load.n} ${NAMES[p.load.m]}` : 'Heading out to haul') : 'Heading out to explore'} → ${placeName(w, t.to)}`;
    case 'gather':
      return `Gathering ${t.n} ${NAMES[t.m]}`;
    case 'place':
      return `Placing ${t.n} ${NAMES[t.m]} from the yard`;
    case 'explore':
      return activityLabel(w, t.act);
    case 'wait':
      return 'Waiting: nothing to do until the machines catch up';
    case 'drop':
      return 'Dropping the load';
  }
};
/** Advances the world `dt` seconds of play (1 s steps keep every task honest). */
export function tick(w: World, dt = 1) {
  if (w.pending || w.done) return;
  w.t += dt;
  w.sittingT += dt;
  const r = rates(w);
  for (const m of MATERIALS) if (r.auto[m] > 0) produce(w, m, (r.auto[m] * dt) / 3600);
  const explorers = new Map<Activity, number>();
  for (const p of w.players) {
    // Instant tasks (a drop) don't use the clock; run them and pick the next.
    for (let guard = 0; guard < 8; guard++) {
      if (!p.queue.length && p.auto) p.queue = decide(w, p);
      const t = p.queue[0];
      if (t?.kind !== 'drop') break;
      p.queue.shift();
      if (p.load) {
        const atSite = step(w)?.place === p.at;
        if (atSite) deliver(w, p.load.m, p.load.n);
        else toYard(w, p.load.m, p.load.n);
        p.load = null;
      }
    }
    const t = p.queue[0];
    p.doing = describe(w, t, p);
    if (!t) {
      p.time.wait += dt;
      continue;
    }
    switch (t.kind) {
      case 'travel':
        p.time[t.use] += dt;
        t.left -= dt;
        if (t.left <= 0) {
          p.at = t.to;
          p.queue.shift();
        }
        break;
      case 'gather':
        p.time.haul += dt;
        t.left -= dt;
        if (t.left <= 0) {
          p.load = { m: t.m, n: t.n };
          p.queue.shift();
        }
        break;
      case 'place':
        p.time.haul += dt;
        t.left -= dt;
        if (t.left <= 0) {
          p.queue.shift();
          deliver(w, t.m, t.n);
        }
        break;
      case 'explore':
        if (actDone(t.act) || t.act.place !== p.at) {
          p.queue.shift();
          p.time.wait += dt;
          break;
        }
        p.time.explore += dt;
        explorers.set(t.act, (explorers.get(t.act) ?? 0) + 1);
        t.left -= dt;
        if (t.left <= 0) p.queue.shift();
        break;
      case 'wait':
        p.time.wait += dt;
        t.left -= dt;
        if (t.left <= 0) p.queue.shift();
        break;
    }
  }
  // Exploring together is only a little faster (ring-data activityParallel): one lever, one gantry.
  for (const [a, k] of explorers)
    a.doneS = Math.min(a.needS, a.doneS + dt * (1 + (k - 1) * num(w.s, 'activityParallel')));
  if (explorers.size) settle(w);
  for (const p of w.players) {
    const t = p.queue[0];
    if (t?.kind === 'explore' && actDone(t.act)) p.queue.shift();
  }
  // Crossovers: the first moment a machine out-delivers the party's hands for its material.
  const now = rates(w);
  for (const m of MATERIALS)
    if (!w.crossed.has(m) && now.auto[m] > 0 && now.party[m] > 0 && now.auto[m] >= now.party[m]) {
      w.crossed.add(m);
      log(
        w,
        'crossover',
        `Machines overtake hands: ${NAMES[m]}, ${Math.round(now.auto[m])}/h against ${Math.round(now.party[m])}/h by hand`,
      );
    }
  if (w.trade) tradeClock(w, dt);
  if (w.mainDoneAt !== null) endgame(w);
  if (w.sittings && w.sittingT >= num(w.s, 'sessionHours') * 3600 && !w.done) leave(w, num(w.s, 'awayHours'));
  if (Math.floor(w.t / 60) !== Math.floor((w.t - dt) / 60)) sample(w);
}
function endgame(w: World) {
  const g = GOALS[w.goal];
  if (!g) {
    if (!w.done) {
      w.done = true;
      log(w, 'end', `Every end-game goal bought at ${hours(w.t)}`);
    }
    return;
  }
  const ready = MATERIALS.every((m) => need(w, m) <= EPS);
  if (ready && w.wallet >= g.bucks && w.players.some((p) => p.auto)) buyGoal(w);
}
/** Spends the shared wallet on the next end-game goal once its materials are in. */
export function buyGoal(w: World): string | null {
  const g = GOALS[w.goal];
  if (!g || w.mainDoneAt === null) return 'Goals open after the ending';
  if (!MATERIALS.every((m) => need(w, m) <= EPS)) return 'Its materials are still coming in';
  if (w.wallet < g.bucks) return `Needs ${Math.ceil(g.bucks - w.wallet)} more Bucks`;
  w.wallet -= g.bucks;
  for (const [m, v] of Object.entries(g.rates ?? {})) w.override[m as Material] = v;
  w.goal++;
  w.goalGot = {};
  w.memo = null;
  log(w, 'goal', `Bought ${g.name} for ${g.bucks} Bucks`);
  return null;
}
/** Ends the sitting: the world pauses, and the next join credits each producer's yard once (capped). */
export function leave(w: World, awayH: number) {
  const r = rates(w);
  const credit = awayCredit(w.s, awayH);
  let total = 0;
  for (const m of MATERIALS) {
    if (r.auto[m] <= 0) continue;
    const k = Math.max(0, Math.min(r.cap[m] - w.yard[m], r.auto[m] * credit));
    w.yard[m] += k;
    total += k;
  }
  w.sittingT = 0;
  w.sitting++;
  if (w.trade) {
    const fares = awayBoogles(w.trade, stepDone(w), awayH);
    if (fares > 0)
      log(w, 'trade', `The ticket window held ${Math.round(fares)} Boogles of fares for the night, one capped sack`);
  }
  log(
    w,
    'away',
    `Sitting ${w.sitting - 1} ends; ${awayH} h away, the world paused. Rejoining credits ${credit.toFixed(2)} h of output: ${Math.round(total)} units into the yards`,
  );
}
function sample(w: World) {
  w.samples.push({
    t: w.t,
    step: w.cur,
    wallet: Math.round(w.wallet),
    yard: MATERIALS.map((m) => Math.round(w.yard[m])),
    use: w.players.map((p) => USES.map((u) => Math.round(p.time[u]))),
  });
}
/** Where a player is drawn: along its ride, out at the patch while gathering, or at its place. */
export function playerPos(w: World, p: Player): XZ {
  const t = p.queue[0];
  const at = placeAt(w, p.at);
  const spread = (k: number): XZ => [at[0] + Math.cos(p.id * 2.1 + k) * 26, at[1] + Math.sin(p.id * 2.1 + k) * 26];
  if (t?.kind === 'travel' && t.pts.length > 1) {
    const f = t.total > 0 ? 1 - Math.max(0, t.left) / t.total : 1;
    let len = 0;
    const seg: number[] = [];
    for (let i = 1; i < t.pts.length; i++) {
      const d = Math.hypot(t.pts[i]![0] - t.pts[i - 1]![0], t.pts[i]![1] - t.pts[i - 1]![1]);
      seg.push(d);
      len += d;
    }
    let goal = f * len;
    for (let i = 0; i < seg.length; i++) {
      if (goal <= seg[i]! || i === seg.length - 1) {
        const k = seg[i]! ? Math.min(1, goal / seg[i]!) : 1;
        const a = t.pts[i]!,
          b = t.pts[i + 1]!;
        return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k];
      }
      goal -= seg[i]!;
    }
  }
  if (t?.kind === 'gather') {
    const k = 1 - Math.abs(1 - 2 * (1 - t.left / t.total));
    const out = 30 + Math.min(120, res(t.m).localM) * k;
    return [at[0] + Math.cos(p.id * 2.1 + 1) * out, at[1] + Math.sin(p.id * 2.1 + 1) * out];
  }
  return spread(0);
}

// ---------------------------------------------------------------- whole runs, headless
export type RunSummary = {
  players: number;
  policy: Policy;
  branchFirst: string;
  trainFirst: string;
  mainH: number;
  endH: number | null;
  use: Record<Use, number>[];
  sittings: number;
  wallet: number;
  crossovers: { m: Material; h: number }[];
  steps: { key: string; name: string; startH: number; endH: number }[];
};
export function summarize(w: World): RunSummary {
  const at = (key: string) => w.events.find((e) => e.kind === 'crossover' && e.text.includes(key));
  return {
    players: w.n,
    policy: w.policy,
    branchFirst: w.choice.branchFirst ?? '',
    trainFirst: w.choice.trainFirst ?? '',
    mainH: (w.mainDoneAt ?? w.t) / 3600,
    endH: w.done ? w.t / 3600 : null,
    // The main game's split (to the ending), not the end-game's waiting for goals.
    use: (w.mainUse ?? w.players.map((p) => p.time)).map(
      (t) => Object.fromEntries(USES.map((u) => [u, t[u] / 3600])) as Record<Use, number>,
    ),
    sittings: w.sitting,
    wallet: w.wallet,
    crossovers: MATERIALS.filter((m) => w.crossed.has(m)).map((m) => ({ m, h: at(`${NAMES[m]},`)!.t / 3600 })),
    steps: w.steps.map((s) => ({
      key: s.key,
      name: s.name,
      startH: (s.startedAt ?? 0) / 3600,
      endH: (s.doneAt ?? w.t) / 3600,
    })),
  };
}
/** Plays a whole run with every player on the bot, taking ring-data's default for any choice not preset. */
export function runWhole(map: PlayMap, o: Options & { endgame?: boolean; dt?: number; limitH?: number }) {
  const w = createWorld(map, { ...o, auto: Array.from({ length: o.players }, () => true) });
  const limit = (o.limitH ?? 60) * 3600;
  while (!(o.endgame ? w.done : w.mainDoneAt !== null)) {
    if (w.pending) choose(w, w.pending, String(w.s[w.pending]));
    tick(w, o.dt ?? 1);
    if (w.t > limit) throw new Error(`run stalled at ${hours(w.t)} on ${step(w)?.key ?? `goal ${w.goal}`}`);
  }
  return { world: w, summary: summarize(w) };
}
/** One timeline as CSV: a row a minute, with each player's running hauling, exploring and waiting minutes. */
export function timelineCsv(w: World) {
  const head = ['minute', 'step', 'wallet', ...MATERIALS.map((m) => `yard_${m}`)];
  for (const p of w.players) for (const u of USES) head.push(`p${p.id + 1}_${u}_min`);
  const rows = w.samples.map((s) =>
    [
      Math.round(s.t / 60),
      w.route[s.step] ?? 'endgame',
      s.wallet,
      ...s.yard,
      ...s.use.flatMap((u) => u.map((x) => (x / 60).toFixed(1))),
    ].join(','),
  );
  return [head.join(','), ...rows].join('\n');
}

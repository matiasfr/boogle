// The ring economy's pacing, computed exactly as the spreadsheet formulas do (build-model.ts writes both).
// Offline design arithmetic only: no lockstep, no game imports. Keep every rule here in step with its formula.
import {
  BRANCHES,
  LADDERS,
  MATERIALS,
  PLACES,
  PRODUCERS,
  RECIPES,
  RESOURCES,
  ROUTE,
  SETTINGS,
  STORAGE,
  type Bill,
  type Branch,
  type Material,
} from './ring-data.ts';

export const NEVER = 999;
export type Settings = Record<string, number | string>;
export const defaultSettings = (): Settings => Object.fromEntries(SETTINGS.map((s) => [s.key, s.value]));
const num = (s: Settings, key: string) => Number(s[key]);

export const isBranch = (place: string): place is Branch => (BRANCHES as readonly string[]).includes(place);
export const otherBranch = (b: Branch): Branch => (b === 'canopy' ? 'gorge' : 'canopy');
/** A branch-tagged row uses its second-visit milestone when its branch is not the one chosen first. */
export const milestoneOf = (row: { place: string; first: string; second?: string }, first: Branch) =>
  isBranch(row.place) && row.place !== first ? (row.second ?? row.first) : row.first;
export const orderOf = (key: string) => {
  const i = ROUTE.findIndex((r) => r.key === key);
  return i < 0 ? NEVER : i + 1;
};
export const slotOfSource = (source: string, first: Branch) =>
  source.startsWith('branch:') ? (source.slice(7) === first ? 'b1' : 'b2') : source;
export const placeName = (slot: string, first: Branch) => {
  const name = (b: Branch) => (b === 'canopy' ? 'Canopy Town' : 'High Gorge');
  if (slot === 'b1') return name(first);
  if (slot === 'b2') return name(otherBranch(first));
  return PLACES.find((p) => p.slot === slot)!.name;
};
const billAt = (bill: Bill, m: Material) => bill[m] ?? 0;

/** Kilometres from the Home Yard to a slot once route step `i` begins: spokes and the loop count once built before it. */
export function kmFrom(slot: string, i: number) {
  const p = PLACES.find((x) => x.slot === slot)!;
  return Math.min(
    orderOf('spoke1') < i ? p.kmSpoke1 : p.kmBefore,
    orderOf('ring.close') < i ? p.kmClosed : NEVER,
    orderOf(p.ownSpoke) < i ? p.kmOwnSpoke : NEVER,
  );
}

export type StepFlow = {
  material: Material;
  demand: number;
  level: number;
  producerRate: number;
  cap: number;
  km: number;
  freight: number;
  auto: number;
  manual: number; // one player by hand to the Home Yard, units/hour
  hand: number;
  stock: number;
  labourS: number;
  ahead: boolean;
  crew: number;
  start: [number, number];
  wait: [number, number];
  end: [number, number];
};
export type StepPace = {
  act: number;
  labour: number;
  travel: number;
  work: number;
  wait: number;
  dur: number;
  start: number;
  end: number;
  breaks: number;
  limiting: string;
};
export type StepResult = {
  order: number;
  key: string;
  name: string;
  slot: string;
  place: string;
  km: number;
  speed: number;
  wagon: number;
  trains: number;
  carry: number;
  tool: number;
  rideS: number;
  remote: number;
  flows: StepFlow[];
  pace: [StepPace, StepPace];
};
export type Result = { first: Branch; players: [number, number]; steps: StepResult[]; settings: Settings };

export function simulate(overrides: Settings = {}, players: [number, number] = [1, 4]): Result {
  const s = { ...defaultSettings(), ...overrides };
  const first = s.branchFirst as Branch;
  const ladder = (key: string, i: number) => {
    const l = LADDERS.find((x) => x.key === key)!;
    const n = RECIPES.filter((r) => r.ladder === key && orderOf(milestoneOf(r, first)) <= i).length;
    return l.steps[Math.min(3, n)]!;
  };
  const level = (m: Material, i: number) =>
    PRODUCERS.filter((p) => p.res === m && orderOf(milestoneOf(p, first)) <= i).length;
  const yard = (i: number) => {
    const lvl = STORAGE.filter((y) => orderOf(milestoneOf(y, first)) <= i).length;
    return lvl ? STORAGE.find((y) => y.level === lvl)!.bay : 0;
  };
  const walk = num(s, 'walkMps'),
    limit = num(s, 'walkLimitKm'),
    accel = num(s, 'accel'),
    dwell = num(s, 'dwellS');
  const ride = (km: number, v: number, wait: number) =>
    km < limit ? (km * 1000) / walk : (km * 1000) / v + v / accel + dwell + wait;
  const steps: StepResult[] = [];
  ROUTE.forEach((r, k) => {
    const i = k + 1;
    const speed = ladder('speed', i),
      wagon = ladder('wagon', i),
      trains = ladder('trains', i),
      carry = ladder('carry', i),
      tool = ladder('tool', i);
    const km = kmFrom(r.slot, i);
    const rideS = ride(km, speed, num(s, 'boardWaitS'));
    const remote = (['S', 'Fi', 'U', 'X'] as Material[]).filter((m) => level(m, i) > 0).length;
    const flows = MATERIALS.map((m): StepFlow => {
      const res = RESOURCES.find((x) => x.id === m)!;
      const demand = [...RECIPES, ...PRODUCERS, ...STORAGE]
        .filter((row) => orderOf(milestoneOf(row, first)) === i)
        .reduce((n, row) => n + billAt(row.bill, m), 0);
      const lvl = level(m, i);
      const prod = lvl ? PRODUCERS.find((p) => p.res === m && p.level === lvl)! : null;
      const producerRate = prod?.rate ?? 0;
      const cap = prod ? prod.cap + yard(i) : 0;
      const srcKm = kmFrom(slotOfSource(res.source, first), i);
      const freight =
        srcKm < limit
          ? 1e9
          : (wagon * trains * 3600) /
            (2 * ((srcKm * 1000) / speed + speed / accel + dwell) + 2 * num(s, 'transferS')) /
            Math.max(1, remote);
      const auto = Math.min(producerRate, freight);
      const per = (local: number) => res.harvestS * tool * carry + num(s, 'pickupS') + 2 * local;
      const manual = res.manual ? (carry * 3600) / per(ride(srcKm, speed, num(s, 'boardWaitS'))) : 0;
      const hand = auto === 0 ? demand : 0;
      const stock = demand - hand;
      if (hand && !res.manual) throw new Error(`${r.key}: ${m} needed before anything makes it`);
      const labourS = hand * (res.manual ? per(res.localM / walk) / carry : 0) + stock * num(s, 'lastCarryS');
      const crew = manual * (1 + (players[1] - 1) * num(s, 'handParallel'));
      return {
        material: m,
        demand,
        level: lvl,
        producerRate,
        cap,
        km: srcKm,
        freight,
        auto,
        manual,
        hand,
        stock,
        labourS,
        ahead: auto > 0 && auto >= manual,
        crew,
        start: [0, 0],
        wait: [0, 0],
        end: [0, 0],
      };
    });
    steps.push({
      order: i,
      key: r.key,
      name: r.name,
      slot: r.slot,
      place: placeName(r.slot, first),
      km,
      speed,
      wagon,
      trains,
      carry,
      tool,
      rideS,
      remote,
      flows,
      pace: [0, 1].map((p) => pace(s, r, flows, rideS, players[p]!)) as [StepPace, StepPace],
    });
  });
  // Stock carries over between steps, so pace each party in order.
  for (const p of [0, 1] as const) {
    let start = 0;
    steps.forEach((st, k) => {
      const prev = steps[k - 1];
      const pc = st.pace[p];
      st.flows.forEach((f, mi) => {
        f.start[p] = prev ? prev.flows[mi]!.end[p] : 0;
        f.wait[p] = f.auto > 0 ? Math.max(0, (f.stock - f.start[p] - f.auto * pc.work) / f.auto) : 0;
      });
      pc.wait = Math.max(...st.flows.map((f) => f.wait[p]));
      pc.limiting = pc.wait === 0 ? '—' : st.flows.find((f) => f.wait[p] === pc.wait)!.material;
      pc.dur = pc.work + pc.wait;
      pc.start = start;
      pc.end = start + pc.dur;
      const sh = num(s, 'sessionHours');
      pc.breaks = Math.floor(pc.end / sh) - Math.floor(pc.start / sh);
      const away = num(s, 'offlineFill') * Math.min(num(s, 'offlineCapHours'), num(s, 'offlineGapHours'));
      st.flows.forEach((f) => {
        f.end[p] = Math.min(
          f.cap,
          Math.max(0, f.start[p] + f.auto * pc.dur - f.stock) + (pc.breaks > 0 ? f.auto * away : 0),
        );
      });
      start = pc.end;
    });
  }
  return { first, players, steps, settings: s };
}

function pace(s: Settings, r: (typeof ROUTE)[number], flows: StepFlow[], rideS: number, n: number): StepPace {
  const act = r.activityMin / (1 + (n - 1) * num(s, 'activityParallel'));
  const labour = flows.reduce((t, f) => t + f.labourS, 0) / 60 / (1 + (n - 1) * num(s, 'handParallel'));
  const travel = (r.rides * 2 * rideS) / 60 / (1 + (n - 1) * num(s, 'travelParallel'));
  return {
    act,
    labour,
    travel,
    work: (act + labour + travel) / 60,
    wait: 0,
    dur: 0,
    start: 0,
    end: 0,
    breaks: 0,
    limiting: '—',
  };
}

/** First hour at which automatic supply delivers at least as fast as hand hauling, per player (p=0) or crew (p=1). */
export function crossover(res: Result, m: Material, p: 0 | 1) {
  for (const st of res.steps) {
    const f = st.flows.find((x) => x.material === m)!;
    if (f.auto > 0 && f.auto >= (p ? f.crew : f.manual)) return st.pace[p].start;
  }
  return NEVER;
}

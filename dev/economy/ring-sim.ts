// The ring economy's pacing, computed exactly as the spreadsheet formulas do (build-model.ts writes both).
// Offline design arithmetic only: no game imports. Keep every rule here in step with its formula.
import {
  BRANCHES,
  GOALS,
  LADDERS,
  LINKS,
  MATERIALS,
  PLACES,
  PRICES,
  PRODUCERS,
  RECIPES,
  RESOURCES,
  RETURNS,
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
type Row = { place: string; first: string; second: string; pick?: string };
/** A row's milestone: its second option when its branch is visited second, or its upgrade pick isn't chosen first. */
export const milestoneOf = (row: Row, s: Settings) => {
  if (row.pick) return row.pick === s.trainFirst ? row.first : row.second;
  return isBranch(row.place) && row.place !== s.branchFirst ? row.second : row.first;
};
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
export const linkKm = (id: string) => LINKS.find((l) => l.id === id)!.km;

/** Distances to the Home Yard by what's built: before the first return spoke, after it, after the ring closes, and over the place's own spoke. */
export function placeKm(slot: string, first: Branch) {
  const p = PLACES.find((x) => x.slot === slot)!;
  if (p.kmFixed !== undefined) return { before: p.kmFixed, spoke1: p.kmFixed, closed: p.kmFixed, own: p.kmFixed };
  const c = first === 'canopy';
  const E = linkKm('entry'),
    rb1 = linkKm(c ? 'ring-canopy' : 'gorge-ring'),
    b1p = linkKm(c ? 'canopy-port' : 'port-gorge'),
    pb2 = linkKm(c ? 'port-gorge' : 'canopy-port'),
    b2r = linkKm(c ? 'gorge-ring' : 'ring-canopy'),
    sb1 = linkKm(c ? 'spoke-canopy' : 'spoke-gorge'),
    sb2 = linkKm(c ? 'spoke-gorge' : 'spoke-canopy'),
    sp = linkKm('spoke-port'),
    o = linkKm('port-original');
  const port = { before: E + rb1 + b1p, spoke1: Math.min(E + rb1 + b1p, sb1 + b1p) };
  const portClosed = Math.min(port.spoke1, E + b2r + pb2);
  switch (slot) {
    case 'ring':
      return { before: E, spoke1: E, closed: E, own: E };
    case 'b1':
      return { before: E + rb1, spoke1: Math.min(E + rb1, sb1), closed: Math.min(E + rb1, sb1), own: sb1 };
    case 'port':
      return { before: port.before, spoke1: port.spoke1, closed: portClosed, own: sp };
    case 'b2': {
      const s1 = Math.min(port.before + pb2, sb1 + b1p + pb2);
      return { before: port.before + pb2, spoke1: s1, closed: Math.min(s1, E + b2r), own: sb2 };
    }
    case 'original':
      return { before: port.before + o, spoke1: port.spoke1 + o, closed: portClosed + o, own: sp + o };
  }
  throw new Error(`no distances for ${slot}`);
}

/** Kilometres from the Home Yard to a slot once route step `i` begins: shortcuts count once built before it. */
export function kmFrom(slot: string, i: number, first: Branch) {
  const p = PLACES.find((x) => x.slot === slot)!;
  const km = placeKm(slot, first);
  return Math.min(
    orderOf('spoke1') < i ? km.spoke1 : km.before,
    orderOf('ring.close') < i ? km.closed : NEVER,
    orderOf(p.ownSpoke) < i ? km.own : NEVER,
  );
}

/** Hours of output credited to a producer's yard on the next join, after `away` hours with the world paused. */
export const awayCredit = (s: Settings, away: number) => {
  const h = num(s, 'awayHorizonHours');
  return num(s, 'awayFill') * h * (1 - Math.exp(-away / h));
};

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
  sold: [number, number]; // surplus past a full yard, sold to the town for Bucks
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
  bucks: number;
  wallet: number;
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
  back: { slot: string; trips: number; min: number; km: number; rideS: number };
  flows: StepFlow[];
  pace: [StepPace, StepPace];
};
export type GoalResult = {
  id: string;
  name: string;
  value: number;
  valueRate: number;
  hours: number;
  total: number;
  wallet: number;
};
export type Result = {
  first: Branch;
  players: [number, number];
  steps: StepResult[];
  settings: Settings;
  goals: GoalResult[];
  endRates: Record<Material, number>;
};

export function simulate(overrides: Settings = {}, players: [number, number] = [1, 4]): Result {
  const s = { ...defaultSettings(), ...overrides };
  const first = s.branchFirst as Branch;
  const at = (row: Row) => orderOf(milestoneOf(row, s));
  const ladder = (key: string, i: number) => {
    const l = LADDERS.find((x) => x.key === key)!;
    const n = RECIPES.filter((r) => r.ladder === key && at(r) <= i).length;
    return l.steps[Math.min(3, n)]!;
  };
  const level = (m: Material, i: number) => PRODUCERS.filter((p) => p.res === m && at(p) <= i).length;
  const yard = (i: number) => {
    const lvl = STORAGE.filter((y) => at(y) <= i).length;
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
    const km = kmFrom(r.slot, i, first);
    const rideS = ride(km, speed, num(s, 'boardWaitS'));
    const ret = RETURNS[r.key];
    const backKm = ret ? kmFrom(ret.slot, i, first) : 0;
    const back = {
      slot: ret?.slot ?? '',
      trips: ret?.trips ?? 0,
      min: ret?.activityMin ?? 0,
      km: backKm,
      rideS: ret ? ride(backKm, speed, num(s, 'boardWaitS')) : 0,
    };
    const remote = (['S', 'Fi', 'U', 'X'] as Material[]).filter((m) => level(m, i) > 0).length;
    const flows = MATERIALS.map((m): StepFlow => {
      const res = RESOURCES.find((x) => x.id === m)!;
      const demand = [...RECIPES, ...PRODUCERS, ...STORAGE]
        .filter((row) => at(row) === i)
        .reduce((n, row) => n + billAt(row.bill, m), 0);
      const lvl = level(m, i);
      const prod = lvl ? PRODUCERS.find((p) => p.res === m && p.level === lvl)! : null;
      const producerRate = prod?.rate ?? 0;
      const cap = prod ? prod.cap + yard(i) : 0;
      const srcKm = kmFrom(slotOfSource(res.source, first), i, first);
      const freight =
        srcKm < limit
          ? 1e9
          : (wagon * trains * 3600) /
            (2 * ((srcKm * 1000) / speed + speed / accel + dwell) + 2 * num(s, 'transferS')) /
            Math.max(1, remote);
      const auto = Math.min(producerRate, freight);
      const per = (oneWay: number) => res.harvestS * tool * carry + num(s, 'pickupS') + 2 * oneWay;
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
        sold: [0, 0],
      };
    });
    const pace = (n: number): StepPace => {
      const act = (r.activityMin + back.min) / (1 + (n - 1) * num(s, 'activityParallel'));
      const labour = flows.reduce((t, f) => t + f.labourS, 0) / 60 / (1 + (n - 1) * num(s, 'handParallel'));
      const travel =
        (r.rides * 2 * rideS + back.trips * 2 * back.rideS) / 60 / (1 + (n - 1) * num(s, 'travelParallel'));
      const work = (act + labour + travel) / 60;
      return {
        act,
        labour,
        travel,
        work,
        wait: 0,
        dur: 0,
        start: 0,
        end: 0,
        breaks: 0,
        limiting: '—',
        bucks: 0,
        wallet: 0,
      };
    };
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
      back,
      flows,
      pace: [pace(players[0]), pace(players[1])],
    });
  });
  // Stock and the wallet carry over between steps, so pace each party in order.
  const away = awayCredit(s, num(s, 'awayHours'));
  for (const p of [0, 1] as const) {
    let start = 0,
      wallet = 0;
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
      st.flows.forEach((f) => {
        const raw = f.start[p] + f.auto * pc.dur - f.stock;
        f.sold[p] = Math.max(0, raw - f.cap);
        f.end[p] = Math.min(f.cap, Math.max(0, raw) + (pc.breaks > 0 ? f.auto * away : 0));
      });
      pc.bucks = st.flows.reduce((t, f) => t + f.sold[p] * PRICES[f.material], 0);
      wallet += pc.bucks;
      pc.wallet = wallet;
      start = pc.end;
    });
  }
  // The end-game tier: goals in order, paid from the end-of-route rates and the wallet.
  const last = steps[steps.length - 1]!;
  const endRates = Object.fromEntries(last.flows.map((f) => [f.material, f.auto])) as Record<Material, number>;
  // A goal waits for its scarcest material and for the wallet: materials it uses can't also be sold, so the
  // wallet need is its Bucks plus its materials at their prices, earned at the town's buying rate.
  const rates = { ...endRates };
  let wallet = last.pace[0].wallet,
    total = 0;
  const goals = GOALS.map((g): GoalResult => {
    const value = g.bucks + MATERIALS.reduce((t, m) => t + billAt(g.bill, m) * PRICES[m], 0);
    const valueRate = MATERIALS.reduce((t, m) => t + rates[m] * PRICES[m], 0);
    const byMaterial = Math.max(
      ...MATERIALS.map((m) => (billAt(g.bill, m) ? (rates[m] > 0 ? billAt(g.bill, m) / rates[m] : NEVER) : 0)),
    );
    const hours = Math.max(byMaterial, Math.max(0, value - wallet) / valueRate);
    wallet = Math.max(0, wallet + valueRate * hours - value);
    total += hours;
    for (const m of MATERIALS) if (g.rates?.[m]) rates[m] = g.rates[m]!;
    return { id: g.id, name: g.name, value, valueRate, hours, total, wallet };
  });
  return { first, players, steps, settings: s, goals, endRates };
}

/** First hour at which automatic supply delivers at least as fast as hand hauling, per player (p=0) or crew (p=1). */
export function crossover(res: Result, m: Material, p: 0 | 1) {
  for (const st of res.steps) {
    const f = st.flows.find((x) => x.material === m)!;
    if (f.auto > 0 && f.auto >= (p ? f.crew : f.manual)) return st.pace[p].start;
  }
  return NEVER;
}

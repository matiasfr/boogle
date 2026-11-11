// The passenger-trade economy model: fares, riders, seats, the strongbox, what Boogles buy and what seats cost in
// hauling, played over the ring route one minute at a time. Pure and deterministic for a seed; no game imports.
// Every number is a named tunable in trade-data.ts; the route's minutes come in as a spine (trade-route.ts).
import {
  MATS,
  SEAT_STEPS,
  SOURCE_DEFS,
  TOWNS,
  defaultTunables,
  townName,
  type Bill,
  type Mat,
  type SeatStep,
  type Town,
  type Tunables,
} from './trade-data.ts';
import type { RouteSpine } from './trade-route.ts';

export { defaultTunables, TUNABLES } from './trade-data.ts';
export type { Tunables } from './trade-data.ts';

/** The step a town's station is connected at; its riders start the minute after. */
export const ARRIVES: Record<Town, string> = {
  village: 'home.line2',
  ring: 'ring.connect',
  canopy: 'b1.reach',
  port: 'port.reach',
  gorge: 'b2.reach',
};
export const STAGES = [
  { key: 'home.line2', label: 'The Village (v26)' },
  { key: 'ring.connect', label: 'Ring Island' },
  { key: 'b1.reach', label: 'First branch' },
  { key: 'port.reach', label: 'High Port' },
  { key: 'b2.reach', label: 'Ring closed' },
] as const;

export type SeatMode = 'none' | 'haul' | 'boogles';
export type ItemKind = 'house' | 'building' | 'fitout' | 'regrowth' | 'rack' | 'loader' | 'seat' | 'goal';
export type Policy = {
  id: string;
  label: string;
  /** Strict priority: the first group with something on offer is saved for; a later group is bought only if the earlier has nothing on offer. */
  priority: ItemKind[][];
  seats: SeatMode;
};
const TOWN_KINDS: ItemKind[] = ['house', 'building', 'fitout'];
const SOURCE_KINDS: ItemKind[] = ['regrowth', 'rack', 'loader'];
export const POLICIES: Policy[] = [
  { id: 'never', label: 'Never spends a Boogle, adds no seat', priority: [], seats: 'none' },
  {
    id: 'houses',
    label: 'Builds houses, hauls for seats as crowds appear',
    priority: [TOWN_KINDS, ['goal']],
    seats: 'haul',
  },
  {
    id: 'sources',
    label: 'Source upgrades first, then houses; hauls for seats',
    priority: [SOURCE_KINDS, TOWN_KINDS, ['goal']],
    seats: 'haul',
  },
  {
    id: 'boogleSeats',
    label: 'Builds houses, seats priced in Boogles',
    priority: [['seat'], TOWN_KINDS, ['goal']],
    seats: 'boogles',
  },
];

export type Item = {
  id: string;
  kind: ItemKind;
  label: string;
  town?: Town;
  step?: SeatStep;
  /** Boogles; seats on materials are not items (they are hauled), so every item here costs Boogles and nothing else. */
  price: number;
  offerAt: string;
  after?: string;
};

export const fareOf = (t: Tunables, town: Town) => t['fare.board']! + t['fare.per100m']! * t[`km.${town}`]! * 10;
export const billOf = (t: Tunables, town: Town, step: SeatStep): Bill => {
  const out: Bill = {};
  for (const m of MATS) {
    const v = t[`bill.${town}.${step}.${m}`];
    if (v) out[m] = v;
  }
  return out;
};
export const billMinutes = (t: Tunables, bill: Bill) => MATS.reduce((s, m) => s + (bill[m] ?? 0) * t[`haul.${m}`]!, 0);

/** Everything a room can buy with Boogles, in a policy's world (seats appear only when they cost Boogles). */
export function catalog(t: Tunables, policy: Policy): Item[] {
  const out: Item[] = [];
  const mult = policy.seats === 'boogles' ? t['house.mult.boogleSeats']! : t['house.mult.materialSeats']!;
  for (const town of TOWNS) {
    const arrive = ARRIVES[town];
    for (let n = 1; t[`house.${town}.${n}`] !== undefined; n++)
      out.push({
        id: `house.${town}.${n}`,
        kind: 'house',
        label: `House ${n}, ${townName(town)}`,
        town,
        price: Math.round(t[`house.${town}.${n}`]! * mult * t['house.order']! ** (n - 1)),
        offerAt: town === 'village' && n === 3 ? ARRIVES.canopy : arrive,
        after: n > 1 ? `house.${town}.${n - 1}` : undefined,
      });
    const f = t[`fitout.${town}`]!;
    out.push({
      id: `fitout.${town}.1`,
      kind: 'fitout',
      label: `Station fit-out, ${townName(town)}`,
      town,
      price: f,
      offerAt: arrive,
    });
    out.push({
      id: `fitout.${town}.2`,
      kind: 'fitout',
      label: `Station fit-out 2, ${townName(town)}`,
      town,
      price: Math.round(f * t.step2Mult!),
      offerAt: arrive,
      after: `fitout.${town}.1`,
    });
    if (policy.seats === 'boogles')
      SEAT_STEPS[town].forEach((step, i) =>
        out.push({
          id: `seat.${town}.${step}`,
          kind: 'seat',
          label: `${step === 'six' ? 'Six fit-out' : step === 'car' ? 'Second car' : 'Express set'}, ${townName(town)}`,
          town,
          step,
          price: t[`seatB.${town}.${step}`]!,
          offerAt: arrive,
          after: i ? `seat.${town}.${SEAT_STEPS[town][i - 1]}` : undefined,
        }),
      );
  }
  out.push({
    id: 'building.ring',
    kind: 'building',
    label: 'Town building, Ring Island',
    town: 'ring',
    price: t['building.ring']!,
    offerAt: ARRIVES.ring,
  });
  for (const s of SOURCE_DEFS) {
    const p = t[`src.${s.id}`]!;
    out.push({ id: `${s.id}.1`, kind: s.kind, label: s.label, price: p, offerAt: s.offerAt });
    out.push({
      id: `${s.id}.2`,
      kind: s.kind,
      label: `${s.label} (2)`,
      price: Math.round(p * t.step2Mult!),
      offerAt: s.offerAt,
      after: `${s.id}.1`,
    });
  }
  for (const g of ['G5', 'G6', 'G7'])
    out.push({ id: `goal.${g}`, kind: 'goal', label: `Goal ${g}`, price: t[`goal.${g}`]!, offerAt: 'end' });
  return out;
}

export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export type RunOptions = {
  seed?: number;
  /** Party size: 1 to 3, as the ring model's columns. */
  players?: number;
  /** Ticks (minutes since the trade opened) when nobody is in the room: nothing earns, hauls, buys or moves on. */
  empty?: [number, number][];
};
export type Buy = {
  id: string;
  kind: ItemKind;
  label: string;
  price: number;
  offeredTick: number;
  tick: number;
  waitMin: number;
  contested: boolean;
};
export type Series = {
  hour: number[];
  wallet: number[];
  cap: number[];
  income: number[];
  potential: number[];
  houses: number[];
  ridersRate: number[];
  crowd: number[];
  seats: number[];
  hauling: number[];
};
export type StageRow = {
  label: string;
  startHour: number;
  endHour: number;
  earned: number;
  capped: number;
  offered: number;
  endIncomePerMin: number;
  endBoxCap: number;
  houses: number;
  buys: number;
};
/** Ticks are minutes since the trade opened. `completedAt[i]` is the tick the (startSteps + i + 1)th route step ended. */
export type RoomScript = {
  startSteps: number;
  stepKeys: string[];
  completedAt: number[];
  opened: Partial<Record<Town, number>>;
  /** Seats hauled for and installed at the end of this tick. */
  hauled: { tick: number; town: Town; step: SeatStep }[];
};
export type RoomRun = {
  policy: Policy;
  players: number;
  seed: number;
  baseRouteHours: number;
  routeHours: number;
  tradeStartHour: number;
  series: Series;
  buys: Buy[];
  stages: StageRow[];
  ledger: {
    boogles: {
      earned: number;
      spent: number;
      capped: number;
      wallet: number;
      spentOn: Record<string, number>;
      /** The same three figures at the end of the route, before the end-game goals are played on. */
      atRouteEnd: { earned: number; spent: number; capped: number };
    };
    materials: Record<Mat, number>;
    hauledSeatMin: number;
    savedBySourcesMin: number;
    emptyMin: number;
  };
  riders: { carried: number; lost: number; maxCrowd: number; minutesCrowded: number };
  seatSteps: string[];
  /** What the room did, minute by minute, so the playable prototype can replay it and be checked against it. */
  script: RoomScript;
  boxFullMin: number;
  contestedBuys: number;
  night: { sack: number; awayCredit: number; boxRoom: number };
  goalHours: number | null;
  endPotential: number;
};

// ---------------------------------------------------------------- the rules a room runs by
// Shared with the playable prototype (play-trade.ts), which calls these same functions so the two cannot drift.
export type TownRt = {
  open: boolean;
  houses: number;
  building: number;
  fit: number;
  six: boolean;
  car: boolean;
  express: boolean;
  waiting: number;
  arr: number;
  cap: number;
  due: { tick: number; kind: 'house' | 'building' }[];
};
export const newTownRt = (): TownRt => ({
  open: false,
  houses: 0,
  building: 0,
  fit: 0,
  six: false,
  car: false,
  express: false,
  waiting: 0,
  arr: 0,
  cap: 0,
  due: [],
});
export const newTowns = (): Record<Town, TownRt> => ({
  village: newTownRt(),
  ring: newTownRt(),
  canopy: newTownRt(),
  port: newTownRt(),
  gorge: newTownRt(),
});
/** Whether a route step (by key) is finished; 'end' is the whole route. */
export type StepDone = (key: string) => boolean;
export const seatsOf = (t: Tunables, r: TownRt) =>
  t['trains.perLine']! *
    (r.car ? t['cars.second']! : t['cars.base']!) *
    (r.six ? t['seats.six']! : t['seats.perCar']!) +
  (r.express ? t['express.seats']! : 0);
export const capacityOf = (t: Tunables, town: Town, r: TownRt) =>
  seatsOf(t, r) / (t['cycle.base']! + t['cycle.perKm']! * t[`km.${town}`]!);
export const demandOf = (t: Tunables, r: TownRt) =>
  ((t['riders.startBuildings']! + r.houses) * t['riders.perBuilding']! + r.building * t['riders.townBuilding']!) *
  (1 + t['riders.fitoutBoost']! * r.fit);
/** Boogles a minute the open towns would pay with every seat full of the riders they send. */
export const potentialOf = (t: Tunables, rt: Record<Town, TownRt>) =>
  TOWNS.reduce(
    (s, tw) => (rt[tw].open ? s + 2 * Math.min(demandOf(t, rt[tw]), capacityOf(t, tw, rt[tw])) * fareOf(t, tw) : s),
    0,
  );
export const crowdOf = (t: Record<Town, TownRt>, town: Town) => (t[town].open ? t[town].waiting : 0);
export const offeredNow = (it: Item, bought: ReadonlySet<string>, done: StepDone) =>
  done(it.offerAt) && (!it.after || bought.has(it.after)) && !bought.has(it.id);
export const dearestOffered = (items: Item[], bought: ReadonlySet<string>, done: StepDone) =>
  items.reduce((d, it) => (offeredNow(it, bought, done) && it.price > d ? it.price : d), 0);
/** The strongbox's size: the larger of its minutes of income and a multiple of the dearest thing on offer. */
export const boxCapOf = (t: Tunables, potential: number, dearest: number) =>
  Math.max(t['box.incomeMin']! * potential, t['box.dearestMult']! * dearest);
/** Houses and town buildings whose build time is up become riders' homes and workplaces. */
export function completeBuilds(rt: Record<Town, TownRt>, tick: number) {
  for (const tw of TOWNS) {
    const r = rt[tw];
    r.due = r.due.filter((d) => {
      if (d.tick > tick) return true;
      if (d.kind === 'house') r.houses++;
      else r.building++;
      return false;
    });
  }
}
/** A town opens once its station's step is done. */
export function openTowns(rt: Record<Town, TownRt>, done: StepDone) {
  for (const tw of TOWNS) if (!rt[tw].open && done(ARRIVES[tw])) rt[tw].open = true;
}
export const nextSeatStep = (town: Town, r: TownRt): SeatStep | undefined =>
  SEAT_STEPS[town].find((s) => !(s === 'six' ? r.six : s === 'car' ? r.car : r.express));
export function installSeat(r: TownRt, step: SeatStep) {
  if (step === 'six') r.six = true;
  else if (step === 'car') r.car = true;
  else r.express = true;
}
/** What a buy does to its town: houses and buildings take their build minutes; seats and fit-outs are at once. */
export function applyTownItem(t: Tunables, rt: Record<Town, TownRt>, it: Item, tick: number) {
  const r = rt[it.town!];
  if (it.kind === 'house' || it.kind === 'building') r.due.push({ tick: tick + t['house.buildMin']!, kind: it.kind });
  else if (it.kind === 'fitout') r.fit++;
  else if (it.kind === 'seat') installSeat(r, it.step!);
}
export type MinuteTown = { served: number; lost: number; fare: number; landed: number };
export type Minute = {
  landed: number;
  capped: number;
  carried: number;
  lost: number;
  towns: Partial<Record<Town, MinuteTown>>;
};
/**
 * One minute of riding in every open town: riders arrive (seeded jitter, towns in table order), a train stops for four
 * or more and the seats carry what they can, each rider pays once each way, and the strongbox takes what fits.
 * `wallet` is what the box holds before the minute.
 */
export function tradeMinute(
  t: Tunables,
  rt: Record<Town, TownRt>,
  rng: () => number,
  cap: number,
  wallet: number,
): Minute {
  const out: Minute = { landed: 0, capped: 0, carried: 0, lost: 0, towns: {} };
  for (const tw of TOWNS) {
    const r = rt[tw];
    if (!r.open) continue;
    r.arr += demandOf(t, r) * (1 + t['riders.jitter']! * (2 * rng() - 1));
    const come = Math.floor(r.arr);
    r.arr -= come;
    r.waiting += come;
    r.cap += capacityOf(t, tw, r);
    const room = Math.floor(r.cap);
    let served = 0;
    if (r.waiting >= t['crowd.stop']!) {
      served = Math.min(r.waiting, room);
      r.cap -= served;
    }
    r.cap = Math.min(r.cap, 1); // unused seats do not bank
    r.waiting -= served;
    out.carried += served;
    let lost = 0;
    if (r.waiting > t['crowd.cap']!) {
      lost = r.waiting - t['crowd.cap']!;
      out.lost += lost;
      r.waiting = t['crowd.cap']!;
    }
    const fare = 2 * served * fareOf(t, tw);
    const take = Math.min(fare, Math.max(0, cap - wallet - out.landed));
    out.landed += take;
    out.capped += fare - take;
    out.towns[tw] = { served, lost, fare, landed: take };
  }
  return out;
}

/** What a night away credits at the next join: the away formula, then the sack, then the room left in the box. */
export function awayCredit(t: Tunables, ratePerMin: number, wallet: number, boxCap: number, awayH: number) {
  const H = t['away.horizonH']!;
  const sack = t['sack.min']! * ratePerMin;
  const formula = ratePerMin * 60 * H * (1 - Math.exp(-awayH / H));
  const room = Math.max(0, boxCap - wallet);
  return { sack, credit: Math.min(formula, sack, room), room };
}

export function run(spine: RouteSpine, t: Tunables, policy: Policy, opts: RunOptions = {}): RoomRun {
  const seed = opts.seed ?? 1;
  const players = opts.players ?? 1;
  const col = spine.players.indexOf(players);
  if (col < 0) throw new Error(`no route column for ${players} players`);
  const rng = mulberry32(seed);
  const steps = spine.steps;
  const idx = (key: string) => (key === 'end' ? steps.length - 1 : steps.findIndex((s) => s.key === key));
  const baseMin = (i: number) => steps[i]!.fixedMin[col]! + steps[i]!.labourMin[col]!;
  const startIdx = idx(ARRIVES.village);
  const tradeStartMin = steps.slice(0, startIdx + 1).reduce((s, _, i) => s + baseMin(i), 0);
  const baseTotalMin = steps.reduce((s, _, i) => s + baseMin(i), 0);
  const items = catalog(t, policy);
  const bought = new Set<string>();
  const offeredAt = new Map<string, number>();
  const rt = newTowns();
  const hands = 1 + t['haul.parallel']! * (players - 1);
  const cutOf: Record<string, number> = {
    regrowth: t['cut.regrowth']!,
    rack: t['cut.rack']!,
    loader: t['cut.loader']!,
  };

  let completed = startIdx + 1; // steps done
  let prog = 0;
  let labourMul = 1;
  let tick = 0;
  let wallet = 0;
  let earned = 0;
  let spent = 0;
  let capped = 0;
  const spentOn: Record<string, number> = {};
  const mats: Record<Mat, number> = { W: 0, St: 0, Fi: 0, Cu: 0 };
  let hauledMin = 0;
  let savedMin = 0;
  let emptyMin = 0;
  let boxFull = 0;
  let contested = 0;
  let carried = 0;
  let lost = 0;
  let maxCrowd = 0;
  let crowded = 0;
  let routeDoneMin: number | null = null;
  let routeDoneTick = 0;
  let atEnd: { earned: number; spent: number; capped: number } | null = null;
  let lastGoalTick: number | null = null;
  let job: { town: Town; step: SeatStep; left: number; bill: Bill } | null = null;
  const buys: Buy[] = [];
  const series: Series = {
    hour: [],
    wallet: [],
    cap: [],
    income: [],
    potential: [],
    houses: [],
    ridersRate: [],
    crowd: [],
    seats: [],
    hauling: [],
  };
  const seatSteps: string[] = [];
  const script: RoomScript = {
    startSteps: startIdx + 1,
    stepKeys: steps.map((s) => s.key),
    completedAt: [],
    opened: {},
    hauled: [],
  };
  const stageAcc = STAGES.map(() => ({
    earned: 0,
    capped: 0,
    startTick: -1,
    endTick: -1,
    buys: 0,
    endIncome: 0,
    endCap: 0,
    houses: 0,
  }));
  const stageIdx = STAGES.map((s) => idx(s.key));
  const stageNow = () => {
    let s = 0;
    for (let i = 0; i < STAGES.length; i++) if (completed > stageIdx[i]!) s = i;
    return s;
  };

  const done: StepDone = (key) => completed > idx(key);
  const potential = () => potentialOf(t, rt);
  const isOffered = (it: Item) => offeredNow(it, bought, done);
  const stamp = () => {
    for (const it of items) if (!offeredAt.has(it.id) && isOffered(it)) offeredAt.set(it.id, tick);
  };
  const boxCap = () => boxCapOf(t, potential(), dearestOffered(items, bought, done));
  const inEmpty = (k: number) => (opts.empty ?? []).some(([a, b]) => k >= a && k < b);

  const apply = (it: Item) => {
    if (it.kind === 'seat') install(it.town!, it.step!);
    else if (it.kind === 'goal') return;
    else if (it.kind in cutOf) labourMul *= 1 - cutOf[it.kind]!;
    else applyTownItem(t, rt, it, tick);
  };
  const install = (town: Town, step: SeatStep) => {
    installSeat(rt[town], step);
    seatSteps.push(`${town}.${step}@${((tradeStartMin + tick) / 60).toFixed(2)}h`);
  };

  const buyPass = () => {
    for (;;) {
      let pick: Item | null = null;
      let blocked = false;
      let choice = false;
      for (const group of policy.priority) {
        const cands = items
          .filter(
            (it) =>
              group.includes(it.kind) &&
              isOffered(it) &&
              (it.kind !== 'seat' || crowdOf(rt, it.town!) >= t['crowd.stop']!),
          )
          .sort((a, b) => a.price - b.price || (a.id < b.id ? -1 : 1));
        if (!cands.length) continue;
        if (cands[0]!.price <= wallet) pick = cands[0]!;
        else blocked = true;
        if (pick || blocked) {
          // Count a choice when the two cheapest on offer cannot both be bought now.
          if (pick && cands.length > 1 && cands[0]!.price + cands[1]!.price > wallet) choice = true;
          break;
        }
      }
      if (!pick) return;
      if (choice) contested++;
      wallet -= pick.price;
      spent += pick.price;
      spentOn[pick.kind] = (spentOn[pick.kind] ?? 0) + pick.price;
      bought.add(pick.id);
      const off = offeredAt.get(pick.id) ?? tick;
      buys.push({
        id: pick.id,
        kind: pick.kind,
        label: pick.label,
        price: pick.price,
        offeredTick: off,
        tick,
        waitMin: tick - off,
        contested: choice,
      });
      const st = stageNow();
      stageAcc[st]!.buys++;
      apply(pick);
      if (pick.kind === 'goal') lastGoalTick = tick;
      stamp();
    }
  };

  stamp();
  const maxTicks = Math.ceil(baseTotalMin * 3 + 240) + t['goal.hoursMax']! * 60;
  for (; tick < maxTicks; tick++) {
    const routeDone = completed >= steps.length;
    if (routeDone && routeDoneMin === null) {
      routeDoneMin = tradeStartMin + tick;
      routeDoneTick = tick;
    }
    if (routeDone) {
      const goalsLeft = items.some((it) => it.kind === 'goal' && !bought.has(it.id));
      if (policy.priority.length === 0 || !goalsLeft || tick - routeDoneTick > t['goal.hoursMax']! * 60) break;
    }
    if (inEmpty(tick)) {
      emptyMin++;
      if (!routeDone) record(0, 0);
      continue;
    }
    // Houses and town buildings that finished building.
    completeBuilds(rt, tick);
    openTowns(rt, done);
    for (const tw of TOWNS) if (rt[tw].open && script.opened[tw] === undefined) script.opened[tw] = tick;
    // Riders arrive, a train stops for four or more, the seats carry what they can; each rider pays once, each way.
    const cap = boxCap();
    const ride = tradeMinute(t, rt, rng, cap, wallet);
    const landed = ride.landed;
    const cappedNow = ride.capped;
    carried += ride.carried;
    lost += ride.lost;
    wallet += landed;
    earned += landed;
    capped += cappedNow;
    const st = stageNow();
    stageAcc[st]!.earned += landed;
    stageAcc[st]!.capped += cappedNow;
    if (wallet >= cap - 1e-6 && !routeDone) boxFull++;
    const crowdNow = TOWNS.reduce((s, tw) => s + crowdOf(rt, tw), 0);
    maxCrowd = Math.max(maxCrowd, crowdNow);
    if (!routeDone && TOWNS.some((tw) => crowdOf(rt, tw) >= t['crowd.stop']!)) crowded++;
    buyPass();
    // A crowd left behind is a hauling job when seats cost materials.
    if (policy.seats === 'haul' && !job && !routeDone)
      for (const tw of TOWNS) {
        if (crowdOf(rt, tw) < t['crowd.stop']!) continue;
        const next = SEAT_STEPS[tw].find(
          (s) => !(s === 'six' ? rt[tw].six : s === 'car' ? rt[tw].car : rt[tw].express),
        );
        if (!next) continue;
        const bill = billOf(t, tw, next);
        job = { town: tw, step: next, left: billMinutes(t, bill) / hands, bill };
        break;
      }
    // Time passes: hauling for seats first, then the route.
    let avail = 1;
    if (job) {
      const used = Math.min(1, job.left);
      job.left -= used;
      avail -= used;
      hauledMin += used;
      if (job.left <= 1e-9) {
        install(job.town, job.step);
        script.hauled.push({ tick, town: job.town, step: job.step });
        for (const m of MATS) mats[m] += job.bill[m] ?? 0;
        job = null;
      }
    }
    while (avail > 1e-9 && completed < steps.length) {
      const fixed = steps[completed]!.fixedMin[col]!;
      const lab = steps[completed]!.labourMin[col]!;
      const now = fixed + lab * labourMul;
      const use = Math.min(avail, (1 - prog) * now);
      const baseWork = (use / now) * (fixed + lab);
      savedMin += baseWork - use;
      prog += use / now;
      avail -= use;
      if (prog >= 1 - 1e-9) {
        prog = 0;
        completed++;
        script.completedAt.push(tick);
        stamp();
        if (completed >= steps.length) {
          routeDoneMin = tradeStartMin + tick + (1 - avail);
          atEnd = { earned, spent, capped };
          routeDoneTick = tick + 1;
        }
      }
    }
    stamp();
    stageAcc.forEach((a, i) => {
      if (completed > stageIdx[i]!) {
        if (a.startTick < 0) a.startTick = tick;
        if (stageNow() === i) {
          a.endTick = tick;
          a.endIncome = potential();
          a.endCap = boxCap();
          a.houses = TOWNS.reduce((s, tw) => s + rt[tw].houses + rt[tw].building, 0);
        }
      }
    });
    if (!routeDone) record(landed, job ? 1 : 0);
  }

  function record(landed: number, hauling: number) {
    series.hour.push((tradeStartMin + tick) / 60);
    series.wallet.push(wallet);
    series.cap.push(boxCap());
    series.income.push(landed);
    series.potential.push(potential());
    series.houses.push(TOWNS.reduce((s, tw) => s + rt[tw].houses + rt[tw].building, 0));
    series.ridersRate.push(TOWNS.reduce((s, tw) => (rt[tw].open ? s + 2 * demandOf(t, rt[tw]) : s), 0));
    series.crowd.push(TOWNS.reduce((s, tw) => s + crowdOf(rt, tw), 0));
    series.seats.push(TOWNS.reduce((s, tw) => (rt[tw].open ? s + seatsOf(t, rt[tw]) : s), 0));
    series.hauling.push(hauling);
  }

  const endTickAll = tick;
  const endRoute = routeDoneMin ?? tradeStartMin + endTickAll;
  const offeredByStage = STAGES.map(() => 0);
  for (const it of items) {
    if (it.kind === 'goal') continue;
    let s = 0;
    for (let i = 0; i < STAGES.length; i++) if (idx(it.offerAt) >= stageIdx[i]!) s = i;
    offeredByStage[s]! += it.price;
  }
  const stages: StageRow[] = STAGES.map((s, i) => {
    const a = stageAcc[i]!;
    const nextEnd = i + 1 < STAGES.length ? stageAcc[i + 1]!.startTick : routeDoneTick;
    return {
      label: s.label,
      startHour: i === 0 ? tradeStartMin / 60 : a.startTick < 0 ? endRoute / 60 : (tradeStartMin + a.startTick) / 60,
      endHour: nextEnd < 0 ? endRoute / 60 : (tradeStartMin + nextEnd) / 60,
      earned: a.earned,
      capped: a.capped,
      offered: offeredByStage[i]!,
      endIncomePerMin: a.endIncome,
      endBoxCap: a.endCap,
      houses: a.houses,
      buys: a.buys,
    };
  });
  const pot = potential();
  const cap = boxCap();
  const away = awayCredit(t, pot, wallet, cap, t['away.hours']!);
  return {
    policy,
    players,
    seed,
    baseRouteHours: baseTotalMin / 60,
    routeHours: endRoute / 60,
    tradeStartHour: tradeStartMin / 60,
    series,
    buys,
    stages,
    ledger: {
      boogles: { earned, spent, capped, wallet, spentOn, atRouteEnd: atEnd ?? { earned, spent, capped } },
      materials: mats,
      hauledSeatMin: hauledMin,
      savedBySourcesMin: savedMin,
      emptyMin,
    },
    riders: { carried, lost, maxCrowd, minutesCrowded: crowded },
    seatSteps,
    script,
    boxFullMin: boxFull,
    contestedBuys: contested,
    night: { sack: away.sack, awayCredit: away.credit, boxRoom: away.room },
    goalHours: lastGoalTick === null ? null : (lastGoalTick - routeDoneTick) / 60,
    endPotential: pot,
  };
}

export type Headline = {
  id: string;
  label: string;
  routeHours: number;
  deltaHours: number;
  earned: number;
  spent: number;
  capped: number;
  houses: number;
  buys: number;
  buysPerHour: number;
  seatHaulMin: number;
  seatHaulPct: number;
  sourceSavedMin: number;
  sourceSavedPct: number;
  boxFullPct: number;
  crowdPct: number;
  contestedBuys: number;
  meanWaitMin: number;
  goalHours: number | null;
  endPerMin: number;
  nightEarns: number;
};
export function headline(r: RoomRun): Headline {
  const tradeMin = (r.routeHours - r.tradeStartHour) * 60;
  const houses = r.buys.filter((b) => b.kind === 'house' || b.kind === 'building').length;
  return {
    id: r.policy.id,
    label: r.policy.label,
    routeHours: r.routeHours,
    deltaHours: r.routeHours - r.baseRouteHours,
    earned: r.ledger.boogles.atRouteEnd.earned,
    spent: r.ledger.boogles.atRouteEnd.spent,
    capped: r.ledger.boogles.atRouteEnd.capped,
    houses,
    buys: r.buys.length,
    buysPerHour: r.buys.length / Math.max(1e-9, tradeMin / 60),
    seatHaulMin: r.ledger.hauledSeatMin,
    seatHaulPct: (100 * r.ledger.hauledSeatMin) / (r.baseRouteHours * 60),
    sourceSavedMin: Math.max(0, r.ledger.savedBySourcesMin),
    sourceSavedPct: (100 * Math.max(0, r.ledger.savedBySourcesMin)) / (r.baseRouteHours * 60),
    boxFullPct: (100 * r.boxFullMin) / Math.max(1, tradeMin),
    crowdPct: (100 * r.riders.minutesCrowded) / Math.max(1, tradeMin),
    contestedBuys: r.contestedBuys,
    meanWaitMin: r.buys.length ? r.buys.reduce((s, b) => s + b.waitMin, 0) / r.buys.length : 0,
    goalHours: r.goalHours,
    endPerMin: r.endPotential,
    nightEarns: r.night.awayCredit,
  };
}

/** The four rooms the brief names, played with one seed and one party size. */
export function playRooms(spine: RouteSpine, t: Tunables = defaultTunables(), opts: RunOptions = {}) {
  return POLICIES.map((p) => run(spine, t, p, opts));
}

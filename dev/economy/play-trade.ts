// The playable economy prototype's passenger trade: little guys ride and pay fares into one shared strongbox at the
// ticket window, Boogles buy houses, a crowd asks for seats, and seats are hauled for (or bought, as a variant).
// Pure and deterministic for a seed. It owns no rule of its own: every minute of riding, the box's size, the prices and
// the offers come from trade-model.ts's exported functions (the same ones its four rooms are played with) and every
// number from trade-data.ts, so test/economy-playable-trade.test.ts can hold it to the model to the last Boogle.
//
// Owner rules it keeps: no personal money (fares land in the one strongbox); Boogles come from fares only; materials and
// Boogles never convert (a seat costs one or the other, never both); nothing earns while the room is empty (a night
// away is only the capped away credit); four or more waiting riders stop a train, never an express.
import type { Bill as RingBill, Material } from './ring-data.ts';
import {
  POLICIES,
  applyTownItem,
  awayCredit,
  billOf,
  boxCapOf,
  catalog,
  completeBuilds,
  crowdOf,
  defaultTunables,
  dearestOffered,
  demandOf,
  fareOf,
  seatsOf,
  installSeat,
  mulberry32,
  newTowns,
  nextSeatStep,
  offeredNow,
  openTowns,
  potentialOf,
  tradeMinute,
  type Item,
  type Minute,
  type Policy,
  type StepDone,
  type TownRt,
  type Tunables,
} from './trade-model.ts';
import { MATS, TOWNS, type Mat, type SeatStep, type Town } from './trade-data.ts';

/** Seats on materials is the default; Boogles-seats is the owner's variant to compare. */
export type SeatMode = 'haul' | 'boogles';
/** The trade's materials in the ring model's ids (the trade tables call steel `St` and copper `Cu`). */
export const RING_MAT: Record<Mat, Material> = { W: 'W', St: 'S', Fi: 'Fi', Cu: 'U' };
export const policyFor = (seats: SeatMode): Policy =>
  POLICIES.find((p) => p.id === (seats === 'haul' ? 'houses' : 'boogleSeats'))!;

export type SeatJob = { town: Town; step: SeatStep; bill: RingBill; got: RingBill; startedMinute: number };
export type TradeBuy = { id: string; label: string; price: number; minute: number };
export type Trade = {
  t: Tunables;
  seats: SeatMode;
  policy: Policy;
  items: Item[];
  bought: Set<string>;
  rt: Record<Town, TownRt>;
  rng: () => number;
  /** Whether the trade has opened (the Village's line is built); it runs one model minute for each 60 s of play after. */
  started: boolean;
  secs: number;
  /** Minutes run so far: the model's tick for the next minute. */
  minute: number;
  wallet: number;
  earned: number;
  spent: number;
  capped: number;
  carried: number;
  lost: number;
  boxFullMin: number;
  crowdedMin: number;
  /** The last minute's rides and the box's size then, for drawing. */
  last: Minute | null;
  cap: number;
  job: SeatJob | null;
  buys: TradeBuy[];
  installs: string[];
  /** Fares and what they were measured against the model: the rider income of the last minute. */
  income: number[];
};

export function createTrade(seats: SeatMode = 'haul', o: { seed?: number; tunables?: Tunables } = {}): Trade {
  const t = o.tunables ?? defaultTunables();
  const policy = policyFor(seats);
  return {
    t,
    seats,
    policy,
    items: catalog(t, policy),
    bought: new Set(),
    rt: newTowns(),
    rng: mulberry32(o.seed ?? 1),
    started: false,
    secs: 0,
    minute: 0,
    wallet: 0,
    earned: 0,
    spent: 0,
    capped: 0,
    carried: 0,
    lost: 0,
    boxFullMin: 0,
    crowdedMin: 0,
    last: null,
    cap: 0,
    job: null,
    buys: [],
    installs: [],
    income: [],
  };
}

export const potential = (tr: Trade) => potentialOf(tr.t, tr.rt);
export const boxCap = (tr: Trade, done: StepDone) =>
  boxCapOf(tr.t, potential(tr), dearestOffered(tr.items, tr.bought, done));
export const crowd = (tr: Trade, town: Town) => crowdOf(tr.rt, town);
export const isCrowd = (tr: Trade, town: Town) => crowd(tr, town) >= tr.t['crowd.stop']!;
export const offered = (tr: Trade, done: StepDone) => tr.items.filter((it) => offeredNow(it, tr.bought, done));
/** Riders each way a minute, seats each way, and the fare. */
export const townNumbers = (tr: Trade, town: Town) => {
  const r = tr.rt[town];
  return { riders: demandOf(tr.t, r), seats: seatsOf(tr.t, r), fare: fareOf(tr.t, town), building: r.due.length };
};

/** One model minute: houses finish, towns open, riders arrive and ride, the box takes the fares. */
export function tradeStep(tr: Trade, done: StepDone): Minute {
  const k = tr.minute;
  completeBuilds(tr.rt, k);
  openTowns(tr.rt, done);
  const cap = boxCap(tr, done);
  const ride = tradeMinute(tr.t, tr.rt, tr.rng, cap, tr.wallet);
  tr.wallet += ride.landed;
  tr.earned += ride.landed;
  tr.capped += ride.capped;
  tr.carried += ride.carried;
  tr.lost += ride.lost;
  if (tr.wallet >= cap - 1e-6) tr.boxFullMin++;
  if (TOWNS.some((tw) => isCrowd(tr, tw))) tr.crowdedMin++;
  tr.last = ride;
  tr.cap = cap;
  tr.income.push(ride.landed);
  tr.minute = k + 1;
  return ride;
}

/** Why an item can't be bought now, or null when it can. */
export function buyError(tr: Trade, done: StepDone, id: string): string | null {
  const it = tr.items.find((x) => x.id === id);
  if (!it) return 'No such thing on offer';
  if (!offeredNow(it, tr.bought, done)) return 'Not on offer yet';
  if (it.kind === 'seat' && !isCrowd(tr, it.town!))
    return `Seats are bought for a crowd of ${tr.t['crowd.stop']!} or more`;
  if (tr.wallet < it.price) return `Needs ${Math.ceil(it.price - tr.wallet)} more Boogles`;
  return null;
}
/** Spends the strongbox's Boogles on an offered item (houses, town buildings, fit-outs, and seats in the Boogles variant). */
export function buy(tr: Trade, done: StepDone, id: string): string | null {
  const err = buyError(tr, done, id);
  if (err) return err;
  const it = tr.items.find((x) => x.id === id)!;
  tr.wallet -= it.price;
  tr.spent += it.price;
  tr.bought.add(it.id);
  // The model buys after a minute's riders, at that minute's tick: the next minute sees the house.
  applyTownItem(tr.t, tr.rt, it, tr.minute - 1);
  tr.buys.push({ id: it.id, label: it.label, price: it.price, minute: tr.minute });
  if (it.kind === 'seat') tr.installs.push(`${it.town}.${it.step}`);
  return null;
}

// ---------------------------------------------------------------- seats on materials (the default)
/** The seat bill in the ring model's materials. */
export function seatBill(tr: Trade, town: Town, step: SeatStep): RingBill {
  const out: RingBill = {};
  const b = billOf(tr.t, town, step);
  for (const m of MATS) if (b[m]) out[RING_MAT[m]] = b[m]!;
  return out;
}
/** A crowd of four or more at a town with a seat step left calls for hauling; the first such town in table order, as the model. */
export function startSeatJob(tr: Trade): SeatJob | null {
  if (tr.seats !== 'haul' || tr.job) return tr.job;
  for (const tw of TOWNS) {
    if (!isCrowd(tr, tw)) continue;
    const step = nextSeatStep(tw, tr.rt[tw]);
    if (!step) continue;
    tr.job = { town: tw, step, bill: seatBill(tr, tw, step), got: {}, startedMinute: tr.minute };
    return tr.job;
  }
  return null;
}
/** Installs the seats once the bill is in; the materials are used up and no Boogle changes hands. */
export function finishSeatJob(tr: Trade): SeatJob | null {
  const j = tr.job;
  if (!j) return null;
  for (const m of Object.keys(j.bill) as Material[]) if ((j.got[m] ?? 0) + 1e-9 < j.bill[m]!) return null;
  installSeat(tr.rt[j.town], j.step);
  tr.installs.push(`${j.town}.${j.step}`);
  tr.job = null;
  return j;
}

/** A night away: the world pauses (nothing earns), and the next join credits one capped sack of fares. */
export function awayBoogles(tr: Trade, done: StepDone, awayH: number) {
  if (!tr.started) return 0;
  const cap = boxCap(tr, done);
  const a = awayCredit(tr.t, potential(tr), tr.wallet, cap, awayH);
  tr.wallet += a.credit;
  tr.earned += a.credit;
  tr.cap = cap;
  return a.credit;
}

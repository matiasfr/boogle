// The town economy's numbers (docs/plans/slice5-town-economy.md, "Numbers"; call 5: the one home for them, which
// dev/economy/trade-data.ts reads and src/sim never imports back). All stand-ins, all integers. Pure data: no imports.
//
//   TRADE.yards       the Camp's timber yard (slot 0, line 1) and the Quarry's stone yard (slot 1, line 2): the halt
//                     a train loads at, a crate every `everyTicks` up to `cap`, and the Town field it delivers to at
//                     its line's `home` halt (the Village); each yard row starts full (stock = made = cap)
//   TRADE.freightCap  the crates one train carries
//   TRADE.loadStop    R2b: the crates a middle-halt yard must hold (and an empty train have room for) before a train
//                     heading home makes a service stop for them: a whole trainload (the full-load stop)
//   TRADE.plots       by town, its priced plots in order: the timber and stone the town must have received before
//                     each is staked (R2; the prices come with the buy, R4); at most `stakedAtOnce` staked unbought
//   TRADE.routes      R3: each town's passenger route (town, line, halts a and b) and the riders', fares' and box's
//                     numbers; TRADE_PCT the tunables' defaults
export type TradeYard = {
  /** Its line (RAIL_LINES index) and the halt on it a train loads at, heading home. */
  line: number;
  stop: number;
  /** One crate every this many ticks while the trains run, up to `cap`. */
  everyTicks: number;
  cap: number;
  /** Its destination, named on the row (hub towns, 12 November: never inferred from the line): the town (Town slot),
   * the halt on its line its freight unloads at, and the Town field it counts in. */
  town: number;
  home: number;
  goods: 'wood' | 'stone';
  /** R2b: its full-load stop is made only once this is met ('pier': the pier's twelve footings set). */
  after?: 'pier';
};
/** R3: a town's passenger route on one line, between its halts `a` and `b` (stop indices, `a` < `b`; `b: 'end'` is the
 * line's current open end): riders wait at each end for the other, one destination a route (so a train's riders are
 * one integer). */
export type TradeRoute = { town: number; line: number; a: number; b: number | 'end' };
/** A plot's staking thresholds: the town's delivered timber and stone. */
export type TradePlot = { wood: number; stone: number };
export const TRADE = {
  yards: [
    { line: 0, stop: 1, everyTicks: 150, cap: 8, town: 0, home: 0, goods: 'wood' },
    { line: 1, stop: 1, everyTicks: 300, cap: 8, town: 0, home: 0, goods: 'stone', after: 'pier' },
  ] as const satisfies readonly TradeYard[],
  freightCap: 8,
  // R2b (the freight-stops ruling, call 5): a whole trainload.
  loadStop: 8,
  // R2: cargo stakes plots (call 1). The Village's first three; plots 4 to 8 stay unstaked until priced.
  plots: [
    [
      { wood: 8, stone: 0 },
      { wood: 24, stone: 0 },
      { wood: 40, stone: 16 },
    ],
  ] as const satisfies readonly (readonly TradePlot[])[],
  stakedAtOnce: 2,
  // R3: riders, fares and the strongbox (the plan's "Numbers"; Decided: the fare formula, the box's cap rule, two
  // starting buildings, 2 riders a minute a building each way).
  // The Village and line 2's current far end (the ruling of 12 November): Far Head, then the Pier, the Railhead, Ring
  // Island as the line grows.
  routes: [{ town: 0, line: 1, a: 0, b: 'end' }] as const satisfies readonly TradeRoute[],
  ridersPerMin: 2,
  startBuildings: 2,
  /** Riders who wait at one end at most; the rest give up. */
  crowdCap: 24,
  seats: 4,
  fare: { board: 2, per100m: 1 },
  /** The box holds the larger of `incomeMin` minutes of income or `dearestNum / dearestDen` of the dearest thing on
   * offer; fares past it do not land. */
  box: { incomeMin: 20, dearestNum: 3, dearestDen: 2 },
  sackMin: 15,
} as const;
/** The room's trade tunables (src/sim/tune.ts railFarePct, railRiderPct; railPricePct is R4's), in percent. */
export type TradePct = { farePct: number; riderPct: number };
export const TRADE_PCT: TradePct = { farePct: 100, riderPct: 100 };
/** A town's rider accrual unit: `acc` gains buildings × ridersPerMin × riderPct a tick, so a whole rider a minute per
 * unit of rate is 600 ticks × 100 percent. */
export const RIDER_UNIT = 600 * 100;
/** The towns (Town rows by slot): the Village only. */
export const TRADE_TOWNS = 1;

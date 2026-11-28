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
//                     each is staked, and its base price; at most `stakedAtOnce` staked unbought
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
export type TradeRoute = { town: number; farTowns: readonly number[]; line: number; a: number; b: number | 'end' };
/** A plot's staking thresholds: the town's delivered timber and stone. */
export const PLOT_KIND = {
  plain: 0,
  seeds: 1,
  horns: 2,
  disc: 3,
  golf: 4,
  dunk: 5,
  lookout: 6,
  bell: 7,
  echo: 8,
  perch: 9,
  net: 10,
  chime: 11,
} as const;
export type TradePlot = {
  wood: number;
  stone: number;
  base: number;
  riders: number;
  gives?: 'loader';
  after?: 'ring' | 'gorge' | 'canopy';
  spare?: boolean;
  choices?: readonly number[];
};
export function validPlotKind(plot: TradePlot, kind: unknown, firstKind: number): kind is number {
  if (plot.spare && (!firstKind || firstKind === kind)) return false;
  return plot.choices ? typeof kind === 'number' && plot.choices.includes(kind) : kind === PLOT_KIND.plain;
}
export const TRADE = {
  yards: [
    { line: 0, stop: 1, everyTicks: 150, cap: 8, town: 0, home: 0, goods: 'wood' },
    { line: 1, stop: 1, everyTicks: 300, cap: 8, town: 0, home: 0, goods: 'stone', after: 'pier' },
  ] as const satisfies readonly TradeYard[],
  freightCap: 8,
  // R2b (the freight-stops ruling, call 5): a whole trainload.
  loadStop: 8,
  // R2: cargo stakes priced plots. Later slots remain unstaked.
  plots: [
    [
      { wood: 8, stone: 0, base: 300, riders: 1, choices: [PLOT_KIND.seeds, PLOT_KIND.horns] },
      { wood: 24, stone: 0, base: 800, riders: 0, gives: 'loader' },
      {
        wood: 40,
        stone: 16,
        base: 800,
        riders: 1,
        spare: true,
        choices: [PLOT_KIND.seeds, PLOT_KIND.horns, PLOT_KIND.disc],
      },
      { wood: 56, stone: 24, base: 800, riders: 1, choices: [PLOT_KIND.golf, PLOT_KIND.dunk] },
    ],
    [{ wood: 0, stone: 0, base: 300, riders: 1, after: 'ring', choices: [PLOT_KIND.lookout, PLOT_KIND.bell] }],
    [{ wood: 0, stone: 0, base: 300, riders: 1, after: 'gorge', choices: [PLOT_KIND.echo, PLOT_KIND.perch] }],
    [{ wood: 0, stone: 0, base: 300, riders: 1, after: 'canopy', choices: [PLOT_KIND.net, PLOT_KIND.chime] }],
  ] as const satisfies readonly (readonly TradePlot[])[],
  stakedAtOnce: 2,
  houseOrder: 2,
  buildTicks: 100,
  // R3: riders, fares and the strongbox (the plan's "Numbers"; Decided: the fare formula, the box's cap rule, two
  // starting buildings, 1 rider a minute a building each way).
  // The Village and line 2's current far end (the ruling of 12 November): Far Head, then the Pier, the Railhead, Ring
  // Island as the line grows.
  routes: [{ town: 0, line: 1, a: 0, b: 'end', farTowns: [1, 2, 3] }] as const satisfies readonly TradeRoute[],
  ridersPerMin: 1,
  startBuildings: 2,
  /** Waiting riders that would stop a train at a middle route halt (decided: four or more). Unused in this slice:
   * riders never add a stop (the ruling of 12 November, call 4); kept for the plan that builds the stop. */
  crowdStop: 4,
  /** Riders who wait at one end at most; the rest give up. */
  crowdCap: 24,
  /** Eight in the riders' coach, separate from player seats. */
  riderPlaces: 8,
  fare: { board: 2, per100m: 1 },
  /** The box holds the larger of `incomeMin` minutes of income or `dearestNum / dearestDen` of the dearest thing on
   * offer; fares past it do not land. */
  box: { incomeMin: 20, dearestNum: 3, dearestDen: 2 },
  sackMin: 15,
} as const;
/** Passenger route on a line, or -1. Shared by the rules and the local consist without loading world queries. */
export const lineRoute = (line: number): number => TRADE.routes.findIndex((r) => r.line === line);
/** The room's trade tunables (src/sim/tune.ts railFarePct, railRiderPct, railPricePct), in percent. */
export type TradePct = { farePct: number; riderPct: number; pricePct?: number };
export const TRADE_PCT = { farePct: 100, riderPct: 100, pricePct: 50 } satisfies TradePct;
/** A town's rider accrual unit: `acc` gains buildings × ridersPerMin × riderPct a tick, so a whole rider a minute per
 * unit of rate is 600 ticks × 100 percent. */
export const RIDER_UNIT = 600 * 100;
/** A Town and rider clock for each town with priced plots. */
export const TRADE_TOWNS = TRADE.plots.length;

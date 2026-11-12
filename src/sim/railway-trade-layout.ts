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
} as const;
/** The towns (Town rows by slot): the Village only. */
export const TRADE_TOWNS = 1;

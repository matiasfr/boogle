// The town economy's numbers (docs/plans/slice5-town-economy.md, "Numbers"; call 5: the one home for them, which
// dev/economy/trade-data.ts reads and src/sim never imports back). All stand-ins, all integers. Pure data: no imports.
//
//   TRADE.yards       the Camp's timber yard (slot 0, line 1) and the Quarry's stone yard (slot 1, line 2): the halt
//                     a train loads at, a crate every `everyTicks` up to `cap`, and the Town field it delivers to at
//                     its line's `home` halt (the Village); each yard row starts full (stock = made = cap)
//   TRADE.freightCap  the crates one train carries
export type TradeYard = {
  /** Its line (RAIL_LINES index) and the halt on it a train loads at, heading home. */
  line: number;
  stop: number;
  /** One crate every this many ticks while the trains run, up to `cap`. */
  everyTicks: number;
  cap: number;
  /** The halt its freight unloads at (the line's Village halt) and the Town field it counts in. */
  home: number;
  goods: 'wood' | 'stone';
};
export const TRADE = {
  yards: [
    { line: 0, stop: 1, everyTicks: 150, cap: 8, home: 0, goods: 'wood' },
    { line: 1, stop: 1, everyTicks: 300, cap: 8, home: 0, goods: 'stone' },
  ] as const satisfies readonly TradeYard[],
  freightCap: 8,
} as const;
/** The towns (Town rows by slot): the Village only. */
export const TRADE_TOWNS = 1;

// Seeds for slice 5's town economy (docs/plans/slice5-town-economy.md, "Jump-in stages"), on ./railway-seed-route.ts's
// `trains-on` (./railway-seeds.ts is the catalog and how to add a stage). Accepted sim ops and ticks only, no direct
// state writes.
//
//   freight-running   trains-on advanced until the Village has its first timber (Town.wood >= 8): line 1's train
//                     home from the Camp with a full load
//   fares-running     R3: freight-running advanced until the strongbox holds 100 Boogles (riders' fares, Village to
//                     Far Head)
import { invariant, need } from './railway-drive.ts';
import { advance, railwayAtTrains, type Seed } from './railway-seed-route.ts';
import { till, town } from './railway-rows.ts';
import { TRADE } from './railway-trade-layout.ts';

export type TradeStage = 'freight-running' | 'fares-running';
export const TRADE_STAGES: readonly TradeStage[] = ['freight-running', 'fares-running'];

/** The railway at a trade stage. */
export function railwayAtTrade(stage: TradeStage): Seed {
  need(TRADE_STAGES.includes(stage), stage);
  const s = railwayAtTrains('trains-on');
  let waited = 0;
  // One full load (and plot 1's timber, slice 5's R2).
  while (town(s.w, 0).wood < TRADE.freightCap) {
    need(waited++ <= 6000, `${stage}: no timber reached the Village`);
    advance(s, 1);
  }
  if (stage === 'fares-running')
    while (till(s.w).boogles < 100) {
      need(waited++ <= 12000, `${stage}: no fares landed`);
      advance(s, 1);
    }
  const broken = invariant(s.w);
  need(broken === null, `railwayAtTrade ${stage}: ${broken}`);
  return s;
}

// Seeds for slice 5's town economy (docs/plans/slice5-town-economy.md, "Jump-in stages"), on ./railway-seed-route.ts's
// `trains-on` (./railway-seeds.ts is the catalog and how to add a stage). Accepted sim ops and ticks only, no direct
// state writes.
//
//   freight-running   trains-on advanced until the Village has its first timber (Town.wood >= 8): line 1's train
//                     home from the Camp with a full load
//   fares-running     R3: freight-running advanced until the strongbox holds 100 Boogles (riders' fares, Village to
//                     Far Head)
import { invariant, need } from './railway-drive.ts';
import { act, advance, railwayAtTrains, type Seed } from './railway-seed-route.ts';
import { till, town } from './railway-rows.ts';
import { plotPrice, plotsStaked } from './railway-queries-trade.ts';
import { TRADE, TRADE_PCT } from './railway-trade-layout.ts';
import { railAwayCredit } from './railway-away.ts';
import { railResume } from './railway-sys-away.ts';

export type TradeStage =
  'freight-running' | 'fares-running' | 'house-ready' | 'house-built' | 'sack-waiting' | 'yard-ready' | 'yard-built';
export const TRADE_STAGES: readonly TradeStage[] = [
  'freight-running',
  'fares-running',
  'house-ready',
  'house-built',
  'sack-waiting',
  'yard-ready',
  'yard-built',
];

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
  if (stage !== 'freight-running')
    while (till(s.w).boogles < 100) {
      need(waited++ <= 12000, `${stage}: no fares landed`);
      advance(s, 1);
    }
  if (
    stage === 'house-ready' ||
    stage === 'house-built' ||
    stage === 'sack-waiting' ||
    stage === 'yard-ready' ||
    stage === 'yard-built'
  ) {
    while (till(s.w).boogles < plotPrice(s.w, 0, 0, TRADE_PCT.pricePct)) {
      need(waited++ <= 18000, `${stage}: first house never affordable`);
      advance(s, 1);
    }
    if (stage !== 'house-ready') {
      need(act(s, 'a', 'rail.buy', { id: 0, kind: 1 }) === 1, 'house-built: buy refused');
      advance(s, TRADE.buildTicks);
    }
  }
  if (stage === 'yard-ready' || stage === 'yard-built') {
    while (!plotsStaked(s.w, 0).includes(1) || till(s.w).boogles < plotPrice(s.w, 0, 1, TRADE_PCT.pricePct)) {
      need(waited++ <= 36000, `${stage}: loader yard never affordable`);
      advance(s, 1);
    }
    if (stage === 'yard-built') {
      need(act(s, 'a', 'rail.buy', { id: 1 }) === 1, 'yard-built: buy refused');
      advance(s, TRADE.buildTicks);
    }
  }
  if (stage === 'sack-waiting') {
    const away = 8 * 36000;
    railResume(s.w, Number.MAX_SAFE_INTEGER, away, s.t, railAwayCredit(away));
  }
  const broken = invariant(s.w);
  need(broken === null, `railwayAtTrade ${stage}: ${broken}`);
  return s;
}

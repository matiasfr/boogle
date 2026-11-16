// Cosmetic/Local over the replicated till and room tunables; no money or time is accumulated here.
import type { OwnedView } from '../../render/owned-view.ts';
import type { RailwayAdapter } from '../../adapters/railway-session.ts';
import { instantiate } from '../../prefab/instantiate.ts';
import { loadLevelArtifact } from '../../prefab/validate.ts';
import { compiled } from '../../prefab/catalogue.ts';
import kit from '../../../content/built/levels/railway-till.json' with { type: 'json' };
import { HALL, TILL } from '../../place/home-station.ts';
import { ORIGIN } from '../../place/layout.ts';
import { till } from '../../sim/railway-rows.ts';
import { boxCap } from '../../sim/railway-queries-trade.ts';

export function createTill(adapter: RailwayAdapter, owner: OwnedView) {
  const [counterRecord, coinsRecord] = loadLevelArtifact(kit, compiled.prefabs).placements;
  const counter = instantiate(
    'railway.till',
    {
      ...counterRecord!,
      pos: [ORIGIN.x + TILL.x, HALL.floor, TILL.z],
      rot: [TILL.yaw, 0, 0],
    },
    { owner, texts: { balance: ['0', 'Boogles'] } },
  );
  const coins = instantiate('railway.till-coins', coinsRecord!, { owner });
  counter.root.add(coins.root);
  counter.setEnabled(true);
  coins.setEnabled(true);
  let drawn = -1;
  return {
    update() {
      const w = adapter.read.world(),
        n = till(w).boogles;
      const cap = boxCap(w, adapter.read.trade());
      coins.root.visible = n > 0 && cap > 0;
      coins.root.scale.y = cap > 0 ? Math.min(1, n / cap) : 0;
      if (n !== drawn) {
        drawn = n;
        counter.relabel('sign', [String(n), 'Boogles']);
      }
    },
  };
}

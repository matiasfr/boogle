// Cosmetic/Local: two crowds read the route's waiting rows, never an assumed accrual rate.
import type { RailwayAdapter } from '../../adapters/railway-session.ts';
import type { OwnedView } from '../../render/owned-view.ts';
import { instantiate } from '../../prefab/instantiate.ts';
import { loadLevelArtifact } from '../../prefab/validate.ts';
import { compiled } from '../../prefab/catalogue.ts';
import kit from '../../../content/built/levels/railway-till.json' with { type: 'json' };
import { TRADE } from '../../sim/railway-trade-layout.ts';
import { town } from '../../sim/railway-rows.ts';
import { routeFar } from '../../sim/railway-queries-trade.ts';
import { railCallPlatform, trainStops } from '../../sim/railway-queries-trains.ts';
import { line2Trains } from '../../sim/railway-queries-line2.ts';
import { LINE_HALTS } from '../../sim/railway-train.ts';
import { line2At } from './line2-path.ts';
import { folk } from '../../place/folk.ts';

export function createRiders(adapter: RailwayAdapter, owner: OwnedView) {
  const boards = loadLevelArtifact(kit, compiled.prefabs)
    .placements.slice(2)
    .map((p) => instantiate('railway.waiting-board', p, { owner, texts: { waiting: ['0', 'Waiting'] } }));
  const drawn = [-1, -1];
  const route = TRADE.routes[0];
  const tangent = { x: 0, z: 0, ux: 0, uz: 1 };
  const hide = () => {
    for (let end = 0; end < 2; end++) folk.setWaiting(end, 0, () => ({ x: 0, y: 0, z: 0, yaw: 0 }));
  };
  owner.cleanup(hide);
  return {
    update() {
      const w = adapter.read.world(),
        on = line2Trains(w),
        row = town(w, route.town);
      const stops = trainStops(w, route.line);
      for (let end = 0; end < 2; end++) {
        const stop = end ? routeFar(w, 0) : route.a;
        const halt = LINE_HALTS.findIndex((h) => h.line === route.line && h.stop === stop);
        const platform = railCallPlatform(w, halt, end ? -1 : 1, adapter.read.tickNow());
        line2At(stops[stop]! / 100, tangent);
        const { ux, uz } = tangent;
        const facing = end ? -1 : 1;
        const yaw = Math.atan2(-uz * facing, ux * facing);
        const at = (along: number, across: number) => ({
          x: platform.x / 100 + ux * along - uz * across,
          y: platform.y / 100,
          z: platform.z / 100 + uz * along + ux * across,
          yaw,
        });
        const n = on ? (end ? row.wait1 : row.wait0) : 0;
        // Two rows of six face their track, with a small stagger. Leave the island's central lane and the
        // far platform's bench (5 m behind its centre), signal and lever clear.
        folk.setWaiting(end, Math.min(12, n), (k) =>
          at(
            -1.9 + (k % 6) * 0.85 + Math.floor(k / 6) * 0.12,
            (end ? -0.3 : 1.25) + Math.floor(k / 6) * (end ? 0.7 : -0.7),
          ),
        );
        const board = boards[end]!;
        board.setEnabled(n > 12);
        const p = at(3.4, end ? 0 : 0.8);
        board.root.position.set(p.x, p.y, p.z);
        board.root.rotation.y = yaw;
        if (n !== drawn[end]) {
          drawn[end] = n;
          board.relabel('sign', [String(n), 'Waiting']);
        }
      }
    },
  };
}

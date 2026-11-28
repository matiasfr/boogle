// Cosmetic/Local: two crowds read the route's waiting rows, never an assumed accrual rate.
import type { RailwayAdapter } from '../../adapters/railway-session.ts';
import type { OwnedView } from '../../render/owned-view.ts';
import { instantiate } from '../../prefab/instantiate.ts';
import { loadLevelArtifact } from '../../prefab/validate.ts';
import { compiled } from '../../prefab/catalogue.ts';
import kit from '../../../content/built/levels/railway-till.json' with { type: 'json' };
import { TRADE } from '../../sim/railway-trade-layout.ts';
import { Town } from '../../sim/railway-components.ts';
import { routeFar } from '../../sim/railway-queries-trade.ts';
import { railCallPlatform, trainStops } from '../../sim/railway-queries-trains.ts';
import { ringHead, ringOpen } from '../../sim/railway-queries.ts';
import { RING_HEAD } from '../../sim/railway-ring-layout.ts';
import type { RailPlatform } from '../../sim/railway-lines.ts';
import { line2Trains } from '../../sim/railway-queries-line2.ts';
import { LINE_HALTS } from '../../sim/railway-train.ts';
import { line2At } from './line2-path.ts';
import { folk } from '../../place/folk.ts';
import { deckPlatform } from './railhead-shape.ts';
import { railheadEnd } from './railhead-state.ts';

/** Line 2's Railhead halt (its stop): its waiting crowd rides the deck out while the trains' stop waits for the haul. */
const RAILHEAD = 4;

export function createRiders(adapter: RailwayAdapter, owner: OwnedView) {
  const boards = loadLevelArtifact(kit, compiled.prefabs)
    .placements.slice(2)
    .map((p) => instantiate('railway.waiting-board', p, { owner, texts: { waiting: ['0', 'Waiting'] } }));
  const route = TRADE.routes[0];
  const halts = new Map<number, number>();
  LINE_HALTS.forEach((h, i) => {
    if (h.line === route.line) halts.set(h.stop, i);
  });
  const crowds = boards.map((board, end) => {
    const point = { x: 0, y: 0, z: 0, yaw: 0 };
    const crowd = {
      count: -1,
      stop: -1,
      platform: null as RailPlatform | null,
      remaining() {
        const w = adapter.read.world();
        const row = w.get(Town, w.lookup(Town, route.town)!)!;
        return end ? row.wait1 : row.wait0;
      },
      tangent: { x: 0, z: 0, ux: 0, uz: 1 },
      at(k: number) {
        const { ux, uz } = crowd.tangent,
          p = crowd.platform!,
          along = -1.9 + (k % 6) * 0.85 + Math.floor(k / 6) * 0.12,
          across = (end ? -0.3 : 1.25) + Math.floor(k / 6) * (end ? 0.7 : -0.7);
        point.x = p.x / 100 + ux * along - uz * across;
        point.y = p.y / 100;
        point.z = p.z / 100 + uz * along + ux * across;
        point.yaw = Math.atan2(-uz * (end ? -1 : 1), ux * (end ? -1 : 1));
        return point;
      },
    };
    board.setEnabled(false);
    return crowd;
  });
  const hide = () => {
    for (let end = 0; end < crowds.length; end++) {
      const crowd = crowds[end]!;
      if (crowd.count < 0) continue;
      crowd.count = -1;
      folk.setWaiting(end, 0, crowd.at);
      boards[end]!.setEnabled(false);
    }
  };
  owner.cleanup(hide);
  function update() {
    const w = adapter.read.world(),
      id = w.lookup(Town, route.town),
      row = id === undefined ? undefined : w.get(Town, id);
    if (!row || !line2Trains(w)) {
      hide();
      return;
    }
    const stops = trainStops(w, route.line);
    for (let end = 0; end < crowds.length; end++) {
      const crowd = crowds[end]!;
      const stop = end ? routeFar(w, 0) : route.a;
      const halt = halts.get(stop)!;
      // While the deck hauls out and the trains' stop is still the old head (docs/plans/railhead-reroute.md), the
      // Railhead's crowd rides the drawn deck's platform, so at the settle it stands on the new one: no 20 m jump. They
      // still board a train at the old head, as the sim has it (the plan's accepted gap: at most 20 m for about 6 s).
      const riding = end === 1 && stop === RAILHEAD && ringHead(w) !== ringOpen(w).head;
      const deckEnd = riding ? railheadEnd() : 0;
      const platform = riding ? deckPlatform(deckEnd) : railCallPlatform(w, halt, end ? -1 : 1, adapter.read.tickNow());
      const raw = end ? row.wait1 : row.wait0;
      const n = Number.isFinite(raw) ? Math.max(0, Math.floor(raw)) : 0;
      // Counts can stay fixed while the route grows or its boarding side changes. Repose on either edge.
      const was = crowd.platform;
      const moved = stop !== crowd.stop || !was || was.x !== platform.x || was.y !== platform.y || was.z !== platform.z;
      if (n === crowd.count && !moved) continue;
      if (moved) {
        crowd.stop = stop;
        crowd.platform = platform;
        const s = stops[stop]! + (riding ? Math.round(deckEnd * 100) - RING_HEAD[ringOpen(w).head]!.u : 0);
        line2At(s / 100, crowd.tangent);
      }
      const { ux, uz } = crowd.tangent;
      const facing = end ? -1 : 1;
      const yaw = Math.atan2(-uz * facing, ux * facing);
      // Two rows of six face their track, with a small stagger. Leave the island's central lane and the
      // far platform's bench (5 m behind its centre), signal and lever clear.
      folk.setWaiting(end, Math.min(12, n), crowd.at, riding ? -1 : stop, crowd.remaining);
      const board = boards[end]!;
      board.setEnabled(n > 12);
      if (moved) {
        const across = end ? 0 : 0.8;
        board.root.position.set(
          platform.x / 100 + ux * 3.4 - uz * across,
          platform.y / 100,
          platform.z / 100 + uz * 3.4 + ux * across,
        );
        board.root.rotation.y = yaw;
      }
      if (n !== crowd.count) {
        crowd.count = n;
        board.relabel('sign', [String(n), 'Waiting']);
      }
    }
  }
  return {
    update,
    restore() {
      for (const crowd of crowds) crowd.count = -1;
      update();
    },
  };
}

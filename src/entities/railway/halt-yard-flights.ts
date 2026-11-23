// A bin borrows the existing deposit flights. The adapter delivers predicted transfers once and returns lost races.
import * as THREE from 'three/webgpu';
import type { RailwayAdapter } from '../../adapters/railway-session.ts';
import type { OwnedView } from '../../render/owned-view.ts';
import { balanceOf, LOGS, railAccount } from '../../sim/railway-queries.ts';
import { haltYardStock } from '../../sim/railway-queries-yard.ts';
import { send } from '../../place/pieces.ts';
import { knock } from '../../render/fanfare.ts';
import type { yardStock } from './halt-yard-stock.ts';
import type { createRailwaySources } from './sources.ts';

export type Bin = { stock: ReturnType<typeof yardStock>; flights: { active: () => boolean; incoming: boolean }[] };
export type YardSources = Pick<
  Awaited<ReturnType<typeof createRailwaySources>>,
  'bundleOrigin' | 'villageBins' | 'incomingLog'
>;
export function yardFlights(adapter: RailwayAdapter, owner: OwnedView, bins: Bin[][], sources: YardSources) {
  const back = new THREE.Vector3();
  owner.cleanup(
    adapter.onAccepted((event) => {
      if (event.op !== 'rail.haltPut' && event.op !== 'rail.haltTake' && event.op !== 'rail.rackTake') return;
      const rack = event.op === 'rail.rackTake';
      const yard = rack ? 0 : event.yard;
      const kind = event.kind ?? 0;
      const bin = bins[yard]![kind]!;
      const put = event.op === 'rail.haltPut';
      for (let i = 0; i < event.accepted - (event.returned ?? 0); i++) {
        const point = bin.stock.point((event.level ?? 0) + (put ? -i : i + 1));
        if (!sources.bundleOrigin(event.pid, (event.carried ?? 0) + (put ? i : 0), back)) continue;
        const active = send(
          (['log', 'stone', 'rail'] as const)[kind],
          put ? back : point,
          put ? point : back,
          {
            dur: 0.33,
            delay: i * 0.022,
            apex: 0.7,
            aim: put
              ? undefined
              : (out) => {
                  sources.bundleOrigin(event.pid, event.carried ?? 0, out);
                },
            land: () => knock(0.35, 0.7),
          },
          owner,
        );
        bin.flights.push({ active, incoming: put });
        if (!put && kind === LOGS && event.pid === adapter.read.pid) sources.incomingLog(active);
      }
    }),
  );
  owner.cleanup(
    adapter.onCorrected(({ event, lost, winner }) => {
      if (event.op !== 'rail.haltPut' && event.op !== 'rail.haltTake') return;
      const { yard, kind } = event;
      const bin = bins[yard]![kind]!;
      const put = event.op === 'rail.haltPut';
      const w = adapter.read.world();
      const account = railAccount(w, adapter.read.pid);
      const held = account ? balanceOf(account, kind) : 0;
      for (let i = 0; i < lost; i++) {
        if (!sources.bundleOrigin(event.pid, held + i, back)) continue;
        const home = bin.stock.point(haltYardStock(w, yard, kind) + 1);
        if (back.distanceTo(home) > 6) continue;
        const active = send(
          (['log', 'stone', 'rail'] as const)[kind],
          put ? home : back,
          put ? back : home,
          {
            dur: 0.3,
            apex: 0.8,
            aim:
              !put && winner
                ? (out) => {
                    sources.bundleOrigin(winner, i, out);
                  }
                : undefined,
            land: () => knock(0.35, 0.7),
          },
          owner,
        );
        bin.flights.push({ active, incoming: false });
      }
    }),
  );
  owner.cleanup(
    adapter.onReset(() => {
      for (const row of bins) for (const bin of row) bin.flights.length = 0;
    }),
  );
}

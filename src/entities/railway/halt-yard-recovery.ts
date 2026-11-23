// Supply is host maintenance, without an actor receipt. A missing pile and the matching credit on the published
// yard row show its transfer. A take, a manual deposit or a refill cannot start a recovery flight.
import * as THREE from 'three/webgpu';
import type { RailwayAdapter } from '../../adapters/railway-session.ts';
import type { OwnedView } from '../../render/owned-view.ts';
import { Pile } from '../../sim/railway-components.ts';
import { haltYardStock, nearestOpenYard } from '../../sim/railway-queries-yard.ts';
import { railClock, type ReadWorld } from '../../sim/railway-rows.ts';
import { RECOVERY_MINUTES } from '../../sim/railway-supply.ts';
import { send } from '../../place/pieces.ts';
import { knock } from '../../render/fanfare.ts';
import type { Bin } from './halt-yard-flights.ts';

export function yardRecoveries(adapter: RailwayAdapter, owner: OwnedView, bins: Bin[][]) {
  let last: ReadWorld | null = null;
  const taken = new Set<number>();
  const deposits = new Set<Bin>();
  owner.cleanup(
    adapter.onAccepted((e) => {
      if (e.op === 'rail.take') taken.add(e.pile ?? e.id);
      if (e.op === 'rail.haltPut') deposits.add(bins[e.yard]![e.kind]!);
    }),
  );
  owner.cleanup(
    adapter.onReset(() => {
      last = null;
      taken.clear();
      deposits.clear();
    }),
  );
  return (w: ReadWorld) => {
    if (adapter.read.pending() || w === last) return;
    const before = last;
    last = w;
    if (before && before.count(Pile)) {
      const minutes = railClock(w).supplyMarker - railClock(before).supplyMarker;
      before.each([Pile], (id, p) => {
        if (
          (p.kind !== 0 && p.kind !== 1) ||
          w.has(Pile, id) ||
          taken.has(id) ||
          (!minutes && p.age < RECOVERY_MINUTES)
        )
          return;
        const yard = nearestOpenYard(w, p.x, p.z);
        const bin = bins[yard]![p.kind]!;
        const stock = haltYardStock(w, yard, p.kind);
        if (deposits.has(bin) || stock - haltYardStock(before, yard, p.kind) < p.n) return;
        const from = new THREE.Vector3(p.x / 100, p.y / 100 + 0.25, p.z / 100);
        for (let i = 0; i < p.n; i++) {
          const active = send(
            p.kind === 0 ? 'log' : 'stone',
            from,
            bin.stock.point(stock - i),
            {
              dur: 0.75,
              delay: i * 0.035,
              apex: 2,
              land: () => knock(0.35, 0.7),
            },
            owner,
          );
          bin.flights.push({ active, incoming: true });
        }
      });
    }
    taken.clear();
    deposits.clear();
  };
}

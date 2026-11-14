// Wall-clock supply pulses and the admission freshness gate. No carry or lifecycle state lives here.
import { RAILWAY_SOURCES } from '../../../src/sim/railway-layout.ts';
import { railGrowthMask, railGrows, railGrowthAllowed, type SupplyPulse } from '../../../src/sim/railway-supply.ts';
import { railNobodyNear, type RailwayPosition } from './railway-supply.ts';
import type { RailwayApi } from '../../../src/world/railway-server.ts';

export function createHostSupply({
  api,
  now,
  positions,
  available,
}: {
  api: RailwayApi;
  now: () => number;
  positions: () => (RailwayPosition | null)[];
  available: () => boolean;
}) {
  const supplySafe = (e: SupplyPulse) => {
    const people = positions();
    const beam = api.beam();
    const boiler = api.boiler();
    return (
      RAILWAY_SOURCES.every((_source, k) => !railGrows(e.grow, k) || railGrowthAllowed(k, true)) &&
      (e.beam === undefined ||
        (beam.state === 'ground' &&
          beam.revision === e.beam &&
          beam.age === 21 &&
          railNobodyNear(people, now(), beam.x, beam.z))) &&
      (e.boiler === undefined ||
        (boiler.state === 'ground' &&
          boiler.revision === e.boiler &&
          boiler.age === 21 &&
          railNobodyNear(people, now(), boiler.x, boiler.z))) &&
      e.recover.every((id) => {
        const pile = api.piles().find((p) => p.id === id);
        return !!pile && railNobodyNear(people, now(), pile.x, pile.z);
      })
    );
  };
  // At most one supply pulse per rule tick: the wall-clock minute marker, regrowth and one recovered pile.
  const maintainSupply = () => {
    if (!available()) return;
    const marker = Math.floor(now() / 60000);
    if (marker < api.supplyMarker()) return;
    const people = positions();
    const recover = api
      .piles()
      .filter(
        (pile) => (marker > api.supplyMarker() || pile.age === 21) && railNobodyNear(people, now(), pile.x, pile.z),
      )
      .map((pile) => pile.id)
      .sort((a, b) => a - b)
      .slice(0, 1);
    const ground = api.beam();
    const beam =
      ground.state === 'ground' && ground.age === 21 && railNobodyNear(people, now(), ground.x, ground.z)
        ? ground.revision
        : undefined;
    const b = api.boiler();
    const boiler =
      b.state === 'ground' && b.age === 21 && railNobodyNear(people, now(), b.x, b.z) ? b.revision : undefined;
    if (marker === api.supplyMarker() && !recover.length && beam === undefined && boiler === undefined) return;
    const grow = railGrowthMask(
      RAILWAY_SOURCES.flatMap((_source, k) => (api.felled(k) && railGrowthAllowed(k, true) ? [k] : [])),
    );
    const pulse: SupplyPulse = {
      marker,
      grow,
      recover,
      ...(beam === undefined ? {} : { beam }),
      ...(boiler === undefined ? {} : { boiler }),
    };
    if (supplySafe(pulse)) api.supply(pulse);
  };
  // New material may not inherit an unprocessed absence from the global supply marker.
  // One minute is the deliberately conservative 21/31-minute quantization; marker zero has no elapsed age.
  const supplyCurrent = () => !api.supplyMarker() || Math.floor(now() / 60000) - api.supplyMarker() <= 1;

  return { maintain: maintainSupply, current: supplyCurrent };
}

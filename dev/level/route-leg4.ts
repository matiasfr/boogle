// Catalog marks for leg 4. Steps 4 and 5 add the placed platforms, hood and flood.
import { readFileSync } from 'node:fs';
import { ORIGIN } from '../../src/place/layout.ts';
import { inside, layout, parseMapPage, type XZ } from '../../src/sickle/map-data.ts';
import { consistOf } from '../../src/entities/railway/cars.ts';
import { ENGINE_BOILER, ENGINE_CAB } from '../../src/entities/railway/engine.ts';
import { HEAD_BACK_CM, RAIL_LEGS, legFrame, legRack, rowPoint } from '../../src/sim/railway-route.ts';
import { WORLD_LINES } from '../../src/sim/railway-world-lines.ts';

function shoreDistance(p: XZ, outline: XZ[]) {
  const distances = outline.map(([x, z], i) => {
    const q = outline[(i + 1) % outline.length]!,
      dx = q[0] - x,
      dz = q[1] - z;
    const t = Math.max(0, Math.min(1, ((p[0] - x) * dx + (p[1] - z) * dz) / (dx * dx + dz * dz || 1)));
    return Math.hypot(p[0] - x - t * dx, p[1] - z - t * dz);
  });
  return Math.min(...distances) * (inside(p, outline) ? 1 : -1);
}

export function checkLeg4() {
  const leg = RAIL_LEGS.find((l) => l.id === 'cave')!,
    row = WORLD_LINES.find((l) => l.id === leg.row)!;
  const entries: { message: string; passed: boolean }[] = [];
  const check = (message: string, passed: boolean) => entries.push({ message, passed });
  const rack = legRack(leg, 0),
    frame = legFrame(leg, 0);
  const carry = Math.hypot(rack.x - frame.x, rack.z - frame.z) / 100;
  check(`West landing cave rack to plug frame ${carry.toFixed(2)} m`, carry < 7);
  for (const [k, section] of leg.sections.slice(0, -1).entries()) {
    const s = section.toCm - HEAD_BACK_CM;
    const y = rowPoint('cave', s).y;
    check(
      `Cave head ${k + 1} platform level at ${y / 100} m`,
      [-2000, -1000, 1000, 2000].every((offset) => rowPoint('cave', s + offset).y === y),
    );
  }
  const map = layout(
    parseMapPage(readFileSync(new URL('../../docs/world/map-prototypes.html', import.meta.url), 'utf8')),
    'sickle',
    'A',
  );
  for (const [index, isle, minimum] of [
    [1, 'salt-land', 0],
    [2, 'port-isle', 10],
  ] as const) {
    const h = row.halts[index]!,
      outline = map.land.find((l) => l.id === isle)!.outline;
    const distance = shoreDistance([h.x / 100 - ORIGIN.x, h.z / 100 - ORIGIN.z], outline);
    check(`${h.name} stop ${distance.toFixed(2)} m inside the shore`, distance > minimum);
  }
  const crossover = row.ends.find((e) => e.at === 'start')!.sCm / 100;
  const consist = consistOf({ line: leg.line, steel: false, wagon: false });
  const side = 6.5 - (2 + Math.max(...consist.map((c) => c.spec.hx)));
  const trainTop = Math.max(
    ENGINE_CAB.roofTop,
    ENGINE_BOILER.chimney.y,
    ENGINE_BOILER.top,
    ...consist.map((c) => c.spec.top),
  );
  const overhead = 7 - trainTop;
  check(
    `Planned hood over crossover at ${crossover} m: ${side.toFixed(2)} m side, ${overhead.toFixed(3)} m overhead`,
    crossover - 10 >= 45 && crossover + 10 <= 80 && side > 0 && overhead > 0,
  );
  return { level: 'route leg 4 (planned)', entries, failures: entries.filter((e) => !e.passed).length };
}

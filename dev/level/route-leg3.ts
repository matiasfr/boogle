// Named marks on the planned Canopy line, before its isle and chalk colliders are built.
import fs from 'node:fs';
import { consistOf, offsetOf } from '../../src/entities/railway/cars.ts';
import { ORIGIN } from '../../src/place/layout.ts';
import { layout, parseMapPage } from '../../src/sickle/map-data.ts';
import {
  legFrame,
  legRack,
  RAIL_GATES,
  RAIL_GRANTS,
  RAIL_LEGS,
  rowPoint,
  rowSide,
} from '../../src/sim/railway-route.ts';

export function checkLeg3() {
  const leg = RAIL_LEGS.find((l) => l.id === 'bell-canopy')!;
  const entries: { message: string; passed: boolean }[] = [];
  const check = (message: string, passed: boolean) => entries.push({ message, passed });
  const apart = (a: { x: number; z: number }, b: { x: number; z: number }) => Math.hypot(a.x - b.x, a.z - b.z) / 100;
  const mark = (s: number, lat: number) => rowSide('bay', s, lat, 90, 400);
  const rack = legRack(leg, 0),
    frame = legFrame(leg, 0);
  const kit = offsetOf(consistOf({ line: leg.line, wagon: false, steel: false }), 'kit');
  const carDistance = apart(rack, mark(leg.fromCm + 100 * kit, 200)),
    carry = apart(rack, frame);
  check(
    `Bell Rock rack to kit car ${carDistance.toFixed(2)} m, rack to frame ${carry.toFixed(2)} m`,
    carDistance < 9 && carry < 15,
  );
  const { land } = layout(
    parseMapPage(fs.readFileSync(new URL('../../docs/world/map-prototypes.html', import.meta.url), 'utf8')),
    'sickle',
    'A',
  );
  for (const [i, sec] of leg.sections.slice(0, -1).entries()) {
    const stop = sec.toCm - 1000;
    check(
      `Head ${i + 1} platform level at ${rowPoint('bay', stop).y / 100} m`,
      rowPoint('bay', stop - 1250).y === rowPoint('bay', stop + 1250).y,
    );
  }
  const p = rowPoint('bay', leg.sections[1]!.toCm - 1000),
    isle = land.find((l) => l.id === 'canopy-isle')!;
  const fraction = Math.hypot(
    (p.x / 100 - ORIGIN.x - isle.c![0]) / isle.r![0],
    (p.z / 100 - ORIGIN.z - isle.c![1]) / isle.r![1],
  );
  check(`Forest head at ${fraction.toFixed(2)} of the isle ellipse radius`, fraction < 1);
  const stop = leg.sections.at(-1)!.toCm;
  for (const id of ['wall-cn', 'wall-cs']) {
    const wall = land.find((l) => l.id === id)!,
      angle = (wall.rot! * Math.PI) / 180;
    const radius = wall.r![0] * (id === 'wall-cn' ? 1 : -1);
    const tip = {
      x: 100 * (ORIGIN.x + wall.c![0] + radius * Math.cos(angle)),
      z: 100 * (ORIGIN.z + wall.c![1] + radius * Math.sin(angle)),
    };
    let nearest = Infinity;
    for (let s = stop - 2000; s <= stop + 2000; s += 25)
      for (const lat of [-780, -380, 380, 780]) nearest = Math.min(nearest, apart(mark(s, lat), tip));
    check(`Canopy platforms to ${id} tip ${nearest.toFixed(2)} m`, nearest > 3.8 + 1.1);
  }
  const distance = apart(RAIL_GRANTS.find((g) => g.id === 'cloth')!.at, RAIL_GATES.find((g) => g.id === 'notch')!.at);
  check(`Cloth to Notch barrier ${distance.toFixed(2)} m`, Math.abs(distance - 10) < 0.1);
  return { level: 'route leg 3 (planned)', entries, failures: entries.filter((e) => !e.passed).length };
}

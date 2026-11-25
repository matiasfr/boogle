import { readFileSync } from 'node:fs';
import { ORIGIN } from '../../src/place/layout.ts';
import { layout, parseMapPage, type XZ } from '../../src/sickle/map-data.ts';
import { CANOPY_TRUNKS } from '../../src/content/levels/leg3.ts';
import { HEAD_BACK_CM, RAIL_LEGS, legFrame, legRack, rowPoint, sectionFromCm } from '../../src/sim/railway-route.ts';
import { WORLD_LINES } from '../../src/sim/railway-world-lines.ts';
import { shoreDistance } from './route-leg4.ts';
import { tracks, type Pt } from './rail-network.ts';
import { circumradius, measure } from './track-continuity.ts';
import { gorgeAt } from '../../src/entities/route-greybox/massing.ts';

/** Vertical rail-to-rail clearance wherever these two finite spans cross in plan. */
function crossingHeight(a: Pt, b: Pt, c: Pt, d: Pt) {
  const ax = b.x - a.x,
    az = b.z - a.z,
    bx = d.x - c.x,
    bz = d.z - c.z;
  const det = ax * bz - az * bx;
  if (!det) return;
  const t = ((c.x - a.x) * bz - (c.z - a.z) * bx) / det;
  const u = ((c.x - a.x) * az - (c.z - a.z) * ax) / det;
  if (t >= 0 && t < 1 && u >= 0 && u < 1) return a.y + t * (b.y - a.y) - c.y - u * (d.y - c.y);
}

export function checkLeg5() {
  const leg = RAIL_LEGS[5]!,
    row = WORLD_LINES.find((l) => l.id === leg.row)!;
  const land = layout(
    parseMapPage(readFileSync(new URL('../../docs/world/map-prototypes.html', import.meta.url), 'utf8')),
    'sickle',
    'A',
  ).land;
  const entries: { message: string; passed: boolean }[] = [];
  const check = (message: string, passed: boolean) => entries.push({ message, passed });
  const network = tracks(),
    cave = network.find((t) => t.id === 'cave-centre')!,
    bay = network.find((t) => t.id === 'bay-centre')!;
  // Retain the inbound tangent of the first joint past the quay stop.
  const wall = cave.pts.slice(cave.pts.findIndex((p) => p.s >= leg.fromCm / 100) - 1);
  const curve = measure({ ...cave, pts: wall }).row;
  check(
    `Wall largest kink ${curve.maxKink.toFixed(3)} degrees; minimum radius ${curve.minRadius.toFixed(2)} m`,
    curve.kinksOver === 0 && curve.under40 === 0,
  );
  // Also check the actual cm-rounded chords. The continuity report measures radius every 5 m.
  let largestTurn = 0,
    smallestRadius = Infinity,
    gorgeRadius = Infinity;
  for (let i = 1; i < wall.length - 1; i++) {
    const a = wall[i - 1]!,
      b = wall[i]!,
      c = wall[i + 1]!;
    const dx = b.x - a.x,
      dz = b.z - a.z,
      ex = c.x - b.x,
      ez = c.z - b.z;
    largestTurn = Math.max(largestTurn, (Math.abs(Math.atan2(dx * ez - dz * ex, dx * ex + dz * ez)) * 180) / Math.PI);
    const radius = circumradius(a, b, c);
    smallestRadius = Math.min(smallestRadius, radius);
    if (b.z < -2000) gorgeRadius = Math.min(gorgeRadius, radius);
  }
  check(
    `Wall chords: ${largestTurn.toFixed(3)} degrees, radius ${smallestRadius.toFixed(2)} m; Gorge turn ${gorgeRadius.toFixed(2)} m`,
    largestTurn < 2 && smallestRadius >= 40 && gorgeRadius >= 100 && Number.isFinite(gorgeRadius),
  );
  const crossings: number[] = [];
  for (let i = 1; i < wall.length; i++)
    for (let j = 1; j < bay.pts.length; j++) {
      const h = crossingHeight(wall[i - 1]!, wall[i]!, bay.pts[j - 1]!, bay.pts[j]!);
      if (h !== undefined) crossings.push(h);
    }
  check(
    `Wall over bay: ${crossings.map((h) => h.toFixed(2)).join(', ')} m`,
    crossings.length === 1 && crossings[0]! >= 7,
  );
  const buffers = wall.at(-1)!,
    concourse = gorgeAt(-4, 0);
  const gap = Math.hypot(buffers.x - concourse.x, buffers.z - concourse.z);
  check(`Gorge buffers to concourse ${gap.toFixed(2)} m`, Math.abs(gap - 4) < 0.02 && buffers.y === 3);
  const points: XZ[] = [];
  for (let s = leg.fromCm; s <= row.lengthCm; s += 50) {
    const p = rowPoint(leg.row, s);
    points.push([p.x / 100 - ORIGIN.x, p.z / 100 - ORIGIN.z]);
  }
  for (const [id, min] of [
    ['port-top', 8.8],
    ['stack-s', 24],
    ['stack-n', 45],
    ['wall-n1', 20],
    ['wall-cn', 20],
    ['wall-cs', 20],
    ['wall-s1', 20],
    ['wall-s2', 20],
    ['wall-n2', 20],
  ] as const) {
    const outline = land.find((l) => l.id === id)!.outline;
    const distance = Math.min(...points.map((p) => -shoreDistance(p, outline)));
    check(`${id}: centreline clearance ${distance.toFixed(2)} m`, distance >= min);
  }
  const canopy = row.halts[3]!;
  const shore = shoreDistance(
    [canopy.x / 100 - ORIGIN.x, canopy.z / 100 - ORIGIN.z],
    land.find((l) => l.id === 'canopy-isle')!.outline,
  );
  check(`Canopy stop ${shore.toFixed(2)} m inland`, shore > 0 && canopy.y === 1300);
  for (const [id, x, z] of CANOPY_TRUNKS) {
    const d = Math.min(...points.map(([a, b]) => Math.hypot(a + ORIGIN.x - x, b + ORIGIN.z - z)));
    check(`${id}: ${d.toFixed(2)} m from track`, d >= 20);
  }
  const frame = legFrame(leg, 0),
    rack = legRack(leg, 0);
  const carry = Math.hypot(frame.x - rack.x, frame.z - rack.z) / 100;
  check(`Quay rack to frame ${carry.toFixed(2)} m`, carry < 15);
  for (const [k, section] of leg.sections.entries()) {
    const length = (section.toCm - sectionFromCm(leg, k)) / 100;
    check(`Wall section ${k + 1}: ${length.toFixed(2)} m`, length < 900);
    const s = section.toCm - (k === 5 ? 0 : HEAD_BACK_CM),
      height = rowPoint(leg.row, s).y;
    check(
      `Wall platform ${k + 1}: level at ${height / 100} m`,
      [-2000, -1000, 1000, 2000].every((offset) => rowPoint(leg.row, s + offset).y === height),
    );
  }
  return { level: 'route leg 5', entries, failures: entries.filter((e) => !e.passed).length };
}

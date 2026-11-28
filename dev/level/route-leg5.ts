import { readFileSync } from 'node:fs';
import { ORIGIN } from '../../src/place/layout.ts';
import { layout, parseMapPage, type XZ } from '../../src/sickle/map-data.ts';
import { CANOPY_TRUNKS } from '../../src/content/levels/leg3.ts';
import { HEAD_BACK_CM, RAIL_LEGS, legFrame, legRack, rowPoint, sectionFromCm } from '../../src/sim/railway-route.ts';
import { WORLD_LINES } from '../../src/sim/railway-world-lines.ts';
import { colliderFlood, shoreDistance } from './route-leg4.ts';
import { tracks, type Pt } from './rail-network.ts';
import { circumradius, measure } from './track-continuity.ts';
import { gorgeAt } from '../../src/entities/route-greybox/massing.ts';

import defsInput from '../../content/built/prefabs.json' with { type: 'json' };
import gorgeInput from '../../content/built/levels/gorge.json' with { type: 'json' };
import southInput from '../../content/built/levels/wall-south.json' with { type: 'json' };
import northInput from '../../content/built/levels/wall-north.json' with { type: 'json' };
import { validateArtifact, loadLevelArtifact } from '../../src/prefab/validate.ts';
import { heightAt, resolvePlacedColliders } from './prefab-colliders.ts';

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
  const tip = wall.at(-1)!;
  const target = gorgeAt(-8, 2);
  const error = Math.hypot(tip.x - target.x, tip.z - target.z);
  check(`Wall end at a −8, c +2: error ${error.toFixed(3)} m`, error <= 0.05 && tip.y === 3);
  const ring = network.find((t) => t.id === 'ring-centre')!.pts;
  // Travel from the Wall into line 2. Offset each chord joint along its bisector.
  function offset(points: Pt[], lateral: number) {
    return points.map((p, i) => {
      const prev = points[i - 1] ?? p,
        next = points[i + 1] ?? p;
      const heading = (a: Pt, b: Pt) => Math.atan2(b.z - a.z, b.x - a.x);
      const h0 = i ? heading(prev, p) : heading(p, next);
      const h1 = i + 1 < points.length ? heading(p, next) : h0;
      const angle = (h0 + h1) / 2;
      return { ...p, x: p.x - lateral * Math.sin(angle), z: p.z + lateral * Math.cos(angle) };
    });
  }
  const across = gorgeAt(0, 1),
    origin = gorgeAt(0, 0);
  for (const lateral of [-2, 2]) {
    const inbound = offset(wall.slice(-20), lateral);
    const outbound = offset(ring.slice(-25).reverse(), lateral + 2);
    const dx = inbound.at(-1)!.x - outbound[0]!.x,
      dz = inbound.at(-1)!.z - outbound[0]!.z;
    const mismatch = Math.abs(dx * (across.x - origin.x) + dz * (across.z - origin.z));
    check(`Gorge track c ${lateral + 2} lateral mismatch ${mismatch.toFixed(3)} m`, mismatch <= 0.05);
    let turn = 0,
      radius = Infinity;
    const joined = [...inbound, ...outbound];
    for (let i = 1; i < joined.length - 1; i++) {
      const a = joined[i - 1]!,
        b = joined[i]!,
        c = joined[i + 1]!;
      const along = (b.x - origin.x) * 0.8565 + (b.z - origin.z) * 0.5162;
      if (along < -140 || along > 40) continue;
      const ux = b.x - a.x,
        uz = b.z - a.z,
        vx = c.x - b.x,
        vz = c.z - b.z;
      turn = Math.max(turn, (Math.abs(Math.atan2(ux * vz - uz * vx, ux * vx + uz * vz)) * 180) / Math.PI);
      radius = Math.min(radius, circumradius(a, b, c));
    }
    check(
      `Gorge track c ${lateral + 2}: turn ${turn.toFixed(3)} degrees, radius ${radius.toFixed(2)} m`,
      turn <= 2 && radius >= 94,
    );
  }
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
  const trunkMinimum: Readonly<Record<string, number>> = { 'trunk-0': 29, 'trunk-1': 22, 'mother-1': 84 };
  for (const [id, x, z] of CANOPY_TRUNKS) {
    const d = Math.min(...points.map(([a, b]) => Math.hypot(a + ORIGIN.x - x, b + ORIGIN.z - z)));
    const minimum = trunkMinimum[id] ?? (id.startsWith('mother-') ? 88 : 20);
    check(`${id}: ${d.toFixed(2)} m from track (at least ${minimum} m)`, d >= minimum);
  }
  const bayLeg = RAIL_LEGS[3]!,
    bayHead = rowPoint(bayLeg.row, bayLeg.sections[1]!.toCm - HEAD_BACK_CM);
  const bayHeadGap = Math.min(
    ...points.map(([x, z]) => Math.hypot(x + ORIGIN.x - bayHead.x / 100, z + ORIGIN.z - bayHead.z / 100)),
  );
  check(`Bay head 2: ${bayHeadGap.toFixed(2)} m from track (at least 122 m)`, bayHeadGap >= 122);
  const frame = legFrame(leg, 0),
    rack = legRack(leg, 0);
  const carry = Math.hypot(frame.x - rack.x, frame.z - rack.z) / 100;
  check(`Quay rack to frame ${carry.toFixed(2)} m`, carry < 15);
  for (const [k, section] of leg.sections.entries()) {
    const length = (section.toCm - sectionFromCm(leg, k)) / 100;
    // 16 November, docs/decisions-rail.md: sections end at a place, "up to about 900 m"; the islet cut is 950.69 m.
    check(`Wall section ${k + 1}: ${length.toFixed(2)} m (under 960 m)`, length < 960);
    const s = section.toCm - (k === 5 ? 0 : HEAD_BACK_CM),
      height = rowPoint(leg.row, s).y;
    check(
      `Wall platform ${k + 1}: level at ${height / 100} m`,
      [-2000, -1000, 1000, 2000].every((offset) => rowPoint(leg.row, s + offset).y === height),
    );
  }
  const defs: unknown = defsInput;
  validateArtifact(defs);
  for (const input of [southInput, northInput]) {
    const area = loadLevelArtifact(input, defs.prefabs);
    for (const placement of area.placements) {
      const outline = land.find((l) => l.id === placement.id)!.outline;
      const collider = defs.prefabs[placement.prefab]!.colliders[0];
      check(
        placement.id + ' sheer collider follows its map outline',
        collider?.shape === 'trimesh' &&
          collider.vertices.length === 3 * (2 * outline.length + 1) &&
          outline.every(
            ([x, z], i) =>
              Math.abs(collider.vertices[3 * i]! - x - ORIGIN.x) < 0.006 &&
              collider.vertices[3 * i + 1] === 120 &&
              Math.abs(collider.vertices[3 * i + 2]! - z - ORIGIN.z) < 0.006,
          ),
      );
    }
  }
  const gorge = loadLevelArtifact(gorgeInput, defs.prefabs);
  const { colliders } = resolvePlacedColliders(gorge, defs.prefabs);
  const faces = colliders.flatMap((c) => c.volume.triangles);
  const clear = [-26, -23, -20, -17, -14, -11].every((a) =>
    Array.from({ length: 61 }, (_, k) => -13.9 + k / 10).every((c) => heightAt(faces, gorgeAt(a, c)) === null),
  );
  check('six clear metres between the town pad and the north platform', clear);
  const { node, reach } = colliderFlood(colliders, gorgeAt(-35, 0), 115);
  for (const c of [-1.5, 0, 2, 4, 5.5]) {
    const y = heightAt(faces, gorgeAt(-2, c));
    check(`joined Gorge crossing c ${c} has a plank top at 3.35 m`, y !== null && Math.abs(y - 3.35) < 0.01);
  }
  const concourseWalk = reach(gorgeAt(-2, 2));
  const fromWater = reach(gorgeAt(-76, 6), true);
  for (const [c, edge, sign] of [
    [-3.8, -1.8, -1],
    [7.8, 5.8, 1],
  ] as const) {
    const inside = heightAt(faces, gorgeAt(-31, edge + sign * 0.05));
    const outside = heightAt(faces, gorgeAt(-31, edge - sign * 0.05));
    check(`Gorge platform edge c ${edge} within 0.05 m`, inside !== null && outside === null);
    const platform = node(gorgeAt(-31, c));
    check('Gorge platform c ' + c + ' connects to line 2 on foot', !!concourseWalk[platform]);
    check('Gorge platform c ' + c + ' reached from the water', !!fromWater[platform]);
  }
  return { level: 'route leg 5', entries, failures: entries.filter((e) => !e.passed).length };
}

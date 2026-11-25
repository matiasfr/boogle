// The cliff kit as built (content/built/levels/<area>.json, dev/prefab/cliff-kit.ts): every area's placed pieces against
// the kit's piece rules (`kitPieceProblems`: 0.4 m off every tread, 6 m from every gated place in the layout, outside the
// rails' gauge) and no new standing height (./cliff-kit-standing.ts: no standable top more than a step off the bare
// world's own footing, so the pieces open no new way up), each area on the census wall it names
// (dev/ground/cliff-walls.ts) and mounted by the view (src/entities/terrain-kit/areas.ts KIT_AREAS).
import fs from 'node:fs';
import { loadLevelArtifact } from '../../src/prefab/validate.ts';
import { compiled } from '../../src/prefab/catalogue.ts';
import type { Placement } from '../../src/prefab/types.ts';
import { AREAS, kitPieceProblems, levelOf, type Area } from '../prefab/cliff-kit.ts';
import { KIT_AREAS } from '../../src/entities/terrain-kit/areas.ts';
import { censusWalls } from '../ground/cliff-walls.ts';
import { standingProblems } from './cliff-kit-standing.ts';

/** One area's audit, of `placements` (its built level's, or a seeded set's). */
export function checkCliffKitArea(
  area: Area,
  placements: readonly Placement[],
  wallAt: ReturnType<typeof censusWalls>['wallAt'],
) {
  const problems = placements.flatMap((p) => [...kitPieceProblems(p, area.keepClear), ...standingProblems(p)]);
  const walls = area.walls.map(([x, z]) => {
    const wall = wallAt(x, z);
    if (!wall) problems.push(`${area.id}: no census wall at (${x}, ${z})`);
    return wall;
  });
  if (!KIT_AREAS.some((level) => level.place === levelOf(area)))
    problems.push(`${area.id}: src/entities/terrain-kit/areas.ts does not mount levels/${levelOf(area)}.json`);
  return {
    area: area.id,
    pieces: placements.length,
    walls: walls.map((w) => w?.id ?? null),
    toeDressed: walls.reduce((m, w) => m + (w?.edge.toeDressed ?? 0), 0),
    problems,
  };
}
function load(area: Area) {
  const file = `content/built/levels/${levelOf(area)}.json`;
  return loadLevelArtifact(JSON.parse(fs.readFileSync(file, 'utf8')) as unknown, compiled.prefabs).placements;
}

export function checkCliffKit() {
  const { wallAt } = censusWalls();
  const areas = AREAS.map((area) => checkCliffKitArea(area, load(area), wallAt));
  const failures = areas.reduce((n, a) => n + a.problems.length, 0);
  return { name: 'cliff kit', areas, failures };
}

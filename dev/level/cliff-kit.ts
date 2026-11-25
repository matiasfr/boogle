// The cliff kit as built (content/built/levels/<area>.json, dev/prefab/cliff-kit.ts): every area's placed pieces against
// the kit's piece rules (`kitPieceProblems`: 0.4 m off every tread, 6 m from every gated place in the layout, outside the
// rails' gauge) and the gate against a new way up (./cliff-kit-standing.ts: every standable top flush, out of reach, or
// a low perch), each area on the census wall it names
// (dev/ground/cliff-walls.ts) and mounted by the view (src/entities/terrain-kit/areas.ts KIT_AREAS).
import fs from 'node:fs';
import { loadLevelArtifact } from '../../src/prefab/validate.ts';
import { compiled } from '../../src/prefab/catalogue.ts';
import type { Placement } from '../../src/prefab/types.ts';
import { AREAS, kitPieceProblems, levelOf, solidSamples, type Area } from '../prefab/cliff-kit.ts';
import { H } from '../../src/place/terrain.ts';
import { ORIGIN } from '../../src/place/layout.ts';
import { pathAt } from '../../src/place/path-field.ts';
import { flood, standable } from './flood.ts';
import { MOVER } from './mover.ts';
import { KIT_AREAS } from '../../src/entities/terrain-kit/areas.ts';
import { censusWalls } from '../ground/cliff-walls.ts';
import { standingProblems } from './cliff-kit-standing.ts';

/** Nobody walled off (docs/plans/cliff-kit-everywhere.md, step 1): within the area's `stranded` square, on a 0.5 m
 * grid of the bare ground, every node a player can be at (walkable ground or water) that gets back to a tread (a reverse flood, swimming allowed)
 * must still get back with the kit's solids in, its pieces' own footprints aside. A solid blocks a node where it stands
 * in a body's height over the ground there. The kit's tops are not walked on here, so this only ever finds too much. */
export function strandedNodes(area: Area, placements: readonly Placement[]) {
  if (!area.stranded) return { nodes: 0, lost: [] as [number, number][] };
  const cell = 0.5,
    { x: cx, z: cz, half } = area.stranded;
  const n = Math.round((2 * half) / cell) + 1;
  const x = (i: number) => cx - half + i * cell,
    z = (j: number) => cz - half + j * cell;
  const h = new Float32Array(n * n),
    starts: number[] = [];
  for (let i = 0; i < n; i++)
    for (let j = 0; j < n; j++) {
      h[i * n + j] = H(x(i) + ORIGIN.x, z(j));
      if (pathAt(x(i), z(j)).edge < 0) starts.push(i * n + j);
    }
  // A rail-served island has a platform approach instead of a painted tread.
  const landing = area.stranded.landing;
  if (landing) starts.push(Math.round((landing[0] - cx + half) / cell) * n + Math.round((landing[1] - cz + half) / cell));
  const blocked = new Uint8Array(n * n);
  for (const p of placements)
    for (const q of solidSamples(p, 0.25)) {
      const i = Math.round((q[0] - cx + half) / cell),
        j = Math.round((q[2] - cz + half) / cell);
      if (i < 0 || j < 0 || i >= n || j >= n) continue;
      const g = h[i * n + j]!;
      if (q[1] > Math.max(g, 0) + 0.05 && q[1] < Math.max(g, 0) + 1.8) blocked[i * n + j] = 1;
    }
  const grid = { n, cell, h };
  const bare = flood(grid, MOVER, starts, { swim: true, reverse: true });
  const kit = flood(grid, MOVER, starts, { swim: true, reverse: true, blocked });
  // Only where a player can be: standing on walkable ground or in the water (not on a wall's steep face).
  const stand = standable(grid, MOVER);
  const lost: [number, number][] = [];
  for (let k = 0; k < n * n; k++)
    if (bare[k] && !kit[k] && !blocked[k] && (stand[k] || h[k]! < 0)) lost.push([x(Math.floor(k / n)), z(k % n)]);
  return { nodes: n * n, lost };
}

/** One area's audit, of `placements` (its built level's, or a seeded set's). */
export function checkCliffKitArea(
  area: Area,
  placements: readonly Placement[],
  wallAt: ReturnType<typeof censusWalls>['wallAt'],
) {
  const problems = [
    ...placements.flatMap((p) => kitPieceProblems(p, area.keepClear)),
    ...standingProblems(placements).map((p) => p.message),
  ];
  const stranded = strandedNodes(area, placements);
  if (stranded.lost.length)
    problems.push(
      `${area.id}: ${stranded.lost.length} places that get back to a tread bare are walled off by the kit, first at (${stranded.lost[0]!.join(', ')})`,
    );
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
    strandedChecked: stranded.nodes,
    problems,
  };
}
/** An area's built level's placements. */
export function placementsOf(area: Area) {
  const file = `content/built/levels/${levelOf(area)}.json`;
  return loadLevelArtifact(JSON.parse(fs.readFileSync(file, 'utf8')) as unknown, compiled.prefabs).placements;
}

export function checkCliffKit() {
  const { wallAt } = censusWalls();
  const areas = AREAS.map((area) => checkCliffKitArea(area, placementsOf(area), wallAt));
  const failures = areas.reduce((n, a) => n + a.problems.length, 0);
  return { name: 'cliff kit', areas, failures };
}

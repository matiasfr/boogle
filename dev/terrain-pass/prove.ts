// Proves the terrain pass's tolerance in Node: how far each drawn vertex (src/proto/terrain-pass/surface.ts, island.ts)
// strays from the collider it never touches. `node dev/terrain-pass/prove.ts [home|1|a2|a4 ...]` (default all four):
// home is the pass on all of Home (every new or moved vertex), 1 round two on the wedge, aN variant a at N vertices per
// 2 m cell side. A drawn triangle lies inside one collider triangle, so the offset is
// linear across it and the vertex maxima bound every drawn point. No browser.
import { WALKABLE_NY } from '../../src/constants.ts';
import { LAND_TREES } from '../../src/place/tree-catalog.ts';
import { ORIGIN } from '../../src/place/layout.ts';
import { COVE_FINE, NX, NZ, cellX, cellZ } from '../../src/place/terrain.ts';
import { buildIslandSurface, protectionAt } from '../../src/proto/terrain-pass/island.ts';
import {
  KEEPS,
  TOLERANCE,
  WEDGE,
  buildSteepSurface,
  buildWedgeSurface,
  colliderHeight,
  protection,
  vertexNy,
} from '../../src/proto/terrain-pass/surface.ts';

const asked = process.argv.slice(2);
const inCove = (i: number, j: number) =>
  cellX(i) >= COVE_FINE.x0 && cellX(i) < COVE_FINE.x1 && cellZ(j) >= COVE_FINE.z0 && cellZ(j) < COVE_FINE.z1;
/** All of Home: the new 1 m vertices and the grid vertices the ledges move (no other vertex changes). */
function home() {
  const island = buildIslandSurface(NX * NZ, inCove, 96);
  const position = [...island.position];
  for (const [id, y] of island.moved)
    position.push(cellX(id % NX) + ORIGIN.x, y, cellZ(Math.floor(id / NX)) + ORIGIN.z);
  const triangles = [...island.triangles.values()].reduce((n, list) => n + list.length / 3, 0);
  return { position, index: { length: triangles * 3 }, fineCells: island.fineCells };
}
for (const name of asked.length ? asked : ['home', '1', 'a2', 'a4']) {
  const started = performance.now();
  const s =
    name === 'home' ? home() : name === '1' ? buildSteepSurface() : buildWedgeSurface(Number(name.slice(1)), true);
  const keep = name === 'home' ? protectionAt : protection;
  const ms = performance.now() - started;
  const count = s.position.length / 3;
  let walk = 0,
    walkN = 0,
    steep = 0,
    steepN = 0,
    kept = 0,
    keptN = 0,
    moved = 0;
  for (let k = 0; k < count; k++) {
    const x = s.position[k * 3]! - ORIGIN.x,
      y = s.position[k * 3 + 1]!,
      z = s.position[k * 3 + 2]! - ORIGIN.z;
    const offset = y - colliderHeight(x, z),
      ny = vertexNy(x, z);
    if (Math.abs(offset) > 1e-4) moved++;
    if (keep(x, z) > 0.999) {
      kept = Math.max(kept, Math.abs(offset));
      keptN++;
    } else if (ny >= WALKABLE_NY) {
      walk = Math.max(walk, Math.abs(offset));
      walkN++;
    } else {
      steep = Math.max(steep, Math.abs(offset) * ny);
      steepN++;
    }
  }
  console.log(
    JSON.stringify({
      variant: name,
      vertices: count,
      triangles: s.index.length / 3,
      buildMs: Math.round(ms),
      moved,
      walkableVertices: walkN,
      walkableMaxVertical: +walk.toFixed(4),
      steepVertices: steepN,
      steepMaxAlongNormal: +steep.toFixed(4),
      protectedVertices: keptN,
      protectedMax: +kept.toFixed(5),
      tolerance: TOLERANCE,
    }),
  );
}
// Context: today's trees stand at their nearest grid vertex's height, not the triangle under the trunk.
let existing = 0;
for (const t of LAND_TREES) {
  const x = t.x - ORIGIN.x,
    z = t.z - ORIGIN.z;
  if (x < WEDGE.x0 || x > WEDGE.x1 || z < WEDGE.z0 || z > WEDGE.z1) continue;
  existing = Math.max(existing, Math.abs(t.y - colliderHeight(x, z)));
}
console.log(JSON.stringify({ keeps: KEEPS.length, todayTreeBaseVsColliderMax: +existing.toFixed(3) }));

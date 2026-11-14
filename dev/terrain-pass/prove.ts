// Proves the terrain pass's tolerance in Node: how far the drawn ground strays from the collider it never touches.
// `node dev/terrain-pass/prove.ts [home|1|a2|a4 ...]` (default all four). `home` is the pass on all of Home, measured
// independently of the code under test (drawn.ts: every changed triangle against the one collider triangle it lies in,
// and the drawn ground under and 1 m around everything in the keep list); it exits 1 if a walkable face or a kept
// footprint is more than 5 cm off. `1` is round two on the wedge and `aN` variant a at N vertices per 2 m cell side,
// by vertex: there a drawn triangle lies inside one collider triangle, so the vertex maxima bound every drawn point.
// No browser.
import { WALKABLE_NY } from '../../src/constants.ts';
import { LAND_TREES } from '../../src/place/tree-catalog.ts';
import { ORIGIN } from '../../src/place/layout.ts';
import { GROUND_KEEPS } from '../../src/proto/terrain-pass/island.ts';
import { drawnHome, measureHome, measureKeeps } from './drawn.ts';
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
/** All of Home, by triangle and by footprint (drawn.ts). */
function home() {
  const started = performance.now();
  const drawn = drawnHome();
  const buildMs = Math.round(performance.now() - started);
  const faces = measureHome(drawn),
    kept = measureKeeps(drawn, GROUND_KEEPS);
  const round = (v: number) => +v.toFixed(4);
  console.log(
    JSON.stringify({
      variant: 'home',
      fineCells: drawn.surface.fineCells,
      newVertices: drawn.surface.position.length / 3,
      buildMs,
      walkableTriangles: faces.walkable.triangles,
      walkableMaxVertical: round(faces.walkable.gap),
      walkableWorstAt: faces.walkable.at.map(round),
      steepTriangles: faces.steep.triangles,
      steepMaxAlongNormal: round(faces.steep.alongNormal.alongNormal),
      steepMaxAlongNormalAt: faces.steep.alongNormal.at.map(round),
      steepMaxVertical: round(faces.steep.vertical.vertical),
      steepMaxVerticalAt: faces.steep.vertical.at.map(round),
      steepMaxVerticalNy: round(faces.steep.vertical.ny),
      keeps: kept.keeps,
      keepSamples: kept.samples,
      keepMax: round(kept.gap),
      keepWorst: kept.kind,
      tolerance: TOLERANCE,
    }),
  );
  if (faces.walkable.gap > 0.05 || kept.gap > 0.05 || faces.steep.alongNormal.alongNormal > TOLERANCE.steep + 1e-5)
    process.exitCode = 1;
}
for (const name of asked.length ? asked : ['home', '1', 'a2', 'a4']) {
  if (name === 'home') {
    home();
    continue;
  }
  const started = performance.now();
  const s = name === '1' ? buildSteepSurface() : buildWedgeSurface(Number(name.slice(1)), true);
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
    if (protection(x, z) > 0.999) {
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

// Proves the terrain pass's tolerance in Node: how far the drawn wedge (src/proto/terrain-pass/surface.ts) strays from
// the collider it never touches. `node dev/terrain-pass/prove.ts [sub ...]` (default 2 4). No browser.
import { WALKABLE_NY } from '../../src/constants.ts';
import { LAND_TREES } from '../../src/proto/place/tree-catalog.ts';
import { ORIGIN } from '../../src/proto/place/layout.ts';
import {
  KEEPS,
  TOLERANCE,
  WEDGE,
  buildWedgeSurface,
  colliderHeight,
  drawnHeight,
} from '../../src/proto/terrain-pass/surface.ts';

const subs = process.argv.slice(2).map(Number);
for (const sub of subs.length ? subs : [2, 4]) {
  const started = performance.now();
  const s = buildWedgeSurface(sub, true);
  const ms = performance.now() - started;
  let walk = 0,
    walkN = 0,
    steep = 0,
    steepN = 0,
    kept = 0,
    keptN = 0,
    moved = 0;
  for (let j = 0; j < s.nz; j++)
    for (let i = 0; i < s.nx; i++) {
      const x = WEDGE.x0 + i * s.step,
        z = WEDGE.z0 + j * s.step;
      const d = drawnHeight(x, z);
      const y = s.position[(i + j * s.nx) * 3 + 1]!;
      if (Math.abs(y - d.height) > 1e-3) throw new Error(`mesh disagrees with drawnHeight at ${x},${z}`);
      if (Math.abs(d.offset) > 1e-4) moved++;
      if (d.keep > 0.999) {
        kept = Math.max(kept, Math.abs(d.offset));
        keptN++;
      } else if (d.ny >= WALKABLE_NY) {
        walk = Math.max(walk, Math.abs(d.offset));
        walkN++;
      } else {
        steep = Math.max(steep, Math.abs(d.offset) * d.ny);
        steepN++;
      }
    }
  const vertices = s.nx * s.nz,
    triangles = s.index.length / 3;
  console.log(
    JSON.stringify({
      sub,
      cell: s.step,
      vertices,
      triangles,
      buildMs: Math.round(ms),
      gpuBytes: vertices * (3 + 3 + 3 + 1 + 1 + 1 + 2 + 3) * 4 + s.index.length * 4,
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
// Each tree and rock in the wedge, checked over its trunk/footprint disc at 10 cm: drawn minus collider.
let worst = 0;
for (const k of KEEPS) {
  const r = k.r - 2;
  for (let dx = -r; dx <= r; dx += 0.1)
    for (let dz = -r; dz <= r; dz += 0.1) {
      if (dx * dx + dz * dz > r * r) continue;
      worst = Math.max(worst, Math.abs(drawnHeight(k.x + dx, k.z + dz).offset));
    }
}
// Context: today's trees stand at their nearest grid vertex's height, not the triangle under the trunk.
let existing = 0;
for (const t of LAND_TREES) {
  const x = t.x - ORIGIN.x,
    z = t.z - ORIGIN.z;
  if (x < WEDGE.x0 || x > WEDGE.x1 || z < WEDGE.z0 || z > WEDGE.z1) continue;
  existing = Math.max(existing, Math.abs(t.y - colliderHeight(x, z)));
}
console.log(
  JSON.stringify({
    keeps: KEEPS.length,
    worstOffsetUnderTreesAndRocks: +worst.toFixed(5),
    todayTreeBaseVsColliderMax: +existing.toFixed(3),
  }),
);

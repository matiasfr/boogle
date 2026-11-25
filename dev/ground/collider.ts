// Pure collider queries for the independent ground verifier. No render or ledge imports.
import { GRID, ORIGIN } from '../../src/place/layout.ts';
import { terrainCollisionTiles, type TerrainCollisionTile } from '../../src/place/terrain.ts';
import { WALKABLE_NY } from '../../src/constants.ts';

const collision = terrainCollisionTiles();

export function onHome(x: number, z: number) {
  return x >= GRID.x0 + ORIGIN.x && x <= GRID.x1 + ORIGIN.x && z >= GRID.z0 + ORIGIN.z && z <= GRID.z1 + ORIGIN.z;
}

/** Physics heightfield triangles, including the closed outer edge (surfaceHeight uses an outside fallback there). */
export function colliderHeight(x: number, z: number) {
  for (const tile of collision) {
    const nx = tile.heights.length,
      nz = tile.heights[0]!.length;
    const fx = (x - tile.position.x) / tile.cell;
    const fz = (z - (tile.position.z - (nz - 1) * tile.cell)) / tile.cell;
    if (fx < 0 || fz < 0 || fx > nx - 1 || fz > nz - 1) continue;
    const i = Math.min(Math.floor(fx), nx - 2),
      j = Math.min(Math.floor(fz), nz - 2);
    const u = fx - i,
      v = fz - j;
    const a = tile.heights[i]![nz - 1 - j]!,
      b = tile.heights[i + 1]![nz - 1 - j]!;
    const c = tile.heights[i]![nz - 2 - j]!,
      d = tile.heights[i + 1]![nz - 2 - j]!;
    const h = u + v <= 1 ? a + (b - a) * u + (c - a) * v : d + (c - d) * (1 - u) + (b - d) * (1 - v);
    return h;
  }
  throw new Error(`No Home collider at ${x},${z}`);
}

export type ColliderFace = { height: number; ny: number };
const EDGE_EPS = 1e-6; // barycentric inclusion tolerance at shared edges
const HEIGHT_EPS = 1e-8; // numerical equality of incident physical faces, not a drawn-gap tolerance

/** Every actual face incident at the point: both sides of diagonals, grid edges, vertices and tile joins.
 * Source arguments keep the geometry queries testable with small, analytical heightfield fixtures. */
export function incidentColliderFaces(
  x: number,
  z: number,
  tiles: readonly TerrainCollisionTile[] = collision,
): ColliderFace[] {
  const faces: ColliderFace[] = [];
  for (const tile of tiles) {
    const nx = tile.heights.length,
      nz = tile.heights[0]!.length;
    const fx = (x - tile.position.x) / tile.cell;
    const fz = (z - (tile.position.z - (nz - 1) * tile.cell)) / tile.cell;
    if (fx < -EDGE_EPS || fz < -EDGE_EPS || fx > nx - 1 + EDGE_EPS || fz > nz - 1 + EDGE_EPS) continue;
    for (let j = Math.max(0, Math.ceil(fz - EDGE_EPS) - 1); j <= Math.min(nz - 2, Math.floor(fz + EDGE_EPS)); j++)
      for (let i = Math.max(0, Math.ceil(fx - EDGE_EPS) - 1); i <= Math.min(nx - 2, Math.floor(fx + EDGE_EPS)); i++) {
        const u = fx - i,
          v = fz - j;
        const a = tile.heights[i]![nz - 1 - j]!,
          b = tile.heights[i + 1]![nz - 1 - j]!;
        const c = tile.heights[i]![nz - 2 - j]!,
          d = tile.heights[i + 1]![nz - 2 - j]!;
        if (u + v <= 1 + EDGE_EPS)
          faces.push({
            height: a + (b - a) * u + (c - a) * v,
            ny: 1 / Math.hypot(1, (b - a) / tile.cell, (c - a) / tile.cell),
          });
        if (u + v >= 1 - EDGE_EPS)
          faces.push({
            height: d + (c - d) * (1 - u) + (b - d) * (1 - v),
            ny: 1 / Math.hypot(1, (d - c) / tile.cell, (d - b) / tile.cell),
          });
      }
  }
  return faces;
}

/** A shared boundary belongs to each face; a walkable face at the top surface must not be excluded. */
export function walkableFaces(faces: readonly ColliderFace[], height: number) {
  return faces.some((face) => Math.abs(face.height - height) <= HEIGHT_EPS && face.ny >= WALKABLE_NY);
}

export function colliderWalkable(x: number, z: number, height = colliderHeight(x, z)) {
  return walkableFaces(incidentColliderFaces(x, z), height);
}

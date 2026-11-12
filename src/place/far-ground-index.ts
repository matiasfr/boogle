// Index buffers for one tile of the far ground at one level of detail: the pure half of far-ground.ts, so tests can check
// coverage and seams without a renderer.
//
// Pattern: Chunked LOD (Ulrich, SIGGRAPH 2002; Unity Terrain patches, Unreal Landscape components): square chunks with
// their own bounds for frustum culling, each drawn at one of a few power-of-two resolutions chosen by distance. Cracks
// between neighbouring levels are closed by stitching rather than skirts: a tile keeps full resolution along its own
// border at every level, so a neighbour of any level meets it on the same vertices (no T-junction, no gap, no extra
// geometry hanging below the ground). Inside a coarse tile a block of S x S cells is two triangles when all four
// neighbours are blocks, otherwise a fan from its centre vertex that keeps every vertex on the sides facing
// full-resolution cells.

/** Cells i0..i1 by j0..j1 (a tile), as `[i0, j0, i1, j1]`. */
export type TileCells = readonly [i0: number, j0: number, i1: number, j1: number];

/**
 * Triangles (vertex ids of the full grid, `i + j * nx`) of one tile at `s` cells per block (1 = the full grid).
 * `skip` names cells the full mesh leaves out (the cove's fine patch): a block holding one stays full resolution.
 */
export function tileIndex(
  nx: number,
  [i0, j0, i1, j1]: TileCells,
  s: number,
  skip: (i: number, j: number) => boolean,
): number[] {
  const at = (i: number, j: number) => i + j * nx;
  const out: number[] = [];
  const quad = (i: number, j: number) => {
    if (skip(i, j)) return;
    const a = at(i, j),
      b = at(i + 1, j),
      c = at(i, j + 1),
      d = at(i + 1, j + 1);
    out.push(a, c, b, b, c, d);
  };
  const ba = Math.floor((i1 - i0) / s),
    bb = Math.floor((j1 - j0) / s);
  // A block is coarse when it lies whole inside the tile and none of its cells is skipped.
  const block = (a: number, b: number) => {
    if (s === 1 || a < 0 || b < 0 || a >= ba || b >= bb) return false;
    for (let j = j0 + b * s; j < j0 + (b + 1) * s; j++)
      for (let i = i0 + a * s; i < i0 + (a + 1) * s; i++) if (skip(i, j)) return false;
    return true;
  };
  const covered = (i: number, j: number) => block(Math.floor((i - i0) / s), Math.floor((j - j0) / s));
  for (let j = j0; j < j1; j++) for (let i = i0; i < i1; i++) if (!covered(i, j)) quad(i, j);
  for (let b = 0; b < bb; b++)
    for (let a = 0; a < ba; a++) {
      if (!block(a, b)) continue;
      const x = i0 + a * s,
        y = j0 + b * s;
      const left = block(a - 1, b),
        top = block(a, b + 1),
        right = block(a + 1, b),
        bottom = block(a, b - 1);
      if (left && top && right && bottom) {
        out.push(at(x, y), at(x, y + s), at(x + s, y), at(x + s, y), at(x, y + s), at(x + s, y + s));
        continue;
      }
      // Boundary in the winding of the full mesh's (a, c, b): up the left side, along the top, down the right, back
      // along the bottom. Sides facing a block keep only their corners.
      const ring: number[] = [];
      const side = (coarse: boolean, from: [number, number], step: [number, number]) => {
        for (let k = 0; k < s; k += coarse ? s : 1) ring.push(at(from[0] + step[0] * k, from[1] + step[1] * k));
      };
      side(left, [x, y], [0, 1]);
      side(top, [x, y + s], [1, 0]);
      side(right, [x + s, y + s], [0, -1]);
      side(bottom, [x + s, y], [-1, 0]);
      const centre = at(x + s / 2, y + s / 2);
      for (let k = 0; k < ring.length; k++) out.push(centre, ring[k]!, ring[(k + 1) % ring.length]!);
    }
  return out;
}

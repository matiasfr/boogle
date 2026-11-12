import { test } from 'node:test';
import assert from 'node:assert/strict';
import { tileIndex, type TileCells } from '../src/place/far-ground-index.ts';

const NX = 49;
const xy = (v: number) => [v % NX, Math.floor(v / NX)] as const;
const tris = (index: number[]) => {
  const out: [number, number][][] = [];
  for (let k = 0; k < index.length; k += 3)
    out.push([index[k]!, index[k + 1]!, index[k + 2]!].map(xy) as [number, number][]);
  return out;
};
const area2 = ([a, b, c]: [number, number][]) => (b![0] - a![0]) * (c![1] - a![1]) - (c![0] - a![0]) * (b![1] - a![1]);
const hole = (i: number, j: number) => i >= 13 && i < 19 && j >= 9 && j < 14; // the cove's patch, off the block grid
const none = () => false;
const TILES: TileCells[] = [
  [0, 0, 32, 32],
  [16, 8, 48, 40], // not aligned to 8, so blocks end short of the edge
  [0, 0, 30, 21], // a tile that is no multiple of the block size
];

for (const skip of [none, hole])
  for (const cells of TILES)
    for (const s of [1, 2, 4, 8]) {
      const [i0, j0, i1, j1] = cells;
      const label = `${skip === none ? 'whole' : 'holed'} tile ${cells.join(',')} step ${s}`;
      const t = tris(tileIndex(NX, cells, s, skip));

      test(`far ground covers every cell once, all facing one way: ${label}`, () => {
        // Same winding as the full mesh's (a, c, b); the total equals the cells the full mesh draws.
        assert.ok(
          t.every((tri) => area2(tri) < 0),
          'a triangle faces the wrong way or is degenerate',
        );
        let cellsDrawn = 0;
        for (let j = j0; j < j1; j++) for (let i = i0; i < i1; i++) if (!skip(i, j)) cellsDrawn++;
        assert.equal(
          t.reduce((sum, tri) => sum - area2(tri) / 2, 0),
          cellsDrawn,
        );
        // Sample inside every cell (quarter points): one triangle holds it, or none where the cell is skipped.
        for (let j = j0; j < j1; j++)
          for (let i = i0; i < i1; i++)
            for (const [du, dv] of [
              [0.137, 0.291],
              [0.713, 0.587],
              [0.451, 0.913],
            ] as const) {
              const px = i + du,
                py = j + dv;
              const inside = t.filter((tri) => {
                const sign = (p: [number, number], q: [number, number]) =>
                  (q[0] - p[0]) * (py - p[1]) - (q[1] - p[1]) * (px - p[0]);
                const d = [sign(tri[0]!, tri[1]!), sign(tri[1]!, tri[2]!), sign(tri[2]!, tri[0]!)];
                return d.every((v) => v <= 0) || d.every((v) => v >= 0);
              });
              assert.equal(inside.length, skip(i, j) ? 0 : 1, `cell ${i},${j}`);
            }
      });

      test(`far ground borders stay full resolution, so any neighbour level meets them: ${label}`, () => {
        // Every triangle edge lying on the tile's border is one cell long: its vertices are the full grid's, so a tile
        // of any other level (whose border is the same) shares them exactly. No T-junction, hence no crack.
        const edges = t.flatMap((tri) => [
          [tri[0]!, tri[1]!],
          [tri[1]!, tri[2]!],
          [tri[2]!, tri[0]!],
        ]);
        const onBorder = ([a, b]: [number, number][]) =>
          (a![0] === b![0] && (a![0] === i0 || a![0] === i1)) || (a![1] === b![1] && (a![1] === j0 || a![1] === j1));
        const border = edges.filter(([a, b]) => onBorder([a!, b!]));
        assert.ok(border.length > 0);
        for (const [a, b] of border) assert.equal(Math.abs(a![0] - b![0]) + Math.abs(a![1] - b![1]), 1);
      });
    }

test('far ground coarse levels draw fewer triangles; step 1 is the full grid', () => {
  const full = tileIndex(NX, [0, 0, 32, 32], 1, none).length / 3;
  assert.equal(full, 32 * 32 * 2);
  const two = tileIndex(NX, [0, 0, 32, 32], 2, none).length / 3;
  const four = tileIndex(NX, [0, 0, 32, 32], 4, none).length / 3;
  assert.ok(four < two && two < full);
});

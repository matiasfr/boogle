// Where Home's footpaths run, as a distance field over the land's grid: the pure half of path-surface.ts, so a test can
// check it without a renderer. Built from the same points the terrain grades its treads from (PATHS and the shore path),
// with each footbridge's span left out. It reads the layout only: nothing here moves a height (docs/plans/terrain-pass.md).
import { GRID, PATHS, type Pt } from './layout.ts';
import { SHORE_COAST, SHORE_PATH } from './shore-layout.ts';

/** Half the drawn tread's width, metres: inside the level strip the terrain grades (3.6 m and 2.4 m), so the tread
 * ends before a cut wall starts. */
export const TREAD_HALF = { bold: 3, plain: 1.9 };
/** The field's range either side of a tread's edge, metres. */
export const FIELD_REACH = 4;
/** Metres per texel; the field is smooth, so bilinear filtering gives an edge far finer than the land's 2 m cells. */
export const FIELD_CELL = 1;
export const FIELD_W = Math.round((GRID.x1 - GRID.x0) / FIELD_CELL) + 1,
  FIELD_H = Math.round((GRID.z1 - GRID.z0) / FIELD_CELL) + 1;

/** Each run of path on the ground (Place-local), with its tread's half width. */
export const PATH_RUNS: { pts: Pt[]; half: number }[] = [
  ...PATHS.flatMap((p) => {
    const half = p.bold ? TREAD_HALF.bold : TREAD_HALF.plain;
    return [
      { pts: p.pts.slice(0, p.bridgeAt + 1), half },
      { pts: p.pts.slice(p.bridgeAt + 1), half },
    ];
  }),
  ...(SHORE_COAST ? [{ pts: SHORE_PATH, half: TREAD_HALF.bold }] : []),
];

/** Signed distance to the nearest tread's edge at a Place-local point (negative on the tread), the unit direction away
 * from that path's centre line, how steeply that stretch climbs (rise over run) and the path's own height there (the
 * height of the nearest point of its centre line: it runs straight across the tread, whatever the ground's facets do). */
export function pathAt(x: number, z: number) {
  let edge = Infinity,
    dx = 0,
    dz = 0,
    grade = 0,
    height = 0;
  for (const run of PATH_RUNS)
    for (let k = 0; k < run.pts.length - 1; k++) {
      const a = run.pts[k]!,
        b = run.pts[k + 1]!;
      const sx = b[0] - a[0],
        sz = b[1] - a[1],
        len2 = sx * sx + sz * sz;
      const t = Math.max(0, Math.min(1, ((x - a[0]) * sx + (z - a[1]) * sz) / len2));
      const ox = x - a[0] - sx * t,
        oz = z - a[1] - sz * t,
        d = Math.hypot(ox, oz);
      if (d - run.half >= edge) continue;
      edge = d - run.half;
      dx = d > 1e-6 ? ox / d : 0;
      dz = d > 1e-6 ? oz / d : 0;
      grade = Math.abs(b[2] - a[2]) / Math.sqrt(len2);
      height = a[2] + (b[2] - a[2]) * t;
    }
  return { edge, dx, dz, grade, height };
}

/** The field, four floats a texel, row by row from the grid's (x0, z0): the edge distance (clamped to ±FIELD_REACH),
 * the grade, the path's height and a spare. Texels the paths never come near stay "far". */
export function bakePathField() {
  const data = new Float32Array(FIELD_W * FIELD_H * 4);
  for (let k = 0; k < FIELD_W * FIELD_H; k++) data.set([FIELD_REACH, 0, 0, 0], k * 4);
  const reach = FIELD_REACH + 1;
  const done = new Uint8Array(FIELD_W * FIELD_H);
  for (const run of PATH_RUNS)
    for (let s = 0; s < run.pts.length - 1; s++) {
      const a = run.pts[s]!,
        b = run.pts[s + 1]!,
        pad = run.half + reach;
      const i0 = Math.max(0, Math.floor((Math.min(a[0], b[0]) - pad - GRID.x0) / FIELD_CELL)),
        i1 = Math.min(FIELD_W - 1, Math.ceil((Math.max(a[0], b[0]) + pad - GRID.x0) / FIELD_CELL)),
        j0 = Math.max(0, Math.floor((Math.min(a[1], b[1]) - pad - GRID.z0) / FIELD_CELL)),
        j1 = Math.min(FIELD_H - 1, Math.ceil((Math.max(a[1], b[1]) + pad - GRID.z0) / FIELD_CELL));
      for (let j = j0; j <= j1; j++)
        for (let i = i0; i <= i1; i++) {
          const k = i + j * FIELD_W;
          if (done[k]) continue;
          done[k] = 1;
          const f = pathAt(GRID.x0 + i * FIELD_CELL, GRID.z0 + j * FIELD_CELL);
          data.set([Math.max(-FIELD_REACH, Math.min(FIELD_REACH, f.edge)), f.grade, f.height, 0], k * 4);
        }
    }
  return data;
}

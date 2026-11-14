// Where the walkable ground under a path is not yet a clean tread (docs/plans/terrain-pass.md, the paths round): a
// report for a later ground step, not a check. Along each run of path, every 2 m, it measures the collider across the
// tread: the level width around the centre line, the cross fall, and the wall or drop beside it.
// `node dev/terrain-pass/path-ground.ts` (add `--all` for every station).
import { PATH_RUNS } from '../../src/place/path-field.ts';
import { colliderHeight } from '../../src/proto/terrain-pass/surface.ts';

const all = process.argv.includes('--all');
type Station = { x: number; z: number; y: number; level: number; fall: number; left: number; right: number };
PATH_RUNS.forEach((run, n) => {
  let from: Station | null = null,
    worst: Station | null = null,
    last: Station | null = null,
    count = 0;
  const flush = () => {
    if (from && worst && last && count >= 3)
      console.log(
        `run ${n} (half ${run.half}): (${from.x.toFixed(0)}, ${from.z.toFixed(0)}) to (${last.x.toFixed(0)}, ${last.z.toFixed(0)}), ` +
          `${count * 2} m, y ${from.y.toFixed(1)}..${last.y.toFixed(1)}; narrowest level width ${worst.level.toFixed(1)} m of ${run.half * 2} m ` +
          `at (${worst.x.toFixed(0)}, ${worst.z.toFixed(0)}), cross fall there ${worst.fall.toFixed(2)} m, ` +
          `ground beside ${worst.left.toFixed(1)} m / ${worst.right.toFixed(1)} m`,
      );
    from = worst = last = null;
    count = 0;
  };
  for (let k = 0; k < run.pts.length - 1; k++) {
    const a = run.pts[k]!,
      b = run.pts[k + 1]!;
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]),
      ux = (b[0] - a[0]) / len,
      uz = (b[1] - a[1]) / len;
    for (let s = 0; s < len; s += 2) {
      const cx = a[0] + ux * s,
        cz = a[1] + uz * s,
        y = colliderHeight(cx, cz);
      const at = (o: number) => colliderHeight(cx - uz * o, cz + ux * o);
      // The level width: how far either side the ground stays within 12 cm of the centre line's.
      let lo = 0,
        hi = 0;
      while (lo > -run.half - 1 && Math.abs(at(lo - 0.25) - y) < 0.12) lo -= 0.25;
      while (hi < run.half + 1 && Math.abs(at(hi + 0.25) - y) < 0.12) hi += 0.25;
      const station: Station = {
        x: cx,
        z: cz,
        y,
        level: Math.min(run.half * 2, 2 * Math.min(-lo, hi)),
        fall: Math.abs(at(run.half) - at(-run.half)),
        left: at(-run.half - 1.5) - y,
        right: at(run.half + 1.5) - y,
      };
      if (all)
        console.log(
          `  run ${n} (${cx.toFixed(0)}, ${cz.toFixed(0)}) y ${y.toFixed(1)} level ${station.level.toFixed(1)} fall ${station.fall.toFixed(2)} beside ${station.left.toFixed(1)}/${station.right.toFixed(1)}`,
        );
      if (station.level < run.half * 2 - 0.5) {
        from ??= station;
        last = station;
        count++;
        if (!worst || station.level < worst.level) worst = station;
      } else flush();
    }
  }
  flush();
});

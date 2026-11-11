// Where each train line runs, coarse: world centimetres every 10 m along it (RAIL_LINES[line].path, sampled from
// Place's rail curves in src/place/layout.ts, today's Home; test/railway-train.test.ts holds the two together).
// Only the server's check of a passenger's stop request reads it (is the actor near the train?), so a metre of chord
// error is nothing. Pure.
import { RAIL_LINES } from './railway-lines.ts';
const STEP_CM = 1000;
/** World (x, z) in cm of `cm` along line `line`, clamped to its sampled length. */
export function railLinePoint(line: number, cm: number) {
  const p = RAIL_LINES[line]!.path,
    last = p.length / 2 - 1;
  const f = Math.max(0, Math.min(last, cm / STEP_CM)),
    k = Math.min(last - 1, Math.floor(f)),
    t = f - k;
  return {
    x: p[k * 2]! + (p[k * 2 + 2]! - p[k * 2]!) * t,
    z: p[k * 2 + 1]! + (p[k * 2 + 3]! - p[k * 2 + 1]!) * t,
  };
}

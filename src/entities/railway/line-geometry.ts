// Where a line runs in the world, and a point beside it (from rail.ts, which was the rail of ?proto=place). No three.js.
import { ORIGIN, lineAt, type Line, type LinePoint } from '../../place/layout.ts';

export const P: LinePoint = { x: 0, z: 0, ux: 0, uz: 1 };
export const lateral = (l: number, out: { x: number; z: number }) => {
  out.x = P.x - P.uz * l + ORIGIN.x;
  out.z = P.z + P.ux * l + ORIGIN.z;
  return out;
};
/** A world point beside the line. */
export function besideLine(line: Line, s: number, l: number) {
  lineAt(line, s, P);
  return lateral(l, { x: 0, z: 0 });
}

// The stall shunt's path as geometry, with no three.js (the Roundhouse view rides it, ./roundhouse-view.ts; the yard
// test walks it, test/roundhouse-yard.test.ts): the open stall's road from its back to the table's centre, the deck's
// turn, the spur down to road 2's buffer stub, and road 2 out to the wagon's wait. Every height is the track's rail
// height from the source the track is drawn from (./home-station-view.ts): `stallRoadY` on the stall road, the deck's
// on the table and the spur, the line's `railY` on road 2. Local.
import { BUFFERS, SHUNT_CUSP_S, STALLS, TABLE, roadAt, shuntPath, stallFrame } from '../../place/home-station.ts';
import { LINES, ORIGIN, railY } from '../../place/layout.ts';
import { WAGON_S } from '../../sim/railway-works-layout.ts';
import { SHUNT, shuntPose, stallRoadY } from './works-shape.ts';

type P3 = { x: number; y: number; z: number };
/** Along the stall's length from its middle (the door at -4.5): the wagon parks at the door end, the shunter `gap`
 * behind it, ready to push. */
export const PARK = { wagon: -0.9, gap: 3.6 } as const;

const lengths = (pts: P3[]) => {
  const out: number[] = [0];
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1]!,
      b = pts[i]!;
    out.push(out[i - 1]! + Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z));
  }
  return out;
};
/** The point at distance `a` along a polyline, carried straight on past either end (a bogie can stand beyond the last
 * point). */
function polyAt<T extends P3>(pts: P3[], along: number[], a: number, out: T): T {
  let i = 1;
  while (i < pts.length - 1 && along[i]! < a) i++;
  let u = (a - along[i - 1]!) / (along[i]! - along[i - 1]! || 1);
  if (i > 1) u = Math.max(0, u);
  if (i < pts.length - 1) u = Math.min(1, u);
  const p = pts[i - 1]!,
    q = pts[i]!;
  out.x = p.x + (q.x - p.x) * u;
  out.y = p.y + (q.y - p.y) * u;
  out.z = p.z + (q.z - p.z) * u;
  return out;
}
const wrap = (angle: number) => Math.atan2(Math.sin(angle), Math.cos(angle));

export function createShuntPath() {
  const world = (p: { x: number; z: number }) => ({ x: p.x + ORIGIN.x, z: p.z });
  const deck = railY(LINES.east, 0);
  const table = world(TABLE);
  const stall = stallFrame(STALLS.open);
  /** A point of the stall road `r` metres from the table's centre, at the height the road is drawn at there. */
  const road = (r: number): P3 => {
    const p = world({ x: TABLE.x + stall.u.x * r, z: TABLE.z + stall.u.z * r });
    return { x: p.x, y: stallRoadY(r - TABLE.r, deck), z: p.z };
  };
  const middle = STALLS.door + STALLS.depth / 2;
  // Back, parked, the door (where the ramp ends: the one grade break, `stallRoadY`'s), the rim, the table's centre.
  const pathPts = [
    road(middle + PARK.wagon + PARK.gap + 0.5),
    road(middle + PARK.wagon),
    road(STALLS.door),
    road(TABLE.r),
    { x: table.x, y: deck, z: table.z },
  ];
  const cum = lengths(pathPts);
  /** The wagon's parked place along the path, and the table's centre. */
  const PARKED_A = cum[1]!,
    TABLE_A = cum[4]!;
  const pathAt = <T extends P3>(a: number, out: T) => polyAt(pathPts, cum, a, out);
  /** The shunt past the table (home-station.ts `shuntPath()`; docs/plans/home-flip.md, F2), in two tracks. The
   * deck turns the pair so the shunter leaves first: `inPts` runs from the table's centre down the spur onto road 2
   * and on to the buffer, and the pair backs down it, the shunter leading, until the wagon's centre is at the cusp;
   * `outPts` is road 2 from the buffer outward, along which the shunter pushes the wagon to its wait. One distance
   * still places each vehicle: `cuspA` is the wagon's at the cusp, `OUT_A` at its wait. */
  const wagonS = WAGON_S / 100,
    buffer = BUFFERS[1];
  const { pts, cusp } = shuntPath(wagonS);
  const roadPoint = (s: number): P3 => {
    const p = world(roadAt(1, s));
    return { x: p.x, y: railY(LINES.east, Math.max(0, s)), z: p.z };
  };
  // pts[3] is the table's centre and pts[cusp - 1] road 2 one metre short of the cusp: the spur at the table's height.
  const inPts = pts.slice(3, cusp).map((p): P3 => {
    const w = world(p);
    return { x: w.x, y: deck, z: w.z };
  });
  for (let s = SHUNT_CUSP_S; s > buffer; s--) inPts.push(roadPoint(s));
  inPts.push(roadPoint(buffer));
  const inCum = lengths(inPts);
  const outPts: P3[] = [];
  for (let s = buffer; s <= wagonS + 3; s++) outPts.push(roadPoint(s));
  const outCum = lengths(outPts);
  const cuspA = TABLE_A + PARK.gap + inCum[cusp - 3]!; // the cusp's distance from the table's centre
  const OUT_A = cuspA + (wagonS - SHUNT_CUSP_S);
  // The deck carries what stands on it (works-late-game step 5): drive on heading `hIn`, turn `turnBy` with the deck,
  // drive off heading `hOut` (the deck turns its stall end to the spur, so the pair leaves backwards, the shunter first).
  const before = pathAt(TABLE_A - 2, { x: 0, y: 0, z: 0 });
  const hIn = Math.atan2(table.x - before.x, table.z - before.z);
  const hOut = Math.atan2(inPts[1]!.x - table.x, inPts[1]!.z - table.z) + Math.PI;
  const turnBy = wrap(hOut - hIn);

  /** The point `c` metres ahead of the wagon's centre along the pair (its bogies ±1; the shunter's centre
   * `PARK.gap` behind) when the wagon's distance is `a`. Up to its seat on the deck the pair is on the stall road or
   * turning with the deck (`deckK` the turn done, 0..1, or null while no choreography turns it); then it backs down
   * `inPts` (the point ahead of the centre trails, nearer the table); past the cusp it runs out along `outPts`. */
  function pairAt<T extends P3>(a: number, c: number, deckK: number | null, out: T): T {
    const seated = TABLE_A + PARK.gap / 2;
    if (a <= seated) {
      const d = a + c - TABLE_A;
      if (deckK === null || Math.abs(d) >= TABLE.r) return pathAt(a + c, out);
      const h = hIn + turnBy * Math.min(1, Math.max(0, deckK));
      out.x = table.x + Math.sin(h) * d;
      out.y = deck;
      out.z = table.z + Math.cos(h) * d;
      return out;
    }
    if (a <= cuspA) return polyAt(inPts, inCum, a - seated - PARK.gap / 2 - c, out);
    return polyAt(outPts, outCum, SHUNT_CUSP_S + (a - cuspA) + c - buffer, out);
  }
  const front = { x: 0, y: 0, z: 0 },
    rear = { x: 0, y: 0, z: 0 };
  /** A vehicle's frame when the wagon's distance is `a` (the shunter's is `PARK.gap` behind): local +z points the way
   * out. The body sits between its two bogies and faces along them, so its heading eases through every corner of the
   * path, turns with the deck and pitches to the ramp. */
  function poseAt(a: number, shunter: boolean, deckK: number | null) {
    const wagon = shunter ? a + PARK.gap : a,
      c = shunter ? -PARK.gap : 0;
    return shuntPose(pairAt(wagon, c + SHUNT.bogie, deckK, front), pairAt(wagon, c - SHUNT.bogie, deckK, rear));
  }
  return { PARKED_A, TABLE_A, OUT_A, cuspA, turnBy, pairAt, poseAt };
}

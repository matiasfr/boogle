// Every place two tracks part, as the two centrelines a turnout is built from (./turnout.ts; the list and where each
// is: docs/plans/turnouts.md, "Every place two tracks meet"). One list, so no junction is hand placed. J1 to J9: the
// engine spur, the cart's leg at both ends, and the lines' offset-track turnouts and Far Head's crossover. Only J1 is
// drawn so far (home-yard.ts picks it by id); the rest are measured by the level check and test/turnout.test.ts. The
// sea junctions (railhead, Ring Island, the greybox stack) are step 7's. Local, no three.js.
import { clamp, lerp } from '../math.ts';
import { LEG, SPUR, march, roadAt } from './home-station.ts';
import {
  FORMATION,
  LINES,
  OFFSET_LAT,
  ORIGIN,
  crossLat,
  lineAt,
  offsetLat,
  railY,
  toWorld,
  type Line,
  type LinePoint,
  type LineSpec,
} from './layout.ts';
import type { Centre, Turnout } from './turnout.ts';

export type Junction = {
  id: string;
  /** Whose track it is on, and its toe by that line's `s`; `dir` is the way the through road runs from the toe. */
  line: LineSpec['id'];
  s: number;
  dir: 1 | -1;
  kind: 'stub' | 'crossover' | 'spur';
  /** The side its points lever stands on: +1 the through road's right, looking from the toe. */
  lever: 1 | -1;
  /** Shown only with this part of the yard: the leg's two ends stand while the leg does. */
  when?: 'leg';
  /** The through road's lateral off its line, metres to the line's right: Far Head's crossover leaves the up track
   * at J7. 0 when omitted. */
  off?: number;
  through: Centre;
  diverging: Centre;
};

const P: LinePoint = { x: 0, z: 0, ux: 0, uz: 1 };
/** A world point `lat` metres beside `line` at `s`, as track.ts sets the offset track across (line-geometry.ts). */
const beside = (line: Line, s: number, lat: number) => {
  lineAt(line, s, P);
  return { x: P.x - P.uz * lat + ORIGIN.x, z: P.z + P.ux * lat + ORIGIN.z, y: railY(line, s) };
};
/** A track that runs `lat(s)` beside a line, read `d` metres from `s0` in `dir`. */
const along =
  (line: Line, s0: number, dir: 1 | -1, lat: (s: number) => number): Centre =>
  (d) => {
    const s = s0 + dir * d;
    return beside(line, s, lat(s));
  };
/** One of Home's heads (road 0 is line 1's, road 1 line 2's), read `d` metres from `s0` in `dir`. */
const head =
  (road: 0 | 1, s0: number, dir: 1 | -1): Centre =>
  (d) => {
    const s = s0 + dir * d,
      p = roadAt(road, s);
    return { x: toWorld(p.x), z: p.z, y: railY(road ? LINES.east : LINES.north, Math.max(0, s)) };
  };
/** The cart's leg `at` metres from line 1's points; its rail height runs evenly from line 1's to road 2's
 * (home-station.ts cartRoadY). */
const leg = (at: number) => {
  const p = march(LEG.start, LEG.segs, at),
    from = railY(LINES.north, LEG.from),
    to = railY(LINES.east, LEG.to),
    t = clamp(at / LEG.len, 0, 1);
  return { x: toWorld(p.x), z: p.z, y: lerp(from, to, t) };
};

/** The timber across junction `j`'s line at the line's `s`: its two ends in metres to the line's right (`t.span` is to
 * the through road's, which runs against the line where `dir` is -1, and `off` beside it); null outside the turnout. */
export function spanAcross(j: Junction, t: Turnout, s: number): readonly [number, number] | null {
  const span = t.span((s - j.s) * j.dir),
    off = j.off ?? 0;
  return span && (j.dir > 0 ? [off + span[0], off + span[1]] : [off - span[1], off - span[0]]);
}

export function junctions(): Junction[] {
  // J1: the spur leaves road 2 at s 5.5 to the right; both at road 2's rail height (the spur is level to the table).
  const deck = railY(LINES.east, 0),
    toe = roadAt(SPUR.road, SPUR.s);
  const j1: Junction = {
    id: 'J1',
    line: 'quarry',
    s: SPUR.s,
    dir: 1,
    kind: 'spur',
    lever: 1,
    through: head(SPUR.road, SPUR.s, 1),
    diverging: (d) => {
      const p = march(toe, SPUR.segs, d);
      return { x: toWorld(p.x), z: p.z, y: deck };
    },
  };
  // The lines' offset track and crossover, as track.ts draws them; 0 where the line is single.
  const one = FORMATION.timber,
    two = FORMATION.quarry,
    up = (f: typeof one) => (s: number) => offsetLat(f, s) ?? 0,
    today = () => 0;
  const cross = (s: number) => crossLat(two, s) ?? (s < two.crossover![0] ? OFFSET_LAT : 0);
  const line = (
    id: string,
    lineId: LineSpec['id'],
    s: number,
    dir: 1 | -1,
    kind: Junction['kind'],
    lever: 1 | -1,
    through: (s: number) => number,
    diverging: (s: number) => number,
  ): Junction => {
    const l = lineId === 'timber' ? LINES.north : LINES.east;
    return {
      id,
      line: lineId,
      s,
      dir,
      kind,
      lever,
      off: through(s),
      through: along(l, s, dir, through),
      diverging: along(l, s, dir, diverging),
    };
  };
  // Levers stand on the side away from the road that leaves (designer call 3); step 3 settles Home's.
  return [
    j1,
    // J2: the leg's far end, onto road 2 at s 26 (its body beside road 2 from s 26 on); J3: its points off line 1 at
    // s 54 (its body beside line 1 back toward Home).
    {
      id: 'J2',
      line: 'quarry',
      s: LEG.to,
      dir: 1,
      kind: 'spur',
      lever: 1,
      when: 'leg',
      through: head(1, LEG.to, 1),
      diverging: (d) => leg(LEG.len - d),
    },
    {
      id: 'J3',
      line: 'timber',
      s: LEG.from,
      dir: -1,
      kind: 'spur',
      lever: 1,
      when: 'leg',
      through: head(0, LEG.from, -1),
      diverging: (d) => leg(d),
    },
    line('J4', 'timber', one.from, 1, 'stub', 1, today, up(one)),
    line('J5', 'timber', one.to, -1, 'stub', -1, today, up(one)),
    line('J6', 'quarry', two.from, 1, 'stub', 1, today, up(two)),
    line('J7', 'quarry', two.crossover![0], 1, 'crossover', -1, () => OFFSET_LAT, cross),
    line('J8', 'quarry', two.crossover![1], -1, 'crossover', -1, today, cross),
    line('J9', 'quarry', two.to, -1, 'stub', -1, today, up(two)),
  ];
}

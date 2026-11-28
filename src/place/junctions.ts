// Every place two tracks part, as the two centrelines a turnout is built from (./turnout.ts; the list and where each
// is: docs/plans/turnouts.md, "Every place two tracks meet"). One list, so no junction is hand placed. J1 to J9: the
// engine spur, the cart's leg at both ends, and the lines' offset-track turnouts and Far Head's crossover. The yard
// (home-yard.ts) and the lines (track.ts) draw their parts, turnout-blades.ts their moving blades and levers; the level
// check measures them. J10 to J12 (step 7) are the crossovers past the pier head, each two toes like Far Head's: the
// railhead's (railhead-view.ts, moving with the head), Ring Island's and the greybox stack's (route-greybox/leg-view.ts).
// Local, no three.js.
import { clamp, lerp, smoothstep } from '../math.ts';
import { LINE2, RAIL_LINES } from '../sim/railway-lines.ts';
import { RING_S, STACK_S, line2World, line2Y } from '../entities/railway/line2-path.ts';
import { HALL, LEG, SPUR, march, roadAt } from './home-station.ts';
import {
  FORMATION,
  LINES,
  OFFSET_LAT,
  ORIGIN,
  TURNOUT,
  crossLat,
  lineAt,
  offsetLat,
  railY,
  toWorld,
  type Line,
  type LinePoint,
  type LineSpec,
} from './layout.ts';
import { KIT, turnout, type Centre, type Turnout } from './turnout.ts';

export type Junction = {
  id: string;
  /** Whose track it is on, and its toe by that line's `s`; `dir` is the way the through road runs from the toe. */
  line: LineSpec['id'];
  s: number;
  dir: 1 | -1;
  kind: 'stub' | 'crossover' | 'spur';
  /** The side its points lever stands on: +1 the through road's right, looking from the toe. */
  lever: 1 | -1;
  /** Shown only with this part of the yard: the leg's two ends stand while the leg does. `merge`: taken up with the up
   * track's old merge when Q7 relays the pier (track.ts `retire`). */
  when?: 'leg' | 'merge';
  /** The through road's lateral off its line, metres to the line's right: Far Head's crossover leaves the up track
   * at J7. 0 when omitted. */
  off?: number;
  /** Home's points levers (J1 to J3): where the lever's box stands on the ground and its heading (the hall's), which
   * home-station-view.ts draws; a line's lever stands on its headblocks instead (turnout.ts `lever`). */
  stand?: { x: number; z: number; yaw: number };
  /** A line's lever box stands across the track from the headblocks' side (`lever`), where that side is taken. */
  leverAcross?: true;
  /** Drawn by a view of its own, not the line's track (track.ts): the railhead's (railhead-view.ts; listed at its first
   * head, it moves with the head), Ring Island's (ring-island/view.ts) or the greybox stack's (route-greybox/leg-view.ts). */
  view?: 'railhead' | 'ring' | 'stack';
  through: Centre;
  diverging: Centre;
};

/** A lever box `lat` metres beside Home's road `road` at `s` (Place's bearing convention), square to the hall. */
const roadSide = (road: 0 | 1, s: number, lat: number) => {
  const p = roadAt(road, s),
    b = (p.bearing * Math.PI) / 180;
  return { x: toWorld(p.x + Math.cos(b) * lat), z: p.z + Math.sin(b) * lat, yaw: HALL.yaw };
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

/** Line 2's ring run rounds each point to the centimetre (ringAt), which over a turnout's 0.1 m frames is a heading
 * degrees out; it is straight, so it is read here along its 20 m chords instead. The stack's row is not rounded. */
const CHORD = 20;
const qa = { x: 0, z: 0 },
  qb = { x: 0, z: 0 };
function seaPoint(s: number, lat: number) {
  if (s >= STACK_S) return line2World(s, lat, { x: 0, z: 0 });
  const k = Math.floor(s / CHORD) * CHORD;
  line2World(k, 0, qa);
  line2World(k + CHORD, 0, qb);
  const t = (s - k) / CHORD,
    ux = (qb.x - qa.x) / CHORD,
    uz = (qb.z - qa.z) / CHORD,
    n = Math.hypot(ux, uz);
  return { x: qa.x + (qb.x - qa.x) * t - (uz / n) * lat, z: qa.z + (qb.z - qa.z) * t + (ux / n) * lat };
}
/** Line 2 past the pier head as its views lay it (line2-path.ts), `lat(s)` beside it, read `d` metres from `s0` in
 * `dir`; `dy` over line2Y puts the centre a rail centre's TOP (0.1 m) under that view's own rail centres. */
const sea =
  (s0: number, dir: 1 | -1, lat: (s: number) => number, dy: number): Centre =>
  (d) => {
    const s = s0 + dir * d;
    return { ...seaPoint(s, lat(s)), y: line2Y(s) + dy };
  };
export type SeaCrossover = {
  id: string;
  view: NonNullable<Junction['view']>;
  /** Line 2's s where it leaves the up track and where it joins the down track. */
  s0: number;
  s1: number;
  /** Its centre's lateral at s (line2-path.ts line2Lat's ease). */
  lat: (s: number) => number;
  /** The up track's toe (with s) and the down track's (against it). */
  a: Junction;
  b: Junction;
};
/**
 * The crossovers past the pier head, from the catalog's ends of line 2 as line2-path.ts line2Lat eases a homeward train
 * across (a stub's over the 20 m before its merge, a crossover's over Far Head's 22 m after it): the railhead's at its
 * first head (J10), Ring Island's (J11), the stack heads' and High Gorge's (J12.1 to J12.4). Each is two toes, `a` on
 * the up track where the crossover leaves it (running with s) and `b` on the down track (running against s). Their
 * levers stand between the tracks: on these decks the side away from the other track is the edge (a builder's call on
 * designer call 3).
 */
export function seaCrossovers(): SeaCrossover[] {
  const cross = FORMATION.quarry.crossover!,
    span = cross[1] - cross[0];
  const ends = RAIL_LINES[LINE2]!.halts.filter(
    (h) => h.end && (!h.leg || h.leg.slot === 0) && h.end.mergeCm / 100 > RING_S,
  );
  let stack = 0;
  return ends.map((h) => {
    const m = h.end!.mergeCm / 100,
      [s0, s1] = h.end!.kind === 'stub' ? [m - TURNOUT, m] : [m, m + span];
    const view: SeaCrossover['view'] = s0 >= STACK_S ? 'stack' : h.end!.kind === 'stub' ? 'railhead' : 'ring';
    const id = view === 'stack' ? `J12.${++stack}` : view === 'railhead' ? 'J10' : 'J11',
      // Each view's rails stand at its own height over line2Y: the railhead's TOP over it, the Way's records 0.15 m
      // and the greybox's 0.22 m (their rail centres).
      dy = view === 'stack' ? 0.12 : view === 'ring' ? 0.05 : 0;
    // As layout.ts crossLat eases Far Head's, but read past its ends too (the rails' slope reads just outside).
    const lat = (s: number) => OFFSET_LAT * (1 - smoothstep(s0, s1, s));
    const toe = (a: boolean): Junction => {
      const s = a ? s0 : s1,
        dir: 1 | -1 = a ? 1 : -1;
      return {
        id: id + (a ? 'a' : 'b'),
        line: 'quarry',
        s,
        dir,
        kind: 'crossover',
        // Both toes' crossovers leave to their through road's right (hand +1), so the lever is on that side.
        lever: 1,
        off: a ? OFFSET_LAT : 0,
        view,
        through: sea(s, dir, () => (a ? OFFSET_LAT : 0), dy),
        diverging: sea(s, dir, lat, dy),
      };
    };
    return { id, view, s0, s1, lat, a: toe(true), b: toe(false) };
  });
}

/** A stretch of rail in line 2's frame: lateral `lat` (metres to its right), from `s0` to `s1`. */
export type RailCut = { lat: number; s0: number; s1: number };
/**
 * What a sea crossover's view draws, in line 2's frame (s, lat) unless named: its two turnouts (`plain` 0: the
 * crossover's own rails run from each toe, as Far Head's do in track.ts), the stretches of the plain rails its blades
 * are cut out of (`cuts`: each toe's through-road inner rail, toe to heel), the crossover's two rails as chords about 1 m
 * long, each a gauge apart square to it and its inner rail cut for the blade at each end, and one timber per station
 * from a headblock behind one toe to one behind the other, the union of the two turnouts' spans (stations 1.2 m apart
 * or a little less, both toes on one). `toes` pairs each toe with its turnout (turnout-blades.ts draws their blades);
 * `wings` are both turnouts' wing and check rails, world pieces.
 */
export function crossoverPlan(c: SeaCrossover) {
  const ta = turnout(c.a.through, c.a.diverging, c.a.lever, 0),
    tb = turnout(c.b.through, c.b.diverging, c.b.lever, 0);
  const half = KIT.gauge / 2;
  // The through road's blade lies `dir * hand` half a gauge to the line's right of it (track.ts cutPoints), the
  // crossover's on the other side of the crossover.
  const toes = [
    { j: c.a, t: ta },
    { j: c.b, t: tb },
  ];
  const blades = toes.map(({ j, t }) => {
    const r = j.dir * t.hand * half,
      [s0, s1] = [j.s, j.s + j.dir * t.bladeLen].sort((x, y) => x - y) as [number, number];
    return { lat: (j.off ?? 0) + r, r: -r, s0, s1 };
  });
  const cuts: RailCut[] = blades.map(({ lat, s0, s1 }) => ({ lat, s0, s1 }));
  // The crossover's rails: stations every metre or so, and at each blade's heel.
  const n = Math.max(1, Math.round(c.s1 - c.s0)),
    grid = Array.from({ length: n + 1 }, (_, k) => c.s0 + ((c.s1 - c.s0) * k) / n),
    at = [...grid, ...blades.flatMap((b) => [b.s0, b.s1])]
      .sort((x, y) => x - y)
      .filter((s, k, all) => k === 0 || s - all[k - 1]! > 1e-6);
  const slope = (s: number) => (c.lat(s + 0.05) - c.lat(s - 0.05)) / 0.1;
  const side = (s: number, r: number) => {
    const g = slope(s),
      len = Math.hypot(1, g);
    return { s: s - (r * g) / len, lat: c.lat(s) + r / len };
  };
  const rails: { a: { s: number; lat: number }; b: { s: number; lat: number } }[] = [];
  for (const r of [-half, half])
    for (let k = 1; k < at.length; k++) {
      const s0 = at[k - 1]!,
        s1 = at[k]!,
        mid = (s0 + s1) / 2;
      if (blades.some((b) => b.r === r && mid > b.s0 && mid < b.s1)) continue;
      rails.push({ a: side(s0, r), b: side(s1, r) });
    }
  const pitch = (c.s1 - c.s0) / Math.round((c.s1 - c.s0) / 1.2);
  const timbers: { s: number; lo: number; hi: number }[] = [];
  for (let s = c.s0 - pitch; s <= c.s1 + pitch + 1e-6; s += pitch) {
    const spans = [spanAcross(c.a, ta, s), spanAcross(c.b, tb, s)].filter((x) => x !== null);
    if (spans.length)
      timbers.push({ s, lo: Math.min(...spans.map((x) => x[0])), hi: Math.max(...spans.map((x) => x[1])) });
  }
  return { toes, wings: [...ta.rails, ...tb.rails], cuts, rails, timbers };
}
/** How far a junction's parts translate when it stands `ds` metres along its line from where it was built (a moving
 * one, the railhead's J10: its line is straight and evenly graded there). */
export function movedBy(j: Junction, ds: number) {
  if (!ds) return { x: 0, y: 0, z: 0 };
  const a = j.through(0),
    b = j.through(j.dir * ds);
  return { x: b.x - a.x, y: b.y - a.y, z: b.z - a.z };
}
/** What is left of a plain rail from `s0` to `s1` at `lat` once `cuts` are taken out (none under 8 cm). */
export function uncut(s0: number, s1: number, lat: number, cuts: readonly RailCut[]): [number, number][] {
  let left: [number, number][] = [[s0, s1]];
  for (const c of cuts) {
    if (Math.abs(c.lat - lat) > 1e-6) continue;
    left = left.flatMap(([a, b]): [number, number][] =>
      b <= c.s0 || a >= c.s1
        ? [[a, b]]
        : (
            [
              [a, Math.min(b, c.s0)],
              [Math.max(a, c.s1), b],
            ] as [number, number][]
          ).filter(([p, q]) => q - p > 0.08),
    );
  }
  return left;
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
    stand: roadSide(SPUR.road, SPUR.s - 1.5, 2.4),
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
    when?: Junction['when'],
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
      ...(when && { when }),
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
      stand: roadSide(1, LEG.to + 1.5, 2.4),
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
      stand: roadSide(0, LEG.from + 1.5, -2.4),
      through: head(0, LEG.from, -1),
      diverging: (d) => leg(d),
    },
    line('J4', 'timber', one.from, 1, 'stub', 1, today, up(one)),
    line('J5', 'timber', one.to, -1, 'stub', -1, today, up(one)),
    line('J6', 'quarry', two.from, 1, 'stub', 1, today, up(two)),
    line('J7', 'quarry', two.crossover![0], 1, 'crossover', -1, () => OFFSET_LAT, cross),
    // J8's headblocks run out under Far Head's platform (step 4), so its lever stands across the track from them.
    { ...line('J8', 'quarry', two.crossover![1], -1, 'crossover', -1, today, cross), leverAcross: true },
    line('J9', 'quarry', two.to, -1, 'stub', -1, today, up(two), 'merge'),
    ...seaCrossovers().flatMap((c) => [c.a, c.b]),
  ];
}

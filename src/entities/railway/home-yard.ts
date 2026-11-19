// Home's yard track, laid: which track the station has that is not a line, as yard track (./yard-track.ts) from the
// station's data (src/place/home-station.ts). The buffer stubs, the spur with its turnout off road 2 and a stall road
// for every bay of the rotunda, then (shown once line 2 has its first stretch) the cart's leg and the turnout's parts on road 2. Geometry only, no scene: the station view draws it
// (./home-station-view.ts) and the yard test reads the same rails the shunt rides (test/roundhouse-yard.test.ts).
import * as home from '../../place/home-station.ts';
import { junctions, spanAcross } from '../../place/junctions.ts';
import { bayFrame } from '../../place/rotunda.ts';
import { LINES, LINKS, ORIGIN, railY } from '../../place/layout.ts';
import { KIT, turnout, type RailPiece } from '../../place/turnout.ts';
import { sleeperStations } from './track-panels.ts';
import { stallRoadY } from './works-shape.ts';
import { createYardTrack, type TrackPath, type TrackPose } from './yard-track.ts';

/** Where a bay's road ends, from the table's centre (m): a metre and a half short of the back wall. */
const STALL_ROAD_END = 23.5;
/** `ground` is the terrain's height at a world point. */
export function layHomeYard(ground: (x: number, z: number) => number) {
  const yard = createYardTrack(ground);
  const world = (p: { x: number; z: number }) => ({ x: p.x + ORIGIN.x, z: p.z });
  const railAt = (road: 0 | 1, s: number) => railY(road ? LINES.east : LINES.north, Math.max(0, s));
  const deck = railY(LINES.east, 0);
  /** A station pose (Place-local, bearing in degrees) as a track pose at rail height `y`. */
  const poseOf = (p: { x: number; z: number; bearing: number }, y: number): TrackPose => {
    const b = (p.bearing * Math.PI) / 180;
    return { ...world(p), yaw: Math.atan2(Math.sin(b), -Math.cos(b)), y };
  };
  const roadPath =
    (road: 0 | 1): TrackPath =>
    (s) =>
      poseOf(home.roadAt(road, s), railAt(road, s));

  // The stubs. The line's own track starts at s 0: a stub carries its rails and its sleepers' spacing back to the buffer.
  for (const road of [0, 1] as const) {
    const stub = roadPath(road),
      first = sleeperStations(LINKS[road]!, 0, 3)[0]?.s ?? 0.6;
    yard.railsAlong(stub, home.BUFFERS[road] + 0.3, 0);
    for (let s = first - 1.2; s > home.BUFFERS[road] + 0.5; s -= 1.2) yard.sleeper(stub(s));
  }
  // The spur leaves road 2 at a turnout (J1: src/place/junctions.ts; docs/plans/turnouts.md), drawn for the through
  // road. Its parts on the spur's own rails stand from the start; those beside road 2's rails are laid with road 2's
  // track, at the end of this function.
  const list = junctions();
  /** A junction from the one list, with its turnout. */
  const at = (id: string) => {
    const j = list.find((x) => x.id === id)!;
    return { j, t: turnout(j.through, j.diverging, j.lever) };
  };
  const { j: j1, t: points } = at('J1');
  // Both wing rails wait for road 2: the one beside the spur's vee leg springs from road 2's rail.
  const withSpur = (r: RailPiece) => r.road === 'diverging' && r.role !== 'wing';
  {
    const start = home.roadAt(1, home.SPUR.s),
      len = home.SPUR.segs.reduce((n, seg) => n + seg.len, 0);
    const spur: TrackPath = (l) => poseOf(home.march(start, home.SPUR.segs, l), deck);
    // Through the turnout road 2's sleepers are its timbers, each cut to carry all four rails (the two at the toe run
    // out toward the lever); past it the spur has its own.
    const shared = yard.timbers(
      sleeperStations(LINKS[1]!, j1.s - KIT.head, j1.s + 14).map((t) => ({
        ...roadPath(1)(t.s),
        depth: t.depth,
        span: points.span(t.s - j1.s),
      })),
      spur,
      -KIT.head,
      Math.min(len, 14),
    );
    // The stock rail from the toe, the open blade, the closure rail, the vee's leg and a check rail; then plain track
    // to the table's rim.
    for (const r of points.rails) if (withSpur(r)) yard.rail(r.a, r.b, r.w);
    yard.railsAlong(spur, points.plainD, len);
    yard.sleepersAlong(spur, shared ? shared.hi + 0.7 : 0, len);
  }
  // The stall roads: off the table's rim at the lines' height, down a ramp to ground-level rails at the door
  // (`stallRoadY`, which the shunt's path reads too), then level: to the back wall of the working bay, and in every
  // other bay of the rotunda to `STALL_ROAD_END` from the table's centre, built or a ruin (rails in the grass).
  for (const bay of home.ROTUNDA_HOME.order) {
    const f = bayFrame(home.ROTUNDA_HOME, bay);
    const ramp = home.STALLS.door - home.TABLE.r,
      end = bay === home.ROTUNDA_HOME.order[0] ? ramp + home.STALLS.depth - 0.3 : STALL_ROAD_END - home.TABLE.r;
    const road: TrackPath = (l) => ({
      ...world({ x: f.rim.x + f.u.x * l, z: f.rim.z + f.u.z * l }),
      yaw: f.yaw,
      y: stallRoadY(l, deck),
    });
    for (const [from, to] of [
      [0, ramp],
      [ramp, end],
    ] as const) {
      yard.railsAlong(road, from, to);
      yard.sleepersAlong(road, from, to);
    }
  }
  // The cart's leg, shown once it is laid, everything of it together (its turnouts' parts beside the lines' rails
  // too). At each end it leaves a line at a turnout (J3 off line 1, J2 onto road 2: src/place/junctions.ts), whose
  // timbers are that line's sleepers carried on under it, as at the spur; between them it has its own, on posts over
  // the dip it crosses.
  yard.later();
  {
    const { from, to, start, segs, len } = home.LEG;
    const fromY = railAt(0, from),
      toY = railAt(1, to);
    // Past either end it runs straight on (march), so the headblocks behind each toe find it.
    const leg: TrackPath = (l) => poseOf(home.march(start, segs, l), fromY + ((toY - fromY) * Math.min(l, len)) / len);
    const j2 = at('J2'),
      j3 = at('J3'),
      j4 = at('J4');
    // J3 shares stations with J4 on line 1's other side: there line 1 already draws J4's timber (track.ts), and this
    // carries it on under the leg, so the union is one timber.
    const off = yard.timbers(
      sleeperStations(LINKS[0]!, from - j3.t.clearD, from + KIT.head).flatMap((st) => {
        const mine = spanAcross(j3.j, j3.t, st.s);
        if (!mine) return [];
        const span = [Math.max(mine[0], spanAcross(j4.j, j4.t, st.s)?.[1] ?? -Infinity), mine[1]] as const;
        return span[1] - span[0] > 0.05 ? [{ ...roadPath(0)(st.s), depth: st.depth, span }] : [];
      }),
      leg,
      -KIT.head,
      j3.t.clearD + 2,
    );
    yard.timbers(
      sleeperStations(LINKS[1]!, to - KIT.head, to + j2.t.clearD).flatMap((st) => {
        const span = spanAcross(j2.j, j2.t, st.s);
        return span ? [{ ...roadPath(1)(st.s), depth: st.depth, span }] : [];
      }),
      leg,
      len - j2.t.clearD - 2,
      len + KIT.head,
    );
    for (const { t } of [j3, j2]) for (const r of t.rails) yard.rail(r.a, r.b, r.w);
    yard.railsAlong(leg, j3.t.plainD, len - j2.t.plainD);
    yard.sleepersAlong(leg, Math.max(j3.t.clearD, off ? off.hi + 0.7 : 0), len - j2.t.clearD);
  }
  // The spur turnout's parts beside road 2's own rails (the wing rails and a check rail): road 2 past s 7 is laid
  // with line 2's first stretch, as the leg is.
  for (const r of points.rails) if (!withSpur(r)) yard.rail(r.a, r.b, r.w);
  return yard;
}

// Home's yard track, laid: which track the station has that is not a line, as yard track (./yard-track.ts) from the
// station's data (src/place/home-station.ts). The buffer stubs, the spur and the three stall roads, then (shown once
// line 2 has its first stretch) the cart's leg. Geometry only, no scene: the station view draws it
// (./home-station-view.ts) and the yard test reads the same rails the shunt rides (test/roundhouse-yard.test.ts).
import * as home from '../../place/home-station.ts';
import { LINES, LINKS, ORIGIN, railY } from '../../place/layout.ts';
import { sleeperStations } from './track-panels.ts';
import { stallRoadY } from './works-shape.ts';
import { createYardTrack, type TrackPath, type TrackPose } from './yard-track.ts';

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
  /** A line's own sleepers between two of its `s`, as poses: where another track runs beside it, they carry both. */
  const lineSleepers = (road: 0 | 1, from: number, to: number) =>
    sleeperStations(LINKS[road]!, from, to).map((t) => ({ ...roadPath(road)(t.s), depth: t.depth }));

  // The stubs. The line's own track starts at s 0: a stub carries its rails and its sleepers' spacing back to the buffer.
  for (const road of [0, 1] as const) {
    const stub = roadPath(road),
      first = sleeperStations(LINKS[road]!, 0, 3)[0]?.s ?? 0.6;
    yard.railsAlong(stub, home.BUFFERS[road] + 0.3, 0);
    for (let s = first - 1.2; s > home.BUFFERS[road] + 0.5; s -= 1.2) yard.sleeper(stub(s));
  }
  {
    // Where the spur leaves road 2 it shares road 2's sleepers, carried on under it as long timbers (no blades, frog
    // or lever yet: docs/plans/home-station.md, step 10); its rails begin beside road 2's and run to the table's rim.
    const start = home.roadAt(1, home.SPUR.s),
      len = home.SPUR.segs.reduce((n, seg) => n + seg.len, 0);
    const spur: TrackPath = (l) => poseOf(home.march(start, home.SPUR.segs, l), deck);
    const shared = yard.timbers(lineSleepers(1, home.SPUR.s, home.SPUR.s + 14), spur, 0, Math.min(len, 14));
    yard.railsAlong(spur, yard.clearOf(spur, 0, 6, roadPath(1), home.SPUR.s, home.SPUR.s + 8), len);
    yard.sleepersAlong(spur, shared ? shared.hi + 0.7 : 0, len);
  }
  // The stall roads: off the table's rim at the lines' height, down a ramp to ground-level rails at the door
  // (`stallRoadY`, which the shunt's path reads too), then level: to the back wall of the open stall, a rail's length
  // onto a ruin's floor.
  for (const bearing of home.STALLS.bearings) {
    const f = home.stallFrame(bearing);
    const ramp = home.STALLS.door - home.TABLE.r,
      end = ramp + (bearing === home.STALLS.open ? home.STALLS.depth - 0.3 : 3);
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
  // The cart's leg, shown once it is laid. At each end it runs beside a line and shares that line's sleepers, as the
  // spur does; between them it has its own, on posts over the dip it crosses.
  yard.later();
  {
    const { from, to, start, segs, len } = home.LEG;
    const fromY = railAt(0, from),
      toY = railAt(1, to);
    const leg: TrackPath = (l) => poseOf(home.march(start, segs, l), fromY + ((toY - fromY) * l) / len);
    const off = yard.timbers(lineSleepers(0, from - 14, from), leg, 0, 14),
      on = yard.timbers(lineSleepers(1, to, to + 14), leg, len - 14, len);
    yard.railsAlong(
      leg,
      yard.clearOf(leg, 0, 6, roadPath(0), from - 8, from),
      yard.clearOf(leg, len, len - 6, roadPath(1), to, to + 8),
    );
    yard.sleepersAlong(leg, off ? off.hi + 0.7 : 0, on ? on.lo - 0.7 : len);
  }
  return yard;
}

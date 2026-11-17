// R2b review: restore one input (and its derived values) in memory; never mutate a room or fixture.
// node --import ./test/helpers/rail-no-audit.ts --import ./dev/sim/hooks.ts dev/level/rider-coach-headway.ts current|home|tail
import { RAIL_LINES, TRAIN_EXTENT, circuitLen } from '../../src/sim/railway-lines.ts';
import { TRAIN, TRAIN_PHASE, TRAIN_STOPS, trainAlong, trainArrives } from '../../src/sim/railway-train.ts';
import { LINE_SLOTS, cycleTicks, headTicks, trainPose } from '../../src/sim/railway-trains.ts';
import { Train, Line } from '../../src/sim/railway-components.ts';
import { trainStops } from '../../src/sim/railway-queries-trains.ts';
import { railwayAtTrains, unaudited, railTick, train, line as lineRow } from '../../test/helpers/rail.ts';
const mode = process.argv[2] ?? 'current';
if (!['current', 'home', 'tail'].includes(mode)) throw new Error('Expected current|home|tail');
if (mode === 'home') {
  (RAIL_LINES[1]!.halts[0]! as { s: number }).s = 1825;
  (TRAIN_STOPS[1] as number[])[0] = 1825;
}
if (mode === 'tail') (TRAIN_EXTENT as { behindCm: number }).behindCm = 1270;
if (mode === 'tail') for (const l of RAIL_LINES.slice(0, 2)) (l.halts[0]!.end! as { signalCm: number }).signalCm -= 340;
const w = unaudited(railwayAtTrains('q6-done'));
for (let n = 0; n < TRAIN.wakeTicks; n++) railTick(w.w, ++w.t);
const [A, B] = LINE_SLOTS[1]!;
for (const p of [
  { k: A!, stop: 0, track: 0, depart: w.t - TRAIN.dwellTicks, s: TRAIN_STOPS[1]![0]! },
  { k: B!, stop: -1, track: 1, depart: w.t, s: RAIL_LINES[1]!.halts[0]!.end!.signalCm },
])
  Object.assign(w.w.mut(Train, w.w.lookup(Train, p.k)!)!, {
    phase: TRAIN_PHASE.STAND,
    at: p.stop,
    to: p.stop,
    track: p.track,
    origin: 0,
    depart: p.depart,
    req: 0,
    from: p.s,
    v0: 0,
    dest: p.s,
  });
for (const id of w.w.ids(Line)) Object.assign(w.w.mut(Line, id)!, { req: 0, left0: -1, left1: -1 });
const events: unknown[] = [];
const left: number[] = [];
let last = lineRow(w.w, 1).left0;
while (left.length < 7 && w.t < 30000) {
  const before = LINE_SLOTS[1]!.slice(0, 2).map((k) => ({ ...train(w.w, k), k }));
  railTick(w.w, ++w.t, 75);
  const now = lineRow(w.w, 1).left0;
  if (now !== last) {
    left.push(now);
    events.push({
      tick: w.t,
      rows: before.map((r) => ({
        k: r.k,
        at: r.at,
        phase: r.phase,
        to: r.to,
        from: r.from,
        dest: r.dest,
        v0: r.v0,
        arrival: trainArrives(r, 1),
        depart: r.depart,
        arrived: r.arrived,
        along: trainAlong(r, 1, w.t),
        c: trainPose(r, 1, trainStops(w.w, 1), w.t).c,
      })),
    });
  }
  last = now;
}
if (left.length !== 7) throw new Error('Control did not collect seven departures');
console.log(
  JSON.stringify(
    {
      mode,
      home: TRAIN_STOPS[1]![0],
      tail: TRAIN_EXTENT.behindCm,
      signal: RAIL_LINES[1]!.halts[0]!.end!.signalCm,
      cycle: cycleTicks(1, trainStops(w.w, 1)),
      head: headTicks(1, trainStops(w.w, 1), 75, 0, 2),
      circuit: circuitLen(trainStops(w.w, 1)),
      left,
      gaps: left.slice(1).map((n, k) => n - left[k]!),
      events,
    },
    null,
    2,
  ),
);

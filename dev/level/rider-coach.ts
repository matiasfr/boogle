// Production coach fit, with the same chord poses, buffer stretching and lateral paths as train-view.
import { consistOf } from '../../src/entities/railway/cars.ts';
import { ENGINE_LONG_AHEAD } from '../../src/entities/railway/engine.ts';
import {
  trainPlaces,
  deckAt,
  deckGap,
  CAR_BUFFERS,
  ENGINE_BUFFERS,
  type Deck,
  type TrackPoint,
} from '../../src/entities/railway/car-spacing.ts';
import { HALTS, OFFSET_HALTS, ORIGIN } from '../../src/place/layout.ts';
import { haltFrame } from '../../src/prefab/halt-deck.ts';
import { line2At, line2Lat, LINE2_END_S } from '../../src/entities/railway/line2-path.ts';
import { LINE2, RAIL_LINES, TRAIN_EXTENT } from '../../src/sim/railway-lines.ts';
import { RING_END, RING_HALT, RING_HEAD, ringAt } from '../../src/sim/railway-ring-layout.ts';
import { TRAIN } from '../../src/sim/railway-train.ts';

const consist = consistOf({ line: LINE2, wagon: true, steel: true });
const vehicles = consist.map((c) => ({
  d: c.offset,
  hx: c.spec.hx,
  back: c.spec.hz,
  front: c.spec.hz + (c.role === 'engine' ? ENGINE_LONG_AHEAD : 0),
  buffers: c.role === 'engine' ? ENGINE_BUFFERS : CAR_BUFFERS,
}));
const stops = RAIL_LINES[LINE2]!.halts.map((h) => h.s);
export function coachTrain(s: number, up: boolean, endStops: readonly number[] = stops) {
  const p = { x: 0, z: 0, ux: 0, uz: 1 };
  const at = (s: number, o: TrackPoint) => {
    line2At(s, p, true);
    const lat = line2Lat({ track: Number(up), origin: 0 }, s, endStops, undefined, true);
    o.x = p.x - p.uz * lat;
    o.z = p.z + p.ux * lat;
  };
  // Match train-view: a terminal row may say track 1 while every car is still on the original straight.
  const lat = (at: number) => line2Lat({ track: Number(up), origin: 0 }, at, endStops, undefined, true);
  const spaced = lat(s + vehicles[0]!.d) !== 0 || lat(s + vehicles.at(-1)!.d) !== 0 || lat(s) !== 0;
  const places = trainPlaces(at, s, vehicles, [], spaced);
  return vehicles.map((v, i) => deckAt(at, places[i]!, v, {} as Deck));
}
const corners = (d: Deck) =>
  [-d.hx, d.hx].flatMap((x) =>
    [-d.back, d.front].map((z) => ({
      x: d.x + x * Math.cos(d.yaw) + z * Math.sin(d.yaw),
      z: d.z - x * Math.sin(d.yaw) + z * Math.cos(d.yaw),
    })),
  );
type Frame = { x: number; z: number; yaw: number; half: number };
type Side = { frame: Frame; halfWidth: number; expectedDistance: number };
function lateral(d: Deck, { frame: f, halfWidth, expectedDistance }: Side) {
  const project = (x: number, z: number) => (x - f.x) * Math.cos(f.yaw) - (z - f.z) * Math.sin(f.yaw);
  const centre = project(d.x, d.z),
    sign = Math.sign(centre);
  const edge = corners(d).map((p) => sign * project(p.x, p.z));
  return { gap: Math.min(...edge) - halfWidth, trackError: Math.abs(Math.abs(centre) - expectedDistance) };
}
function sideAt(s: number, lat: number, hw: number, track: number): Side {
  const p = line2At(s, { x: 0, z: 0, ux: 0, uz: 1 });
  return {
    frame: { x: p.x - p.uz * lat, z: p.z + p.ux * lat, yaw: Math.atan2(p.ux, p.uz), half: 0 },
    halfWidth: hw,
    expectedDistance: Math.abs(lat - track),
  };
}
function margin(d: Deck, f: Frame) {
  const a = corners(d).map((p) => (p.x - f.x) * Math.sin(f.yaw) + (p.z - f.z) * Math.cos(f.yaw));
  return { rear: Math.min(...a) + f.half, front: f.half - Math.max(...a) };
}
// The curved greybox decks are spans. Project against their actual first/last segment end faces.
function curvedMargin(d: Deck, s0: number, s1: number, lat: number, segment: number) {
  const point = (s: number) => {
    const p = line2At(s, { x: 0, z: 0, ux: 0, uz: 1 });
    return { x: p.x - p.uz * lat, z: p.z + p.ux * lat };
  };
  const edge = (s: number, next: number, sign: number) => {
    const p = point(s),
      q = point(next),
      dx = q.x - p.x,
      dz = q.z - p.z,
      len = Math.hypot(dx, dz);
    return Math.min(...corners(d).map((c) => (sign * ((c.x - p.x) * dx + (c.z - p.z) * dz)) / len));
  };
  return { rear: edge(s0, s0 + segment, 1), front: edge(s1, s1 - segment, 1) };
}
export function checkRiderCoach() {
  const rows: {
    halt: string;
    player: { rear: number; front: number };
    rider: { rear: number; front: number };
    whole: { rear: number; front: number };
    lateral: { player: ReturnType<typeof lateral>; rider: ReturnType<typeof lateral> };
  }[] = [];
  const problems: string[] = [];
  const knownGaps = [1, 2, 3].map((n) => ({
    halt: `Stack head ${n} homeward (retained)`,
    reason:
      'Only east platform; stopping track -4 m, player/deck gap 4.7 m, coach/deck gap 5 m. No rider service here once retained. Orchestrator ruling, 16 November: reported separately, not built in R2b.',
  }));
  function row(
    halt: string,
    decks: Deck[],
    measure: (d: Deck) => { rear: number; front: number },
    side: (index: number) => Side,
  ) {
    const all = decks.map(measure);
    const player = all[consist.findIndex((c) => c.role === 'player')]!,
      rider = all[consist.findIndex((c) => c.role === 'rider')]!;
    rows.push({
      halt,
      player,
      rider,
      whole: { rear: Math.min(...all.map((a) => a.rear)), front: Math.min(...all.map((a) => a.front)) },
      lateral: { player: lateral(decks[1]!, side(1)), rider: lateral(decks[2]!, side(2)) },
    });
    for (const [role, m] of Object.entries(rows.at(-1)!.lateral)) {
      if (m.gap < 0) problems.push(`${halt}: ${role} intersects platform laterally by ${-m.gap} m`);
      // Half the 4 m track spacing: a car on the other track must never pass an along-track-only fit.
      if (m.trackError >= 2)
        problems.push(`${halt}: ${role} is not on the platform's stopping side (${m.trackError} m from its track)`);
    }
    const floor = halt === 'Quarry, up' ? -1.62 : 0;
    if (Math.min(player.rear, player.front) < floor)
      problems.push(`${halt}: player ${JSON.stringify(player)} below ${floor} m`);
    if (Math.min(rider.rear, rider.front) < 0) problems.push(`${halt}: rider ${JSON.stringify(rider)} off deck`);
  }
  for (const up of [false, true])
    for (let i = up ? 0 : 2; i < (up ? OFFSET_HALTS.length : HALTS.length + 1); i++) {
      const f = haltFrame(i, up);
      const halt = up ? OFFSET_HALTS[i]!.name : i === HALTS.length ? 'Pier terminal' : HALTS[i]!.name;
      const s = up
        ? [stops[1]!, stops[2]!, stops[3]!][i]! / 100
        : i === HALTS.length
          ? stops[3]! / 100
          : stops[HALTS[i]!.stop]! / 100;
      row(
        halt,
        coachTrain(s, up),
        (d) => margin(d, { x: f.c.x - ORIGIN.x, z: f.c.z - ORIGIN.z, yaw: f.yaw, half: f.half }),
        () => ({
          frame: { x: f.c.x - ORIGIN.x, z: f.c.z - ORIGIN.z, yaw: f.yaw, half: f.half },
          halfWidth: f.hw,
          expectedDistance: Math.abs(f.h.lat - (up ? -4 : 0)),
        }),
      );
    }
  for (const [i, h] of RING_HEAD.entries()) {
    const s = h.s / 100;
    row(
      `Railhead ${i + 1} terminal`,
      coachTrain(s, false),
      (d) => curvedMargin(d, s - 15, s + 10, 4.05, 5),
      (k) => sideAt(s + consist[k]!.offset, 4.05, 2.25, 0),
    );
  }
  row(
    'Joint homeward',
    coachTrain(RING_HEAD.at(-1)!.s / 100, true),
    (d) => curvedMargin(d, 977, 1002, -8.05, 5),
    (k) => sideAt(992 + consist[k]!.offset, -8.05, 2.25, -4),
  );
  for (const up of [false, true]) {
    const lat = up ? -7.55 : 3.55,
      a = ringAt(RING_HALT.u0, lat * 100),
      b = ringAt(RING_HALT.u1, lat * 100);
    const f = {
      x: (a.x + b.x) / 200 - ORIGIN.x,
      z: (a.z + b.z) / 200 - ORIGIN.z,
      yaw: Math.atan2(b.x - a.x, b.z - a.z),
      half: (RING_HALT.u1 - RING_HALT.u0) / 200,
    };
    row(
      `Ring Island ${up ? 'homeward' : 'outward'}`,
      coachTrain(stops[5]! / 100, up),
      (d) => margin(d, f),
      () => ({ frame: f, halfWidth: 1.75, expectedDistance: Math.abs(lat - (up ? -4 : 0)) }),
    );
    for (let i = 6; i < stops.length; i++) {
      const s = stops[i]! / 100,
        gorge = i === stops.length - 1;
      if (up && !gorge) continue; // named known gaps above; terminal service is on the original track.
      row(
        `${RAIL_LINES[LINE2]!.halts[i]!.name} ${up ? 'homeward' : 'outward'}`,
        coachTrain(s, up),
        (d) => curvedMargin(d, gorge ? LINE2_END_S - 40 : s - 15, gorge ? LINE2_END_S : s + 10, 4.05, gorge ? 8 : 5),
        (k) => sideAt(s + consist[k]!.offset, 4.05, 2.25, 0),
      );
    }
  }
  let gap = Infinity,
    leadingS = 0;
  // Includes the tight approach and the new Home signal (70.1 m), sampled every 25 cm.
  for (let s = 50; s <= 120; s += 0.25) {
    const front = coachTrain(s, true),
      rear = coachTrain(s - TRAIN.sepCm / 100, true);
    const g = Math.min(...front.flatMap((a) => rear.map((b) => deckGap(a, b))));
    if (g < gap) {
      gap = g;
      leadingS = s;
    }
  }
  if (gap < 0.5) problems.push(`Queue: ${gap} m at leading s ${leadingS}, minimum 0.5 m`);
  // This pre-existing 0.30 m minimum was pinned by fourth-car's Gorge review. Do not re-pin to a negative gap.
  const gorge = RAIL_LINES[LINE2]!.halts.at(-1)!;
  const crossEnd = gorge.end!.mergeCm + RING_END.cross.u1 - RING_END.cross.u0;
  const gorgeCrossover = { tailPastEnd: (gorge.s - TRAIN_EXTENT.behindCm - crossEnd) / 100, minimum: 0.3 };
  if (gorgeCrossover.tailPastEnd < gorgeCrossover.minimum)
    problems.push(`High Gorge: tail/crossover ${gorgeCrossover.tailPastEnd} m, minimum ${gorgeCrossover.minimum} m`);
  const outward = coachTrain(gorge.s / 100, false).at(-1)!,
    homeward = coachTrain(gorge.s / 100, true).at(-1)!;
  const gorgeTurn = {
    shift: Math.hypot(outward.x - homeward.x, outward.z - homeward.z),
    yaw: homeward.yaw - outward.yaw,
  };
  if (gorgeTurn.shift > 1e-9 || Math.abs(gorgeTurn.yaw) > 1e-9)
    problems.push(
      `High Gorge: standing turn moves last car ${gorgeTurn.shift} m / ${gorgeTurn.yaw} radians; must be zero`,
    );
  return {
    level: 'rider-coach',
    failures: problems.length,
    problems,
    knownGaps,
    rows,
    queue: { gap, leadingS, minimum: 0.5 },
    gorgeCrossover,
    gorgeTurn,
    coverage:
      'Production longest consist and chord/buffer placement. Whole-body longitudinal and lateral margins at actual platform end faces and stopping tracks. The 2 m lateral track corridor is half the 4 m track spacing, not a boarding-jump claim. Retained Stack homeward gaps are named separately by orchestrator ruling. Quarry player overhang allowed only to its existing 1.62 m. Sampled queue, not continuous collision or roof/door proof.',
  };
}

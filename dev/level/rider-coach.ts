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
import { line2At, line2Lat } from '../../src/entities/railway/line2-path.ts';
import { LINE2, RAIL_LINES } from '../../src/sim/railway-lines.ts';
import { RING_HALT, RING_HEAD, RING_S_HEAD } from '../../src/sim/railway-ring-layout.ts';
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
  const places = trainPlaces(at, s, vehicles, [], up);
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
  }[] = [];
  const problems: string[] = [];
  function row(halt: string, decks: Deck[], measure: (d: Deck) => { rear: number; front: number }) {
    const all = decks.map(measure);
    const player = all[consist.findIndex((c) => c.role === 'player')]!,
      rider = all[consist.findIndex((c) => c.role === 'rider')]!;
    rows.push({
      halt,
      player,
      rider,
      whole: { rear: Math.min(...all.map((a) => a.rear)), front: Math.min(...all.map((a) => a.front)) },
    });
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
      row(halt, coachTrain(s, up), (d) =>
        margin(d, { x: f.c.x - ORIGIN.x, z: f.c.z - ORIGIN.z, yaw: f.yaw, half: f.half }),
      );
    }
  for (const [i, h] of RING_HEAD.entries()) {
    const s = h.s / 100;
    row(`Railhead ${i + 1}`, coachTrain(s, false), (d) => curvedMargin(d, s - 15, s + 10, 4.05, 5));
  }
  row('Joint homeward', coachTrain(RING_HEAD.at(-1)!.s / 100, true), (d) => curvedMargin(d, 977, 1002, -8.05, 5));
  for (const up of [false, true]) {
    row(`Ring Island ${up ? 'homeward' : 'outward'}`, coachTrain(stops[5]! / 100, up), (d) =>
      curvedMargin(d, (RING_S_HEAD + RING_HALT.u0) / 100, (RING_S_HEAD + RING_HALT.u1) / 100, up ? -8.05 : 4.05, 5),
    );
    for (let i = 6; i < stops.length; i++) {
      const s = stops[i]! / 100,
        gorge = i === stops.length - 1;
      if (up && !gorge)
        problems.push(
          `${RAIL_LINES[LINE2]!.halts[i]!.name} homeward: no west platform; coach side at lat -3.2, only deck starts at +1.8 (5 m across the outward track)`,
        );
      row(`${RAIL_LINES[LINE2]!.halts[i]!.name} ${up ? 'homeward' : 'outward'}`, coachTrain(s, up), (d) =>
        curvedMargin(d, s + 10 - (gorge ? 40 : 25), s + 10, up && gorge ? -8.05 : 4.05, gorge ? 8 : 5),
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
  return {
    level: 'rider-coach',
    failures: problems.length,
    problems,
    rows,
    queue: { gap, leadingS, minimum: 0.5 },
    coverage:
      'DRAFT, not integrated with level-check: production longest consist and chord/buffer placement. Longitudinal end-face margins do not prove boarding adjacency. Stack homeward has no adjacent platform. Intermediate Stack rows apply only while served. Quarry player overhang allowed only to its existing 1.62 m. Sampled queue, not continuous collision or roof/door proof. Ring curved end projections still need validation against the authored segments.',
  };
}

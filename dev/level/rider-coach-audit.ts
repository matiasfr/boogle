// Read-only R2b audit, 16 November 2026: every rule that keys on a train's tail or nose, today and with the coach.
// node --import ./dev/sim/hooks.ts dev/level/rider-coach-audit.ts
// `rules`: the reserved-extent rules (TRAIN_EXTENT, as the sim, tests and level-check read them) at every halt, both
// ways, plus the stub merges, crossovers, crossings, gates and signals behind and ahead of each standing or held train.
// `consists`: the tail of each consist line 2 can run, today and with the coach (2.90 m car, pitch 3.40 m).
// `queue`: two trains sepCm apart, drawn bodies (production trainPlaces/deckAt), every 0.5 m of line 2 on both tracks,
// today's longest consist against the coach's; the R2b builder's row sampled s 50-120 only.
// `gorgeTurn`: the sideways shift of the last car at High Gorge when a standing train turns onto the crossover's path.
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
  type Vehicle,
} from '../../src/entities/railway/car-spacing.ts';
import { line2At, line2Lat } from '../../src/entities/railway/line2-path.ts';
import { LINE2, RAIL_LINES, TRAIN_EXTENT } from '../../src/sim/railway-lines.ts';
import { RING_END, RING_HALT, RING_HEAD, RING_S_HEAD, RING_GAP } from '../../src/sim/railway-ring-layout.ts';
import { TRAIN } from '../../src/sim/railway-train.ts';
import { OFFSET_HALTS, CROSSING_WIDTH, FORMATION } from '../../src/place/layout.ts';
import { GATES } from '../../src/place/tech-layout.ts';
import { LINE2_END_S } from '../../src/entities/railway/line2-path.ts';

const D = 3.4; // the coach's pitch: everything behind the players' car moves back by it
const r2 = (x: number) => Math.round(x * 100) / 100;

// ---------------------------------------------------------------- consists
const coachOf = (wagon: boolean, steel: boolean) => {
  const base = consistOf({ line: LINE2, wagon, steel });
  const out: { role: string; d: number; hx: number; hz: number }[] = [];
  for (const c of base) {
    out.push({ role: c.role, d: c.offset < 0 ? c.offset - D : c.offset, hx: c.spec.hx, hz: c.spec.hz });
    if (c.role === 'player') out.push({ role: 'rider', d: -3.55, hx: 0.8, hz: 1.45 });
  }
  return out;
};
const todayOf = (wagon: boolean, steel: boolean) =>
  consistOf({ line: LINE2, wagon, steel }).map((c) => ({ role: c.role, d: c.offset, hx: c.spec.hx, hz: c.spec.hz }));
const tailOf = (cs: { d: number; hz: number }[]) => -(cs.at(-1)!.d - cs.at(-1)!.hz);
const consists = [false, true].flatMap((wagon) =>
  [false, true].map((steel) => ({
    wagon,
    steel,
    today: r2(tailOf(todayOf(wagon, steel))),
    coach: r2(tailOf(coachOf(wagon, steel))),
  })),
);

// ---------------------------------------------------------------- reserved-extent rules
const T0 = TRAIN_EXTENT.behindCm / 100,
  T1 = T0 + D,
  N = TRAIN_EXTENT.aheadCm / 100;
const halts = RAIL_LINES[LINE2]!.halts;
const at = (name: string) => halts.find((h) => h.name === name)!;
type Rule = { place: string; rule: string; today: number; coach: number; need: number; source: string };
const rules: Rule[] = [];
const rule = (place: string, what: string, f: (tail: number) => number, need: number, source: string) =>
  rules.push({ place, rule: what, today: r2(f(T0)), coach: r2(f(T1)), need, source });

// Home (both lines' first halt): its near end. R1b's dedicated row (dev/level/home-cart.ts) covers the stand itself.
for (const [line, stop] of [
  [0, RAIL_LINES[0]!.halts[0]!.s / 100],
  [1, 21.65], // R2b's Village stop
] as const) {
  const end = RAIL_LINES[line]!.halts[0]!.end!,
    edge = end.edgeCm / 100;
  rule(
    `Line ${line + 1} Home, near signal`,
    'held train: signal less tail at the block edge; signal at least sepCm from the stop',
    (t) => Math.min(edge + t - t - edge, edge + t - stop - TRAIN.sepCm / 100),
    0,
    'test/railway-install.test.ts:266',
  );
}
// Every middle halt clear of the near (Home) block by 1 m (railway-install), at every stage: the nearest is the Quarry.
rule(
  'Quarry',
  'middle stop: tail beyond Home block edge',
  (t) => at('Quarry').s / 100 - t - halts[0]!.end!.edgeCm / 100,
  1,
  'test/railway-install.test.ts:271',
);
// Quarry: the plank crossing behind; the quarry gate ahead (nose: unchanged).
const qx = OFFSET_HALTS[0]!.crossS + CROSSING_WIDTH / 2;
rule(
  'Quarry',
  "tail beyond Quarry's plank crossing",
  (t) => at('Quarry').s / 100 - t - qx,
  0,
  'dev/level/rail-network.ts obstacles (page flag)',
);
rule(
  'Quarry',
  'nose short of the quarry gate slab',
  () => GATES.quarry.s - 0.45 - (at('Quarry').s / 100 + N),
  0,
  'rail-network obstacles',
);
// Far Head: the crossover behind (an end until Q6), its plank crossing ahead.
const fh = at('Far Head').s / 100,
  fhx = FORMATION.quarry.crossover!;
rule(
  'Far Head',
  'tail beyond its crossover (reserved)',
  (t) => fh - t - fhx[1],
  0,
  'docs/plans/fourth-car.md §7 #3, accepted −0.7',
);
rule(
  'Far Head',
  'nose short of its plank crossing',
  () => OFFSET_HALTS[1]!.crossS - CROSSING_WIDTH / 2 - (fh + N),
  0,
  'rail-network obstacles',
);
// Pier: the west foot crossing behind (after Q7); the parked layer ahead (before Q7; nose unchanged).
const pier = at('Pier').s / 100;
rule(
  'Pier',
  'tail beyond the west foot crossing',
  (t) => pier - t - (OFFSET_HALTS[2]!.crossS + CROSSING_WIDTH / 2),
  0.6,
  'dev/level/ring.ts checkRing',
);
rule(
  'Pier',
  'tail beyond the Pier stub merge (terminal)',
  (t) => pier - t - at('Pier').end!.mergeCm / 100,
  0,
  'none: arithmetic',
);
// The Railhead's eight heads and the three stack heads: a stub merge 20 m behind each stop, the crossover before it.
for (const name of ['Railhead', 'Stack head 1', 'Stack head 2', 'Stack head 3']) {
  const h = at(name);
  rule(
    name,
    'tail beyond the stub merge',
    (t) => (h.s - h.end!.mergeCm) / 100 - t,
    0,
    'docs/plans/fourth-car.md §7 #5',
  );
}
rule(
  'Railhead 1',
  'whole train on Q7 or the pier (u > 0)',
  (t) => (RING_HEAD[0]!.s - RING_S_HEAD) / 100 - t,
  0,
  'test/railway-r4b-views.test.ts:137 (reads TRAIN_TAIL_M)',
);
// Ring Island at R2b's stop (+3.40 m), dev/level/ring.ts and test/railway-ring-layout.test.ts.
const ringU = (RING_END.u + 340) / 100;
rule('Ring Island', 'tail beyond the crossover', (t) => ringU - t - RING_END.cross.u1 / 100, 5, 'dev/level/ring.ts');
rule('Ring Island', 'tail beside the platforms', (t) => ringU - t - RING_HALT.u0 / 100, 0, 'dev/level/ring.ts');
rule('Ring Island', 'nose short of the buffers', () => RING_END.bufferU / 100 - (ringU + N), 14.7, 'dev/level/ring.ts');
rule('Ring Island', 'nose beside the platforms', () => RING_HALT.u1 / 100 - (ringU + N), 0, 'dev/level/ring.ts');
rule('Ring Island', 'tail north of the foot-crossing planks', (t) => ringU - t - 430.5, 3, 'dev/level/ring.ts (C.u1)');
rule('Ring Island', 'tail north of the ramp top', (t) => ringU - t - 434.6, 0, 'dev/level/ring.ts (C.rampTop)');
const ringSignal = RING_END.mergeCm / 100 - N;
rule(
  'Ring Island, held at signal',
  'tail past the hinge',
  (t) => ringSignal - t - (RING_S_HEAD + RING_GAP.hinge) / 100,
  20,
  'dev/level/ring.ts',
);
rule(
  'Ring Island, held at signal',
  "tail past the Railhead's last stop",
  (t) => ringSignal - t - RING_HEAD[7]!.s / 100 - TRAIN.sepCm / 100,
  0,
  'dev/level/ring.ts',
);
// The stack line's block signals (one 10 m past each passed head): a held train's tail.
for (const [k, sig] of (RAIL_LINES[LINE2]!.signals ?? []).entries())
  rule(
    `Signal ${k + 1} (s ${sig / 100})`,
    'held tail beyond the passed head stop',
    (t) => sig / 100 - t - at(`Stack head ${k + 1}`).s / 100,
    -Infinity,
    'none: report',
  );
// High Gorge.
const gorge = at('High Gorge'),
  crossEnd = gorge.end!.mergeCm / 100 + (RING_END.cross.u1 - RING_END.cross.u0) / 100;
rule(
  'High Gorge',
  'tail beyond the crossover',
  (t) => gorge.s / 100 - t - crossEnd,
  0.3,
  'test/railway-route-rules.test.ts:175, R2b row',
);
rule(
  'High Gorge',
  'tail beside the platforms (end − 40 m)',
  (t) => gorge.s / 100 - t - (LINE2_END_S - 40),
  0,
  'src/content/levels/gorge.ts',
);
rule(
  'High Gorge',
  'nose short of the line end',
  () => LINE2_END_S - (gorge.s / 100 + N),
  0,
  'src/content/levels/gorge.ts',
);
// Every far end: a held follower's nose against the standing train's tail.
for (const name of ['Far Head', 'Pier', 'Railhead', 'Ring Island', 'Stack head 1', 'High Gorge']) {
  const h = at(name),
    s = name === 'Ring Island' ? h.s / 100 + 3.4 : h.s / 100,
    signal = Math.min(h.end!.signalCm / 100, s - TRAIN.sepCm / 100);
  rule(
    `${name} (as end)`,
    "held follower's nose to the standing tail",
    (t) => s - t - (signal + N),
    0,
    'railway-trains.ts endBlocks',
  );
}
// Two trains sepCm apart on open line (the block rule), reserved.
rule(
  'Open line',
  'follower nose to leader tail, reserved',
  (t) => TRAIN.sepCm / 100 - t - N,
  0,
  'railway-trains.ts blockFree',
);

// ---------------------------------------------------------------- drawn queue, every 0.5 m of both tracks
const stops = halts.map((h) => h.s);
const vehiclesOf = (cs: { role: string; d: number; hx: number; hz: number }[]): Vehicle[] =>
  cs.map((c) => ({
    d: c.d,
    hx: c.hx,
    back: c.hz,
    front: c.hz + (c.role === 'engine' ? ENGINE_LONG_AHEAD : 0),
    buffers: c.role === 'engine' ? ENGINE_BUFFERS : CAR_BUFFERS,
  }));
function decks(vs: Vehicle[], s: number, track: number) {
  const p = { x: 0, z: 0, ux: 0, uz: 1 };
  const f = (s: number, o: TrackPoint) => {
    line2At(s, p, track === 1);
    const lat = line2Lat({ track, origin: 0 }, s, stops, undefined, true);
    o.x = p.x - p.uz * lat;
    o.z = p.z + p.ux * lat;
  };
  return trainPlaces(f, s, vs, []).map((place, i) => deckAt(f, place, vs[i]!, {} as Deck));
}
function queue(vs: Vehicle[], track: number) {
  let best = { gap: Infinity, s: 0 };
  for (let s = 22 + TRAIN.sepCm / 100; s <= gorge.s / 100; s += 0.5) {
    const a = decks(vs, s, track),
      b = decks(vs, s - TRAIN.sepCm / 100, track);
    const g = Math.min(...a.flatMap((x) => b.map((y) => deckGap(x, y))));
    if (g < best.gap) best = { gap: r2(g), s };
  }
  return best;
}
const queueRows = [0, 1].map((track) => ({
  track,
  today: queue(vehiclesOf(todayOf(true, true)), track),
  coach: queue(vehiclesOf(coachOf(true, true)), track),
  minimum: 0.5,
}));

// ---------------------------------------------------------------- High Gorge: the last car at the turn
const coach = vehiclesOf(coachOf(true, true));
const [out0, home1] = [0, 1].map((track) => decks(coach, gorge.s / 100, track).at(-1)!);
const gorgeTurn = {
  lastCarShiftM: r2(Math.hypot(out0!.x - home1!.x, out0!.z - home1!.z)),
  yawDeg: r2(((home1!.yaw - out0!.yaw) * 180) / Math.PI),
};

console.log(JSON.stringify({ consists, rules, queue: queueRows, gorgeTurn }, null, 2));

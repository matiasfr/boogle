// Review of ring/r3a-rules (R3a-1): v27's rules on the fixture line under adversarial schedules. The end moving (Q7,
// the rivet) and the railhead's stop moving at every tick offset of a seeded run; every lever and rider ask every
// tick; holds at 0, 75 and 100%; riders' offers followed to the stop; three trains' places at every stage. FUZZ_TICKS
// lengthens the runs.
import test from 'node:test';
import assert from 'node:assert/strict';
import { mulberry32 } from '../src/sim/rng.ts';
import { RAIL_LINES, LINE2, trainPlaces, type RailLineDef } from '../src/sim/railway-lines.ts';
import { TRAIN, TRAIN_PHASE, reqHas, trainAlong, trainDir, trainRequestable } from '../src/sim/railway-train.ts';
import {
  LINE_SLOTS,
  endMoved,
  lineSlots,
  lineSpacing,
  stopMoved,
  trainServes,
  trainStepLine,
} from '../src/sim/railway-trains.ts';
import { FixtureLine, LINE2_ROWS, line2Stops } from './helpers/rail-rows.ts';

const V = LINE2_ROWS;
const PIER = 3,
  HEAD = 4;
const TICKS = Number(process.env.FUZZ_TICKS ?? 3000);
type Stage = (f: FixtureLine, t: number) => void;
type Mode = { lever: number; rider: number };

/** Steps `f` from tick t0+1 to t1 with random asks, checking every tick: no pose jumps, the spacing, the load check, no
 * up train standing at the Pier once it is not the end, no train frozen for 3000 ticks (a deadlock), and the worst
 * lever wait. */
function drive(f: FixtureLine, t0: number, t1: number, rand: () => number, mode: Mode, stage?: Stage) {
  const asked = new Map<string, number>(),
    worst = new Map<string, number>();
  const moved = f.rows.map(() => t0),
    last = f.rows.map((r) => JSON.stringify(r));
  for (let t = t0 + 1; t <= t1; t++) {
    stage?.(f, t);
    assert.equal(f.broken(), null, `rows after the stage at ${t}`);
    const n = f.stops.length;
    if (t > TRAIN.wakeTicks) {
      for (let stop = 0; stop < n; stop++)
        for (const dir of [-1, 1])
          if (rand() < mode.lever && f.call(stop, dir, t) && !asked.has(`${stop}/${dir}`))
            asked.set(`${stop}/${dir}`, t);
      for (let slot = 0; slot < f.rows.length; slot++)
        if (n > 2 && rand() < mode.rider) {
          const stop = 1 + Math.floor(rand() * (n - 2));
          f.call(stop, trainDir(f.rows[slot]!), t, slot);
        }
    }
    const before = f.rows.map((_r, k) => trainAlong(f.rows[k]!, f.line, t - 1));
    trainStepLine(f.io(), f.line, t);
    f.rows.forEach((r, k) => {
      assert.ok(Math.abs(trainAlong(r, f.line, t) - before[k]!) <= TRAIN.speed + 1, `train ${k} jumps at ${t}`);
      const now = JSON.stringify(r);
      if (now !== last[k]) {
        last[k] = now;
        moved[k] = t;
      }
      assert.ok(t - moved[k]! < 3000, `train ${k} frozen since ${moved[k]} (at ${t}): ${now}`);
      if (n > PIER + 1)
        assert.ok(
          !(r.phase === TRAIN_PHASE.STAND && r.at === PIER && r.track === 0),
          `train ${k} stands at the Pier going up at ${t}`,
        );
    });
    assert.equal(
      lineSpacing((k) => f.rows[k]!, f.line, f.stops, t),
      null,
      `spacing at ${t}`,
    );
    assert.equal(f.broken(), null, `rows at ${t}`);
    for (const [key, since] of asked) {
      const [stop, dir] = key.split('/').map(Number) as [number, number];
      if (f.rows.some((r) => r.phase === TRAIN_PHASE.STAND && r.at === stop && trainDir(r) === dir)) {
        worst.set(key, Math.max(worst.get(key) ?? 0, t - since));
        asked.delete(key);
      }
    }
  }
  return worst;
}
/** trainPlaces can stand a train at the homeward-only Pier on the up track (see the place test below); the drives
 * start from a legal state instead: such a train is moved to the Pier's down track (free at every stage here). */
function legal(f: FixtureLine) {
  if (f.stops.length <= PIER + 1) return f;
  const free = (stop: number, track: number) => !f.rows.some((q) => q.at === stop && q.track === track);
  f.rows = f.rows.map((r) => {
    if (!(r.phase === TRAIN_PHASE.STAND && r.at === PIER && r.track === 0)) return r;
    const [stop, track] = (
      [
        [2, 1],
        [1, 1],
        [2, 0],
        [1, 0],
      ] as const
    ).find(([k, tr]) => free(k, tr))!;
    const s = f.stops[stop]!;
    return { ...r, at: stop, to: stop, track, from: s, dest: s };
  });
  return f;
}
const snap = (f: FixtureLine) => {
  const g = new FixtureLine(f.stops, f.awake, f.headPct, f.line);
  g.rows = f.rows.map((r) => ({ ...r }));
  g.lineRow = { ...f.lineRow };
  return g;
};

test('Q7 laid at every tick offset of a run (endMoved past the Pier): no up train at the Pier, no deadlock', () => {
  const rand = mulberry32(0x07);
  const base = new FixtureLine(line2Stops(6));
  const t0 = 300;
  drive(base, 0, t0, rand, { lever: 0.02, rider: 0.02 });
  const f = base;
  for (let t = t0 + 1; t <= t0 + 1400; t++) {
    drive(f, t - 1, t, rand, { lever: 0.02, rider: 0.02 });
    const g = snap(f);
    g.stops = line2Stops(7, 0);
    endMoved(g.io(), V, PIER, t);
    assert.equal(g.broken(), null, `Q7 at ${t}`);
    drive(g, t, t + 1200, mulberry32(t), { lever: 0.05, rider: 0.05 });
  }
});

test('the rivet struck at every tick offset of a run (endMoved past the Railhead at bent 13): no deadlock', () => {
  const rand = mulberry32(0x0e);
  const base = legal(new FixtureLine(line2Stops(7, 7)));
  const t0 = 300;
  drive(base, 0, t0, rand, { lever: 0.02, rider: 0.02 });
  for (let t = t0 + 1; t <= t0 + 1400; t++) {
    drive(base, t - 1, t, rand, { lever: 0.02, rider: 0.02 });
    const g = snap(base);
    g.stops = line2Stops(7, 7, true);
    endMoved(g.io(), V, HEAD, t);
    assert.equal(g.broken(), null, `rivet at ${t}`);
    drive(g, t, t + 1200, mulberry32(t), { lever: 0.05, rider: 0.05 });
  }
});

test("the railhead's stop moves (stopMoved) at every tick offset of a run, every bent: no deadlock, no jump", () => {
  for (let head = 0; head < 7; head++) {
    const rand = mulberry32(0x50 + head);
    const base = legal(new FixtureLine(line2Stops(7, head)));
    const t0 = 300;
    drive(base, 0, t0, rand, { lever: 0.02, rider: 0.02 });
    for (let t = t0 + 1; t <= t0 + 700; t += 1) {
      drive(base, t - 1, t, rand, { lever: 0.02, rider: 0.02 });
      const g = snap(base);
      const poses = g.rows.map((r) => trainAlong(r, g.line, t));
      g.stops = line2Stops(7, head + 1);
      stopMoved(g.io(), V, HEAD, t);
      g.rows.forEach((r, k) =>
        assert.equal(trainAlong(r, g.line, t), poses[k], `head ${head + 1} at ${t}: train ${k}`),
      );
      assert.equal(g.broken(), null, `head ${head + 1} at ${t}`);
      drive(g, t, t + 800, mulberry32(t), { lever: 0.05, rider: 0.05 });
    }
  }
});

for (const pct of [0, 75, 100])
  for (const trains of [3, 4])
    test(`storm at ${pct}%, ${trains} trains: every lever and rider ask every tick, the open island`, (t) => {
      const line: RailLineDef = { ...V, trains };
      const f = legal(new FixtureLine(line2Stops(7, 7, true), 0, pct, line));
      const worst = drive(f, 0, Math.max(TICKS, 6000), mulberry32(0x5707 + pct), { lever: 1, rider: 1 });
      const top = Math.max(...worst.values());
      t.diagnostic(`worst lever wait ${(top / 10).toFixed(1)} s`);
    });

test("a rider's offer (trainRequestable) is a halt the train then stands at, on the fixture at every stage", () => {
  const stages = [line2Stops(6), line2Stops(7, 0), line2Stops(7, 3), line2Stops(7, 7), line2Stops(7, 7, true)];
  let checked = 0;
  for (const [i, stops] of stages.entries()) {
    const rand = mulberry32(0xaa + i);
    const f = legal(new FixtureLine(stops));
    drive(f, 0, 200, rand, { lever: 0.02, rider: 0 });
    for (let t = 201; t < 201 + TICKS; t++) {
      drive(f, t - 1, t, rand, { lever: 0.02, rider: 0 });
      if (rand() > 0.02) continue;
      const slot = Math.floor(rand() * f.rows.length),
        offer = trainRequestable(f.rows[slot]!, V, f.stops, t);
      if (!offer || offer.requested) continue;
      assert.notEqual(offer.stop, PIER * (offer.dir > 0 && f.stops.length > PIER + 1 ? 1 : -1), 'never the Pier up');
      assert.equal(f.call(offer.stop, offer.dir, t, slot), 1, `the offer is accepted (${JSON.stringify(offer)})`);
      const g = snap(f),
        s = g.stops[offer.stop]!;
      let stood = false;
      for (let u = t + 1; u < t + 3000; u++) {
        trainStepLine(g.io(), g.line, u);
        const r = g.rows[slot]!;
        if (r.phase === TRAIN_PHASE.STAND && r.at === offer.stop) {
          stood = true;
          break;
        }
        assert.ok((s - trainAlong(r, g.line, u)) * offer.dir >= 0 || r.track !== (offer.dir > 0 ? 0 : 1), 'passed it');
      }
      assert.ok(stood, `slot ${slot} stood at ${offer.stop} it was offered at ${t}`);
      checked++;
    }
  }
  assert.ok(checked > 20, `${checked} offers followed`);
});

test('a lever ask the fixture accepts is served by a train that stops there (never one that passes by)', () => {
  const stops = line2Stops(7, 2);
  const rand = mulberry32(0x1e7e);
  const f = legal(new FixtureLine(stops));
  drive(f, 0, 200, rand, { lever: 0, rider: 0 });
  for (let t = 201; t < 201 + TICKS; t++) {
    drive(f, t - 1, t, rand, { lever: 0, rider: 0 });
    for (let k = 0; k < stops.length; k++)
      for (const dir of [-1, 1]) {
        const slot = trainServes((j) => f.rows[j]!, V, stops, k, dir, t);
        if (k === PIER && dir > 0) assert.equal(slot, -1, 'no train serves the Pier up after Q7');
      }
  }
});

test('three and four trains wake at distinct places, spaced and loadable, at every stage', () => {
  const stages = [line2Stops(6), ...Array.from({ length: 8 }, (_v, h) => line2Stops(7, h)), line2Stops(7, 7, true)];
  for (const trains of [3, 4])
    for (const stops of stages) {
      const line: RailLineDef = { ...V, trains };
      const places = trainPlaces(line, stops);
      assert.equal(new Set(places.map((p) => `${p.stop}/${p.track}`)).size, trains, JSON.stringify(places));
      const f = new FixtureLine(stops, 0, 75, line);
      assert.equal(
        lineSpacing((k) => f.rows[k]!, line, stops, 0),
        null,
        JSON.stringify(places),
      );
      assert.equal(f.broken(), null);
      // Never at a halt that refuses the way it would leave (the homeward-only Pier going up).
      for (const p of places)
        assert.ok(
          !(p.stop === PIER && p.track === 0 && stops.length > PIER + 1),
          `a train placed at the Pier going up: ${JSON.stringify(places)}`,
        );
    }
});

test('a fixture line passed as its catalog row object is the catalog line (lineSlots, the type weakened by LineRef)', () => {
  // LineRef accepts a RailLineDef anywhere a line index went. The catalog's own row object is a RailLineDef, so passing
  // RAIL_LINES[LINE2] (not LINE2) type-checks and silently runs slots 0..trains-1: line 1's trains, not line 2's.
  assert.deepEqual(lineSlots(RAIL_LINES[LINE2]!), LINE_SLOTS[LINE2]);
});

test('more trains than places: trainPlaces never stacks two on one spot (it should refuse)', () => {
  // Three trains on a line with only Village, Quarry open has three places (0 up, 1 up, 1 down, ... ) - two stops only:
  // Village up and Quarry down. A third train has nowhere and lands on 0/0 again, with nothing to say so.
  const two: RailLineDef = { ...V, trains: 3, halts: [V.halts[0]!, { ...V.halts[1]!, end: V.halts[2]!.end }] };
  // Ruled (orchestrator, 10 November): refuse rather than stack. The catalog's lines are checked at every stage at load
  // (railway-train.ts), so a room never meets it.
  assert.throws(() => trainPlaces(two, [1700, 17400]), /no place for train 2/);
  assert.equal(new Set(trainPlaces({ ...two, trains: 2 }, [1700, 17400]).map((p) => `${p.stop}/${p.track}`)).size, 2);
});

test("trainRequestable's v26 count form (train-view.ts until R4a) offers what the stops form does once the railhead has moved", () => {
  // After the rivet the Railhead is a middle halt at heads[7] = 99200; the count form reads the halts' own `s` (85200),
  // so a rider on an up train between the two is offered nothing (the island is the end: null).
  const stops = line2Stops(7, 7, true);
  const f = new FixtureLine(stops);
  const r = {
    ...f.rows[0]!,
    phase: TRAIN_PHASE.RUN,
    at: PIER,
    to: 5,
    track: 0,
    from: 90000,
    v0: 0,
    dest: 119000,
    depart: 0,
  };
  assert.deepEqual(trainRequestable(r, V, stops.length, 1), trainRequestable(r, V, stops, 1));
});

test('a train left standing at the old railhead stop (stopMoved) that then leaves counts as a departure from the end', () => {
  const stops = line2Stops(7, 0);
  const f = legal(new FixtureLine(stops));
  // Train 0 has just come to a stand at the railhead (the end), turned onto the down track; the lever asks for it.
  f.rows[0] = {
    ...f.rows[0]!,
    phase: TRAIN_PHASE.STAND,
    at: HEAD,
    to: HEAD,
    track: 1,
    from: stops[HEAD]!,
    dest: stops[HEAD]!,
    v0: 0,
    depart: 100,
    req: 0,
  };
  f.rows[1] = {
    ...f.rows[1]!,
    phase: TRAIN_PHASE.STAND,
    at: 0,
    to: 0,
    track: 0,
    from: stops[0]!,
    dest: stops[0]!,
    v0: 0,
    depart: 0,
    req: 0,
  };
  f.rows[2] = {
    ...f.rows[2]!,
    phase: TRAIN_PHASE.STAND,
    at: 1,
    to: 1,
    track: 1,
    from: stops[1]!,
    dest: stops[1]!,
    v0: 0,
    depart: 0,
    req: 0,
  };
  f.lineRow = { req: 0, left0: -1, left1: 0 };
  assert.equal(f.call(HEAD, -1, 101), 1, 'the railhead lever asks for the way home');
  f.stops = line2Stops(7, 1);
  stopMoved(f.io(), V, HEAD, 102);
  let t = 102;
  for (; f.rows[0]!.phase === TRAIN_PHASE.STAND; t++) {
    assert.ok(t < 2000);
    trainStepLine(f.io(), f.line, t + 1);
  }
  assert.ok(f.lineRow.left1 > 100, `left1 is ${f.lineRow.left1}: the headway clock missed this departure (at ${t})`);
  assert.ok(!reqHas(f.lineRow.req, HEAD, -1, f.stops.length), "the lever's ask left with it unserved");
});

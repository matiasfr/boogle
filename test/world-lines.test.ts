// The whole-map blockout's future lines (src/sim/railway-world-lines.ts): current with the map JSON, and in the sim's own
// shape so the server can take them unchanged (docs/plans/world-blockout.md, "Future lines as data").
import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { FORMATION, LIVE_SECOND_TRACK, WORLD_LINES } from '../src/sim/railway-world-lines.ts';
import { TRAIN, TRAIN_STOPS } from '../src/sim/railway-train.ts';
import { LINES, ORIGIN } from '../src/place/layout.ts';

test('the catalog and the world-blockout page are current with the map JSON', () => {
  // The generator reads Place's terrain, which needs the dev hooks (import.meta.glob), so it runs in its own process.
  execFileSync(process.execPath, ['--import', './dev/sim/hooks.ts', 'dev/level/world-blockout.ts', '--check'], {
    stdio: 'pipe',
  });
});

test('every future line is integer centimetres, with stops on the line and a halt at each', () => {
  const ids = new Set<string>();
  for (const l of WORLD_LINES) {
    assert.ok(!ids.has(l.id), `${l.id} twice`);
    ids.add(l.id);
    assert.equal(l.speed, TRAIN.speed, `${l.id} cruises at the sim's train speed`);
    assert.equal(l.accel, TRAIN.accel, `${l.id} accelerates like the sim's train`);
    for (const p of l.pts) for (const v of p) assert.ok(Number.isInteger(v), `${l.id} point ${p.join(',')}`);
    let s = l.fromCm;
    for (const leg of l.legs) {
      assert.equal(leg.fromCm, s, `${l.id} ${leg.id} starts where the last leg ended`);
      assert.ok(leg.toCm > leg.fromCm);
      s = leg.toCm;
    }
    assert.equal(s - l.fromCm, l.lengthCm, `${l.id} legs sum to its length`);
    // The vertices' straight spans add up to the length (each span rounded to the centimetre).
    let len = 0;
    for (let i = 1; i < l.pts.length; i++)
      len += Math.round(Math.hypot(l.pts[i]![0] - l.pts[i - 1]![0], l.pts[i]![1] - l.pts[i - 1]![1]));
    assert.equal(len, l.lengthCm, `${l.id} spans sum to its length`);
    assert.equal(l.stops.length, l.halts.length);
    l.halts.forEach((h, i) => {
      assert.equal(h.stop, i);
      assert.ok(l.stops[i]! >= l.fromCm && l.stops[i]! <= l.fromCm + l.lengthCm, `${l.id} ${h.name} on the line`);
      for (const v of [h.x, h.z, h.y, h.reach]) assert.ok(Number.isInteger(v));
    });
  }
});

test('every corridor is double track, and every terminus turns a train back', () => {
  assert.equal(FORMATION.tracks, 2);
  assert.ok(FORMATION.centresCm >= 400, 'track centres about 4 m apart');
  // a 4 m platform's inner edge clears its track's 3.6 m deck
  assert.ok(FORMATION.platformCm - 200 >= FORMATION.centresCm / 2 + 180);
  for (const l of WORLD_LINES) {
    const want = l.extends === null ? ['start', 'end'] : ['end'];
    assert.deepEqual(
      l.ends.map((e) => e.at),
      want,
      `${l.id} turns back at each terminus`,
    );
    for (const e of l.ends) {
      assert.ok(e.sCm >= l.fromCm && e.sCm <= l.fromCm + l.lengthCm, `${l.id} ${e.at} on the line`);
      if (e.kind === 'crossover')
        for (const s of l.stops)
          assert.ok(Math.abs(e.sCm - s) >= 2000 + 1200, `${l.id}'s crossover clears its platforms and their approach`);
    }
  }
  assert.deepEqual(
    LIVE_SECOND_TRACK.map((t) => t.line),
    [0, 1],
  );
});

test("line 2's extension starts at line 2's rail end and counts on from it", () => {
  const ring = WORLD_LINES.find((l) => l.extends === 1);
  assert.ok(ring);
  const E = LINES.east;
  const end = [Math.round((E.xs.at(-1)! + ORIGIN.x) * 100), Math.round((E.zs.at(-1)! + ORIGIN.z) * 100)];
  assert.ok(Math.hypot(ring.pts[0]![0] - end[0]!, ring.pts[0]![1] - end[1]!) < 150, 'first point at the rails end');
  assert.ok(Math.abs(ring.fromCm - Math.round(E.len * 100)) <= 1);
  assert.ok(ring.stops[0]! > TRAIN_STOPS[1]!.at(-1)!, 'its stops come after the pier stop');
});

test('no future span is steeper than the 4% ruling grade, and the Gorge halts stand low in the split', () => {
  for (const l of WORLD_LINES)
    for (let i = 1; i < l.pts.length; i++) {
      const a = l.pts[i - 1]!,
        b = l.pts[i]!;
      const run = Math.hypot(b[0] - a[0], b[1] - a[1]);
      assert.ok(run > 0 && Math.abs(b[2] - a[2]) <= 0.04 * run, `${l.id} span ${i} is steeper than 4%`);
    }
  const gorge = WORLD_LINES.flatMap((l) => l.halts).filter((h) => h.name === 'High Gorge');
  assert.equal(gorge.length, 3, 'line 2, the north-south line and the White Wall each end there');
  for (const h of gorge) assert.equal(h.y, 300);
  for (const l of WORLD_LINES)
    assert.ok(
      !l.halts.some((h) => h.name === 'Ring top' || h.name === 'High Port'),
      `${l.id} has no Ring top or High Port`,
    );
});

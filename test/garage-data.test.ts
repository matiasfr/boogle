// The garage's readout maths (docs/brainstorms/engine-garage.md): the numbers are the timetable's own.
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  BOILERS,
  countAt,
  lineRunCm,
  liftOf,
  partsOf,
  perMinute,
  roundTripSeconds,
  rowProgress,
  rowsFor,
  runSeconds,
  speedOffered,
  speedSaved,
} from '../src/entities/railway/garage-data.ts';

test('the longer boiler saves about eleven seconds over the planned 1.2 km run, and none over a short line', () => {
  const run = lineRunCm();
  assert.equal(run.cm, 120000);
  assert.equal(runSeconds(120000, 200), 65.8);
  assert.equal(runSeconds(120000, 250), 55.2);
  assert.ok(speedOffered(120000, BOILERS.boiler.speed, BOILERS.long.speed));
  assert.ok(!speedOffered(19300, 200, 250), 'line 1 (193 m) never earns a speed part');
  assert.ok(speedSaved(15700, 200, 250) < 0.3, 'the Quarry run: 0.2 s');
});

test('a minute of load is a trip over the round trip, to a tenth', () => {
  assert.equal(roundTripSeconds(65.8), 146.6);
  assert.equal(perMinute(6, 65.8), 2.5);
  assert.equal(perMinute(6, 55.2), 2.9);
  assert.equal(perMinute(32, 65.8), 13.1);
  assert.equal(perMinute(32, 55.2), 15.3);
});

test('engine rows change for the longer boiler only', () => {
  const same = rowsFor('engine', 'boiler');
  assert.ok(same.every((r) => r.now === r.then));
  const rows = rowsFor('engine', 'long');
  assert.deepEqual(
    rows.map((r) => [r.id, r.now, r.then]),
    [
      ['speed', 20, 25],
      ['cars', 3, 4],
      ['foot', 2.5, 2.9],
      ['kit', 13.1, 15.3],
    ],
  );
});

test('counts run from old to new, fast then slowing', () => {
  assert.equal(countAt(2.5, 2.9, 0, 1), 2.5);
  assert.equal(countAt(2.5, 2.9, 1, 1), 2.9);
  assert.ok(countAt(20, 25, 0.5) > 22.5);
  assert.ok(rowProgress(650, 0) === 0 && rowProgress(800, 1) === 0 && rowProgress(1150, 0) === 1);
});

test('the lift follows the ring and pushes back in the last third', () => {
  assert.equal(liftOf(0), 0);
  assert.ok(liftOf(1) > 0.9 && liftOf(1) < 1.05);
  assert.ok(liftOf(0.5) < liftOf(0.7));
  assert.ok(liftOf(1) - liftOf(2 / 3) < liftOf(2 / 3) / 2, 'slower in the last third');
});

test('the wagon is free only once it has coupled; the longer boiler waits on steel', () => {
  const find = (c: boolean) => partsOf({ boilerFitted: true, wagonCoupled: c, tableBusy: false });
  assert.equal(find(true).find((p) => p.id === 'wagon')!.standing, 'free');
  assert.equal(find(false).find((p) => p.id === 'wagon')!.standing, 'later');
  assert.equal(find(true).find((p) => p.id === 'long')!.pill, 'Needs steel');
});

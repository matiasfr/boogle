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
  rowChanged,
  rowProgress,
  rowsFor,
  runSeconds,
  shownRow,
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
  const room = {
    boilerFitted: true,
    wagonCoupled: true,
    tableBusy: false,
    steelHome: false,
    steel: 0,
    longFitted: false,
  };
  const find = (c: boolean) => partsOf({ ...room, wagonCoupled: c, boilerRev: 0 });
  assert.equal(find(true).find((p) => p.id === 'wagon')!.standing, 'free');
  assert.equal(find(false).find((p) => p.id === 'wagon')!.standing, 'later');
  assert.equal(find(true).find((p) => p.id === 'long')!.pill, 'Needs steel');
});

test('the longer boiler reads Needs steel, then Ready, then Installed, and the old boiler Replaced', () => {
  const base = { boilerFitted: true, wagonCoupled: true, tableBusy: false };
  const of = (steelHome: boolean, longFitted: boolean) => {
    const parts = partsOf({ ...base, steelHome, steel: steelHome ? 1 : 0, longFitted, boilerRev: longFitted ? 1 : 0 });
    const pick = (id: string) => parts.find((p) => p.id === id)!;
    return { long: pick('long'), boiler: pick('boiler') };
  };
  const none = of(false, false),
    home = of(true, false),
    fitted = of(true, true);
  assert.deepEqual([none.long.standing, none.long.pill], ['steel', 'Needs steel']);
  assert.deepEqual([home.long.standing, home.long.pill], ['ready', 'Ready']);
  assert.deepEqual([fitted.long.standing, fitted.long.pill], ['installed', 'Installed']);
  assert.deepEqual([none.boiler.standing, home.boiler.standing], ['installed', 'installed']);
  assert.deepEqual([fitted.boiler.standing, fitted.boiler.pill], ['replaced', 'Replaced']);
});

test('no try-on: a part short of its bill says what it needs and what is in; nothing else carries a bill', () => {
  const room = { boilerFitted: true, wagonCoupled: true, tableBusy: false, boilerRev: 0 };
  const long = (steel: number, longFitted = false) =>
    partsOf({ ...room, steelHome: steel >= 1, steel, longFitted }).find((p) => p.id === 'long')!;
  assert.deepEqual(long(0).needs, { what: 'Steel', need: 1, have: 0 });
  assert.equal(long(1).needs, undefined, 'steel home: nothing is missing, the tile offers Install');
  assert.equal(long(6).needs, undefined);
  assert.equal(long(1, true).needs, undefined, 'fitted');
  const all = partsOf({ ...room, steelHome: false, steel: 0, longFitted: false });
  assert.deepEqual(
    all.filter((p) => p.needs).map((p) => p.id),
    ['long'],
  );
  assert.ok(all.every((p) => !('tryable' in p)));
});

test('a row has no state for a part tried on: it previews until the moment, then counts to ink', () => {
  const [speed] = rowsFor('engine', 'long');
  assert.deepEqual(shownRow(speed!, 0, 'idle', 0), { value: 25, arrow: true, preview: true });
  assert.deepEqual(shownRow(speed!, 0, 'holding', 0), { value: 25, arrow: true, preview: true });
  assert.deepEqual(shownRow(speed!, 0, 'moment', 5000), { value: 25, arrow: false, preview: true });
});

test('a fitted room’s rows are the longer boiler’s, with no arrow', () => {
  for (const chosen of ['boiler', 'long'] as const) {
    const rows = rowsFor('engine', chosen, true);
    assert.ok(rows.every((r) => !rowChanged(r) && !shownRow(r, 0, 'idle', 0).arrow));
    assert.deepEqual(
      rows.map((r) => r.then),
      [25, 4, 2.9, 15.3],
    );
  }
});

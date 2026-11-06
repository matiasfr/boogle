// Pure slice-3 catalog/schedule invariants; not evidence that the live receiver has been promoted.
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  LINE1_STATIONS,
  LINE1_ROCKS,
  LINE1_GREAT_TREE,
  LINE1_HARDWOOD_IDS,
  LINE1_ORDINARY_SOURCES,
  LINE1_INITIAL,
  LINE1_PANEL_ALLOWANCE,
  linePanels,
} from '../src/sim/railway-line-layout.ts';
import { lineFeed, lineLayDistance, lineSchedule, type LineTiming } from '../src/sim/railway-line-schedule.ts';

// Accepted Place inputs in milliseconds/10 Hz ticks, supplied as room settings at the future funding boundary.
const timing: LineTiming = {
  depositMs: 320,
  feedIntervalMs: 70,
  logFlightMs: 550,
  stoneFlightMs: 450,
  beamFlightMs: 900,
  cruiseCmPerTick: 50,
  departureTicks: 20,
};

test('line 1 preserves source identity, exact bills and the one twelve-panel allowance', () => {
  assert.deepEqual(
    LINE1_STATIONS.map((s) => [s.id, ...s.bill, s.beam, s.crate]),
    [
      ['T1', 24, 0, 0, true],
      ['T2', 32, 8, 0, true],
      ['T3', 40, 0, 1, false],
    ],
  );
  assert.equal(
    LINE1_STATIONS.reduce((n, s) => n + s.bill[0], 0),
    96,
  );
  assert.equal(
    LINE1_STATIONS.reduce((n, s) => n + s.bill[1], 0),
    8,
  );
  assert.equal(
    LINE1_STATIONS.reduce((n, s) => n + s.beam, 0),
    1,
  );
  assert.deepEqual(LINE1_INITIAL, [3910, 24]);
  const ordinary = new Set(LINE1_ORDINARY_SOURCES.map(([id]) => id));
  assert.equal(ordinary.size, 388);
  for (const id of [LINE1_GREAT_TREE.id, ...LINE1_HARDWOOD_IDS]) assert.equal(ordinary.has(id), false);
  assert.equal(
    LINE1_ROCKS.reduce((n, rock) => n + rock.initial, 0),
    24,
  );
  assert.deepEqual(
    LINE1_ROCKS.map((rock) => rock.id),
    [0, 1, 2],
  );
  const panels = linePanels();
  assert.equal(panels.length, LINE1_PANEL_ALLOWANCE);
  assert.equal(panels[0]!.fromCm, 19100);
  assert.equal(panels.at(-1)!.toCm, 3000);
  panels.forEach((panel, i) => {
    assert.equal(panel.index, i);
    assert.ok(panel.fromCm > panel.toCm);
    assert.ok(Number.isInteger(panel.toCm));
    if (i) assert.equal(panels[i - 1]!.toCm, panel.fromCm);
  });
  for (const station of LINE1_STATIONS) {
    const stretch = panels.filter((panel) => panel.station === station.id);
    assert.equal(stretch.length, station.panels);
    assert.equal(stretch.at(-1)!.toCm, station.toCm);
  }
});

test('mixed feeds finish after every flight, with explicit tick rounding rather than T1 scaling', () => {
  const schedules = LINE1_STATIONS.map((station) => lineSchedule(station, timing));
  assert.deepEqual(
    schedules.map((s) => [s.depositTicks, s.feedTicks, s.layTicks]),
    [
      [4, 22, 89],
      [4, 33, 75],
      [4, 34, 179],
    ],
  );
  assert.deepEqual(
    schedules.map((s) => s.feedRoundingMs),
    [40, 20, 50],
  );
  assert.ok(schedules.every((s) => s.depositRoundingMs === 80));
  const t2 = lineFeed(LINE1_STATIONS[1]!, timing);
  assert.ok(t2.slice(0, 8).every((flight) => flight.kind === 'stone'));
  assert.ok(t2.slice(8).every((flight) => flight.kind === 'log'));
  const t3 = lineFeed(LINE1_STATIONS[2]!, timing);
  assert.equal(t3[0]!.kind, 'beam');
  assert.ok(t3.slice(1).every((flight) => flight.kind === 'log'));
  for (const [i, station] of LINE1_STATIONS.entries()) {
    const feed = lineFeed(station, timing);
    const last = Math.max(...feed.map((flight) => flight.landMs));
    assert.ok(schedules[i]!.feedTicks * 100 >= last);
    assert.ok((schedules[i]!.feedTicks - 1) * 100 < last);
  }
  // A longer early beam flight, not necessarily the final log, controls feed completion.
  assert.equal(lineSchedule(LINE1_STATIONS[2]!, { ...timing, beamFlightMs: 6000 }).feedTicks, 60);
});

test('whole panels commit on the first tick reaching their contact; fixed schedule survives serialization', () => {
  for (const station of LINE1_STATIONS) {
    const schedule = lineSchedule(station, timing);
    assert.deepEqual(lineSchedule(station, JSON.parse(JSON.stringify(timing))), schedule);
    for (const panel of schedule.panels) {
      const distance = station.fromCm - panel.toCm;
      assert.ok(lineLayDistance(panel.tick, timing) >= distance);
      assert.ok(lineLayDistance(panel.tick - 1, timing) < distance);
    }
    assert.equal(schedule.panels.at(-1)!.tick, schedule.layTicks);
    const flat = lineSchedule(station, { ...timing, departureTicks: 0 });
    assert.equal(flat.layTicks, Math.ceil((station.fromCm - station.toCm) / timing.cruiseCmPerTick));
  }
  for (const bad of [NaN, Infinity, -1, -0, 0.5, 60001])
    assert.throws(() => lineSchedule(LINE1_STATIONS[0]!, { ...timing, feedIntervalMs: bad }), /line timing/);
  assert.throws(() => lineSchedule(LINE1_STATIONS[0]!, { ...timing, cruiseCmPerTick: 0 }), /line timing/);
});

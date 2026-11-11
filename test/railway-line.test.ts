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
  LINE1_RAIL_PAIRS,
} from '../src/sim/railway-line-layout.ts';
import { LINE2_STATIONS, line2Panels } from '../src/sim/railway-line2-layout.ts';
import { apply, createRailway, invariant, railSession, rocks } from './helpers/rail.ts';
import { railCounts } from '../src/sim/railway-queries-line2.ts';
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
  // The twelve stock units lay as rail pairs of about 3 m: 5/5/4, 5/5/2 and 6 x 5.
  const panels = linePanels();
  assert.equal(panels.length, LINE1_RAIL_PAIRS);
  assert.equal(panels.length, 56);
  assert.equal(
    panels.reduce((units, panel) => units + panel.stock, 0),
    LINE1_PANEL_ALLOWANCE,
  );
  assert.equal(panels[0]!.fromCm, 19100);
  assert.equal(panels.at(-1)!.toCm, 3000);
  panels.forEach((panel, i) => {
    assert.equal(panel.index, i);
    assert.ok(panel.fromCm > panel.toCm);
    assert.ok(Number.isInteger(panel.toCm));
    assert.ok(panel.fromCm - panel.toCm >= 240 && panel.fromCm - panel.toCm <= 310, 'about one rail pair');
    if (i) assert.equal(panels[i - 1]!.toCm, panel.fromCm);
  });
  for (const station of LINE1_STATIONS) {
    const stretch = panels.filter((panel) => panel.station === station.id);
    assert.equal(
      stretch.reduce((units, panel) => units + panel.stock, 0),
      station.panels,
    );
    assert.equal(stretch.at(-1)!.toCm, station.toCm);
    assert.equal(stretch.at(-1)!.stock, 1);
  }
  // The unit boundaries (where stock decrements) are unchanged by the split.
  assert.deepEqual(
    panels.filter((panel) => panel.stock).map((panel) => panel.toCm),
    [17667, 16233, 15000, 13567, 12133, 11600, 10167, 8733, 7300, 5867, 4433, 3000],
  );
  for (const station of LINE2_STATIONS) {
    const pairs = line2Panels(station);
    assert.equal(
      pairs.reduce((units, panel) => units + panel.stock, 0),
      station.bill[1],
      `${station.id} rails`,
    );
    assert.equal(pairs.at(-1)!.toCm, station.toCm);
    pairs.forEach((pair, i) => {
      // Q4's 6.75 m stock rail lays as two 3.375 m pairs, as Place lays it (track-panels.ts MAX_PANEL_LENGTH).
      assert.ok(pair.toCm - pair.fromCm >= 230 && pair.toCm - pair.fromCm <= 338, `${station.id} pair length`);
      if (i) assert.equal(pairs[i - 1]!.toCm, pair.fromCm);
    });
  }
  assert.deepEqual(
    LINE2_STATIONS.map((station) => line2Panels(station).length),
    [12, 24, 24, 32, 96, 64],
  );
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

test('rail pairs commit on the first tick reaching their contact; fixed schedule survives serialization', () => {
  for (const station of LINE1_STATIONS) {
    const schedule = lineSchedule(station, timing);
    assert.deepEqual(lineSchedule(station, JSON.parse(JSON.stringify(timing))), schedule);
    for (const [i, panel] of schedule.panels.entries()) {
      const distance = station.fromCm - panel.toCm;
      assert.ok(lineLayDistance(panel.tick, timing) >= distance);
      assert.ok(lineLayDistance(panel.tick - 1, timing) < distance);
      if (i) assert.ok(panel.tick > schedule.panels[i - 1]!.tick, 'one pair per contact tick');
    }
    assert.equal(schedule.panels.at(-1)!.tick, schedule.layTicks);
    const flat = lineSchedule(station, { ...timing, departureTicks: 0 });
    assert.equal(flat.layTicks, Math.ceil((station.fromCm - station.toCm) / timing.cruiseCmPerTick));
  }
  for (const bad of [NaN, Infinity, -1, -0, 0.5, 60001])
    assert.throws(() => lineSchedule(LINE1_STATIONS[0]!, { ...timing, feedIntervalMs: bad }), /line timing/);
  assert.throws(() => lineSchedule(LINE1_STATIONS[0]!, { ...timing, cruiseCmPerTick: 0 }), /line timing/);
});

test('the machine view lays the same rail pairs the shared schedule commits', async () => {
  const { LINKS } = await import('../src/place/layout.ts');
  const { trackPanels } = await import('../src/entities/railway/track-panels.ts');
  const view = (id: string) => trackPanels(LINKS.find((spec) => spec.id === id)!);
  // Pair for pair, the same stock flags; ends agree to the shared catalog's centimetre rounding.
  const same = (local: { end: number; stock: number }[], shared: { toCm: number; stock: number }[]) => {
    assert.deepEqual(
      local.map((p) => p.stock),
      shared.map((p) => p.stock),
    );
    local.forEach((p, i) => assert.ok(Math.abs(p.end * 100 - shared[i]!.toCm) <= 1, `pair ${i} end`));
  };
  same(view('timber'), linePanels());
  // Production line two is Q1-Q6: all six stages.
  const shared = LINE2_STATIONS.flatMap((station) => line2Panels(station));
  same(view('quarry').slice(0, shared.length), shared);
});

test('rock slots: line one three, the Works two; stone conserved across both', async () => {
  const { RAIL_ROCKS, RAIL_STONE, WORKS_ROCKS } = await import('../src/sim/railway-works-layout.ts');
  assert.deepEqual(
    RAIL_ROCKS.map((r) => r.id),
    [0, 1, 2, 3, 4],
  );
  assert.deepEqual(RAIL_ROCKS.slice(0, 3), [...LINE1_ROCKS]);
  assert.deepEqual(RAIL_ROCKS.slice(3), [...WORKS_ROCKS]);
  const s = createRailway();
  assert.deepEqual(rocks(s).map((r) => r.left), [8, 8, 8, 8, 8]);
  assert.equal(railCounts(s).stone!.total, RAIL_STONE);
  railSession(s, 'a', 1);
  apply(s, 'a', { op: 'rail.wake', epoch: 1, request: 1 }, 0);
  // A Works rock mines like line one's (the bowl is walkable early; its stone only matters once the kiln is open).
  const r = apply(s, 'a', { op: 'rail.mine', epoch: 1, request: 2, id: 3 }, 100);
  assert.equal(r.accepted, 2);
  assert.equal(apply(s, 'a', { op: 'rail.mine', epoch: 1, request: 3, id: 5 }, 101).accepted, 0);
  assert.deepEqual(rocks(s).map((r) => r.left), [8, 8, 8, 6, 8]);
  assert.equal(railCounts(s).stone!.total, RAIL_STONE);
  assert.equal(invariant(s), null);
});

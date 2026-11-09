import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  railwayActionMarks,
  createRailwayProgressMarks,
  createRailwayJourneyMarks,
} from '../src/adapters/railway-marks.ts';
import { createRailwayWorld, railwayView } from '../src/sim/railway-world.ts';
import { beatsOf } from '../dev/playtest/beats.ts';
import { parseSession } from '../dev/playtest/read.ts';
import { summarize } from '../dev/playtest/summary.ts';

test('accepted railway actions map amounts and material without identifying the actor', () => {
  assert.deepEqual(railwayActionMarks({ op: 'rail.deposit', station: 'Q4', n: 8, kind: 2 }, 3, false), [
    ['deposit', { by: 3, mine: false, authority: 'server', station: 'Q4', material: 'rails' }],
  ]);
  assert.deepEqual(railwayActionMarks({ op: 'rail.wake' }, 0, true), []);
  for (const intent of [
    { op: 'rail.boilerTake', revision: 1 },
    { op: 'rail.boilerFit', revision: 2 },
    { op: 'rail.call', id: 4 },
  ] as const) {
    const marks = railwayActionMarks(intent, 1, true);
    assert.equal(marks.length, 1);
    assert.ok(beatsOf('place', true).some(([, pattern]) => pattern.test(marks[0]![0])));
    assert.deepEqual(railwayActionMarks(intent, 0, true), []);
  }
  assert.equal(railwayActionMarks({ op: 'rail.call', id: 4 }, 1, false)[0]![1].halt, 4);
  const ops = [
    'wake',
    'chop',
    'axe',
    'hook',
    'lever',
    'seaSwitch',
    'pack',
    'cartCall',
    'depotTake',
    'depotRailTake',
  ] as const;
  for (const op of ops) {
    const intent = op === 'chop' ? { op: 'rail.chop' as const, id: 0 } : { op: `rail.${op}` as const };
    const marks = railwayActionMarks(intent, 1, true);
    assert.equal(marks.length, 1, op);
    assert.ok(
      beatsOf('place', true).some(([, pattern]) => pattern.test(marks[0]![0])),
      op,
    );
  }
});

test('consistent progress edges mark every stretch once, and baseline/refill never invent achievements', () => {
  const s = railwayView(createRailwayWorld());
  const observe = createRailwayProgressMarks();
  assert.deepEqual(observe(s), []);
  const jobs = [s, ...s.line!.jobs, ...s.line2!.jobs];
  const ids = ['T1', 'T2', 'T3', ...s.line2!.jobs.map((_, i) => `Q${i + 1}`)];
  for (const [i, job] of jobs.entries()) {
    job.start = 10;
    assert.deepEqual(
      observe(s).map(([name]) => name),
      [`stretch funded ${ids[i]}`],
    );
    job.completion = 1;
    assert.deepEqual(
      observe(s).map(([name]) => name),
      [`stretch laid ${ids[i]}`],
    );
    assert.deepEqual(observe(s), []);
  }
  s.line2!.forge.lit = 20;
  assert.deepEqual(
    observe(s).map(([name]) => name),
    ['forge lit'],
  );
  s.line2!.trains = 30;
  assert.deepEqual(
    observe(s).map(([name]) => name),
    ['trains unlocked'],
  );
  assert.deepEqual(observe(s), []);
  const rejoin = createRailwayProgressMarks();
  assert.deepEqual(rejoin(s, true), []);
  assert.deepEqual(rejoin(s), []);
});

test('journey marks require a train platform or the completed dry pier, once per visit or session', () => {
  const observe = createRailwayJourneyMarks();
  const pier = { x: 1402.2, y: 25.1, z: -367.5 };
  assert.deepEqual(observe(pier, 'railway:cart', true, false, false), []);
  assert.deepEqual(observe(pier, 'railway:train1-0', false, false, false), []);
  assert.deepEqual(observe(pier, 'railway:train1-0', true, false, false), [
    ['train ride', { line: 1, authority: 'local' }],
  ]);
  assert.deepEqual(observe(pier, 'railway:train1-1', true, false, false), []);
  observe(pier, undefined, true, false, false);
  assert.equal(observe(pier, 'railway:train0-2', true, false, false)[0]?.[0], 'train ride');
  assert.deepEqual(observe({ ...pier, y: 0 }, undefined, true, true, false), []);
  assert.deepEqual(observe(pier, undefined, true, true, true), []);
  assert.deepEqual(observe({ ...pier, x: pier.x + 20 }, undefined, true, true, false), []);
  assert.deepEqual(observe(pier, undefined, true, true, false), [['pier reached', { authority: 'local' }]]);
  assert.deepEqual(observe(pier, undefined, true, true, false), []);
});

test('CLI summary prints railway details and keeps refusals out of accepted beats', () => {
  const ev = [
    { t: 0, k: 'session', railway: true, name: 'bot' },
    { t: 1, k: 'm', n: 'woke', by: 1, authority: 'server', mine: true },
    { t: 2, k: 'm', n: 'deposit', by: 3, station: 'Q4', material: 'rails', authority: 'server', mine: false },
    { t: 3, k: 'm', n: 'sea switch refused', authority: 'local', reason: 'before Q4' },
    { t: 4, k: 'end' },
  ];
  const s = parseSession(
    'test-session',
    JSON.stringify({ card: 'place', n: 0, now: 4, at: new Date(0).toISOString(), ev }),
  );
  const output = summarize(s, [], []).join('\n');
  assert.match(output, /Railway objective timeline/);
  assert.match(output, /deposit \(Q4, rails\) x3 \[server, teammate\]/);
  assert.match(output, /Refusals by kind: sea switch refused: before Q4 x1/);
  assert.match(output, /Never .*pulled the sea switch/);
});

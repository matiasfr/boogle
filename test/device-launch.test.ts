import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseSession } from '../dev/playtest/read.ts';
import { readDevice } from '../dev/device/read.ts';
import { launchBreakdown, launchLines } from '../dev/device/report.ts';
import { launchHeadlines, launchKind, markEvents, parseSnap } from '../src/debug/device/launch.ts';
import { playBatch, sessionEvent } from '../src/debug/device/wire.ts';
import type { PlayEvent } from '../server/src/playdata.ts';

const ID = 'dv-abcdefghijklmnopqrstuvwxyz';

test('a launch is cold only when no service worker and no cache served the first page', () => {
  assert.equal(launchKind({ sw0: false, html_cached: false }), 'cold');
  assert.equal(launchKind({ sw0: true, html_cached: false }), 'warm');
  assert.equal(launchKind({ sw0: false, html_cached: true }), 'warm');
  assert.equal(launchKind({ sw0: false, html_cached: null }), 'unknown');
  assert.equal(launchKind({}), 'unknown');
});

test('the headlines never put a warm number under the cold label', () => {
  const cold = launchHeadlines({ sw0: false, html_cached: false, ready: 12400 });
  assert.equal(cold[0], 'Cold launch: 12.4 s (first visit, no service worker)');
  assert.match(cold[1]!, /^Warm launch: not measured/);
  const warm = launchHeadlines({ sw0: true, html_cached: false, ready: 2800 });
  assert.match(warm[0]!, /^Cold launch: unknown \(the first navigation was already served/);
  assert.doesNotMatch(warm[0]!, /2\.8/);
  assert.equal(warm[1], 'Warm launch: 2.8 s');
  const later = launchHeadlines({ sw0: false, html_cached: false, ready: 3000, later: true });
  assert.match(later[0]!, /^Cold launch: unknown/);
  assert.match(later[0]!, /did not finish/);
  assert.match(launchHeadlines(null)[0]!, /^Cold launch: unknown/);
  assert.match(launchHeadlines({ sw0: false, html_cached: false })[0]!, /not measured/);
});

test('marks go out as events of at most twenty fields, with safe names', () => {
  const marks: [string, number][] = Array.from({ length: 45 }, (_, i) => [`phase-${i}`, i * 10]);
  const events = markEvents(5, marks);
  assert.equal(events.length, 3);
  for (const e of events) assert.ok(Object.keys(e).length <= 22); // t and k, plus the marks
  assert.equal(events[0]!.m_phase_3, 30);
  assert.equal(events[2]!.m_phase_44, 440);
  assert.deepEqual(markEvents(5, []), []);
});

test('a stored snapshot is read back, and junk is not one', () => {
  const snap = { fields: { sw0: false }, marks: [['html', 90]], files: ['/a.js (310 KB, 400 ms)'] };
  assert.deepEqual(parseSnap(JSON.stringify(snap)), snap);
  assert.deepEqual(parseSnap(JSON.stringify({ ...snap, marks: [['html', 'x'], 3, ['ok', 1]] }))?.marks, [['ok', 1]]);
  for (const bad of [null, '', 'nope', '{}', '{"fields":1,"marks":[],"files":[]}', '[]'])
    assert.equal(parseSnap(bad), null);
});

const batch = (events: PlayEvent[]) => JSON.stringify({ at: '2026-11-10T10:00:00Z', ...playBatch(ID, 0, 1, events) });

test('a run reads its first launch and boot marks, and the report shows where the time went', () => {
  const events: PlayEvent[] = [
    sessionEvent(1, { suite: 'quick', build: 'abc', ua: 'x' }),
    {
      t: 2,
      k: 'dev.first',
      sw0: false,
      html_cached: false,
      nav: 'navigate',
      ttfb: 120,
      conn: 60,
      html: 400,
      ready: 12400,
      usable: 12500,
      req: 300,
      net_kb: 9000,
      shaders_ms: 4100,
      programs: 90,
      pipelines: 160,
      later: false,
    },
    ...markEvents(2, [
      ['html', 400],
      ['entry', 900],
      ['modules', 3000],
      ['interactive', 12400],
    ]),
    ...markEvents(2, [['shaders', 11000]], 1),
    { t: 2, k: 'dev.first.files', f2: '/b.js (200 KB, 90 ms)', f1: '/a.js (900 KB, 800 ms)', junk: 3 },
  ];
  const r = readDevice(parseSession(ID, batch(events)));
  assert.equal(r.first?.ready, 12400);
  assert.equal(r.boot.m_shaders, 11000);
  assert.deepEqual(r.files, ['/a.js (900 KB, 800 ms)', '/b.js (200 KB, 90 ms)']);
  assert.equal(launchLines(r)[0], 'Cold launch: 12.4 s (first visit, no service worker)');
  const text = launchBreakdown(r).join('\n');
  assert.match(text, /Launch breakdown \(cold launch\)/);
  // Phases in time order, each with the step from the one before.
  assert.ok(text.indexOf('| html | 400 | +400 |') < text.indexOf('| entry | 900 | +500 |'));
  assert.match(text, /\| shaders \| 11000 \| \+8000 \|/);
  assert.match(text, /\| interactive \| 12400 \| \+1400 \|/);
  assert.match(text, /shader warm-up \(ms\) \| 4100/);
  assert.match(text, /- \/a\.js \(900 KB, 800 ms\)/);
});

test('a run from before the first-load record says it cannot tell cold from warm', () => {
  const r = readDevice(parseSession(ID, batch([sessionEvent(1, { suite: 'quick' })])));
  assert.equal(r.first, null);
  assert.match(launchLines(r)[0]!, /^Cold launch: unknown \(this run did not record its first load/);
  assert.deepEqual(launchBreakdown(r), []);
});

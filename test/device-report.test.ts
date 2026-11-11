import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { loadBaseline, loadBenchHistory, refuseBaseline, saveBaseline } from '../dev/device/baseline.ts';
import type { DeviceResult, SceneRow } from '../dev/device/read.ts';
import {
  baselineSection,
  benchLine,
  diff,
  frameLimitLines,
  gpuLimit,
  longTaskLimit,
  pasteLine,
  ratio,
  readyHeadline,
  report,
} from '../dev/device/report.ts';
import { readyLine, longTasksSupported } from '../src/debug/device/stats.ts';

const row = (name: string, over: Partial<SceneRow> = {}): SceneRow => ({
  name,
  idx: 0,
  verdict: 'pass',
  why: '',
  n: 300,
  secs: 5,
  p50: 16.7,
  p95: 20,
  p99: 25,
  max: 40,
  over33: 0,
  over50: 0,
  longTasks: null,
  cpu: 3,
  cpu95: 4,
  gpu: null,
  gpuStatus: '',
  calls: 800,
  tris: 500_000,
  progs: 90,
  geoms: 300,
  ratio: 1,
  rung: 0,
  stallN: 0,
  stallMax: 20,
  progsNew: 0,
  heapMb: null,
  renderFps: null,
  frameCap: null,
  ...over,
});
const run = (id: string, scenes: SceneRow[], over: Partial<DeviceResult> = {}): DeviceResult => ({
  id,
  code: id.slice(-6),
  suite: 'quick',
  build: 'bd34b181',
  label: '',
  device: 'tablet',
  browser: 'safari',
  ua: 'Mozilla/5.0 (iPad; CPU OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Safari/605.1.15',
  selfMinted: false,
  gpu: { desc: 'Apple GPU' },
  alim: {},
  dlim: {},
  env: {},
  load: {},
  bg: {},
  first: null,
  boot: {},
  files: [],
  scenes,
  done: {},
  complete: true,
  ...over,
});
const MAC = run(
  'dv-macmacmacmacmacmacmacmacmac',
  [row('spawn', { p50: 8.3, p95: 9, calls: 790, tris: 480_000 }), row('town')],
  {
    device: 'desktop',
    browser: 'chrome',
    label: 'mac chrome',
    ua: 'Mozilla/5.0 (Macintosh) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36',
    gpu: { desc: 'Apple M1 Max' },
  },
);
const base = { saved: '2026-11-10T09:00:00.000Z', result: MAC };

test('ratio and diff print dashes for what is missing, never zero', () => {
  assert.equal(ratio(33.4, 16.7), '2.00x');
  assert.equal(ratio(null, 16.7), '-');
  assert.equal(ratio(16.7, null), '-');
  assert.equal(ratio(10, 0), '-');
  assert.equal(diff(812, 800), '+12');
  assert.equal(diff(790, 800), '-10');
  assert.equal(diff(800, 800), '0');
  assert.equal(diff(null, 800), '-');
});

test('baseline columns give the ratio to the Mac; a scene the baseline lacks prints dashes', () => {
  const r = run('dv-devicedevicedevicedevice12', [
    row('spawn', { p50: 16.6, p95: 18, calls: 802, tris: 470_000 }),
    row('pier'),
  ]);
  const text = baselineSection(r, { baseline: base }).join('\n');
  assert.match(
    text,
    /Baseline: run macmac \(mac chrome\), desktop \(Apple M1 Max\), Chrome 142\.0, build bd34b181, saved 2026-11-10/,
  );
  const spawn = text.split('\n').find((l) => l.startsWith('| spawn'))!;
  assert.match(
    spawn,
    /\| 16\.6 \| 8\.3 \| 2\.00x \| 18\.0 \| 9\.0 \| 2\.00x \| 802 \| 790 \| \+12 \| 470000 \| 480000 \| -10000 \|/,
  );
  const pier = text.split('\n').find((l) => l.startsWith('| pier'))!;
  assert.match(pier, /\| 16\.7 \| - \| - \| 20\.0 \| - \| - \| 800 \| - \| - \| 500000 \| - \| - \| 0 \/ - \|/);
  assert.match(text, /Not in the baseline \(dashes\): pier\./);
});

test('a different quality rung is named, and different builds are flagged', () => {
  const r = run('dv-devicedevicedevicedevice12', [row('spawn', { rung: 2, ratio: 0.7 })], { build: 'aaaaaaaa' });
  const text = baselineSection(r, { baseline: base }).join('\n');
  assert.match(text, /\*\*spawn\*\*: detail rung 2 on this device, 0 on the baseline/);
  assert.match(text, /The builds differ \(aaaaaaaa here, bd34b181 in the baseline\)/);
  const same = baselineSection(run('dv-x', [row('spawn')]), { baseline: base }).join('\n');
  assert.doesNotMatch(same, /detail rung/);
});

test('no baseline says how to make one; the baseline run itself says so', () => {
  assert.match(
    baselineSection(run('dv-x', [row('spawn')]), {}).join('\n'),
    /No baseline for suite quick yet.*npm run device -- baseline <code>/,
  );
  assert.match(baselineSection(MAC, { baseline: base }).join('\n'), /This run is the baseline for suite quick/);
});

test('the report carries the baseline section and the paste line keeps its wording', () => {
  const r = run('dv-devicedevicedevicedevice12', [row('spawn')]);
  assert.equal(
    pasteLine(r),
    'Tested on a device: tablet (Apple GPU), Safari 26.0, build bd34b181, suite quick, 1/1 scenes pass, run dv-devicedevicedevicedevice12 (.look/device/dv-devicedevicedevicedevice12/report.md)',
  );
  assert.match(report(r, { baseline: base }), /## Against the baseline/);
  assert.match(report(r), /No baseline for suite quick yet/);
});

test('the bench line compares exact counts at the same commit, and is absent otherwise', () => {
  const r = run('dv-devicedevicedevicedevice12', [row('spawn', { calls: 812, tris: 500_000 }), row('pier')]);
  const history = [
    { date: '2026-11-08T03:00:00Z', base: 'bd34b181ffff', metrics: { 'spawn.calls': 700, 'spawn.tris': 1 } },
    { date: '2026-11-09T03:00:00Z', base: 'bd34b181ffff', metrics: { 'spawn.calls': 800, 'spawn.tris': 499_000 } },
    { date: '2026-11-09T04:00:00Z', base: 'ccccccccc', metrics: { 'spawn.calls': 1, 'spawn.tris': 1 } },
  ];
  const line = benchLine(r, history)!;
  assert.match(line, /bd34b181, the Mac's daily perf run of 2026-11-09/);
  assert.match(line, /spawn 800 calls \/ 499000 tris on the Mac, 812 \/ 500000 here \(\+12 \/ \+1000\)/);
  assert.doesNotMatch(line, /pier/);
  assert.equal(benchLine(run('dv-x', [row('spawn')], { build: 'zzzzzzzz' }), history), null);
  assert.equal(benchLine(r, []), null);
  assert.equal(benchLine(run('dv-x', [row('spawn')], { build: '' }), history), null);
});

test('a baseline round-trips through its file; refused runs and bad files are not baselines', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'device-baseline-'));
  process.env.BOOGLE_DEVICE_DIR = dir;
  process.env.BOOGLE_DAILY_DIR = dir;
  try {
    assert.equal(loadBaseline('quick'), null);
    assert.equal(loadBenchHistory().length, 0);
    const file = saveBaseline(MAC, new Date('2026-11-10T09:00:00Z'));
    assert.equal(file, path.join(dir, 'baseline', 'quick.json'));
    assert.deepEqual(loadBaseline('quick'), base);
    assert.throws(() => saveBaseline(run('dv-x', [row('spawn')], { complete: false })), /incomplete/);
    assert.throws(() => saveBaseline(run('dv-x', [])), /no scenes/);
    assert.throws(() => saveBaseline(run('dv-x', [row('spawn', { verdict: 'fail' })])), /no scene passed/);
    assert.match(refuseBaseline(run('dv-x', [row('spawn')], { suite: 'weird' })) ?? '', /not one of/);
    fs.writeFileSync(file, '{"saved": 1}');
    assert.equal(loadBaseline('quick'), null);
    fs.mkdirSync(path.join(dir, 'perf'));
    fs.writeFileSync(
      path.join(dir, 'perf', 'history.jsonl'),
      'junk\n' + JSON.stringify({ date: 'd', base: 'abc', dir: 'x', metrics: { 'spawn.calls': 1 } }) + '\n{"base":3}\n',
    );
    assert.equal(loadBenchHistory().length, 1);
  } finally {
    delete process.env.BOOGLE_DEVICE_DIR;
    delete process.env.BOOGLE_DAILY_DIR;
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

const CHROME =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36';

test('long tasks read n/a where the browser cannot report them, even when an older page sent a zero', () => {
  assert.equal(longTasksSupported(CHROME), true);
  assert.equal(longTasksSupported(run('x', []).ua), false); // Safari
  assert.equal(longTasksSupported('Mozilla/5.0 (iPhone) AppleWebKit Chrome/1 CriOS/142 Mobile Safari'), false);
  const safari = run('dv-s', [row('spawn', { longTasks: 0 })]);
  assert.match(report(safari), /\| n\/a \|/);
  assert.match(longTaskLimit(safari), /`n\/a` in this run/);
  const chrome = run('dv-c', [row('spawn', { longTasks: 2 })], { ua: CHROME });
  assert.match(longTaskLimit(chrome), /counted with the `longtask` API/);
  assert.match(report(chrome), /\| 2 \|/);
  assert.match(longTaskLimit(run('dv-c', [row('spawn', { longTasks: null })], { ua: CHROME })), /`n\/a` in this run/);
});

test('the GPU limit line follows what the run reported', () => {
  assert.match(gpuLimit(run('dv-a', [row('spawn', { gpu: 7.8 })])), /came from timestamp queries/);
  assert.doesNotMatch(gpuLimit(run('dv-a', [row('spawn', { gpu: 7.8 })])), /missing on Safari/);
  assert.match(gpuLimit(run('dv-a', [row('spawn')])), /`unavailable` in this run/);
});

test('a frame limit is named, with the drawn rate, and the suite is said not to change it', () => {
  const capped = run(
    'dv-a',
    [row('spawn', { renderFps: 30, frameCap: 30 }), row('town', { renderFps: 29.6, frameCap: 30 })],
    { env: { refresh_ms: 17, gfx: 'resolution=0.6,frameLimit=30' } },
  );
  const note = frameLimitLines(capped).join('\n');
  assert.match(note, /Frame limit 30\./);
  assert.match(note, /the suite does not change it/);
  assert.match(note, /drew 30 to 30 frames a second/);
  assert.match(note, /display's rate \(17 ms\)/);
  // An older run: only the graphics string says it.
  const old = run('dv-a', [row('spawn')], { env: { gfx: 'resolution=0.6,frameLimit=30,msaa=false' } });
  assert.match(frameLimitLines(old).join('\n'), /did not record how many frames drew/);
  assert.deepEqual(frameLimitLines(run('dv-a', [row('spawn')], { env: { gfx: 'frameLimit=display' } })), []);
  assert.deepEqual(frameLimitLines(run('dv-a', [row('spawn')])), []);
  assert.match(report(capped), /Frame limit 30/);
});

test('the ready headline says warm or cold, and notes a cold run that came back warm', () => {
  assert.equal(readyLine(2781, true), 'Ready in 2.8 s (warm load)');
  assert.equal(readyLine(6400, false), 'Ready in 6.4 s (cold load)');
  assert.equal(readyLine(2781, null), 'Ready in 2.8 s (load)');
  assert.match(readyLine(2781, true, true), /a cold one was asked for, so open the link in a private tab/);
  assert.equal(readyLine(2781, false, true), 'Ready in 2.8 s (cold load)');
  assert.equal(readyLine(null, true), 'Ready: not measured');
  assert.equal(readyLine(0, true), 'Ready: not measured');
  assert.equal(readyHeadline(run('dv-a', [], { load: { ready: 2781, warm: true } })), 'Ready in 2.8 s (warm load)');
  assert.equal(readyHeadline(run('dv-a', [], { load: {} })), 'Ready: not measured');
  assert.match(
    report(run('dv-a', [], { load: { ready: 2781, warm: true } })),
    /Warm launch: unknown \(the load measured when Run was tapped: Ready in 2\.8 s \(warm load\)\)/,
  );
});

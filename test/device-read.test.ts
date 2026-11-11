import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseSession } from '../dev/playtest/read.ts';
import { readDevice } from '../dev/device/read.ts';
import { browserVersion, pasteLine, report } from '../dev/device/report.ts';
import {
  DEVICE_CARD,
  SCENE_CORE,
  playBatch,
  sceneEvents,
  sessionEvent,
  type Fields,
} from '../src/debug/device/wire.ts';
import type { PlayEvent } from '../server/src/playdata.ts';

const ID = 'dv-abcdefghijklmnopqrstuvwxyz'.slice(0, 29);
const UA =
  'Mozilla/5.0 (iPad; CPU OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Safari/605.1.15';
const ev = (t: number, k: string, f: Fields): PlayEvent => ({ t, k, ...f });
const scene = (i: number, name: string, over: Fields = {}): PlayEvent[] =>
  sceneEvents(10 + i, {
    name,
    idx: i,
    n: 300,
    secs: 5,
    p50: 16.7,
    p95: 20,
    p99: 25,
    max: 40,
    over33: 1,
    over50: 0,
    lt_n: -1,
    cpu: 3.2,
    gpu: null,
    calls: 800,
    tris: 500000,
    ratio: 1,
    rung: 0,
    verdict: 'pass',
    why: '',
    ...over,
  });
const lines = (batches: PlayEvent[][]) =>
  batches
    .map((b, n) => JSON.stringify({ at: `2026-11-10T10:00:${String(n).padStart(2, '0')}Z`, ...playBatch(ID, n, 1, b) }))
    .join('\n');

const HEAD: PlayEvent[] = [
  sessionEvent(1, {
    suite: 'quick',
    build: 'abc123def456',
    label: 'ipad',
    device: 'tablet',
    browser: 'safari',
    ua: UA,
    self: false,
    state: 'started',
  }),
  ev(2, 'dev.diag.gpu', {
    backend: 'webgpu',
    adapter: 'ok',
    vendor: 'apple',
    arch: 'metal-3',
    desc: 'Apple GPU',
    timestamps: false,
  }),
  ev(2, 'dev.diag.alim', { tex2d: 16384 }),
  ev(2, 'dev.diag.dlim', { tex2d: 8192 }),
  ev(2, 'dev.diag.env', { dpr: 2, sw: 1024, sh: 768, refresh_ms: 8.3 }),
  ev(3, 'dev.load', { req: 40, net_kb: 1200 }),
];

test('a recorded session gives the expected result', () => {
  const names = ['spawn', 'town', 'forge', 'bay', 'pier', 'head', 'heat'];
  const text = lines([HEAD, ...names.map((n, i) => scene(i, n)), [ev(30, 'dev.done', { scenes: 7, pass: 7 })]]);
  const r = readDevice(parseSession(ID, text), true);
  assert.equal(r.scenes.length, 7);
  assert.equal(r.complete, true);
  assert.equal(r.suite, 'quick');
  assert.equal(r.device, 'tablet');
  assert.equal(r.selfMinted, false);
  assert.equal(r.scenes[1]!.name, 'town');
  assert.equal(r.scenes[0]!.longTasks, null); // -1: not supported
  assert.equal(r.scenes[0]!.gpu, null);
  assert.equal(r.gpu.desc, 'Apple GPU');
  assert.equal(r.code, ID.slice(-6));
});

test('a session cut off after scene 3 gives three scenes and incomplete', () => {
  const text = lines([HEAD, scene(0, 'spawn'), scene(1, 'town'), scene(2, 'forge')]);
  const r = readDevice(parseSession(ID, text), true);
  assert.deepEqual(
    r.scenes.map((s) => s.name),
    ['spawn', 'town', 'forge'],
  );
  assert.equal(r.complete, false);
  assert.match(pasteLine(r), /3\/3 scenes pass \(cut off\)/);
  assert.match(report(r), /Incomplete/);
});

test('a repeated batch number is dropped; a repeated scene keeps the last', () => {
  const first = JSON.stringify({ at: '2026-11-10T10:00:00Z', ...playBatch(ID, 0, 1, HEAD) });
  const sc = JSON.stringify({ at: '2026-11-10T10:00:01Z', ...playBatch(ID, 1, 2, scene(0, 'spawn', { p50: 11 })) });
  const retry = JSON.stringify({
    at: '2026-11-10T10:00:02Z',
    ...playBatch(ID, 1, 2, scene(0, 'spawn', { p50: 99 })),
  });
  const r = readDevice(parseSession(ID, [first, sc, retry].join('\n')), true);
  assert.equal(r.scenes.length, 1);
  assert.equal(r.scenes[0]!.p50, 11);
  const twice = lines([HEAD, scene(0, 'spawn', { p50: 11 }), scene(0, 'spawn', { p50: 12 })]);
  assert.equal(readDevice(parseSession(ID, twice), true).scenes[0]!.p50, 12);
});

test('junk events are ignored and bad numbers become null', () => {
  const junk: PlayEvent[] = [
    ev(1, 'move', { x: 1 }),
    ev(2, 'dev.scene', { idx: 3 }), // no name
    ev(2, 'dev.scene', { name: 'town', verdict: 'amazing', p50: 'fast', p95: null }),
  ];
  const text = lines([HEAD, junk]);
  const r = readDevice(parseSession(ID, text + '\n{torn'), true);
  assert.equal(r.scenes.length, 1);
  assert.equal(r.scenes[0]!.verdict, 'not-measured');
  assert.equal(r.scenes[0]!.p50, null);
  assert.ok(Array.isArray(r.scenes));
});

test('a run is self-minted unless this Mac made the id, or the page says so', () => {
  const text = lines([HEAD]);
  assert.equal(readDevice(parseSession(ID, text), false).selfMinted, true);
  assert.equal(readDevice(parseSession(ID, text), true).selfMinted, false);
  const self = lines([[sessionEvent(1, { suite: 'quick', self: true })]]);
  assert.equal(readDevice(parseSession(ID, self), true).selfMinted, true);
});

test('a device run is marked bot on every session event, so no reader takes it for a person', () => {
  // dev/playtest/cli.ts lists `!meta.bot` unless --all (and dev/heartbeat.sh runs that list without --all);
  // server/src/playdata.ts looksPlayed is false for bot, so eviction takes device runs first. The server keeps the
  // newest `session` event as `meta`, so the mark is on every one.
  for (const state of ['started', 'done']) {
    const e = sessionEvent(1, { state, name: 'Someone', bot: false });
    assert.equal(e.k, 'session');
    assert.equal(e.bot, true, 'a caller cannot unmark it');
  }
  const b = playBatch(ID, 0, 1, HEAD);
  assert.equal(b.card, DEVICE_CARD);
  assert.equal(b.ev.find((e) => e.k === 'session')!.bot, true);
  assert.match(b.s, /^[a-z0-9-]{8,40}$/);
});

test('every event the page builds fits the endpoint: flat, at most 24 fields, names under 25 characters', () => {
  for (const e of HEAD) {
    const keys = Object.keys(e).filter((k) => k !== 't' && k !== 'k');
    assert.ok(keys.length <= 24);
    for (const k of keys) assert.match(k, /^[a-z0-9_]{1,24}$/i);
  }
});

test('the report leads with the line to paste and says what it is not', () => {
  const text = lines([
    HEAD,
    [...scene(0, 'spawn'), ...scene(1, 'town', { verdict: 'fail', why: 'p95 80.0 ms, not under 33.3 ms' })],
    [ev(30, 'dev.done', { scenes: 2 })],
  ]);
  const r = readDevice(parseSession(ID, text), true);
  const md = report(r);
  assert.equal(md.split('\n')[2], pasteLine(r));
  assert.match(
    pasteLine(r),
    /^Tested on a device: tablet \(Apple GPU\), Safari 26\.0, build abc123def456, suite quick, 1\/2 scenes pass, run dv-/,
  );
  assert.match(md, /\*\*town\*\*: fail: p95 80\.0 ms/);
  assert.match(md, /gpu ms/);
  assert.match(md, /unavailable/);
  assert.match(md, /public/);
  assert.equal(browserVersion('Mozilla/5.0 Chrome/142.0.1 Safari/537.36'), 'Chrome 142.0.1');
  assert.equal(browserVersion('weird'), 'browser');
});

test('a scene is two events, each within the 24 fields the endpoint keeps, and the reader joins them', () => {
  const full: Fields = {
    name: 'town',
    idx: 1,
    settle_ms: 2000,
    stall_n: 0,
    stall_max: 16.8,
    progs_new: 0,
    secs: 5,
    n: 300,
    p50: 16.7,
    p95: 16.8,
    p99: 16.8,
    max: 16.8,
    over33: 0,
    over50: 0,
    lt_n: 0,
    lt_ms: 0,
    cpu: 6,
    cpu95: 6.7,
    gpu: 7.3,
    gpu_status: 'available',
    calls: 221,
    tris: 957573,
    progs: 234,
    geoms: 872,
    texs: 90,
    ratio: 1,
    rung: 0,
    heap_mb: 120,
    heap_d: 0.4,
    hidden: false,
    verdict: 'pass',
    why: '',
  };
  const events = sceneEvents(5, full);
  assert.equal(events.length, 2);
  const kept = new Set<string>();
  for (const e of events) {
    const keys = Object.keys(e).filter((k) => k !== 't' && k !== 'k');
    assert.ok(keys.length <= 24, `${e.k} has ${keys.length} fields`);
    for (const k of keys) kept.add(k);
  }
  assert.deepEqual([...kept].sort(), Object.keys(full).sort(), 'no field is lost');
  assert.ok(SCENE_CORE.every((k) => k in full));
  const r = readDevice(parseSession(ID, lines([HEAD, events])), true);
  assert.equal(r.scenes[0]!.verdict, 'pass');
  assert.equal(r.scenes[0]!.geoms, 872);
  assert.equal(r.scenes[0]!.calls, 221);
  assert.equal(r.scenes[0]!.heapMb, 120);
});

test('a draw call or triangle count of 0 is not a measurement: it reads as missing', () => {
  const batches = [
    [
      ...sceneEvents(10, {
        name: 'spawn',
        idx: 0,
        n: 300,
        p50: 17,
        calls: 0,
        tris: 0,
        verdict: 'pass',
        why: '',
        rfps: 30,
        fcap: 30,
      }),
      ...sceneEvents(11, { name: 'town', idx: 1, n: 300, p50: 17, calls: 201, tris: 953051, verdict: 'pass', why: '' }),
    ],
  ];
  const r = readDevice(parseSession(ID, lines(batches)));
  const [spawn, town] = r.scenes;
  assert.equal(spawn!.calls, null);
  assert.equal(spawn!.tris, null);
  assert.equal(spawn!.renderFps, 30);
  assert.equal(spawn!.frameCap, 30);
  assert.equal(town!.calls, 201);
  assert.equal(town!.renderFps, null);
});

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { browserVersion, differences, previousRun, sameHardware } from '../dev/device/compare.ts';
import type { DeviceResult } from '../dev/device/read.ts';
import { baselineSection, pasteLine, previousSection, report } from '../dev/device/report.ts';

const pair = JSON.parse(fs.readFileSync(new URL('./fixtures/device-macbook-pair.json', import.meta.url), 'utf8')) as {
  earlier: DeviceResult;
  later: DeviceResult;
};
const { earlier, later } = pair;
const clone = (r: DeviceResult, over: Partial<DeviceResult> = {}): DeviceResult => ({
  ...structuredClone(r),
  ...over,
});

test('the browser version is the full one from the user agent', () => {
  assert.equal(browserVersion(earlier.ua), 'Safari 27.0');
  assert.equal(browserVersion(later.ua), 'Safari 27.2');
  assert.equal(browserVersion('Mozilla/5.0 AppleWebKit/605.1.15 Version/26.0.1 Mobile Safari/604.1'), 'Safari 26.0.1');
  assert.equal(
    browserVersion('Mozilla/5.0 (Macintosh) AppleWebKit/537.36 Chrome/142.0.0.0 Safari/537.36'),
    'Chrome 142.0',
  );
  assert.equal(browserVersion('Mozilla/5.0 Gecko/20100101 Firefox/140'), 'Firefox 140.0');
  assert.equal(browserVersion('Mozilla/5.0 Chrome/142.0.0.0 Safari/537.36 Edg/142.0.3595.53'), 'Edge 142.0.3595.53');
  assert.equal(browserVersion('curl/8'), 'browser');
  assert.match(pasteLine(later), /, Safari 27\.2, build/);
});

test('the 10 November pair lists every condition that differs', () => {
  assert.equal(sameHardware(later, earlier), true);
  assert.deepEqual(differences(later, earlier), [
    'browser Safari 27.2 here, Safari 27.0 there',
    'viewport 1128x730 here, 1489x974 there',
    'refresh interval 21 ms here, 17 ms there',
  ]);
});

test('DPR, graphics settings and cold or warm count; a refresh within 10% and an unrecorded field do not', () => {
  const other = clone(earlier, {
    ua: later.ua,
    env: { ...earlier.env, vw: 1128, vh: 730, dpr: 1, refresh_ms: 16.7, gfx: 'resolution=0.6,frameLimit=30' },
    first: { sw0: false, html_cached: false, ready: 6400 },
  });
  assert.deepEqual(differences(later, other), [
    'DPR 2 here, 1 there',
    'refresh interval 21 ms here, 16.7 ms there',
    'graphics settings resolution=1,frameLimit=display here, resolution=0.6,frameLimit=30 there',
    'launch warm here, cold there',
  ]);
  const close = clone(later, { env: { ...later.env, refresh_ms: 20 }, first: null, load: {} });
  assert.deepEqual(differences(later, close), []);
  assert.deepEqual(differences(later, clone(later, { ua: '', env: {} })), []);
});

test('the same hardware under different conditions is not comparable: no frame-time ratios, counts only', () => {
  const text = previousSection(later, { previous: earlier }).join('\n');
  assert.match(text, /## Against this device's previous run/);
  assert.match(text, /\*\*Not comparable with the previous run\.\*\*/);
  assert.match(text, /> - browser Safari 27\.2 here, Safari 27\.0 there/);
  assert.match(text, /> - viewport 1128x730 here, 1489x974 there/);
  assert.match(text, /> - refresh interval 21 ms here, 17 ms there/);
  assert.doesNotMatch(text, /p50|p95|\dx \|/);
  assert.match(text, /\| spawn \| 790 \| 790 \| 0 \| 480000 \| 480000 \| 0 \|/);
  // The same pair as baseline and run says the same.
  const asBase = baselineSection(later, { baseline: { saved: '2026-11-10T09:00:00Z', result: earlier } }).join('\n');
  assert.match(asBase, /Not comparable with the baseline/);
  assert.doesNotMatch(asBase, /1\.25x/);
});

test('the same hardware under the same conditions keeps its ratios', () => {
  const again = clone(later, { id: 'dv-macbookpairmacbookpairc10003', code: 'c10003' });
  const text = previousSection(later, { previous: again }).join('\n');
  assert.doesNotMatch(text, /Not comparable/);
  assert.match(text, /\| spawn \| 20\.9 \| 20\.9 \| 1\.00x \|/);
});

test('other hardware keeps its ratios and names the differing conditions beside them', () => {
  const ipad = clone(later, {
    id: 'dv-ipadipadipadipadipadipad0004',
    device: 'tablet',
    gpu: { desc: 'Apple GPU' },
    env: { ...later.env, dpr: 2, vw: 1180, vh: 820, refresh_ms: 8.3 },
  });
  const text = baselineSection(ipad, { baseline: { saved: '2026-11-10T09:00:00Z', result: earlier } }).join('\n');
  assert.doesNotMatch(text, /Not comparable/);
  assert.match(text, /Other hardware than the baseline, and also: browser Safari 27\.2 here, Safari 27\.0 there;/);
  assert.match(text, /\| spawn \| 20\.9 \| 16\.7 \| 1\.25x \|/);
});

test('the previous run is the newest earlier pull of the same suite, hardware and label', () => {
  const at = 1000;
  const runs = [
    { result: earlier, at: 100 },
    { result: clone(earlier, { id: 'dv-newer', label: 'other' }), at: 500 },
    { result: clone(earlier, { id: 'dv-ipad', device: 'tablet' }), at: 600 },
    { result: clone(earlier, { id: 'dv-full', suite: 'full' }), at: 700 },
    { result: clone(earlier, { id: 'dv-after' }), at: 2000 },
    { result: later, at },
  ];
  assert.equal(previousRun(later, at, runs)?.id, earlier.id);
  assert.equal(previousRun(clone(later, { label: '' }), at, runs)?.id, 'dv-newer');
  assert.equal(previousRun(later, at, [{ result: later, at: 10 }]), null);
});

test('the report prints the previous run section, and not when it is the baseline', () => {
  assert.match(report(later, { previous: earlier }), /Not comparable with the previous run/);
  const baseline = { saved: '2026-11-10T09:00:00Z', result: earlier };
  const text = report(later, { baseline, previous: earlier });
  assert.doesNotMatch(text, /previous run/);
  assert.match(text, /Not comparable with the baseline/);
  assert.doesNotMatch(report(later), /previous run/);
});

// Problem reports leave no peer ids, URLs or full user agents behind (src/report-format.js, src/features/telemetry.js).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { coarseUa, firstFrame, scrub } from '../src/report-format.js';

test('scrub hides peer ids and id-like tokens, keeps ordinary words', () => {
  assert.equal(scrub('Could not connect to peer boogle-beach-c3k9x2p1q7'), 'Could not connect to peer boogle-*');
  assert.equal(scrub('token abc123def456 expired'), 'token * expired');
  assert.equal(scrub('Cannot read properties of undefined'), 'Cannot read properties of undefined');
  assert.equal(scrub('connectionstate'), 'connectionstate'); // long, but no digit
});

test('firstFrame keeps the path only: no scheme, host or query string', () => {
  const chrome =
    'TypeError: x is undefined\n    at step (https://matiasfr.github.io/boogle/assets/index-abc.js?v=12:1:2345)';
  assert.equal(firstFrame(chrome), 'at step (/boogle/assets/index-abc.js:1:2345)');
  const firefox = 'step@https://matiasfr.github.io/boogle/assets/index-abc.js?v=12:1:2345\n@https://x.io/a.js:1:1';
  assert.equal(firstFrame(firefox), 'step@/boogle/assets/index-abc.js:1:2345');
  assert.equal(firstFrame(undefined), '');
  assert.equal(firstFrame(''), '');
});

test('coarseUa gives browser, major version and system only', () => {
  const cases = [
    [
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36 Edg/130.0.2849.68',
      'Edge 130 Windows',
    ],
    [
      'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.6778.39 Mobile Safari/537.36',
      'Chrome 131 Android',
    ],
    [
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.6 Mobile/15E148 Safari/604.1',
      'Safari 17 iOS',
    ],
    ['Mozilla/5.0 (Android 14; Mobile; rv:132.0) Gecko/132.0 Firefox/132.0', 'Firefox 132 Android'],
    ['curl/8.5.0', 'other other'],
  ];
  for (const [ua, want] of cases) assert.equal(coarseUa(ua), want);
});

// Problem reports leave no peer ids, URLs or full user agents behind (src/netplay/report-format.ts, src/features/telemetry.ts).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { coarseUa, firstFrame, scrub } from '../src/netplay/report-format.ts';

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
});

test('coarseUa gives browser, major version and system only', () => {
  const edge =
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36 Edg/130.0.2849.68';
  assert.equal(coarseUa(edge), 'Edge 130 Windows');
  assert.equal(coarseUa('curl/8.5.0'), 'other other');
});

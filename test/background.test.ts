import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createBackgroundAdvance } from '../src/world/background.ts';
import { createSync } from '../src/world/sync.ts';
import { makeNet } from './helpers/net.ts';

test('world clock slices elapsed time and caps catch-up across visible/hidden handoffs', () => {
  const calls: number[] = [];
  const adv = createBackgroundAdvance((dt) => calls.push(dt), 0);
  adv(1000, true);
  assert.ok(calls.every((d) => d <= 0.4 + 1e-9));
  assert.ok(Math.abs(calls.reduce((a, b) => a + b, 0) - 1) < 1e-9);
  calls.length = 0;
  adv(1500, false); // inactive worker must not steal time from the visible frame
  adv(1600, true);
  assert.ok(Math.abs(calls.reduce((a, b) => a + b, 0) - 0.6) < 1e-9);
  calls.length = 0;
  adv(1600, true); // a worker/frame handoff at the same instant cannot double count
  adv(1500, true); // a queued rAF stamp must not rewind the worker's cursor
  adv(1700, false);
  adv(1800, true);
  assert.ok(Math.abs(calls.reduce((a, b) => a + b, 0) - 0.2) < 1e-9);
  calls.length = 0;
  adv(1600 + 600000, true); // throttled for 10 minutes
  assert.ok(Math.abs(calls.reduce((a, b) => a + b, 0) - 5) < 1e-9);
});

test('a sparse visible frame retries a missing snapshot using elapsed time', () => {
  const net = makeNet();
  const sync = createSync();
  sync.attachWorld(net.add('slow-client').room);
  assert.equal(net.queue.length, 1, 'initial snapshot request');
  net.queue.length = 0; // host startup/durability can defer this request
  const advance = createBackgroundAdvance(sync.updateWorld, 0);
  for (const now of [500, 1000, 1500, 2000]) advance(now, false);
  advance(2500, true);
  assert.deepEqual(
    net.queue.map(({ m }) => m),
    [{ t: 'w:need' }],
  );
  assert.equal(sync.worldStatus().ready, false, 'retrying alone does not verify a snapshot');
});

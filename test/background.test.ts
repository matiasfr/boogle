import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createBackgroundAdvance } from '../src/world/background.ts';
import { createSync } from '../src/world/sync.ts';
import { SERVER_ID } from '../src/net/ids.ts';
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

test('a sparse visible frame follows the server clock without requesting a classic snapshot', () => {
  const net = makeNet();
  const server = net.add(SERVER_ID, true);
  const sync = createSync();
  sync.attachWorld(net.add('slow-client').room);
  assert.equal(net.queue.length, 0, 'joining sends no classic snapshot request');
  const advance = createBackgroundAdvance(sync.updateWorld, 0);
  for (const now of [500, 1000, 1500, 2000]) advance(now, false);
  advance(2500, true);
  assert.equal(sync.worldStatus().ready, false, 'elapsed time alone cannot establish the server clock');
  assert.equal(net.queue.length, 0);
  server.room.send({ t: 'w:c', ht: 40 });
  net.flush();
  assert.equal(sync.worldStatus().ready, true);
  advance(3000, true);
  assert.equal(sync.world.tick, 45, 'the visible frame includes elapsed time after the clock stamp');
  assert.equal(net.queue.length, 0, 'clock following never emits a retired request');
});

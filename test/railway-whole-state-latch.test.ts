import test from 'node:test';
import assert from 'node:assert/strict';
import { line2Trains } from '../src/sim/railway-queries-line2.ts';
import { RAILWAY_WINDOW } from '../src/sim/railway.ts';
import { LINE_HALTS } from '../src/sim/railway-train.ts';
import { buildSeedWorld } from './helpers/rail.ts';
import { railRoom } from './helpers/rail-room.ts';

test('read.whole() latches the first whole state and holds it through a dropped link and its refill', () => {
  const r = railRoom(buildSeedWorld('trains-on'));
  const a = r.join('a', 'a', 2);
  assert.equal(a.adapter.read.whole(), false, 'false before the whole state is in');
  r.run(3);
  assert.equal(a.adapter.read.whole(), a.adapter.read.ready(), 'latches exactly with the first ready()');
  r.ready();
  assert.equal(a.adapter.read.whole(), true);
  const shown = a.adapter.read.world();
  a.disconnect();
  r.run(5);
  assert.equal(a.adapter.read.ready(), false, 'the link is down');
  assert.equal(a.adapter.read.whole(), true, 'whole through the drop');
  assert.equal(a.adapter.read.world(), shown, 'the last whole world stays shown');
  a.reconnect();
  for (let k = 0; k < 300 && !a.adapter.read.ready(); k++) {
    r.run();
    assert.equal(a.adapter.read.whole(), true, `whole through the refill, step ${k}`);
  }
  assert.equal(a.adapter.read.ready(), true, 'ready again');
});

test('a full pending window keeps the first whole state visible', () => {
  const r = railRoom(buildSeedWorld('trains-on'));
  const a = r.join('a', 'a', 30);
  const shown = a.adapter.read.whole;
  assert.equal(shown(), false, 'hidden before the whole state is in');
  r.ready();
  assert.equal(shown(), true, 'shown once it is');
  let pressed = 0;
  for (let k = 0; k < 40 && a.adapter.read.pending() < RAILWAY_WINDOW; k++)
    if (a.adapter.callTrain(k % LINE_HALTS.length, k % 2 ? 1 : -1)) pressed++;
  assert.equal(a.adapter.read.pending(), RAILWAY_WINDOW, `the window filled (${pressed} presses)`);
  assert.equal(a.adapter.read.ready(), false, 'ready() is false with the window full');
  assert.ok(a.mirror.synced() && line2Trains(a.adapter.read.world()), 'whole and running');
  assert.equal(shown(), true, 'the trains stay shown while the whole state is in and the window is full');
});

// Review of M12e (branch review/m12e, cut from ecs/m12e cc9fea56f): read.whole() against the latch it replaced
// (createFirstReady, first-ready.ts at 9214d13a3). Passes: a guard, since the leaf test's fake adapter now stubs
// whole() as true and no other test holds the session's latch through a dropped link.
import test from 'node:test';
import assert from 'node:assert/strict';
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

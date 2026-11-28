import test from 'node:test';
import assert from 'node:assert/strict';
import { fixture } from './helpers/rail-tune.ts';
import { act, buildSeedWorld, chopTo, railSession } from '../../test/helpers/rail.ts';
import { leaveTimber } from '../../src/sim/railway-seed-route.ts';
import { railwayCheck } from '../../src/sim/railway-check.ts';
import { QUARRY_YARD, worksThanks } from '../../src/sim/railway-queries-gift.ts';
import { HALT_YARDS } from '../../src/sim/railway-yard-layout.ts';
import { haltYardStock } from '../../src/sim/railway-queries-yard.ts';

test('a late joiner after restart sees the same promised donor after a guest collects surplus', async (t) => {
  const f = await fixture(t);
  const seed = buildSeedWorld('crossing-done');
  for (const [pid, quantity] of [
    ['a', 8],
    ['b', 16],
  ] as const) {
    chopTo(seed, pid, quantity);
    leaveTimber(seed, pid, QUARRY_YARD, quantity);
  }
  railSession(seed.w, 'feeder', 1);
  chopTo(seed, 'feeder', 12);
  assert.equal(act(seed, 'feeder', 'rail.deposit', { station: 'Q7', kind: 0, n: 12 }), 12);
  while (f.host.sync.world.tick < seed.t) f.host.step(0.1);
  await f.host.sync.whenDurable();
  f.host.rules.railway.world().load(seed.w.snapshot(), railwayCheck);
  f.host.rules.railway.touchAll();
  const yard = HALT_YARDS[QUARRY_YARD]!;
  const guest = f.join('b', false, () => ({ x: yard.x / 100, y: 0, z: yard.z / 100 }));
  f.run(6);
  assert.deepEqual(worksThanks(guest.mirror.confirmed(), 3), ['a', 'feeder']);
  assert.equal(guest.adapter.haltTake(QUARRY_YARD, 0), true);
  f.run(6);
  assert.equal(haltYardStock(f.host.rules.railway.world(), QUARRY_YARD, 0), 8);
  await f.restart();
  const late = f.join('late');
  f.run(6);
  assert.equal(haltYardStock(late.mirror.confirmed(), QUARRY_YARD, 0), 8);
  assert.deepEqual(worksThanks(late.mirror.confirmed(), 3), ['a', 'feeder']);
});

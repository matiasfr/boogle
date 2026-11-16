import test from 'node:test';
import assert from 'node:assert/strict';
import { createTownReader } from '../src/entities/town/town-read.ts';
import { railRoom } from './helpers/rail-room.ts';
import { createRailway } from './helpers/rail.ts';

test('unchanged frame reads reuse the plot projection instead of allocating another staking array', () => {
  const room = railRoom({ w: createRailway(), t: 0 });
  const client = room.join('reviewer', 'reviewer', 0);
  room.ready();
  const reader = createTownReader(() => client.adapter.read);
  const first = reader.look()!.plots;
  const next = reader.look()!.plots;
  assert.deepEqual(next, first);
  assert.strictEqual(next.staked, first.staked, 'unchanged plot reads must reuse the staking array');
});

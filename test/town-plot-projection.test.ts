import test from 'node:test';
import assert from 'node:assert/strict';
import { createTownReader } from '../src/entities/town/town-read.ts';
import { Town } from '../src/sim/railway-components.ts';
import { townId } from '../src/sim/railway-queries-trade.ts';
import { railRoom } from './helpers/rail-room.ts';
import { createRailway } from './helpers/rail.ts';

test('plot caching survives unrelated ticks and refreshes each delivery input without mutating older reads', () => {
  const seeded = (wood: number, stone: number) => {
    const w = createRailway();
    Object.assign(w.mut(Town, townId(w, 0))!, { wood, stone });
    const room = railRoom({ w, t: 0 });
    const client = room.join('reviewer', 'reviewer', 0);
    room.ready();
    return { room, read: client.adapter.read };
  };
  let current = seeded(0, 0);
  const reader = createTownReader(() => current.read);
  const first = reader.look()!.plots;
  current.room.run(10);
  assert.strictEqual(reader.look()!.plots, first, 'new ticks without freight reuse the projection');
  current = seeded(0, 0);
  assert.strictEqual(reader.look()!.plots, first, 'another world with the same freight reuses the projection');

  current = seeded(8, 0);
  const timber = reader.look()!.plots;
  assert.deepEqual(timber, { wood: 8, stone: 0, staked: [0] });
  assert.notStrictEqual(timber, first);
  assert.strictEqual(reader.look()!.plots, timber);

  current = seeded(8, 1);
  const stone = reader.look()!.plots;
  assert.deepEqual(stone, { wood: 8, stone: 1, staked: [0] });
  assert.notStrictEqual(stone, timber);
  assert.strictEqual(reader.look()!.plots, stone);
  assert.deepEqual(first, { wood: 0, stone: 0, staked: [] });
  assert.deepEqual(timber, { wood: 8, stone: 0, staked: [0] });
});

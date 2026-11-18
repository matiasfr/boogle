import test from 'node:test';
import assert from 'node:assert/strict';
import { unmetPages, wallSeconds } from '../dev/look/wall.ts';

test('the wall defaults and rejects nonsense', () => {
  assert.equal(wallSeconds(null), 1200);
  assert.equal(wallSeconds(900), 900);
  for (const bad of [0, -1, NaN, Infinity]) assert.throws(() => wallSeconds(bad));
});

test('unmetPages names false, hung and closed pages but not a ready page', async ({ mock }) => {
  mock.timers.enable({ apis: ['setTimeout'] });
  const unmet = unmetPages(
    [
      { label: 'player 1', met: async () => true },
      { label: 'player 2', met: async () => false },
      { label: 'player 3', met: () => new Promise(() => {}) },
      { label: 'player 4', met: () => Promise.reject(new Error('Target closed')) },
    ],
    20,
  );
  await new Promise<void>((resolve) => setImmediate(resolve));
  mock.timers.tick(20);
  assert.deepEqual(await unmet, ['player 2', 'player 3', 'player 4']);
});

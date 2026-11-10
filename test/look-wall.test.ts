import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_WALL, raceTimeout, unmetPages, wallSeconds } from '../dev/look/wall.ts';

test('the wall defaults and rejects nonsense', () => {
  assert.equal(wallSeconds(null), DEFAULT_WALL);
  assert.equal(wallSeconds(900), 900);
  for (const bad of [0, -1, NaN, Infinity]) assert.throws(() => wallSeconds(bad));
});

test('a hung read does not hang the handler', async () => {
  const never = new Promise<boolean>(() => {});
  assert.equal(await raceTimeout(never, 20), undefined);
  assert.equal(await raceTimeout(Promise.reject(new Error('closed')), 20), undefined);
  assert.equal(await raceTimeout(Promise.resolve(7), 20), 7);
});

test('unmetPages names the pages that never met --until', async () => {
  const unmet = await unmetPages(
    [
      { label: 'player 1', met: async () => true },
      { label: 'player 2', met: async () => false },
      { label: 'player 3', met: () => new Promise(() => {}) },
      { label: 'player 4', met: () => Promise.reject(new Error('Target closed')) },
    ],
    20,
  );
  assert.deepEqual(unmet, ['player 2', 'player 3', 'player 4']);
});

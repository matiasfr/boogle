import { test } from 'node:test';
import assert from 'node:assert/strict';
import { worldClockDeficit } from '../dev/look/clock-progress.ts';

test('world progress follows achieved server time, not the requested wall-time multiplier or page age', () => {
  const first = { server: { game: 100 }, pages: [{ game: 3, tick: 800 }] };
  const last = { server: { game: 110 }, pages: [{ game: 12, tick: 900 }] };
  assert.equal(worldClockDeficit(first, last, 0, 100), 0);
  assert.equal(worldClockDeficit(first, { ...last, pages: [{ game: 13, tick: 880 }] }, 0, 100), 2);
});

test('unwarped runs use page elapsed time and navigation starts a new baseline', () => {
  const first = { server: null, pages: [{ game: 3, tick: 800 }] };
  const last = { server: null, pages: [{ game: 13, tick: 900 }] };
  assert.equal(worldClockDeficit(first, last, 0, 100), 0);
  assert.equal(worldClockDeficit(last, { server: null, pages: [{ game: 23, tick: 900 }] }, 0, 100), 10);
});

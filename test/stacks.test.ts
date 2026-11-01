// Haul stacks (src/sim/stacks.ts): one material at a time, the hard cap, the spill rule past the soft cap, and a
// serialize/load round-trip with the same hash.
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createStacks,
  addTo,
  takeFrom,
  countOf,
  kindOf,
  roomFor,
  spillOf,
  serializeStacks,
  loadStacks,
  hashStacks,
  SOFT_CAP,
  HARD_CAP,
  HARD_MAX,
  SPILL,
} from '../src/sim/stacks.ts';

test('one material at a time, up to the hard cap', () => {
  const s = createStacks();
  assert.equal(addTo(s, 2, 0, 5), 5);
  assert.equal(kindOf(s, 2), 0);
  assert.equal(roomFor(s, 2, 1), 0, 'ore onto logs');
  assert.equal(addTo(s, 2, 1, 3), 0);
  assert.equal(addTo(s, 2, 0, 500), HARD_CAP - 5);
  assert.equal(countOf(s, 2), HARD_CAP);
  assert.equal(countOf(s, 0), 0);
  assert.equal(kindOf(s, 0), -1);
});

test('taking empties the stack and frees its kind', () => {
  const s = createStacks();
  addTo(s, 0, 0, 4);
  assert.equal(takeFrom(s, 0, 10), 4);
  assert.equal(kindOf(s, 0), -1);
  assert.equal(addTo(s, 0, 1, 2), 2);
});

test('a jump spills only above the soft cap, at most SPILL', () => {
  assert.equal(spillOf(SOFT_CAP), 0);
  assert.equal(spillOf(SOFT_CAP + 1), 1);
  assert.equal(spillOf(SOFT_CAP + 10), SPILL);
});

test('serialize/load round-trips with the same hash; bad rows throw', () => {
  const s = createStacks();
  addTo(s, 0, 0, 4);
  addTo(s, 3, 2, 9);
  const t = createStacks();
  loadStacks(t, JSON.parse(JSON.stringify(serializeStacks(s))), 4);
  assert.equal(hashStacks(t), hashStacks(s));
  assert.equal(countOf(t, 3), 9);
  assert.throws(() => loadStacks(t, [[3, 2, 9]], 3), /bad row/, 'a player past the roster');
  assert.throws(() => loadStacks(t, [[0, 0, HARD_MAX + 1]], 4), /bad row/);
  assert.throws(
    () =>
      loadStacks(
        t,
        [
          [0, 0, 1],
          [0, 0, 2],
        ],
        4,
      ),
    /duplicate/,
  );
});

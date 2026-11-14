import test from 'node:test';
import assert from 'node:assert/strict';
import { coverHeld, coverLifted, coverReleased, holdCover } from '../src/boot/cover-hold.ts';
import { returnKey, returnSettle, storedReturn } from '../src/place/return-settle.ts';
import { RETURN_MINUTES_KEY } from '../src/place/return-tuning.ts';

const storage = (values: Record<string, string>) => ({ getItem: (key: string) => values[key] ?? null });
const key = returnKey('rail-room', 'pid');
const spot = { x: 10, y: 12, z: 20, yaw: 1, at: 1_000_000 };

test('a stored return is read only inside the window, and a bad or blocked store reads as none', () => {
  const fresh = storage({ [key]: JSON.stringify(spot) });
  assert.deepEqual(storedReturn(fresh, key, spot.at + 29 * 60000), { spot, had: true });
  assert.deepEqual(storedReturn(fresh, key, spot.at + 31 * 60000), { spot: null, had: true });
  const off = storage({ [key]: JSON.stringify(spot), [RETURN_MINUTES_KEY]: '0' });
  assert.deepEqual(storedReturn(off, key, spot.at + 1000), { spot: null, had: true });
  assert.deepEqual(storedReturn(storage({}), key, spot.at), { spot: null, had: false });
  assert.deepEqual(storedReturn(storage({ [key]: '{not json' }), key, spot.at), { spot: null, had: false });
  const blocked = {
    getItem() {
      throw new Error('blocked');
    },
  };
  assert.deepEqual(storedReturn(blocked, key, spot.at), { spot: null, had: false });
});

test('a pending return is asked once, ends when the arrival says so and never outlasts its limit', () => {
  let asked = 0;
  returnSettle.source(() => {
    asked++;
    return true;
  });
  assert.equal(returnSettle.pending(1000), true);
  assert.equal(returnSettle.pending(20999), true);
  assert.equal(asked, 1);
  assert.equal(returnSettle.pending(21001), false, 'the limit ends it');
  assert.equal(returnSettle.pending(1000), false, 'and it stays ended');
  returnSettle.done();
  assert.equal(returnSettle.pending(1000), false);
});

test('the loading cover waits for its holds, up to the limit, then counts as lifted', async () => {
  let pending = true;
  const release = holdCover(() => pending);
  assert.equal(coverHeld(), true);
  assert.equal(coverLifted(), false);
  const started = performance.now();
  setTimeout(() => (pending = false), 120);
  await coverReleased(5000);
  const took = performance.now() - started;
  assert.ok(took >= 100 && took < 2000, `released when the hold ended (${took} ms)`);
  assert.equal(coverLifted(), true);
  pending = true;
  const again = performance.now();
  await coverReleased(150);
  assert.ok(performance.now() - again < 1500, 'a hold that never ends is cut off at the limit');
  release();
  assert.equal(coverHeld(), false);
});

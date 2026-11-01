// The wagon's steam (src/sim/wagon-steam.ts): logs burn down, steam maps to speed between walking and fast, the clock
// only ever moves forward by whole integers, the rate never jumps, and serialize/load round-trips.
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createSteam,
  stoke,
  stokeRoom,
  steamTick,
  speedOf,
  rateFor,
  serializeSteam,
  loadSteam,
  hashSteam,
  STEAM_PER_LOG,
  STEAM_MAX,
  STEAM_FULL,
  STOKE_MAX,
  WALK,
  FAST,
  RATE_ONE,
  RATE_STEP,
} from '../src/sim/wagon-steam.ts';

test('steam maps to speed: walking cold, fast at full, monotonic between', () => {
  assert.equal(speedOf(0), WALK);
  assert.equal(speedOf(STEAM_FULL), FAST);
  assert.equal(speedOf(STEAM_MAX), FAST);
  for (let s = 1; s <= STEAM_MAX; s++) assert.ok(speedOf(s) >= speedOf(s - 1));
  assert.equal(rateFor(0, 65), Math.floor((WALK * RATE_ONE) / 65));
  assert.equal(rateFor(STEAM_MAX, 65), RATE_ONE);
  assert.equal(rateFor(STEAM_MAX, 30), RATE_ONE); // a slower timetable is never sped past its own pace
});

test('the firebox takes logs up to its size and STOKE_MAX a stoke', () => {
  const s = createSteam();
  assert.equal(stokeRoom(s, 0), 0);
  assert.equal(stokeRoom(s, 1.5), 0);
  assert.equal(stokeRoom(s, 100), STOKE_MAX);
  stoke(s, 3);
  assert.equal(s.steam, 3 * STEAM_PER_LOG);
  assert.equal(s.fed, 3);
  stoke(s, stokeRoom(s, 100));
  assert.equal(s.steam, STEAM_MAX);
  assert.equal(stokeRoom(s, 5), 0);
  s.steam -= 1; // part burnt: room for one more, which tops it up to the brim
  assert.equal(stokeRoom(s, 5), 1);
  stoke(s, 1);
  assert.equal(s.steam, STEAM_MAX);
});

test('it burns down to cold, the rate eases, the clock never runs backwards and is real time standing', () => {
  const s = createSteam();
  stoke(s, 2);
  let lastTau = s.tau,
    lastRate = s.rate;
  for (let t = 0; t < 600; t++) {
    const standing = t % 100 < 20;
    steamTick(s, 65, standing);
    assert.ok(Number.isSafeInteger(s.tau) && s.tau > lastTau);
    assert.ok(Math.abs(s.rate - lastRate) <= RATE_STEP);
    if (standing) assert.equal(s.tau - lastTau, RATE_ONE);
    else assert.equal(s.tau - lastTau, s.rate);
    lastTau = s.tau;
    lastRate = s.rate;
  }
  assert.equal(s.steam, 0);
  assert.equal(s.rate, rateFor(0, 65)); // settled at walking pace
});

test('same inputs, same hash; serialize/load round-trips; bad snapshots throw', () => {
  const run = () => {
    const s = createSteam();
    for (let t = 0; t < 400; t++) {
      if (t % 70 === 0) stoke(s, stokeRoom(s, 1 + (t % 4)));
      steamTick(s, 65, t % 50 < 10);
    }
    return s;
  };
  const a = run(),
    b = run();
  assert.equal(hashSteam(a), hashSteam(b));
  const c = createSteam();
  loadSteam(c, JSON.parse(JSON.stringify(serializeSteam(a))));
  assert.equal(hashSteam(c), hashSteam(a));
  const big = createSteam();
  big.tau = 2 ** 40 + 7;
  const d = createSteam();
  loadSteam(d, serializeSteam(big));
  assert.equal(d.tau, big.tau);
  for (const bad of [
    null,
    {},
    [1, 2, 3],
    [-1, 0, 0, 0],
    [0, RATE_ONE + 1, 0, 0],
    [0, 0, 0.5, 0],
    [STEAM_MAX + 1, 0, 0, 0],
  ])
    assert.throws(() => loadSteam(createSteam(), bad));
});

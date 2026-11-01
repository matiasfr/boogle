import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  LEVELS,
  RULES,
  TASTE_PTS,
  createFriend,
  levelOf,
  addPts,
  pet,
  giveGift,
  kickedOff,
  isWary,
  rideLimit,
  addNosy,
  isQuiet,
  apologize,
  serializeFriend,
  loadFriend,
} from '../src/boogler/friendship.ts';
import { giftIndex } from '../src/sim/gift-catalog.ts';

const MIN = 60000;

test('levels follow the thresholds and report going up', () => {
  const f = createFriend();
  assert.equal(levelOf(0), 0);
  assert.equal(levelOf(LEVELS[2].at), 2);
  assert.equal(levelOf(1e9), LEVELS.length - 1);
  assert.equal(addPts(f, LEVELS[1].at - 1), 0);
  assert.equal(addPts(f, 1), 1);
  assert.equal(addPts(f, -1e6), 0);
  assert.equal(f.pts, 0);
});

test('petting scores with a gap and a cap per window', () => {
  const f = createFriend();
  let t = 1e6;
  assert.equal(pet(f, t).kind, 'happy');
  assert.equal(pet(f, t + 100).kind, 'again');
  for (let k = 1; k < RULES.petMax; k++) assert.equal(pet(f, (t += RULES.petGap)).kind, 'happy');
  assert.equal(pet(f, (t += RULES.petGap)).kind, 'again');
  assert.equal(f.pts, RULES.petMax * RULES.petPts);
  assert.equal(pet(f, t + RULES.petWindow).kind, 'happy');
});

test('gifts score by taste, halve on repeats and stop at the window cap', () => {
  const f = createFriend();
  const t = 1e6;
  const seeds = giftIndex('seeds'),
    can = giftIndex('can'),
    frisbee = giftIndex('frisbee');
  assert.equal(giveGift(f, seeds, t).pts, TASTE_PTS.like);
  assert.equal(giveGift(f, seeds, t).pts, Math.round(TASTE_PTS.like / 2));
  assert.equal(giveGift(f, can, t).pts, TASTE_PTS.meh);
  assert.equal(giveGift(f, frisbee, t).pts, TASTE_PTS.like);
  const capped = giveGift(f, frisbee, t);
  assert.equal(capped.capped, true);
  assert.equal(capped.pts, 0);
  assert.equal(giveGift(f, frisbee, t + RULES.giftWindow).capped, false);
  assert.equal(giveGift(f, 9999, t), null);
});

test('a stored gift in the old index format is dropped on load', () => {
  const old = JSON.stringify({
    pts: 10,
    gifts: [
      { kind: 3, at: 5 },
      { id: 'nonsense', at: 5 },
      { id: 'can', at: 7 },
    ],
  });
  assert.deepEqual(loadFriend(old).gifts, [{ id: 'can', at: 7 }]);
});

test('enough kick-offs make him wary; time and gifts forgive', () => {
  const f = createFriend();
  addPts(f, LEVELS[3].at);
  let t = 1e6;
  for (let k = 1; k < RULES.waryAt; k++) assert.equal(kickedOff(f, (t += 1000)).wary, false);
  const last = kickedOff(f, (t += 1000));
  assert.equal(last.wary, true);
  assert.equal(last.nowWary, true);
  assert.equal(isWary(f, t), true);
  assert.equal(rideLimit(f, t), RULES.rideWary);
  assert.equal(isWary(f, t + RULES.kickDecay), false, 'one kick-off wears off');

  kickedOff(f, (t += RULES.kickDecay));
  assert.equal(isWary(f, t), true);
  const r = giveGift(f, giftIndex('seeds'), t);
  assert.equal(r.forgave, true);
  assert.equal(isWary(f, t), false);
});

test('ride patience grows with friendship', () => {
  const f = createFriend();
  const lo = rideLimit(f, 0);
  addPts(f, LEVELS[4].at);
  assert.ok(rideLimit(f, 0) > lo);
});

test('too much nosiness makes him go quiet and costs points', () => {
  const f = createFriend();
  addPts(f, 50);
  const t = 1e6;
  assert.equal(addNosy(f, RULES.nosyLimit - 1, t), false);
  assert.equal(addNosy(f, 1, t), true);
  assert.equal(isQuiet(f, t + 1000), true);
  assert.equal(isQuiet(f, t + RULES.quietMs), false);
  assert.equal(f.pts, 50 + RULES.nosyPts);
  assert.equal(addNosy(f, RULES.nosyLimit - 1, t + 10 * MIN), false, 'nosiness wears off');
});

test('apologies count once per gap and only with something to forgive', () => {
  const f = createFriend();
  assert.equal(apologize(f, 1e6), false);
  kickedOff(f, 1e6);
  kickedOff(f, 1e6);
  assert.equal(apologize(f, 1e6 + 1), true);
  assert.equal(apologize(f, 1e6 + 2), false);
  assert.equal(f.kicks, 1);
});

test('friendship round-trips through storage and ignores junk', () => {
  const f = createFriend();
  addPts(f, 77);
  f.learned.push('home0');
  f.flags.slogan = 'Rice to meet you.';
  giveGift(f, giftIndex('seeds'), 5);
  const g = loadFriend(serializeFriend(f));
  assert.deepEqual(g, f);
  assert.deepEqual(g.gifts, [{ id: 'seeds', at: 5 }], 'the window stores catalog ids');
  for (const junk of ['', '{', 'null', '[1]', '{"pts":"lots","learned":[1,"x"],"gifts":[{"kind":-1,"at":0}]}']) {
    const h = loadFriend(junk);
    assert.ok(Number.isFinite(h.pts) && h.pts >= 0);
    assert.ok(h.learned.every((s) => typeof s === 'string'));
    assert.equal(h.gifts.length, 0);
  }
});

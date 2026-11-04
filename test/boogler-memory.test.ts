import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  RULES,
  createMemory,
  giveGift,
  kickedOff,
  isWary,
  rideLimit,
  apologize,
  serializeMemory,
  loadMemory,
} from '../src/boogler/memory.ts';
import { giftIndex } from '../src/sim/gift-catalog.ts';
import { PARKED_COPY } from './fixtures/boogler-parked-copy.ts';

test('present reactions remember repeats and the existing window cap', () => {
  const f = createMemory();
  const t = 1e6;
  const seeds = giftIndex('seeds');
  assert.deepEqual(giveGift(f, seeds, t), { taste: 'like', repeat: false, capped: false, forgave: false });
  assert.equal(giveGift(f, seeds, t)!.repeat, true);
  for (let k = 2; k < RULES.giftMax; k++) assert.equal(giveGift(f, seeds, t)!.capped, false);
  assert.equal(giveGift(f, seeds, t)!.capped, true);
  assert.deepEqual(giveGift(f, seeds, t + RULES.giftWindow), {
    taste: 'like',
    repeat: false,
    capped: false,
    forgave: false,
  });
  assert.equal(giveGift(f, 9999, t), null);
});

test('a stored gift in the old index format is dropped on load', () => {
  const old = JSON.stringify({
    pts: 10,
    gifts: [
      { kind: 3, at: 5 },
      { id: 'nonsense', at: 5 },
      { id: 'frisbee', at: 7 },
    ],
  });
  assert.deepEqual(loadMemory(old).gifts, [{ id: 'frisbee', at: 7 }]);
});

test('enough kick-offs make him wary; time and gifts forgive', () => {
  const f = createMemory();
  let t = 1e6;
  assert.equal(rideLimit(f, t), 3.5);
  for (let k = 1; k < RULES.waryAt; k++) assert.equal(kickedOff(f, (t += 1000)).wary, false);
  const last = kickedOff(f, (t += 1000));
  assert.equal(last.wary, true);
  assert.equal(last.nowWary, true);
  assert.equal(isWary(f, t), true);
  assert.equal(rideLimit(f, t), 1.5);
  assert.equal(isWary(f, t + RULES.kickDecay), false, 'one kick-off wears off');
  kickedOff(f, (t += RULES.kickDecay));
  assert.equal(isWary(f, t), true);
  assert.equal(giveGift(f, giftIndex('seeds'), t)!.forgave, true);
  assert.equal(isWary(f, t), false);
  assert.equal(rideLimit(f, t), 3.5);
});

test('apologies count once per gap and only with something to forgive', () => {
  const f = createMemory();
  assert.equal(apologize(f, 1e6), false);
  kickedOff(f, 1e6);
  kickedOff(f, 1e6);
  assert.equal(apologize(f, 1e6 + 1), true);
  assert.equal(apologize(f, 1e6 + 2), false);
  assert.equal(f.kicks, 1);
});

test('memories round-trip through storage and ignore junk', () => {
  const f = createMemory();
  f.met = true;
  f.learned.push('home0');
  f.flags.slogan = 'Rice to meet you.';
  giveGift(f, giftIndex('seeds'), 5);
  assert.deepEqual(loadMemory(serializeMemory(f)), f);
  for (const junk of ['', '{', 'null', '[1]', '{"pts":"lots","learned":[1,"x"],"gifts":[{"kind":-1,"at":0}]}']) {
    const h = loadMemory(junk);
    assert.ok(Number.isFinite(h.kicks) && h.kicks >= 0);
    assert.ok(h.learned.every((s) => typeof s === 'string'));
    assert.equal(h.gifts.length, 0);
  }
});

test('old saves keep stories, bookmarks and grudges while dropping obsolete fields', () => {
  const old = {
    pts: 190,
    learned: ['home0', 'mom0'],
    flags: { 'at.home': 'home1.b', slogan: 'Rice to meet you.', kicked: 5 },
    kicks: 3,
    kickAt: 1e6,
    sorryAt: 20,
    nosy: 4,
    nosyAt: 99,
    quietUntil: 1e9,
    pets: [30],
    chatAt: 40,
  };
  const f = loadMemory(JSON.stringify(old));
  assert.deepEqual(f, {
    met: true,
    learned: old.learned,
    flags: old.flags,
    kicks: 3,
    kickAt: 1e6,
    sorryAt: 20,
    gifts: [],
  });
  assert.equal(rideLimit(f, 1e6), 1.5);
  assert.equal(loadMemory('{"pts":1}').met, true);
  assert.equal(loadMemory('{"learned":["home0"]}').met, true);
  assert.equal(loadMemory('{"pts":0}').met, false);
  assert.deepEqual(loadMemory(serializeMemory(f)), f);
});

test('parked copy stays available for the narrative pass outside the player bundle', () => {
  assert.equal(PARKED_COPY.LEVEL_UP.length, 6);
  assert.equal(Object.keys(PARKED_COPY.DEFLECT).length, 3);
  assert.equal(PARKED_COPY.HOME0_D.opts.length, 2);
  assert.ok(PARKED_COPY.TOO_NOSY && PARKED_COPY.QUIET.length && PARKED_COPY.PUSHED.length);
});

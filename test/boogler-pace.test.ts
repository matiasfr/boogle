// The pace of the friendship, as a model of play: a 15-minute visit once a day (a pet every 2.5 min, a talk at 0, 5 and
// 10 min), always taking a story chapter that is unlocked, else small talk, and always answering with the first answer.
// RULES.petPts and RULES.chapterPts (src/boogler/friendship.js) are tuned against it: Best friend in about five visits
// with no presents, and presents (a seed, the frisbee) never slow it down.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { THREADS } from '../src/boogler/lines.js';
import { openTalk, talkView, pickTalk, threadState } from '../src/boogler/talk.js';
import { LEVELS, createFriend, giveGift, levelOf, pet } from '../src/boogler/friendship.js';
import { mulberry32 } from '../src/sim/rng.ts';
import { giftIndex } from '../src/sim/gift-catalog.ts';

const MIN = 60000;
const DAY = 24 * 60 * MIN;
const ORDER = ['home', 'mom', 'biz'] as const;

function talk(f: ReturnType<typeof createFriend>, now: number, rng: () => number) {
  const t = openTalk(f, { now, name: 'Ideen', rng, gifts: () => [], give: () => false });
  let choice = 0; // small talk
  const opts = talkView(t)?.opts ?? [];
  for (const id of ORDER) {
    const s = threadState(f, id);
    if (!s.next || s.next.lvl > levelOf(f.pts)) continue;
    const at = opts.indexOf(THREADS[id].ask[s.started ? 1 : 0]);
    if (at >= 0) {
      choice = at;
      break;
    }
  }
  pickTalk(t, choice);
  for (let steps = 0; talkView(t) && steps < 30; steps++) pickTalk(t, 0);
}

// Visits until Best friend (0 if never within `max`).
function visitsToBest(presents: boolean, max = 12) {
  const f = createFriend();
  const rng = mulberry32(7);
  const best = LEVELS.length - 1;
  for (let visit = 1; visit <= max; visit++) {
    const day = visit * DAY;
    for (let m = 0; m <= 15 * MIN; m += MIN / 2) {
      if (m % (2.5 * MIN) === 0 && m < 15 * MIN) pet(f, day + m);
      if (m === 0 || m === 5 * MIN || m === 10 * MIN) talk(f, day + m, rng);
      if (presents && m === 3 * MIN) giveGift(f, giftIndex('seeds'), day + m);
      if (presents && m === 8 * MIN) giveGift(f, giftIndex('frisbee'), day + m);
    }
    if (levelOf(f.pts) >= best) return visit;
  }
  return 0;
}

test('with no presents Best friend comes in four or five visits', () => {
  const v = visitsToBest(false);
  assert.ok(v === 4 || v === 5, `took ${v} visits`);
});

test('presents never slow it down', () => {
  assert.ok(visitsToBest(true) <= visitsToBest(false));
  assert.ok(visitsToBest(true) > 0);
});

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { THREADS, SMALL_TALK } from '../src/boogler/lines.js';
import { openTalk, talkView, pickTalk, threadState } from '../src/boogler/talk.js';
import { LEVELS, RULES, createFriend, addPts, levelOf, kickedOff, isWary } from '../src/boogler/friendship.js';
import { mulberry32 } from '../src/sim/rng.js';
import { giftIndex } from '../src/sim/gift-catalog.js';

const trees = [...Object.values(THREADS).flatMap((th) => th.chapters), ...SMALL_TALK];

function ctx(over = {}) {
  const pocket = over.pocket ?? [];
  return {
    now: 1e6,
    name: 'Ideen',
    rng: mulberry32(7),
    gifts: () => pocket.map((kind) => ({ kind, label: `gift ${kind}` })),
    give: (kind) => {
      const k = pocket.indexOf(kind);
      if (k < 0) return false;
      pocket.splice(k, 1);
      return true;
    },
    ...over,
  };
}
const optIndex = (t, text) => talkView(t).opts.findIndex((o) => o.includes(text));

test('every message offers at least two answers and every link resolves', () => {
  for (const ch of trees) {
    assert.ok(ch.nodes.a, `${ch.id} starts at a`);
    for (const [id, n] of Object.entries(ch.nodes)) {
      assert.ok(n.say && n.opts.length >= 2, `${ch.id}.${id} has 2+ answers`);
      for (const o of n.opts) {
        for (const to of [o.to, o.else]) if (to) assert.ok(ch.nodes[to], `${ch.id}.${id} -> ${to}`);
        if (o.trust !== undefined) assert.ok(o.else, `${ch.id}.${id} trust needs else`);
      }
    }
  }
});

test('every message in a talk offers at least two answers', () => {
  for (let seed = 0; seed < 40; seed++) {
    const rng = mulberry32(seed);
    const f = createFriend();
    addPts(f, Math.floor(rng() * 400));
    if (seed % 4 === 0) for (let k = 0; k < RULES.waryAt; k++) kickedOff(f, 1e6);
    const t = openTalk(f, ctx({ rng, pocket: [giftIndex('duck'), giftIndex('boot')] }));
    for (let step = 0; step < 30 && talkView(t); step++) {
      const v = talkView(t);
      assert.ok(v.opts.length >= 2, `"${v.say}" has ${v.opts.length} answers`);
      pickTalk(t, Math.floor(rng() * v.opts.length));
    }
  }
});

test('each thread has a chapter for every level it covers, in order', () => {
  for (const [id, th] of Object.entries(THREADS)) {
    const lv = th.chapters.map((c) => c.lvl);
    assert.deepEqual(
      lv,
      [...lv].sort((a, b) => a - b),
      id,
    );
    assert.equal(lv.at(-1), LEVELS.length - 1, `${id} reaches the top level`);
  }
});

test('a stranger cannot ask about his mother yet', () => {
  const t = openTalk(createFriend(), ctx());
  const v = talkView(t);
  assert.ok(v.opts.some((o) => o === THREADS.home.ask[0]));
  assert.ok(!v.opts.some((o) => o === THREADS.mom.ask[0]));
});

test('finishing a chapter teaches it once and returns to the menu', () => {
  const f = createFriend();
  const t = openTalk(f, ctx());
  pickTalk(t, optIndex(t, THREADS.home.ask[0]));
  let steps = 0;
  while (!f.learned.includes('home0') && steps++ < 10) pickTalk(t, 0);
  assert.ok(f.learned.includes('home0'));
  assert.ok(f.pts >= RULES.chapterPts);
  assert.ok(
    talkView(t).opts.some((o) => o === THREADS.home.ask[1]),
    'back at the menu, next chapter offered',
  );
  assert.equal(threadState(f, 'home').next.id, 'home1');
});

test('asking ahead of the friendship gets deflected, and pushing makes him go quiet', () => {
  const f = createFriend();
  f.learned.push('home0');
  const c = ctx();
  const t = openTalk(f, c);
  let quiet = false;
  for (let k = 0; k < 5 && !quiet; k++) {
    pickTalk(t, optIndex(t, THREADS.home.ask[1]));
    const v = talkView(t);
    assert.equal(v.mood === 'worry' || v.mood === 'grump', true);
    const push = optIndex(t, 'tell me');
    if (push < 0) quiet = true;
    else {
      pickTalk(t, push);
      if (!talkView(t).opts.includes('Sorry.')) quiet = true;
      else pickTalk(t, 0);
    }
  }
  assert.equal(quiet, true);
  assert.ok(f.quietUntil > c.now);
  assert.equal(talkView(openTalk(f, ctx())).mood, 'grump');
});

test('he takes what is in your hand and it can forgive a wary Boogler', () => {
  const f = createFriend();
  for (let k = 0; k < RULES.waryAt; k++) kickedOff(f, 1e6);
  const duck = giftIndex('duck');
  const pocket = [duck];
  const t = openTalk(f, ctx({ pocket }));
  assert.equal(talkView(t).mood, 'grump');
  const out = pickTalk(t, optIndex(t, `I brought you a gift ${duck}`));
  assert.deepEqual(out.gave, { kind: duck, taste: 'like' });
  assert.equal(pocket.length, 0);
  assert.equal(isWary(f, 1e6), false);
  assert.match(talkView(t).say, /forgiven/);
});

test('each gift answer carries its item for the icon, every other answer -1', () => {
  // The coconut is catalog index 0, so `o.gift || -1` would hide its icon; `??` must keep it.
  const kinds = [giftIndex('coconut'), giftIndex('duck')];
  assert.equal(kinds[0], 0);
  const check = (t) => {
    const v = talkView(t);
    assert.equal(v.gifts.length, v.opts.length);
    const want = v.opts.map(() => -1);
    for (const k of kinds) {
      const i = v.opts.indexOf(`I brought you a gift ${k}.`);
      assert.ok(i >= 0, `answer for gift ${k}`);
      want[i] = k;
    }
    assert.deepEqual(v.gifts, want);
  };
  check(openTalk(createFriend(), ctx({ pocket: [...kinds] })));
  const wary = createFriend();
  for (let k = 0; k < RULES.waryAt; k++) kickedOff(wary, 1e6);
  const t = openTalk(wary, ctx({ pocket: [...kinds] }));
  assert.equal(talkView(t).mood, 'grump');
  check(t);
});

test('he turns down key items and leaves them in your hand', () => {
  for (const id of ['shovel', 'ball']) {
    const kind = giftIndex(id);
    const pocket = [kind];
    const t = openTalk(createFriend(), ctx({ pocket }));
    const out = pickTalk(t, optIndex(t, `gift ${kind}`));
    assert.equal(out.gave, null);
    assert.deepEqual(pocket, [kind]);
    assert.ok(talkView(t).opts.length >= 2);
  }
});

test('the kick-off talk ends after one exchange', () => {
  const f = createFriend();
  kickedOff(f, 1e6);
  const t = openTalk(f, ctx({ start: 'kick' }));
  assert.equal(talkView(t).say, 'Hey! No free rides!');
  pickTalk(t, 0);
  pickTalk(t, 0);
  assert.equal(talkView(t), null);
});

test('reaching a new level is reported to the caller', () => {
  const f = createFriend();
  addPts(f, LEVELS[1].at - 1);
  const t = openTalk(f, ctx());
  pickTalk(t, optIndex(t, THREADS.home.ask[0]));
  let up = 0;
  for (let k = 0; k < 10 && !up; k++) up = pickTalk(t, 0).levelUp || up;
  assert.equal(up, 1);
  assert.equal(levelOf(f.pts) >= 1, true);
});

test('names are filled in', () => {
  const f = createFriend();
  addPts(f, LEVELS[2].at);
  for (let s = 0; s < 6; s++) {
    const v = talkView(openTalk(f, ctx({ rng: mulberry32(s) })));
    assert.ok(!v.say.includes('{name}'));
  }
});

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  THREADS,
  SMALL_TALK,
  AFTER,
  FAREWELL,
  RESUME,
  MARIO_TALK,
  MARIO_SAYS,
  MARIO_AFTER,
} from '../src/boogler/lines.js';
import { openTalk, talkView, pickTalk, leaveTalk, threadState } from '../src/boogler/talk.js';
import {
  LEVELS,
  RULES,
  createFriend,
  addPts,
  levelOf,
  kickedOff,
  isWary,
  loadFriend,
  serializeFriend,
} from '../src/boogler/friendship.js';
import { mulberry32 } from '../src/sim/rng.ts';
import { giftIndex } from '../src/sim/gift-catalog.ts';

const trees = [...Object.values(THREADS).flatMap((th) => th.chapters), ...SMALL_TALK, ...MARIO_TALK];

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
    const t = openTalk(f, ctx({ rng, pocket: [giftIndex('mango'), giftIndex('coconut')] }));
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

test('finishing a chapter teaches it once and ends the talk with a line over his head', () => {
  const f = createFriend();
  const t = openTalk(f, ctx());
  pickTalk(t, optIndex(t, THREADS.home.ask[0]));
  let out = null;
  for (let steps = 0; talkView(t) && steps < 10; steps++) out = pickTalk(t, 0);
  assert.equal(talkView(t), null);
  assert.ok(f.learned.includes('home0'));
  assert.ok(f.pts >= RULES.chapterPts);
  assert.ok(AFTER.map((s) => s.replace('{name}', 'Ideen')).includes(out.bubble), out.bubble);
  const again = openTalk(f, ctx());
  assert.ok(talkView(again).opts.includes(THREADS.home.ask[1]), 'next time, the next chapter is offered');
  assert.equal(threadState(f, 'home').next.id, 'home1');
});

test('bye is one press, and his farewell is a bubble', () => {
  const f = createFriend();
  const t = openTalk(f, ctx());
  const out = pickTalk(t, talkView(t).opts.length - 1);
  assert.equal(talkView(t), null);
  assert.equal(out.bubble, FAREWELL[0].replace('{name}', 'Ideen'));
});

test('small talk ends the talk', () => {
  const t = openTalk(createFriend(), ctx());
  pickTalk(t, optIndex(t, "How's it going?"));
  let out = null;
  for (let steps = 0; talkView(t) && steps < 10; steps++) out = pickTalk(t, 0);
  assert.equal(talkView(t), null);
  assert.ok(out.bubble);
});

test('walking off mid-chapter bookmarks it, and asking again picks it back up', () => {
  const f = createFriend();
  const t = openTalk(f, ctx());
  pickTalk(t, optIndex(t, THREADS.home.ask[0]));
  pickTalk(t, 0); // home0 a -> b
  const at = talkView(t).say;
  assert.equal(leaveTalk(t), FAREWELL[0].replace('{name}', 'Ideen'));
  assert.equal(f.flags['at.home'], 'home0.b');
  const back = loadFriend(serializeFriend(f)); // and it survives a reload
  const t2 = openTalk(back, ctx());
  pickTalk(t2, optIndex(t2, THREADS.home.ask[0]));
  const say = talkView(t2).say;
  assert.ok(say.endsWith(at), say);
  assert.ok(
    RESUME.some((r) => say.startsWith(r)),
    say,
  );
  assert.equal(back.flags['at.home'], undefined);
  // Leaving on the first line, or a bookmark for a chapter already learned, starts afresh.
  const t3 = openTalk(back, ctx());
  pickTalk(t3, optIndex(t3, THREADS.home.ask[0]));
  leaveTalk(t3);
  assert.equal(back.flags['at.home'], undefined);
  back.flags['at.home'] = 'home9.zz';
  const t4 = openTalk(back, ctx());
  pickTalk(t4, optIndex(t4, THREADS.home.ask[0]));
  assert.equal(talkView(t4).say, THREADS.home.chapters[0].nodes.a.say);
});

test('a cross Boogler says no goodbye when you walk off', () => {
  const f = createFriend();
  for (let k = 0; k < RULES.waryAt; k++) kickedOff(f, 1e6);
  assert.equal(leaveTalk(openTalk(f, ctx())), null);
  assert.equal(leaveTalk(openTalk(f, ctx({ start: 'kick' }))), null);
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
  const mango = giftIndex('mango');
  const pocket = [mango];
  const t = openTalk(f, ctx({ pocket }));
  assert.equal(talkView(t).mood, 'grump');
  const out = pickTalk(t, optIndex(t, `I brought you a gift ${mango}`));
  assert.deepEqual(out.gave, { kind: mango, taste: 'like' });
  assert.equal(pocket.length, 0);
  assert.equal(isWary(f, 1e6), false);
  assert.match(talkView(t).say, /forgiven/);
});

test('each gift answer carries its item for the icon, every other answer -1', () => {
  // The coconut is catalog index 0, so `o.gift || -1` would hide its icon; `??` must keep it.
  const kinds = [giftIndex('coconut'), giftIndex('mango')];
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

test('a finished thread retells one of its chapters, a different one each time, then a retell line', () => {
  const f = createFriend();
  addPts(f, LEVELS.at(-1).at);
  f.learned = THREADS.home.chapters.map((c) => c.id);
  const firsts = THREADS.home.chapters.map((c) => c.nodes.a.say);
  let last = null;
  for (let k = 0; k < 6; k++) {
    const t = openTalk(f, ctx({ now: 1e6 + k, rng: mulberry32(k) }));
    pickTalk(t, optIndex(t, THREADS.home.ask[2]));
    const say = talkView(t).say;
    assert.ok(firsts.includes(say), say);
    assert.notEqual(say, last);
    last = say;
    for (let step = 0; step < 20 && !THREADS.home.retell.includes(talkView(t).say); step++) pickTalk(t, 0);
    assert.ok(THREADS.home.retell.includes(talkView(t).say));
  }
});

test('as Mario he is starstruck even when wary, and every answer is something Mario says', () => {
  for (let seed = 0; seed < 20; seed++) {
    const rng = mulberry32(seed);
    const f = createFriend();
    for (let k = 0; k < RULES.waryAt; k++) kickedOff(f, 1e6);
    const pts = f.pts;
    const t = openTalk(f, ctx({ rng, mario: true, pocket: [giftIndex('mango')] }));
    for (let step = 0; step < 10 && talkView(t); step++) {
      const v = talkView(t);
      for (const o of v.opts) assert.ok(MARIO_SAYS.includes(o), `Mario would not say "${o}"`);
      const out = pickTalk(t, Math.floor(rng() * v.opts.length));
      if (!talkView(t)) assert.ok(MARIO_AFTER.includes(out.bubble), out.bubble);
    }
    assert.equal(talkView(t), null);
    if (!f.gifts?.length) assert.equal(f.pts, pts, 'chatting as Mario does not score');
  }
});

test('as Mario he does not open with the same conversation twice in a row', () => {
  const f = createFriend();
  let last = null;
  for (let seed = 0; seed < 20; seed++) {
    const say = talkView(openTalk(f, ctx({ rng: mulberry32(seed), mario: true }))).say;
    assert.notEqual(say, last);
    last = say;
  }
});

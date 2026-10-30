// Conversations with The Boogler: a menu of topics, story chapters unlocked by friendship level, small talk, gifts,
// and what he says after kicking you off. Pure: the caller passes the friendship, a context and an rng.
//
//   const t = openTalk(f, ctx)      ctx = { now, name, rng, gifts(), give(kind), start?: 'menu' | 'kick' }
//   talkView(t)                     -> { say, mood, opts: [string], gifts: [catalog index | -1] } or null once the
//                                      talk is over; gifts[i] is what answer i hands over
//   pickTalk(t, i)                  answer with option i; returns { levelUp, gave, bubble } for the caller to
//                                   celebrate; bubble is what he says over his head as the talk ends (or null)
//   leaveTalk(t)                    you walked off or closed it: bookmarks a story chapter you left halfway (resumed
//                                   next time you ask) and returns his goodbye for a bubble, or null
//
// A talk is short: a finished chapter, small talk or present ends it with a bubble line; E opens the menu again.
//
// gifts() lists what the player can hand over: [{ kind, label }] (what is in their hand). give(kind) takes it from them
// (false if it's gone). He turns down key items (catalog `key`) without calling give.
import {
  THREADS,
  SMALL_TALK,
  GREETINGS,
  AFTER,
  BYE,
  FAREWELL,
  DEFLECT_OPTS,
  PUSHED,
  PUSHED_OPTS,
  RETELL_OPTS,
  TOO_NOSY,
  QUIET,
  QUIET_OPTS,
  KICK,
  KICK_MORE,
  KICK_OPTS,
  KICK_DONE,
  WARY,
  SORRY,
  SORRY_YES,
  SORRY_NO,
  SORRY_OPTS,
  GIFT_ASK,
  GIFT_KEPT_OPTS,
  GIFT_FORGAVE,
  GIFT_CAPPED,
  GIFT_REPEAT,
  GIFT_OPTS,
  RESUME,
} from './lines.js';
import {
  addPts,
  addNosy,
  apologize,
  chatScores,
  giveGift,
  isQuiet,
  isWary,
  levelOf,
  settle,
  RULES,
} from './friendship.js';
import { GIFTS } from '../sim/gift-catalog.js';

const THREAD_ORDER = ['home', 'mom', 'biz'];
const node = (say, opts, mood = 'smile') => ({ say, mood, opts });
const opt = (say, go, fx = {}) => ({ say, go, ...fx });
const bookmarkKey = (id) => `at.${id}`; // flag: '<chapter>.<node>' where you left that thread's chapter

export function openTalk(f, ctx) {
  settle(f, ctx.now);
  // cold: he is cross (a kick-off, wary, quiet), so walking off gets no goodbye.
  const t = { f, ctx, node: null, cold: true, out: { levelUp: 0, gave: null, bubble: null } };
  const start = ctx.start ?? 'menu';
  if (start === 'kick') t.node = kickNode(t);
  else if (isQuiet(f, ctx.now)) t.node = quietNode(t);
  else if (isWary(f, ctx.now)) t.node = waryNode(t);
  else {
    t.cold = false;
    t.node = menuNode(t, pick(t, GREETINGS[levelOf(f.pts)]));
  }
  return t;
}

export function leaveTalk(t) {
  const at = t.node?.at;
  if (at && at.node !== 'a') t.f.flags[bookmarkKey(at.thread)] = `${at.chapter}.${at.node}`;
  t.node = null;
  return t.cold ? null : farewell(t);
}

export function talkView(t) {
  if (!t.node) return null;
  const { say, mood, opts } = t.node;
  return { say: fill(t, say), mood, opts: opts.map((o) => fill(t, o.say)), gifts: opts.map((o) => o.gift ?? -1) };
}

export function pickTalk(t, i) {
  t.out = { levelUp: 0, gave: null, bubble: null };
  const o = t.node?.opts[i];
  if (!o) return t.out;
  const { f, ctx } = t;
  if (o.pts) gain(t, o.pts);
  if (o.set) Object.assign(f.flags, o.set);
  if (o.nosy && addNosy(f, o.nosy, ctx.now)) {
    t.node = tooNosy(t);
    return t.out;
  }
  t.node = o.go ? o.go() : null;
  return t.out;
}

function gain(t, n) {
  const up = addPts(t.f, n);
  if (up) t.out.levelUp = up;
}

const pick = (t, list) => list[Math.floor(t.ctx.rng() * list.length) % list.length];
const end = () => null;
const tooNosy = (t) => {
  t.cold = true;
  return node(
    TOO_NOSY,
    QUIET_OPTS.map((s) => opt(s, end)),
    'grump',
  );
};
const farewell = (t) => fill(t, FAREWELL[levelOf(t.f.pts)]);
// Ends the talk with a line over his head.
const closeWith = (t, say) => {
  t.out.bubble = fill(t, say);
  return null;
};
const wrapUp = (t) => () => closeWith(t, pick(t, AFTER));

function fill(t, s) {
  return s
    .replaceAll('{name}', t.ctx.name || 'friend')
    .replaceAll('{slogan}', t.f.flags.slogan || 'Come hungry, leave round.')
    .replaceAll('{idea}', t.f.flags.idea || 'fruit smoothies');
}

// ---------------------------------------------------------------- menu
export function threadState(f, id) {
  const th = THREADS[id];
  const next = th.chapters.find((c) => !f.learned.includes(c.id)) ?? null;
  const started = th.chapters.some((c) => f.learned.includes(c.id)) || (id === 'mom' && !!f.flags.mom);
  return { next, started, done: !next };
}

function threadVisible(f, id) {
  return id !== 'mom' || levelOf(f.pts) >= 1 || threadState(f, 'home').started;
}

function menuNode(t, say) {
  const { f } = t;
  const opts = [opt("How's it going?", () => smallTalk(t))];
  for (const id of THREAD_ORDER) {
    if (!threadVisible(f, id)) continue;
    const s = threadState(f, id);
    const ask = THREADS[id].ask[s.done ? 2 : s.started ? 1 : 0];
    opts.push(opt(ask, () => enterThread(t, id)));
  }
  opts.push(...giftOpts(t, wrapUp(t)));
  opts.push(opt(pick(t, BYE), () => closeWith(t, FAREWELL[levelOf(f.pts)])));
  return node(say, opts);
}

const backToMenu = (t) => () => menuNode(t, pick(t, AFTER));

function enterThread(t, id) {
  const { f, ctx } = t;
  const th = THREADS[id];
  const s = threadState(f, id);
  if (s.done) {
    // He tells one of its chapters again (never the one he retold last), so the answers you skipped the first time,
    // and the ones he kept for better friends, get their turn; then a retell line. It scores like small talk.
    const key = `retold.${id}`;
    const ch = pick(
      t,
      th.chapters.filter((c) => c.id !== f.flags[key]),
    );
    f.flags[key] = ch.id;
    const retell = () =>
      node(
        pick(t, th.retell),
        RETELL_OPTS.map((say) => opt(say, wrapUp(t))),
        'joy',
      );
    return chapterNode(t, ch, 'a', retell, chatScores(f, ctx.now));
  }
  if (s.next.lvl > levelOf(f.pts)) {
    // Asking before he's ready is a little nosy; pushing is very nosy.
    if (addNosy(f, 1, ctx.now)) return tooNosy(t);
    return node(
      pick(t, th.deflect),
      [
        opt(DEFLECT_OPTS[0], backToMenu(t)),
        opt(
          DEFLECT_OPTS[1],
          () =>
            node(
              pick(t, PUSHED),
              PUSHED_OPTS.map((s) => opt(s, backToMenu(t))),
              'grump',
            ),
          {
            nosy: 2,
            pts: -2,
          },
        ),
      ],
      'worry',
    );
  }
  // Left halfway last time: carry on from there.
  const key = bookmarkKey(id);
  const [chId, at] = String(f.flags[key] ?? '').split('.');
  delete f.flags[key];
  const resume = chId === s.next.id && at in s.next.nodes;
  const n = chapterNode(
    t,
    s.next,
    resume ? at : 'a',
    () => {
      if (!f.learned.includes(s.next.id)) {
        f.learned.push(s.next.id);
        gain(t, RULES.chapterPts);
      }
      return closeWith(t, pick(t, AFTER));
    },
    true,
    id,
  );
  return resume ? { ...n, say: `${pick(t, RESUME)} ${n.say}` } : n;
}

// Walks one chapter or small-talk tree; `done` builds whatever comes after its last answer. A story chapter being
// learned passes its thread, so leaving the talk can bookmark where you were.
function chapterNode(t, ch, id, done, scoring = true, thread = null) {
  const n = ch.nodes[id];
  const opts = n.opts.map((o) =>
    opt(
      o.say,
      () => {
        let to = o.to;
        if (o.trust !== undefined && levelOf(t.f.pts) < o.trust) {
          to = o.else;
          if (addNosy(t.f, 1, t.ctx.now)) return tooNosy(t);
        }
        return to ? chapterNode(t, ch, to, done, scoring, thread) : done();
      },
      // Unscored small talk can still cost points for rude answers.
      { set: o.set, nosy: o.nosy, pts: scoring ? o.pts : Math.min(0, o.pts ?? 0) },
    ),
  );
  return { ...node(n.say, opts, n.mood), at: thread && { thread, chapter: ch.id, node: id } };
}

function smallTalk(t) {
  const { f, ctx } = t;
  const lvl = levelOf(f.pts);
  const pool = SMALL_TALK.filter((s) => s.lvl <= lvl && (!s.needs || f.flags[s.needs]));
  const recent = Array.isArray(f.flags.recent) ? f.flags.recent : [];
  const fresh = pool.filter((s) => !recent.includes(s.id));
  const s = pick(t, fresh.length ? fresh : pool);
  f.flags.recent = [...recent, s.id].slice(-3);
  const scoring = chatScores(f, ctx.now);
  return chapterNode(t, s, 'a', wrapUp(t), scoring);
}

// ---------------------------------------------------------------- gifts
const withArticle = (label) => `${/^[aeiou]/i.test(label) ? 'an' : 'a'} ${label}`;
function giftOpts(t, after) {
  return t.ctx
    .gifts()
    .slice(0, 2)
    .map((g) =>
      opt(GIFT_ASK.replace('{gift}', withArticle(g.label)), () => giveNode(t, g.kind, after), { gift: g.kind }),
    );
}

function giveNode(t, kind, after) {
  const { f, ctx } = t;
  if (GIFTS[kind].key)
    return node(
      GIFTS[kind].line,
      GIFT_KEPT_OPTS.map((s) => opt(s, after)),
      'smile',
    );
  if (!ctx.give(kind)) return after();
  const r = giveGift(f, kind, ctx.now);
  t.out.gave = { kind, taste: r.taste };
  if (r.levelUp) t.out.levelUp = r.levelUp;
  let say = GIFTS[kind].line;
  if (r.capped) say = `${say} ${GIFT_CAPPED}`;
  else if (r.repeat) say = `${say} ${GIFT_REPEAT}`;
  if (r.forgave) say = `${GIFT_FORGAVE} ${say}`;
  const mood = r.taste === 'love' || r.taste === 'like' ? 'joy' : r.taste === 'dislike' ? 'grump' : 'smile';
  const next = isWary(f, ctx.now) ? end : after;
  return node(
    say,
    GIFT_OPTS[r.taste].map((s) => opt(s, next)),
    mood,
  );
}

// ---------------------------------------------------------------- moods
function kickNode(t) {
  const { f } = t;
  const k = Math.max(1, f.kicks);
  const say = k <= KICK.length ? KICK[k - 1] : pick(t, KICK_MORE);
  const wary = f.kicks >= RULES.waryAt;
  return node(
    say,
    KICK_OPTS.map((o) =>
      opt(
        o.say,
        () =>
          node(
            wary ? o.wary : o.reply,
            KICK_DONE.map((s) => opt(s, end)),
            'grump',
          ),
        { pts: o.pts },
      ),
    ),
    'grump',
  );
}

function waryNode(t) {
  const { f, ctx } = t;
  const opts = [
    opt(SORRY, () => {
      const ok = apologize(f, ctx.now);
      t.cold = isWary(f, ctx.now);
      const after = t.cold ? end : backToMenu(t);
      return node(
        ok ? SORRY_YES : SORRY_NO,
        SORRY_OPTS.map((s) => opt(s, after)),
        ok ? 'smile' : 'grump',
      );
    }),
  ];
  opts.push(...giftOpts(t, wrapUp(t)));
  opts.push(opt(pick(t, BYE), end));
  return node(pick(t, WARY), opts, 'grump');
}

function quietNode(t) {
  return node(
    pick(t, QUIET),
    QUIET_OPTS.map((s) => opt(s, end)),
    'grump',
  );
}

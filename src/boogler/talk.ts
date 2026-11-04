// Conversations with The Boogler: a menu of topics, ordered story chapters, small talk, gifts,
// and what he says after kicking you off. Pure: the caller passes his memories, a context and an rng.
//
//   const t = openTalk(f, ctx)      ctx = { now, name, rng, gifts(), give(kind), start?: 'menu' | 'kick', mario? }
//   talkView(t)                     -> { say, mood, opts: [string], gifts: [catalog index | -1] } or null once the
//                                      talk is over; gifts[i] is what answer i hands over
//   pickTalk(t, i)                  answer with option i; returns { gave, bubble }; bubble is what he says over
//                                   his head as the talk ends (or null)
//   leaveTalk(t)                    you walked off or closed it: bookmarks a story chapter you left halfway (resumed
//                                   next time you ask) and returns his goodbye for a bubble, or null
//
// As Mario (ctx.mario) he is starstruck instead, whatever his mood, and every answer is something Mario says.
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
  RETELL_OPTS,
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
  MARIO_TALK,
  MARIO_AFTER,
  MARIO_GIFT,
  MARIO_GIFT_GASP,
  MARIO_GIFT_OPTS,
} from './lines.ts';
import { apologize, giveGift, isWary, settle, RULES } from './memory.ts';
import { GIFTS } from '../sim/gift-catalog.ts';
import type { BooglerMemory } from './memory.ts';
import type { Mood } from './boogler.ts';

/** What the caller passes (see the header). */
export type TalkCtx = {
  now: number;
  name: string;
  rng: () => number;
  gifts: () => { kind: number; label: string }[];
  give: (kind: number) => boolean;
  start?: 'menu' | 'kick';
  mario?: boolean;
};
type Flags = Record<string, string | number>;
type Opt = { say: string; go: () => TalkNode | null; set?: Flags; gift?: number };
type TalkNode = {
  say: string;
  mood: Mood;
  opts: Opt[];
  at?: { thread: string; chapter: string; node: string } | null;
};
/** One story chapter or small-talk tree from lines.ts. */
type LineOpt = {
  say: string;
  to?: string;
  set?: Flags;
};
type Chapter = {
  id: string;
  needs?: string;
  nodes: Record<string, { say: string; mood?: Mood; opts: LineOpt[] }>;
};
type Thread = { ask: string[]; retell: string[]; chapters: Chapter[] };
const threads = THREADS as unknown as Record<string, Thread>;
export type Talk = {
  f: BooglerMemory;
  ctx: TalkCtx;
  node: TalkNode | null;
  cold: boolean;
  first: boolean;
  out: { gave: { kind: number; taste: string | undefined } | null; bubble: string | null };
};

const THREAD_ORDER = ['home', 'mom', 'biz'];
const node = (say: string, opts: Opt[], mood: Mood = 'smile'): TalkNode => ({ say, mood, opts });
const opt = (say: string, go: () => TalkNode | null, fx: Partial<Opt> = {}): Opt => ({ say, go, ...fx });
const bookmarkKey = (id: string) => `at.${id}`; // flag: '<chapter>.<node>' where you left that thread's chapter

export function openTalk(f: BooglerMemory, ctx: TalkCtx) {
  settle(f, ctx.now);
  // cold: he is cross (a kick-off or wary), so walking off gets no goodbye.
  const t: Talk = { f, ctx, node: null, cold: true, first: !f.met, out: { gave: null, bubble: null } };
  f.met = true;
  const start = ctx.start ?? 'menu';
  if (start === 'kick') t.node = kickNode(t);
  else if (ctx.mario) {
    t.cold = false;
    t.node = marioNode(t);
  } else if (isWary(f, ctx.now)) t.node = waryNode(t);
  else {
    t.cold = false;
    t.node = menuNode(t, pick(t, t.first ? GREETINGS.first : GREETINGS.again));
  }
  return t;
}

export function leaveTalk(t: Talk) {
  const at = t.node?.at;
  if (at && at.node !== 'a') t.f.flags[bookmarkKey(at.thread)] = `${at.chapter}.${at.node}`;
  t.node = null;
  if (t.cold) return null;
  return t.ctx.mario ? fill(t, pick(t, MARIO_AFTER)) : farewell(t);
}

export function talkView(t: Talk) {
  if (!t.node) return null;
  const { say, mood, opts } = t.node;
  return { say: fill(t, say), mood, opts: opts.map((o) => fill(t, o.say)), gifts: opts.map((o) => o.gift ?? -1) };
}

export function pickTalk(t: Talk, i: number) {
  t.out = { gave: null, bubble: null };
  const o = t.node?.opts[i];
  if (!o) return t.out;
  const { f } = t;
  if (o.set) Object.assign(f.flags, o.set);
  t.node = o.go ? o.go() : null;
  return t.out;
}

const pick = <T>(t: Talk, list: readonly T[]): T => list[Math.floor(t.ctx.rng() * list.length) % list.length]!;
const end = () => null;
const farewell = (t: Talk) => fill(t, t.first ? FAREWELL.first : pick(t, FAREWELL.again));
// Ends the talk with a line over his head.
const closeWith = (t: Talk, say: string) => {
  t.out.bubble = fill(t, say);
  return null;
};
const wrapUp = (t: Talk) => () => closeWith(t, pick(t, AFTER));

function fill(t: Talk, s: string) {
  return s
    .replaceAll('{name}', t.ctx.name || 'friend')
    .replaceAll('{slogan}', String(t.f.flags.slogan || 'Come hungry, leave round.'))
    .replaceAll('{idea}', String(t.f.flags.idea || 'fruit smoothies'));
}

// ---------------------------------------------------------------- menu
export function threadState(f: BooglerMemory, id: string) {
  const th = threads[id]!;
  const next = th.chapters.find((c) => !f.learned.includes(c.id)) ?? null;
  const started = th.chapters.some((c) => f.learned.includes(c.id)) || (id === 'mom' && !!f.flags.mom);
  return { next, started, done: !next };
}

function menuNode(t: Talk, say: string) {
  const { f } = t;
  const opts = [opt("How's it going?", () => smallTalk(t))];
  for (const id of THREAD_ORDER) {
    const s = threadState(f, id);
    const ask = threads[id]!.ask[s.done ? 2 : s.started ? 1 : 0]!;
    opts.push(opt(ask, () => enterThread(t, id)));
  }
  opts.push(...giftOpts(t, wrapUp(t)));
  opts.push(opt(pick(t, BYE), () => closeWith(t, farewell(t))));
  return node(say, opts);
}

const backToMenu = (t: Talk) => () => menuNode(t, pick(t, AFTER));

function enterThread(t: Talk, id: string) {
  const { f } = t;
  const th = threads[id]!;
  const s = threadState(f, id);
  if (s.done) {
    // He tells one of its chapters again (never the one he retold last), so answers you skipped get their turn.
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
    return chapterNode(t, ch, 'a', retell);
  }
  const next = s.next!; // not done
  // Left halfway last time: carry on from there.
  const key = bookmarkKey(id);
  const [chId, at] = String(f.flags[key] ?? '').split('.');
  delete f.flags[key];
  const resumeAt = next.id === 'home0' && at === 'd' ? 'd2' : at;
  const resume = chId === next.id && resumeAt !== undefined && resumeAt in next.nodes;
  const n = chapterNode(
    t,
    next,
    resume ? resumeAt : 'a',
    () => {
      if (!f.learned.includes(next.id)) {
        f.learned.push(next.id);
      }
      return closeWith(t, pick(t, AFTER));
    },
    id,
  );
  return resume ? { ...n, say: `${pick(t, RESUME)} ${n.say}` } : n;
}

// Walks one chapter or small-talk tree; `done` builds whatever comes after its last answer. A story chapter being
// learned passes its thread, so leaving the talk can bookmark where you were.
function chapterNode(
  t: Talk,
  ch: Chapter,
  id: string,
  done: () => TalkNode | null,
  thread: string | null = null,
): TalkNode {
  const n = ch.nodes[id]!;
  const opts = n.opts.map((o) =>
    opt(o.say, () => (o.to ? chapterNode(t, ch, o.to, done, thread) : done()), { set: o.set }),
  );
  return { ...node(n.say, opts, n.mood), at: thread ? { thread, chapter: ch.id, node: id } : null };
}

function smallTalk(t: Talk) {
  const { f } = t;
  const pool = (SMALL_TALK as unknown as Chapter[]).filter((s) => !s.needs || f.flags[s.needs]);
  const flags = f.flags as Record<string, unknown>; // recent is a list, kept only in memory
  const recent: string[] = Array.isArray(flags.recent) ? flags.recent : [];
  const fresh = pool.filter((s) => !recent.includes(s.id));
  const s = pick(t, fresh.length ? fresh : pool);
  flags.recent = [...recent, s.id].slice(-3);
  return chapterNode(t, s, 'a', wrapUp(t));
}

// ---------------------------------------------------------------- gifts
const withArticle = (label: string) => `${/^[aeiou]/i.test(label) ? 'an' : 'a'} ${label}`;
function giftOpts(t: Talk, after: () => TalkNode | null) {
  return t.ctx
    .gifts()
    .slice(0, 2)
    .map((g) =>
      opt(
        t.ctx.mario ? MARIO_GIFT : GIFT_ASK.replace('{gift}', withArticle(g.label)),
        () => giveNode(t, g.kind, after),
        {
          gift: g.kind,
        },
      ),
    );
}
const giftReplies = (t: Talk, list: readonly string[]) => (t.ctx.mario ? MARIO_GIFT_OPTS : list);

function giveNode(t: Talk, kind: number, after: () => TalkNode | null) {
  const { f, ctx } = t;
  if (GIFTS[kind]!.key)
    return node(
      GIFTS[kind]!.line,
      giftReplies(t, GIFT_KEPT_OPTS).map((s) => opt(s, after)),
      'smile',
    );
  if (!ctx.give(kind)) return after();
  const r = giveGift(f, kind, ctx.now)!; // GIFTS[kind] exists: checked above
  t.out.gave = { kind, taste: r.taste };
  let say = GIFTS[kind]!.line;
  if (r.capped) say = `${say} ${GIFT_CAPPED}`;
  else if (r.repeat) say = `${say} ${GIFT_REPEAT}`;
  if (r.forgave) say = `${GIFT_FORGAVE} ${say}`;
  if (t.ctx.mario) say = `${MARIO_GIFT_GASP} ${say}`;
  const mood: Mood = r.taste === 'love' || r.taste === 'like' ? 'joy' : r.taste === 'dislike' ? 'grump' : 'smile';
  const next = isWary(f, ctx.now) && !ctx.mario ? end : after;
  return node(
    say,
    giftReplies(t, (GIFT_OPTS as Record<string, string[]>)[r.taste!]!).map((s) => opt(s, next)),
    mood,
  );
}

// ---------------------------------------------------------------- moods
function kickNode(t: Talk) {
  const { f } = t;
  const k = Math.max(1, f.kicks);
  const say = k <= KICK.length ? KICK[k - 1]! : pick(t, KICK_MORE);
  const wary = f.kicks >= RULES.waryAt;
  return node(
    say,
    KICK_OPTS.map((o) =>
      opt(o.say, () =>
        node(
          wary ? o.wary : o.reply,
          KICK_DONE.map((s) => opt(s, end)),
          'grump',
        ),
      ),
    ),
    'grump',
  );
}

function waryNode(t: Talk) {
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

// He picks a conversation he didn't have last time; the opening also offers your gifts and a goodbye.
function marioNode(t: Talk) {
  const { f } = t;
  const s = pick(
    t,
    (MARIO_TALK as unknown as Chapter[]).filter((c) => c.id !== f.flags.marioLast),
  );
  f.flags.marioLast = s.id;
  const starstruck = () => closeWith(t, pick(t, MARIO_AFTER));
  const n = chapterNode(t, s, 'a', starstruck);
  n.opts.push(...giftOpts(t, starstruck), opt('Bye-bye!', starstruck));
  return n;
}

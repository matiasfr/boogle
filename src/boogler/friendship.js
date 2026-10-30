// How The Boogler feels about you. Personal (DESIGN.md: communal world, personal rewards): each player keeps their own
// friendship in localStorage and nobody else can change it. Pure, with `now` passed in (ms), so it runs in Node tests.
import { GIFTS } from '../sim/gift-catalog.js';

export const LEVELS = [
  { at: 0, name: 'Stranger' },
  { at: 20, name: 'Familiar face' },
  { at: 60, name: 'Pal' },
  { at: 130, name: 'Friend' },
  { at: 220, name: 'Close friend' },
  { at: 340, name: 'Best friend' },
];
export const MAX_LEVEL = LEVELS.length - 1;

const MIN = 60000;
export const RULES = {
  petGap: 2500, // pets closer together than this score nothing
  petWindow: 10 * MIN,
  petMax: 8, // scoring pets per window
  petPts: 2,
  giftWindow: 20 * MIN,
  giftMax: 4, // scoring gifts per window
  kickPts: -6,
  kickDecay: 4 * MIN, // one kick-off forgiven per this long
  waryAt: 3, // this many unforgiven kick-offs and he runs from you
  giftForgives: 2,
  sorryGap: 10 * MIN,
  nosyDecay: MIN,
  nosyLimit: 5,
  nosyPts: -4,
  quietMs: 90000,
  chatGap: 3 * MIN, // small talk scores at most this often
  chapterPts: 6,
  rideBase: 3.5, // seconds he puts up with a rider
  ridePerLevel: 1.2,
  rideWary: 1.5,
};
export const TASTE_PTS = { love: 12, like: 7, meh: 3, dislike: -3 };

export function createFriend() {
  return {
    pts: 0,
    kicks: 0,
    kickAt: 0,
    nosy: 0,
    nosyAt: 0,
    quietUntil: 0,
    sorryAt: 0,
    chatAt: 0,
    learned: [],
    pets: [],
    gifts: [],
    flags: {},
  };
}

export function levelOf(pts) {
  let l = 0;
  while (l < MAX_LEVEL && pts >= LEVELS[l + 1].at) l++;
  return l;
}

// frac: progress from this level's threshold toward the next (1 at the top level).
export function bond(f) {
  const level = levelOf(f.pts);
  if (level === MAX_LEVEL) return { level, name: LEVELS[level].name, frac: 1 };
  const lo = LEVELS[level].at,
    hi = LEVELS[level + 1].at;
  return { level, name: LEVELS[level].name, frac: (f.pts - lo) / (hi - lo) };
}

// Adds points (never below zero). Returns the new level when it went up, else 0.
export function addPts(f, n) {
  const before = levelOf(f.pts);
  f.pts = Math.max(0, f.pts + Math.round(n));
  const after = levelOf(f.pts);
  return after > before ? after : 0;
}

// Applies time-based forgiveness: kick-offs and nosiness wear off.
export function settle(f, now) {
  if (f.kicks > 0) {
    const k = Math.floor((now - f.kickAt) / RULES.kickDecay);
    if (k > 0) {
      f.kicks = Math.max(0, f.kicks - k);
      f.kickAt += k * RULES.kickDecay;
    }
  } else f.kickAt = now;
  if (f.nosy > 0) {
    const k = Math.floor((now - f.nosyAt) / RULES.nosyDecay);
    if (k > 0) {
      f.nosy = Math.max(0, f.nosy - k);
      f.nosyAt += k * RULES.nosyDecay;
    }
  } else f.nosyAt = now;
  f.pets = f.pets.filter((t) => now - t < RULES.petWindow);
  f.gifts = f.gifts.filter((g) => now - g.at < RULES.giftWindow);
}

export const isWary = (f, now) => (settle(f, now), f.kicks >= RULES.waryAt);
export const isQuiet = (f, now) => now < f.quietUntil;

// kind: 'happy' (scored), 'again' (too soon or too many, no points), 'wary' (still sore about rides).
export function pet(f, now) {
  if (isWary(f, now)) return { kind: 'wary', pts: 0, levelUp: 0 };
  const last = f.pets.length ? f.pets[f.pets.length - 1] : -Infinity;
  if (now - last < RULES.petGap || f.pets.length >= RULES.petMax) return { kind: 'again', pts: 0, levelUp: 0 };
  f.pets.push(now);
  return { kind: 'happy', pts: RULES.petPts, levelUp: addPts(f, RULES.petPts) };
}

// kind: index into GIFTS. Repeats of the same thing within the window are worth half each time; past giftMax in the
// window he still takes it (and still forgives) but it scores nothing.
export function giveGift(f, kind, now) {
  const g = GIFTS[kind];
  if (!g) return null;
  const wasWary = isWary(f, now);
  const capped = f.gifts.length >= RULES.giftMax;
  const repeats = f.gifts.filter((x) => x.kind === kind).length;
  let pts = (TASTE_PTS[g.taste] ?? 0) + (g.bonus ?? 0);
  if (pts > 0) pts = Math.round(pts / 2 ** repeats);
  if (capped) pts = 0;
  f.gifts.push({ kind, at: now });
  f.kicks = Math.max(0, f.kicks - RULES.giftForgives);
  const levelUp = addPts(f, pts);
  return { taste: g.taste, pts, capped, repeat: repeats > 0, forgave: wasWary && !isWary(f, now), levelUp };
}

export function kickedOff(f, now) {
  settle(f, now);
  const wasWary = f.kicks >= RULES.waryAt;
  f.kicks++;
  f.kickAt = now;
  addPts(f, RULES.kickPts);
  f.flags.kicked = (f.flags.kicked ?? 0) + 1;
  return { kicks: f.kicks, wary: f.kicks >= RULES.waryAt, nowWary: !wasWary && f.kicks >= RULES.waryAt };
}

export function rideLimit(f, now) {
  if (isWary(f, now)) return RULES.rideWary;
  return RULES.rideBase + RULES.ridePerLevel * levelOf(f.pts);
}

// Returns true when this pushed him over the edge: he stops talking for a while and the friendship takes a hit.
export function addNosy(f, n, now) {
  settle(f, now);
  f.nosy += n;
  if (f.nosy < RULES.nosyLimit) return false;
  f.nosy = 0;
  f.quietUntil = now + RULES.quietMs;
  addPts(f, RULES.nosyPts);
  return true;
}

export function apologize(f, now) {
  settle(f, now);
  if (f.kicks === 0 || now - f.sorryAt < RULES.sorryGap) return false;
  f.sorryAt = now;
  f.kicks--;
  return true;
}

// Small talk scores at most once per chatGap.
export function chatScores(f, now) {
  if (now - f.chatAt < RULES.chatGap) return false;
  f.chatAt = now;
  return true;
}

export function serializeFriend(f) {
  return JSON.stringify(f);
}

export function loadFriend(text) {
  const f = createFriend();
  let j;
  try {
    j = JSON.parse(text);
  } catch {
    return f;
  }
  if (!j || typeof j !== 'object') return f;
  const num = (v, lo = 0) => (Number.isFinite(v) && v >= lo ? v : 0);
  for (const k of ['pts', 'kicks', 'kickAt', 'nosy', 'nosyAt', 'quietUntil', 'sorryAt', 'chatAt']) f[k] = num(j[k]);
  f.pts = Math.round(f.pts);
  if (Array.isArray(j.learned)) f.learned = j.learned.filter((s) => typeof s === 'string').slice(0, 100);
  if (Array.isArray(j.pets)) f.pets = j.pets.filter(Number.isFinite).slice(-RULES.petMax);
  if (Array.isArray(j.gifts))
    f.gifts = j.gifts
      .filter((g) => g && Number.isInteger(g.kind) && GIFTS[g.kind] && Number.isFinite(g.at))
      .slice(-20)
      .map((g) => ({ kind: g.kind, at: g.at }));
  if (j.flags && typeof j.flags === 'object' && !Array.isArray(j.flags))
    for (const [k, v] of Object.entries(j.flags))
      if (typeof v === 'string' || Number.isFinite(v)) f.flags[k] = typeof v === 'string' ? v.slice(0, 60) : v;
  return f;
}

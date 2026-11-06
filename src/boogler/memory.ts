// What The Boogler remembers about you. Personal (DESIGN.md: communal world, personal rewards): each player keeps
// their own memories in localStorage. Pure, with `now` passed in (ms), so it runs in Node tests.
import { GIFTS } from '../sim/gift-catalog.ts';

const MIN = 60000;
export const RULES = {
  giftWindow: 20 * MIN,
  giftMax: 4, // presents in the window before he remarks on being spoiled
  kickDecay: 4 * MIN,
  waryAt: 3,
  giftForgives: 2,
  sorryGap: 10 * MIN,
  rideBase: 3.5,
  rideWary: 1.5,
};

/** Your conversations, presents and his short-lived grudge, kept in localStorage. */
export type BooglerMemory = {
  met: boolean;
  kicks: number;
  kickAt: number;
  sorryAt: number;
  learned: string[];
  gifts: { id: string; at: number }[];
  flags: Record<string, string | number>;
};

export function createMemory(): BooglerMemory {
  return { met: false, kicks: 0, kickAt: 0, sorryAt: 0, learned: [], gifts: [], flags: {} };
}

// Kick-offs wear off, and old presents leave the reaction window.
export function settle(f: BooglerMemory, now: number) {
  if (f.kicks > 0) {
    const k = Math.floor((now - f.kickAt) / RULES.kickDecay);
    if (k > 0) {
      f.kicks = Math.max(0, f.kicks - k);
      f.kickAt += k * RULES.kickDecay;
    }
  } else f.kickAt = now;
  f.gifts = f.gifts.filter((g) => now - g.at < RULES.giftWindow);
}

export const isWary = (f: BooglerMemory, now: number) => (settle(f, now), f.kicks >= RULES.waryAt);

// The reaction window stores catalog ids, so a renumbered catalog cannot misread a saved present.
export function giveGift(f: BooglerMemory, kind: number, now: number) {
  const g = GIFTS[kind];
  if (!g) return null;
  const wasWary = isWary(f, now);
  const capped = f.gifts.length >= RULES.giftMax;
  const repeat = f.gifts.some((x) => x.id === g.id);
  f.gifts.push({ id: g.id, at: now });
  f.kicks = Math.max(0, f.kicks - RULES.giftForgives);
  return { taste: g.taste, capped, repeat, forgave: wasWary && !isWary(f, now) };
}

export function kickedOff(f: BooglerMemory, now: number) {
  settle(f, now);
  const wasWary = f.kicks >= RULES.waryAt;
  f.kicks++;
  f.kickAt = now;
  f.flags.kicked = Number(f.flags.kicked ?? 0) + 1;
  return { kicks: f.kicks, wary: f.kicks >= RULES.waryAt, nowWary: !wasWary && f.kicks >= RULES.waryAt };
}

export function rideLimit(f: BooglerMemory, now: number) {
  return isWary(f, now) ? RULES.rideWary : RULES.rideBase;
}

export function apologize(f: BooglerMemory, now: number) {
  settle(f, now);
  if (f.kicks === 0 || now - f.sorryAt < RULES.sorryGap) return false;
  f.sorryAt = now;
  f.kicks--;
  return true;
}

export function serializeMemory(f: BooglerMemory) {
  return JSON.stringify(f);
}

export function loadMemory(text: string) {
  const f = createMemory();
  let j;
  try {
    j = JSON.parse(text);
  } catch {
    return f;
  }
  if (!j || typeof j !== 'object') return f;
  const num = (v: unknown) => (Number.isFinite(v) && (v as number) >= 0 ? (v as number) : 0);
  for (const k of ['kicks', 'kickAt', 'sorryAt'] as const) f[k] = num(j[k]);
  if (Array.isArray(j.learned)) f.learned = j.learned.filter((s: unknown) => typeof s === 'string').slice(0, 100);
  f.met = j.met === true;
  if (Array.isArray(j.gifts))
    f.gifts = j.gifts
      .filter(
        (g: { id?: unknown; at?: unknown } | null) =>
          g && typeof g.id === 'string' && GIFTS.some((x) => x.id === g.id) && Number.isFinite(g.at),
      )
      .slice(-20)
      .map((g: { id: string; at: number }) => ({ id: g.id, at: g.at }));
  if (j.flags && typeof j.flags === 'object' && !Array.isArray(j.flags))
    for (const [k, v] of Object.entries(j.flags))
      if (typeof v === 'string' || Number.isFinite(v))
        f.flags[k] = typeof v === 'string' ? v.slice(0, 60) : (v as number);
  return f;
}

// A session's stored lines (server/src/playdata.ts) as one list of events on one clock. Every batch says the server's
// time `at` and the page's clock `now`, so `wall = at - (now - t)` puts two players' events on one timeline whatever
// their own clocks say. A retried batch arrives twice with one number: the repeat goes.
import type { PlayEvent, PlayLine } from '../../server/src/playdata.ts';
import { cleanText } from '../../server/src/clean-text.ts';

export type Ev = PlayEvent & { wall: number };
export type Session = {
  id: string;
  card: string;
  meta: Record<string, unknown>;
  events: Ev[];
  start: number; // ms, wall
  end: number; // ms, wall
  hiddenS: number;
};
export const str = (v: unknown) => (typeof v === 'string' ? v : '');
export const num = (v: unknown) => (typeof v === 'number' ? v : 0);

export function parseSession(id: string, text: string): Session {
  const seen = new Set<number>();
  const events: Ev[] = [];
  let card = '';
  for (const raw of text.split('\n')) {
    if (!raw.trim()) continue;
    let l: PlayLine;
    try {
      l = JSON.parse(raw);
    } catch {
      continue; // a torn line
    }
    if (seen.has(l.n)) continue;
    seen.add(l.n);
    card ||= cleanText(String(l.card));
    const at = Date.parse(l.at);
    for (const e of l.ev) {
      // Stripped here too: what's on disk may be older than the server's cleaning, and this ends up in a terminal.
      const clean: PlayEvent = { ...e };
      for (const [k, v] of Object.entries(e)) if (typeof v === 'string') clean[k] = cleanText(v);
      events.push({ ...clean, wall: at - (l.now - e.t) * 1000 });
    }
  }
  events.sort((a, b) => a.t - b.t);
  let meta: Record<string, unknown> = {};
  for (const e of events) if (e.k === 'session') meta = { ...meta, ...e };
  let hiddenS = 0;
  let hid = -1;
  for (const e of events) {
    if (e.k === 'hide' && hid < 0) hid = e.t;
    else if ((e.k === 'show' || e.k === 'resume') && hid >= 0) {
      hiddenS += e.t - hid;
      hid = -1;
    }
  }
  const first = events[0];
  const last = events.at(-1);
  return { id, card, meta, events, start: first?.wall ?? 0, end: last?.wall ?? 0, hiddenS };
}

/** Seconds as `m:ss` (or `h:mm:ss`). */
export function clock(s: number) {
  const t = Math.max(0, Math.round(s));
  const h = Math.floor(t / 3600);
  const m = Math.floor((t % 3600) / 60);
  const ss = String(t % 60).padStart(2, '0');
  return h ? `${h}:${String(m).padStart(2, '0')}:${ss}` : `${m}:${ss}`;
}
/** Seconds as a person says them: `40 s`, `3 min 20 s`. */
export function span(s: number) {
  const t = Math.max(0, Math.round(s));
  if (t < 90) return `${t} s`;
  const m = Math.floor(t / 60);
  return t % 60 && m < 20 ? `${m} min ${t % 60} s` : `${Math.round(t / 60)} min`;
}

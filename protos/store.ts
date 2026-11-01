// What the owner wrote and did per prototype, in this browser's localStorage under one key. Shared by the protos page
// (protos/main.ts) and the in-game prototype bar (src/proto/bar/), which can be open in two tabs at once: every write
// re-reads the key first, so neither tab overwrites the other's fields. Nothing here talks to a server.
import { PROTOS, type Proto } from './protos.ts';

export type Verdict = 'yes' | 'no' | 'cant';
export const VERDICTS: { id: Verdict; label: string }[] = [
  { id: 'yes', label: 'Yes' },
  { id: 'no', label: 'No' },
  { id: 'cant', label: 'Can’t tell' },
];

export type Saved = {
  notes: string;
  values: string;
  name: string;
  variant: string;
  /** The one-tap answer to the gut question, from the bar in the game. */
  verdict: Verdict | '';
  /** One line on why, beside the verdict. */
  verdictNote: string;
  /** The variant playing when the verdict was given ('' for the default). */
  verdictV: string;
  /** Behaviour counters (`protoCount`): rides, runs, variant switches, seconds in the prototype. */
  counts: Record<string, number>;
};

export const KEY = 'boogle-protos-v1';

export function loadAll(): Record<string, Partial<Saved>> {
  try {
    const all = JSON.parse(localStorage.getItem(KEY) || '{}');
    return all && typeof all === 'object' ? all : {};
  } catch {
    return {};
  }
}

export function read(id: string, all = loadAll()): Saved {
  const s = all[id] ?? {};
  return {
    notes: s.notes ?? '',
    values: s.values ?? '',
    name: s.name ?? '',
    variant: s.variant ?? '',
    verdict: s.verdict ?? '',
    verdictNote: s.verdictNote ?? '',
    verdictV: s.verdictV ?? '',
    counts: s.counts && typeof s.counts === 'object' ? s.counts : {},
  };
}

/** Merges `patch` into the prototype's entry; `counts` add to what is stored. Returns the saved entry. */
export function write(id: string, patch: Partial<Omit<Saved, 'counts'>>, addCounts?: Record<string, number>): Saved {
  const all = loadAll();
  const s = { ...read(id, all), ...patch };
  if (addCounts) {
    s.counts = { ...s.counts };
    for (const [k, v] of Object.entries(addCounts)) s.counts[k] = (s.counts[k] ?? 0) + v;
  }
  all[id] = s;
  try {
    localStorage.setItem(KEY, JSON.stringify(all));
  } catch {
    // Private mode or full storage: nothing is kept past this page.
  }
  return s;
}

/** The value of `name` in a prototype's url (`proto`, `room`, ...), or null. */
export const urlParam = (p: Proto, name: string) => new URLSearchParams(p.url.split('?')[1] ?? '').get(name);

/** The card a game address belongs to: the one whose url has the same `proto=`. */
export function cardFor(search: string): Proto | undefined {
  const proto = new URLSearchParams(search).get('proto');
  return proto ? PROTOS.find((p) => urlParam(p, 'proto') === proto) : undefined;
}

/** The counters as one plain line: "3 rides, 2 variant switches, 6 min in prototype". */
export function countsLine(counts: Record<string, number>): string {
  const parts: string[] = [];
  for (const [k, v] of Object.entries(counts)) {
    if (k === 'seconds') continue;
    parts.push(`${Math.round(v)} ${k}`);
  }
  const s = counts.seconds ?? 0;
  if (s >= 1) parts.push(`${s < 90 ? `${Math.round(s)} s` : `${Math.round(s / 60)} min`} in prototype`);
  return parts.join(', ');
}

// ---------------------------------------------------------------- sittings (docs/research/playtest-telemetry.md)
// One record per page load of a `?proto=` page (src/proto/trace/record.ts): where you went, idled, failed and quit, and
// how long until the prototype's verb. Kept under their own key, the last SITTINGS per card, so the notes above stay
// small. Positions are rounded to a metre; nothing leaves the browser.

/** What you were doing in a sample, by index (append only: stored sittings keep the index). */
export const ACTIVITIES = ['walking', 'riding', 'driving', 'carrying', 'swimming', 'idle'] as const;
export type Activity = (typeof ACTIVITIES)[number];
/** Each activity's colour on the maps (the protos page and `?trace=1` in the game), in ACTIVITIES order. */
export const ACTIVITY_COLORS = ['#f2c14e', '#3fa7d6', '#e85d75', '#8a5a2b', '#2ec4b6', '#9b8fb0'];
/** The colour of a failure mark of this kind on the maps. */
export const markColor = (k: string) =>
  ({ crash: '#e63946', spill: '#b5651d', tumble: '#ff8c42', splat: '#d62828', bonk: '#f77f00', splash: '#1d7fd6' })[
    k
  ] ?? '#c1121f';

export type Sitting = {
  /** Date.now() when the page loaded; also the sitting's id. */
  id: number;
  /** The variant playing ('' for the default). */
  v: string;
  /** Once a second: [t, x, z, activity index], t in seconds since the page loaded, x and z in whole metres. */
  p: number[];
  /** Each stretch of standing still for IDLE_S or more: [t, x, z, seconds]. */
  idle: number[];
  /** Failures and the verb: wipeouts, tumbles, crashes, falls in the water, ... */
  marks: { k: string; t: number; x: number; z: number }[];
  /** Seconds from page load to the first use of the prototype's verb (null: never). */
  verb: number | null;
  /** The last place the sitting saw you, and how long you had stood still there. */
  end: { t: number; x: number; z: number; idle: number } | null;
};

export const TRACES_KEY = 'boogle-protos-traces-v1';
export const SITTINGS = 10;
export const IDLE_S = 5;

function loadTraces(): Record<string, Sitting[]> {
  try {
    const all = JSON.parse(localStorage.getItem(TRACES_KEY) || '{}');
    return all && typeof all === 'object' ? all : {};
  } catch {
    return {};
  }
}

/** A card's sittings, oldest first. */
export function sittings(id: string): Sitting[] {
  const list = loadTraces()[id];
  return Array.isArray(list) ? list.filter((s) => s && Array.isArray(s.p) && Array.isArray(s.marks)) : [];
}

/** Adds or replaces (same id) a sitting, keeping the card's last SITTINGS. */
export function saveSitting(card: string, s: Sitting) {
  const all = loadTraces();
  const list = (Array.isArray(all[card]) ? all[card] : []).filter((o) => o?.id !== s.id);
  list.push(s);
  all[card] = list.slice(-SITTINGS);
  for (let tries = 0; tries < 4; tries++) {
    try {
      localStorage.setItem(TRACES_KEY, JSON.stringify(all));
      return;
    } catch {
      // Full: drop the oldest sitting of the card with the most, then try again.
      const most = Object.keys(all).sort((a, b) => all[b].length - all[a].length)[0];
      if (!most || all[most].length <= 1) return;
      all[most].shift();
    }
  }
}

const dur = (s: number) => (s < 90 ? `${Math.round(s)} s` : `${Math.round(s / 60)} min`);

/** The latest sitting as one line for the playtest entry: "6 min, verb in 4 s, idle 3 times (40 s), 2 tumbles, 1
 * crash; ended at (31, -8) after 12 s still". */
export function sittingLine(s: Sitting | undefined): string {
  if (!s) return '';
  const parts = [dur(s.end?.t ?? 0)];
  parts.push(s.verb === null ? 'never used the verb' : `verb in ${dur(s.verb)}`);
  const n = s.idle.length / 4;
  if (n) {
    let total = 0;
    for (let i = 3; i < s.idle.length; i += 4) total += s.idle[i];
    parts.push(`idle ${n === 1 ? 'once' : `${n} times`} (${dur(total)})`);
  }
  const kinds: Record<string, number> = {};
  for (const m of s.marks) if (m.k !== 'verb') kinds[m.k] = (kinds[m.k] ?? 0) + 1;
  for (const [k, c] of Object.entries(kinds))
    parts.push(`${c} ${c === 1 ? k : /(s|sh|ch|x)$/.test(k) ? `${k}es` : `${k}s`}`);
  let line = parts.join(', ');
  if (s.end)
    line += `; ended at (${s.end.x}, ${s.end.z})${s.end.idle >= IDLE_S ? ` after ${dur(s.end.idle)} still` : ''}`;
  return line;
}

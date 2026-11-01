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

// The load of a run's FIRST navigation, as data (pure; the DOM side is ./first-load.ts). A launch is cold only when no
// service worker controlled the first page and the HTML did not come from a cache; a service-worker-served load hides
// the time a first visit really waits (owner, 10 November: his iPhone run took "a lot longer than 10s"). Local, debug
// only.
import type { PlayEvent } from '../../../server/src/playdata.ts';
import type { Fields } from './wire.ts';

/** What the first navigation left behind, small enough for sessionStorage. */
export type FirstSnap = {
  /** The `dev.first` fields. */
  fields: Fields;
  /** Boot marks in order: name and ms since that navigation began. */
  marks: [string, number][];
  /** The largest files fetched, as "path (N KB, M ms)". */
  files: string[];
};

export type LaunchKind = 'cold' | 'warm' | 'unknown';

const key = (name: string) => `m_${name.replace(/[^a-z0-9]+/gi, '_')}`.slice(0, 24);

/** The marks as `dev.boot` events of at most `size` fields each (the endpoint keeps 24 an event). */
export function markEvents(t: number, marks: readonly [string, number][], size = 20): PlayEvent[] {
  const out: PlayEvent[] = [];
  for (let i = 0; i < marks.length; i += size) {
    const e: PlayEvent = { t, k: 'dev.boot' };
    for (const [name, ms] of marks.slice(i, i + size)) e[key(name)] = ms;
    out.push(e);
  }
  return out;
}

/** Cold: a service worker did not control the first page and its HTML was fetched. Warm: one did, or a cache served
 * the HTML. Unknown: the page could not say (an older run, or storage was blocked). */
export function launchKind(f: Record<string, unknown>): LaunchKind {
  if (f.sw0 === true || f.html_cached === true) return 'warm';
  if (f.sw0 === false && f.html_cached === false) return 'cold';
  return 'unknown';
}

/** A stored snapshot back, or null when it is not one (storage is the page's own, but never trusted). */
export function parseSnap(text: string | null): FirstSnap | null {
  if (!text) return null;
  try {
    const s = JSON.parse(text) as Partial<FirstSnap>;
    if (!s || typeof s.fields !== 'object' || !s.fields || !Array.isArray(s.marks) || !Array.isArray(s.files))
      return null;
    const marks = s.marks.filter(
      (m): m is [string, number] => Array.isArray(m) && typeof m[0] === 'string' && Number.isFinite(m[1]),
    );
    return { fields: s.fields, marks, files: s.files.filter((f): f is string => typeof f === 'string') };
  } catch {
    return null;
  }
}

const secs = (ms: unknown) => (typeof ms === 'number' && ms > 0 ? `${(ms / 1000).toFixed(1)} s` : null);

/** The two headlines of a run's first launch, from the `dev.first` fields: "Cold launch: N s (first visit, no service
 * worker)" and "Warm launch: N s". A launch the service worker or a cache already served is never given as a cold
 * number: it says unknown. */
export function launchHeadlines(f: Record<string, unknown> | null): string[] {
  if (!f) return ['Cold launch: unknown (this run did not record its first load)', 'Warm launch: unknown'];
  const t = secs(f.ready);
  const kind = f.later === true ? 'unknown' : launchKind(f);
  const later = f.later === true ? '; the first navigation did not finish, so this is a later one' : '';
  if (kind === 'cold') {
    return [
      t
        ? `Cold launch: ${t} (first visit, no service worker)`
        : 'Cold launch: not measured (the game was not interactive)',
      'Warm launch: not measured (open the same link again on this device)',
    ];
  }
  if (kind === 'warm')
    return [
      'Cold launch: unknown (the first navigation was already served by the service worker or a cache; use `new --cold` or a private tab)',
      t ? `Warm launch: ${t}` : 'Warm launch: not measured',
    ];
  return [
    `Cold launch: unknown (the page could not tell whether this was a first visit${later})`,
    `Warm launch: unknown${t ? ` (this load took ${t})` : ''}`,
  ];
}

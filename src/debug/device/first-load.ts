// The page side of the first-launch record (./launch.ts has the shapes). Three jobs, all local to this tab:
//  - `noteNavigationStart` reads, as early as boot allows, whether a service worker controlled THIS navigation and
//    whether its HTML came from a cache, and keeps the first navigation's note in sessionStorage (keyed by the run id)
//    so a later navigation of the same run cannot overwrite it;
//  - `coldReset` (`cold=1`) unregisters the service worker and clears Cache Storage, then reloads once, so the load
//    that follows is as close to a first visit as a page can make it;
//  - `captureFirstLoad` snapshots the boot timeline of the navigation (marks, bytes, largest files, shader warm-up).
// Everything is wrapped: blocked storage costs the record, never the run. Debug only.
import { bootTimeline } from '../../boot/timeline.ts';
import { parseSnap, type FirstSnap } from './launch.ts';
import { fit, type Fields } from './wire.ts';

const K = (what: string, id: string) => `boogle.device.${what}.${id}`;
const get = (k: string) => {
  try {
    return sessionStorage.getItem(k);
  } catch {
    return null;
  }
};
const put = (k: string, v: string) => {
  try {
    sessionStorage.setItem(k, v);
  } catch {
    // blocked: the record is lost, the run is not
  }
};
const round = (v: number) => Math.round(v);

type Start = {
  at: number;
  sw0: boolean;
  html_cached: boolean | null;
  nav: string;
  ttfb: number | null;
  conn: number | null;
};
/** This navigation's own start note. */
let thisStart: Start | null = null;

/** Unregister the service worker and clear Cache Storage, once per run, then reload. Resolves only when no reload was
 * needed (already done, or nothing to do it with). */
export async function coldReset(id: string): Promise<void> {
  if (get(K('cold', id))) return;
  try {
    const regs = (await navigator.serviceWorker?.getRegistrations?.()) ?? [];
    for (const r of regs) await r.unregister();
    const names = (await globalThis.caches?.keys?.()) ?? [];
    for (const n of names) await caches.delete(n);
    put(K('cold', id), JSON.stringify({ sw: regs.length, caches: names.length }));
  } catch {
    put(K('cold', id), JSON.stringify({ sw: -1, caches: -1 }));
    return;
  }
  location.reload();
  await new Promise<void>(() => {}); // the page is going away: boot must not continue
}

/** What the cold option did, for the card ("" when it was not asked for). */
export function coldNote(id: string): string {
  const raw = get(K('cold', id));
  if (!raw) return '';
  try {
    const c = JSON.parse(raw) as { sw: number; caches: number };
    if (c.sw < 0)
      return 'Cold run asked for, but this browser would not let the page clear its service worker: use a private tab.';
    return `Cold run: cleared ${c.sw} service worker${c.sw === 1 ? '' : 's'} and ${c.caches} cache${c.caches === 1 ? '' : 's'}, then reloaded once. The browser's own HTTP cache stays; for a true first visit use a private tab.`;
  } catch {
    return '';
  }
}
export const coldDid = (id: string): string => (get(K('cold', id)) ? 'sw+cache' : '');

/** Called at boot, before the game loads: reads this navigation's start (a later navigation does not replace the first). */
export function noteNavigationStart(id: string): void {
  const n = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
  thisStart = {
    at: round(performance.timeOrigin),
    sw0: !!navigator.serviceWorker?.controller,
    // Served without the network: a transfer of 0 with a body means a cache (or the service worker) answered.
    html_cached: n ? n.transferSize === 0 && n.decodedBodySize > 0 : null,
    nav: n?.type ?? 'unknown',
    ttfb: n ? round(n.responseStart) : null,
    conn: n ? round(n.connectEnd - n.domainLookupStart) : null,
  };
  if (!get(K('start', id))) put(K('start', id), JSON.stringify(thisStart));
}

/** The first navigation's load, from this navigation's marks. Kept in sessionStorage; refreshed only by the same
 * navigation (more marks arrive after the first call), never replaced by a later one. */
export function captureFirstLoad(id: string, usableMs: number | null, coldRequested: boolean): FirstSnap | null {
  if (!thisStart) return null;
  const first = parseStart(get(K('start', id)));
  const kept = parseSnap(get(K('first', id)));
  const mine = kept && Number(kept.fields.at) === thisStart.at;
  if (kept && !mine) return kept; // a later navigation: the first one's record stands
  const tl = bootTimeline();
  const ready = tl.marks.find((m) => m.name === 'interactive')?.t;
  const sh = tl.marks.find((m) => m.name === 'shaders')?.detail;
  const res = (performance.getEntriesByType('resource') as PerformanceResourceTiming[])
    .filter((r) => r.initiatorType !== 'beacon')
    .map((r) => ({ r, kb: (r.transferSize || r.encodedBodySize) / 1000 }))
    .sort((a, b) => b.kb - a.kb)
    .slice(0, 6);
  const n = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
  const fields: Fields = {
    at: thisStart.at,
    sw0: thisStart.sw0,
    html_cached: thisStart.html_cached,
    nav: thisStart.nav,
    ttfb: thisStart.ttfb,
    conn: thisStart.conn,
    html: n ? round(n.domInteractive) : null,
    ready: ready ?? null,
    usable: usableMs === null ? (kept?.fields.usable ?? null) : round(usableMs),
    req: tl.req,
    net_kb: round(tl.net / 1000),
    body_kb: round(tl.body / 1000),
    sw_req: tl.fromSw,
    sw_now: !!navigator.serviceWorker?.controller,
    // True when this is not the first navigation of the run (it reloaded before its first load finished).
    later: !!first && first.at !== thisStart.at,
    cold_req: coldRequested,
    cold_did: coldDid(id),
    shaders_ms: sh && typeof sh.ms === 'number' ? sh.ms : null,
    programs: sh && typeof sh.programs === 'number' ? sh.programs : null,
    pipelines: sh && typeof sh.pipelines === 'number' ? sh.pipelines : null,
    wgsl_ms: sh && typeof sh.wgsl === 'number' ? sh.wgsl : null,
  };
  const snap: FirstSnap = {
    fields,
    marks: tl.marks.map((m): [string, number] => [m.name, m.t]),
    files: res.map(({ r, kb }) =>
      fit(
        `${r.name.replace(/^https?:\/\/[^/]+/, '').replace(/\?.*$/, '')} (${Math.round(kb)} KB, ${round(r.duration)} ms)`,
        200,
      ),
    ),
  };
  put(K('first', id), JSON.stringify(snap));
  return snap;
}

function parseStart(text: string | null): Start | null {
  try {
    const s = text ? (JSON.parse(text) as Start) : null;
    return s && typeof s.at === 'number' ? s : null;
  } catch {
    return null;
  }
}

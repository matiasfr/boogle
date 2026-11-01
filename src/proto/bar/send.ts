// A verdict from the prototype bar, also sent to our server as a `playtest` report (POST /report, server/README.md),
// so the owner never pastes it: `npm run verdicts` reads them back. Sent on a verdict tap and when the note is done
// (blur or Enter), never per keystroke; only what changed since the last send for that card and variant goes out.
// navigator.sendBeacon (text/plain: no CORS preflight, survives the page closing). Failures stay silent: the local
// store and Copy all still have it. Inert without VITE_BOOGLE_SERVER (dev without a server). Local: nothing is synced.
import { getRoomId } from '../../netplay/net.ts';
import { BUILD } from '../../netplay/builds.ts';
import { read, sittingLine, sittings } from '../../../protos/store.ts';

const SERVER = import.meta.env.VITE_BOOGLE_SERVER;
const last = new Map<string, string>(); // card/variant -> the last payload sent

const sig = (verdict: string, note: string) => JSON.stringify([verdict, note.trim()]);

/** Whether what's stored for card `id`, variant `v` is what this page last sent (the bar's "sent" tick). */
export function isSent(id: string, v: string): boolean {
  const m = read(id).byV[v];
  return !!m?.verdict && last.get(`${id}/${v}`) === sig(m.verdict, m.note);
}

/** Sends card `id`'s verdict for variant `v` (a `vName`) if it has one and it changed. True when the beacon was queued. */
export function sendVerdict(id: string, v: string): boolean {
  if (!SERVER || typeof navigator.sendBeacon !== 'function') return false;
  const s = read(id);
  const m = s.byV[v];
  if (!m?.verdict) return false;
  const detail = {
    proto: id,
    variant: v,
    verdict: m.verdict,
    note: m.note.trim(),
    counts: m.counts,
    trace: sittingLine(sittings(id).at(-1)),
    values: s.values.trim() || undefined,
    build: BUILD,
  };
  const key = `${id}/${v}`;
  const same = sig(m.verdict, m.note);
  if (last.get(key) === same) return false;
  try {
    const body = JSON.stringify({ room: getRoomId(), kind: 'playtest', detail, build: BUILD });
    if (!navigator.sendBeacon(new URL('/report', SERVER), body)) return false;
  } catch {
    return false;
  }
  last.set(key, same);
  return true;
}

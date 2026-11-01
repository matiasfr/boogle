// The room and prototype a visit was in, kept so the Home Screen app (which opens its bare start_url) can go back to
// them. Pure: no DOM, used by src/features/home-app.ts and test/last-launch.test.ts.

// Harness and debug flags that never carry over to the next launch.
const DROP = ['dpr', 'debugcam', 'netdebug', 'prof', 'look'];

// The part of a URL's query worth reopening: '' when it names neither a room nor a prototype (the default island),
// else the query without debug flags, prototype parameters (?v=, ?hero=, ...) included.
export function launchQuery(search: string): string {
  const q = new URLSearchParams(search);
  if (!q.get('room') && !q.get('proto')) return '';
  for (const k of DROP) q.delete(k);
  return q.toString();
}

// "room test-xyz · prototype arrive (lobby)": the place a query opens, for the Continue button.
export function describeLaunch(query: string): string {
  const q = new URLSearchParams(query);
  const room = q.get('room'),
    proto = q.get('proto'),
    v = q.get('v');
  const parts: string[] = [];
  if (room) parts.push(`room ${room}`);
  if (proto) parts.push(`prototype ${proto}${v ? ` (${v})` : ''}`);
  return parts.join(' · ');
}

export const COOKIE = 'boogle_last';
// The cookie form, read from document.cookie: Safari copies cookies into a Home Screen app when it is added (localStorage
// it doesn't), so the first launch of a new install can still find the last place.
export function fromCookie(cookie: string): string {
  for (const part of cookie.split(';')) {
    const [k, ...v] = part.trim().split('=');
    if (k === COOKIE) {
      try {
        return launchQuery(decodeURIComponent(v.join('=')));
      } catch {
        return '';
      }
    }
  }
  return '';
}

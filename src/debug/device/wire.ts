// What a device run sends: a playdata session (POST /playdata, server/src/playdata.ts) with the card `device`. Pure
// builders, so the CLI's tests and the page agree on the shape. Events are flat (24 fields, short names, 300-character
// strings). Event kinds, in the order a run sends them (dev/device/README.md has the fields):
//   session          the run: suite, build, label, device, browser, ua, `bot: true`, state (started, done)
//   dev.diag.gpu     adapter and backend      dev.diag.alim / dev.diag.dlim   adapter and device limits
//   dev.diag.env     screen, memory, input, refresh rate, battery, graphics settings
//   dev.load         the boot timeline and the bytes
//   dev.scene        one per scene, sent as it ends: the verdict and the frame figures
//   dev.scene.cost   the same scene's cost figures (the endpoint keeps 24 fields an event, so a scene is two events)
//   dev.done         the verdict counts
import type { PlayBatch, PlayEvent } from '../../../server/src/playdata.ts';

export const DEVICE_CARD = 'device';
export type Fields = Record<string, string | number | boolean | null>;

/** Every `session` event of a device run says `bot: true`, so `npm run playtest`, `npm run heartbeat` and the server's
 * eviction order treat it as an automated browser: a device run is never read as someone playing, and never holds a
 * WORLD_NS release ("don't ship mid-session"). The newest `session` event is what GET /playdata lists, so it is on
 * every one. */
export function sessionEvent(t: number, fields: Fields): PlayEvent {
  return { t, k: 'session', ...fields, bot: true };
}

export function playBatch(session: string, n: number, now: number, ev: PlayEvent[]): PlayBatch {
  return { s: session, card: DEVICE_CARD, n, now, ev };
}

/** A string the endpoint will keep whole: cut to its limit. */
export const fit = (v: string, max = 300) => (v.length > max ? v.slice(0, max) : v);

/** A coarse device class from what the page can see; the exact user agent is stored beside it. */
export function deviceClass(touchPoints: number, coarse: boolean, width: number): 'phone' | 'tablet' | 'desktop' {
  if (!coarse && touchPoints < 2) return 'desktop';
  return Math.min(width, 4000) < 700 ? 'phone' : 'tablet';
}

/** The browser's name from a user agent (the playdata session's own coarse rule: no version). */
export function browserName(ua: string): string {
  if (/Edg\//.test(ua)) return 'edge';
  if (/(CriOS|Chrome)\//.test(ua)) return 'chrome';
  if (/(FxiOS|Firefox)\//.test(ua)) return 'firefox';
  if (/Safari\//.test(ua)) return 'safari';
  return 'other';
}

/** The fields of a scene row that go in `dev.scene`; the rest go in `dev.scene.cost`. */
export const SCENE_CORE = [
  'name',
  'idx',
  'verdict',
  'why',
  'hidden',
  'n',
  'secs',
  'p50',
  'p95',
  'p99',
  'max',
  'over33',
  'over50',
  'lt_n',
  'lt_ms',
] as const;

/** A scene row as the two events the endpoint can keep whole (24 fields an event; it drops the rest silently). */
export function sceneEvents(t: number, row: Fields): PlayEvent[] {
  const core: Fields = {};
  const cost: Fields = { name: row.name ?? null, idx: row.idx ?? null };
  for (const [k, v] of Object.entries(row)) {
    if ((SCENE_CORE as readonly string[]).includes(k)) core[k] = v;
    else if (k !== 'name' && k !== 'idx') cost[k] = v;
  }
  return [
    { t, k: 'dev.scene', ...core },
    { t, k: 'dev.scene.cost', ...cost },
  ];
}

// Problem reports to our server (POST /report, see server/README.md): JS errors, desyncs (which states, which tick),
// snapshots that would not load, and how joining a room went. Only when VITE_BOOGLE_SERVER is set; otherwise inert.
// Nothing personal: room, kind, a short detail, tick, build and a coarse browser ("Chrome 130 Android"); no names,
// no peer ids, no URLs beyond the script path. Deduped (the same report at most MAX_SAME times), at most MAX_REPORTS
// per page load, batched into one POST every FLUSH_MS (and on pagehide) via navigator.sendBeacon.
//
// Connection reports carry `hadTurn` (our ICE config from /ice listed a TURN server) and `role`, so "how many joins
// fail without TURN" (PLAN Phase 1) has an answer. Whether a relay candidate was actually gathered or used is not
// visible from here without reaching into peer-room's RTCPeerConnections, so it is not reported.
// Serves DESIGN.md "Determinism from day one" (a desync is found and named, not silently repaired). Sync kind: Local
// (nothing here is shared with other players).
import { onStart } from '../loop.js';
import { net, getRoomId } from '../net.js';
import { world, onDesync, onSnapFail } from '../world/sync.js';

const SERVER = import.meta.env.VITE_BOOGLE_SERVER;
const BUILD = import.meta.env.VITE_BUILD || import.meta.env.MODE;
const MAX_REPORTS = 20;
const MAX_SAME = 2;
const BATCH = 10; // the server takes up to 10 per POST
const FLUSH_MS = 10000;
const STUCK_MS = 30000; // still 'connecting' this long after starting (or restarting) to connect

const BROWSERS = [
  ['Edge', /Edg\/(\d+)/],
  ['Firefox', /Firefox\/(\d+)/],
  ['Chrome', /Chrome\/(\d+)/],
  ['Safari', /Version\/(\d+).*Safari/],
];
const SYSTEMS = [
  ['Android', /Android/],
  ['iOS', /iPhone|iPad/],
  ['Windows', /Windows/],
  ['Mac', /Mac OS X/],
  ['Linux', /Linux/],
];
function coarseUa(ua) {
  const b = BROWSERS.map(([name, re]) => [name, re.exec(ua)]).find(([, m]) => m);
  const os = SYSTEMS.find(([, re]) => re.test(ua));
  return `${b ? `${b[0]} ${b[1][1]}` : 'other'} ${os ? os[0] : 'other'}`;
}

// First stack frame, without the origin or query string: "at step (/boogle/assets/index-abc.js:1:2345)".
function firstFrame(stack) {
  const line = String(stack || '')
    .split('\n')
    .find((l) => /\bat\b|@/.test(l) && /:\d+/.test(l));
  return line
    ? line
        .trim()
        .replace(/[a-z-]+:\/\/[^/\s)]+/g, '')
        .replace(/\?[^:)\s]*/g, '')
        .slice(0, 150)
    : '';
}

// Peer ids (`boogle-<room>-c<random>`) and other id-like tokens (12+ letters/digits with a digit) out of messages.
const scrub = (msg) =>
  String(msg)
    .replace(/boogle-[a-z0-9-]+/gi, 'boogle-*')
    .replace(/\b(?=[a-z]*\d)[a-z0-9]{12,}\b/gi, '*');

if (SERVER) {
  const url = new URL('/report', SERVER);
  const ua = coarseUa(navigator.userAgent || '');
  const queue = [];
  const counts = new Map();
  let total = 0;

  const report = (kind, detail) => {
    const key = kind + JSON.stringify(detail);
    const n = counts.get(key) || 0;
    if (total >= MAX_REPORTS || n >= MAX_SAME) return;
    counts.set(key, n + 1);
    total++;
    queue.push({ room: getRoomId(), kind, detail, tick: world.tick, build: BUILD, ua });
  };

  // A string body goes out as text/plain, so there is no CORS preflight and it survives the page closing.
  const flush = () => {
    while (queue.length) {
      const body = JSON.stringify(queue.splice(0, BATCH));
      try {
        if (navigator.sendBeacon?.(url, body)) continue;
      } catch {
        // fall through to fetch
      }
      fetch(url, { method: 'POST', body, keepalive: true, headers: { 'content-type': 'text/plain' } }).catch(() => {});
    }
  };
  setInterval(flush, FLUSH_MS);
  addEventListener('pagehide', flush);
  addEventListener('visibilitychange', () => document.visibilityState === 'hidden' && flush());

  // ---- errors ----
  addEventListener('error', (e) => {
    if (!e.filename && !e.error) return; // 'Script error.': a cross-origin script, nothing to go on
    if (e.filename && !e.filename.startsWith(location.origin)) return; // extensions, third-party scripts
    const at = firstFrame(e.error?.stack) || `${e.filename?.replace(location.origin, '') ?? ''}:${e.lineno ?? 0}`;
    report('error', { msg: scrub(e.message || 'error').slice(0, 200), at });
  });
  addEventListener('unhandledrejection', (e) => {
    const r = e.reason;
    report('error', { msg: `unhandled: ${scrub(r?.message ?? r).slice(0, 190)}`, at: firstFrame(r?.stack) });
  });

  // ---- shared world ----
  onDesync(({ keys }) => report('desync', { keys: keys.join(',') || 'tick/order' }));
  onSnapFail(({ from, reason }) => report('snapshot', { from, reason }));

  // ---- connection: net.js keeps state 'connecting' | 'live' | 'solo'; watch its transitions ----
  onStart(() => {
    let prev = net.state;
    let prevRetries = net.retries || 0;
    let since = performance.now(); // when net.state last changed (polled once a second)
    let role = '?'; // known once we were in a room
    let wasLive = false; // since the last failure: a drop after being live is 'lost', not a failed 'join'
    let okSent = false;
    let stuckSent = false;
    setInterval(() => {
      const now = performance.now();
      const s = net.state;
      const retries = net.retries || 0;
      if (net.room) role = net.room.isHost() ? 'host' : 'client';
      const base = { role, hadTurn: net.turn };
      if (s === 'solo' && (prev !== 'solo' || retries !== prevRetries)) {
        report('connect', { result: 'fail', phase: wasLive ? 'lost' : 'join', error: net.error, ...base });
      } else if (s === 'live' && prev !== 'live' && !okSent) {
        okSent = true;
        report('connect', { result: 'ok', ms: Math.round(now - since), retries, ...base }); // ms spent 'connecting'
      } else if (s === 'connecting' && prev === 'connecting' && !stuckSent && now - since > STUCK_MS) {
        stuckSent = true;
        report('connect', { result: 'stuck', ...base });
      }
      if (s === 'live') wasLive = true;
      else if (s === 'solo') wasLive = false;
      if (s !== prev) since = now;
      prev = s;
      prevRetries = retries;
    }, 1000);
  });
}

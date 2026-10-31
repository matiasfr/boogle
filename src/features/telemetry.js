// Problem reports to our server (POST /report, see server/README.md): JS errors, desyncs (which states, which tick),
// snapshots that would not load, and how joining a room went. Only when VITE_BOOGLE_SERVER is set; otherwise inert.
// Nothing personal: room, kind, a short detail, tick, build and a coarse browser ("Chrome 130 Android"); no names,
// no peer ids, no URLs beyond the script path. Deduped (the same report at most MAX_SAME times), at most MAX_REPORTS
// per page load, batched into one POST every FLUSH_MS (and on pagehide) via navigator.sendBeacon.
//
// Connection reports carry `hadTurn` (our ICE config from /ice listed a TURN server) and `role`. A good join also says
// how many of its links went through the TURN relay (`relayed` of `links`, from room.linkStats()): a relayed link is
// one that would have failed without TURN, which answers PLAN Phase 1's "how many fail without TURN". `rttMs` is the
// slowest link's round trip; a non-owner sees the ball about rtt (owner -> host -> them) + INTERP_MS late. They also
// say whether the room was running mixed builds (`mixedBuilds`, src/netplay/builds.js; a yes or no, never the ids).
// Serves DESIGN.md "Determinism from day one" (a desync is found and named, not silently repaired). Sync kind: Local
// (nothing here is shared with other players).
import { net, getRoomId, onNetState } from '../netplay/net.js';
import { world, onDesync, onSnapFail } from '../world/sync.js';
import { mixedBuilds } from '../netplay/builds.js';
import { coarseUa, firstFrame, scrub } from '../netplay/report-format.js';

const SERVER = import.meta.env.VITE_BOOGLE_SERVER;
const BUILD = import.meta.env.VITE_BUILD || import.meta.env.MODE;
const MAX_REPORTS = 20;
const MAX_SAME = 2;
const BATCH = 10; // the server takes up to 10 per POST
const FLUSH_MS = 10000;
const STUCK_MS = 30000; // still 'connecting' this long after starting (or restarting) to connect
const SETTLE_MS = 3000; // a successful join reports after this, once peers' presence (and builds) has arrived

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

  // ---- connection: net.js reports every change of net.state ('connecting' | 'live' | 'solo') ----
  let since = performance.now(); // when the current attempt started connecting (page load for the first one)
  let role = '?'; // known once we were in a room
  let wasLive = false; // since the last failure: a drop after being live is 'lost', not a failed 'join'
  let failed = 0; // failed attempts before the first good join
  let okSent = false;
  let stuckSent = false;
  let stuckTimer = 0;
  const base = () => ({ role, hadTurn: net.turn, mixedBuilds: mixedBuilds(), gfx: window.boogle?.gfx });
  const armStuck = () => {
    clearTimeout(stuckTimer);
    stuckTimer = setTimeout(() => {
      if (net.state !== 'connecting' || stuckSent) return;
      stuckSent = true;
      report('connect', { result: 'stuck', ...base() });
    }, STUCK_MS);
  };
  if (net.state === 'connecting') armStuck();
  onNetState((s, prev) => {
    if (net.room) role = net.room.isHost() ? 'host' : 'client';
    if (s !== 'connecting') clearTimeout(stuckTimer);
    if (s === 'connecting' && prev !== 'connecting') {
      since = performance.now();
      armStuck();
    } else if (s === 'live') {
      if (!okSent) {
        okSent = true;
        const ms = Math.round(performance.now() - since); // ms spent 'connecting'
        const at = { ms, retries: failed, role, hadTurn: net.turn };
        setTimeout(async () => {
          const links = (await net.room?.linkStats?.().catch(() => null)) ?? [];
          const rtts = links.map((l) => l.rttMs).filter((v) => v !== null);
          const path = { links: links.length, relayed: links.filter((l) => l.relay).length };
          if (rtts.length) path.rttMs = Math.max(...rtts);
          report('connect', { result: 'ok', ...at, ...path, mixedBuilds: mixedBuilds(), gfx: window.boogle?.gfx });
        }, SETTLE_MS);
      }
      wasLive = true;
    } else if (s === 'solo') {
      // every failed attempt, including a retry that never reached a room (solo -> solo)
      if (!okSent) failed++;
      report('connect', { result: 'fail', phase: wasLive ? 'lost' : 'join', error: net.error, ...base() });
      wasLive = false;
    }
  });
}

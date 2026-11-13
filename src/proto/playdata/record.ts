// What a session on a `?proto=` page did, uploaded to our server as it happens (POST /playdata, server/src/playdata.ts) so
// the director can read it before hearing about it: `npm run playtest`, dev/playtest/. Only the owner and his friends
// play these and they consent; `&notrack=1` turns it off. Loaded by src/features/playdata.ts.
//   The session: who, room, card, variant, flags, build, device, browser, viewport; who else is in the room.
//   Once a second: position to the metre, activity, and the place if the prototype names one (`playWhere`).
//   Marks: `playMark` (src/proto/mark.ts), which `protoMark`, `protoCount` and the objective line (`playObjective`) reach.
//   Inputs in summary: presses per action, which device, interact presses with their verbs, prompts shown.
//   Stuck: standing still, walking into something, falling in the water and getting out (./water-episode.ts), being
//   moved far (a respawn).
//   Performance: frame times per few seconds, resolution steps, errors once each.
// No audio, no typed text but the player's name.
//
// Never in a frame's way: a frame does a few comparisons; the sort and the JSON run on a timer. Batches leave every few
// seconds with a keepalive fetch and a `sendBeacon` when the tab hides, text/plain so there is no preflight. Offline
// they wait, with a bounded queue and a bounded total per session. Sync kind: Local (nothing goes to other players).
// Serves DESIGN.md "How we work".
import { onFrame, onStart, prof } from '../../loop.ts';
import { me } from '../../player/player.ts';
import { inv } from '../../player/inventory.ts';
import { carry } from '../../physics/platforms.ts';
import { interactTarget, onInteractPress } from '../../player/hands.ts';
import { actionIds, wrapAction } from '../../player/controls.ts';
import { renderer, rendererReady, gfx } from '../../render/scene.ts';
import { getRoomId, onNetState, onPeopleChanged, remotes } from '../../netplay/net.ts';
import { coarseUa, firstFrame, scrub } from '../../netplay/report-format.ts';
import { BUILD } from '../../build-id.ts';
import { IDLE_S } from '../../../protos/store.ts';
import { CARD, protoV, pageQuery, productionRailway } from '../flags.ts';
import { railwayWorldRead } from '../../entities/railway/state.ts';
import { qjob } from '../../sim/railway-rows.ts';
import { line2Completed, line2Trains } from '../../sim/railway-queries-line2.ts';
import { createRailwayJourneyMarks } from '../../adapters/railway-marks.ts';
import { HEAD, ORIGIN } from '../../place/layout.ts';
import { currentCard } from '../card.ts';
import { hookActivity, onPlayMark, onRosterSnapshot, playMark, playWhereNow, type PlayData } from '../mark.ts';
import type { PlayEvent } from '../../../server/src/playdata.ts';
import { onTuneRecord } from '../../tunables/events.ts';
import { tuningVisit } from '../../dev-preferences.ts';
import { background } from '../../async.ts';
import { bootMarks } from '../../boot/timeline.ts';
import { roomSeed } from '../../netplay/room-seed.ts';
import { stepWaterEpisode, waterEpisode } from './water-episode.ts';

const SERVER = import.meta.env.VITE_BOOGLE_SERVER;
const SEND_MS = 5000;
const FIRST_MS = 2000; // the first batch, so a page that dies loading still shows up
const BACKOFF_MAX_MS = 60_000;
const BATCH_EVENTS = 400;
const BATCH_BYTES = 40_000; // a beacon or keepalive body may be 64 KB at most
const QUEUE = 4000; // events waiting (offline); past it the oldest quarter goes
const SESSION_BYTES = 3_500_000; // under the server's cap; past it this session stops
const MARKS_PER_WINDOW = 200; // a prototype marking in a loop
const STILL = 0.4; // m/s: slower than this is standing still
const INTO_S = 1.5; // s pushing without moving that counts as walking into something
const FAR = 30; // m in a second, not carried: you were moved (a respawn, a teleport)
const PERF_WINDOW = 1024; // frames kept per window
const CPU_EVERY = 6; // perf windows between the per-section CPU lines
const PROMPTS_PER_ID = 8; // a prompt coming and going
const ERRORS = 40;
const STALL_MS = 3000; // a 1 s timer this late: the page stopped

const round = (v: number) => Math.round(v);
const clock = (ms = performance.now()) => Math.round(ms / 100) / 10; // s since the page loaded, to a tenth

// ---------------------------------------------------------------- the queue and the wire
const session = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10).padEnd(4, '0')}`;
const url = new URL('/playdata', SERVER);
const queue: PlayEvent[] = [];
let dropped = 0;
let nextBatch = 0;
let pending: string | null = null; // a batch on its way, or waiting to be retried (same number, so readers can drop repeats)
let busy = false;
let retryAt = 0;
let backoff = SEND_MS;
let sentBytes = 0;
let stopped = false;

const card = currentCard?.id ?? CARD;

function push(k: string, fields: Record<string, string | number | boolean | null> = {}, ms?: number) {
  if (stopped) return;
  if (queue.length >= QUEUE) dropped += queue.splice(0, QUEUE >> 2).length;
  queue.push({ t: clock(ms), k, ...fields });
}

// Complete configuration segments bypass the mark-rate budget. Queue loss remains explicit;
// summaries reject missing begin/value/end records instead of guessing a configuration.
onTuneRecord(push);
// Like tune segments, all rows of one snapshot enter the queue synchronously without spending marks.
onRosterSnapshot(({ rows, tick }) => {
  push('roster.begin', { tick, count: rows.length });
  rows.forEach(([pid, name, color], ordinal) => push('roster.player', { pid, name, color, ordinal, tick }));
  push('roster.end', { tick, count: rows.length });
});
function recordTuning() {
  if (tuningVisit)
    background(
      import('../../debug/dev/tunables.ts').then((m) => m.recordTuneSnapshot()),
      'playdata tuning',
    );
}
onStart(recordTuning);

function makeBatch(): string | null {
  if (dropped) {
    queue.unshift({ t: clock(), k: 'dropped', n: dropped });
    dropped = 0;
  }
  if (!queue.length) return null;
  const ev: PlayEvent[] = [];
  let size = 0;
  while (queue.length && ev.length < BATCH_EVENTS) {
    size += JSON.stringify(queue[0]).length + 1;
    if (size > BATCH_BYTES && ev.length) break;
    ev.push(queue.shift()!);
  }
  return JSON.stringify({ s: session, card, n: nextBatch++, now: clock(), ev });
}

function stop(why: string) {
  stopped = true;
  queue.length = 0;
  pending = null;
  console.info(`[playdata] stopped: ${why}`);
}

async function pump() {
  if (busy || stopped || performance.now() < retryAt) return;
  busy = true;
  try {
    while (!stopped && (pending ??= makeBatch())) {
      const body = pending;
      let status = 0;
      try {
        const r = await fetch(url, {
          method: 'POST',
          body,
          keepalive: true,
          headers: { 'content-type': 'text/plain' },
        });
        status = r.status;
      } catch {
        // offline: try again later
      }
      if (status === 204) {
        sentBytes += body.length;
        backoff = SEND_MS;
        if (pending === body) pending = null;
        if (sentBytes > SESSION_BYTES) stop('this session is full');
      } else if (status === 400 || status === 413 || status === 507) {
        stop(`the server says ${status}`); // sending the same again won't help
      } else {
        backoff = Math.min(BACKOFF_MAX_MS, backoff * 2);
        retryAt = performance.now() + backoff;
        break;
      }
    }
  } finally {
    busy = false;
  }
}

/** The tab is going away, maybe for good: everything left goes out now. */
function beaconAll() {
  if (stopped || typeof navigator.sendBeacon !== 'function') return void pump();
  try {
    for (let i = 0; i < 16 && (pending ??= makeBatch()); i++) {
      if (!navigator.sendBeacon(url, pending)) break; // over the browser's quota: it stays for later, if there is a later
      sentBytes += pending.length;
      pending = null;
    }
  } catch {
    // keep what's left for the next try
  }
}

// ---------------------------------------------------------------- the session
function device() {
  const ua = navigator.userAgent || '';
  if (/iPad/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)) return 'iPad';
  if (/iPhone/.test(ua)) return 'iPhone';
  if (/Android/.test(ua)) return /Mobile/.test(ua) ? 'Android phone' : 'Android tablet';
  return 'desktop';
}
let gpu = '';
function resolution() {
  const dpr = renderer.getPixelRatio();
  return { dpr: Math.round(dpr * 100) / 100, w: round(innerWidth * dpr), h: round(innerHeight * dpr) };
}
let lastSession = '';
let seed = ''; // the stage a playtest jump room was seeded at (docs/plans/playtest-jump-in.md), from the room
function sayWho() {
  const fields = {
    name: me.name || '',
    seed,
    railway: productionRailway,
    room: getRoomId(),
    card,
    v: protoV(card),
    flags: pageQuery().toString().slice(0, 199),
    build: BUILD,
    device: device(),
    browser: coarseUa(navigator.userAgent || ''),
    vw: innerWidth,
    vh: innerHeight,
    ...resolution(),
    gfx: gfx(),
    gpu,
    touch: navigator.maxTouchPoints > 0,
    bot: !!navigator.webdriver,
    wall: Date.now(),
  };
  const sig = JSON.stringify({ ...fields, wall: 0 });
  if (sig === lastSession) return;
  lastSession = sig;
  push('session', fields);
}
sayWho();
console.info(`[playdata] session ${session}`);
background(
  roomSeed().then((s) => {
    seed = s?.stage ?? '';
    sayWho();
  }),
  'playdata seed',
);

void rendererReady.then(() => {
  const info = (
    renderer.backend as unknown as { device?: { adapterInfo?: { vendor?: string; architecture?: string } } }
  ).device?.adapterInfo;
  gpu = [info?.vendor, info?.architecture].filter(Boolean).join(' ').slice(0, 80);
  sayWho();
});

let lastPeers = '';
onPeopleChanged(() => {
  const names = [...remotes.values()]
    .filter((r) => r.entered) // before that a name is only a placeholder
    .map((r) => r.name || '?')
    .sort()
    .join(', ')
    .slice(0, 200);
  if (names === lastPeers) return;
  lastPeers = names;
  push('peers', { names });
});
onNetState((s) => {
  push('net', { s });
  sayWho(); // the room is settled by now
  if (s === 'live') recordTuning();
});

// ---------------------------------------------------------------- marks
const here = (): Record<string, number> => {
  const b = me.body?.position;
  return b ? { x: round(b.x), z: round(b.z) } : {};
};
let marksLeft = MARKS_PER_WINDOW;
let lastObjective = '';
let lastObjectiveAt = 0;
onPlayMark((name, data: PlayData | undefined, ms) => {
  if (name === 'objective') {
    // A countdown ticking in the line isn't a new objective every second: the same words wait a few seconds.
    const text = String(data?.text ?? '');
    const same = text.replace(/\d+/g, '#') === lastObjective.replace(/\d+/g, '#');
    if (text === lastObjective || (same && ms - lastObjectiveAt < 5000)) return;
    lastObjective = text;
    lastObjectiveAt = ms;
    push('objective', { text: text.slice(0, 120), ...here() }, ms);
    return;
  }
  if (marksLeft-- <= 0) return void dropped++;
  const fields: Record<string, string | number | boolean | null> = { n: name.slice(0, 40), ...here() };
  for (const [k, v] of Object.entries(data ?? {}).slice(0, 12))
    if (v !== undefined && !(k in fields) && k !== 't' && k !== 'k') fields[k] = v;
  push('m', fields, ms);
});
push('step', { card, v: protoV(card) });

// ---------------------------------------------------------------- inputs, in summary
const acts: Record<string, number> = {};
const count = (id: string) => void (acts[id] = (acts[id] ?? 0) + 1);
const wrapped = new Set<string>();
function wrapNew() {
  for (const id of actionIds()) {
    if (wrapped.has(id)) continue;
    wrapped.add(id);
    wrapAction(id, {
      down: (next) => {
        count(id);
        next();
      },
    });
  }
}
onStart(wrapNew);
const used = { key: 0, touch: 0, mouse: 0, pad: 0 };
addEventListener('keydown', () => used.key++, { capture: true, passive: true }); // that a key went down, never which
addEventListener(
  'pointerdown',
  (e) => {
    if (e.pointerType === 'touch') used.touch++;
    else used.mouse++;
  },
  { capture: true, passive: true },
);
function padsNow() {
  for (const p of navigator.getGamepads?.() ?? []) if (p?.buttons.some((b) => b.pressed)) used.pad++;
}
onInteractPress((t, ran) => {
  if (!t) {
    count('press nothing');
    const p = me.body?.position;
    let nearest: { id: string; verb: string; distance: number } | null = null;
    if (p)
      for (const [id, prompt] of seenPrompts) {
        const distance = Math.hypot(p.x - prompt.x, p.y - prompt.y, p.z - prompt.z);
        if (!nearest || distance < nearest.distance) nearest = { id, verb: prompt.verb, distance };
      }
    if (marksLeft-- > 0)
      push('press', {
        verb: 'nothing in reach',
        id: '',
        ran: false,
        nearest: nearest?.id ?? '',
        nearestVerb: nearest?.verb ?? '',
        distance: nearest ? round(nearest.distance) : -1,
        context: 'nearest previously shown prompt',
        last: lastShownPrompt?.id ?? '',
        ago: lastShownPrompt ? round((performance.now() - lastShownPrompt.at) / 1000) : -1,
        ...here(),
      });
    return;
  }
  push('press', {
    verb: t.verb.slice(0, 40),
    id: t.id.slice(0, 60),
    ran,
    why: typeof t.blocked === 'string' ? t.blocked.slice(0, 60) : null,
    ...here(),
  });
});
let lastPrompt = '';
let lastShownPrompt: { id: string; verb: string; at: number } | null = null;
const seenPrompts = new Map<string, { verb: string; x: number; y: number; z: number }>();
let reachedHead = false;
const journeyMarks = createRailwayJourneyMarks();
const promptsOf = new Map<string, number>();

// ---------------------------------------------------------------- each frame: small comparisons, no garbage
const intervals = new Float32Array(PERF_WINDOW);
let nIntervals = 0;
let lastFrame = 0;
let lastSampleMs = 0;
let lastJump = 0;
let stillS = 0;
let intoS = 0;
let spotX = 0;
let spotZ = 0;
const swim = waterEpisode();
let lastX = NaN;
let lastZ = NaN;
let wasCarried = false;
let lastV = '';
let wasEntered = false;

const activity = () => {
  const hook = hookActivity();
  if (hook) return hook;
  if (carry.on) return 'riding';
  if (inv.held) return 'carrying'; // anything in your hand; loads on your back come from hookActivity
  if (me.swimming) return 'swimming';
  return stillS >= IDLE_S ? 'idle' : 'walking';
};

function markSpot() {
  const b = me.body!.position;
  spotX = round(b.x);
  spotZ = round(b.z);
}
function endStill(ms: number) {
  if (stillS >= IDLE_S) push('idle', { x: spotX, z: spotZ, s: round(stillS) }, ms - stillS * 1000);
  stillS = 0;
}
function endInto(ms: number) {
  if (intoS >= INTO_S) push('into', { x: spotX, z: spotZ, s: Math.round(intoS * 10) / 10 }, ms - intoS * 1000);
  intoS = 0;
}

function sample(ms: number) {
  const b = me.body!.position;
  const x = round(b.x),
    z = round(b.z);
  const a = activity();
  const read = productionRailway ? railwayWorldRead() : null;
  const w = read?.world();
  if (read && w && read.ready())
    for (const [name, data] of journeyMarks(b, carry.on?.id, line2Trains(w), qjob(w, 5).completion === 1, me.swimming))
      playMark(name, data);
  if (
    productionRailway &&
    !reachedHead &&
    !me.swimming &&
    (w ? line2Completed(w) : 0) >= 5 &&
    Math.abs(b.y - HEAD.y) < 5 &&
    Math.hypot(b.x - HEAD.x - ORIGIN.x, b.z - HEAD.z - ORIGIN.z) < HEAD.r
  ) {
    reachedHead = true;
    if (marksLeft-- > 0) push('m', { n: 'Far Head reached', authority: 'local', ...here() }, ms);
  }
  const where = playWhereNow();
  const carried = !!carry.on || a === 'driving';
  if (!carried && !wasCarried && Math.hypot(x - lastX, z - lastZ) > FAR)
    push('moved', { x, z, fx: lastX, fz: lastZ }, ms);
  wasCarried = carried;
  lastX = x;
  lastZ = z;
  const fields: Record<string, string | number> = { x, y: round(b.y), z, a };
  if (where) fields.w = where.slice(0, 40);
  push('p', fields, ms);
  const v = protoV(card);
  if (v !== lastV) push('variant', { v });
  lastV = v;
}

// After every feature's frame work and before the presence send.
onFrame(
  () => {
    const ms = performance.now();
    // The real interval: the frame's dt stops at 50 ms, which would hide the slowest devices.
    const frameS = lastFrame ? Math.min(1, (ms - lastFrame) / 1000) : 0;
    if (lastFrame && nIntervals < PERF_WINDOW) intervals[nIntervals++] = ms - lastFrame;
    lastFrame = ms;
    if (!me.entered || !me.body) return;
    if (!wasEntered) {
      wasEntered = true;
      sayWho(); // now it has your name
      push('entered', here());
    }
    if (me.jumpPresses > lastJump) count('jump');
    lastJump = me.jumpPresses;

    const v = me.body.velocity;
    const moving = Math.hypot(v.x, v.z) > STILL || !!carry.on || hookActivity() === 'driving';
    const pushing = Math.hypot(me.wish.x, me.wish.z) > 0.1;
    if (moving) {
      endStill(ms);
      endInto(ms);
    } else if (pushing) {
      endStill(ms);
      if (intoS === 0) markSpot();
      intoS += frameS;
    } else {
      endInto(ms);
      if (stillS === 0) markSpot();
      stillS += frameS;
    }

    const water = stepWaterEpisode(swim, me.swimming, me.coyote > 0 && !me.swimming, ms);
    if (water?.kind === 'fell') push('m', { n: 'fell in water', ...here() });
    else if (water) push('m', { n: 'recovered', s: round(water.seconds), ...here() }, water.at);

    const target = interactTarget();
    const prompt = target?.id ?? '';
    if (target && (seenPrompts.has(prompt) || seenPrompts.size < 128))
      seenPrompts.set(prompt, { verb: target.verb.slice(0, 40), x: target.at.x, y: target.at.y, z: target.at.z });
    if (prompt !== lastPrompt) {
      lastPrompt = prompt;
      if (target) {
        lastShownPrompt = { id: prompt.slice(0, 60), verb: target.verb.slice(0, 40), at: ms };
        const n = (promptsOf.get(prompt) ?? 0) + 1;
        promptsOf.set(prompt, n);
        if (n <= PROMPTS_PER_ID) push('prompt', { verb: target.verb.slice(0, 40), id: prompt.slice(0, 60), ...here() });
      }
    }

    if (ms - lastSampleMs >= 1000) {
      lastSampleMs = ms;
      sample(ms);
    }
  },
  { phase: 'late', order: 1950, name: 'playdata' },
);

// ---------------------------------------------------------------- on a timer: performance, inputs, the send
let perfWindows = 0;
let lastRes = '';
function perf() {
  padsNow();
  wrapNew();
  marksLeft = MARKS_PER_WINDOW;
  if (Object.keys(acts).length || used.key || used.touch || used.mouse || used.pad) {
    const line = Object.entries(acts)
      .map(([k, n]) => `${k}=${n}`)
      .join(',')
      .slice(0, 280);
    push('in', { acts: line, ...used });
    for (const k of Object.keys(acts)) delete acts[k];
    used.key = used.touch = used.mouse = used.pad = 0;
  }
  const res = resolution();
  const sig = `${res.dpr} ${res.w} ${res.h}`;
  if (sig !== lastRes) {
    if (lastRes) push('res', res);
    lastRes = sig;
  }
  if (document.hidden || nIntervals < 2) {
    nIntervals = 0;
    return;
  }
  const sorted = intervals.subarray(0, nIntervals).sort();
  const at = (q: number) => Math.round(sorted[Math.min(nIntervals - 1, Math.floor(nIntervals * q))]! * 10) / 10;
  const info = renderer.info.render as unknown as { calls?: number; drawCalls?: number };
  const fields: Record<string, string | number> = {
    n: nIntervals,
    p50: at(0.5),
    p95: at(0.95),
    max: at(1),
    dpr: res.dpr,
    calls: info.drawCalls ?? info.calls ?? 0,
  };
  // Where the CPU's frame goes, now and then: the table sorts a ring per section, so not every window.
  if (++perfWindows % CPU_EVERY === 1)
    fields.cpu = prof
      .table(4)
      .map((r) => `${r.name.split('/').pop()} ${r.avg.toFixed(1)}`)
      .join(', ')
      .slice(0, 200);
  push('perf', fields);
  nIntervals = 0;
}
setTimeout(() => void pump(), FIRST_MS);
setInterval(() => {
  perf();
  void pump();
}, SEND_MS);

// A page that stops running while visible: a 1 s timer more than 3 s late, with no real hide in between. Loading
// included (no frames run then, so src/boot/startup-frames.ts' 'long frame' can't see it). On 9 November an iPhone
// sent nothing for 29 s at Far Head and its reloads stalled 24-40 s while loading. A stalled page's queued
// visibility events all read "visible", so only a hide seen as hidden excuses the gap. Twelve at most.
let tickAt = performance.now(),
  hidSinceTick = false,
  stalls = 0;
document.addEventListener('visibilitychange', () => {
  if (document.hidden) hidSinceTick = true;
});
setInterval(() => {
  const now = performance.now();
  if (now - tickAt > STALL_MS && !hidSinceTick && !document.hidden && stalls < 12) {
    stalls++;
    playMark('page stalled', {
      ms: round(now - tickAt),
      phase: bootMarks().at(-1)?.name ?? '',
      frames: prof.last.frames,
    });
  }
  tickAt = now;
  hidSinceTick = false;
}, 1000);

// ---------------------------------------------------------------- errors, each message once
const seen = new Set<string>();
function error(src: string, msg: unknown, stack?: unknown) {
  const text = scrub(msg).slice(0, 200);
  if (seen.size >= ERRORS || seen.has(text)) return;
  seen.add(text);
  push('error', { src, msg: text, at: firstFrame(stack) });
}
addEventListener('error', (e) => {
  if (e.filename && !e.filename.startsWith(location.origin)) return; // extensions, third-party scripts
  error('error', e.message || 'error', e.error?.stack);
});
addEventListener('unhandledrejection', (e) => error('rejection', e.reason?.message ?? e.reason, e.reason?.stack));
const consoleError = console.error;
console.error = (...args: unknown[]) => {
  consoleError.apply(console, args);
  try {
    const first = args.find((a) => a instanceof Error) as Error | undefined;
    error('console', args.map((a) => (a instanceof Error ? a.message : String(a))).join(' '), first?.stack);
  } catch {
    // something that won't stringify
  }
};

// ---------------------------------------------------------------- the tab hides, the page goes
function closeSpans(ms = performance.now()) {
  endStill(ms);
  endInto(ms);
}
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    closeSpans();
    push('hide', here());
    perf();
    beaconAll();
  } else {
    lastFrame = 0;
    retryAt = 0;
    push('show');
  }
});
addEventListener('pagehide', () => {
  closeSpans();
  push('end', here());
  beaconAll();
});
addEventListener('pageshow', (e) => {
  if (e.persisted) push('resume');
});
addEventListener('online', () => {
  retryAt = 0;
  void pump();
});

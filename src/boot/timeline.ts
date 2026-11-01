// The boot timeline: when each loading phase finished, in ms since the navigation started (performance.now()), so a
// load can be read phase by phase and compared across browsers, cold and warm (docs/plans/loading.md). Local only,
// always on (a few performance.mark calls). The page's entry (./index.ts) imports it first, so it holds no imports.
//
//   bootMark(name, detail?)   a phase just finished: also a performance.mark('boot:<name>') for the browser's profiler
//   bootSpan(name, ms)        a duration that isn't a point on the line (WGSL generation inside the shader warm-up)
//   bootLine()                the whole load as one line, for a bug report or a spreadsheet:
//     boot b=4f2a91c nav=navigate sw=1 html=95 entry=110 modules=380 rapier=405 gpu=430 terrain=455 props=470
//          shaders=910 first=960 interactive=962 room=700 | shaders 82p 60pl 440ms wgsl=180 mod=12 | 43 req (0 sw)
//          1.2 MB net 3.0 MB decoded
//   bootDone()                resolves with the timeline once the game is interactive and in a room (or 20 s on)
//
// window.boogle.boot holds it in the console, ?prof=1 prints the line, and on a local build `?boottrace=<port>` sends it
// to http://127.0.0.1:<port>/ (dev/look/boot-time.ts collects them from Chrome and Safari).
//
// Phases, in boot order: html (the HTML parsed: domInteractive), entry (this module ran), modules (every eager game
// module evaluated, src/main.ts), rapier (physics WASM in), gpu (the WebGPU device), terrain and props (meshes built),
// shaders (the warm-up done), first (one frame drawn), interactive ("Jump in" enabled and the loading screen gone),
// room (joined a room on our server; it races the GPU, so it can come before or after).

export type BootMark = { name: string; t: number; detail?: Record<string, number | string> };
const marks: BootMark[] = [];
const spans: Record<string, number> = {};
const round = (x: number) => Math.round(x);

export function bootMark(name: string, detail?: Record<string, number | string>) {
  if (marks.some((m) => m.name === name)) return; // first one wins (a retry, a second room)
  const t = performance.now();
  try {
    performance.mark(`boot:${name}`, { detail });
  } catch {
    // an old browser's mark takes no options: the line below still has it
  }
  marks.push({ name, t: round(t), detail });
  beacon(JSON.stringify({ mark: name, t: round(t), hidden: document.hidden }));
  if (name === 'interactive' || name === 'room') maybeDone();
}

export function bootSpan(name: string, ms: number) {
  spans[name] = (spans[name] ?? 0) + ms;
}
/** A span's total so far, in whole ms. */
export const bootSpanMs = (name: string) => round(spans[name] ?? 0);

function nav() {
  const n = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
  return n;
}

// What came over the network up to now: requests, bytes on the wire (0 for the HTTP cache and the service worker) and
// bytes decoded. The browser's resource buffer holds 250 entries by default, plenty for a boot.
function transfer() {
  const res = (performance.getEntriesByType('resource') as PerformanceResourceTiming[]).filter(
    (r) => r.initiatorType !== 'beacon', // ?boottrace's own
  );
  let net = 0,
    body = 0,
    fromSw = 0;
  for (const r of res) {
    net += r.transferSize || 0;
    body += r.decodedBodySize || 0;
    if (r.workerStart > 0 && !r.transferSize) fromSw++;
  }
  return { req: res.length, net, body, fromSw };
}

export function bootTimeline() {
  const n = nav();
  const all: BootMark[] = [];
  if (n) all.push({ name: 'html', t: round(n.domInteractive) });
  all.push(...marks);
  return {
    build: String(import.meta.env.VITE_BUILD ?? '').slice(0, 12),
    nav: n?.type ?? 'unknown',
    sw: navigator.serviceWorker?.controller ? 1 : 0,
    ua: navigator.userAgent,
    marks: all,
    spans: Object.fromEntries(Object.entries(spans).map(([k, v]) => [k, round(v)])),
    ...transfer(),
  };
}

const kb = (b: number) => (b > 1e6 ? `${(b / 1e6).toFixed(1)} MB` : `${round(b / 1e3)} KB`);
export function bootLine() {
  const tl = bootTimeline();
  const at = tl.marks.map((m) => `${m.name}=${m.t}`).join(' ');
  const sh = tl.marks.find((m) => m.name === 'shaders')?.detail;
  const shaders = sh
    ? ` | shaders ${sh.programs}p ${sh.pipelines}pl ${sh.ms}ms wgsl=${sh.wgsl} mod=${sh.shaderModule}`
    : '';
  return (
    `boot b=${tl.build} nav=${tl.nav} sw=${tl.sw} ${at}${shaders} | ${tl.req} req (${tl.fromSw} sw) ` +
    `${kb(tl.net)} net ${kb(tl.body)} decoded`
  );
}

let resolveDone: (tl: ReturnType<typeof bootTimeline>) => void;
export const bootDone = new Promise<ReturnType<typeof bootTimeline>>((r) => (resolveDone = r));
let finished = false;
function finish() {
  if (finished) return;
  finished = true;
  const tl = bootTimeline();
  resolveDone(tl);
  report(tl);
}
function maybeDone() {
  if (marks.some((m) => m.name === 'interactive') && marks.some((m) => m.name === 'room')) finish();
}
setTimeout(finish, 20000); // no room (offline, no server): report what there is

// ?boottrace=<port>: send the timeline to a collector on this machine (dev/look/boot-time.ts). Only from a page served
// by this machine, only to 127.0.0.1, and nothing in it names the player.
// A first beacon ({ hello }) at once tells the collector the page opened at all.
const tracePort = Number(new URLSearchParams(location.search).get('boottrace'));
const traceTo = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname) && tracePort > 0 ? tracePort : 0;
function beacon(body: string) {
  if (!traceTo) return;
  try {
    navigator.sendBeacon(`http://127.0.0.1:${traceTo}/`, new Blob([body], { type: 'text/plain' }));
  } catch {
    // no beacon: the harness times out and says so
  }
}
beacon(JSON.stringify({ hello: location.pathname + location.search }));
addEventListener('error', (e) => beacon(JSON.stringify({ error: String(e.message) })));
addEventListener('unhandledrejection', (e) => beacon(JSON.stringify({ error: String(e.reason) })));
function report(tl: ReturnType<typeof bootTimeline>) {
  beacon(JSON.stringify({ ...tl, line: bootLine(), url: location.pathname + location.search }));
}

bootMark('entry');

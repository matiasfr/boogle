// Load time, phase by phase, in a production build (docs/plans/loading.md). Builds the game against a local game
// server, serves it with `vite preview`, opens it cold (a new origin, so an empty HTTP cache and no service worker) and
// then warm (reloads on the same origin), and collects each page's boot timeline (src/boot/timeline.ts), which the page
// sends here with `?boottrace=<port>`.
//
//   node dev/look/boot-time.ts                       Chrome (Playwright's Chromium on Metal), 3 cold loads x (1 + 2 warm)
//   node dev/look/boot-time.ts --safari           the same in Safari on this Mac (opens tabs in the real Safari)
//   node dev/look/boot-time.ts --runs 5 --warm 3 --no-build --sw 0
//   node dev/look/boot-time.ts --latency 60 --mbps 50   Chrome with each request delayed 60 ms and 50 Mbit/s
//
// --sw 0 opens every page with ?sw=0 (no service worker: the HTTP cache alone). Prints a table of medians per phase
// and the raw lines; --json writes them all to a file. Safari tabs are closed through AppleScript if this terminal may
// script Safari, else left open (close them by hand).
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import { spawn, spawnSync, type ChildProcess } from 'node:child_process';
import { createService, loadConfig } from '../../server/src/server.ts';
import { launch, freePort, root, sleep } from './lib.mjs';

type Timeline = { line: string; nav: string; sw: number; marks: { name: string; t: number }[]; req: number };
const argv = process.argv.slice(2);
const flag = (name: string) => argv.includes(`--${name}`);
const opt = (name: string, def: string) => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : def;
};
const RUNS = Number(opt('runs', '3'));
const WARM = Number(opt('warm', '2'));
const SAFARI = flag('safari');
const SW = opt('sw', '1');
const LATENCY = Number(opt('latency', '0')); // Chrome only: ms per request, for a connection like the live site's
const MBPS = Number(opt('mbps', '50'));
const OUT = path.join(os.tmpdir(), 'boogle-boot-time');
const PHASES = [
  'html',
  'entry',
  'modules',
  'rapier',
  'gpu',
  'terrain',
  'props',
  'shaders',
  'first',
  'interactive',
  'room',
];

// The game's server, so the page joins a room like on the live site.
const data = fs.mkdtempSync(path.join(os.tmpdir(), 'boogle-boot-'));
const server = createService(loadConfig({ DATA_DIR: data, SERVER_ROOMS: '*' }, { log: () => {} }));
const sigPort = await server.listen(0);

if (!flag('no-build')) {
  const r = spawnSync(process.execPath, [path.join(root, 'node_modules/vite/bin/vite.js'), 'build', '--outDir', OUT], {
    cwd: root,
    stdio: ['ignore', 'ignore', 'inherit'],
    env: { ...process.env, VITE_BOOGLE_SERVER: `http://127.0.0.1:${sigPort}`, VITE_BUILD: 'boottime' },
  });
  if (r.status) throw new Error('vite build failed');
} else {
  console.log('--no-build: the build in', OUT, 'must point at a server on port', sigPort, '(rooms will not join)');
}

// The collector: each page's timeline arrives as one POST.
let waiting: ((t: Timeline) => void) | null = null;
// Each mark as it happens too: a page that never finishes (a hidden Safari window stops drawing) still shows how far
// it got. --verbose prints them.
let partial: { name: string; t: number }[] = [];
let hiddenSeen = false;
const collector = http.createServer((req, res) => {
  let body = '';
  req.on('data', (c) => (body += c));
  req.on('end', () => {
    res.writeHead(204, { 'access-control-allow-origin': '*' }).end();
    try {
      const msg = JSON.parse(body);
      if (msg.mark) {
        partial.push({ name: msg.mark, t: msg.t });
        hiddenSeen ||= !!msg.hidden;
        if (flag('verbose')) console.log(`  page: ${msg.mark} ${msg.t}${msg.hidden ? ' (hidden)' : ''}`);
      } else if (msg.hello || msg.error) console.log('  page:', msg.hello ? 'opened' : `error ${msg.error}`);
      else waiting?.(msg);
    } catch {
      // not ours
    }
  });
});
const collectPort: number = await new Promise((r) =>
  collector.listen(0, '127.0.0.1', () => r((collector.address() as { port: number }).port)),
);
const next = (ms = 40000) =>
  new Promise<Timeline | null>((resolve) => {
    partial = [];
    hiddenSeen = false;
    const t = setTimeout(() => {
      const at = partial.map((m) => `${m.name}=${m.t}`).join(' ');
      console.log(
        `  timed out${hiddenSeen ? ' (the page was hidden: it stops before drawing)' : ''}: ${at || 'no marks'}`,
      );
      resolve(null);
    }, ms);
    waiting = (tl) => {
      clearTimeout(t);
      resolve(tl);
    };
  });

async function preview(): Promise<{ base: string; proc: ChildProcess }> {
  const port = await freePort();
  const vite = path.join(root, 'node_modules/vite/bin/vite.js');
  const proc = spawn(
    process.execPath,
    [vite, 'preview', '--outDir', OUT, '--port', String(port), '--strictPort', '--host', '127.0.0.1'],
    { cwd: root, stdio: 'ignore' },
  );
  const base = `http://127.0.0.1:${port}/`;
  for (let i = 0; i < 100; i++) {
    try {
      if ((await fetch(base)).ok) break;
    } catch {
      await sleep(100);
    }
  }
  return { base, proc };
}

const results: { kind: string; tl: Timeline }[] = [];
const query = (run: number) => `?boottrace=${collectPort}&room=boot-${run}-${Date.now().toString(36)}&sw=${SW}`;
const osa = (script: string) => spawnSync('osascript', ['-e', script], { encoding: 'utf8', timeout: 5000 });

for (let run = 0; run < RUNS; run++) {
  const { base, proc } = await preview();
  const url = base + query(run);
  if (SAFARI) {
    const got = next();
    spawnSync('open', ['-a', 'Safari', url]);
    const cold = await got;
    if (cold) results.push({ kind: 'cold', tl: cold });
    for (let w = 0; w < WARM; w++) {
      await sleep(1500); // let the service worker install (it registers once the game is interactive)
      const again = next();
      // A reload of the same tab where AppleScript may drive Safari; else the same URL in a new tab (same origin).
      const r = osa(`tell application "Safari" to do JavaScript "location.reload()" in current tab of front window`);
      if (r.status) spawnSync('open', ['-a', 'Safari', url]);
      const warm = await again;
      if (warm) results.push({ kind: 'warm', tl: warm });
    }
    osa(`tell application "Safari" to close (every tab of front window whose URL contains "${base}")`);
  } else {
    const browser = await launch();
    const context = await browser.newContext();
    const page = await context.newPage();
    if (LATENCY) {
      // A real connection, roughly: round trips and bandwidth for the page's own requests (a service worker's cache
      // answers without either).
      const cdp = await context.newCDPSession(page);
      await cdp.send('Network.enable');
      await cdp.send('Network.emulateNetworkConditions', {
        offline: false,
        latency: LATENCY,
        downloadThroughput: (MBPS * 1e6) / 8,
        uploadThroughput: (MBPS * 1e6) / 8,
      });
    }
    const got = next();
    await page.goto(url);
    const cold = await got;
    if (cold) results.push({ kind: 'cold', tl: cold });
    for (let w = 0; w < WARM; w++) {
      await sleep(1500);
      const again = next();
      await page.reload();
      const warm = await again;
      if (warm) results.push({ kind: 'warm', tl: warm });
    }
    await browser.close();
  }
  proc.kill();
  console.log(`run ${run + 1}/${RUNS}: ${results.filter((r) => r.tl).length} timelines so far`);
}

const median = (xs: number[]) => {
  if (!xs.length) return NaN;
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)];
};
console.log(
  `\n${SAFARI ? 'Safari' : 'Chrome'}, sw=${SW}, latency=${LATENCY}ms, ${RUNS} cold + ${RUNS * WARM} warm; medians in ms`,
);
console.log(['kind'.padEnd(6), ...PHASES.map((p) => p.padStart(8))].join(''));
for (const kind of ['cold', 'warm']) {
  const tls = results.filter((r) => r.kind === kind).map((r) => r.tl);
  const row = PHASES.map((p) => {
    const m = median(tls.map((tl) => tl.marks.find((x) => x.name === p)?.t ?? NaN).filter((x) => !isNaN(x)));
    return (isNaN(m) ? '-' : String(m)).padStart(8);
  });
  console.log([kind.padEnd(6), ...row].join(''));
}
console.log('');
for (const r of results) console.log(`${r.kind.padEnd(5)} ${r.tl.line}`);
const json = opt('json', '');
if (json) fs.writeFileSync(json, JSON.stringify(results, null, 2));
collector.close();
await server.close();
process.exit(0);

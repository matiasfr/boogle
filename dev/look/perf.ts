// Render and sim cost in under a minute: `npm run perf` (or `-- --url http://localhost:5173/` for a running game;
// `-- --render` or `-- --sim` for one half; `-- --json file` writes the first render row from a fixed pose, for
// dev/look/counts.ts). `--view NAME` and `--query proto=place` select the view and flags.
// Render: draw calls, triangles, shadow-pass calls, geometries and shader stages (vertex and fragment, deduplicated) for the island as you enter it.
// Counts come from renderer.info and are exact; headless software rendering makes
// fps meaningless, so none is reported.
// Sim: CPU ms per lockstep tick (average, p95, max), split per op, onApplied/onTick/onAfterTick handler and state hash (see
// profileTicks in src/world/sync.ts), on the idle island. The page runs the ticks back to back (updateWorld), so slow
// headless frames don't starve the sample; the numbers are still wall clock on a machine that is also software
// rendering, so compare before/after on your change, not absolute numbers.
import fs from 'node:fs';
import type { Browser } from 'playwright';
import { startStack, launch, Game, sleep, VIEWS, reportGfxErrors } from './lib.ts';
import type { Stack } from './lib.ts';

const argv = process.argv.slice(2);
const url = argv.includes('--url') ? argv[argv.indexOf('--url') + 1] : null;
const doRender = !argv.includes('--sim');
const doSim = !argv.includes('--render');
const viewName = argv.includes('--view') ? argv[argv.indexOf('--view') + 1] : null;
const query = argv.includes('--query') ? argv[argv.indexOf('--query') + 1] : '';
const jsonOut = argv.includes('--json') ? argv[argv.indexOf('--json') + 1] : null;
const IDLE_TICKS = 100;

// The game draws from renderer.setAnimationLoop: three resets renderer.info at the start of each frame, then the game
// renders, so right after a frame renderer.info.render holds that frame's counts (the scene pass runs once per frame,
// calling pipeline.render again would count only the output pass). `frame` waits for the next frame to finish and
// copies them. The second sample turns the shadow pass off through the sky's debug handle.
const STATS = `
  const { renderer, sun } = await import('/src/render/scene.ts');
  const { skyDebug } = await import('/src/render/sky.ts');
  const { observeGpu } = await import('/src/debug/prof-overlay.ts');
  const observer = await observeGpu();
  const frame = () => new Promise((res, reject) => {
    const at = window.boogle.prof.last.frames;
    const deadline = performance.now() + 30000;
    const t = setInterval(() => {
      if (window.boogle.prof.last.frames > at) {
        clearInterval(t);
        res({ ...renderer.info.render, measurement: observer.snapshot() });
      } else if (performance.now() > deadline) {
        clearInterval(t);
        reject(new Error('No completed game frame in 30 seconds'));
      }
    }, 20);
  });
  try {
    await frame();
    const a = await frame(); // with the shadow pass
    skyDebug.shadowPass(false);
    sun.shadow.needsUpdate = false;
    await frame();
    const b = await frame(); // no shadow pass
    return {
      backend: window.boogle.gfx,
      calls: a.drawCalls, shadowCalls: a.drawCalls - b.drawCalls, tris: a.triangles,
      geometries: renderer.info.memory.geometries, programs: renderer.info.memory.programs,
      ...a.measurement,
      shadowCountScope: 'draw-call difference between separate animation frames; moving objects can affect it' };
  } finally {
    skyDebug.shadowPass(true);
    observer.stop();
  }`;

// Run `n` ticks under profileTicks, yielding to the page every few so frames and timers still run. A host hashes every state every 20 ticks; a solo page is not a host, so
// this does it in its place.
const PROFILE = (n: number) => `
  const { profileTicks, updateWorld, stateHashes, worldStatus, TICK_MS } = await import('/src/world/sync.ts');
  const prof = profileTicks();
  let res;
  try {
    for (let k = 0; k < ${n}; k++) {
      updateWorld(TICK_MS / 1000);
      if (k % 20 === 19 && worldStatus().mode !== 'host') stateHashes();
      if (k % 5 === 4) await new Promise((r) => setTimeout(r, 0));
    }
  } finally {
    res = prof.stop(); // always put the real handlers back (profileTicks allows one profiler at a time)
  }
  return { ...res, mode: worldStatus().mode, isolated: crossOriginIsolated };`;

const SEEDED_RANDOM = () => {
  let x = 1;
  Math.random = () => (x = (x * 16807) % 2147483647) / 2147483647;
};

const fmt = (v: number) => Math.round(v * 1000) / 1000;
type Stat = { 'avg ms': number; 'p95 ms': number; 'max ms': number };
function stat(vals: number[]): Stat {
  const s = vals.slice().sort((a, b) => a - b);
  const avg = s.reduce((a, b) => a + b, 0) / Math.max(1, s.length);
  return { 'avg ms': fmt(avg), 'p95 ms': fmt(s[Math.floor(0.95 * (s.length - 1))] ?? 0), 'max ms': fmt(s.at(-1) ?? 0) };
}
// Rows are split by the registry each handler sits in (profileTicks' kinds): op applies, onTick handlers and hashes
// are the sim; onAfterTick handlers update meshes and textures from it; onApplied listeners are both (the rules' own,
// and render adapters).
type Row = Record<string, number>;
function summarize(rows: Row[], kinds: Record<string, string>) {
  const sum = (r: Row, keep: (l: string) => boolean) =>
    Object.entries(r).reduce((a, [l, ms]) => a + (keep(l) ? ms : 0), 0);
  const of = (kind: string) => stat(rows.map((r) => sum(r, (l) => kinds[l] === kind)));
  const table: Record<string, Stat> = {
    'whole tick (sum)': stat(rows.map((r) => sum(r, () => true))),
    'sim: ops, onTick, hashes': of('sim'),
    'onApplied listeners (sim + render)': of('applied'),
    'view: onAfterTick (main thread)': of('view'),
  };
  const labels = [...new Set(rows.flatMap((r) => Object.keys(r)))];
  const per = labels.map((l): [string, Stat] => [l, stat(rows.map((r) => r[l] ?? 0))]);
  per.sort((a, b) => b[1]['avg ms'] - a[1]['avg ms'] || b[1]['max ms'] - a[1]['max ms']);
  for (const [l, s] of per) table[`${l} (${kinds[l]})`] = s;
  return table;
}

async function profile(g: Game, label: string, ticks: number) {
  const t0 = Date.now();
  const { rows, kinds, mode, isolated } = await g.eval(PROFILE(ticks));
  console.log(
    `\n${label}: ${rows.length} ticks (${mode}) in ${((Date.now() - t0) / 1000).toFixed(1)} s` +
      (isolated ? '' : ' (page not cross-origin isolated: times are in 0.1 ms steps)'),
  );
  console.table(summarize(rows, kinds));
}

let stack: Stack | undefined, browser: Browser | undefined;
try {
  if (argv.includes('--view') && (!viewName || !VIEWS[viewName]))
    throw new Error('Unknown --view; use ' + Object.keys(VIEWS).join(', '));
  stack = await startStack({ url });
  browser = await launch();
  // The spawn is a random spot, the sky follows the clock and the shadow pass culls around all that, so counts that must
  // repeat (--json) take a seeded Math.random, a fixed camera and a fixed sun, once the lazy props are in.
  const init = jsonOut ? SEEDED_RANDOM : undefined;
  const q = new URLSearchParams(query);
  const g = await Game.open(browser, stack, { name: 'perf', isolated: doSim, init, query: q.toString() });
  if (doRender) {
    if (jsonOut || viewName) {
      const { cam, look } = VIEWS[viewName ?? 'overview']!;
      const pose = `${JSON.stringify(cam)}, ${JSON.stringify(look)}, null`;
      await g.eval(`window.boogle.sky.preview(0.3); window.__debugCam.set(${pose});`);
      await sleep(6000);
    }
    const measuredView = viewName ?? (jsonOut ? 'overview' : 'player camera');
    const row = { ...(await g.eval(STATS)), measuredView };
    if (jsonOut) fs.writeFileSync(jsonOut, JSON.stringify(row));
    console.log('render');
    console.table({
      island: {
        backend: row.backend,
        calls: row.calls,
        shadowCalls: row.shadowCalls,
        tris: row.tris,
        geometries: row.geometries,
        programs: row.programs,
      },
    });
    console.log(JSON.stringify(row, null, 2));
    // CPU per frame section (src/loop.ts), averaged over the last 240 frames. Headless: compare before/after only.
    console.log('\nmain-thread CPU per frame section (ms over the last 240 frames; compare on the same device)');
    console.table(await g.eval('return window.boogle.prof.table(10);'));
  }
  if (doSim) {
    await sleep(1000);
    await profile(g, 'sim, idle island', IDLE_TICKS);
  }
  reportGfxErrors([g]);
  const errors = g.healthErrors();
  if (errors.length) throw new Error(errors.join('\n'));
} catch (e) {
  console.error(e);
  process.exitCode = 1;
} finally {
  await browser?.close().catch(() => {});
  await stack?.close();
  process.exit(process.exitCode || 0);
}

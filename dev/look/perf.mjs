// Render and sim cost in under a minute: `npm run perf` (or `-- --url http://localhost:5173/` for a running game;
// `-- --render` or `-- --sim` for one half).
// Render: draw calls, triangles, shadow-pass calls, geometries and shader stages (vertex and fragment, deduplicated) for the island as you enter it and
// with a fully grown mushroom garden. Counts come from renderer.info and are exact; headless software rendering makes
// fps meaningless, so none is reported.
// Sim: CPU ms per lockstep tick (average, p95, max), split per op, onApplied/onTick/onAfterTick handler and state hash (see
// profileTicks in src/world/sync.js), on the idle island. The page runs the ticks back to back (updateWorld), so slow
// headless frames don't starve the sample; the numbers are still wall clock on a machine that is also software
// rendering, so compare before/after on your change, not absolute numbers.
import { startStack, launch, Game, sleep } from './lib.mjs';

const argv = process.argv.slice(2);
const url = argv.includes('--url') ? argv[argv.indexOf('--url') + 1] : null;
const doRender = !argv.includes('--sim');
const doSim = !argv.includes('--render');
const IDLE_TICKS = 100;

// The game renders once per animation frame and three resets renderer.info once per frame too, so the sample is taken
// right after the game's own renderFrame (calling it again inside one frame draws only the output pass: the scene
// pass runs once per frame). sky.js sets sun.shadow.autoUpdate every frame, so it is pinned off for the second sample.
const STATS = `
  const { renderer, pipeline, sun } = await import('/src/render/scene.js');
  let last = null;
  const orig = pipeline.render;
  pipeline.render = function () { const r = orig.call(this); last = { ...renderer.info.render }; return r; };
  const frame = () => new Promise((res) => { last = null; const t = setInterval(() => last && (clearInterval(t), res(last)), 20); });
  await frame();
  const a = await frame(); // with the shadow pass
  Object.defineProperty(sun.shadow, 'autoUpdate', { get: () => false, set() {}, configurable: true });
  sun.shadow.needsUpdate = false;
  await frame();
  const b = await frame(); // no shadow pass
  delete sun.shadow.autoUpdate;
  pipeline.render = orig;
  const calls = a.drawCalls ?? a.calls;
  return {
    backend: renderer.backend?.isWebGPUBackend ? 'webgpu' : 'webgl2',
    calls, shadowCalls: calls - (b.drawCalls ?? b.calls), tris: a.triangles,
    geometries: renderer.info.memory.geometries, programs: renderer.info.memory.programs };`;

// Grow every plot at once by loading a snapshot, instead of waiting for sim ticks.
const FULL_GARDEN = `
  const { snapshot, loadSnapshot } = await import('/src/world/sync.js');
  const { PATCH, GROW_TICKS } = await import('/src/sim/mushrooms.js');
  const s = snapshot();
  s.data.mushrooms = [];
  for (let i = PATCH.i0; i < PATCH.i0 + PATCH.w; i += 3)
    for (let j = PATCH.j0; j < PATCH.j0 + PATCH.h; j += 3) s.data.mushrooms.push(i, j, GROW_TICKS);
  loadSnapshot(s);
  return s.data.mushrooms.length / 3;`;

// Run `n` ticks under profileTicks, yielding to the page every few so frames and timers still run. A host hashes every state every 20 ticks; a solo page is not a host, so
// this does it in its place.
const PROFILE = (n) => `
  const { profileTicks, updateWorld, stateHashes, worldStatus, TICK_MS } = await import('/src/world/sync.js');
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

const fmt = (v) => Math.round(v * 1000) / 1000;
function stat(vals) {
  const s = vals.slice().sort((a, b) => a - b);
  const avg = s.reduce((a, b) => a + b, 0) / Math.max(1, s.length);
  return { 'avg ms': fmt(avg), 'p95 ms': fmt(s[Math.floor(0.95 * (s.length - 1))] ?? 0), 'max ms': fmt(s.at(-1) ?? 0) };
}
// Rows are split by the registry each handler sits in (profileTicks' kinds): op applies, onTick handlers and hashes
// are the sim; onAfterTick handlers update meshes and textures from it; onApplied listeners are both (the rules' own,
// and render adapters).
function summarize(rows, kinds) {
  const sum = (r, keep) => Object.entries(r).reduce((a, [l, ms]) => a + (keep(l) ? ms : 0), 0);
  const of = (kind) => stat(rows.map((r) => sum(r, (l) => kinds[l] === kind)));
  const table = {
    'whole tick (sum)': stat(rows.map((r) => sum(r, () => true))),
    'sim: ops, onTick, hashes': of('sim'),
    'onApplied listeners (sim + render)': of('applied'),
    'view: onAfterTick (main thread)': of('view'),
  };
  const labels = [...new Set(rows.flatMap((r) => Object.keys(r)))];
  const per = labels.map((l) => [l, stat(rows.map((r) => r[l] ?? 0))]);
  per.sort((a, b) => b[1]['avg ms'] - a[1]['avg ms'] || b[1]['max ms'] - a[1]['max ms']);
  for (const [l, s] of per) table[`${l} (${kinds[l]})`] = s;
  return table;
}

async function profile(g, label, ticks) {
  const t0 = Date.now();
  const { rows, kinds, mode, isolated } = await g.eval(PROFILE(ticks));
  console.log(
    `\n${label}: ${rows.length} ticks (${mode}) in ${((Date.now() - t0) / 1000).toFixed(1)} s` +
      (isolated ? '' : ' (page not cross-origin isolated: times are in 0.1 ms steps)'),
  );
  console.table(summarize(rows, kinds));
}

let stack, browser;
try {
  stack = await startStack({ url });
  browser = await launch();
  const g = await Game.open(browser, stack, { name: 'perf', isolated: doSim });
  if (doRender) {
    const rows = { 'island, empty garden': await g.eval(STATS) };
    const n = await g.eval(FULL_GARDEN);
    await sleep(500);
    rows[`island, ${n} grown mushrooms`] = await g.eval(STATS);
    console.log('render');
    console.table(rows);
  }
  if (doSim) {
    await sleep(1000);
    await profile(g, `sim, idle island${doRender ? ' (garden grown)' : ''}`, IDLE_TICKS);
  }
} catch (e) {
  console.error(e);
  process.exitCode = 1;
} finally {
  await browser?.close().catch(() => {});
  await stack?.close();
  process.exit(process.exitCode || 0);
}

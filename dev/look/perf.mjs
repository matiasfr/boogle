// Render and sim cost in under a minute: `npm run perf` (or `-- --url http://localhost:5173/` for a running game;
// `-- --render` or `-- --sim` for one half).
// Render: draw calls, triangles, shadow-pass calls, geometries and shader programs for the island as you enter it and
// with a fully grown mushroom garden. Counts come from renderer.info and are exact; headless software rendering makes
// fps meaningless, so none is reported.
// Sim: CPU ms per lockstep tick (average, p95, max), split per op, onApplied/onTick/onAfterTick handler and state hash (see
// profileTicks in src/world/sync.js), on the idle island and with busy water (the home beach flooded while a player
// digs a channel from the sea at the host's rate limit). The page runs the ticks back to back (updateWorld), so slow
// headless frames don't starve the sample; the numbers are still wall clock on a machine that is also software
// rendering, so compare before/after on your change, not absolute numbers.
import { startStack, launch, Game } from './lib.mjs';

const argv = process.argv.slice(2);
const url = argv.includes('--url') ? argv[argv.indexOf('--url') + 1] : null;
const doRender = !argv.includes('--sim');
const doSim = !argv.includes('--render');
const IDLE_TICKS = 100;
const BUSY_TICKS = 200;
const FLOOD_CM = 40; // water poured on every home land cell lower than FLOOD_BELOW_CM
const FLOOD_BELOW_CM = 400;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const STATS = `
  const { renderer, scene, camera, sun } = await import('/src/render/scene.js');
  renderer.shadowMap.needsUpdate = true;
  renderer.render(scene, camera);
  const calls = renderer.info.render.calls, tris = renderer.info.render.triangles;
  sun.castShadow = false;
  renderer.render(scene, camera);
  const shadowCalls = calls - renderer.info.render.calls;
  sun.castShadow = true;
  return { calls, shadowCalls, tris, geometries: renderer.info.memory.geometries, programs: renderer.info.programs.length };`;

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

// Run `n` ticks under profileTicks, yielding to the page every few so frames and timers still run. window.__perfEach
// (set by BUSY) submits edits before a tick. A host hashes every state every 20 ticks; a solo page is not a host, so
// this does it in its place.
const PROFILE = (n) => `
  const { profileTicks, updateWorld, stateHashes, worldStatus, TICK_MS } = await import('/src/world/sync.js');
  const { water } = window.__water;
  const active = [];
  const prof = profileTicks();
  let res;
  try {
    for (let k = 0; k < ${n}; k++) {
      window.__perfEach?.(k);
      updateWorld(TICK_MS / 1000);
      if (k % 20 === 19 && worldStatus().mode !== 'host') stateHashes();
      if (k % 10 === 0) active.push(water.stats().active);
      if (k % 5 === 4) await new Promise((r) => setTimeout(r, 0));
    }
  } finally {
    res = prof.stop(); // always put the real handlers back (profileTicks allows one profiler at a time)
  }
  return { ...res, active, cells: water.depth.length, mode: worldStatus().mode, isolated: crossOriginIsolated };`;

// Busy water: pour FLOOD_CM over the home beach and lowlands with a snapshot (it drains back to the sea for many
// seconds), and dig a channel inland from the shore every other tick, piling the sand inland when the bucket is full.
const BUSY = `
  const { snapshot, loadSnapshot, submitEdit } = await import('/src/world/sync.js');
  const { terrain } = await import('/src/world/terrain-edits.js');
  const { GRID_RES: N } = await import('/src/constants.js');
  const { i0, j0, w: W, h: H } = window.__water.region;
  const s = snapshot();
  const cells = new Map();
  for (let k = 0; k + 1 < s.data.water.cells.length; k += 2) cells.set(s.data.water.cells[k], s.data.water.cells[k + 1]);
  let flooded = 0;
  for (let a = 0; a < W; a++)
    for (let b = 0; b < H; b++) {
      const g = (a + i0) * N + b + j0, ground = terrain.base[g] + terrain.delta[g];
      if (ground < 0 || ground >= ${FLOOD_BELOW_CM}) continue;
      cells.set(a * H + b, (cells.get(a * H + b) ?? 0) + ${FLOOD_CM});
      flooded++;
    }
  s.data.water.cells = [...cells].flat();
  loadSnapshot(s);

  // The longest straight sand line that starts at the sea (a cell within 3 of open water) and runs away from it.
  const sand = (i, j) => terrain.mask[i * N + j] === 1;
  let path = [];
  for (let i = i0 + 8; i < i0 + W - 8; i++)
    for (let j = j0 + 8; j < j0 + H - 8; j++) {
      if (!sand(i, j)) continue;
      for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        if (![1, 2, 3].some((d) => terrain.base[(i - di * d) * N + j - dj * d] < -30)) continue;
        const line = [];
        for (let a = i, b = j; line.length < 40 && sand(a, b); a += di, b += dj) line.push([a, b, di, dj]);
        if (line.length > path.length) path = line;
      }
    }
  const [fi, fj, di, dj] = path[path.length - 1];
  let n = 0;
  window.__perfEach = (k) => {
    if (k % 2) return;
    const [i, j] = path[Math.floor(n / 3) % path.length]; // three digs per cell, then the next one inland
    if (submitEdit({ op: 'dig', i, j })) n++;
    else submitEdit({ op: 'pile', i: fi + 3 * dj, j: fj + 3 * di }); // bucket full: dump it beside the channel's end
  };
  return { flooded, channel: path.length };`;

const fmt = (v) => Math.round(v * 1000) / 1000;
function stat(vals) {
  const s = vals.slice().sort((a, b) => a - b);
  const avg = s.reduce((a, b) => a + b, 0) / Math.max(1, s.length);
  return { 'avg ms': fmt(avg), 'p95 ms': fmt(s[Math.floor(0.95 * (s.length - 1))] ?? 0), 'max ms': fmt(s.at(-1) ?? 0) };
}
// Rows are split by the registry each handler sits in (profileTicks' kinds): op applies, onTick handlers and hashes
// are the sim; onAfterTick handlers update meshes and textures from it; onApplied listeners are both (the rules' own,
// like 'water ground', and render adapters, like 'terrain adapter').
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
  const { rows, kinds, active, cells, mode, isolated } = await g.eval(PROFILE(ticks));
  const avgActive = Math.round(active.reduce((a, b) => a + b, 0) / Math.max(1, active.length));
  console.log(
    `\n${label}: ${rows.length} ticks (${mode}) in ${((Date.now() - t0) / 1000).toFixed(1)} s, ` +
      `water active cells ~${avgActive} of ${cells}` +
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
    const busy = await g.eval(BUSY);
    const label = `sim, busy water (${busy.flooded} cells flooded, digging a ${busy.channel}-cell channel)`;
    await profile(g, label, BUSY_TICKS);
  }
} catch (e) {
  console.error(e);
  process.exitCode = 1;
} finally {
  await browser?.close().catch(() => {});
  await stack?.close();
  process.exit(process.exitCode || 0);
}

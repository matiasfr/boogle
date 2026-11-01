// Frame hitches: `npm run hitches`. Flies a tour around the island (every view, caves, garden, lighthouse), steps the
// sky day -> sunset -> night, fires particles, holds a throw and cycles the hotbar, and records every frame over 33 ms
// with what was happening: the tour step, the sky time, and whether three's resource counters (programs, geometries,
// textures) moved that frame, which means a shader compile or an upload landed in it.
// Run it on a Mac (real GPU, WebGPU on Metal); CI's software WebGPU is too slow to say anything about hitches. Options: `--url http://...` (a running game), `--limit 33` (ms),
// `--json file` (write every hitch as JSON), `--root dir` (serve another checkout), `--heap-profile file.heapprofile`
// (with --allocs: save the tour's sampled heap profile; DevTools, Memory tab, Load).
// Every run also reports JS heap allocated per frame and GCs per tour step (performance.memory: a GC shows as the heap
// dropping). `--allocs` adds Chrome's sampling heap profiler over the tour and lists the functions that allocate the
// most, garbage included: the starting point for an allocation-free hot path (docs/plans/game-loop.md, step 2).
// After the tour (the JIT warm), six seconds of day and night measure what each onFrame hook allocates (sampled, the
// libraries it calls included), split into objects (arrays, closures, strings, ...: garbage on every engine) and V8's
// boxed numbers (none on Safari). The objects are the allocation-free hot path's budget (docs/plans/game-loop.md,
// step 2): ALLOC_BUDGET KB/frame for all hooks together (`--alloc-budget n`); over it, the run fails.
// The 'enter' step includes the harness's own click (pointer lock in headless Chromium costs ~200 ms there).
import fs from 'node:fs';
import path from 'node:path';
import { startStack, launch, Game, VIEWS, reportGfxErrors } from './lib.mjs';

const argv = process.argv.slice(2);
const val = (name, d) => (argv.includes(name) ? argv[argv.indexOf(name) + 1] : d);
const url = val('--url', null);
const root = val('--root', undefined); // another checkout to serve (before/after comparisons)
const LIMIT = Number(val('--limit', 33));
const allocs = argv.includes('--allocs');
const jsonOut = val('--json', null);
const heapOut = val('--heap-profile', null);
// KB/frame of objects, all onFrame hooks together: a ratchet just over today's ~2.7 (2026-11-01, after presence sends
// went 1.0 -> 0.25 and the idle railway stopped redrawing), on the way to the plan's 1 KB. Lower it as hooks stop
// allocating.
const ALLOC_BUDGET = Number(val('--alloc-budget', 3.2));

// Runs in the page. Frames are timed from a requestAnimationFrame loop of its own (it sees the same vsync the game
// does), counters are read right after the game's frame, tagged with window.__step / the sky time.
const INSTALL = `
  const { renderer, sun } = await import('/src/render/scene.ts');
  const { skyNow } = await import('/src/render/sky.ts');
  const m = renderer.info.memory;
  const frames = (window.__frames = []);
  let prev = performance.now(), p = m.programs ?? 0, g = m.geometries ?? 0, t = m.textures ?? 0;
  const tick = (now) => {
    requestAnimationFrame(tick);
    const mm = renderer.info.memory;
    frames.push({
      at: Math.round(now), dt: +(now - prev).toFixed(1), step: window.__step ?? '', sky: +(skyNow.frac ?? 0).toFixed(3),
      dp: (mm.programs ?? 0) - p, dg: (mm.geometries ?? 0) - g, dt2: (mm.textures ?? 0) - t,
      shadow: sun.shadow.autoUpdate,
      cpu: +(window.boogle.prof?.last.ms ?? 0).toFixed(1), top: window.boogle.prof?.last.top ?? '',
      topMs: +(window.boogle.prof?.last.topMs ?? 0).toFixed(1), heap: performance.memory?.usedJSHeapSize ?? 0,
    });
    prev = now; p = mm.programs ?? 0; g = mm.geometries ?? 0; t = mm.textures ?? 0;
  };
  requestAnimationFrame(tick);
  return window.boogle.gfx;`;

// Before the page's own code: log frame times from the lobby's submit until the tour starts.
const ENTER_FRAMES = () => {
  const lobby = (window.__lobby = { slow: [], enterAt: 0 }); // frames over 33 ms while the lobby is up
  let before = null;
  const watch = (now) => {
    if (document.getElementById('lobby')?.hidden) return;
    if (!lobby.enterAt && document.getElementById('enter')?.disabled === false) lobby.enterAt = Math.round(now);
    if (before !== null && now - before > 33) lobby.slow.push(Math.round(now - before));
    before = now;
    requestAnimationFrame(watch);
  };
  requestAnimationFrame(watch);
  addEventListener(
    'submit',
    () => {
      const log = (window.__enter = []);
      let prev = null; // the first callback only starts the clock: its frame began before the click
      const tick = (now) => {
        if (window.__frames) return;
        if (prev !== null) log.push({ at: Math.round(now), dt: +(now - prev).toFixed(1) });
        prev = now;
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    },
    true,
  );
};

// One tour step: set the label, run the setup, hold for ms.
const TOUR = `
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const THREE = window.boogle.THREE;
  const dbg = window.__debugCam;
  const I = await import('/src/player/inventory.ts');
  const H = await import('/src/player/hands.ts');
  const { NODES } = await import('/src/pois/caves/network.ts');
  const { emit } = await import('/src/render/particles.ts');
  const sky = window.boogle.sky;
  const step = async (name, ms, fn) => { window.__step = name; if (fn) await fn(); await sleep(ms); };
  const view = (v) => () => dbg.set(v.cam, v.look, null);
  const burst = (x, y, z) => {
    for (let k = 0; k < 120; k++) {
      const a = k * 2.399;
      emit({ x, y, z, vx: Math.cos(a) * 3, vy: 2 + (k % 5), vz: Math.sin(a) * 3, life: 1.5, size: 0.4,
        color: new THREE.Color('#e8d9a8'), gravity: -6 });
    }
  };
  const night = (v) => () => { sky.preview(0.8, 0.5); dbg.set(v.cam, v.look, null); };
  const hub = NODES.hub;
  const CAVE = { cam: [hub.x + 1, hub.y + 1.6, hub.z + 1], look: [hub.x - 4, hub.y + 1.2, hub.z - 2] };
  const LIGHT = { cam: [160, 26, -10], look: [212, 26, -50] };

  await step('spawn', 2000, () => sky.preview(0.3));
  for (const k of ['hill', 'shore', 'court', 'garden', 'overview']) await step('view ' + k, 1500, view(VIEWS[k]));
  await step('caves', 2500, view(CAVE));
  await step('lighthouse', 2000, view(LIGHT));
  await step('particles', 2500, () => { dbg.set(VIEWS.court.cam, VIEWS.court.look, null); burst(12, 1, 21); });
  await step('throw preview', 1500, async () => { I.take('frisbee'); I.select(I.slotOf('frisbee')); H.useDown(); });
  await step('throw release', 1000, () => H.useUp());
  await step('hotbar', 2500, async () => {
    for (const id of ['frisbee', 'seeds', 'can']) I.take(id);
    for (let s = 0; s < 6; s++) { I.select(s); await sleep(250); }
  });
  await step('sunset', 3000, () => { sky.preview(0.55); dbg.set(VIEWS.shore.cam, VIEWS.shore.look, null); });
  await step('sunset overview', 2000, () => dbg.set(VIEWS.overview.cam, VIEWS.overview.look, null));
  await step('night', 3000, night(VIEWS.overview));
  await step('night garden', 2000, night(VIEWS.garden));
  await step('night shore', 2000, night(VIEWS.shore));
  await step('night lighthouse', 2500, night(LIGHT));
  await step('night caves', 2500, night(CAVE));
  await step('night particles', 2000, () => { night(VIEWS.court)(); burst(12, 1, 21); });
  await step('sky sweep', 0, () => dbg.set(VIEWS.overview.cam, VIEWS.overview.look, null));
  for (let f = 0.25; f <= 1.0; f += 0.01) { sky.preview(f % 1, null); await sleep(130); }
  sky.preview(null);
  window.__step = 'done';
  return window.__frames;`;

// The hooks' steady-state allocation: CDP's sampling heap profiler over a few seconds at day and night views, everything
// under each callee of src/loop.ts runFrame charged to that hook.
async function measureHooks(g) {
  const cdp = await g.page.context().newCDPSession(g.page);
  await cdp.send('HeapProfiler.enable');
  await cdp.send('HeapProfiler.startSampling', {
    samplingInterval: 1024,
    includeObjectsCollectedByMajorGC: true, // garbage is the point
    includeObjectsCollectedByMinorGC: true,
  });
  const frames = await g.eval(`
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    const VIEWS = ${JSON.stringify(VIEWS)};
    let n = 0, on = true;
    const count = () => { n++; if (on) requestAnimationFrame(count); };
    requestAnimationFrame(count);
    window.__step = 'allocs';
    for (const [v, sky] of [['court', 0.3], ['garden', 0.3], ['shore', 0.8], ['garden', 0.8]]) {
      window.boogle.sky.preview(sky, sky > 0.5 ? 0.5 : undefined);
      window.__debugCam.set(VIEWS[v].cam, VIEWS[v].look, null);
      await sleep(1500);
    }
    on = false;
    window.boogle.sky.preview(null);
    return n;`);
  const { profile } = await cdp.send('HeapProfiler.stopSampling');
  await cdp.detach();
  // Each sample is one object (its size scaled up by the sampling odds: s / (1 - e^(-s / interval))). Objects of 16
  // bytes or less are V8's boxed doubles (HeapNumbers), mostly: numbers crossing a call or a field it could not keep
  // unboxed. Safari (the iPad) and Firefox keep doubles unboxed, so these cost only on V8; the budget is the rest.
  const owner = new Map(); // profile node id -> hook
  const hookOf = (ch) =>
    `${ch.callFrame.url.replace(/^.*?\/src\//, '').replace(/\?.*$/, '')}:${ch.callFrame.lineNumber + 1}`;
  const mark = (n, hook) => {
    owner.set(n.id, hook);
    n.children.forEach((ch) => mark(ch, hook));
  };
  const find = (n) => {
    const c = n.callFrame;
    if (c.functionName === 'runFrame' && c.url.includes('/src/loop.ts'))
      n.children.forEach((ch) => mark(ch, hookOf(ch)));
    else n.children.forEach(find);
  };
  find(profile.head);
  const SMALL = 16 / (1 - Math.exp(-16 / 1024)) + 1; // the scaled size of a 16-byte object, and a little
  const hooks = new Map();
  for (const { nodeId, size } of profile.samples) {
    const hook = owner.get(nodeId);
    if (!hook) continue;
    const h = hooks.get(hook) ?? { objects: 0, numbers: 0 };
    if (size <= SMALL) h.numbers += size;
    else h.objects += size;
    hooks.set(hook, h);
  }
  const kb = (b) => b / 1024 / frames;
  const rows = [...hooks]
    .sort((a, b) => b[1].objects - a[1].objects)
    .map(([hook, h]) => ({
      hook,
      'objects KB/frame': +kb(h.objects).toFixed(2),
      'V8 numbers KB/frame': +kb(h.numbers).toFixed(2),
    }));
  const sum = (k) => kb([...hooks.values()].reduce((a, h) => a + h[k], 0));
  return { frames, rows, objects: sum('objects'), numbers: sum('numbers') };
}

let stack, browser;
try {
  stack = await startStack({ url, root });
  browser = await launch();
  const g = await Game.open(browser, stack, { name: 'hitches', hud: 'play', init: ENTER_FRAMES });
  g.page.on('framenavigated', (f) => f === g.page.mainFrame() && console.log('page navigated to', f.url()));
  if (process.env.HDEBUG) g.page.on('console', (m) => console.log('console:', m.text().slice(0, 200)));
  const gfx = await g.eval(INSTALL);
  console.log(
    `tour on ${gfx}${process.platform === 'darwin' ? ' (real GPU)' : ' (software: numbers are not meaningful)'} ...`,
  );
  const cdp = allocs ? await g.page.context().newCDPSession(g.page) : null;
  if (cdp) {
    await cdp.send('HeapProfiler.enable');
    await cdp.send('HeapProfiler.startSampling', {
      samplingInterval: 8192,
      includeObjectsCollectedByMajorGC: true,
      includeObjectsCollectedByMinorGC: true,
    });
  }
  const frames = await g.eval(`const VIEWS = ${JSON.stringify(VIEWS)};` + TOUR);
  const sampled = cdp ? (await cdp.send('HeapProfiler.stopSampling')).profile : null;
  if (sampled && heapOut) fs.writeFileSync(path.resolve(heapOut), JSON.stringify(sampled));
  const hookAllocs = await measureHooks(g);
  const lobby = await g.eval('return window.__lobby;');
  console.log(
    `lobby: Jump in enabled ${lobby.enterAt} ms after page start; ${lobby.slow.length} frames over 33 ms before it (worst ${Math.max(0, ...lobby.slow)} ms)`,
  );
  // The frames from pressing Enter to the harness taking over (the game starting up).
  const early = (await g.eval('return window.__enter ?? [];')).map((f) => ({
    ...f,
    step: 'enter',
    sky: 0,
    dp: 0,
    dg: 0,
    dt2: 0,
  }));
  frames.unshift(...early);
  const hitches = frames.filter((f) => f.dt > LIMIT);
  const dts = frames.map((f) => f.dt).sort((a, b) => a - b);
  const q = (p) => dts[Math.floor(p * (dts.length - 1))];
  console.log(
    `\n${frames.length} frames, median ${q(0.5)} ms, p95 ${q(0.95)} ms, p99 ${q(0.99)} ms, max ${dts.at(-1)} ms; ` +
      `${hitches.length} over ${LIMIT} ms, ${hitches.filter((f) => f.dt > 100).length} over 100 ms`,
  );
  // Allocation: the heap only grows between GCs, so the positive deltas add up to what was allocated.
  for (let k = 1; k < frames.length; k++) {
    const d = (frames[k].heap ?? 0) - (frames[k - 1].heap ?? 0);
    frames[k].alloc = frames[k].heap && frames[k - 1].heap && d > 0 ? d : 0;
    frames[k].gc = frames[k].heap && frames[k - 1].heap && d < -65536 ? 1 : 0;
  }
  const by = new Map();
  for (const f of frames) {
    const s = by.get(f.step) ?? { frames: 0, hitches: 0, worst: 0, compiles: 0, uploads: 0, 'KB/frame': 0, gcs: 0 };
    s.frames++;
    s['KB/frame'] += (f.alloc ?? 0) / 1024;
    s.gcs += f.gc ?? 0;
    if (f.dt > LIMIT) {
      s.hitches++;
      s.worst = Math.max(s.worst, f.dt);
      if (f.dp > 0) s.compiles++;
      if (f.dg > 0 || f.dt2 > 0) s.uploads++;
    }
    by.set(f.step, s);
  }
  console.log('\nper tour step');
  console.table(
    Object.fromEntries(
      [...by].map(([k, v]) => [
        k,
        { ...v, worst: Math.round(v.worst), 'KB/frame': +(v['KB/frame'] / v.frames).toFixed(1) },
      ]),
    ),
  );
  const allocated = frames.reduce((a, f) => a + (f.alloc ?? 0), 0);
  console.log(
    `JS heap: ${(allocated / 1024 / frames.length).toFixed(1)} KB allocated per frame, ` +
      `${frames.reduce((a, f) => a + (f.gc ?? 0), 0)} GCs over ${frames.length} frames`,
  );
  if (sampled) {
    // Sum each function's own sampled bytes (garbage included) across the call tree.
    // Library allocations are charged to the nearest game frame that called them ('src/... -> rapier step').
    const sites = new Map();
    const where = (c) =>
      `${c.functionName || '(anonymous)'} ${c.url.replace(/^.*?\/(src|node_modules)\//, '$1/').replace(/\?v=\w+/, '')}:${c.lineNumber + 1}`;
    const walk = (n, owner) => {
      const c = n.callFrame;
      const mine = c.url.includes('/src/') ? where(c) : owner;
      if (n.selfSize && c.url) {
        const key = mine && mine !== where(c) ? `${mine} -> ${c.functionName || '(anonymous)'}` : where(c);
        sites.set(key, (sites.get(key) ?? 0) + n.selfSize);
      }
      for (const ch of n.children) walk(ch, mine);
    };
    walk(sampled.head, null);
    const top = (rows, n) =>
      rows
        .sort((a, b) => b[1] - a[1])
        .slice(0, n)
        .map(([site, bytes]) => ({ site, 'KB/frame': +(bytes / 1024 / frames.length).toFixed(2) }));
    console.log(
      '\ntop allocation sites over the tour (sampled, garbage included; "a -> b": game code a calling library b)',
    );
    console.table(top([...sites], 20));
    console.log("the game's own allocations (not inside three.js or the physics engine)");
    console.table(
      top(
        [...sites].filter(([k]) => !k.includes(' -> ')),
        15,
      ),
    );
  }
  console.log(
    'hitches (ms, step, sky time, new programs / geometries / textures, main-thread CPU and its slowest section that frame)',
  );
  console.table(
    hitches.slice(0, 60).map((f) => ({
      ms: Math.round(f.dt),
      step: f.step,
      sky: f.sky,
      programs: f.dp,
      geometries: f.dg,
      textures: f.dt2,
      'cpu ms': f.cpu,
      'slowest section': f.top ? `${f.top} (${f.topMs} ms)` : '',
    })),
  );
  if (hitches.length > 60) console.log(`... and ${hitches.length - 60} more (--json file for all)`);
  const withNew = hitches.filter((f) => f.dp > 0 || f.dg > 0 || f.dt2 > 0).length;
  console.log(`hitches with a program, geometry or texture change in the same frame: ${withNew} of ${hitches.length}`);
  console.log('\nallocated per frame by each onFrame hook, warm (sampled; the libraries it calls included)');
  console.table(hookAllocs.rows.slice(0, 15));
  const overBudget = hookAllocs.objects > ALLOC_BUDGET;
  console.log(
    `onFrame hooks: ${hookAllocs.objects.toFixed(2)} KB/frame of objects (budget ${ALLOC_BUDGET}${overBudget ? ': OVER' : ''}), ` +
      `${hookAllocs.numbers.toFixed(2)} KB/frame of V8 boxed numbers, over ${hookAllocs.frames} frames`,
  );
  if (overBudget) process.exitCode = 1;
  if (jsonOut)
    fs.writeFileSync(path.resolve(jsonOut), JSON.stringify({ gfx, frames: frames.length, hitches }, null, 1));
  reportGfxErrors([g]);
} catch (e) {
  console.error(e);
  process.exitCode = 1;
} finally {
  await browser?.close().catch(() => {});
  await stack?.close();
  process.exit(process.exitCode || 0);
}

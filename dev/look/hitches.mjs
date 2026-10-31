// Frame hitches: `npm run hitches`. Flies a tour around the island (every view, caves, garden, lighthouse), steps the
// sky day -> sunset -> night, fires particles, holds a throw and cycles the hotbar, and records every frame over 33 ms
// with what was happening: the tour step, the sky time, and whether three's resource counters (programs, geometries,
// textures) moved that frame, which means a shader compile or an upload landed in it.
// Defaults to the real GPU and WebGPU on a Mac (`--no-gpu` / `--no-webgpu` to change); headless software rendering is
// too slow to say anything about hitches. Options: `--url http://...` (a running game), `--limit 33` (ms),
// `--json file` (write every hitch as JSON), `--root dir` (serve another checkout).
// The 'enter' step includes the harness's own click (pointer lock in headless Chromium costs ~200 ms there).
import fs from 'node:fs';
import path from 'node:path';
import { startStack, launch, Game, VIEWS, reportGfxErrors } from './lib.mjs';

const argv = process.argv.slice(2);
const val = (name, d) => (argv.includes(name) ? argv[argv.indexOf(name) + 1] : d);
const mac = process.platform === 'darwin';
const gpu = mac && !argv.includes('--no-gpu');
const webgpu = !argv.includes('--no-webgpu');
const url = val('--url', null);
const root = val('--root', undefined); // another checkout to serve (before/after comparisons)
const LIMIT = Number(val('--limit', 33));
const jsonOut = val('--json', null);

// Runs in the page. Frames are timed from a requestAnimationFrame loop of its own (it sees the same vsync the game
// does), counters are read right after the game's frame, tagged with window.__step / the sky time.
const INSTALL = `
  const { renderer, sun } = await import('/src/render/scene.js');
  const { skyNow } = await import('/src/render/sky.js');
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
  const I = await import('/src/player/inventory.js');
  const H = await import('/src/player/hands.js');
  const { NODES } = await import('/src/pois/caves/network.js');
  const { emit } = await import('/src/render/particles.js');
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
  await step('throw preview', 1500, async () => { I.take('mango'); I.select(I.slotOf('mango')); H.useDown(); });
  await step('throw release', 1000, () => H.useUp());
  await step('hotbar', 2500, async () => {
    for (const id of ['frisbee', 'driftwood', 'seeds', 'can']) { try { I.take(id); } catch {} }
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

let stack, browser;
try {
  stack = await startStack({ url, root });
  browser = await launch({ gpu, webgpu });
  const g = await Game.open(browser, stack, { name: 'hitches', webgpu, hud: 'play', init: ENTER_FRAMES });
  g.page.on('framenavigated', (f) => f === g.page.mainFrame() && console.log('page navigated to', f.url()));
  if (process.env.HDEBUG) g.page.on('console', (m) => console.log('console:', m.text().slice(0, 200)));
  const gfx = await g.eval(INSTALL);
  console.log(`tour on ${gfx}${gpu ? ' (real GPU)' : ' (software: numbers are not meaningful)'} ...`);
  const frames = await g.eval(`const VIEWS = ${JSON.stringify(VIEWS)};` + TOUR);
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
    `\n${frames.length} frames, median ${q(0.5)} ms, p99 ${q(0.99)} ms, max ${dts.at(-1)} ms; ` +
      `${hitches.length} over ${LIMIT} ms, ${hitches.filter((f) => f.dt > 100).length} over 100 ms`,
  );
  const by = new Map();
  for (const f of frames) {
    const s = by.get(f.step) ?? { frames: 0, hitches: 0, worst: 0, compiles: 0, uploads: 0 };
    s.frames++;
    if (f.dt > LIMIT) {
      s.hitches++;
      s.worst = Math.max(s.worst, f.dt);
      if (f.dp > 0) s.compiles++;
      if (f.dg > 0 || f.dt2 > 0) s.uploads++;
    }
    by.set(f.step, s);
  }
  console.log('\nper tour step');
  console.table(Object.fromEntries([...by].map(([k, v]) => [k, { ...v, worst: Math.round(v.worst) }])));
  console.log('hitches (ms, step, sky time, new programs / geometries / textures that frame)');
  console.table(
    hitches.slice(0, 60).map((f) => ({
      ms: Math.round(f.dt),
      step: f.step,
      sky: f.sky,
      programs: f.dp,
      geometries: f.dg,
      textures: f.dt2,
    })),
  );
  if (hitches.length > 60) console.log(`... and ${hitches.length - 60} more (--json file for all)`);
  const withNew = hitches.filter((f) => f.dp > 0 || f.dg > 0 || f.dt2 > 0).length;
  console.log(`hitches with a program, geometry or texture change in the same frame: ${withNew} of ${hitches.length}`);
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

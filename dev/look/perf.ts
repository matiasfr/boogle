// Render and sim cost in under a minute: `npm run perf` (or `-- --url http://localhost:5173/` for a running game;
// `-- --render` or `-- --sim` for one half; `-- --json file` writes the first render row from a fixed pose, for
// dev/look/counts.ts). `--hardware` opens a visible browser and samples real frames for 5 seconds;
// `--seconds N` (1–30), `--view NAME`, `--size 1210x702` and `--query 'k=v'` select the sample (default: the production
// entry). Counts stay timing-free. `--rail-seed <stage>` starts the room from an accepted railway server save, as look's
// (dev/look/rail-seed.ts). A view in PLACES below also stands the body somewhere and starts from its seed, so what is
// resident by distance is there: `npm run perf -- --view canopy` (add `--hardware` for frame time on this GPU).
// Render: draw calls, triangles, shadow-pass calls, geometries and shader stages (vertex and fragment, deduplicated) for the island as you enter it.
// Counts come from renderer.info and are exact; headless software rendering makes
// fps meaningless, so none is reported.
// Sim: CPU ms per rule tick (average, p95, max), split per onTick handler and state hash (see
// profileTicks in src/world/sync.ts), on the idle island. The page runs the ticks back to back (updateWorld), so slow
// headless frames don't starve the sample; the numbers are still wall clock on a machine that is also software
// rendering, so compare before/after on your change, not absolute numbers.
import fs from 'node:fs';
import type { Browser } from 'playwright';
import path from 'node:path';
import { startStack, launch, Game, sleep, VIEWS, reportGfxErrors, root } from './lib.ts';
import type { Stack } from './lib.ts';
import { startRun, finishRun, runOpen } from './verdict.ts';

const argv = process.argv.slice(2);
const url = argv.includes('--url') ? argv[argv.indexOf('--url') + 1] : null;
const hardware = argv.includes('--hardware');
const doRender = !argv.includes('--sim');
const doSim = !hardware && !argv.includes('--render');
const seconds = argv.includes('--seconds') ? Number(argv[argv.indexOf('--seconds') + 1]) : 5;
const viewName = argv.includes('--view') ? argv[argv.indexOf('--view') + 1] : null;
const query = argv.includes('--query') ? argv[argv.indexOf('--query') + 1] : '';
const jsonOut = argv.includes('--json') ? argv[argv.indexOf('--json') + 1] : null;
const size = argv.includes('--size') ? argv[argv.indexOf('--size') + 1]!.split('x').map(Number) : undefined;
// `--verdict file` stamps the run (load at start/end, under load) like look's verdicts; timings under load aren't evidence.
const verdictFile = argv.includes('--verdict') ? argv[argv.indexOf('--verdict') + 1]! : null;
const railSeedArg = argv.includes('--rail-seed') ? argv[argv.indexOf('--rail-seed') + 1] : undefined;
const IDLE_TICKS = 100;

type Place = (typeof VIEWS)[string] & { seed: string; stand: [number, number, number] };
/** Views far from the spawn: the body stands at `stand` on `seed` until every route area near it has mounted. */
const PLACES: Record<string, Place> = {
  // Greybox leg 3's Checkpoint C (docs/plans/greybox-leg3.md): leg 3 laid, the body on Canopy Town's homeward
  // platform (src/content/levels/leg3.ts, cf.at(-10, -5.8)), the camera high over the strait beyond head 2, looking
  // along the row at the isle, its mother trunks and the chalk islets.
  canopy: { seed: 'canopy-reached', stand: [-1070, 15, -319], cam: [-700, 180, -620], look: [-1060, 20, -300] },
  // Leg 4's Checkpoint D: stand at quay.at(-10, -5.8) on the homeward platform and look from over the breakwater.
  port: { seed: 'port-reached', stand: [140.5, 5.5, 931.1], cam: [300, 100, 780], look: [45, 28, 980] },
  quayRoundhouse: {
    seed: 'port-reached',
    stand: [133.5, 5.5, 938.2],
    cam: [133.5, 5.6, 938.2],
    look: [109.91, 5, 914.79],
  },
  // Leg 5's Checkpoint E: the Wall jump landing at High Gorge, looking down the split toward the sea.
  wall: { seed: 'wall-closed', stand: [-132.55, 5.5, -1999.03], cam: [-114, 14, -1993], look: [-172, 4, -2030] },
  // Leg 6's Checkpoint F: from the island platform up the causeway, and from the Notch halt into the arch.
  ending: { seed: 'island-reached', stand: [-11.7, 4.9, -133.3], cam: [-20, 27, -115], look: [-28, 4, -192], fov: 55 },
  notch: { seed: 'notch-reached', stand: [-1569.9, 7.9, -966.5], cam: [-1558, 13, -945], look: [-1620, 17, -1000] },
  // Garage step 4's Checkpoint (docs/plans/garage-step4.md): `ns` Quick and `bay` Strong fitted, both copies in their
  // bays, the body by the Roundhouse's garage post (garage-geo.ts), the camera over the post looking across the table.
  roundhouse: { seed: 'trade-fitted', stand: [952.6, 19.2, 15.6], cam: [962, 28, 8], look: [944.5, 19, 19.2] },
};
const place = viewName ? PLACES[viewName] : undefined;
const railSeed = railSeedArg ?? place?.seed;
// The stand: a staging teleport repeated until the areas near it settle (as dev/look/evals/leg2-counts.ts), then a
// few seconds for the body to land and the trains to pose.
const STAND = ([x, y, z]: number[]) => `
  const { me } = await import('/src/player/player.ts');
  const { teleport } = await import('/src/physics/engine.ts');
  const { routeAreas, routeAreasPending } = await import('/src/entities/route-greybox/state.ts');
  const { railRead } = await import('/dev/look/rail-read.ts');
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  for (let k = 0; !(me.body && me.entered && railRead()?.whole()); k++) {
    if (k > 600) throw new Error('perf stand: the player and the railway never came up');
    await wait(100);
  }
  const near = () => [...routeAreas.values()].some((a) => a.mounted && Math.hypot(a.x - ${x}, a.z - ${z}) < 400);
  for (let k = 0; routeAreasPending(${x}, ${z}) || !near(); k++) {
    if (k > 600) throw new Error('perf stand: the route areas near the stand never mounted');
    teleport(me.body, ${x}, ${y}, ${z});
    me.body.velocity.set(0, 0, 0);
    await wait(100);
  }
  await wait(4000);
  return { at: [me.body.position.x, me.body.position.y, me.body.position.z].map((v) => Math.round(v * 10) / 10),
    areas: [...routeAreas.entries()].filter(([, a]) => a.mounted).map(([id]) => id) };`;

// The game draws from renderer.setAnimationLoop: three resets renderer.info at the start of each frame, then the game
// renders, so right after a frame renderer.info.render holds that frame's counts (the scene pass runs once per frame,
// calling pipeline.render again would count only the output pass). `frame` waits for the next frame to finish and
// copies them. The second sample turns the sun's shadow pass off.
const STATS = `
  const { renderer, sun } = await import('/src/render/scene.ts');
  const casting = sun.castShadow;
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
    sun.castShadow = false;
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
    sun.castShadow = casting;
    observer.stop();
  }`;

// Observe `n` clock updates under profileTicks, yielding so frames and timers still run. Shared rules run on the server.
const PROFILE = (n: number) => `
  const { profileTicks, updateWorld, worldStatus, TICK_MS } = await import('/src/world/sync.ts');
  const prof = profileTicks();
  let res;
  try {
    for (let k = 0; k < ${n}; k++) {
      updateWorld(TICK_MS / 1000);
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
// Every row is the sim (profileTicks' one kind): onTick handlers and state hashes.
type Row = Record<string, number>;
function summarize(rows: Row[], kinds: Record<string, string>) {
  const sum = (r: Row, keep: (l: string) => boolean) =>
    Object.entries(r).reduce((a, [l, ms]) => a + (keep(l) ? ms : 0), 0);
  const of = (kind: string) => stat(rows.map((r) => sum(r, (l) => kinds[l] === kind)));
  const table: Record<string, Stat> = {
    'whole tick (sum)': stat(rows.map((r) => sum(r, () => true))),
    'sim: onTick, hashes': of('sim'),
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
if (verdictFile) startRun(path.resolve(verdictFile), { checkout: root });
try {
  if (hardware && !doRender) throw new Error('--hardware cannot be combined with --sim');
  if (!Number.isFinite(seconds) || seconds < 1 || seconds > 30) throw new Error('--seconds must be 1–30');
  if (argv.includes('--view') && (!viewName || !(VIEWS[viewName] ?? PLACES[viewName])))
    throw new Error('Unknown --view; use ' + [...Object.keys(VIEWS), ...Object.keys(PLACES)].join(', '));
  if (railSeed && url) throw new Error('--rail-seed needs a local stack, not --url');
  stack = await startStack({ url });
  browser = await launch({ hardware });
  const room = railSeed ? 'perf-rail' : undefined;
  // After launch, as look's: queue time must not become away credit on the seeded save.
  if (railSeed) await (await import('./rail-seed.ts')).writeRailSeed(stack.dataDir!, room!, railSeed);
  // The spawn is a random spot, the sky follows the clock and the shadow pass culls around all that, so counts that must
  // repeat (--json) take a seeded Math.random, a fixed camera and a fixed sun, once the lazy props are in.
  const init = jsonOut ? SEEDED_RANDOM : undefined;
  const q = new URLSearchParams(query);
  if (hardware) q.set('prof', '1');
  const g = await Game.open(browser, stack, {
    name: 'perf',
    isolated: doSim || hardware,
    init,
    query: q.toString() || undefined,
    ...(room ? { room, out: path.resolve('.look/perf') } : {}),
    ...(size ? { size } : {}),
  });
  if (place) console.log(`stood at ${viewName} (${railSeed}):`, JSON.stringify(await g.eval(STAND(place.stand))));
  if (doRender) {
    if (jsonOut || viewName) {
      const { cam, look, fov } = place ?? VIEWS[viewName ?? 'overview']!;
      const pose = `${JSON.stringify(cam)}, ${JSON.stringify(look)}, ${fov ?? null}`;
      await g.eval(`window.__debugCam.set(${pose});`);
      await sleep(6000);
    }
    const measuredView = viewName ?? (jsonOut ? 'overview' : 'player camera');
    // Capture the settled scene before the shadow toggle can temporarily drop meshes from the frame.
    if (place) console.log('still', await g.still(`perf-${viewName}`));
    const row = { ...(await g.eval(STATS)), measuredView, railSeed: railSeed ?? null };
    if (hardware) {
      // The shadow-difference sample above perturbs a few frames; settle before the separate timing window.
      await sleep(1000);
      row.hardwareTiming = await g.eval(`
        const { hardwareTiming } = await import('/src/debug/prof-overlay.ts');
        return await hardwareTiming(${seconds});`);
      // Times from a software or fallback adapter (SwiftShader, WARP, llvmpipe) are not this device's GPU: refuse them.
      const adapter = (row.hardwareTiming?.start?.adapter ?? row.measurement?.adapter) as Record<
        string,
        unknown
      > | null;
      const named = adapter ? `${adapter.vendor} ${adapter.architecture} ${adapter.description}` : '';
      if (adapter?.isFallbackAdapter || /swiftshader|llvmpipe|basic render|warp/i.test(named))
        throw new Error(`hardware timing refused: software/fallback adapter ${JSON.stringify(adapter)}`);
      if (!adapter) console.log('hardware timing: adapter unknown (no adapterInfo); check it is the real GPU');
      console.log('hardware timing (visible browser; verify adapter and exclusive GPU use)');
      console.log(JSON.stringify(row.hardwareTiming, null, 2));
    }
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
    const metadata = { ...row };
    delete metadata.hardwareTiming;
    console.log(JSON.stringify(metadata, null, 2));
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
  if (verdictFile) finishRun({ verdict: 'pass' });
} catch (e) {
  console.error(e);
  process.exitCode = 1;
  if (verdictFile && runOpen()) finishRun({ verdict: 'fail', error: e });
} finally {
  await browser?.close().catch(() => {});
  await stack?.close();
  process.exit(process.exitCode || 0);
}

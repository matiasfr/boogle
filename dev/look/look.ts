// Visual inspection for agents: `npm run look -- --view hill`. See .claude/skills/look/SKILL.md.
// Captures evidence for a named visual question. A successful capture is not a visual verdict.
// Heatmaps are optional; --video records wall time, unlike the virtual-time promo clips in dev/video/.
import fs from 'node:fs';
import path from 'node:path';
import { stripTypeScriptTypes } from 'node:module';
import type { Browser } from 'playwright';
import { startStack, launch, Game, VIEWS, reportGfxErrors, root } from './lib.ts';
import { finishRun, startRun } from './verdict.ts';
import { markLight } from './bot-queue.ts';
import type { Stack } from './lib.ts';
import { findSave, listSaves, POSE_AT, SEED } from './saves.ts';
import { plotCurves, readCsv, readings, START_CURVES, STOP_CURVES, writeCsv } from './curves.ts';
import type { CurveData } from './curves.ts';
import { TARGETS } from './targets.ts';
import { coopWarpOptions, startCoopWarp } from './coop-warp.ts';
import { writeRailSeed } from './rail-seed.ts';
import { CLEANUP_MS, raceTimeout, TIMEOUT_EXIT, unmetPages, wallSeconds } from './wall.ts';

const opt: {
  view: string;
  cam: number[] | null;
  look: number[] | null;
  url: string | null;
  eval: string | null;
  action: string | null;
  question: string;
  video: boolean;
  heatmap: boolean;
  out: string;
  warm: number;
  frames: number;
  filmstrip: number;
  every: number;
  seconds: number;
  region: number[] | null;
  size: number[];
  fov: number | null;
  name: string | null;
  room?: string;
  railSeed?: string;
  query: string | undefined;
  hud: boolean;
  warp: boolean;
  until: string | null;
  wall: number | null;
  at: string | null;
  saves?: string;
  root?: string;
  curves: boolean;
  curvesVs: string | null;
  target: string | null;
  players: number;
  clockUrl?: string;
  island: boolean;
  reducedMotion: boolean;
} = {
  view: 'hill',
  cam: null,
  look: null,
  url: null,
  eval: null,
  action: null,
  question: 'Renderer startup and capture only',
  video: false,
  heatmap: false,
  out: '.look',
  warm: 10,
  frames: 8,
  filmstrip: 0,
  every: 1,
  seconds: 2,
  region: null,
  size: [960, 600],
  fov: null,
  name: null,
  hud: false,
  warp: true,
  until: null,
  wall: null,
  at: null,
  query: undefined,
  curves: false,
  curvesVs: null,
  target: null,
  players: 1,
  island: false,
  reducedMotion: false,
};
const argv = process.argv.slice(2);
for (let k = 0; k < argv.length; k++) {
  const a = argv[k];
  const v = () => {
    const value = argv[++k];
    if (value === undefined) {
      console.error(a + ' needs a value');
      process.exit(2);
    }
    return value;
  };
  if (a === '--view') opt.view = v();
  else if (a === '--rail-seed') opt.railSeed = v();
  else if (a === '--cam') opt.cam = v().split(',').map(Number);
  else if (a === '--look') opt.look = v().split(',').map(Number);
  else if (a === '--url') opt.url = v();
  else if (a === '--eval') opt.eval = v();
  else if (a === '--action') opt.action = v();
  else if (a === '--question') opt.question = v();
  else if (a === '--video') opt.video = true;
  else if (a === '--heatmap') opt.heatmap = true;
  else if (a === '--out') opt.out = v();
  else if (a === '--warm') opt.warm = parseFloat(v());
  else if (a === '--filmstrip') opt.filmstrip = Number(v());
  else if (a === '--every') opt.every = Number(v());
  else if (a === '--frames') opt.frames = parseInt(v(), 10);
  else if (a === '--seconds') opt.seconds = parseFloat(v());
  else if (a === '--region')
    opt.region = v().split(',').map(Number); // x,y,w,h as fractions 0..1
  else if (a === '--size') opt.size = v().split('x').map(Number);
  else if (a === '--fov') opt.fov = Number(v());
  else if (a === '--name') opt.name = v();
  else if (a === '--room')
    opt.room = v(); // e.g. proto-wagon: a playtest room, where tune and shortcut ops are allowed
  else if (a === '--query')
    opt.query = v(); // URL params for the page, like BOOGLE_QUERY; a Codex rule can't see past an environment variable
  else if (a === '--hud')
    opt.hud = true; // keep the HUD in the picture
  else if (a === '--reduced-motion')
    opt.reducedMotion = true; // every page emulates prefers-reduced-motion: reduce
  else if (a === '--island')
    opt.island = true; // start on the classic island by the court, in the current game's world (lib.ts)
  else if (a === '--warp')
    opt.warp = true; // the default: --warm and an eval's waits pass in game time, far faster than real (./warp.ts). Captures run at real speed
  else if (a === '--real')
    opt.warp = false; // the warm-up in real time too: for what warps can't show, like how long something takes to load
  else if (a === '--until')
    opt.until = v(); // warm up until this page expression is true (--warm is then only the limit)
  else if (a === '--wall')
    opt.wall = Number(v()); // hard wall-clock limit on the whole run in seconds (default 1200, ./wall.ts); also the warped warm-up's
  else if (a === '--saves')
    opt.saves = v(); // explicit checkpoint directory, including another worktree's bot run
  else if (a === '--at')
    opt.at = v(); // start at a beat of the last `npm run playthrough`, in its real state: a save, not a skip
  else if (a === '--players')
    opt.players = Number(v()); // 2: a second player in the same room, each in its own browser profile, so neither takes over
  else if (a === '--warp-speed')
    v(); // validated by coopWarpOptions below
  else if (a === '--clock-url')
    opt.clockUrl = v(); // local server owned by dev/codex/see.ts
  else if (a === '--curves')
    opt.curves = true; // every frame's speed, height, camera distance: a CSV, a plot and readings (./curves.ts)
  else if (a === '--curves-vs') {
    opt.curves = true;
    opt.curvesVs = v(); // an earlier run's CSV, drawn underneath
  } else if (a === '--target') {
    opt.curves = true;
    opt.target = v(); // a reference to draw and score against (./targets.ts)
  } else if (a === '--root')
    opt.root = v(); // serve another checkout's build
  else if (a === '--help' || a === '-h') {
    console.log(`npm run look -- [--view ${Object.keys(VIEWS).join('|')}] [--cam x,y,z --look x,y,z] [--fov deg]
  [--question "what should be visible?"] [--eval setup.ts] [--action action.ts] [--video]
  [--filmstrip N] [--every K]              capture N drawn frames, K game frames apart (warp only)
  [--warm 10] [--frames 8] [--seconds 2] [--heatmap --region x,y,w,h (fractions)] [--size 960x600]
  [--query 'shot=play'] [--hud] [--out .look] [--name label] [--room proto-x] [--url http://...]
  [--rail-seed awake]                       start from an accepted railway server save (dev/look/rail-seed.ts)
  [--island]                                start on the classic island (the original island at the origin)
  [--reduced-motion]                        every page emulates prefers-reduced-motion: reduce
  [--until "window.__placeDone"] [--real]   the warm-up runs warped; --until ends it early; --real keeps it in real time
  [--wall 1200]                             hard limit on the whole run once it holds the bot slot (seconds): verdict "timeout", exit 4
  [--at "forge lit"]                        start at a beat of the last playthrough; --at list names them
  [--saves <directory>]                     use checkpoints from this playthrough instead of latest
  [--root <checkout>]                       serve another checkout's build
  [--players 2]                             two players, one room: the eval runs on both, &player=1 and &player=2
  [--warp-speed 5]                          cap both pages and accelerate the local server; --real opts out
  [--curves] [--curves-vs old.csv] [--target glide]   speed, height, camera, frame time per frame: CSV, plot, readings`);
    process.exit(0);
  } else {
    console.error('unknown option ' + a);
    process.exit(2);
  }
}
if (argv.includes('--filmstrip') && (!opt.warp || opt.url || argv.includes('--players'))) {
  console.error('--filmstrip needs warp and cannot be used with --real, --url or --players');
  process.exit(2);
}
if (
  (argv.includes('--filmstrip') && (!Number.isSafeInteger(opt.filmstrip) || opt.filmstrip < 1)) ||
  !Number.isSafeInteger(opt.every) ||
  opt.every < 1 ||
  (argv.includes('--every') && !opt.filmstrip)
) {
  console.error('--filmstrip and --every require positive integers; --every requires --filmstrip');
  process.exit(2);
}
const coopOptions = coopWarpOptions(argv);
// Only a locally controlled server can share the pages' warp. External sites retain real time.
if (opt.url && !opt.clockUrl) opt.warp = false;
if (opt.clockUrl && (opt.players !== 2 || !opt.warp)) throw new Error('--clock-url requires two-player warp');
if (opt.players !== 1 && opt.players !== 2) throw new Error('--players must be 1 or 2');
const region = opt.region;
if (
  !Number.isInteger(opt.frames) ||
  opt.frames < 2 ||
  !Number.isFinite(opt.seconds) ||
  opt.seconds <= 0 ||
  !Number.isFinite(opt.warm) ||
  opt.warm < 0 ||
  opt.size.length !== 2 ||
  opt.size.some((v) => !Number.isInteger(v) || v <= 0) ||
  (opt.heatmap && !region) ||
  (region &&
    (region.length !== 4 ||
      region.some((v) => !Number.isFinite(v) || v < 0 || v > 1) ||
      region[2]! <= 0 ||
      region[3]! <= 0 ||
      region[0]! + region[2]! > 1 ||
      region[1]! + region[3]! > 1))
) {
  console.error(
    'Use frames >= 2, seconds > 0, warm >= 0, positive integer size, and a nonempty region inside 0..1. --heatmap requires --region.',
  );
  process.exit(2);
}
const pose = opt.cam ? { cam: opt.cam, look: opt.look || [0, 0, 0] } : VIEWS[opt.view];
if (!pose) throw new Error('unknown view ' + opt.view);
const label = opt.name || (opt.cam ? 'custom' : opt.view);

if (opt.at === 'list') {
  for (const b of listSaves(opt.saves)) console.log(b);
  process.exit(0);
}
const save = opt.at ? findSave(opt.at, opt.saves) : null;
if (save) console.log(`at: "${save.beat}", ${Math.round(save.t)} s into the run ${save.run}`);

startRun(path.join(opt.out, `${label}-verdict.json`), { checkout: path.resolve(opt.root ?? root) });
// A plain still may share the machine with another; real time (--video, --real), motion curves and two players keep
// it to themselves.
if (!opt.video && !opt.curves && opt.warp && opt.players === 1 && !process.argv.includes('--long')) markLight();
let stack: Stack | undefined, browser: Browser | undefined;
// The hard wall (./wall.ts): armed once the run holds the bot slot, so a hang in any phase or page cannot keep it.
const wall = wallSeconds(opt.wall);
const pages: Game[] = [];
let phase = 'startup';
let wallTimer: ReturnType<typeof setTimeout> | undefined;
let timedOut = false;
async function wallFired() {
  timedOut = true;
  process.exitCode = TIMEOUT_EXIT;
  const unmet = opt.until
    ? await unmetPages(
        pages.map((p, i) => ({
          label: `player ${i + 1}`,
          met: () => p.page.evaluate(`!!(${opt.until})`),
        })),
      )
    : [];
  const never = opt.until && !pages.length ? ['no page had opened'] : unmet;
  const message = `--wall ${wall}: the run was still in ${phase} after ${wall} s${opt.until ? `; --until ${opt.until} never met on: ${never.join(', ') || 'none (all met)'}` : ''}`;
  console.error(message);
  finishRun({
    verdict: 'timeout',
    view: label,
    wallSeconds: wall,
    phase,
    until: opt.until,
    unmetPages: never,
    error: message,
  });
  // Bounded: a hung page can make any of these wait forever.
  await raceTimeout(Promise.allSettled([coopWarp?.stop(), browser?.close(), stack?.close()]), CLEANUP_MS);
  process.exit(TIMEOUT_EXIT);
}
let coopWarp: Awaited<ReturnType<typeof startCoopWarp>> | undefined;
async function pageScript(g: Game, file: string) {
  let body = fs.readFileSync(path.resolve(file), 'utf8');
  // TS evals are modules (top-level await); remove the module marker after stripping types for page evaluation.
  if (file.endsWith('.ts')) body = stripTypeScriptTypes(body).replace(/^export \{\};.*$/m, '');
  const out = await g.eval(body);
  if (out !== undefined) console.log('eval result:', JSON.stringify(out));
}
try {
  if (opt.railSeed && opt.url) throw new Error('--rail-seed needs a local stack, not --url');
  stack = await startStack({ url: opt.url, root: opt.root, warp: opt.warp && opt.players === 2 });
  if (opt.railSeed) {
    opt.room ??= 'look-rail';
    await writeRailSeed(stack.dataDir!, opt.room, opt.railSeed);
  }
  browser = await launch();
  wallTimer = setTimeout(() => void wallFired(), wall * 1000);
  const g = await Game.open(browser, stack, {
    sourceImports: !!(opt.curves || save || opt.eval || opt.action || opt.until || opt.island),
    island: opt.island,
    reducedMotion: opt.reducedMotion,
    out: opt.out,
    size: opt.size,
    hud: opt.hud,
    room: opt.players > 1 ? (opt.room ?? 'look-two') : (save?.room ?? opt.room),
    query:
      [opt.query, save?.pageQuery, opt.players > 1 ? 'player=1' : ''].filter(Boolean).join('&') ||
      (opt.query === '' ? '' : undefined),
    init: [
      "localStorage.getItem('boogle.color') || localStorage.setItem('boogle.color', '1');", // comparable pictures
      save ? SEED(save) : '',
    ].join('\n'),
    warp: opt.warp,
  });
  pages.push(g);
  // What an eval says as it goes (PLAY ..., RIDE ...): here as it happens, so a long run can be read without its still.
  g.page.on('console', (m) => /^[A-Z]{3,} /.test(m.text()) && console.log(m.text()));
  console.log(
    `question: ${opt.question}\nview: ${JSON.stringify(pose)}\naction: ${opt.action ?? 'none (observe only)'}`,
  );
  if (save) await g.eval(POSE_AT(save));
  // Its own browser profile, as a friend's machine would be: one profile is one player, and a second tab of it takes over.
  const g2 =
    opt.players > 1
      ? await Game.open(browser, stack, {
          sourceImports: !!(opt.curves || save || opt.eval || opt.action || opt.until || opt.island),
          island: opt.island,
          reducedMotion: opt.reducedMotion,
          out: opt.out,
          size: opt.size,
          hud: opt.hud,
          name: 'Second',
          room: opt.room ?? 'look-two',
          query: [opt.query, 'player=2'].filter(Boolean).join('&'),
          prefix: 'p2-',
          warp: opt.warp,
        })
      : null;
  if (g2) pages.push(g2);
  g2?.page.on('console', (m) => /^[A-Z]{3,} /.test(m.text()) && console.log(`[2] ${m.text()}`));
  if (g2) {
    coopWarp = await startCoopWarp(
      [g, g2],
      opt.warp ? (opt.clockUrl ?? stack.clockUrl) : undefined,
      opt.warp ? coopOptions.speed : 1,
      path.join(g.out, `${label}-warp.json`),
    );
  }
  phase = 'warm-up';
  // Warped, the setup's own waits take no time.
  const warpNow = (n: number) => g.page.evaluate((s) => window.__warp?.go(s ?? Infinity), n);
  if (opt.eval) {
    if (opt.warp && !g2) await warpNow(Infinity);
    await Promise.all([pageScript(g, opt.eval), ...(g2 ? [pageScript(g2, opt.eval)] : [])]);
    if (opt.warp && !g2) await warpNow(1);
  }
  // At a beat or with two players, the follow camera shows the player unless a camera was asked for.
  if ((!save && opt.players < 2) || opt.cam) await g.view(pose, opt.fov ?? undefined);
  if (g2 && opt.cam) await g2.view(pose, opt.fov ?? undefined);
  const limit = opt.until && !argv.includes('--warm') ? 3600 : save && !argv.includes('--warm') ? 2 : opt.warm;
  console.log(
    `warming up ${opt.warp ? 'warped, ' : ''}${limit}s of game time${opt.until ? ` or until ${opt.until}` : ''} ...`,
  );
  if (coopWarp) {
    await coopWarp.warm(limit, opt.until);
    const running = coopWarp;
    coopWarp = undefined;
    await running.stop();
  } else if (opt.warp) {
    const w = await g.warp({
      seconds: limit,
      until: opt.until ?? undefined,
      ...(opt.wall ? { wallLimit: opt.wall } : {}),
    });
    console.log(`warped: ${w.game.toFixed(0)} s of game in ${w.wall.toFixed(0)} s (${(w.game / w.wall).toFixed(0)}x)`);
    if (opt.until && !w.done) console.log(`NOT REACHED: ${opt.until}`);
  } else {
    const t0 = Date.now();
    while (Date.now() - t0 < limit * 1000 && !g.errors.length) {
      await new Promise((r) => setTimeout(r, 200));
      if (opt.until && (await g.page.evaluate(`!!(${opt.until})`))) break;
    }
  }
  if (g.errors.length) throw new Error(`Stopped during warm-up:\n${g.healthErrors().join('\n')}`);
  phase = 'capture';
  const video = opt.video ? path.join(g.out, `${label}-realtime.webm`) : null;
  if (video)
    await g.page.screencast.start({ path: video, size: { width: opt.size[0]!, height: opt.size[1]! }, fps: 30 });
  try {
    if (opt.filmstrip) await warpNow(0);
    if (opt.curves) await g.eval(START_CURVES);
    if (opt.filmstrip && opt.curves) await g.eval('window.__curves.rows.length = 0;');
    if (opt.action) await pageScript(g, opt.action);
    const m = await g.motion(label, {
      frames: opt.filmstrip || opt.frames,
      seconds: opt.seconds,
      region,
      heatmap: opt.heatmap,
      every: opt.filmstrip ? opt.every : 0,
    });
    if (opt.curves) {
      const target = opt.target ? TARGETS[opt.target] : null;
      if (opt.target && !target) throw new Error(`no target ${opt.target}: ${Object.keys(TARGETS).join(', ')}`);
      const data = (await g.eval(STOP_CURVES)) as CurveData;
      const vs = opt.curvesVs ? readCsv(opt.curvesVs) : null;
      const csv = path.join(g.out, `${label}-curves.csv`);
      const png = path.join(g.out, `${label}-curves.png`);
      writeCsv(csv, data.rows);
      await plotCurves(g, png, { ...data, vs, target: target ?? null, label: opt.question });
      console.log(`curves:  ${png}\ncsv:     ${csv}`);
      for (const line of readings(data.rows, target)) console.log('  ' + line);
    }
    if (opt.filmstrip) await warpNow(1);
    console.log(`still:   ${await g.still(label)}\n${opt.filmstrip ? 'filmstrip' : 'motion'}:  ${m.sheet}`);
    if (g2) {
      console.log(`still 2: ${await g2.still(label)}`);
      const two = await g.eval(`return { first: window.boogle.remotes.size }`);
      const other = await g2.eval(`return { second: window.boogle.remotes.size }`);
      console.log(`players seen: ${JSON.stringify({ ...two, ...other })}`);
      if (two.first < 1 || other.second < 1) throw new Error('The two players never saw each other');
      const more = g2.healthErrors();
      if (more.length) throw new Error(more.join('\n'));
    }
    if (m.heat) console.log(`heatmap: ${m.heat}`);
    if (region)
      console.log(
        `region pixel change: ${m.score.toFixed(3)}; pixels >8: ${(m.hotFrac * 100).toFixed(1)}% (diagnostic, not a quality score)`,
      );
    const fps = await g.fps();
    console.log(`completed game frames/s: ${fps.toFixed(1)} (1s sample; not a GPU benchmark)`);
    reportGfxErrors(g2 ? [g, g2] : [g]);
    const errors = g.healthErrors();
    if (fps <= 0) errors.push('No completed game frames during the sample');
    if (errors.length) throw new Error(errors.join('\n'));
  } finally {
    if (video) {
      await g.page.screencast.stop();
      console.log(`real-time video: ${video}`);
    }
  }
  console.log(
    'Capture checks passed: WebGPU, advancing game frames, no page or console errors. Inspect the artifacts to answer the question.',
  );
  clearTimeout(wallTimer);
  finishRun({ verdict: 'pass', view: label });
} catch (e) {
  console.error(e);
  // After the wall fired, the closing browsers throw: that is the timeout's cleanup, not a failure.
  if (!timedOut) {
    process.exitCode = 1;
    finishRun({ verdict: 'failure', view: label, error: String(e) });
  }
} finally {
  clearTimeout(wallTimer);
  if (timedOut) await new Promise(() => {}); // the wall handler writes the verdict, cleans up and exits
  await coopWarp?.stop().catch((e) => console.error('warp cleanup:', e));
  await browser?.close().catch(() => {});
  await stack?.close();
  process.exit(process.exitCode || 0);
}

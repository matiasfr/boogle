// Visual inspection for agents: `npm run look -- --view hill`. See .claude/skills/look/SKILL.md.
// Captures evidence for a named visual question. A successful capture is not a visual verdict.
// Heatmaps are optional; --video records wall time, unlike the virtual-time promo clips in dev/video/.
import fs from 'node:fs';
import path from 'node:path';
import { stripTypeScriptTypes } from 'node:module';
import type { Browser } from 'playwright';
import { startStack, launch, Game, VIEWS, reportGfxErrors } from './lib.ts';
import type { Stack } from './lib.ts';
import { findSave, listSaves, POSE_AT, SEED } from './saves.ts';
import { plotCurves, readCsv, readings, START_CURVES, STOP_CURVES, writeCsv } from './curves.ts';
import type { CurveData } from './curves.ts';
import { TARGETS } from './targets.ts';

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
  seconds: number;
  region: number[] | null;
  size: number[];
  fov: number | null;
  name: string | null;
  room?: string;
  hud: boolean;
  warp: boolean;
  until: string | null;
  at: string | null;
  root?: string;
  curves: boolean;
  curvesVs: string | null;
  target: string | null;
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
  seconds: 2,
  region: null,
  size: [960, 600],
  fov: null,
  name: null,
  hud: false,
  warp: false,
  until: null,
  at: null,
  curves: false,
  curvesVs: null,
  target: null,
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
  else if (a === '--frames') opt.frames = parseInt(v(), 10);
  else if (a === '--seconds') opt.seconds = parseFloat(v());
  else if (a === '--region')
    opt.region = v().split(',').map(Number); // x,y,w,h as fractions 0..1
  else if (a === '--size') opt.size = v().split('x').map(Number);
  else if (a === '--fov') opt.fov = Number(v());
  else if (a === '--name') opt.name = v();
  else if (a === '--room')
    opt.room = v(); // e.g. proto-wagon: a playtest room, where tune and shortcut ops are allowed
  else if (a === '--hud')
    opt.hud = true; // keep the HUD in the picture
  else if (a === '--warp')
    opt.warp = true; // spend --warm in game time, far faster than real (./warp.ts); captures still run at real speed
  else if (a === '--until')
    opt.until = v(); // warm up until this page expression is true (--warm is then only the limit)
  else if (a === '--at')
    opt.at = v(); // start at a beat of the last `npm run playthrough`, in its real state: a save, not a skip
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
  [--warm 10] [--frames 8] [--seconds 2] [--heatmap --region x,y,w,h (fractions)] [--size 960x600]
  [--hud] [--out .look] [--name label] [--room proto-x] [--url http://...]
  [--warp] [--until "window.__placeDone"]   long stretches of play in seconds; PLAY-style console lines print as they come
  [--at "forge lit"]                        start at a beat of the last playthrough; --at list names them
  [--root <checkout>]                       serve another checkout's build
  [--curves] [--curves-vs old.csv] [--target glide]   speed, height, camera, frame time per frame: CSV, plot, readings`);
    process.exit(0);
  } else {
    console.error('unknown option ' + a);
    process.exit(2);
  }
}
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
  for (const b of listSaves()) console.log(b);
  process.exit(0);
}
const save = opt.at ? findSave(opt.at) : null;
if (save) console.log(`at: "${save.beat}", ${Math.round(save.t)} s into the run ${save.run}`);

let stack: Stack | undefined, browser: Browser | undefined;
async function pageScript(g: Game, file: string) {
  let body = fs.readFileSync(path.resolve(file), 'utf8');
  // TS evals are modules (top-level await); remove the module marker after stripping types for page evaluation.
  if (file.endsWith('.ts')) body = stripTypeScriptTypes(body).replace(/^export \{\};.*$/m, '');
  const out = await g.eval(body);
  if (out !== undefined) console.log('eval result:', JSON.stringify(out));
}
try {
  stack = await startStack({ url: opt.url, root: opt.root });
  browser = await launch();
  const g = await Game.open(browser, stack, {
    out: opt.out,
    size: opt.size,
    hud: opt.hud,
    room: save?.room ?? opt.room,
    query: save?.pageQuery,
    init: save ? SEED(save) : undefined,
    warp: opt.warp,
  });
  // What an eval says as it goes (PLAY ..., RIDE ...): here as it happens, so a long run can be read without its still.
  g.page.on('console', (m) => /^[A-Z]{3,} /.test(m.text()) && console.log(m.text()));
  console.log(
    `question: ${opt.question}\nview: ${JSON.stringify(pose)}\naction: ${opt.action ?? 'none (observe only)'}`,
  );
  if (save) await g.eval(POSE_AT(save));
  // Warped, the setup's own waits take no time.
  const warpNow = (n: number) => g.page.evaluate((s) => window.__warp?.go(s ?? Infinity), n);
  if (opt.eval) {
    if (opt.warp) await warpNow(Infinity);
    await pageScript(g, opt.eval);
    if (opt.warp) await warpNow(1);
  }
  if (!save || opt.cam) await g.view(pose, opt.fov ?? undefined);
  const limit = opt.until && !argv.includes('--warm') ? 3600 : save && !argv.includes('--warm') ? 2 : opt.warm;
  console.log(
    `warming up ${opt.warp ? 'warped, ' : ''}${limit}s of game time${opt.until ? ` or until ${opt.until}` : ''} ...`,
  );
  if (opt.warp) {
    const w = await g.warp({ seconds: limit, until: opt.until ?? undefined });
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
  const video = opt.video ? path.join(g.out, `${label}-realtime.webm`) : null;
  if (video)
    await g.page.screencast.start({ path: video, size: { width: opt.size[0]!, height: opt.size[1]! }, fps: 30 });
  try {
    if (opt.curves) await g.eval(START_CURVES);
    if (opt.action) await pageScript(g, opt.action);
    const m = await g.motion(label, { frames: opt.frames, seconds: opt.seconds, region, heatmap: opt.heatmap });
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
    console.log(`still:   ${await g.still(label)}\nmotion:  ${m.sheet}`);
    if (m.heat) console.log(`heatmap: ${m.heat}`);
    if (region)
      console.log(
        `region pixel change: ${m.score.toFixed(3)}; pixels >8: ${(m.hotFrac * 100).toFixed(1)}% (diagnostic, not a quality score)`,
      );
    const fps = await g.fps();
    console.log(`completed game frames/s: ${fps.toFixed(1)} (1s sample; not a GPU benchmark)`);
    reportGfxErrors([g]);
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
} catch (e) {
  console.error(e);
  process.exitCode = 1;
} finally {
  await browser?.close().catch(() => {});
  await stack?.close();
  process.exit(process.exitCode || 0);
}

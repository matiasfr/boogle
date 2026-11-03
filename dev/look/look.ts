// Visual inspection for agents: `npm run look -- --view hill`. See .claude/skills/look/SKILL.md.
// Captures evidence for a named visual question. A successful capture is not a visual verdict.
// Heatmaps are optional; --video records wall time, unlike the virtual-time promo clips in dev/video/.
import fs from 'node:fs';
import path from 'node:path';
import { stripTypeScriptTypes } from 'node:module';
import type { Browser } from 'playwright';
import { startStack, launch, Game, VIEWS, reportGfxErrors } from './lib.ts';
import type { Stack } from './lib.ts';

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
  else if (a === '--help' || a === '-h') {
    console.log(`npm run look -- [--view ${Object.keys(VIEWS).join('|')}] [--cam x,y,z --look x,y,z] [--fov deg]
  [--question "what should be visible?"] [--eval setup.ts] [--action action.ts] [--video]
  [--warm 10] [--frames 8] [--seconds 2] [--heatmap --region x,y,w,h (fractions)] [--size 960x600]
  [--hud] [--out .look] [--name label] [--room proto-x] [--url http://...]
  [--warp] [--until "window.__placeDone"]   long stretches of play in seconds; PLAY-style console lines print as they come`);
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

let stack: Stack | undefined, browser: Browser | undefined;
async function pageScript(g: Game, file: string) {
  let body = fs.readFileSync(path.resolve(file), 'utf8');
  // TS evals are modules (top-level await); remove the module marker after stripping types for page evaluation.
  if (file.endsWith('.ts')) body = stripTypeScriptTypes(body).replace(/^export \{\};.*$/m, '');
  const out = await g.eval(body);
  if (out !== undefined) console.log('eval result:', JSON.stringify(out));
}
try {
  stack = await startStack({ url: opt.url });
  browser = await launch();
  const g = await Game.open(browser, stack, {
    out: opt.out,
    size: opt.size,
    hud: opt.hud,
    room: opt.room,
    warp: opt.warp,
  });
  // What an eval says as it goes (PLAY ..., RIDE ...): here as it happens, so a long run can be read without its still.
  g.page.on('console', (m) => /^[A-Z]{3,} /.test(m.text()) && console.log(m.text()));
  console.log(
    `question: ${opt.question}\nview: ${JSON.stringify(pose)}\naction: ${opt.action ?? 'none (observe only)'}`,
  );
  if (opt.eval) await pageScript(g, opt.eval);
  await g.view(pose, opt.fov ?? undefined);
  const limit = opt.until && !argv.includes('--warm') ? 3600 : opt.warm;
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
    if (opt.action) await pageScript(g, opt.action);
    const m = await g.motion(label, { frames: opt.frames, seconds: opt.seconds, region, heatmap: opt.heatmap });
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

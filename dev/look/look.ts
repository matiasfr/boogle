// Visual inspection for agents: `npm run look -- --view hill`. See .claude/skills/look/SKILL.md.
// Enters the island headless, puts the camera at a view, warms up, then writes a still, a motion contact sheet
// and a per-pixel stddev heatmap, and prints a motion score. Scenario checks live in dev/scenarios/.
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
} = {
  view: 'hill',
  cam: null,
  look: null,
  url: null,
  eval: null,
  out: '.look',
  warm: 10,
  frames: 8,
  seconds: 2,
  region: null,
  size: [960, 600],
  fov: null,
  name: null,
  hud: false,
};
const argv = process.argv.slice(2);
for (let k = 0; k < argv.length; k++) {
  const a = argv[k];
  const v = () => argv[++k];
  if (a === '--view') opt.view = v();
  else if (a === '--cam') opt.cam = v().split(',').map(Number);
  else if (a === '--look') opt.look = v().split(',').map(Number);
  else if (a === '--url') opt.url = v();
  else if (a === '--eval') opt.eval = v();
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
  else if (a === '--help' || a === '-h') {
    console.log(`npm run look -- [--view ${Object.keys(VIEWS).join('|')}] [--cam x,y,z --look x,y,z] [--fov deg]
  [--eval file.js|file.ts] [--warm 10s] [--frames 8] [--seconds 2] [--region x,y,w,h (fractions)] [--size 960x600]
  [--hud] [--out .look] [--name label] [--room proto-x] [--url http://...]`);
    process.exit(0);
  } else {
    console.error('unknown option ' + a);
    process.exit(2);
  }
}
const pose = opt.cam ? { cam: opt.cam, look: opt.look || [0, 0, 0] } : VIEWS[opt.view];
if (!pose) throw new Error('unknown view ' + opt.view);
const label = opt.name || (opt.cam ? 'custom' : opt.view);

let stack: Stack | undefined, browser: Browser | undefined;
try {
  stack = await startStack({ url: opt.url });
  browser = await launch();
  const g = await Game.open(browser, stack, { out: opt.out, size: opt.size, hud: opt.hud, room: opt.room });
  if (opt.eval) {
    let body = fs.readFileSync(path.resolve(opt.eval), 'utf8');
    // A .ts body (dev/look/evals/) ends in `export {}` so the type checker reads it as a module (top-level await, its
    // own scope): strip the types and that line, and the page runs the same body as before.
    if (opt.eval.endsWith('.ts')) body = stripTypeScriptTypes(body).replace(/^export \{\};.*$/m, '');
    const out = await g.eval(body);
    if (out !== undefined) console.log('eval result:', JSON.stringify(out));
  }
  await g.view(pose, opt.fov ?? undefined);
  console.log(`warming up ${opt.warm}s ...`);
  await new Promise((r) => setTimeout(r, opt.warm * 1000));
  const still = await g.still(label);
  const m = await g.motion(label, { frames: opt.frames, seconds: opt.seconds, region: opt.region });
  console.log(`still:   ${still}\nmotion:  ${m.sheet}\nheatmap: ${m.heat}`);
  reportGfxErrors([g]);
  console.log(
    `motion score (${label}): ${m.score.toFixed(3)}  (mean temporal stddev 0-255; hot pixels >8: ${(m.hotFrac * 100).toFixed(1)}%; ${(await g.fps()).toFixed(1)} fps)`,
  );
} catch (e) {
  console.error(e);
  process.exitCode = 1;
} finally {
  await browser?.close().catch(() => {});
  await stack?.close();
  process.exit(process.exitCode || 0);
}

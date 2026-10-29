// Visual inspection for agents: `npm run look -- --view hill`. See .claude/skills/look/SKILL.md.
// Enters the island headless, puts the camera at a view, warms up, then writes a still, a motion contact sheet
// and a per-pixel stddev heatmap, and prints a motion score. Scenario checks live in dev/scenarios/.
import fs from 'node:fs';
import path from 'node:path';
import { startStack, launch, Game, VIEWS } from './lib.mjs';

const opt = {
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
  else if (a === '--hud')
    opt.hud = true; // keep the HUD in the picture
  else if (a === '--help' || a === '-h') {
    console.log(`npm run look -- [--view ${Object.keys(VIEWS).join('|')}] [--cam x,y,z --look x,y,z] [--fov deg]
  [--eval file.js] [--warm 10s] [--frames 8] [--seconds 2] [--region x,y,w,h (fractions)] [--size 960x600]
  [--hud] [--out .look] [--name label] [--url http://...]`);
    process.exit(0);
  } else {
    console.error('unknown option ' + a);
    process.exit(2);
  }
}
const pose = opt.cam ? { cam: opt.cam, look: opt.look || [0, 0, 0] } : VIEWS[opt.view];
if (!pose) throw new Error('unknown view ' + opt.view);
const label = opt.name || (opt.cam ? 'custom' : opt.view);

let stack, browser;
try {
  stack = await startStack({ url: opt.url });
  browser = await launch();
  const g = await Game.open(browser, stack, { out: opt.out, size: opt.size, hud: opt.hud });
  if (opt.eval) {
    const out = await g.eval(fs.readFileSync(path.resolve(opt.eval), 'utf8'));
    if (out !== undefined) console.log('eval result:', JSON.stringify(out));
  }
  await g.view(pose, opt.fov);
  console.log(`warming up ${opt.warm}s ...`);
  await new Promise((r) => setTimeout(r, opt.warm * 1000));
  const still = await g.still(label);
  const m = await g.motion(label, { frames: opt.frames, seconds: opt.seconds, region: opt.region });
  console.log(`still:   ${still}\nmotion:  ${m.sheet}\nheatmap: ${m.heat}`);
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

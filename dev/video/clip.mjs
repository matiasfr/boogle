// Record short videos of the running game: `npm run clip -- <shot>...` (dev/video/shots/<shot>.mjs, or a path to a
// shot file kept elsewhere, e.g. for a prototype branch). See .claude/skills/video/SKILL.md. Uses the real GPU when there is one and steps a fake page clock, so clips play
// smoothly at --fps however fast the page renders. Output: .look/clips/<label>.mp4 (+ .gif with --gif).
//
// A shot is dev/video/shots/<name>.mjs:
//   export default { about: 'one line', query: 'tidefast=1', async run(c) { ... } };
// `c` gives you:
//   c.open({ name, room, query, hud })  a player (Game from lib.ts) with the clock installed; same room = same island
//   g.record(label, { seconds, each })  a clip; `each(t)` runs before every frame (camera moves, input)
//   c.move(a, b, seconds, ease)          an `each` that glides the debug camera from pose a to pose b
//   c.ease, c.sleep, c.VIEWS
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { startStack, launch, Game, VIEWS, sleep } from '../look/lib.ts';

const here = path.resolve(path.dirname(fileURLToPath(import.meta.url)), 'shots');
const all = fs
  .readdirSync(here)
  .filter((f) => f.endsWith('.mjs') && !f.startsWith('_'))
  .map((f) => f.slice(0, -4))
  .sort();
const opt = { names: [], root: undefined, gif: false, size: [1280, 720], fps: 30, out: '.look' };
const argv = process.argv.slice(2);
for (let k = 0; k < argv.length; k++) {
  const a = argv[k];
  const v = () => argv[++k];
  if (a === '--root') opt.root = path.resolve(v());
  else if (a === '--gif') opt.gif = true;
  else if (a === '--size') opt.size = v().split('x').map(Number);
  else if (a === '--fps') opt.fps = Number(v());
  else if (a === '--out') opt.out = v();
  else if (a === '--help' || a === '-h' || a.startsWith('-')) {
    console.log(`npm run clip -- <shot | path/to/shot.mjs>... [--gif] [--size 1280x720] [--fps 30] [--out .look]
  [--root ../other-checkout (serve a worktree, e.g. a prototype branch)]
shots: ${all.join(', ')}`);
    process.exit(a.startsWith('--h') || a === '-h' ? 0 : 2);
  } else opt.names.push(a);
}
// A bare name is a shot in dev/video/shots/; anything with a slash or .mjs is a path.
const isPath = (n) => n.includes('/') || n.endsWith('.mjs');
const shotFile = (n) => (isPath(n) ? path.resolve(n) : path.join(here, n + '.mjs'));
const bad = opt.names.filter((n) => !(isPath(n) ? fs.existsSync(shotFile(n)) : all.includes(n)));
if (!opt.names.length || bad.length) {
  console.error(`${bad.length ? 'unknown shot ' + bad.join(', ') + '. ' : ''}Available: ${all.join(', ')}`);
  process.exit(2);
}

const ease = {
  linear: (x) => x,
  inOut: (x) => (x < 0.5 ? 4 * x * x * x : 1 - (-2 * x + 2) ** 3 / 2),
  out: (x) => 1 - (1 - x) ** 3,
};
const mix = (a, b, u) => a.map((v, i) => v + (b[i] - v) * u);
const pose = (p) => (typeof p === 'string' ? VIEWS[p] : p);
const move =
  (a, b, seconds, e = ease.inOut) =>
  (t, k, g) => {
    const u = e(Math.min(1, t / seconds));
    const A = pose(a),
      B = pose(b || a);
    return g.view(
      { cam: mix(A.cam, B.cam, u), look: mix(A.look, B.look, u) },
      B.fov && A.fov && A.fov + (B.fov - A.fov) * u,
    );
  };

let stack, browser;
try {
  stack = await startStack({ root: opt.root });
  browser = await launch();
  for (const name of opt.names) {
    const shot = (await import(shotFile(name))).default;
    console.log(`\n== ${name}: ${shot.about || ''}`);
    const games = [];
    const out = path.resolve(opt.out);
    const c = {
      VIEWS,
      sleep,
      ease,
      fps: opt.fps,
      gif: opt.gif,
      async open(o = {}) {
        const g = await Game.open(browser, stack, {
          out,
          size: opt.size,
          clock: true,
          ...o,
          query: [shot.query, o.query].filter(Boolean).join('&'),
          name: o.name || 'p' + (games.length + 1),
        });
        // Software GL (no GPU, e.g. CI) can take far longer than Playwright's 30 s default for a screenshot.
        g.page.setDefaultTimeout(180000);
        const rec = g.record.bind(g);
        g.record = (label, r = {}) => {
          const each = r.each;
          return rec(label, { fps: opt.fps, gif: opt.gif, ...r, each: each && ((t, k) => each(t, k, g)) });
        };
        games.push(g);
        return g;
      },
      move,
    };
    const t0 = Date.now();
    try {
      const res = await shot.run(c);
      for (const f of [res].flat().filter(Boolean)) console.log('  ' + Object.values(f).join('\n  '));
    } catch (e) {
      console.error(e);
      process.exitCode = 1;
    }
    for (const g of games) await g.close().catch(() => {});
    console.log(`  (${((Date.now() - t0) / 1000).toFixed(0)} s)`);
  }
} catch (e) {
  console.error(e);
  process.exitCode = 1;
} finally {
  await browser?.close().catch(() => {});
  await stack?.close();
  process.exit(process.exitCode || 0);
}

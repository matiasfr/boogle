// Scenario runner: `npm run scenario -- <name>...` or `npm run scenarios` (all). See .claude/skills/look/SKILL.md.
// `--url <game>` (or LOOK_URL) plays an already running or deployed game instead of starting a local stack; only
// scenarios that stay off /src/ imports work on a built site (e.g. `smoke`, through window.boogle.sync).
//
// A scenario is dev/scenarios/<name>.mjs:
//   export default { about: 'one line', async run(t) { ... } };
// `t` gives you:
//   t.open({ name, room, size, hud, touch })   a player (Game from dev/look/lib.mjs); same `room` = same island;
//                                              touch: true starts a phone client
//   t.check(label, ok, detail)                 records PASS/FAIL (never throws); put images in the detail
//   t.sleep(ms), t.VIEWS, t.out                helpers and the image directory (.look/scenarios/<name>/)
// Players are closed for you. A scenario that throws, or runs past its `timeout` (ms, default 120 s), fails; on a
// failure every player's last frame is saved as <name>-final-still.png.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { startStack, launch, Game, VIEWS, sleep } from '../look/lib.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const all = fs
  .readdirSync(here)
  .filter((f) => f.endsWith('.mjs') && f !== 'run.mjs')
  .map((f) => f.slice(0, -4))
  .sort();
const args = process.argv.slice(2);
const at = args.findIndex((a) => a === '--url' || a.startsWith('--url='));
let url = process.env.LOOK_URL || null;
if (at >= 0) {
  const [flag] = args.splice(at, 1);
  url = flag === '--url' ? args.splice(at, 1)[0] : flag.slice('--url='.length);
  if (!url || url.startsWith('--')) {
    console.error('--url needs a value: --url <game> or --url=<game>');
    process.exit(2);
  }
}
const names = args.length ? args : all;
const bad = names.filter((n) => !all.includes(n));
if (bad.length) {
  console.error(`unknown scenario ${bad.join(', ')}. Available: ${all.join(', ')}`);
  process.exit(2);
}

let stack,
  browser,
  failed = 0;
try {
  stack = await startStack({ url });
  browser = await launch();
  for (const name of names) {
    const mod = (await import(path.join(here, name + '.mjs'))).default;
    const out = path.resolve('.look/scenarios', name);
    fs.rmSync(out, { recursive: true, force: true });
    fs.mkdirSync(out, { recursive: true });
    console.log(`\n== ${name}: ${mod.about || ''}`);
    const games = [];
    let bads = 0;
    const t = {
      out,
      VIEWS,
      sleep,
      async open(opts = {}) {
        const g = await Game.open(browser, stack, { out, ...opts, name: opts.name || 'p' + (games.length + 1) });
        games.push(g);
        return g;
      },
      check(label, ok, detail = '') {
        if (!ok) bads++;
        console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? '  (' + detail + ')' : ''}`);
        return !!ok;
      },
    };
    const t0 = Date.now();
    const limit = mod.timeout || 120000;
    let timer;
    try {
      await Promise.race([
        mod.run(t),
        new Promise((_, rej) => (timer = setTimeout(() => rej(new Error(`timed out after ${limit / 1000} s`)), limit))),
      ]);
    } catch (e) {
      bads++;
      console.log(`  FAIL  scenario threw: ${e.message}`);
    }
    clearTimeout(timer);
    for (const g of games) {
      if (g.errors.length) {
        bads++;
        console.log(`  FAIL  page errors in ${g.name}: ${g.errors.slice(0, 2).join(' | ')}`);
      }
    }
    for (const g of games) {
      if (bads) await g.still(`${g.name}-final`).catch(() => {});
      await g.close().catch(() => {});
    }
    console.log(`  ${bads ? 'FAILED' : 'ok'} in ${((Date.now() - t0) / 1000).toFixed(1)} s; images: ${out}`);
    if (bads) failed++;
  }
} finally {
  await browser?.close().catch(() => {});
  await stack?.close();
}
console.log(`\n${failed ? failed + ' scenario(s) FAILED' : 'all scenarios passed'}`);
process.exit(failed ? 1 : 0);

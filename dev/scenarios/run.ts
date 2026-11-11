// Scenario runner: `npm run scenario -- <name>...` or `npm run scenarios` (all). See .claude/skills/look/SKILL.md.
// `--url <game>` (or LOOK_URL) plays an already running or deployed game instead of starting a local stack; only
// scenarios that stay off /src/ imports work on a built site (e.g. `smoke`, through window.boogle.sync).
//
// A scenario is dev/scenarios/<name>.ts (typed by `Scenario` below):
//   export default { about: 'one line', async run(t) { ... } };
// Players open the current game, as the bare address does. `island: true` starts every player of the scenario on the
// classic island by the court (the original island at the world's origin), for The Boogler, the ball and its content.
// The current game's railway room refuses the classic lockstep edits (gift.toss, src.take, site.stock). `query` adds URL
// params for every player: `proto=place` opens the classic room, which takes them, but it also puts Place's
// interactables on the island, so it suits window-handle edits (reconnect-edit), not checks of what is in reach.
// `t` gives you:
//   t.open({ name, room, size, hud, touch, ownBrowser })   a player (Game from dev/look/lib.ts); same `room` = same island;
//                                              touch: true starts a phone client; ownBrowser: true gives the player
//                                              a browser process of their own (not one renderer for all tabs)
//   t.check(label, ok, detail)                 records PASS/FAIL (never throws); put images in the detail
//   t.page(pathname, { size, colorScheme })    a plain page of the stack (not the game), e.g. the atlas at 'atlas/';
//                                              its uncaught errors fail the scenario like a player's
//   t.sleep(ms), t.VIEWS, t.out                helpers and the image directory (.look/scenarios/<name>/)
// Players are closed for you. A scenario that throws, or runs past its `timeout` (ms, default 120 s), fails; on a
// failure every player's last frame is saved as <name>-final-still.png and a Playwright trace as <name>-trace.zip
// (`npx playwright show-trace <zip>`: the action timeline, console, network and errors; `--no-trace` skips it).
// A player whose renderer didn't come up on WebGPU fails the scenario.
// SCENARIO_GATE=pr (PR CI, software WebGPU) allows one player: two tabs drawing in software run at a few frames a
// second and time out at random, so a multi-player scenario runs on a device (`npm run check:gpu`) or nightly.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import type { Browser, Page } from 'playwright';
import { startStack, launch, Game, VIEWS, sleep, reportGfxErrors, root } from '../look/lib.ts';
import { finishRun, startRun } from '../look/verdict.ts';
import type { GameOpts, Stack } from '../look/lib.ts';

/** What a scenario's `run(t)` gets (described above). */
export type T = {
  out: string;
  page: (pathname: string, o?: { size?: number[]; colorScheme?: 'light' | 'dark' }) => Promise<Page>;
  VIEWS: typeof VIEWS;
  sleep: typeof sleep;
  open: (opts?: GameOpts & { ownBrowser?: boolean }) => Promise<Game>;
  check: (label: string, ok: unknown, detail?: string) => boolean;
};
export type Scenario = {
  about?: string;
  timeout?: number;
  sourceImports?: boolean;
  island?: boolean;
  /** URL params for every player of the scenario, before a player's own `query`. */
  query?: string;
  run: (t: T) => Promise<void>;
};

const here = path.dirname(fileURLToPath(import.meta.url));
// <name>.ts
const files = new Map(
  fs
    .readdirSync(here)
    .filter((f) => /\.ts$/.test(f) && f !== 'run.ts')
    .map((f) => [f.replace(/\.ts$/, ''), f]),
);
const all = [...files.keys()].sort();
const args = process.argv.slice(2);
const outAt = args.indexOf('--out');
let outputRoot = path.resolve('.look/scenarios');
if (outAt >= 0) {
  const value = args[outAt + 1];
  if (!value || value.startsWith('--')) throw new Error('--out needs a directory');
  outputRoot = path.resolve(value);
  args.splice(outAt, 2);
}
const trace = !args.includes('--no-trace');
if (!trace) args.splice(args.indexOf('--no-trace'), 1);
const at = args.findIndex((a) => a === '--url' || a.startsWith('--url='));
let url: string | null = process.env.LOOK_URL || null;
if (at >= 0) {
  const [flag] = args.splice(at, 1);
  url = flag === '--url' ? (args.splice(at, 1)[0] ?? null) : flag!.slice('--url='.length);
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

let stack: Stack | undefined,
  browser: Browser | undefined,
  failed = 0;
startRun(path.join(outputRoot, 'verdict.json'), { checkout: root });
try {
  stack = await startStack({ url });
  const st = stack;
  const br = (browser = await launch());
  const base = st.base;
  for (const name of names) {
    const mod: Scenario = (await import(pathToFileURL(path.join(here, files.get(name)!)).href)).default;
    const out = path.join(outputRoot, name);
    fs.rmSync(out, { recursive: true, force: true });
    fs.mkdirSync(out, { recursive: true });
    console.log(`\n== ${name}: ${mod.about || ''}`);
    const games: Game[] = [];
    const pages: { page: Page; errors: string[]; name: string }[] = [];
    let bads = 0;
    const t: T = {
      out,
      async page(pathname, { size = [1280, 900], colorScheme = 'light' } = {}) {
        const page = await br.newPage({ viewport: { width: size[0]!, height: size[1]! }, colorScheme });
        const errors: string[] = [];
        page.on('pageerror', (e) => errors.push(e.message));
        pages.push({ page, errors, name: pathname });
        await page.goto(new URL(pathname, base).href);
        return page;
      },
      VIEWS,
      sleep,
      async open(opts = {}) {
        if (games.length && process.env.SCENARIO_GATE === 'pr')
          throw new Error(
            'a second player on PR CI: two software-rendered tabs are too slow to pass reliably there. ' +
              'Run this scenario on a device (npm run check:gpu) or nightly (scenarios-nightly.yml).',
          );
        const { ownBrowser, ...rest } = opts;
        // ownBrowser: a browser process of this player's own, so two tabs don't share one renderer/GPU process.
        const ownedBrowser = ownBrowser ? await launch({ sharedLease: true }) : undefined;
        const g = await Game.open(ownedBrowser ?? br, st, {
          sourceImports: mod.sourceImports,
          ownedBrowser,
          island: mod.island,
          out,
          trace,
          ...rest,
          query: [mod.query, rest.query].filter(Boolean).join('&') || undefined,
          name: opts.name || 'p' + (games.length + 1),
        });
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
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      await Promise.race([
        mod.run(t),
        new Promise<never>(
          (_, rej) => (timer = setTimeout(() => rej(new Error(`timed out after ${limit / 1000} s`)), limit)),
        ),
      ]);
    } catch (e) {
      bads++;
      console.log(`  FAIL  scenario threw: ${(e as Error).message}`);
    }
    clearTimeout(timer);
    for (const g of games) {
      for (const error of g.healthErrors()) {
        bads++;
        console.log(`  FAIL  ${g.name}: ${error}`);
      }
    }
    for (const p of pages) {
      if (p.errors.length) {
        bads++;
        console.log(`  FAIL  page errors on ${p.name}: ${p.errors.slice(0, 2).join(' | ')}`);
      }
      await p.page.close().catch(() => {});
    }
    if (games.length) reportGfxErrors(games);
    for (const g of games) {
      if (bads) await g.still(`${g.name}-final`).catch(() => {});
      await g.close(bads ? { trace: path.join(out, `${g.name}-trace.zip`) } : {}).catch(() => {});
    }
    console.log(`  ${bads ? 'FAILED' : 'ok'} in ${((Date.now() - t0) / 1000).toFixed(1)} s; images: ${out}`);
    if (bads) failed++;
  }
} catch (e) {
  finishRun({ verdict: 'failure', scenarios: names, error: String(e) });
  throw e;
} finally {
  await browser?.close().catch(() => {});
  await stack?.close();
}
console.log(`\n${failed ? failed + ' scenario(s) FAILED' : 'all scenarios passed'}`);
finishRun({ verdict: failed ? 'failure' : 'pass', scenarios: names, failed });
process.exit(failed ? 1 : 0);

// The production two-player branch of playthrough.ts: both peers run the railway bot (&player=1 leads, &player=2
// follows) in one fresh room on the shared warp clock, as `look --players 2 --eval railway-job.ts` does. Real inputs
// only: no seeds, poses or recovery. Passes when both bots finish with every expected beat, no health errors, and the
// peers' mirrored railway hashes agree at every server step both sampled.
import fs from 'node:fs';
import path from 'node:path';
import { stripTypeScriptTypes } from 'node:module';
import type { Browser } from 'playwright';
import { Game, launch, startStack, sleep, reportGfxErrors, type Stack } from './lib.ts';
import { coopWarpOptions, startCoopWarp } from './coop-warp.ts';

type Progress = { done: boolean; now: number };

export async function railCoopPlaythrough(options: {
  args: string[];
  checkout: string;
  dir: string;
  query: string;
  stallS: number;
  evalFile: string;
  to: string | undefined;
}) {
  const { args, checkout, dir, query, stallS, evalFile, to } = options;
  const value = (flag: string) => (args.includes(flag) ? args[args.indexOf(flag) + 1] : undefined);
  const warp = coopWarpOptions(args);
  const room = `rail-coop-${Date.now().toString(36)}`;
  const games: Game[] = [];
  const logs: string[][] = [[], []];
  const errors: string[] = [];
  const messages: string[] = [];
  const say = (message: string) => {
    messages.push(message);
    console.log(message);
  };
  const body = stripTypeScriptTypes(fs.readFileSync(evalFile, 'utf8')).replace(/^export \{\};.*$/m, '');
  let stack: Stack | undefined, browser: Browser | undefined;
  let clock: Awaited<ReturnType<typeof startCoopWarp>> | undefined;
  let done = false;
  let start = Date.now();
  try {
    stack = await startStack({ root: checkout, url: value('--url'), warp: warp.enabled });
    if (value('--url')) {
      if (!value('--data-dir')) throw new Error('--url requires --data-dir');
      stack.dataDir = path.resolve(value('--data-dir')!);
      if (warp.enabled && !value('--clock-url'))
        throw new Error('Two-player warp needs the broker clock bridge; use --real or update the launcher');
    }
    browser = await launch();
    start = Date.now(); // queue wait is not play time
    const deadline = start + (args.includes('--long') ? 30 : 5) * 60_000;
    for (let i = 0; i < 2; i++) {
      // Its own browser profile, as a friend's machine would be: one profile is one player.
      const g = await Game.open(browser, stack, {
        out: dir,
        size: [1180, 820],
        hud: true,
        room,
        name: `Route ${i + 1}`,
        prefix: i ? 'p2-' : '',
        query: `${query}&player=${i + 1}`,
        warp: warp.enabled,
      });
      g.page.on('console', (m) => {
        if (/^[A-Z]{3,} /.test(m.text())) {
          logs[i]!.push(m.text());
          console.log(`[${i + 1}] ${m.text()}`);
        }
      });
      games.push(g);
    }
    for (const g of games)
      if ((await g.waitFor('window.boogle.remotes.size === 1', { timeout: 30000 })) < 0)
        throw new Error('Both peers must join before the route starts');
    clock = await startCoopWarp(
      games,
      warp.enabled ? (value('--clock-url') ?? stack.clockUrl) : undefined,
      warp.enabled ? warp.speed : 1,
      path.join(dir, 'warp.json'),
    );
    await Promise.all(games.map((g) => g.eval(body)));
    const lastProgress = [0, 0];
    const logCounts = [0, 0];
    while (!done) {
      const progress = await Promise.all(
        games.map((g) =>
          g.eval<Progress>(
            `return { done: !!window.__placeDone, now: (window.__warp?.now() ?? performance.now() / 1000) };`,
          ),
        ),
      );
      for (const [i, p] of progress.entries()) {
        if (games[i]!.healthErrors().length) throw new Error(games[i]!.healthErrors().join('\n'));
        if (logs[i]!.some((l) => l.includes('NEVER:'))) throw new Error(`Player ${i + 1} missed an expected beat`);
        // Only something new counts as getting somewhere: the numbers differ every time round a loop.
        const distinct = new Set(logs[i]!.map((l) => l.replace(/\([^)]*\)/g, '').replace(/[\d.]+/g, '#'))).size;
        if (distinct !== logCounts[i] || p.now < lastProgress[i]!) {
          lastProgress[i] = p.now;
          logCounts[i] = distinct;
        }
        if (!p.done && p.now - lastProgress[i]! > stallS)
          throw new Error(`Player ${i + 1} stalled for ${stallS} game seconds`);
      }
      done = progress.every((p) => p.done);
      if (!done && Date.now() > deadline)
        throw new Error('TIMEOUT: playthrough wall limit before the expected beat; use --long for a 30-minute run');
      if (!done) await sleep(500);
    }
    await clock.stop();
    clock = undefined;
    // The bots write their mirrored hashes per server step once they finish; compare the steps both sampled.
    const hashes = logs.map((log) => {
      const line = log.findLast((l) => l.startsWith('RAILWAY TICKHASH '));
      return new Map(
        line ? (JSON.parse(line.slice('RAILWAY TICKHASH '.length)) as { hashes: [number, number][] }).hashes : [],
      );
    });
    const shared = [...hashes[0]!.keys()].filter((step) => hashes[1]!.has(step));
    const differ = shared.filter((step) => hashes[0]!.get(step) !== hashes[1]!.get(step));
    if (!shared.length) throw new Error('No server step was sampled by both peers: no mirror witness');
    if (differ.length) throw new Error(`Mirrored railway hashes differ at ${differ.length} steps (first ${differ[0]})`);
    say(`COOP both peers finished (end=${to ?? 'pier'}); mirrored hashes agree at ${shared.length} server steps`);
  } catch (e) {
    errors.push(String(e));
  } finally {
    await clock?.stop().catch((e: unknown) => errors.push(String(e)));
    for (const [i, g] of games.entries()) {
      await g.still('end').catch((e: unknown) => errors.push(String(e)));
      const fps = await g.fps().catch(() => 0);
      if (fps <= 0) errors.push(`Player ${i + 1}: no completed frames`);
      errors.push(...g.healthErrors());
    }
    reportGfxErrors(games);
    for (const [i, log] of logs.entries())
      fs.writeFileSync(path.join(dir, i ? 'p2-bot.txt' : 'bot.txt'), log.join('\n') + '\n');
    const report = [
      `Production co-op: ${done && !errors.length ? 'PASS' : 'FAIL'}; end=${to ?? 'pier'}; room ${room}`,
      `Wall ${((Date.now() - start) / 1000).toFixed(0)} s; warp ${warp.enabled ? `${warp.speed}x` : 'off (--real)'}`,
      ...messages,
      ...errors.map((e) => `FAIL: ${e}`),
      '',
      "Player 1's last lines:",
      ...logs[0]!.slice(-4).map((l) => '  ' + l.slice(0, 160)),
      "Player 2's last lines:",
      ...logs[1]!.slice(-4).map((l) => '  ' + l.slice(0, 160)),
    ];
    fs.writeFileSync(path.join(dir, 'report.txt'), report.join('\n') + '\n');
    console.log(`Full report: ${path.join(dir, 'report.txt')}`);
    for (const e of errors) console.error(e);
    await browser?.close().catch(() => {});
    await stack?.close();
  }
  const verdict = errors.some((e) => e.includes('TIMEOUT:')) ? 'timeout' : errors.length || !done ? 'failure' : 'pass';
  fs.writeFileSync(
    path.join(dir, 'verdict.json'),
    JSON.stringify({ verdict, to, wall: (Date.now() - start) / 1000, errors }, null, 2),
  );
  if (verdict !== 'pass') process.exitCode = 1;
}

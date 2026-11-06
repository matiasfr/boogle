// The two-peer branch of playthrough.ts. Same Game, observer, bot and clock diagnostics as look.
// Checkpoints coordinate actors; --from restores a saved entry once, then the route uses real inputs.
import fs from 'node:fs';
import path from 'node:path';
import type { Browser } from 'playwright';
import { Game, enterGame, launch, startStack, sleep, reportGfxErrors, type Stack } from './lib.ts';
import { coopWarpOptions, startCoopWarp } from './coop-warp.ts';
import { IGNORE_TEXT, installObserver, WATCH_MARKS, type Observed } from './observe.ts';
import { SKIP_DRAWS } from './warp.ts';
import { parseSession, type Session } from '../playtest/read.ts';
import { CHECKPOINTS, segmentOptions } from './segments.ts';
import { checkpointPair } from './checkpoint-pair.ts';
import {
  checkpointDirectory,
  readCheckpoint,
  ROUTE_SEED,
  POSE_AT,
  writeCheckpoints,
  requireCheckpoints,
} from './saves.ts';
import { expectedRestore, pairRestores, READ_RESTORED } from './restore-pair.ts';

type Progress = { step: number; phase: string; done: boolean; now: number; lastBeat: number };
type State = {
  pid: string;
  peers: number;
  ended: boolean;
  delivered: number;
  atPier: boolean;
  stations: unknown;
  rack: unknown;
  rewards: unknown;
  town: unknown;
  personal: unknown;
  trains: { s: number; target: number; running: boolean }[];
};
const state = (g: Game): Promise<State> =>
  g.eval(`
  const p = window.__place;
  const { me } = await import('/src/player/player.ts');
  const { captureShared } = await import('/src/proto/place/job.ts');
  const shared = captureShared();
  const head = p.halts.find(h => h.name === 'Far Head');
  return {
    pid: localStorage.getItem('boogle.pid'), peers: window.boogle.remotes.size,
    ended: p.job.ended, delivered: Number(sessionStorage.getItem('look.coop.delivered') || 0),
    atPier: !!head && !me.swimming && Math.hypot(me.body.position.x-head.x, me.body.position.z-head.z) < 4
      && Math.abs(me.body.position.y-head.y) < 4,
    stations: p.lines.map(l => ({ stage: l.stage, open: l.open,
      have: l.stations.map(st => Object.fromEntries(Object.keys(st.have).map(k => [k, st.have[k]+st.coming[k]]))) })),
    rack: { on: p.rack.on, x: p.rack.x, z: p.rack.z, logs: shared.depot.logs, rails: shared.depot.rails },
    rewards: { rung: p.job.rung, tech: p.job.tech, gate: p.job.gate, score: p.job.score },
    town: { people: p.job.people, wood: p.job.wood, stone: p.job.stone },
    personal: { gifts: p.giftState.got, bought: p.giftState.bought, position: me.body.position,
      back: { logs: p.back.logs, rails: p.back.rails, stone: p.back.stone, big: p.back.big } },
    trains: p.lines.map(l => ({ s: l.train.tr.s, target: l.train.tr.target, running: l.train.clockRunning() }))
  };
`);

export async function coopPlaythrough(options: {
  args: string[];
  checkout: string;
  dir: string;
  query: string;
  stallS: number;
  report: (s: Session, text: Observed, wall: { game: number; wall: number; done: boolean }, log: string[]) => string[];
}) {
  const { args, checkout, dir, query, stallS } = options;
  const selection = segmentOptions(args);
  const fixtureDir = selection.saves ? path.resolve(selection.saves) : checkpointDirectory(checkout, 2);
  const seeds = selection.from ? [0, 1].map((i) => readCheckpoint(fixtureDir, selection.from!, 2, i)) : [];
  if (seeds.length && seeds[0]!.route!.step !== seeds[1]!.route!.step)
    throw new Error('Peer checkpoint cursors disagree; regenerate together');
  const paired: Observed['saves'][] = [[], []];
  const value = (flag: string) => (args.includes(flag) ? args[args.indexOf(flag) + 1] : undefined);
  const warp = coopWarpOptions(args);
  const params = new URLSearchParams(query);
  if (params.has('from') || params.get('proto') !== 'place' || (params.get('shot') ?? 'play') !== 'play')
    throw new Error('Continuous co-op requires proto=place&shot=play without from=');
  if (args.includes('--eval')) throw new Error('Two-player playthrough uses the existing place bot; no staged eval');
  params.set('coop', '1');
  params.set('coopRoute', '1');
  const room = 'proto-place';
  const games: Game[] = [];
  const logs: string[][] = [[], []];
  const messages: string[] = [];
  const errors: string[] = [];
  const checkpoints: unknown[] = [];
  let stack: Stack | undefined, browser: Browser | undefined;
  let clock: Awaited<ReturnType<typeof startCoopWarp>> | undefined;
  let segment = 0,
    released = seeds[0]?.route?.step ?? 0,
    reloaded = false,
    rejoined = false,
    done = false;
  let start = Date.now();
  let deadline: number;
  const say = (message: string) => {
    messages.push(message);
    console.log(message);
  };
  const archive = async (g: Game, peer: number) => {
    const observed = await g.eval<Observed>('return window.__observe.read()');
    const saves = path.join(dir, peer === 0 ? 'saves' : 'p2-saves');
    fs.mkdirSync(saves, { recursive: true });
    for (const [k, save] of observed.saves.entries()) {
      const slug = save.beat.replace(/[^a-z0-9]+/gi, '-').slice(0, 50);
      fs.writeFileSync(
        path.join(saves, `${segment}-${String(k).padStart(3, '0')}-${slug}.json`),
        JSON.stringify({ ...save, room, query: params.toString(), run: 'run' }),
      );
    }
    fs.writeFileSync(path.join(dir, `p${peer + 1}-observer-${segment}.json`), JSON.stringify(observed, null, 2));
  };
  const inject = async (g: Game) => {
    await g.eval(WATCH_MARKS);
    if (warp.enabled) await g.eval(SKIP_DRAWS);
    await g.eval(`
      window.__debugCam.clear();
      const { play } = await import('/dev/look/bots/place.ts');
      void play().catch(e => { console.error(e.stack || String(e)); window.__coopFailure = String(e); });
    `);
  };
  const stopClock = async () => {
    const active = clock;
    clock = undefined;
    await active?.stop();
  };
  const startClock = async () => {
    clock = await startCoopWarp(
      games,
      warp.enabled ? (value('--clock-url') ?? stack?.clockUrl) : undefined,
      warp.enabled ? warp.speed : 1,
      path.join(dir, `warp-${segment}.json`),
    );
  };
  try {
    stack = await startStack({ root: checkout, url: value('--url'), warp: warp.enabled });
    if (value('--url')) {
      if (!value('--data-dir')) throw new Error('--url requires --data-dir');
      stack.dataDir = path.resolve(value('--data-dir')!);
      if (warp.enabled && !value('--clock-url'))
        throw new Error('Two-player warp needs the broker clock bridge; use --real or update the launcher');
    }
    browser = await launch();
    start = Date.now(); // queue wait is not play time or a clock-guard sample
    deadline = start + (args.includes('--long') ? 30 : 5) * 60_000;
    for (let i = 0; i < 2; i++) {
      const g = await Game.open(browser, stack, {
        out: dir,
        size: [1180, 820],
        hud: true,
        room,
        name: `Route ${i + 1}`,
        prefix: i ? 'p2-' : '',
        query: `${params}&player=${i + 1}`,
        warp: warp.enabled,
        init: `${seeds[i] ? ROUTE_SEED(seeds[i]!) : ''}\n(${installObserver.toString()})(${JSON.stringify(IGNORE_TEXT)})`,
      });
      g.page.on('console', (m) => {
        if (/^[A-Z]{3,} /.test(m.text())) {
          logs[i]!.push(m.text());
          console.log(`[${i + 1}] ${m.text()}`);
        }
      });
      games.push(g);
      if (seeds[i]) {
        await g.eval(POSE_AT(seeds[i]!));
        const actual = await g.eval(READ_RESTORED);
        const restored = pairRestores(actual, actual, expectedRestore(seeds[i]!));
        if (!restored.pair) throw new Error(`Player ${i + 1} checkpoint did not restore: ${restored.reason}`);
        say(restored.reason);
      }
    }
    for (const g of games)
      if ((await g.waitFor('window.boogle.remotes.size === 1 && window.__place?.coop.debug().peers.length === 1')) < 0)
        throw new Error('Both peers must join before the first chop');
    const identities = await Promise.all(games.map((g) => g.eval<string>("return localStorage.getItem('boogle.pid')")));
    await startClock();
    await Promise.all(games.map(inject));
    const lastProgress = [0, 0];
    const logCounts = [0, 0];
    while (!done) {
      const progress = await Promise.all(
        games.map((g) =>
          g.eval<Progress>(`
        if (window.__coopFailure) throw new Error(window.__coopFailure);
        return { step: window.__coopStep || 0, phase: window.__coopPhase || 'arrival', done: !!window.__placeDone,
          now: performance.now()/1000, lastBeat: window.__observe.lastBeat };
      `),
        ),
      );
      for (const [i, p] of progress.entries()) {
        if (games[i]!.healthErrors().length) throw new Error(games[i]!.healthErrors().join('\n'));
        if (logs[i]!.some((l) => l.includes('NEVER:'))) throw new Error(`Player ${i + 1} missed an expected beat`);
        const distinct = new Set(logs[i]!.map((l) => l.replace(/\([^)]*\)/g, '').replace(/[\d.]+/g, '#'))).size;
        if (distinct !== logCounts[i] || p.lastBeat > lastProgress[i]! || p.now < lastProgress[i]!) {
          lastProgress[i] = p.now;
          logCounts[i] = distinct;
        }
        if (!p.done && p.now - lastProgress[i]! > stallS)
          throw new Error(`Player ${i + 1} stalled for ${stallS} game seconds`);
      }
      done = progress.every((p) => p.done);
      if (!done && Date.now() > deadline)
        throw new Error('TIMEOUT: playthrough wall limit before the expected beat; use --long for a 30-minute run');
      if (done && Date.now() > deadline) say('PASS note: expected beat completed at the wall limit');
      if (progress.every((p) => p.step > released)) {
        const first = progress[0]!;
        if (!progress.every((p) => p.step === first.step && p.phase === first.phase))
          throw new Error('Bot checkpoints disagree');
        released = first.step;
        say(`COOP checkpoint ${released}: ${first.phase}`);
        checkpoints.push({
          phase: first.phase,
          wall: (Date.now() - start) / 1000,
          states: await Promise.all(games.map(state)),
        });
        if (CHECKPOINTS.some((name) => name === first.phase)) {
          const peers = await Promise.all(
            games.map((g) =>
              g.eval<{ authority: boolean; save: Observed['saves'][number] }>(`
                const name = ${JSON.stringify(first.phase)};
                window.__observe.take(name, true, true);
                return { authority: window.__place.coop.debug().amAuthority,
                  save: window.__observe.read().saves.find(s => s.beat === name) };
              `),
            ),
          );
          checkpointPair(peers, room).forEach((save, i) => paired[i]!.push(save));
        }
        // The pages and server are at 1x throughout real navigation. The next clock segment gets a new baseline.
        const interrupt = done ? null : first.phase === 'Q2' ? 'reload' : first.phase === 'Q4' ? 'leave/rejoin' : null;
        if (interrupt) {
          await stopClock();
          const i = interrupt === 'reload' ? 1 : 0;
          const g = games[i]!,
            survivor = games[1 - i]!;
          await archive(g, i);
          const url = g.page.url();
          say(`COOP ${interrupt}: player ${i + 1}, at 1x`);
          if (interrupt === 'reload') await g.page.reload({ waitUntil: 'domcontentloaded' });
          else {
            await g.page.goto('about:blank');
            if ((await survivor.waitFor('window.boogle.remotes.size === 0', { timeout: 15000 })) < 0)
              throw new Error('Survivor never observed the departure');
            await sleep(5000);
            await g.page.goto(url, { waitUntil: 'domcontentloaded' });
          }
          say(`COOP ${interrupt} entry: ${await enterGame(g.page, 90000)}`);
          await g.page.waitForFunction(() => !!window.__debugCam, null, { timeout: 20000 });
          if (
            (await g.waitFor(
              'window.__place && window.boogle?.remotes.size === 1 && window.__place.coop.debug().peers.length === 1',
              { timeout: 30000 },
            )) < 0
          )
            throw new Error('Returning peer did not rejoin');
          if ((await g.eval("return localStorage.getItem('boogle.pid')")) !== identities[i])
            throw new Error('Returning player identity changed');
          g.gfx = await g.eval('return window.boogle.gfx');
          await inject(g);
          segment++;
          if (interrupt === 'reload') reloaded = true;
          else rejoined = true;
          await startClock();
        }
        await Promise.all(games.map((g) => g.eval(`window.__coopRelease = ${released}`)));
      }
      if (!done) await sleep(200);
    }
    await stopClock().catch((e) => errors.push(String(e)));
    if (!selection.from && !selection.to && (!reloaded || !rejoined))
      throw new Error('The route skipped a required interruption');
    const atEnding = !selection.to || selection.to === 'pier';
    // Read-only convergence check. Trains keep moving, so retain their sampled positions and allow 2m of wire/read skew.
    let matched = 0;
    const until = Date.now() + 15000;
    while (matched < 3 && Date.now() < until) {
      const states = await Promise.all(games.map(state));
      fs.writeFileSync(path.join(dir, 'final-state.json'), JSON.stringify(states, null, 2));
      const [a, b] = states as [State, State];
      const same =
        (!atEnding || (a.ended && b.ended && a.atPier && b.atPier)) &&
        a.peers === 1 &&
        b.peers === 1 &&
        a.pid !== b.pid &&
        (!!selection.from || !!selection.to || (a.delivered > 0 && b.delivered > 0)) &&
        ['stations', 'rack', 'rewards', 'town'].every(
          (k) => JSON.stringify(a[k as keyof State]) === JSON.stringify(b[k as keyof State]),
        ) &&
        a.trains.every((t, i) => {
          const u = b.trains[i];
          return u && (!atEnding || (t.running && u.running)) && t.target === u.target && Math.abs(t.s - u.s) <= 2;
        });
      matched = same ? matched + 1 : 0;
      await sleep(400);
    }
    if (matched < 3)
      throw new Error(
        'Final stations/racks/trains/rewards/population, contributions or dry pier arrival did not agree; see final-state.json',
      );
    say(
      `COOP both peers agree on stations, rack, trains (2m tolerance), shared rewards and population; end=${selection.to ?? 'pier'}`,
    );
  } catch (e) {
    errors.push(String(e));
  } finally {
    await stopClock().catch((e) => errors.push(String(e)));
    for (const [i, g] of games.entries()) {
      await state(g)
        .then((s) => fs.writeFileSync(path.join(dir, `p${i + 1}-last-state.json`), JSON.stringify(s, null, 2)))
        .catch((e) => errors.push(String(e)));
      await archive(g, i).catch((e) => errors.push(String(e)));
      await g.still('end').catch((e) => errors.push(String(e)));
      const fps = await g.fps().catch(() => 0);
      if (fps <= 0) errors.push(`Player ${i + 1}: no completed frames`);
      errors.push(...g.healthErrors());
      await g.eval("window.dispatchEvent(new Event('pagehide'))").catch((e) => errors.push(String(e)));
    }
    reportGfxErrors(games);
    await sleep(800);
    fs.writeFileSync(path.join(dir, 'checkpoints.json'), JSON.stringify(checkpoints, null, 2));
    fs.writeFileSync(path.join(dir, 'checkpoint-pairs.json'), JSON.stringify(paired, null, 2));
    for (const [i, log] of logs.entries())
      fs.writeFileSync(path.join(dir, i ? 'p2-bot.txt' : 'bot.txt'), log.join('\n') + '\n');
    const reports = [
      `Continuous co-op: ${done && !errors.length ? 'PASS' : 'FAIL'}; last released checkpoint ${released}`,
      `Wall ${(Date.now() - start) / 1000}s; reload ${reloaded}; leave/rejoin ${rejoined}`,
      `Split plan: alternating station bills, forge bills and ability tasks. Start=${selection.from ?? 'fresh'}; restored pose only at segment entry.`,
      'Final rewards compare shared rungs, abilities and score; personal cosmetics are recorded, not required to match.',
      ...messages,
      ...errors.map((e) => `FAIL: ${e}`),
    ];
    const data = stack?.dataDir && path.join(stack.dataDir, 'playdata');
    if (data && fs.existsSync(data)) {
      const sessions = path.join(dir, 'sessions');
      fs.mkdirSync(sessions, { recursive: true });
      for (const file of fs.readdirSync(data).filter((f) => f.endsWith('.jsonl'))) {
        fs.copyFileSync(path.join(data, file), path.join(sessions, file));
        const s = parseSession(file, fs.readFileSync(path.join(data, file), 'utf8'));
        const game = (s.events.at(-1)?.t ?? 0) - (s.events[0]?.t ?? 0);
        s.events = s.events.map((e) => ({ ...e, wall: e.t * 1000 }));
        s.start = (s.events[0]?.t ?? 0) * 1000;
        s.end = (s.events.at(-1)?.t ?? 0) * 1000;
        reports.push(
          '',
          `Telemetry segment ${file} (page-clock times reset on navigation; full text is in p*-observer-*.json)`,
          ...options.report(
            s,
            { lines: [], painted: [], saves: [] },
            { game, wall: (Date.now() - start) / 1000, done: done && !errors.length },
            logs.flat(),
          ),
        );
      }
    }
    fs.writeFileSync(path.join(dir, 'report.txt'), reports.join('\n') + '\n');
    say(`Full report: ${path.join(dir, 'report.txt')}`);
    for (const e of errors) console.error(e);
    await browser?.close();
    await stack?.close();
  }
  fs.writeFileSync(
    path.join(dir, 'verdict.json'),
    JSON.stringify(
      {
        verdict: errors.some((e) => e.includes('TIMEOUT:')) ? 'timeout' : errors.length || !done ? 'failure' : 'pass',
        from: selection.from,
        to: selection.to,
        wall: (Date.now() - start) / 1000,
        errors,
      },
      null,
      2,
    ),
  );
  if (selection.regenerate && done && !errors.length) {
    paired.forEach(requireCheckpoints); // validate both peers before replacing either fixture set
    for (const [i, saves] of paired.entries()) writeCheckpoints(saves, fixtureDir, params.toString(), i);
  }
  if (!done || errors.length) process.exitCode = 1;
}

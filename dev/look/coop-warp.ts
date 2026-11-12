// Shared by look and the sandbox bridge. External sites never get their clocks altered.
import fs from 'node:fs';
import type { Game } from './lib.ts';
import type { WarpHandle } from './warp.ts';
import { TICK_MS } from '../../src/world/sync.ts';
import { worldClockDeficit } from './clock-progress.ts';

export function coopWarpOptions(args: string[]) {
  const value = (flag: string) => (args.includes(flag) ? args[args.lastIndexOf(flag) + 1] : undefined);
  const speed = args.includes('--warp-speed') ? Number(value('--warp-speed')) : 5;
  if (!Number.isFinite(speed) || speed <= 1 || speed > 50) throw new Error('--warp-speed must be >1 and <=50');
  return {
    enabled:
      value('--players') === '2' &&
      (!args.includes('--real') || args.lastIndexOf('--warp') > args.lastIndexOf('--real')),
    speed,
  };
}

async function serverClock(url: string, speed?: number) {
  if (!/^http:\/\/127\.0\.0\.1:\d+\/clock$/.test(url)) throw new Error('look clock must be local');
  const res = await fetch(url, {
    signal: AbortSignal.timeout(5000),
    ...(speed === undefined ? {} : { method: 'POST', body: String(speed) }),
  });
  if (!res.ok) throw new Error(`look clock: ${res.status} ${await res.text()}`);
  return (await res.json()) as { speed: number; game: number; wall: number; lag: number };
}

const read = (g: Game) =>
  g.eval(`
  const w = window.__warp;
  return {
    ...(w?.read() ?? { game: performance.now()/1000, wall: Date.now()/1000, lag: 0 }),
    // A page between a reload and its features' onStart has no sync handle yet: sample it as tick -1.
    tick: window.boogle?.sync?.world.tick ?? -1, peers: window.boogle?.remotes?.size ?? 0,
  };
`);
type Sample = { game: number; wall: number; lag: number; tick: number; peers: number };

/** Measures independent clocks; never copies state or corrects drift. Both pages remain running until stop(). */
export async function startCoopWarp(games: Game[], url: string | undefined, speed: number, file: string) {
  const samples: { server: Awaited<ReturnType<typeof serverClock>> | null; pages: Sample[] }[] = [];
  const sample = async () => {
    const [server, pages] = await Promise.all([url ? serverClock(url) : null, Promise.all(games.map(read))]);
    samples.push({ server, pages });
    return pages;
  };
  if (url) await serverClock(url); // establish the control connection before starting any clock
  await Promise.all([
    url ? serverClock(url, speed) : null,
    ...games.map((g) => g.page.evaluate((n) => window.__warp?.go(n), speed)),
  ]);
  // Measure the interval with all clocks running, excluding the RPC/setup time spent switching from 1x.
  // The eval starts only after this baseline. Each clock's own lag still measures from its go()/set() call.
  await sample();
  let stopped = false;
  let failure: unknown;
  let timer: ReturnType<typeof setTimeout>;
  let inFlight: Promise<unknown> = Promise.resolve();
  const poll = async () => {
    try {
      await sample();
    } catch (e) {
      failure = e;
    }
    if (!stopped)
      timer = setTimeout(() => {
        inFlight = poll();
      }, 1000);
  };
  timer = setTimeout(() => {
    inFlight = poll();
  }, 1000);
  return {
    async warm(seconds: number, until: string | null) {
      const start = await Promise.all(
        games.map((g) => g.page.evaluate(() => (window.__warp as WarpHandle)?.now() ?? performance.now() / 1000)),
      );
      const deadline = Date.now() + Math.max(60000, (seconds * 2000) / speed);
      for (;;) {
        if (failure) throw failure;
        for (const g of games) if (g.healthErrors().length) throw new Error(g.healthErrors().join('\n'));
        const done = await Promise.all(
          games.map((g, i) =>
            g.eval(
              `return ${until ? `!!(${until}) || ` : ''}(window.__warp?.now() ?? performance.now()/1000) >= ${start[i]! + seconds}`,
            ),
          ),
        );
        if (done.every(Boolean)) break;
        if (Date.now() > deadline)
          throw new Error('Two-player warp cannot sustain the requested speed; lower --warp-speed');
        await new Promise((r) => setTimeout(r, 100));
      }
    },
    async stop() {
      stopped = true;
      clearTimeout(timer);
      await inFlight;
      try {
        await sample();
      } finally {
        await Promise.all([
          url ? serverClock(url, 1) : null,
          ...games.map((g) => g.page.evaluate(() => window.__warp?.go(1))),
        ]);
      }
      fs.writeFileSync(file, JSON.stringify(samples, null, 2) + '\n');
      const first = samples[0]!,
        last = samples.at(-1)!;
      let worldDeficit = 0;
      let finalWorldDeficit = 0;
      if (first.server && last.server)
        console.log(
          `warp requested: ${speed}x; server achieved: ${((last.server.game - first.server.game) / (last.server.wall - first.server.wall)).toFixed(2)}x`,
        );
      const serverLag = Math.max(0, ...samples.map((s) => s.server?.lag ?? 0));
      if (url) console.log(`warp server max clock deficit: ${serverLag.toFixed(3)} game s`);
      for (let i = 0; i < games.length; i++) {
        const a = first.pages[i]!,
          b = last.pages[i]!;
        const lag = Math.max(...samples.map((s) => s.pages[i]!.lag));
        const tickSeconds = ((b.tick - a.tick) * TICK_MS) / 1000;
        const behind = Math.max(...samples.map((s) => worldClockDeficit(first, s, i, TICK_MS)));
        worldDeficit = Math.max(worldDeficit, behind);
        finalWorldDeficit = Math.max(finalWorldDeficit, worldClockDeficit(first, last, i, TICK_MS));
        console.log(
          `warp player ${i + 1}: ${(b.game - a.game).toFixed(2)} game s / ${(b.wall - a.wall).toFixed(2)} wall s = ${((b.game - a.game) / (b.wall - a.wall)).toFixed(2)}x; max clock deficit ${lag.toFixed(3)} game s${lag > 1 ? ' (DRIFT: lower --warp-speed)' : ''}`,
        );
        console.log(
          `warp player ${i + 1} world ticks: ${tickSeconds.toFixed(2)} game s = ${(tickSeconds / (b.wall - a.wall)).toFixed(2)}x; max deficit against achieved ${url ? 'server' : 'page'} clock ${behind.toFixed(3)} game s`,
        );
      }
      const tickGap = Math.max(...samples.map((s) => Math.abs(s.pages[0]!.tick - s.pages[1]!.tick)));
      const skew = Math.max(...samples.map((s) => Math.abs(s.pages[0]!.wall - s.pages[1]!.wall)));
      console.log(
        `warp samples: max page tick gap ${tickGap}, max read skew ${(skew * 1000).toFixed(1)} wall ms; ${file}`,
      );
      console.log(`warp final state: ${JSON.stringify(last.pages.map((p) => ({ tick: p.tick, peers: p.peers })))}`);
      if (failure) throw failure;
      if (serverLag > 1 || worldDeficit > 1 || samples.some((s) => s.pages.some((p) => p.lag > 1)))
        console.warn(
          'DRIFT observed during this run. Read the peak deficits above even if the clocks caught up by the end.',
        );
      if ((last.server?.lag ?? 0) > 1 || last.pages.some((p) => p.lag > 1))
        throw new Error(
          'Harness clock capacity: clocks ended more than 1 game second behind the requested rate. Lower --warp-speed; this alone is not a co-op divergence.',
        );
      if (finalWorldDeficit > 1)
        throw new Error(
          'World ticks ended more than 1 game second behind the achieved source clock; inspect world synchronization.',
        );
    },
  };
}

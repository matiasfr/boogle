// npm run look -- --real --hud --rail-seed q7-retained --query 'debugcam=1&mode=platform' \
//   --eval dev/look/evals/running-side-transition.ts --until window.__runningSideTransition --name q7-platform
// Accepted Q7 transition, no shared-state writes. Use q7-signal and mode=signal for the old-signal waiter.
export {};
const read = (await import('/dev/look/rail-read.ts' as string)) as typeof import('../rail-read.ts');
const { makeBot } = (await import('/dev/look/bot.ts' as string)) as typeof import('../bot.ts');
const { line2World, line2Y } = (await import(
  '/src/entities/railway/line2-path.ts' as string
)) as typeof import('../../../src/entities/railway/line2-path.ts');
const { trainAlong } = (await import(
  '/src/sim/railway-train.ts' as string
)) as typeof import('../../../src/sim/railway-train.ts');
const { retainedEndBlock } = (await import(
  '/src/sim/railway-trains.ts' as string
)) as typeof import('../../../src/sim/railway-trains.ts');
const { me } = (await import('/src/player/player.ts' as string)) as typeof import('../../../src/player/player.ts');
const { teleport } = (await import(
  '/src/physics/engine.ts' as string
)) as typeof import('../../../src/physics/engine.ts');
type Knob = { platform: string; dir: number; on: boolean; chained: boolean; x: number; y: number; z: number };
type Halts = { halts: { name: string; lever: Knob[] }[] };
const bot = makeBot(),
  mode = new URLSearchParams(location.search).get('mode') ?? 'platform';
if (!(await read.railReady())) throw new Error('Q7 transition: railway not ready');
const point = (s: number, lat: number, up: number): [number, number, number] => {
  const p = line2World(s, lat, { x: 0, z: 0 });
  return [p.x, line2Y(s) + up, p.z];
};
const view = () => read.inspectRailway()?.line2View as unknown as Halts;
const pier = () => view()?.halts.find((h) => h.name === 'Pier');
if (!(await bot.until(() => pier(), 30000, 'Pier view'))) throw new Error('Q7 transition: no Pier view');
const east = pier()!.lever.find((k) => k.platform === 'down')!;
teleport(me.body!, east.x + 0.7, east.y + 0.6, east.z);
me.body!.velocity.set(0, 0, 0);
const camera = mode === 'signal' ? point(537, 22, 13) : point(716, 20, 17);
const target = mode === 'signal' ? point(537, -2, 0) : point(729, -2, 0);
setInterval(() => window.__debugCam?.set(camera, target, 62), 30);
if (!(await bot.until(() => read.qjob(read.rw(), 6).completion === 1, 60000, 'Q7 opens')))
  throw new Error('Q7 transition: Q7 never opened');
console.log(`TRANSITION opened ${JSON.stringify({ tick: read.railAt(), mode })}`);
const row = () => read.trains(read.rw()).find((r) => r.origin === 72650 && retainedEndBlock(r, 1, read.railAt()));
if (mode === 'signal') {
  if (
    !(await bot.until(
      () => {
        const r = row();
        return r && trainAlong(r, 1, read.railAt()) < 57000;
      },
      30000,
      'retained departure nears its old signal',
    ))
  )
    throw new Error('Q7 transition: departure missed');
} else if (mode === 'cleared') {
  if (!(await bot.until(() => !read.railPlatformEnd(read.rw(), 1, 3, read.railAt()), 60000, 'old departure clears')))
    throw new Error('Q7 transition: clearance missed');
} else if (!(await bot.until(() => row()?.phase === 0, 60000, 'retained old-side train stands')))
  throw new Error(`Q7 transition: retained stand missed at ${read.railAt()}`);
console.log(
  `TRANSITION ${JSON.stringify({
    mode,
    tick: read.railAt(),
    levers: pier()!.lever,
    end: read.railPlatformEnd(read.rw(), 1, 3, read.railAt()),
    callReady: read.railCallReady(read.rw(), 1, 3, -1, read.railAt()),
    rows: read
      .trains(read.rw())
      .slice(1, 4)
      .map((r) => ({ ...r, along: trainAlong(r, 1, read.railAt()) })),
  })}`,
);
(window as Window & { __runningSideTransition?: boolean }).__runningSideTransition = true;

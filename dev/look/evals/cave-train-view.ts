// --rail-seed cave-mid (hood, face, head) or port-reached (salt), --action this file.
// The camera rides the rendered engine's frame for the pass. At the Saltpan, call a
// real train with the platform lever and wait for the host to record its stop.
const { me } = (await import('/src/player/player.ts' as string)) as typeof import('../../../src/player/player.ts');
const { teleport } = (await import(
  '/src/physics/engine.ts' as string
)) as typeof import('../../../src/physics/engine.ts');
const { inspectRailway, railReady } = (await import(
  '/dev/look/rail-read.ts' as string
)) as typeof import('../rail-read.ts');
const { rowAt } = (await import(
  '/src/entities/railway/row-path.ts' as string
)) as typeof import('../../../src/entities/railway/row-path.ts');
const { ROW_LINE } = (await import(
  '/src/sim/railway-route.ts' as string
)) as typeof import('../../../src/sim/railway-route.ts');
const { RAIL_HALTS } = (await import(
  '/src/sim/railway-lines.ts' as string
)) as typeof import('../../../src/sim/railway-lines.ts');
const { rowWorld, ROW_PLATFORM } = (await import(
  '/src/entities/railway/row-path.ts' as string
)) as typeof import('../../../src/entities/railway/row-path.ts');
const { makeBot } = (await import('/dev/look/bot.ts' as string)) as typeof import('../bot.ts');
const beat = new URLSearchParams(location.search).get('caveview')!;
const line = ROW_LINE.cave;
const view = () => inspectRailway()!.line2View!;
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
if (!(await railReady(120000)) || !me.body) throw new Error('Cave line did not become ready');
const salt = beat === 'salt';
const where = salt ? [545, 4.5, 696] : beat === 'head' ? [654, 5.5, 342] : [797, 5.5, 56];
teleport(me.body, where[0]!, where[1]!, where[2]!);
me.body.velocity.set(0, 0, 0);
await wait(800);
if (salt) {
  const halt = RAIL_HALTS.find((h) => h.line === line && h.stop === 2)!;
  const handle = rowWorld(line, halt.s / 100, ROW_PLATFORM, { x: 0, z: 0 });
  teleport(me.body, handle.x, 4.5, handle.z);
  await wait(600);
  const bot = makeBot({
    recover: () => {
      throw new Error('Saltpan request needed recovery');
    },
  });
  if (!(await bot.use(handle.x, handle.z, 'Saltpan request lever', /^Request stop/)))
    throw new Error('Saltpan request unavailable');
}
const along = beat === 'hood' ? 58 : beat === 'face' ? 91 : 346;
const deadline = performance.now() + 240000;
for (;;) {
  const train = view().trains.find(
    (t) =>
      t.line === line &&
      (salt ? t.phase === 0 && t.at === 2 : t.phase !== 0 && t.to === 1 && Math.abs(t.along / 100 - along) < 4),
  );
  if (train) {
    const engine = train.cars.find((c) => c.role === 'engine')!;
    const p = rowAt(line, train.along / 100, { x: 0, z: 0, ux: 0, uz: 0 });
    if (salt) window.__debugCam!.set([561, 8, 706], [engine.x, engine.y + 1, engine.z], 62);
    else
      window.__debugCam!.set(
        [engine.x, engine.y + 2.4, engine.z],
        [engine.x + p.ux * 30, engine.y + 1.4, engine.z + p.uz * 30],
        68,
      );
    console.log('CAVE train camera', beat, train.along / 100, train.at, train.phase);
    break;
  }
  if (performance.now() > deadline) throw new Error('Cave train missed ' + beat);
  await wait(40);
}
export {};

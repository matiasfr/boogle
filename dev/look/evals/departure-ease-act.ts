// npm run look -- --real --rail-seed q5-carry --eval dev/look/evals/departure-ease.ts --action dev/look/evals/departure-ease-act.ts --video --seconds 30 --cam 1186,36,-18 --look 1175,24.5,-25 --name departure-ease --question "Can a player at Q5's frame step aboard the layer as it pulls away?"
// The action for ./departure-ease.ts: walk the last load into Q5's frame, which funds the
// stretch, wait on the server's ticks for laying to start, then run and jump at the layer's deck until aboard. Logs the
// tick laying started, the tick aboard and the layer's speed then (from the funded job's own timing), and rides on.
const { makeBot } = (await import('/dev/look/bot.ts' as string)) as typeof import('../bot.ts');
const R = (await import('/dev/look/rail-read.ts' as string)) as typeof import('../rail-read.ts');
const { me, cam } = (await import('/src/player/player.ts' as string)) as typeof import('../../../src/player/player.ts');
const { input } = (await import('/src/player/input.ts' as string)) as typeof import('../../../src/player/input.ts');
const { pressJump, releaseJump } = (await import(
  '/src/entities/player/state.ts' as string
)) as typeof import('../../../src/entities/player/state.ts');
const { carry } = (await import(
  '/src/physics/platforms.ts' as string
)) as typeof import('../../../src/physics/platforms.ts');
const { LINE2_STATIONS } = (await import(
  '/src/sim/railway-line2-layout.ts' as string
)) as typeof import('../../../src/sim/railway-line2-layout.ts');
const { LINKS, lineAt, railY } = (await import(
  '/src/place/layout.ts' as string
)) as typeof import('../../../src/place/layout.ts');
const { teleport } = (await import(
  '/src/physics/engine.ts' as string
)) as typeof import('../../../src/physics/engine.ts');
const { lineLayDistance } = (await import(
  '/src/sim/railway-line-schedule.ts' as string
)) as typeof import('../../../src/sim/railway-line-schedule.ts');
const { background } = (await import('/src/async.ts' as string)) as typeof import('../../../src/async.ts');
const shot = window as Window & { __departurePrepared?: boolean; __placeDone?: boolean };
if (!shot.__departurePrepared) throw new Error('departure ease: run ./departure-ease.ts as --eval first');
const bot = makeBot({
  recover: () => {
    throw new Error('departure ease action needed recovery');
  },
});
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const job = () => R.line2Station(4);
const spec = LINE2_STATIONS[4]!;
const aboard = () => carry.on?.id === 'railway:T1:flatbed' || carry.on?.id === 'railway:T1:loco';
background(
  (async () => {
    const frame = (R.inspectRailway()!.line2View as { frames: { x: number; z: number }[] }).frames[4]!;
    if (!(await bot.walk(frame.x, frame.z, 3.5))) throw new Error('walk to the frame');
    if (!(await bot.until(() => job().start >= 0, 30000, 'Q5 funded'))) throw new Error('Q5 never funded');
    const funded = job(),
      schedule = R.scheduleOf(spec, funded),
      layFrom = schedule.depositTicks + schedule.feedTicks,
      started = funded.start - funded.ahead + layFrom;
    console.log(
      `DEPARTURE funded ${JSON.stringify({ start: funded.start, layFrom, ease: funded.departureTicks, cruise: funded.cruiseCmPerTick })}`,
    );
    // While it is fed, a waiting player stands on the track 3 m behind the machine (it lays towards larger s): placed
    // there, since the bot's ground planner is slow around the frame; the boarding below is ordinary input.
    const m0 = R.inspectRailway()!.machine,
      line = LINKS[1]!.line,
      along = lineAt(line, spec.fromCm / 100, { x: 0, z: 0, ux: 0, uz: 1 });
    teleport(me.body!, m0.x - along.ux * 3, railY(line, spec.fromCm / 100) + 0.9, m0.z - along.uz * 3);
    me.body!.velocity.set(0, 0, 0);
    console.log(`DEPARTURE behind the layer at elapsed ${job().elapsed} of ${layFrom}`);
    if (!(await bot.until(() => job().elapsed >= layFrom, 15000, 'laying starts')))
      throw new Error('laying never started');
    console.log(`DEPARTURE laying from tick ${started} (seen at ${R.railAt()})`);
    const end = performance.now() + 12000;
    try {
      while (!aboard() && performance.now() < end) {
        const m = R.inspectRailway()!.machine,
          p = me.body!.position;
        cam.yaw = me.yaw = Math.atan2(-(m.x - p.x), -(m.z - p.z));
        console.log(
          `DEPARTURE chase ${JSON.stringify({ t: R.railAt() - started, d: +Math.hypot(m.x - p.x, m.z - p.z).toFixed(2), dy: +(p.y - m.y).toFixed(2), on: carry.on?.id ?? null, coyote: me.coyote > 0 })}`,
        );
        input.keys.add('KeyW');
        if (me.coyote > 0) pressJump();
        await wait(120);
        releaseJump();
        await wait(80);
      }
    } finally {
      input.keys.delete('KeyW');
      releaseJump();
    }
    // The layer's speed t ticks into laying, in m/s: a tick of the funded job's own lay curve (cm a tick / 10).
    const t = R.railAt() - started,
      speed = (lineLayDistance(t + 1, funded) - lineLayDistance(t, funded)) / 10;
    console.log(
      `DEPARTURE ${aboard() ? 'aboard' : 'NOT aboard'} ${JSON.stringify({ ticksIntoLaying: t, ease: funded.departureTicks, speedMs: +speed.toFixed(2) })}`,
    );
    bot.note(aboard() ? `aboard ${t} ticks into laying at ${speed.toFixed(1)} m/s` : 'missed the layer');
    await wait(4000);
    console.log(`DEPARTURE still aboard ${aboard()} at tick ${R.railAt()}`);
    shot.__placeDone = true;
  })(),
  'departure ease boarding',
);
export {};

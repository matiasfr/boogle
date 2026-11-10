// Request stops (docs/plans/works-late-game.md, step 1), two players on line 2 from `--rail-seed trains-on`: player 1
// pulls the quarry lever's village handle and stands by it; player 2 asks at the village, boards and asks for the quarry
// aboard ("Request stop: Quarry"). Both stills are taken once line 2's engine lamp is lit for player 2's request.
// BOOGLE_BOT_RANK=1 npm run look -- --players 2 --rail-seed trains-on --query shot=play \
//   --eval dev/look/evals/railway-request-stop.ts --until window.__placeDone --hud --name request-stop
const { makeBot } = (await import('/dev/look/bot.ts' as string)) as typeof import('../bot.ts');
const { inspectRailway } = (await import(
  '/src/entities/railway/state.ts' as string
)) as typeof import('../../../src/entities/railway/state.ts');
const { me, cam } = (await import('/src/player/player.ts' as string)) as typeof import('../../../src/player/player.ts');
const { input } = (await import('/src/player/input.ts' as string)) as typeof import('../../../src/player/input.ts');
const { interactTarget } = (await import(
  '/src/player/hands.ts' as string
)) as typeof import('../../../src/player/hands.ts');
const { pressJump, releaseJump } = (await import(
  '/src/entities/player/state.ts' as string
)) as typeof import('../../../src/entities/player/state.ts');
const { background } = (await import('/src/async.ts' as string)) as typeof import('../../../src/async.ts');

type Handle = { dir: number; label: string; on: boolean; over: boolean; x: number; y: number; z: number };
type Halt = { name: string; line: number; stop: number; x: number; z: number; up: boolean; lever: Handle[] };
type Car = { x: number; z: number; riding: boolean };
type View = { halts: Halt[]; trains: { cars: Car[]; stopLamp: boolean }[] };
const read = () => inspectRailway()!;
const view = () => read().line2View as unknown as View;
const row = () => read().line2.train[1]!;
const player = new URLSearchParams(location.search).get('player');
const shot = window as Window & { __placeDone?: boolean };
const bot = makeBot({
  recover: () => {
    throw new Error('request-stop look asked for recovery');
  },
});
const check = (ok: unknown, beat: string) => {
  if (!ok) throw new Error(beat);
};
const until = async (fn: () => unknown, beat: string, ms = 2400000) => check(await bot.until(fn, ms, beat), beat);
const pull = async (haltId: number, dir: number) => {
  const handle = view().halts[haltId]!.lever.find((h) => h.on && h.dir === dir);
  check(handle, `${view().halts[haltId]!.name} has a handle ${dir}`);
  check(await bot.use(handle!.x, handle!.z, 'the lever', /^Request stop/), 'lever offered');
  await until(() => view().halts[haltId]!.lever.find((h) => h.dir === dir)!.over, 'the handle stays over', 30000);
  return handle!;
};
setTimeout(() => window.__debugCam?.clear(), 100);
background(
  (async () => {
    await until(() => read()?.ready && me.body && me.coyote > 0, 'seed arrived', 300000);
    await until(() => view().halts[3]?.up && view().halts[2]?.up, 'line 2 halts stand', 60000);
    if (player === '1') {
      // The quarry's handle toward the village, then stand back so the lever, its lamp and the arm are in frame.
      const h = await pull(3, -1);
      const halt = view().halts[3]!;
      await bot.walk(h.x + (halt.x - h.x) * 1.6, h.z + (halt.z - h.z) * 1.6, 0.8);
      const p = me.body!.position;
      cam.yaw = me.yaw = Math.atan2(-(h.x - p.x), -(h.z - p.z));
      // Player 2's request aboard: an outbound train bound for the quarry with its lamp lit (this lever's own request
      // lights it too, on a train coming home).
      await until(
        () => view().trains[1]!.stopLamp && row().track === 0 && row().to === 1 && row().phase === 1,
        "line 2's engine lamp lights for the request aboard",
      );
      console.log(`REQUEST STOP ${JSON.stringify({ row: row(), lever: view().halts[3]!.lever })}`);
      shot.__placeDone = true;
      return;
    }
    // Player 2: ask at the village, toward Far Head, board by a real jump and ask for the quarry aboard.
    await pull(2, 1);
    const village = view().halts[2]!;
    check(await bot.walk(village.x, village.z, 0.5), 'walked onto the village platform');
    await until(() => row().phase === 0 && row().at === 0 && row().track === 0, 'a train toward Far Head stands');
    const aboard = () => view().trains[1]!.cars.some((car) => car.riding);
    const end = performance.now() + 20000;
    try {
      while (!aboard() && performance.now() < end) {
        const car = view().trains[1]!.cars[1]!;
        const p = me.body!.position;
        cam.yaw = me.yaw = Math.atan2(-(car.x - p.x), -(car.z - p.z));
        input.keys.add('KeyW');
        if (me.coyote > 0) pressJump();
        await bot.wait(120);
        releaseJump();
        await bot.wait(80);
      }
    } finally {
      input.keys.delete('KeyW');
      releaseJump();
    }
    check(aboard(), 'boarded line 2 by a real jump');
    await until(() => interactTarget()?.id === 'railway-request-aboard', 'Request stop offered aboard', 60000);
    console.log(`ABOARD PROMPT ${interactTarget()?.verb}`);
    check(interactTarget()?.verb === 'Request stop: Quarry', 'the prompt names the quarry');
    bot.press();
    await until(() => view().trains[1]!.stopLamp, 'the engine lamp lights', 30000);
    console.log(`ABOARD REQUESTED ${JSON.stringify(row())}`);
  })(),
  'request-stop look',
);
export {};

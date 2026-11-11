// Request stops with two trains on line 2 (docs/plans/generic-lines.md, 7; v26), two players from `--rail-seed
// trains-on`: player 1 crosses the Quarry's plank crossing to its up platform and pulls its lever (toward Far Head); the
// next up train that can brake for it lights its amber lamp and stands at the up platform, while line 2's other train
// runs home past the down platform dark. Player 2 asks at the village, boards whichever train stops and asks for the
// quarry aboard ("Request stop: Quarry"), so the cord names its own train. Player 1's still is taken with the served
// train standing at the up platform; player 2's once its engine lamp is lit.
// BOOGLE_BOT_RANK=1 npm run look -- --players 2 --rail-seed trains-on --query shot=play \
//   --eval dev/look/evals/railway-request-stop.ts --until window.__placeDone --hud --name request-stop
const { makeBot } = (await import('/dev/look/bot.ts' as string)) as typeof import('../bot.ts');
const { inspectRailway, lines, railRead, rw, trains } = (await import(
  '/dev/look/rail-read.ts' as string
)) as typeof import('../rail-read.ts');
const { me, cam } = (await import('/src/player/player.ts' as string)) as typeof import('../../../src/player/player.ts');
const { input } = (await import('/src/player/input.ts' as string)) as typeof import('../../../src/player/input.ts');
const { interactTarget } = (await import(
  '/src/player/hands.ts' as string
)) as typeof import('../../../src/player/hands.ts');
const { pressJump, releaseJump } = (await import(
  '/src/entities/player/state.ts' as string
)) as typeof import('../../../src/entities/player/state.ts');
const { background } = (await import('/src/async.ts' as string)) as typeof import('../../../src/async.ts');

type Handle = {
  dir: number;
  platform: 'up' | 'down';
  label: string;
  on: boolean;
  chained: boolean;
  over: boolean;
  x: number;
  y: number;
  z: number;
};
type Halt = { name: string; line: number; stop: number; x: number; z: number; up: boolean; lever: Handle[] };
type Car = { x: number; y: number; z: number; riding: boolean };
type Train = { slot: number; line: number; along: number; cars: Car[]; stopLamp: boolean; holdLamp: boolean };
type Up = { pair: number; up: boolean; x: number; y: number; z: number; path: { x: number; z: number }[] };
type View = { halts: Halt[]; trains: Train[]; upPlatforms: Up[] };
const view = () => inspectRailway()!.line2View as unknown as View;
const LINE2_SLOTS = [1, 2];
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
const lever = (haltId: number, dir: number) => view().halts[haltId]!.lever.find((h) => h.on && h.dir === dir);
const pull = async (haltId: number, dir: number) => {
  const handle = lever(haltId, dir);
  check(handle, `${view().halts[haltId]!.name} has a lever ${dir}`);
  check(await bot.use(handle!.x, handle!.z, 'the lever', /^Request stop/), 'lever offered');
  await until(() => view().halts[haltId]!.lever.find((h) => h.dir === dir)!.over, 'the lever stays over', 30000);
  return handle!;
};
const QUARRY = 3;
setTimeout(() => window.__debugCam?.clear(), 100);
background(
  (async () => {
    await until(() => railRead()?.ready() && me.body && me.coyote > 0, 'seed arrived', 300000);
    await until(() => view().halts[QUARRY]?.up && view().halts[2]?.up, 'line 2 halts stand', 60000);
    if (player === '1') {
      // Over the plank crossing to the up platform (the walk from it, reversed), then its lever toward Far Head.
      const up = view().upPlatforms.find((u) => u.pair === QUARRY)!;
      const halt = view().halts[QUARRY]!;
      check(await bot.walk(halt.x, halt.z, 1), 'walked to the quarry halt');
      for (const [i, p] of [...up.path].reverse().entries())
        check(await bot.straight(p.x, p.z, 0.5, 15000), `over the plank crossing, step ${i + 1}`);
      check(await bot.straight(up.x, up.z, 0.5, 15000), 'onto the up platform');
      const h = await pull(QUARRY, 1);
      check(h.platform === 'up', "the quarry's up lever is on the up platform");
      check(h.label === 'Far Head', `its plaque names Far Head (${h.label})`);
      // Stand back along the deck so the lever and the incoming train are both in frame.
      await bot.straight(up.x + (h.x - up.x) * 0.2, up.z + (h.z - up.z) * 0.2, 0.6, 8000);
      const p = me.body!.position;
      cam.yaw = me.yaw = Math.atan2(-(h.x - p.x), -(h.z - p.z));
      // The serving train: the up train whose amber lamp is lit for this lever; the other must not stop down.
      let served = -1;
      const passedDown: number[] = [];
      await until(() => {
        for (const k of LINE2_SLOTS) {
          const r = trains(rw())[k]!,
            t = view().trains[k]!;
          if (r.track === 0 && t.stopLamp && r.to === 1) served = k;
          if (r.track === 1 && r.phase === 1 && Math.abs(t.along - 17400) < 600 && !passedDown.includes(k))
            passedDown.push(k);
        }
        return served >= 0;
      }, 'an up train lights its lamp for the up lever');
      console.log(`SERVED ${JSON.stringify({ served, row: trains(rw())[served], lines: lines(rw()) })}`);
      await until(() => {
        const r = trains(rw())[served]!;
        for (const k of LINE2_SLOTS) {
          const o = trains(rw())[k]!,
            t = view().trains[k]!;
          if (
            k !== served &&
            o.track === 1 &&
            o.phase === 1 &&
            Math.abs(t.along - 17400) < 600 &&
            !passedDown.includes(k)
          )
            passedDown.push(k);
          check(!(o.track === 1 && o.phase === 0 && o.at === 1), 'no down train stands at the quarry for an up ask');
        }
        return r.phase === 0 && r.at === 1 && r.track === 0;
      }, 'the served train stands at the up platform');
      // Frame the standing train across both tracks, from beyond the down track: the train at the up platform, the
      // asker and the lever behind it.
      const car = view().trains[served]!.cars[1]!,
        me0 = me.body!.position;
      const dx = me0.x - car.x,
        dz = me0.z - car.z,
        d = Math.hypot(dx, dz) || 1;
      const eye: [number, number, number] = [car.x - (dx / d) * 11, car.y + 4.5, car.z - (dz / d) * 11];
      setInterval(() => {
        const c = view().trains[served]!.cars[1]!;
        window.__debugCam?.set(eye, [(c.x + me0.x) / 2, c.y + 0.6, (c.z + me0.z) / 2]);
      }, 16);
      await bot.wait(400);
      console.log(
        `REQUEST STOP ${JSON.stringify({ served, passedDown, trains: trains(rw()), lever: view().halts[QUARRY]!.lever })}`,
      );
      shot.__placeDone = true;
      return;
    }
    // Player 2: ask at the village, toward Far Head, board whichever train stops, and ask for the quarry aboard.
    await pull(2, 1);
    const village = view().halts[2]!;
    check(await bot.walk(village.x, village.z, 0.5), 'walked onto the village platform');
    let slot = -1;
    await until(() => {
      slot =
        LINE2_SLOTS.find((k) => {
          const r = trains(rw())[k]!;
          return r.phase === 0 && r.at === 0 && r.track === 0;
        }) ?? -1;
      return slot >= 0;
    }, 'a train toward Far Head stands');
    const train = () => view().trains[slot]!;
    const aboard = () => train().cars.some((car) => car.riding);
    const end = performance.now() + 20000;
    try {
      while (!aboard() && performance.now() < end) {
        const car = train().cars[1]!;
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
    console.log(`ABOARD PROMPT ${interactTarget()?.verb} ${interactTarget()?.blocked ?? ''}`);
    check(interactTarget()?.verb === 'Request stop: Quarry', 'the prompt names the quarry');
    if (interactTarget()?.run) bot.press();
    await until(() => train().stopLamp, 'the engine lamp lights', 30000);
    console.log(`ABOARD REQUESTED ${JSON.stringify({ slot, row: trains(rw())[slot] })}`);
    shot.__placeDone = true;
  })(),
  'request-stop look',
);
export {};

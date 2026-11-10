// Two players seated on the knifeboard (docs/plans/passenger-car-previz.md, Four), from `--rail-seed trains-on`: both walk
// onto line 2's village halt, board the standing train by a real jump, and sit; the still is each player's view of the
// pair on the bench. Short: a hang is not retried.
// npm run look -- --players 2 --rail-seed trains-on --query shot=play --eval dev/look/evals/railway-passenger-car-two.ts \
//   --until window.__placeDone --wall 240 --name passenger-car-two
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
const { seatState } = (await import(
  '/src/proto/place/seat.ts' as string
)) as typeof import('../../../src/proto/place/seat.ts');
const { background } = (await import('/src/async.ts' as string)) as typeof import('../../../src/async.ts');

type Halt = { x: number; z: number; up: boolean; lever: { dir: number; on: boolean; x: number; z: number }[] };
type View = { halts: Halt[]; trains: { cars: { x: number; z: number; riding: boolean }[] }[] };
const read = () => inspectRailway()!;
const view = () => read().line2View as unknown as View;
const row = () => read().line2.train[1]!;
const player = new URLSearchParams(location.search).get('player');
const shot = window as Window & { __placeDone?: boolean };
const bot = makeBot({
  recover: () => {
    throw new Error('passenger-car-two look asked for recovery');
  },
});
const check = (ok: unknown, beat: string) => {
  if (!ok) throw new Error(beat);
};
const until = async (fn: () => unknown, beat: string, ms = 600000) => check(await bot.until(fn, ms, beat), beat);
setTimeout(() => window.__debugCam?.clear(), 100);
background(
  (async () => {
    await until(() => read()?.ready && me.body && me.coyote > 0, 'seed arrived', 300000);
    await until(() => view().halts[3]?.up && view().halts[2]?.up, 'line 2 halts stand', 60000);
    const village = view().halts[2]!;
    if (player === '1') {
      const handle = village.lever.find((h) => h.on && h.dir === 1);
      check(handle, 'the village has a handle toward Far Head');
      check(await bot.use(handle!.x, handle!.z, 'the lever', /^Request stop/), 'lever offered');
    }
    check(await bot.walk(village.x, village.z, player === '1' ? 0.5 : 1.2), 'walked onto the village platform');
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
    await until(() => interactTarget()?.id === 'place-sit', 'Sit offered', 30000);
    bot.press();
    await until(() => seatState().sitting, 'seated', 10000);
    console.log(`SEATED ${player} ${seatState().sitting}`);
    await until(() => me.avatar && window.boogle.remotes.size > 0, 'sees the partner', 30000);
    await bot.wait(4000);
    const aim = () => {
      const a = me.avatar!.rotation.y + 0.9;
      const p = me.body!.position;
      window.__debugCam!.set([p.x - Math.sin(a) * 4.6, p.y + 1.3, p.z - Math.cos(a) * 4.6], [p.x, p.y - 0.4, p.z]);
    };
    aim();
    setInterval(aim, 16);
    await bot.wait(1500);
    shot.__placeDone = true;
  })(),
  'passenger-car-two look',
);
export {};

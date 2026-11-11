// The passenger car's knifeboard (docs/plans/passenger-car-previz.md, Four) in real time, from `--rail-seed trains-on`: walk
// onto line 2's village halt, board the standing train by a real jump, ask for the quarry, sit by Interact, ride the
// stretch seated, then at the quarry stand up and walk off. `window.__car` marks each beat for the stills.
// npm run look -- --rail-seed trains-on --query shot=play --action dev/look/evals/railway-passenger-car.ts \
//   --real --warm 5 --video --name passenger-car
// Run as `--action`, so the journey is inside the real-time recording.
const { makeBot } = (await import('/dev/look/bot.ts' as string)) as typeof import('../bot.ts');
const { inspectRailwayLegacy } = (await import(
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
  '/src/entities/railway/seat.ts' as string
)) as typeof import('../../../src/entities/railway/seat.ts');

type Halt = {
  name: string;
  x: number;
  z: number;
  up: boolean;
  lever: { dir: number; on: boolean; x: number; z: number }[];
};
type Car = { x: number; z: number; riding: boolean };
type View = { halts: Halt[]; trains: { cars: Car[]; stopLamp: boolean }[] };
const read = () => inspectRailwayLegacy()!;
const view = () => read().line2View as unknown as View;
// The ridden train's slot: whichever of line 2's two stops at the village toward Far Head (v26).
let slot = 1;
const row = () => read().trains[slot]!;
const standsUp = () => {
  const k = [1, 2].find((k) => {
    const r = read().trains[k]!;
    return r.phase === 0 && r.at === 0 && r.track === 0;
  });
  if (k !== undefined) slot = k;
  return k !== undefined;
};
const shot = window as Window & { __car?: string };
const bot = makeBot({
  recover: () => {
    throw new Error('passenger-car look asked for recovery');
  },
});
const check = (ok: unknown, beat: string) => {
  if (!ok) throw new Error(beat);
};
const until = async (fn: () => unknown, beat: string, ms = 2400000) => check(await bot.until(fn, ms, beat), beat);
const mark = (beat: string) => {
  shot.__car = beat;
  console.log(`CAR ${beat} ${JSON.stringify({ seat: seatState().sitting, row: row() })}`);
};
setTimeout(() => window.__debugCam?.clear(), 100);
await (async () => {
  await until(() => read()?.ready && me.body && me.coyote > 0, 'seed arrived', 300000);
  await until(() => view().halts[3]?.up && view().halts[2]?.up, 'line 2 halts stand', 60000);
  // Ask at the village for a train toward Far Head, as the request-stop look does.
  const village = view().halts[2]!;
  const handle = village.lever.find((h) => h.on && h.dir === 1);
  check(handle, 'the village has a handle toward Far Head');
  check(await bot.use(handle!.x, handle!.z, 'the lever', /^Request stop/), 'lever offered');
  check(await bot.walk(village.x, village.z, 0.5), 'walked onto the village platform');
  await until(standsUp, 'a train toward Far Head stands');
  mark('halt');
  await bot.wait(1500);
  const aboard = () => view().trains[slot]!.cars.some((car) => car.riding);
  const end = performance.now() + 20000;
  try {
    while (!aboard() && performance.now() < end) {
      const car = view().trains[slot]!.cars[1]!;
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
  mark('boarded');
  await until(() => interactTarget()?.id === 'railway-request-aboard', 'Request stop offered aboard', 60000);
  bot.press();
  await until(() => view().trains[slot]!.stopLamp, 'the engine lamp lights', 30000);
  mark('requested');
  // Sit by Interact: the nearest free seat of the knifeboard.
  await until(() => interactTarget()?.id === 'place-sit', 'Sit offered', 30000);
  bot.press();
  await until(() => seatState().sitting, 'seated', 10000);
  mark('seated');
  // A camera 4 m out in front of the rider, 35 degrees round from straight on, re-aimed each frame so it rides the deck:
  // the rider, their bench and the car's rail read together. The follow camera comes back when they stand up.
  const aim = setInterval(() => {
    const a = me.avatar!.rotation.y + 0.6;
    const p = me.body!.position;
    window.__debugCam!.set([p.x - Math.sin(a) * 4, p.y + 0.9, p.z - Math.cos(a) * 4], [p.x, p.y - 0.3, p.z]);
  }, 16);
  await until(() => row().phase === 1, 'the train is under way', 120000);
  await bot.wait(6000);
  mark('riding');
  await until(() => row().phase === 0 && row().at === 1, 'the train halts at the quarry', 300000);
  await bot.wait(1500);
  mark('halted');
  await until(() => interactTarget()?.id === 'place-stand', 'Stand up offered', 30000);
  bot.press();
  await until(() => !seatState().sitting, 'stood up', 10000);
  clearInterval(aim);
  window.__debugCam!.clear();
  mark('stood');
  const quarry = view().halts[3]!;
  await bot.walk(quarry.x, quarry.z, 0.8);
  mark('off');
  await bot.wait(1500);
})();
export {};

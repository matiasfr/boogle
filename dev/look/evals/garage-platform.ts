// The platform beat (docs/plans/garage-install-moment.md, G5): installs the longer boiler through the garage, shuts
// it, then waits until a line 2 train that still wears the standard boiler is running in to the Village and is about
// to stop, so a capture that starts now has the train arrive and take the boiler at the platform: the puff, the swap
// under it, the clank and squash, the toot. The camera is the look's own (`--cam`, `--look`), on the platform's side.
//   npm run look -- --real --rail-seed steel-home --eval dev/look/evals/garage-platform.ts --until window.__beatDone \
//     --cam 935,21.5,17.5 --look 929.5,20,23.5 --video --seconds 14 --frames 28 --wall 600 --name g5-platform
const { me, cam } = (await import('/src/player/player.ts' as string)) as typeof import('../../../src/player/player.ts');
const { teleport } = (await import(
  '/src/physics/engine.ts' as string
)) as typeof import('../../../src/physics/engine.ts');
const { triggerAction } = (await import(
  '/src/player/controls.ts' as string
)) as typeof import('../../../src/player/controls.ts');
const { background } = (await import('/src/async.ts' as string)) as typeof import('../../../src/async.ts');
const { garage } = (await import(
  '/src/entities/railway/garage-state.ts' as string
)) as typeof import('../../../src/entities/railway/garage-state.ts');
const { garageRow, polarAt } = (await import(
  '/src/entities/railway/garage-geo.ts' as string
)) as typeof import('../../../src/entities/railway/garage-geo.ts');
const { LINE2, RAIL_LINES } = (await import(
  '/src/sim/railway-lines.ts' as string
)) as typeof import('../../../src/sim/railway-lines.ts');
const { LINE_SLOTS } = (await import(
  '/src/sim/railway-trains.ts' as string
)) as typeof import('../../../src/sim/railway-trains.ts');
const { TRAIN_PHASE, trainAlong } = (await import(
  '/src/sim/railway-train.ts' as string
)) as typeof import('../../../src/sim/railway-train.ts');
const { line, railAt, railReady, rw, train } = (await import(
  '/dev/look/rail-read.ts' as string
)) as typeof import('../rail-read.ts');

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const say = (text: string) => console.log(`BEAT ${text}`);
if (!(await railReady(30_000))) throw new Error('garage-platform: the railway never became ready');
while (!me.body || !me.entered) await wait(100);
const { geo, table: centre, y: groundY } = garageRow();
const post = geo.post;
const stood = polarAt(centre, { bearing: post.bearing + 6, r: post.r - 0.2 });
teleport(me.body, stood.x, groundY + 0.7, stood.z);
me.body.velocity.set(0, 0, 0);
cam.yaw = me.yaw = Math.atan2(stood.x - centre.x, stood.z - centre.z);
await wait(1500);
triggerAction('interact', 'down');
triggerAction('interact', 'up');
for (let k = 0; k < 80 && !garage.api?.isOpen(); k++) await wait(100);
if (!garage.api?.snap().canInstall) throw new Error('garage-platform: the garage did not open ready to install');
await wait(900);
triggerAction('interact', 'down');
for (let k = 0; k < 200 && line(rw(), LINE2).boiler < 1; k++) await wait(50);
triggerAction('interact', 'up');
if (line(rw(), LINE2).boiler < 1) throw new Error('garage-platform: the hold did not fit the boiler');
const fitted = railAt();
for (let k = 0; k < 400 && garage.api.snap().phase !== 'idle'; k++) await wait(25);
garage.api.close();
say(`installed at tick ${fitted}; trains wear ${JSON.stringify(LINE_SLOTS[LINE2]!.map((s) => train(rw(), s).boiler))}`);
// The Village is line 2's halt 0. A train on the standard boiler, running to it, within 45 m of its stop.
const village = RAIL_LINES[LINE2]!.halts[0]!.s;
const coming = () =>
  LINE_SLOTS[LINE2]!.find((slot) => {
    const r = train(rw(), slot);
    return (
      r.boiler === 0 &&
      r.phase === TRAIN_PHASE.RUN &&
      r.to === 0 &&
      Math.abs(trainAlong(r, LINE2, railAt()) - village) < 4500
    );
  });
const by = railAt() + 3000;
let slot: number | undefined;
while ((slot = coming()) === undefined) {
  if (railAt() > by) throw new Error('garage-platform: no standard-boiler train ran in to the Village in 300 s');
  await wait(50);
}
say(`train slot ${slot} is running in, ${((railAt() - fitted) / 10).toFixed(1)} s after the install`);
(window as Window & { __beatDone?: boolean }).__beatDone = true;
background(
  (async () => {
    for (let k = 0; k < 600 && train(rw(), slot).boiler === 0; k++) await wait(25);
    const r = train(rw(), slot);
    say(
      `slot ${slot} wears boiler ${r.boiler} at tick ${railAt()} (phase ${r.phase === TRAIN_PHASE.STAND ? 'stand' : 'run'})`,
    );
  })(),
  'platform beat',
);
export {};

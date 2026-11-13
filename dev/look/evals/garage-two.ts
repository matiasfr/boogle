// Everyone else's install moment, with two players (docs/plans/garage-install-moment.md, G4). Runs on both pages.
//   npm run look -- --players 2 --real --rail-seed steel-home --hud --eval dev/look/evals/garage-two.ts \
//     --until window.__twoDone --action dev/look/evals/garage-act.ts --query garage=enter --seconds 12 --frames 24
// Default: player 1 is the bystander, 12 m east of the table on their own camera (the look's sheet and still are
// theirs); player 2 opens the garage and, 4 s after both are ready, holds Install (the look's "still 2" is theirs).
// The bystander's page prints its camera, position and input hold before and after the moment: nothing is taken.
// `&two=race`: both open the garage and both hold from the same server tick. One install wins; the other tab must see
// the winner's moment as not its own (`mine` false), keep Back, and end fitted. Each page prints what it saw.
const { me, cam } = (await import('/src/player/player.ts' as string)) as typeof import('../../../src/player/player.ts');
const { teleport } = (await import(
  '/src/physics/engine.ts' as string
)) as typeof import('../../../src/physics/engine.ts');
const { triggerAction } = (await import(
  '/src/player/controls.ts' as string
)) as typeof import('../../../src/player/controls.ts');
const { inputState } = (await import(
  '/src/player/input-state.ts' as string
)) as typeof import('../../../src/player/input-state.ts');
const { camera } = (await import('/src/render/scene.ts' as string)) as typeof import('../../../src/render/scene.ts');
const { background } = (await import('/src/async.ts' as string)) as typeof import('../../../src/async.ts');
const { garage } = (await import(
  '/src/entities/railway/garage-state.ts' as string
)) as typeof import('../../../src/entities/railway/garage-state.ts');
const { GARAGE_GEO, polarAt } = (await import(
  '/src/entities/railway/garage-geo.ts' as string
)) as typeof import('../../../src/entities/railway/garage-geo.ts');
const { SHED_TABLE } = (await import(
  '/src/sim/railway-works-layout.ts' as string
)) as typeof import('../../../src/sim/railway-works-layout.ts');
const { LINE2 } = (await import(
  '/src/sim/railway-lines.ts' as string
)) as typeof import('../../../src/sim/railway-lines.ts');
const { line, railAt, railReady, rw } = (await import(
  '/dev/look/rail-read.ts' as string
)) as typeof import('../rail-read.ts');

const query = new URLSearchParams(location.search);
const second = query.get('player') === '2';
const race = query.get('two') === 'race';
const who = second ? 'two' : 'one';
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const say = (text: string) => console.log(`TWO ${who}: ${text}`);
const done = window as Window & { __twoDone?: boolean };
const centre = { x: SHED_TABLE.x / 100, z: SHED_TABLE.z / 100 };
const boiler = () => line(rw(), LINE2).boiler;
const snapOf = () => {
  const s = garage.api!.snap();
  return { open: s.open, phase: s.phase, mine: s.mine, real: s.real, waiting: s.waiting, ms: Math.round(s.ms) };
};
const round = (v: number) => Math.round(v * 100) / 100;
const mineNow = () => ({
  at: [round(me.body!.position.x), round(me.body!.position.y), round(me.body!.position.z)],
  cam: [round(camera.position.x), round(camera.position.y), round(camera.position.z)],
  held: inputState.held,
});
function stand(bearing: number, r: number) {
  const p = polarAt(centre, { bearing, r });
  teleport(me.body!, p.x, SHED_TABLE.y / 100 + 0.7, p.z);
  me.body!.velocity.set(0, 0, 0);
  // The game's camera stands on the side `cam.yaw` points to, looking back over the player: away from the table.
  cam.yaw = me.yaw = Math.atan2(p.x - centre.x, p.z - centre.z);
}
async function openGarage() {
  triggerAction('interact', 'down');
  triggerAction('interact', 'up');
  for (let k = 0; k < 80 && !garage.api?.isOpen(); k++) await wait(100);
  const s = garage.api?.snap();
  if (!s?.open || s.sel !== 'long' || !s.canInstall)
    throw new Error(`garage-two ${who}: the garage did not open ready`);
  await wait(900);
}
async function hold() {
  triggerAction('interact', 'down');
  for (let k = 0; k < 150 && boiler() < 1; k++) await wait(50);
  triggerAction('interact', 'up');
}
/** Waits for a moment to start on this page and to end, printing what `mineNow` says either side. */
async function watchMoment() {
  const before = mineNow();
  for (let k = 0; k < 600 && garage.api!.snap().phase !== 'moment'; k++) await wait(25);
  const seen = snapOf();
  for (let k = 0; k < 600 && garage.api!.snap().phase === 'moment'; k++) await wait(25);
  say(`moment seen ${JSON.stringify(seen)}; before ${JSON.stringify(before)}; after ${JSON.stringify(mineNow())}`);
  say(`ended ${JSON.stringify(snapOf())}, Line.boiler ${boiler()}`);
}

if (!(await railReady(30_000))) throw new Error('garage-two: the railway never became ready');
while (!me.body || !me.entered) await wait(100);
const post = GARAGE_GEO.a.post;
if (race) {
  stand(post.bearing + (second ? -7 : 7), post.r + 0.25);
  // A player seeded into a room is shown each ability's flourish first (ability-arrival.ts); let them play out.
  await wait(14000);
  window.__debugCam?.clear();
  await openGarage();
  // Both press on the same server tick: the next multiple of 100 that is at least 40 ticks off.
  const go = Math.ceil((railAt() + 40) / 100) * 100;
  say(`ready; holding from tick ${go}`);
  done.__twoDone = true;
  background(
    (async () => {
      while (railAt() < go) await wait(10);
      await hold();
      await wait(300);
      const mid = snapOf();
      say(`after the hold ${JSON.stringify(mid)}, Line.boiler ${boiler()}`);
      if (mid.phase === 'moment' && !mid.mine) {
        // The loser of the race: Back is theirs through the winner's moment.
        document.querySelector<HTMLElement>('.g-back')?.click();
        await wait(200);
        say(`lost the race: Back during the winner's moment left the garage open=${garage.api!.snap().open}`);
      } else {
        for (let k = 0; k < 600 && garage.api!.snap().phase !== 'idle'; k++) await wait(25);
        say(`won or settled: ${JSON.stringify(snapOf())}, Line.boiler ${boiler()}`);
      }
    })(),
    'garage race',
  );
} else if (second) {
  stand(post.bearing + 6, post.r + 0.2);
  await wait(14000);
  window.__debugCam?.clear();
  await openGarage();
  say('the installer: garage open on the Longer boiler, holding in 4 s');
  done.__twoDone = true;
  background(
    (async () => {
      await wait(4000);
      await hold();
      say(`held; ${JSON.stringify(snapOf())}, Line.boiler ${boiler()}`);
      for (let k = 0; k < 600 && garage.api!.snap().phase !== 'idle'; k++) await wait(25);
      say(`the installer's moment ended ${JSON.stringify(snapOf())}`);
    })(),
    'garage installer',
  );
} else {
  stand(97, 12);
  await wait(14000);
  say(`the bystander: 12 m east of the table ${JSON.stringify(mineNow())}`);
  done.__twoDone = true;
  background(watchMoment(), 'garage bystander');
}
export {};

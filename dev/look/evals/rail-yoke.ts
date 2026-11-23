// npm run look -- --rail-seed q1-last --eval dev/look/evals/rail-yoke.ts --action dev/look/evals/rail-yoke.ts --video --seconds 14 --name yoke-errand
// The setup takes rails for the fresh player. The action walks onto Q1's receiver; yokeLook=take also exercises both facings and takes the yoke.
const R = (await import('/dev/look/rail-read.ts' as string)) as typeof import('../rail-read.ts');
const { railwayCommands } = (await import(
  '/src/entities/railway/state.ts' as string
)) as typeof import('../../../src/entities/railway/state.ts');
const { me, cam } = (await import('/src/player/player.ts' as string)) as typeof import('../../../src/player/player.ts');
const { interactTarget } = (await import(
  '/src/player/hands.ts' as string
)) as typeof import('../../../src/player/hands.ts');
const { teleport } = (await import(
  '/src/physics/engine.ts' as string
)) as typeof import('../../../src/physics/engine.ts');
const { H } = (await import('/src/place/terrain.ts' as string)) as typeof import('../../../src/place/terrain.ts');
const { LINE2_FORGE, LINE2_YOKE, LINE2_STATIONS, RAILS } = (await import(
  '/src/sim/railway-line2-layout.ts' as string
)) as typeof import('../../../src/sim/railway-line2-layout.ts');
const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));
async function until(check: () => boolean, label: string) {
  for (let i = 0; i < 200; i++) {
    if (check()) return;
    await wait(100);
  }
  throw new Error(label);
}
await until(() => !!R.railRead()?.ready() && !!me.body, 'railway ready');
const rack = { x: LINE2_FORGE.rackX / 100, z: LINE2_FORGE.rackZ / 100 },
  yoke = { x: LINE2_YOKE.x / 100, z: LINE2_YOKE.z / 100 };
const frame = { x: LINE2_STATIONS[0]!.x / 100, z: LINE2_STATIONS[0]!.z / 100 };
function move(x: number, z: number) {
  teleport(me.body!, x, H(x, z) + 0.85, z);
  me.body!.velocity.set(0, 0, 0);
}
const view = window as Window & { __yokePrepared?: boolean };
const mode = new URLSearchParams(location.search).get('yokeLook');
const reload = mode === 'reload' || mode === 'reload-taken';
const aim = () =>
  window.__debugCam?.set([frame.x + 3, H(frame.x, frame.z) + 3, frame.z + 5], [yoke.x, H(yoke.x, yoke.z) + 1, yoke.z]);
if (reload && sessionStorage.getItem('yoke-look-reload')) {
  const taken = mode === 'reload-taken';
  await until(() => {
    if (!me.entered) document.querySelector<HTMLButtonElement>('#enter:not([disabled])')?.click();
    return me.entered && !document.querySelector('.splash:not(.gone), .railway-return-veil.on');
  }, 'returned to play');
  await until(() => !!R.inspectRailway()?.line2View.forgeRewards && R.rail(R.rw()).yoke === taken, 'restored world');
  move(yoke.x + 2, yoke.z + 2);
  aim();
  await wait(1200);
  const state = R.inspectRailway()!;
  const reward = state.line2View.forgeRewards.yoke;
  if (reward.errands || !reward.hooked || reward.shown === taken || state.reward.showing)
    throw new Error('unexpected restore ' + JSON.stringify(reward));
  console.log('PLAY restored yoke ' + JSON.stringify(reward) + ' taken ' + taken);
} else {
  const setup = !view.__yokePrepared;
  if (setup) {
    move(rack.x, rack.z);
    await wait(700);
    await until(() => {
      if (R.railBack().rails > 0) return true;
      if (!R.railRead()!.pending()) railwayCommands()!.forgeTake();
      return false;
    }, 'rail pickup');
    move(frame.x + 4, frame.z + 2);
    view.__yokePrepared = true;
  }
  if (reload || !setup) {
    move(frame.x, frame.z + 2);
    await until(() => R.line2YokeReady(R.rw()) && !R.railRead()!.pending(), 'last rail accepted');
    move(frame.x + 3, frame.z + 2);
    aim();
    if (mode === 'take' || mode === 'reload-taken') {
      const x = (rack.x + yoke.x) / 2,
        z = (rack.z + yoke.z) / 2;
      move(x, z);
      for (const [at, id] of [
        [rack, 'railway-forge-rails'],
        [yoke, 'railway-yoke'],
      ] as const) {
        cam.yaw = me.yaw = Math.atan2(x - at.x, z - at.z);
        await until(() => interactTarget()?.id === id, 'facing ' + id);
        console.log('YOKE facing ' + interactTarget()?.verb);
      }
      interactTarget()!.run?.();
      await until(() => R.rail(R.rw()).yoke && !!R.inspectRailway()?.reward.showing, 'accepted yoke card');
      const railsRow = () => document.querySelectorAll('.carry-tag [data-kind="rails"] .carry-sq').length;
      await until(() => railsRow() === 16, 'rails row grew to 16 squares');
      const squares = railsRow();
      console.log(
        'PLAY yoke: rack and yoke both offered, accepted card, capacity ' +
          R.capacityOf(R.rw(), RAILS) +
          ', rails squares ' +
          squares,
      );
      await wait(1800);
    }
    if (reload) {
      sessionStorage.setItem('yoke-look-reload', '1');
      setTimeout(() => location.reload(), 800);
    }
  }
}
export {};

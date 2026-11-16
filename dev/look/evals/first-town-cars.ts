// npm run look -- --rail-seed wagon-on --hud --eval dev/look/evals/first-town-cars.ts --until window.__placeDone
// First-town V1 Cars tile proof. wagon-on includes the departing shunter: wait for the garage copy to return.
// look --rail-seed wagon-on --hud --eval <this> --until window.__placeDone
const { me, cam } = (await import('/src/player/player.ts' as string)) as typeof import('../../../src/player/player.ts');
const { teleport } = (await import(
  '/src/physics/engine.ts' as string
)) as typeof import('../../../src/physics/engine.ts');
const { garage } = (await import(
  '/src/entities/railway/garage-state.ts' as string
)) as typeof import('../../../src/entities/railway/garage-state.ts');
const { garageRow, polarAt } = (await import(
  '/src/entities/railway/garage-geo.ts' as string
)) as typeof import('../../../src/entities/railway/garage-geo.ts');
const { inspectRailway } = (await import(
  '/src/entities/railway/state.ts' as string
)) as typeof import('../../../src/entities/railway/state.ts');
const { triggerAction } = (await import(
  '/src/player/controls.ts' as string
)) as typeof import('../../../src/player/controls.ts');
const { background } = (await import('/src/async.ts' as string)) as typeof import('../../../src/async.ts');
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
background(
  (async () => {
    const { geo, table, y } = garageRow();
    const post = polarAt(table, geo.post);
    const p = polarAt(table, { bearing: geo.post.bearing + 6, r: geo.post.r - 0.2 });
    teleport(me.body!, p.x, y + 0.7, p.z);
    cam.yaw = me.yaw = Math.atan2(-(post.x - p.x), -(post.z - p.z));
    const deadline = performance.now() + 180000;
    while (!inspectRailway()?.worksView?.garageView?.copy.shown) {
      if (performance.now() > deadline) throw new Error('Cars proof: the garage copy never returned');
      await wait(100);
    }
    await wait(500);
    triggerAction('interact', 'down');
    triggerAction('interact', 'up');
    await wait(500);
    if (!garage.api?.isOpen()) throw new Error('Cars proof: Interact did not open the available garage');
    garage.api.choose('cars', 'four');
    const timer = setInterval(() => window.__debugCam?.clear(), 50);
    await wait(1000);
    console.log(`PLAY CARS ${JSON.stringify(garage.api.snap())}`);
    (window as Window & { __placeDone?: boolean }).__placeDone = true;
    setTimeout(() => clearInterval(timer), 30000);
  })(),
  'first-town Cars proof',
);
export {};

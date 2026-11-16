// npm run look -- --rail-seed cradle-fitted --eval dev/look/evals/railway-works-at.ts --query worksat=turn \
// --action dev/look/evals/garage-rollout.ts --seconds 32 --frames 24 --video
// One fixed overhead camera: real turn press, armed wait, real garage hold, then the wagon's roll-out.
// Placement teleports only the observer; every state change uses the normal Interact action.
const { background } = (await import('/src/async.ts' as string)) as typeof import('../../../src/async.ts');
const { me, cam } = (await import('/src/player/player.ts' as string)) as typeof import('../../../src/player/player.ts');
const { teleport } = (await import(
  '/src/physics/engine.ts' as string
)) as typeof import('../../../src/physics/engine.ts');
const { triggerAction } = (await import(
  '/src/player/controls.ts' as string
)) as typeof import('../../../src/player/controls.ts');
const { interactTarget } = (await import(
  '/src/player/hands.ts' as string
)) as typeof import('../../../src/player/hands.ts');
const { garage } = (await import(
  '/src/entities/railway/garage-state.ts' as string
)) as typeof import('../../../src/entities/railway/garage-state.ts');
const { garageRow, polarAt } = (await import(
  '/src/entities/railway/garage-geo.ts' as string
)) as typeof import('../../../src/entities/railway/garage-geo.ts');
const { bridgeHandle, tableYaws } = (await import(
  '/src/entities/railway/table-bridge.ts' as string
)) as typeof import('../../../src/entities/railway/table-bridge.ts');
const { TABLE } = (await import(
  '/src/place/home-station.ts' as string
)) as typeof import('../../../src/place/home-station.ts');
const { WORKS } = (await import(
  '/src/sim/railway-works-layout.ts' as string
)) as typeof import('../../../src/sim/railway-works-layout.ts');
const { inspectRailway, rw, shed } = (await import(
  '/dev/look/rail-read.ts' as string
)) as typeof import('../rail-read.ts');
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const view = () => inspectRailway()!.worksView!;
const until = async (fn: () => unknown, label: string, ms = 8000) => {
  const end = performance.now() + ms;
  while (!fn()) {
    if (performance.now() > end) throw new Error(`garage rollout: ${label}`);
    await wait(25);
  }
};
const press = () => {
  triggerAction('interact', 'down');
  triggerAction('interact', 'up');
};
const { geo, table } = garageRow();
const road0 = tableYaws()[0];
const handle = bridgeHandle(table, TABLE.r, road0);
const place = (x: number, z: number, target: { x: number; z: number }) => {
  teleport(me.body!, x, 19.2, z);
  me.body!.velocity.set(0, 0, 0);
  cam.yaw = me.yaw = Math.atan2(-(target.x - x), -(target.z - z));
};
place(handle.x - 0.6, handle.z - 0.7, handle);
await until(() => interactTarget()?.id === 'railway-turn', 'turn handle not offered');
const start = performance.now();
const rows: { s: number; yaw: number; k: number | null; wagon: string; onTable: boolean; ready: number }[] = [];
const sample = () => {
  const v = view();
  const row = {
    s: Math.round((performance.now() - start) / 10) / 100,
    yaw: v.garageView.deckYaw ?? v.table.yaw,
    k: v.table.k,
    wagon: v.wagon.at,
    onTable: v.wagon.onTable,
    ready: shed(rw()).ready,
  };
  rows.push(row);
  return row;
};
const mark = (stage: string) => console.log('GARAGE ROLLOUT', stage, JSON.stringify(sample()));
background(
  (async () => {
    const sampler = setInterval(sample, 50);
    try {
      mark('before press');
      await wait(1000);
      press();
      await until(() => shed(rw()).table === 1, 'turn not accepted');
      mark('armed, waiting for upgrade');
      const post = polarAt(table, geo.post),
        stood = polarAt(table, { bearing: geo.post.bearing + 6, r: geo.post.r - 0.2 });
      place(stood.x, stood.z, post);
      await until(() => interactTarget()?.id === 'railway-garage', 'garage post not offered');
      await wait(3000);
      press();
      await until(() => garage.api?.isOpen(), 'garage did not open');
      await wait(600);
      mark('garage open, deck parked');
      triggerAction('interact', 'down');
      await until(() => garage.api!.snap().facts.boilerRev === 1, 'upgrade not accepted');
      triggerAction('interact', 'up');
      mark('installed, shared moment hold');
      await until(() => view().shunter.shown >= shed(rw()).ready - WORKS.rollTicks, 'roll-out did not start');
      const preRoll = rows.slice();
      if (preRoll.some((r) => Math.abs(r.yaw - road0) > 0.005)) throw new Error('deck turned before roll-out');
      mark('roll-out starts on road 0');
      await until(() => (view().table.k ?? 0) >= 0.999, 'loaded turn did not finish', 20000);
      mark('one loaded turn complete');
      const loaded = rows.filter((r) => r.k !== null && r.k > 0.01 && r.k < 0.99);
      if (!loaded.length || loaded.some((r) => !r.onTable)) throw new Error('turn did not carry the wagon');
      if (loaded.some((r, i) => i > 0 && r.k! < loaded[i - 1]!.k!)) throw new Error('loaded turn reversed');
      await until(
        () => view().wagon.at === 'line2' || view().wagon.at === 'train',
        'wagon did not leave the table',
        12000,
      );
      mark('wagon out; normal shunter return follows');
      console.log(
        'GARAGE ROLLOUT proof',
        JSON.stringify({ parkedSamples: preRoll.length, loadedTurnSamples: loaded.length, rows }),
      );
    } finally {
      clearInterval(sampler);
      triggerAction('interact', 'up');
    }
  })(),
  'garage rollout proof',
);
export {};

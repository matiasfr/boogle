// npm run look -- --rail-seed bay-reached --query prefeed=lay --action dev/look/evals/prefeed-frame.ts --warm 2 --hud --size 1200x750 --filmstrip 1 --name prefeed-lay
// The missing-seeds shot uses prefeed=seeds and bell-reached, before the shared pickup.
const R = (await import('/dev/look/rail-read.ts' as string)) as typeof import('../rail-read.ts');
const { railwayCommands } = (await import(
  '/src/entities/railway/state.ts' as string
)) as typeof import('../../../src/entities/railway/state.ts');
const { RAIL_LEGS, RAIL_GATES, legFrame, legRack } = (await import(
  '/src/sim/railway-route.ts' as string
)) as typeof import('../../../src/sim/railway-route.ts');
const { legRow, routeRow } = (await import(
  '/src/sim/railway-queries-route.ts' as string
)) as typeof import('../../../src/sim/railway-queries-route.ts');
const { interactTarget } = (await import(
  '/src/player/hands.ts' as string
)) as typeof import('../../../src/player/hands.ts');
const { me } = (await import('/src/player/player.ts' as string)) as typeof import('../../../src/player/player.ts');
const { teleport } = (await import(
  '/src/physics/engine.ts' as string
)) as typeof import('../../../src/physics/engine.ts');
const mode = new URLSearchParams(location.search).get('prefeed');
const warp = (window as Window & { __warp?: import('../warp.ts').WarpHandle }).__warp;
warp?.go(1);
if (!(await R.railReady())) throw new Error('Railway unavailable');
const adapter = railwayCommands()!;
const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));
async function until(test: () => boolean, label: string) {
  const end = performance.now() + 600000;
  while (!test()) {
    if (performance.now() > end) throw new Error(label);
    await wait(80);
  }
}
async function move(p: { x: number; y: number; z: number }) {
  teleport(me.body!, p.x / 100, p.y / 100 + 0.85, p.z / 100);
  me.body!.velocity.set(0, 0, 0);
  await wait(450);
}
const slot = RAIL_LEGS.findIndex((leg) => leg.id === (mode === 'seeds' ? 'bell-canopy' : 'cave'));
const leg = RAIL_LEGS[slot]!,
  frame = legFrame(leg, 0),
  rack = legRack(leg, 0);
const gate = leg.sections[0]!.gate!;
const row = () => legRow(R.rw(), slot);
if (routeRow(R.rw()).gates & (1 << gate)) throw new Error('Expected shut barrier');
if (mode === 'seeds') {
  await move(RAIL_GATES[gate]!.at);
  await until(() => interactTarget()?.blocked === 'Needs the crystal seeds', 'missing-seeds prompt');
} else {
  await until(() => row().rackLogs === 20 && row().rackRails === 20, 'first cave delivery');
  for (let trip = 0; row().logs !== 20 || row().rails !== 20; trip++) {
    if (trip >= 40) throw new Error('Frame failed to fill');
    await move(rack);
    const logs = row().logs < 20;
    if (!(logs ? adapter.depotTake(slot) : adapter.depotRailTake(slot))) throw new Error('take refused');
    await until(() => adapter.read.pending() === 0 && (logs ? R.railBack().carry : R.railBack().rails) > 0, 'take');
    await move(frame);
    await until(() => interactTarget()?.id === 'railway-leg-feed', 'Feed prompt');
    if (mode === 'carry') break;
    if (!adapter.feedLeg(slot)) throw new Error('feed refused');
    await until(() => adapter.read.pending() === 0 && R.railBack().carry + R.railBack().rails === 0, 'feed');
  }
  if (mode !== 'carry') {
    if (row().start !== -1) throw new Error('Full shut frame started early');
    await until(() => interactTarget()?.id === 'railway-leg-plug', 'Open prompt');
    if (mode === 'lay') {
      let tick = -1;
      const off = adapter.onAccepted((e) => {
        if (e.op === 'rail.gate') tick = e.tick;
      }, 'command');
      try {
        if (!adapter.openGate(gate)) throw new Error('gate refused');
        await until(() => tick >= 0 && row().start >= 0, 'gate receipt and lay');
        if (row().start !== tick) throw new Error(`Leg.start ${row().start} differs from gate tick ${tick}`);
        console.log('PREFEED gate and lay tick', tick);
      } finally {
        off();
      }
    }
  }
}
const x = frame.x / 100,
  y = frame.y / 100,
  z = frame.z / 100;
window.__debugCam!.set([x - 4, y + 2.8, z - 4], [x, y + 1.25, z], 56);
if (warp) {
  warp.pause();
  await warp.step(1);
}
export {};

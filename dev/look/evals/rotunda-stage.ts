// npm run look -- --real --rail-seed works-lit --eval dev/look/evals/rotunda-stage.ts --action dev/look/evals/rotunda-stage.ts --cam 946.9316185957955,21.22,10.307865245501247 --look 942.9693370012909,19.62,20.29887743475664 --fov 65 --warm 1 --seconds 9 --frames 18 --name rh5-rise-garage
// Step 5: real footing commands from works-lit, photographed from the production garage engine camera (15°).
// The garage itself cannot open until wagon-on. This pins its exact landscape pose, without opening its UI.
// Before: the same camera arguments, omit --action and use --name rh5-before-garage.
// The explicit camera arguments are required: look places its camera after the setup eval.
const { railReady, rw, shed, account, railPid, inspectRailway } = (await import(
  '/dev/look/rail-read.ts' as string
)) as typeof import('../rail-read.ts');
const { railwayCommands } = (await import(
  '/src/entities/railway/state.ts' as string
)) as typeof import('../../../src/entities/railway/state.ts');
const { me } = (await import('/src/player/player.ts' as string)) as typeof import('../../../src/player/player.ts');
const { teleport } = (await import(
  '/src/physics/engine.ts' as string
)) as typeof import('../../../src/physics/engine.ts');
const { WORKS_RACK, SHED_STALL } = (await import(
  '/src/sim/railway-works-layout.ts' as string
)) as typeof import('../../../src/sim/railway-works-layout.ts');
const { garageRow } = (await import(
  '/src/entities/railway/garage-geo.ts' as string
)) as typeof import('../../../src/entities/railway/garage-geo.ts');
const { ENGINE } = (await import(
  '/src/entities/railway/engine.ts' as string
)) as typeof import('../../../src/entities/railway/engine.ts');
const { TRAILER, TRAIN_OFFSETS } = (await import(
  '/src/entities/railway/cars.ts' as string
)) as typeof import('../../../src/entities/railway/cars.ts');
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const until = async (fn: () => boolean, what: string) => {
  const end = performance.now() + 30000;
  while (!fn()) {
    if (performance.now() > end) throw new Error(`rotunda capture: ${what}`);
    await wait(50);
  }
};
const shot = window as Window & { __rotundaPrepared?: boolean };
if (!(await railReady()) || !me.body) throw new Error('rotunda capture: not ready');
const commands = railwayCommands()!;
if (shot.__rotundaPrepared) {
  if (shed(rw()).stall !== 1 || !account(rw(), railPid())?.foot)
    throw new Error('rotunda capture: footing not prepared');
  if (!commands.setFooting(0)) throw new Error('rotunda capture: set was not submitted');
  let samples = 0;
  const timer = setInterval(() => {
    console.log('ROTUNDA rise', JSON.stringify(inspectRailway()?.worksView?.rotunda));
    if (++samples >= 18) clearInterval(timer);
  }, 500);
} else {
  const move = async (p: { x: number; y: number; z: number }) => {
    teleport(me.body!, p.x / 100, p.y / 100 + 0.8, p.z / 100);
    await wait(700); // let the server receive this pose before its reach check
  };
  for (let k = 0; k < 2; k++) {
    await move(WORKS_RACK);
    if (!commands.shoulderFooting(0)) throw new Error('rotunda capture: take was not submitted');
    await until(() => !!account(rw(), railPid())?.foot && !commands.read.pending(), 'take not accepted');
    await move(SHED_STALL);
    if (k === 0) {
      if (!commands.setFooting(0)) throw new Error('rotunda capture: first set not submitted');
      await until(() => shed(rw()).stall === 1 && !commands.read.pending(), 'first set not accepted');
    }
  }
  const { table, geo, y: tableY } = garageRow();
  const shift = (TRAIN_OFFSETS[0]! + ENGINE.hz - TRAILER.hz) / 2;
  const yaw = Math.PI - (geo.camBearing * Math.PI) / 180 - Math.atan2(7.2, 8 - shift);
  const point = (x: number, y: number, z: number): [number, number, number] => [
    table.x + Math.cos(yaw) * x + Math.sin(yaw) * (z - shift),
    tableY + 0.02 + y,
    table.z - Math.sin(yaw) * x + Math.cos(yaw) * (z - shift),
  ];
  const position = point(7.2, 2.7, 8),
    aim = point(-0.4, 1.1, 0.4);
  window.__debugCam!.set(position, aim, 65);
  console.log('ROTUNDA garage camera', JSON.stringify({ bearing: geo.camBearing, position, aim }));
  console.log('ROTUNDA before', JSON.stringify(inspectRailway()?.worksView?.rotunda));
  shot.__rotundaPrepared = true;
}
export {};

// npm run look -- --real --rail-seed q4-done --warm 0 --action dev/look/evals/depot-arrival.ts --query depotShot=unload --video --frames 16 --seconds 5 --name c2-unload-full
// C2: the real depot boards from the approach, and an accepted cart delivery. No fabricated shared state.
// Boards: look --rail-seed q5-shelved --action dev/look/evals/depot-arrival.ts --query depotShot=logs|rails
// Unload: take the seed's inherited logs before Q5's first shipment, then observe that shipment at real speed.
const R = (await import('/dev/look/rail-read.ts' as string)) as typeof import('../rail-read.ts');
const { me } = (await import('/src/player/player.ts' as string)) as typeof import('../../../src/player/player.ts');
const { teleport } = (await import(
  '/src/physics/engine.ts' as string
)) as typeof import('../../../src/physics/engine.ts');
const { cartEnd, CART_PHASE } = (await import(
  '/src/sim/railway-cart.ts' as string
)) as typeof import('../../../src/sim/railway-cart.ts');
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
if (!(await R.railReady()) || !me.body) throw new Error('Depot look requires a ready Q5 seed');
const view = () => R.inspectRailway()!.line2View;
const d = view().depot!;
const s = view().shelf!;
const f = view().frames[4]!;
const length = Math.hypot(f.x - d[0]!, f.z - d[2]!);
const ux = (f.x - d[0]!) / length,
  uz = (f.z - d[2]!) / length;
const mode = new URLSearchParams(location.search).get('depotShot') ?? 'logs';
const target = mode === 'rails' ? [s.x, s.y, s.z] : d;
// Stand on the approach side of the racks; both boards face this path. The unload view also includes the road.
teleport(me.body, d[0]! - ux * 4, d[1]! + 0.6, d[2]! - uz * 4);
me.body.velocity.set(0, 0, 0);
window.__debugCam!.set(
  [target[0]! - ux * 7, target[1]! + 3.2, target[2]! - uz * 7],
  [target[0]!, target[1]! + 1, target[2]!],
  mode === 'unload' ? 65 : 55,
);
if (mode === 'unload') {
  const { railwayCommands } = (await import(
    '/src/entities/railway/state.ts' as string
  )) as typeof import('../../../src/entities/railway/state.ts');
  const { H } = (await import('/src/place/land.ts' as string)) as typeof import('../../../src/place/land.ts');
  const commands = railwayCommands()!;
  const until = async (fn: () => boolean, ms: number, what: string) => {
    const deadline = performance.now() + ms;
    while (!fn()) {
      if (performance.now() > deadline) throw new Error(what + ': ' + JSON.stringify(view().cart));
      await wait(20);
    }
  };
  // q4-done inherits unused Q2 timber (Q5 has produced nothing yet). Take it out of the depot with real
  // commands so Q5 requests both materials together. Put it behind the shot, without funding the frame.
  for (const kind of [0, 2] as const) {
    const stock = () => (kind === 0 ? R.rail(R.rw()).depot : R.rail(R.rw()).depotRails);
    const point = kind === 0 ? d : [s.x, s.y, s.z];
    while (stock() > 0) {
      teleport(me.body, point[0]!, point[1]! + 0.6, point[2]!);
      await wait(400);
      const before = stock();
      if (kind === 0) commands.depotTake();
      else commands.depotRailTake();
      await until(() => stock() < before && R.railRead()!.pending() === 0, 5000, 'Pickup not accepted');
      const x = d[0]! - ux * 30,
        z = d[2]! - uz * 30,
        y = H(x, z);
      teleport(me.body, x, y + 0.6, z);
      await wait(400);
      const count = kind === 0 ? R.railBack().carry : R.railBack().rails;
      commands.drop(Math.round(x * 100), Math.round(y * 100), Math.round(z * 100), count, kind);
      await until(
        () => R.railRead()!.pending() === 0 && R.railBack().carry + R.railBack().rails === 0,
        5000,
        'Drop not accepted',
      );
    }
  }
  teleport(me.body, d[0]! - ux * 4, d[1]! + 0.6, d[2]! - uz * 4);
  // The cart's road runs about 8 m beside Q5's racks: include its stopped load as well as both receivers.
  window.__debugCam!.set([d[0]! - 12, d[1]! + 7, d[2]! + 18], [d[0]!, d[1]! + 1.3, d[2]! + 3], 65);
  await until(
    () => {
      const c = R.cart(R.rw());
      return c.phase === CART_PHASE.RUN && c.logs === 24 && c.rails === 24 && cartEnd(c) - R.railRead()!.tickNow() < 15;
    },
    180_000,
    'Full shipment did not approach',
  );
  console.log('DEPOT FULL ' + JSON.stringify(view().cart));
  let sample = 0;
  const timer = setInterval(() => {
    const v = view();
    console.log('DEPOT UNLOAD ' + JSON.stringify({ sample, cart: v.cart, logs: v.depotShown, rails: v.shelf?.shown }));
    if (++sample >= 30) clearInterval(timer);
  }, 200);
} else {
  await wait(500);
  console.log('DEPOT BOARD ' + JSON.stringify({ mode, depot: view().depot, shelf: view().shelf }));
}
export {};

// npm run look -- --real --rail-seed bay-mid --eval dev/look/evals/garage-trade-receipt.ts --name garage-trade-receipt
// Exercise the garage's accepted-event listener with a real bay Strong fit before the trade screen ships.
const { railwayCommands } = await import('/src/entities/railway/state.ts' as string);
const { me } = await import('/src/player/player.ts' as string);
const { teleport } = await import('/src/physics/engine.ts' as string);
const { RING_STEEL_YARD, RING_STEEL_WORKS } = await import('/src/sim/railway-ring-layout.ts' as string);
const { SHED_TABLE, BRING_TICKS } = await import('/src/sim/railway-works-layout.ts' as string);
const { ROW_LINE } = await import('/src/sim/railway-route.ts' as string);
const { account, steel, shed, line } = await import('/src/sim/railway-rows.ts' as string);
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
async function until(ok: () => boolean, what: string, ms = 15000) {
  const end = performance.now() + ms;
  while (!ok()) {
    if (performance.now() >= end) throw new Error(what);
    await wait(50);
  }
}
await until(() => !!me.body && railwayCommands()?.read.ready(), 'garage trade session');
const adapter = railwayCommands();
const world = () => adapter.read.world();
function stand(site: { x: number; y: number; z: number }) {
  teleport(me.body, site.x / 100, site.y / 100 + 0.5, site.z / 100);
  me.body.velocity.set(0, 0, 0);
}
for (const kind of [0, 1]) {
  const balance = () => (kind ? account(world(), adapter.read.pid).rails : account(world(), adapter.read.pid).carry);
  while (kind ? steel(world()).yardRails : steel(world()).yardLogs) {
    stand(RING_STEEL_YARD);
    adapter.steelTake(kind);
    await until(() => !adapter.read.pending() && balance() > 0, 'take steel kit');
    stand(RING_STEEL_WORKS);
    adapter.feedSteel();
    await until(() => !adapter.read.pending() && balance() === 0, 'feed steel kit');
  }
}
await until(() => shed(world()).steel > 0, 'steel landed', 650000);
stand(SHED_TABLE);
adapter.bringLine(ROW_LINE.bay, shed(world()).bringRev);
await until(() => shed(world()).tableLine === ROW_LINE.bay, 'bay copy on the table');
await until(() => adapter.read.tick() >= shed(world()).brought + BRING_TICKS + 1, 'bring hold elapsed');
stand(SHED_TABLE);
let seen = false;
let handlerError: Error | undefined;
const logError = console.error;
console.error = (...args: unknown[]) => {
  logError(...args);
  if (args[0] === '[ws-room] handler threw' && args[1] instanceof Error) handlerError = args[1];
};
const off = adapter.onAccepted((event: { op: string; part?: number }) => {
  if (event.op === 'rail.install' && event.part === 6) seen = true;
});
try {
  adapter.installPart(ROW_LINE.bay, 6, line(world(), ROW_LINE.bay).rev);
  await until(() => {
    if (handlerError) throw handlerError;
    return seen && line(world(), ROW_LINE.bay).boiler === 5;
  }, 'garage handled the accepted Strong fit');
} finally {
  console.error = logError;
  off();
}
export {};

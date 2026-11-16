// driven by: npm run session -- start --rail-seed awake --eval dev/look/evals/grant-c5-pile.ts --size 960x600
// Then: npm run session -- step 0.1; npm run session -- still c5-pile-framed; npm run session -- stop
// Real accepted chop/drop; teleports isolate the stock prompt, not route reachability.
const { me } = await import('/src/player/player.ts' as string);
const { teleport } = await import('/src/physics/engine.ts' as string);
const { railwayCommands, inspectRailway } = await import('/src/entities/railway/state.ts' as string);
const { account, piles } = await import('/src/sim/railway-rows.ts' as string);
const { H } = await import('/src/place/terrain.ts' as string);
const { fallArrival } = await import('/src/fall/arrival.ts' as string);
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
async function until(fn: () => unknown) {
  const deadline = performance.now() + 30000;
  while (!fn()) {
    if (performance.now() > deadline) throw new Error('C5 pile setup timed out');
    await wait(50);
  }
}
await until(() => railwayCommands()?.read.ready() && me.body && !fallArrival.active);
const adapter = railwayCommands()!;
const world = () => adapter.read.world();
const tree = inspectRailway().trees.find((t: { remaining: number; cleared: boolean }) => t.remaining > 0 && !t.cleared);
if (!tree) throw new Error('No tree for pile proof');
teleport(me.body!, tree.x + 2, H(tree.x + 2, tree.z) + 0.5, tree.z);
await wait(500);
if (!adapter.chop(tree.id, 0, false)) throw new Error('Chop was not queued');
await until(() => adapter.read.pending() === 0 && account(world(), adapter.read.pid).carry > 0);
await wait(800);
const x = tree.x + 5,
  z = tree.z + 4,
  y = H(x, z);
teleport(me.body!, x, y + 0.5, z);
await wait(400);
if (!adapter.drop(Math.round(x * 100), Math.round(y * 100), Math.round(z * 100), 2, 0))
  throw new Error('Drop was not queued');
await until(() => adapter.read.pending() === 0 && piles(world()).length > 0);
await wait(800);
const pile = piles(world()).find((p: { kind: number }) => p.kind === 0)!;
teleport(me.body!, x + 1.2, H(x + 1.2, z) + 0.5, z);
await wait(400);
window.__debugCam!.set([x + 4, y + 3.5, z + 6], [x, y + 0.6, z], 45);
await wait(300);
const note = document.querySelector('.prompt-note')?.textContent;
if (note !== `${pile.n} logs`) throw new Error(`Wrong pile note: ${note}`);
console.log(`C5 accepted pile ${pile.n} logs, prompt ${note}`);
export {};

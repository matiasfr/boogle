// npm run look -- --real --query 'proto=place&t.railway.boilerHelpSpeed=2000' --rail-seed boiler --action dev/look/evals/cart-wake.ts --warm 0 --video --seconds 34 --hud --name r1a-forced-stable
// Forced fast fit: observe the cold engine while the depot cart returns, without changing shared state.
const R = (await import('/dev/look/rail-read.ts' as string)) as typeof import('../rail-read.ts');
const { me } = (await import('/src/player/player.ts' as string)) as typeof import('../../../src/player/player.ts');
const { teleport } = (await import(
  '/src/physics/engine.ts' as string
)) as typeof import('../../../src/physics/engine.ts');
const { makeBot } = (await import('/dev/look/bot.ts' as string)) as typeof import('../bot.ts');
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
for (let i = 0; !R.railRead()?.ready() || !me.body; i++) {
  if (i > 600) throw new Error('CART WAKE railway did not mount');
  await wait(100);
}
const bot = makeBot({ doneFlag: '__cartWakeDone' });
const b = R.boiler(R.rw());
teleport(me.body!, b.x / 100 + 2, b.y / 100 + 1, b.z / 100);
await wait(300);
if (!(await bot.use(b.x / 100, b.z / 100, 'take boiler', /^Pick up$/))) throw new Error('CART WAKE no take');
await wait(400);
const s = R.inspectRailway()!.line2View.boiler!.saddle;
teleport(me.body!, s.x + 2, s.y + 1, s.z);
await wait(300);
window.__debugCam!.set([s.x + 10, s.y + 7, s.z - 16], [s.x, s.y, s.z], 60);
if (!(await bot.use(s.x, s.z, 'fit boiler', /^Fit the boiler$/))) throw new Error('CART WAKE no fit');
await wait(600);
if (R.boiler(R.rw()).state !== 'fitted' || R.line2Trains(R.rw())) throw new Error('CART WAKE missed cold fit');
console.log('CART WAKE cold', JSON.stringify({ tick: R.railAt(), cart: R.cart(R.rw()), boiler: R.boiler(R.rw()) }));
const fitAt = performance.now();
const edge = setInterval(() => {
  if (!R.line2Trains(R.rw())) return;
  console.log(
    'CART WAKE edge',
    JSON.stringify({
      msSinceCold: performance.now() - fitAt,
      tick: R.railAt(),
      cart: R.cart(R.rw()),
      trains: R.rail(R.rw()).trains,
    }),
  );
  clearInterval(edge);
}, 10);
export {};

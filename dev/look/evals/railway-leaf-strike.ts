// R4d proof action (docs/plans/ring-island-build1.md, step 4d), the strike after dev/look/evals/railway-leaf-coop.ts on
// player 1's page (`--rail-seed leaf-raised`): hang the fourth footing (the leaf comes down), walk to the rivet at
// u 259.5 on the joint's deck, say what the game offers there (the breaker is a room-wide rung the seed has already
// taken), and press Interact. Logs STRIKE lines with the offered verb and the Aperture; `strikedo=none` stops short of
// the press. Staging teleports only.
const { makeBot } = (await import('/dev/look/bot.ts' as string)) as typeof import('../bot.ts');
const { me, cam } = (await import('/src/player/player.ts' as string)) as typeof import('../../../src/player/player.ts');
const { interactTarget } = (await import(
  '/src/player/hands.ts' as string
)) as typeof import('../../../src/player/hands.ts');
const { teleport } = (await import(
  '/src/physics/engine.ts' as string
)) as typeof import('../../../src/physics/engine.ts');
const { aperture, works, rw } = (await import('/dev/look/rail-read.ts' as string)) as typeof import('../rail-read.ts');
const layout = (await import(
  '/src/sim/railway-ring-layout.ts' as string
)) as typeof import('../../../src/sim/railway-ring-layout.ts');
const bot = makeBot();
const head = layout.RING_HEAD[7]!;
const say = (text: string) => console.log(`STRIKE ${text}`);
const offered = () => interactTarget()?.verb ?? 'nothing';
const state = () => JSON.stringify({ ring: aperture(rw()), breaker: works(rw()).breaker });
if (!(await bot.use(head.jib.x / 100, head.jib.z / 100, 'hang the weight', /Hang the weight/)))
  throw new Error('no set 4');
const end = performance.now() + 15000;
while (aperture(rw()).brace !== 0) {
  if (performance.now() > end) throw new Error(`the leaf never came down ${state()}`);
  await bot.wait(100);
}
say(`leaf down ${state()}`);
/** Stand at (u, lat) cm on the joint's deck, facing along the line toward the island. */
function standAt(u: number, lat: number) {
  const p = layout.ringAt(u, lat);
  teleport(me.body!, p.x / 100, layout.ringDeckY(u) / 100 + 0.85, p.z / 100);
  me.body!.velocity.set(0, 0, 0);
  const q = layout.ringAt(u + 1000, lat);
  cam.yaw = me.yaw = Math.atan2(-(q.x - p.x), -(q.z - p.z));
}
// Short of reach first (nothing offered), then at the rivet.
standAt(25950 - 1500, layout.RING_FORMATION.mid);
await bot.wait(600);
say(`15 m short of the rivet offers: ${offered()}`);
standAt(25950, layout.RING_FORMATION.mid);
await bot.wait(600);
say(`at u 259.5 offers: ${offered()} (breaker ${works(rw()).breaker})`);
if (new URLSearchParams(location.search).get('strikedo') !== 'none') {
  if (!/Strike the rivet/.test(offered())) throw new Error(`no rivet prompt: ${offered()}`);
  (window as unknown as { __struckAt?: number }).__struckAt = Date.now();
  if (!(await bot.use(layout.RING_RIVET.x / 100, layout.RING_RIVET.z / 100, 'strike the rivet', /Strike the rivet/)))
    throw new Error('the strike was not pressed');
  say(`struck ${state()}`);
}
export {};

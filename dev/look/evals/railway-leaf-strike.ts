// npm run look -- --players 2 --rail-seed leaf-raised --eval dev/look/evals/railway-leaf-coop.ts --action dev/look/evals/railway-leaf-strike.ts --seconds 3 --frames 8
//  (strikedo=none stops short of the press)
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
const { inspectRailway } = (await import(
  '/src/entities/railway/state.ts' as string
)) as typeof import('../../../src/entities/railway/state.ts');
const bot = makeBot();
const leafView = () =>
  (inspectRailway()?.worksView as { leafView?: { deg: number; moving: boolean } } | null)?.leafView;
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
say(`brace is 0 ${state()} leaf ${JSON.stringify(leafView())}`);
// The sim's brace flips as the swing starts; the rivet is offered only once the plate has visibly landed.
const standing = layout.ringAt(25950, layout.RING_FORMATION.mid);
teleport(me.body!, standing.x / 100, layout.ringDeckY(25950) / 100 + 0.85, standing.z / 100);
await bot.wait(300);
say(`mid-swing at the rivet offers: ${offered()} (expect nothing) leaf ${JSON.stringify(leafView())}`);
const landing = performance.now() + 8000;
while (leafView()?.deg !== 0 || leafView()?.moving) {
  if (performance.now() > landing) throw new Error(`the leaf never landed ${JSON.stringify(leafView())}`);
  await bot.wait(100);
}
say(`leaf landed ${JSON.stringify(leafView())}`);
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
standAt(25950 - Number(new URLSearchParams(location.search).get('strikeback') ?? 0), layout.RING_FORMATION.mid);
await bot.wait(600);
say(`at u 259.5 offers: ${offered()} (breaker ${works(rw()).breaker})`);
// Let the glint show for a while at the rivet before the press (the follow camera is about 6 m back).
await bot.wait(2500);
if (new URLSearchParams(location.search).get('strikedo') !== 'none') {
  if (!/Strike the rivet/.test(offered())) throw new Error(`no rivet prompt: ${offered()}`);
  (window as unknown as { __struckAt?: number }).__struckAt = Date.now();
  if (!(await bot.use(layout.RING_RIVET.x / 100, layout.RING_RIVET.z / 100, 'strike the rivet', /Strike the rivet/)))
    throw new Error('the strike was not pressed');
  say(`struck ${state()}`);
}
export {};

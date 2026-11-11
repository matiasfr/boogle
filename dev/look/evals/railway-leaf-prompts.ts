// The leaf's two prompts in view (owner's labels, 11 November), `look --players 2 --hud --rail-seed leaf-raised`:
// player 1 shoulders a footing and stands at the railhead jib ("Hang the weight"), player 2 stands at the gold strut
// ("Knock out the pawl"); neither presses. `touchui=1` puts the page in the touch layout (body.touch: the verb on the
// round button) for a phone-width check. Staging teleports only.
const { makeBot } = (await import('/dev/look/bot.ts' as string)) as typeof import('../bot.ts');
const { me, cam } = (await import('/src/player/player.ts' as string)) as typeof import('../../../src/player/player.ts');
const { interactTarget } = (await import(
  '/src/player/hands.ts' as string
)) as typeof import('../../../src/player/hands.ts');
const { teleport } = (await import(
  '/src/physics/engine.ts' as string
)) as typeof import('../../../src/physics/engine.ts');
const layout = (await import(
  '/src/sim/railway-ring-layout.ts' as string
)) as typeof import('../../../src/sim/railway-ring-layout.ts');
const q = new URLSearchParams(location.search);
const player = q.get('player') ?? '1';
if (q.get('touchui') === '1') document.body.classList.add('touch');
const bot = makeBot();
const head = layout.RING_HEAD[7]!;
const say = (text: string) => console.log(`PROMPT ${text}`);
/** Set down at (u, lat) on a deck whose top is `y` m, facing the point (x, z) in metres. */
function stand(u: number, lat: number, y: number, face: { x: number; z: number }) {
  const p = layout.ringAt(Math.round(u * 100), Math.round(lat * 100));
  teleport(me.body!, p.x / 100, y + 0.85, p.z / 100);
  me.body!.velocity.set(0, 0, 0);
  cam.yaw = me.yaw = Math.atan2(-(face.x / 100 - p.x / 100), -(face.z / 100 - p.z / 100));
}
async function offered(verb: RegExp) {
  for (let k = 0; k < 80; k++) {
    if (verb.test(interactTarget()?.verb ?? '')) return say(`player ${player} offered "${interactTarget()!.verb}"`);
    await bot.wait(100);
  }
  throw new Error(`player ${player}: not offered ${verb}; offered ${interactTarget()?.verb ?? 'nothing'}`);
}
if (player === '2') {
  stand(287.2, 3.4, layout.RING_BRACE.y / 100, layout.RING_BRACE);
  await offered(/^Knock out the pawl$/);
} else {
  stand(238.5, 4.8, head.rack.y / 100, head.rack);
  await bot.wait(400);
  if (!(await bot.use(head.rack.x / 100, head.rack.z / 100, 'shoulder a footing', /Shoulder a footing/)))
    throw new Error('no footing');
  await bot.wait(800);
  stand(255.5, 3.6, head.jib.y / 100, head.jib);
  await offered(/^Hang the weight$/);
}
export {};

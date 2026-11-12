// npm run look -- --rail-seed steel-kit --hud --eval dev/look/evals/railway-steel-prompts.ts --query steelstep=take --name steel-take
//  (steelstep=feed goes on to feed the logs and ends at the doorway with an empty back, the prompt blocked again;
//   steelstep=light goes on to take the rails and feed them, and ends with the works lit and no prompt)
// The steel works' three prompts, pressed (docs/plans/ring-island-build2.md, V1): at the doorway with an empty back
// "Feed the works" is offered blocked with "Bring logs or rails"; at the yard "Take logs" is pressed and the back holds
// logs while the yard's count falls; at the doorway "Feed the works" is pressed and the bill's logs rise; the same for
// rails. Every count is read again after the server has confirmed (nothing pending). Staging teleports only; each press
// is the interact button's. Throws on a prompt that is not offered or an op that changes nothing.
const { interactDown, interactTarget, interactUp } = (await import(
  '/src/player/hands.ts' as string
)) as typeof import('../../../src/player/hands.ts');
const { me, cam } = (await import('/src/player/player.ts' as string)) as typeof import('../../../src/player/player.ts');
const { teleport } = (await import(
  '/src/physics/engine.ts' as string
)) as typeof import('../../../src/physics/engine.ts');
const layout = (await import(
  '/src/sim/railway-ring-layout.ts' as string
)) as typeof import('../../../src/sim/railway-ring-layout.ts');
const { account, inspectRailway, railPid, railRead, railReady, rw, steel } = (await import(
  '/dev/look/rail-read.ts' as string
)) as typeof import('../rail-read.ts');

const step = new URLSearchParams(location.search).get('steelstep') ?? 'take';
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const say = (text: string) => console.log(`STEEL ${text}`);
const Y = layout.RING_STEEL_WORKS.y / 100;
/** Set down at (u, lat) metres on the yard's deck, facing (fu, flat). */
function stand(u: number, lat: number, fu: number, flat: number) {
  const p = layout.ringAt(Math.round(u * 100), Math.round(lat * 100)),
    f = layout.ringAt(Math.round(fu * 100), Math.round(flat * 100));
  teleport(me.body!, p.x / 100, Y + 0.85, p.z / 100);
  me.body!.velocity.set(0, 0, 0);
  cam.yaw = me.yaw = Math.atan2(-(f.x - p.x), -(f.z - p.z));
}
const facts = () => {
  const s = steel(rw()),
    a = account(rw(), railPid());
  return {
    yardLogs: s.yardLogs,
    yardRails: s.yardRails,
    logs: s.logs,
    rails: s.rails,
    lit: s.lit,
    backLogs: a?.carry ?? 0,
    backRails: a?.rails ?? 0,
    sign: inspectRailway()?.worksView?.steelView.sign ?? null,
  };
};
async function offered(id: string) {
  for (let k = 0; k < 80; k++) {
    if (interactTarget()?.id === id) return interactTarget()!;
    await wait(100);
  }
  throw new Error(`steel prompts: ${id} not offered; offered ${interactTarget()?.id ?? 'nothing'}`);
}
/** Presses the interact button on the offered prompt, then waits for the server to confirm it. */
async function press(id: string, verb: string) {
  const t = await offered(id);
  if (t.verb !== verb || !t.run || t.blocked)
    throw new Error(`steel prompts: ${id} is "${t.verb}"${t.blocked ? `, blocked "${t.blocked}"` : ''}`);
  interactDown();
  interactUp();
  await wait(300);
  for (let k = 0; k < 100 && railRead()!.pending() > 0; k++) await wait(100);
  if (railRead()!.pending() > 0) throw new Error(`steel prompts: ${id} never confirmed`);
  await wait(300);
}
const atYard = (to: 'logs' | 'rails') => stand(445.6, 6.6, to === 'logs' ? 444.75 : 446.6, 8.3);
const atDoor = () => stand(452, 5.4, 452, 6.5);

if (!(await railReady(30_000))) throw new Error('steel prompts: the railway never became ready');
const start = facts();
say(`start ${JSON.stringify(start)}`);
if (start.backLogs || start.backRails) throw new Error('steel prompts: the back is not empty at the start');

// An empty back at the doorway: blocked, with its reason.
atDoor();
const empty = await offered('railway-steel-feed');
say(`empty back: "${empty.verb}" blocked "${empty.blocked ?? ''}" run ${!!empty.run}`);
if (empty.verb !== 'Feed the works' || empty.blocked !== 'Bring logs or rails' || empty.run)
  throw new Error('steel prompts: the empty-back feed is not blocked with its reason');

// Take logs.
atYard('logs');
await press('railway-steel-take-logs', 'Take logs');
const took = facts();
say(`after Take logs ${JSON.stringify(took)}`);
if (took.backLogs <= 0 || took.yardLogs !== start.yardLogs - took.backLogs)
  throw new Error('steel prompts: Take logs moved nothing from the yard to the back');

if (step !== 'take') {
  atDoor();
  await press('railway-steel-feed', 'Feed the works');
  const fed = facts();
  say(`after Feed the works (logs) ${JSON.stringify(fed)}`);
  if (fed.logs !== took.logs + took.backLogs || fed.backLogs !== 0)
    throw new Error('steel prompts: Feed the works did not move the logs into the bill');
  const again = await offered('railway-steel-feed');
  say(`empty back again: blocked "${again.blocked ?? ''}"`);
}
if (step === 'light') {
  const fed = facts();
  atYard('rails');
  await press('railway-steel-take-rails', 'Take rails');
  const rails = facts();
  say(`after Take rails ${JSON.stringify(rails)}`);
  if (rails.backRails <= 0 || rails.yardRails !== fed.yardRails - rails.backRails)
    throw new Error('steel prompts: Take rails moved nothing from the yard to the back');
  atDoor();
  await press('railway-steel-feed', 'Feed the works');
  const end = facts();
  say(`after Feed the works (rails) ${JSON.stringify(end)}`);
  if (end.rails !== rails.rails + rails.backRails || end.backRails !== 0)
    throw new Error('steel prompts: Feed the works did not move the rails into the bill');
  await wait(1500);
  if (end.lit < 0 || interactTarget()?.id === 'railway-steel-feed')
    throw new Error('steel prompts: a full bill did not light the works, or the feed is still offered');
}
if (step === 'take') atYard('rails');
export {};

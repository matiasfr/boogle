// npm run look -- --real --size 1440x900 --rail-seed steel-home --hud --eval dev/look/evals/garage-key.ts \
//   --until window.__gkReady --action dev/look/evals/garage-key-act.ts --video --seconds 18 --name garage-key
// The garage on the keyboard (docs/plans/garage-install-moment.md, checkpoint run of 18 November, "E on the
// keyboard"): stands by the post at the Roundhouse, as railway-install.ts does, and waits until the garage is offered.
// The action presses keyboard events only, never triggerAction: every press below goes through the window's key
// listeners as a player's E does. Staging is one teleport.
const { interactTarget } = (await import(
  '/src/player/hands.ts' as string
)) as typeof import('../../../src/player/hands.ts');
const { me, cam } = (await import('/src/player/player.ts' as string)) as typeof import('../../../src/player/player.ts');
const { teleport } = (await import(
  '/src/physics/engine.ts' as string
)) as typeof import('../../../src/physics/engine.ts');
const { railReady } = (await import('/dev/look/rail-read.ts' as string)) as typeof import('../rail-read.ts');
const { garageRow, polarAt } = (await import(
  '/src/entities/railway/garage-geo.ts' as string
)) as typeof import('../../../src/entities/railway/garage-geo.ts');

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const ready = window as Window & { __gkReady?: boolean };
if (!(await railReady(30_000))) throw new Error('garage-key: the railway never became ready');
void (async () => {
  const { geo, table: centre, y: groundY } = garageRow();
  const stood = polarAt(centre, { bearing: geo.post.bearing + 6, r: geo.post.r - 0.2 });
  teleport(me.body!, stood.x, groundY + 0.7, stood.z);
  me.body!.velocity.set(0, 0, 0);
  cam.yaw = me.yaw = Math.atan2(centre.x - stood.x, centre.z - stood.z);
  await wait(1500);
  window.__debugCam?.clear();
  await wait(14000); // the room's ability flourishes play out first (railway-install.ts)
  for (let k = 0; k < 80 && interactTarget()?.id !== 'railway-garage'; k++) await wait(100);
  const t = interactTarget();
  console.log(`GKEY offered ${JSON.stringify({ id: t?.id, verb: t?.verb, blocked: t?.blocked ?? null })}`);
  ready.__gkReady = true;
})();
export {};

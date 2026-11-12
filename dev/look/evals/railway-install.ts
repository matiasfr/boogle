// npm run look -- --rail-seed steel-home --hud --eval dev/look/evals/railway-install.ts --until window.__installDone --name v3-install-prompt
//  (--query installstep=hold holds the prompt through and ends when the server's install shows in the rows;
//   --query installstep=adopt goes on to wait for a line 2 train standing at the Village with the longer boiler)
// The longer boiler's install at the Roundhouse table (docs/plans/ring-island-build2.md, V3): stands by the post east
// of the table, checks "Install the longer boiler" is offered, holds the interact action until the hold completes, and
// reads Line.boiler and Line.fitted after the server confirms. A tap is tried first and must install nothing. Staging
// is one teleport; the press is the interact action's own down and up. Returns at once and works on (look.ts warps
// while the eval runs and sets its camera after it), so the stills show the page as the step left it.
const { interactTarget } = (await import(
  '/src/player/hands.ts' as string
)) as typeof import('../../../src/player/hands.ts');
const { triggerAction } = (await import(
  '/src/player/controls.ts' as string
)) as typeof import('../../../src/player/controls.ts');
const { me, cam } = (await import('/src/player/player.ts' as string)) as typeof import('../../../src/player/player.ts');
const { teleport } = (await import(
  '/src/physics/engine.ts' as string
)) as typeof import('../../../src/physics/engine.ts');
const { inspectRailway, line, railAt, railRead, railReady, rw, shed, train } = (await import(
  '/dev/look/rail-read.ts' as string
)) as typeof import('../rail-read.ts');
const { LINE2 } = (await import(
  '/src/sim/railway-lines.ts' as string
)) as typeof import('../../../src/sim/railway-lines.ts');
const { LINE_SLOTS } = (await import(
  '/src/sim/railway-trains.ts' as string
)) as typeof import('../../../src/sim/railway-trains.ts');
const { TRAIN_PHASE } = (await import(
  '/src/sim/railway-train.ts' as string
)) as typeof import('../../../src/sim/railway-train.ts');
const { SHED_TABLE } = (await import(
  '/src/sim/railway-works-layout.ts' as string
)) as typeof import('../../../src/sim/railway-works-layout.ts');

const step = new URLSearchParams(location.search).get('installstep') ?? 'prompt';
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const say = (text: string) => console.log(`INSTALL ${text}`);
const done = window as Window & { __installDone?: boolean };
const ID = 'railway-install';
const facts = () => {
  const l = line(rw(), LINE2);
  return {
    steel: shed(rw()).steel,
    boiler: l.boiler,
    fitted: l.fitted,
    trains: LINE_SLOTS[LINE2]!.map((slot) => train(rw(), slot).boiler),
    view: inspectRailway()?.worksView?.installView ?? null,
  };
};
async function offered() {
  for (let k = 0; k < 80; k++) {
    if (interactTarget()?.id === ID) return interactTarget()!;
    await wait(100);
  }
  throw new Error(`install: ${ID} not offered; offered ${interactTarget()?.id ?? 'nothing'}`);
}

if (!(await railReady(30_000))) throw new Error('install: the railway never became ready');
void (async () => {
  // 4.6 m east and 2.2 m south of the table's centre, facing a little west of north so the post and the pallet show to the right of the player.
  const x = SHED_TABLE.x / 100 + 4.6,
    z = SHED_TABLE.z / 100 + 2.2;
  teleport(me.body!, x, SHED_TABLE.y / 100 + 0.7, z);
  me.body!.velocity.set(0, 0, 0);
  cam.yaw = me.yaw = Math.atan2(1.2, 4.2);
  await wait(1500);
  // look.ts set its default view when this script returned: hand the camera back to the game's own.
  window.__debugCam?.clear();
  const start = facts();
  say(`start ${JSON.stringify(start)}`);
  const t = await offered();
  say(`offered "${t.verb}" blocked "${t.blocked ?? ''}" run ${!!t.run}`);
  if (t.verb !== 'Install the longer boiler' || t.blocked || !t.run)
    throw new Error('install: the prompt is not offered ready');
  if (step !== 'prompt') {
    // A tap installs nothing.
    triggerAction('interact', 'down');
    await wait(200);
    triggerAction('interact', 'up');
    await wait(1500);
    for (let k = 0; k < 50 && railRead()!.pending() > 0; k++) await wait(100);
    const tapped = facts();
    say(`after a tap ${JSON.stringify(tapped)}`);
    if (tapped.boiler !== start.boiler || tapped.fitted !== start.fitted)
      throw new Error('install: a tap installed the boiler');
    await wait(1700);
    await offered();
    const heldAt = railAt();
    triggerAction('interact', 'down');
    for (let k = 0; k < 150 && line(rw(), LINE2).boiler < 1; k++) await wait(100);
    triggerAction('interact', 'up');
    for (let k = 0; k < 50 && railRead()!.pending() > 0; k++) await wait(100);
    const after = facts();
    say(`after the hold (pressed at tick ${heldAt}, now ${railAt()}) ${JSON.stringify(after)}`);
    if (after.boiler !== 1 || after.fitted < 0) throw new Error('install: the hold did not fit the boiler');
    if (interactTarget()?.id === ID) throw new Error('install: the prompt is still offered after the install');
    if (step === 'adopt') {
      const seen = new Set<number>();
      for (let k = 0; k < 4000 && seen.size < LINE_SLOTS[LINE2]!.length; k++) {
        for (const slot of LINE_SLOTS[LINE2]!) {
          const r = train(rw(), slot);
          if (seen.has(slot) || r.boiler !== 1) continue;
          seen.add(slot);
          say(
            `train slot ${slot} wears boiler 1 at tick ${railAt()}, ${((railAt() - after.fitted) / 10).toFixed(1)} s after the install (phase ${r.phase === TRAIN_PHASE.STAND ? 'stand' : 'run'}, at halt ${r.at})`,
          );
        }
        await wait(100);
      }
      say(`end ${JSON.stringify(facts())}`);
      if (!seen.size) throw new Error('install: no line 2 train took the boiler');
    }
  }
  done.__installDone = true;
})();
export {};

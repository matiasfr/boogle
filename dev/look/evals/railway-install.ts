// npm run look -- --rail-seed steel-home --hud --eval dev/look/evals/railway-install.ts --until window.__installDone --name g3-install
//  (--query installstep=hold holds Install through and ends when the server's install shows in the rows and the moment
//   has run out; --query installstep=adopt goes on to wait for a line 2 train standing at the Village with the longer
//   boiler; the default, installstep=prompt, stops with the garage open on the Longer boiler, so
//   --action dev/look/evals/railway-install-act.ts can make the hold inside a --video capture)
// The longer boiler's install in the garage at the Roundhouse table (docs/plans/garage-install-moment.md, G3): stands
// by the lever post east of the table, checks the garage is offered, opens it with a tap of Interact, checks it opened
// on the Longer boiler ready to install, taps Install (which must install nothing), then holds the interact action
// until the server has fitted the boiler, and reads Line.boiler and Line.fitted. Staging is one teleport; every press
// is the interact action's own down and up. Returns at once and works on (look.ts warps while the eval runs and sets
// its camera after it), so the stills show the page as the step left it.
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
const { garage } = (await import(
  '/src/entities/railway/garage-state.ts' as string
)) as typeof import('../../../src/entities/railway/garage-state.ts');
const { garageRow, polarAt } = (await import(
  '/src/entities/railway/garage-geo.ts' as string
)) as typeof import('../../../src/entities/railway/garage-geo.ts');

const step = new URLSearchParams(location.search).get('installstep') ?? 'prompt';
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const say = (text: string) => console.log(`INSTALL ${text}`);
const done = window as Window & { __installDone?: boolean };
const ID = 'railway-garage';
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
  // Beside the post, a little further round the rim (clear of the barrel on its stand), facing the table.
  const { geo, table: centre, y: groundY } = garageRow();
  const stood = polarAt(centre, { bearing: geo.post.bearing + 6, r: geo.post.r - 0.2 });
  teleport(me.body!, stood.x, groundY + 0.7, stood.z);
  me.body!.velocity.set(0, 0, 0);
  cam.yaw = me.yaw = Math.atan2(centre.x - stood.x, centre.z - stood.z);
  await wait(1500);
  // look.ts set its default view when this script returned: hand the camera back to the game's own.
  window.__debugCam?.clear();
  // A player seeded into this room is shown each ability the room already has, one small flourish after another
  // (ability-arrival.ts; the last is a little boiler over Buddy). Let them play out so none lands in the install.
  await wait(14000);
  const start = facts();
  say(`start ${JSON.stringify(start)}`);
  const t = await offered();
  say(`offered "${t.verb}" blocked "${t.blocked ?? ''}" run ${!!t.run}`);
  if (t.blocked || !t.run) throw new Error('install: the garage is not offered ready');
  triggerAction('interact', 'down');
  triggerAction('interact', 'up');
  for (let k = 0; k < 80 && !garage.api?.isOpen(); k++) await wait(100);
  const opened = garage.api?.snap();
  say(`garage ${JSON.stringify(opened && { open: opened.open, sel: opened.sel, canInstall: opened.canInstall })}`);
  if (!opened?.open) throw new Error('install: Interact at the post did not open the garage');
  if (opened.sel !== 'long' || !opened.canInstall)
    throw new Error('install: it did not open on the Longer boiler, ready');
  await wait(900); // the camera's glide
  // `&dwell=<ms>` waits in the open garage first: a player reading the panel before they hold.
  const dwell = Number(new URLSearchParams(location.search).get('dwell'));
  if (dwell) {
    await wait(dwell);
    say(`dwelt ${dwell} ms in the garage`);
  }
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
    const heldAt = railAt();
    triggerAction('interact', 'down');
    for (let k = 0; k < 150 && line(rw(), LINE2).boiler < 1; k++) await wait(100);
    triggerAction('interact', 'up');
    for (let k = 0; k < 50 && railRead()!.pending() > 0; k++) await wait(100);
    const after = facts();
    say(`after the hold (pressed at tick ${heldAt}, now ${railAt()}) ${JSON.stringify(after)}`);
    if (after.boiler !== 1 || after.fitted < 0) throw new Error('install: the hold did not fit the boiler');
    for (let k = 0; k < 150 && garage.api?.snap().phase !== 'idle'; k++) await wait(100);
    const rest = garage.api!.snap();
    say(`after the moment ${JSON.stringify({ phase: rest.phase, real: rest.real, long: rest.facts.longFitted })}`);
    if (rest.phase !== 'idle' || !rest.facts.longFitted) throw new Error('install: the moment did not end fitted');
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

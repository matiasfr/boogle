// Garage step 4's screen (docs/plans/garage-step4.md, step 3): stand at the Roundhouse's post, open the garage with the
// real Interact, press a line's chip (a real rail.bring) and show its Engine tab.
//   npm run look -- --rail-seed trade-ready --hud --eval dev/look/evals/garage-trade.ts --query 'chip=bay' --name gt-ready
//   npm run look -- --rail-seed trade-fitted --hud --eval dev/look/evals/garage-trade.ts --query 'chip=ns' --name gt-ns
// `chip=` names the line to bring (ns | bay | line2, default: none, the table's own); `cat=` the tab (default engine),
// `sel=` its part;
// `open=0` leaves the garage shut (the post and its knob, from the player's camera); `close=1` shuts it after.
const { me } = (await import('/src/player/player.ts' as string)) as typeof import('../../../src/player/player.ts');
const { teleport } = (await import(
  '/src/physics/engine.ts' as string
)) as typeof import('../../../src/physics/engine.ts');
const { triggerAction } = (await import(
  '/src/player/controls.ts' as string
)) as typeof import('../../../src/player/controls.ts');
const { garage } = (await import(
  '/src/entities/railway/garage-state.ts' as string
)) as typeof import('../../../src/entities/railway/garage-state.ts');
const { garageRow, polarAt } = (await import(
  '/src/entities/railway/garage-geo.ts' as string
)) as typeof import('../../../src/entities/railway/garage-geo.ts');
const { railReady, rw, shed } = (await import('/dev/look/rail-read.ts' as string)) as typeof import('../rail-read.ts');
const { ROW_LINE } = (await import(
  '/src/sim/railway-route.ts' as string
)) as typeof import('../../../src/sim/railway-route.ts');
const { LINE2 } = (await import(
  '/src/sim/railway-lines.ts' as string
)) as typeof import('../../../src/sim/railway-lines.ts');
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
async function until(ok: () => boolean, what: string, ms = 60000) {
  const end = performance.now() + ms;
  while (!ok()) {
    if (performance.now() > end) throw new Error(`garage trade look: ${what}`);
    await wait(100);
  }
}
const query = new URLSearchParams(location.search);
await until(() => !!me.body && me.entered, 'the player ready');
if (!(await railReady(60000))) throw new Error('garage trade look: railway not ready');
const { geo: row, table: centre } = garageRow();
const stood = polarAt(centre, { bearing: row.post.bearing + 6, r: row.post.r - 0.2 });
teleport(me.body!, stood.x, 19.2, stood.z);
await wait(1500);
if (query.get('open') !== '0') {
  triggerAction('interact', 'down');
  triggerAction('interact', 'up');
  await until(() => !!garage.api?.isOpen(), 'Interact at the post opened the garage', 8000);
  await wait(900);
  const chip = query.get('chip');
  const line = chip === 'ns' ? ROW_LINE.ns : chip === 'bay' ? ROW_LINE.bay : chip === 'line2' ? LINE2 : -1;
  if (line >= 0 && shed(rw()).tableLine !== line) {
    await until(() => !garage.api!.snap().facts.held, 'the table free');
    garage.api!.bring(line);
    await until(() => shed(rw()).tableLine === line, 'the chip brought its copy', 20000);
    console.log('GARAGE brought', line);
    await wait(Number(query.get('after') ?? 2500));
  }
  const cat = (query.get('cat') ?? 'engine') as 'engine';
  garage.api!.choose(cat, (query.get('sel') ?? undefined) as 'quick' | undefined);
  await wait(600);
  const snap = garage.api!.snap();
  console.log(
    'GARAGE',
    JSON.stringify({ table: snap.facts.tableLine, cat: snap.cat, sel: snap.sel, lines: snap.facts.lines }),
  );
  console.log('GARAGE text', document.querySelector('.garage-ui')?.textContent?.replace(/\s+/g, ' ').slice(0, 400));
  // `close=1`: shut it again (Back), for a still of the bays or the table on look's own --cam.
  if (query.get('close') === '1') {
    garage.api!.close();
    await wait(1200);
  }
}
export {};

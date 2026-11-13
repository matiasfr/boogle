// The train garage (docs/brainstorms/engine-garage.md, first build; docs/plans/garage-install-moment.md, G2): stand at
// the Roundhouse table's lever post and press Interact through the real
// action, so the garage opens as a player opens it.
//   npm run look -- --rail-seed wagon-on --hud --eval dev/look/evals/garage-open.ts \
//     --action dev/look/evals/garage-act.ts --question "..."
// `?garage=<cat>/<part>` picks what is chosen on entry (default engine/long); `&hold=<ms>` holds Try it that long;
// `&cam=<bearing>` tries another camera bearing for this look only;
// `&train=1` first waits for a line 2 train to stand at the Village (the camera's still with a train on line 2).
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
const { railReady, rw, train } = (await import('/dev/look/rail-read.ts' as string)) as typeof import('../rail-read.ts');
const { LINE2 } = (await import(
  '/src/sim/railway-lines.ts' as string
)) as typeof import('../../../src/sim/railway-lines.ts');
const { LINE_SLOTS } = (await import(
  '/src/sim/railway-trains.ts' as string
)) as typeof import('../../../src/sim/railway-trains.ts');
const { TRAIN_PHASE } = (await import(
  '/src/sim/railway-train.ts' as string
)) as typeof import('../../../src/sim/railway-train.ts');
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const deadline = performance.now() + 60000;
while (!me.body || !me.entered) {
  if (performance.now() > deadline) throw new Error('garage look: the player did not become ready');
  await wait(100);
}
const { geo: row, table: centre } = garageRow();
// `&cam=<bearing>` tries another camera bearing for this look only (the row is read live while the garage is shut).
const tryCam = Number(new URLSearchParams(location.search).get('cam'));
if (tryCam) (row as { camBearing: number }).camBearing = tryCam;
const post = polarAt(centre, row.post);
// Beside the post, a little further round the rim: inside the server's install reach.
const stood = polarAt(centre, { bearing: row.post.bearing + 6, r: row.post.r - 0.2 });
teleport(me.body!, stood.x, 19.2, stood.z);
await wait(1500);
if (new URLSearchParams(location.search).get('train')) {
  if (!(await railReady(30_000))) throw new Error('garage look: the railway never became ready');
  const standing = () =>
    LINE_SLOTS[LINE2]!.some((slot) => {
      const r = train(rw(), slot);
      return r.phase === TRAIN_PHASE.STAND && r.at === 0;
    });
  const until = performance.now() + 900_000;
  while (!standing()) {
    if (performance.now() > until) throw new Error('garage look: no line 2 train stood at the Village in 900 s');
    await wait(100);
  }
  console.log('GARAGE a line 2 train stands at the Village');
}
void post;
// `&open=api` opens it without the prompt for a camera-only still.
if (new URLSearchParams(location.search).get('open') === 'api') garage.api?.open();
else {
  triggerAction('interact', 'down');
  triggerAction('interact', 'up');
}
const open = performance.now() + 8000;
while (!garage.api?.isOpen()) {
  if (performance.now() > open) throw new Error('garage look: Interact at the post did not open the garage');
  await wait(100);
}
await wait(900);
console.log('GARAGE open', JSON.stringify(garage.api.snap().cat));
export {};

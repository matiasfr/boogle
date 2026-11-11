// R4c's two-page proof (docs/plans/ring-island-build1.md, step 4c), `look --players 2 --rail-seed leaf-raised`: player 2
// knocks out the pawl at the gold strut ("Knock out the pawl") and then steps under the toe (u 259.4, facing the hinge); player 1 carries three
// footings from the railhead rack to the jib ("Shoulder a footing", "Hang the weight"), shoulders the fourth and waits at
// the jib facing the leaf. Pair it with `--action dev/look/evals/railway-leaf-coop-hang.ts`, which hangs the fourth on
// player 1's page, so player 1's motion sheet films the swing with player 2 drawn under the toe, and player 2's still
// (taken after the sheet) shows the landed leaf from where they were walked to. Staging teleports only.
const { makeBot } = (await import('/dev/look/bot.ts' as string)) as typeof import('../bot.ts');
const { me, cam } = (await import('/src/player/player.ts' as string)) as typeof import('../../../src/player/player.ts');
const { teleport } = (await import(
  '/src/physics/engine.ts' as string
)) as typeof import('../../../src/physics/engine.ts');
const { aperture, inspectRailway, rw } = (await import(
  '/dev/look/rail-read.ts' as string
)) as typeof import('../rail-read.ts');
const layout = (await import(
  '/src/sim/railway-ring-layout.ts' as string
)) as typeof import('../../../src/sim/railway-ring-layout.ts');
const player = new URLSearchParams(location.search).get('player') ?? '1';
const bot = makeBot();
const head = layout.RING_HEAD[7]!;
const say = (text: string) => console.log(`LEAF ${text}`);
// The ring is rows (the aperture's cw, brace and rack); the leaf's swing is the Works view's.
const ring = () => aperture(rw());
const state = () => JSON.stringify({ leaf: inspectRailway()?.worksView?.leafView, ring: ring() });
/** Set down at (u, lat) on a deck whose top is `y` m, facing toward u `faceU` along the line. */
function stand(u: number, lat: number, y: number, faceU?: number) {
  const p = layout.ringAt(Math.round(u * 100), Math.round(lat * 100));
  teleport(me.body!, p.x / 100, y + 0.85, p.z / 100);
  me.body!.velocity.set(0, 0, 0);
  if (faceU !== undefined) {
    const q = layout.ringAt(Math.round(faceU * 100), Math.round(lat * 100));
    cam.yaw = me.yaw = Math.atan2(-(q.x - p.x), -(q.z - p.z));
  }
}
const site = (s: { x: number; z: number }) => [s.x / 100, s.z / 100] as const;
async function until(ok: () => boolean, ms: number, what: string) {
  const end = performance.now() + ms;
  while (!ok()) {
    if (performance.now() > end) throw new Error(`timed out: ${what} (${state()})`);
    await bot.wait(100);
  }
}
say(`player ${player} start ${state()}`);
if (player === '2') {
  stand(288, 3.4, layout.RING_BRACE.y / 100);
  await bot.wait(400);
  if (!(await bot.use(...site(layout.RING_BRACE), 'knock out the pawl', /Knock out the pawl/)))
    throw new Error('no brace offered');
  await until(() => ring()?.brace === 2, 8000, 'braced');
  say(`braced ${state()}`);
  // Under the toe once the other player has three hung, facing the hinge: the leaf comes down at you.
  await until(() => (ring()?.cw ?? 0) >= 3, 90000, 'three hung');
  stand(259.4, 0.5, head.jib.y / 100, 270);
  say(`under the toe ${state()}`);
  // From here on, on this page: where this player stands each quarter second while its own leaf is moving.
  const { ringIslandPose } = (await import(
    '/src/entities/ring-island/state.ts' as string
  )) as typeof import('../../../src/entities/ring-island/state.ts');
  let last = ringIslandPose.leaf;
  const iv = setInterval(() => {
    if (ringIslandPose.leaf === last) return;
    last = ringIslandPose.leaf;
    const p = me.body!.position;
    say(`own leaf ${last.toFixed(1)} deg, me at ${p.x.toFixed(2)},${p.y.toFixed(2)},${p.z.toFixed(2)}`);
  }, 250);
  setTimeout(() => clearInterval(iv), 120000);
} else {
  for (let n = 1; n <= 4; n++) {
    stand(238.5, 4.8, head.rack.y / 100);
    await bot.wait(400);
    if (!(await bot.use(...site(head.rack), 'shoulder a footing', /Shoulder a footing/)))
      throw new Error(`no take ${n}`);
    await bot.wait(700);
    stand(254, 3.6, head.jib.y / 100);
    await bot.wait(400);
    if (n === 4) break;
    if (!(await bot.use(...site(head.jib), 'hang the weight', /Hang the weight/))) throw new Error(`no set ${n}`);
    say(`hung ${n} ${state()}`);
    await bot.wait(1200);
  }
  await until(() => ring()?.brace === 2, 60000, 'the other player braced');
  stand(252, 3.6, head.jib.y / 100, 275);
  say(`ready at the jib ${state()}`);
}
export {};

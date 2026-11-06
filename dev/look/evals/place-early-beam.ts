// Existing broker look fixture: Station 1 -> 3 harvest and pickup gate regression.
// --query proto=place --eval dev/look/evals/place-early-beam.ts --until window.__coopDone --warm 180
const tree = (await import('/src/proto/place/chop.ts' as string)) as typeof import('../../../src/proto/place/chop.ts');
const { bigCargo } = (await import(
  '/src/proto/place/big-cargo.ts' as string
)) as typeof import('../../../src/proto/place/big-cargo.ts');
const { activeFrame, wakeNow } = (await import(
  '/src/proto/place/run.ts' as string
)) as typeof import('../../../src/proto/place/run.ts');
const { me, cam } = (await import('/src/player/player.ts' as string)) as typeof import('../../../src/player/player.ts');
const { teleport } = (await import(
  '/src/physics/engine.ts' as string
)) as typeof import('../../../src/physics/engine.ts');
const hands = (await import('/src/player/hands.ts' as string)) as typeof import('../../../src/player/hands.ts');
const got = (await import('/src/proto/place/got.ts' as string)) as typeof import('../../../src/proto/place/got.ts');
const { makeBot } = (await import('/dev/look/bot.ts' as string)) as typeof import('../bot.ts');
// oxlint-disable-next-line typescript/no-explicit-any
const place = window.__place as any;
const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
const until = async (fn: () => boolean, label: string) => {
  const end = performance.now() + 90000;
  while (!fn()) {
    if (performance.now() > end) throw new Error(`EARLY timeout ${label}`);
    await wait(50);
  }
};
const check = (label: string, ok: boolean) => {
  if (!ok) throw new Error(`EARLY FAIL ${label}`);
  console.log(`EARLY PASS ${label}`);
};
const put = (x: number, z: number) => {
  teleport(me.body!, x, place.H(x, z) + 0.9, z);
  me.body!.velocity.set(0, 0, 0);
  me.yaw = cam.yaw = Math.PI;
};
const press = async (verb: string) => {
  await until(() => hands.interactTarget()?.verb === verb, `${verb} prompt`);
  hands.interactDown();
  hands.interactUp();
  await wait(500);
};
async function run() {
  const dismiss = setInterval(() => {
    if (got.gettingItem()) got.press();
  }, 250);
  wakeNow();
  put(tree.greatTree.x, tree.greatTree.z + 3.5);
  await wait(700);
  check('Station 1 offers a rebound attempt', hands.interactTarget()?.id === 'place-great');
  await press('Chop');
  check(
    'Station 1 refuses accepted work',
    tree.greatTree.work === 0 && tree.harvestTree(tree.greatTree, 0, 0, 0).state.work === 0,
  );
  const ordinary = tree.TREES.find((t) => !t.great && !t.hardwood && !t.cleared && t.fall < 0)!;
  put(ordinary.x, ordinary.z + 2);
  await press('Chop');
  await until(() => tree.back.logs > 0, 'ordinary logs carried');
  check('ordinary logs fit again', tree.back.logs > 0);
  tree.back.logs = 0;
  put(tree.greatTree.x + 2.5, tree.greatTree.z);
  for (let stage = 0; stage < 2; stage++) {
    place.skipDelivery();
    await until(() => place.lines[0].stage > stage && !!activeFrame(), `Station ${stage + 1} completed`);
    await wait(500);
    if (stage === 0)
      check('Station 2 still has no trunk prompt', hands.interactTarget()?.verb !== 'Shoulder the trunk');
  }
  check('Station 3 now needs the trunk', activeFrame()?.wants('beam') === 1);
  tree.applyTreeHarvest(tree.greatTree, {
    work: 12,
    issued: 0,
    ceiling: 0,
    revision: 1,
    fell: true,
    fallYaw: 0,
    collapsed: false,
  });
  await until(() => tree.trunkDown(), 'Station 3 felled tree ready');
  const at = tree.trunkAt();
  put(at.x + 2.5, at.z);
  await press('Shoulder the trunk');
  check('Station 3 offers and accepts trunk', tree.back.big === 'beam' && tree.back.beam === 1);
  const st = place.lines[0].stations[2];
  st.have.logs = 40;
  st.drawStock(st.have);
  check('walk trunk to Station 3', await makeBot().walk(st.x, st.z, 3, { limit: 60000 }));
  await until(() => place.lines[0].open, 'beam delivered and crossing opened');
  check(
    'delivered beam remains consumed',
    tree.back.big === null && tree.trunkTaken() && bigCargo.beam.ground === null,
  );
  window.__debugCam!.set([st.x - 12, place.H(st.x, st.z) + 9, st.z - 14], [st.x, place.H(st.x, st.z) + 1, st.z]);
  clearInterval(dismiss);
  Object.assign(window, { __coopDone: true });
}
void run();
export {};

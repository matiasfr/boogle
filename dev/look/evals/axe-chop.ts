// Existing broker eval + place-act.ts action. Inventory/location are fixtures; strokes use real click input.
// ?proto=place&axe=multi|proper-multi&load=0|16&approach=degrees&distance=1.35
// Starter/proper without the pick are stage-only: the game's tree input requires the multi-axe unlock.
const query = new URLSearchParams(location.search);
const tier = query.get('axe') ?? 'proper-multi';
if (tier !== 'multi' && tier !== 'proper-multi')
  throw new Error('Axe input fixture requires multi or proper-multi; starter/proper are stage-only before unlock');
const load = Number(query.get('load') ?? 0);
const angle = (Number(query.get('approach') ?? 0) * Math.PI) / 180;
const distance = Number(query.get('distance') ?? 1.35);
if ((load !== 0 && load !== 16) || !Number.isFinite(angle) || !(distance > 0 && distance <= 3.2))
  throw new Error('Axe fixture requires load=0|16, finite approach degrees and distance in (0,3.2]');
const { me, cam } = (await import('/src/player/player.ts' as string)) as typeof import('../../../src/player/player.ts');
const { teleport } = (await import(
  '/src/physics/engine.ts' as string
)) as typeof import('../../../src/physics/engine.ts');
const { TREES, back, readTreeHarvest } = (await import(
  '/src/proto/place/chop.ts' as string
)) as typeof import('../../../src/proto/place/chop.ts');
const { CHOP_CONTACT } = (await import(
  '/src/proto/place/chop-motion.ts' as string
)) as typeof import('../../../src/proto/place/chop-motion.ts');
const { job } = (await import('/src/proto/place/job.ts' as string)) as typeof import('../../../src/proto/place/job.ts');
const { H } = (await import(
  '/src/place/terrain.ts' as string
)) as typeof import('../../../src/place/terrain.ts');
const { DAY } = (await import(
  '/src/place/look.ts' as string
)) as typeof import('../../../src/place/look.ts');
const { emptyHand } = (await import(
  '/src/player/inventory.ts' as string
)) as typeof import('../../../src/player/inventory.ts');
const { useDown, useUp, interactTarget } = (await import(
  '/src/player/hands.ts' as string
)) as typeof import('../../../src/player/hands.ts');
const { background } = (await import('/src/async.ts' as string)) as typeof import('../../../src/async.ts');
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const deadline = performance.now() + 30000;
while (!me.body || !me.avatar || !me.entered) {
  if (performance.now() > deadline) throw new Error('Axe fixture: player did not become ready');
  await wait(50);
}
const tree = TREES[227]!; // Existing place-trees fixture: open southern forest edge.
if (tree.fall >= 0 || tree.work || tree.issued || tree.cleared)
  throw new Error('Axe fixture needs a fresh standing ordinary tree 227');
job.awake = job.rung.multi = true;
job.rung.axe = tier === 'proper-multi' ? 1 : 0;
job.rung.pack = 1;
job.chest = null;
emptyHand();
back.logs = load;
back.rails = back.stone = back.incoming = back.beam = 0;
back.big = null;
DAY.hold = true;
DAY.u = 0.26;
const x = tree.x + Math.sin(angle) * distance;
const z = tree.z + Math.cos(angle) * distance;
teleport(me.body!, x, H(x, z) + 1.2, z);
me.body!.velocity.set(0, 0, 0);
cam.yaw = me.yaw = angle;
// The harness places its preset after eval. Return to the real follow camera after that placement.
setTimeout(() => window.__debugCam!.clear(), 700);
await wait(500);
console.log(
  'AXE setup ' +
    JSON.stringify({
      tier,
      load,
      approach: (angle * 180) / Math.PI,
      distance,
      tree: tree.index,
      contact: CHOP_CONTACT,
    }),
);

const point = me.avatar!.position.clone();
function position(name: string) {
  const object = me.avatar?.getObjectByName(name);
  if (!object) return null;
  object.getWorldPosition(point);
  return { x: point.x, y: point.y, z: point.z };
}
function sample(sampleIndex: number, seconds: number) {
  me.avatar?.updateWorldMatrix(true, true);
  return {
    sampleIndex,
    seconds,
    body: me.body ? { x: me.body.position.x, y: me.body.position.y, z: me.body.position.z } : null,
    head: position('Head'),
    blade: position('axe-blade-contact'),
    handLeft: position('hand_l'),
    handRight: position('hand_r'),
    handleStart: position('axe-handle-start'),
    handleEnd: position('axe-handle-end'),
  };
}
async function stroke(index: number) {
  const before = readTreeHarvest(tree);
  const beforeLogs = back.logs;
  const target = interactTarget();
  if (target?.id !== `place-tree${tree.index}`)
    throw new Error(`Axe fixture picked ${target?.id ?? 'nothing'} instead of tree ${tree.index}`);
  const started = performance.now();
  if (!useDown()) throw new Error('Axe fixture click input did not act');
  useUp();
  let sampleIndex = 0;
  let nearest = sample(sampleIndex++, 0);
  // These are wall-time samples, not renderer frame IDs; the asset stage owns exact rendered-frame evidence.
  while (performance.now() - started < 450) {
    await wait(16);
    const seconds = (performance.now() - started) / 1000;
    const row = sample(sampleIndex++, seconds);
    if (Math.abs(seconds - CHOP_CONTACT) < Math.abs(nearest.seconds - CHOP_CONTACT)) nearest = row;
    console.log('AXE sample ' + JSON.stringify({ stroke: index, ...row }));
  }
  await wait(Math.max(0, 900 - (performance.now() - started)));
  const after = readTreeHarvest(tree);
  const logs = back.logs - beforeLogs;
  const expected = load === 16 ? 0 : tier === 'proper-multi' ? 5 : 2;
  if (logs !== expected || (load === 16 && JSON.stringify(before) !== JSON.stringify(after)))
    throw new Error('Axe fixture harvest mismatch: ' + JSON.stringify({ index, expected, logs, before, after }));
  console.log(
    'AXE stroke ' + JSON.stringify({ index, logs, total: back.logs, before, after, closestContact: nearest }),
  );
}
async function act() {
  for (let index = 1; index <= 3; index++) await stroke(index);
  console.log(
    'AXE complete ' + JSON.stringify({ tier, initialLoad: load, logs: back.logs, tree: readTreeHarvest(tree) }),
  );
}
Object.assign(window, { __placeAct: () => background(act(), 'axe chop evidence') });
export {};

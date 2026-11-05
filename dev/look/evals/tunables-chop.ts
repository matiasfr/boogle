// Real chop owner, fixed tree fixture; values change through the agent API.
const { me, cam } = (await import('/src/player/player.ts' as string)) as typeof import('../../../src/player/player.ts');
const { teleport } = (await import(
  '/src/physics/engine.ts' as string
)) as typeof import('../../../src/physics/engine.ts');
const { TREES, chop } = (await import(
  '/src/proto/place/chop.ts' as string
)) as typeof import('../../../src/proto/place/chop.ts');
const { H } = (await import(
  '/src/proto/place/terrain.ts' as string
)) as typeof import('../../../src/proto/place/terrain.ts');
const { snapshotFeelSpring } = (await import(
  '/src/player/feel-tuning.ts' as string
)) as typeof import('../../../src/player/feel-tuning.ts');
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const deadline = performance.now() + 30_000;
while (!window.boogle?.dev || !me.body || !me.avatar) {
  if (performance.now() > deadline) throw new Error('Tunables chop readiness');
  await wait(50);
}
const tree = TREES[227]!;
teleport(me.body, tree.x, H(tree.x, tree.z + 1.4) + 1, tree.z + 1.4);
me.body.velocity.set(0, 0, 0);
cam.yaw = me.yaw = 0;
cam.pitch = 0.3;
cam.dist = 5;
const api = window.boogle.dev!;
await api.run('tunables', 'reset-local', { id: 'feel.spring.stiffness' });
if (!chop(tree)) throw new Error('First chop refused');
const before = snapshotFeelSpring();
const applied = await api.run('tunables', 'set', { id: 'feel.spring.stiffness', value: 450 });
const during = snapshotFeelSpring();
if (!applied.ok || during.active.value !== before.active.value || !during.chopLocked)
  throw new Error('In-flight chop profile changed');
console.log(
  'TUNABLES CHOP ' + JSON.stringify({ before, during, export: (await api.run('tunables', 'snapshot')).data }),
);
await wait(1200);
if (!chop(tree) || snapshotFeelSpring().active.value !== 450) throw new Error('Next chop did not adopt B');
console.log('TUNABLES NEXT ' + JSON.stringify(snapshotFeelSpring()));
(window as unknown as { __placeAct: () => void }).__placeAct = () => {
  window.__debugCam?.clear();
  me.jumpQueued = 0.2;
};
export {};

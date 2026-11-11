// The action for dev/look/evals/railway-leaf-coop.ts (player 1's page): hang the fourth footing at the jib, so the
// motion sheet that follows films the swing; logs player 1's own leaf and where it draws player 2 as it lands.
const { makeBot } = (await import('/dev/look/bot.ts' as string)) as typeof import('../bot.ts');
const { me, cam } = (await import('/src/player/player.ts' as string)) as typeof import('../../../src/player/player.ts');
const { ringIslandPose } = (await import(
  '/src/entities/ring-island/state.ts' as string
)) as typeof import('../../../src/entities/ring-island/state.ts');
const layout = (await import(
  '/src/sim/railway-ring-layout.ts' as string
)) as typeof import('../../../src/sim/railway-ring-layout.ts');
const bot = makeBot();
const head = layout.RING_HEAD[7]!;
const yaw = cam.yaw;
const leaf = () => ringIslandPose.leaf;
const remote = () => {
  const r = [
    ...(
      window as unknown as {
        boogle: { remotes: Map<string, { avatar?: { position: { x: number; y: number; z: number } } }> };
      }
    ).boogle.remotes.values(),
  ][0];
  const p = r?.avatar?.position;
  return p ? `${p.x.toFixed(1)},${p.y.toFixed(1)},${p.z.toFixed(1)}` : 'none';
};
if (!(await bot.use(head.jib.x / 100, head.jib.z / 100, 'hang the weight', /Hang the weight/)))
  throw new Error('no set 4');
cam.yaw = me.yaw = yaw; // back to facing the leaf for the sheet
for (const ms of [0, 500, 1000, 1500, 2000, 2500, 3500])
  setTimeout(() => console.log(`LEAF after ${ms}: leaf ${leaf().toFixed(1)} deg, player 2 drawn at ${remote()}`), ms);
export {};

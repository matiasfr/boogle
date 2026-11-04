// Walk off the summit with the glider already earned in the bot run; use the normal input action.
const { me, cam } = (await import('/src/player/player.ts' as string)) as typeof import('../../../src/player/player.ts');
const { input } = (await import('/src/player/input.ts' as string)) as typeof import('../../../src/player/input.ts');
const { triggerAction } = (await import(
  '/src/player/controls.ts' as string
)) as typeof import('../../../src/player/controls.ts');
const { techApi } = (await import(
  '/src/proto/place/tech.ts' as string
)) as typeof import('../../../src/proto/place/tech.ts');
const { job } = (await import('/src/proto/place/job.ts' as string)) as typeof import('../../../src/proto/place/job.ts');
const { L2 } = (await import(
  '/src/proto/place/lines.ts' as string
)) as typeof import('../../../src/proto/place/lines.ts');
const target = L2.stations.find((st) => st.spec.id === 'Q5');
if (!job.tech.glide || !me.body || !target) throw new Error('No earned glider or destination at the prior checkpoint');
const face = () => {
  const p = me.body!.position;
  cam.yaw = me.yaw = Math.atan2(-(target.x - p.x), -(target.z - p.z));
};
face();
input.keys.add('KeyW');
void (async () => {
  try {
    const deadline = performance.now() + 5000;
    while (me.coyote > 0 && performance.now() < deadline) {
      face();
      await new Promise((r) => setTimeout(r, 40));
    }
    if (me.coyote > 0) throw new Error('Could not walk off the summit from this checkpoint');
    await new Promise((r) => setTimeout(r, 150));
    triggerAction('glide', 'down');
    triggerAction('glide', 'up');
    if (!techApi.move.open) throw new Error('Real glide input did not open the glider');
    console.log('SHEET glider opened through real input');
    const until = performance.now() + 6000;
    while (performance.now() < until) {
      face();
      await new Promise((r) => setTimeout(r, 40));
    }
  } finally {
    input.keys.delete('KeyW');
  }
})().catch((error: unknown) => console.error('SHEET glide failed', error));
export {};

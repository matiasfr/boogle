// The ridge telescope (src/entities/lookout) on a fresh production world: stand beside it and take Look through it with a
// real Interact press, so the still is the telescope's own fixed view.
//   npm run look -- --query 'shot=play' --eval dev/look/evals/lookout.ts --hud --name lookout-scope
const { me, cam } = (await import('/src/player/player.ts' as string)) as typeof import('../../../src/player/player.ts');
const { teleport } = (await import(
  '/src/physics/engine.ts' as string
)) as typeof import('../../../src/physics/engine.ts');
const { interactTarget } = (await import(
  '/src/player/hands.ts' as string
)) as typeof import('../../../src/player/hands.ts');
const { H } = (await import('/src/place/land.ts' as string)) as typeof import('../../../src/place/land.ts');
const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));
async function until(fn: () => unknown, label: string, ms = 60000) {
  const end = performance.now() + ms;
  while (!fn()) {
    if (performance.now() > end) {
      const p = me.body?.position;
      const at = p ? `${p.x.toFixed(1)},${p.y.toFixed(1)},${p.z.toFixed(1)}` : 'no body';
      throw new Error(`lookout: ${label} (at ${at}; target ${interactTarget()?.id ?? 'none'})`);
    }
    await wait(100);
  }
}
// look places its own camera after this setup; the telescope's view is the one to capture, so ignore that.
window.__debugCam!.set = () => {};
await until(() => me.body, 'player body');
// Two metres south-east of the telescope, facing it.
const x = 986.5,
  z = -204.6;
teleport(me.body!, x, H(x, z) + 1.2, z);
me.body!.velocity.set(0, 0, 0);
cam.yaw = me.yaw = Math.atan2(1.5, 2.4);
await until(() => interactTarget()?.id === 'place-scope', 'Look through it offered', 15000);
window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyE', bubbles: true }));
window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyE', bubbles: true }));
await until(() => document.body.classList.contains('telescope-open'), 'telescope opened', 5000);
export {};

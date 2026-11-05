// Same carried-load shore approach as round five, through the real production defaults.
await import('/dev/look/evals/place-job.ts' as string);
const { me, cam } = (await import('/src/player/player.ts' as string)) as typeof import('../../../src/player/player.ts');
const { teleport } = (await import(
  '/src/physics/engine.ts' as string
)) as typeof import('../../../src/physics/engine.ts');
const { H } = (await import('/src/proto/place/land.ts' as string)) as typeof import('../../../src/proto/place/land.ts');
teleport(me.body!, 803, H(803, 10) + 0.8, 10);
cam.yaw = -Math.PI / 2;
cam.pitch = 0.2;
await new Promise((r) => setTimeout(r, 800));
window.__debugCam!.clear();
export {};

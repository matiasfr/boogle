// driven by: dev/look/evals/forge-rewards.ts (its --action; the commands are in its header)
// The action for dev/look/evals/forge-rewards.ts: walk onto the forge frame's receiver (922, -12) so the carried log
// deposits, then step back west to watch.
const { me, cam } = (await import('/src/player/player.ts' as string)) as typeof import('../../../src/player/player.ts');
const { teleport } = (await import(
  '/src/physics/engine.ts' as string
)) as typeof import('../../../src/physics/engine.ts');
const { H } = (await import('/src/place/land.ts' as string)) as typeof import('../../../src/place/land.ts');
const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));
const yaw = cam.yaw,
  pitch = cam.pitch;
const back = { x: me.body!.position.x, z: me.body!.position.z };
teleport(me.body!, 922, H(922, -12) + 0.9, -12);
me.body!.velocity.set(0, 0, 0);
await wait(Number(new URLSearchParams(location.search).get('depositMs') ?? 900));
teleport(me.body!, back.x, H(back.x, back.z) + 0.9, back.z);
me.body!.velocity.set(0, 0, 0);
cam.yaw = yaw;
cam.pitch = pitch;
export {};

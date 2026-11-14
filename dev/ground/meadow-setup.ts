// Page setup for the meadow stills (dev/ground/meadow-shots.ts): Buddy stands on the Round's green beside the
// statue, for scale, and the page waits for the meadow's keep map, which bakes after the first frame.
const { me, cam } = await import('/src/player/player.ts' as string);
const { teleport } = await import('/src/physics/engine.ts' as string);
const { H } = await import('/src/place/terrain.ts' as string);
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
while (!me.body) await wait(80);
const x = 880.5,
  z = 25.5;
teleport(me.body, x, H(x, z) + 1.2, z);
me.body.velocity.set(0, 0, 0);
cam.yaw = me.yaw = 2.6;
await wait(1500);
export {};

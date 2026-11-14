// Page setup for the paths stills (dev/terrain-pass/paths-shots.ts): Buddy stands on the canyon path, part-way up the
// bench cut into the gorge's east wall, for scale.
const { me, cam } = await import('/src/player/player.ts' as string);
const { teleport } = await import('/src/physics/engine.ts' as string);
const { H } = await import('/src/place/terrain.ts' as string);
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
while (!me.body) await wait(80);
const x = 949,
  z = -104;
teleport(me.body, x, H(x, z) + 1.2, z);
me.body.velocity.set(0, 0, 0);
cam.yaw = me.yaw = 0.5;
export {};

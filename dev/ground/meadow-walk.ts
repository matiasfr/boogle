// The meadow's motion look: Buddy walks across the Round's green past the statue and on over the ring road, by real
// input, with the player's own camera.
//   npm run look -- --eval dev/ground/meadow-setup.ts --action dev/ground/meadow-walk.ts --video --seconds 10 \
//     --name meadow-walk --question "Do flowers and tufts come and go without popping as he crosses the green?"
const { me, cam } = await import('/src/player/player.ts' as string);
const { input } = await import('/src/player/input.ts' as string);
const { teleport } = await import('/src/physics/engine.ts' as string);
const { H } = await import('/src/place/terrain.ts' as string);
const x = 874,
  z = 15;
teleport(me.body, x, H(x, z) + 1.2, z);
me.body.velocity.set(0, 0, 0);
cam.yaw = me.yaw = Math.atan2(-1, -0.75); // east-south-east: past the statue's south side toward the far lawn
window.__debugCam?.clear(); // look froze the camera at its view: the walk is seen through the player's own
input.keys.add('KeyW');
export {};

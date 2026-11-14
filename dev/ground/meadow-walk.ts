// The meadow's motion look: Buddy walks south through the flower drift beside the wedge's path, by real input, with
// the player's own camera.
//   npm run look -- --query 'meadow=tint,flowers' --eval dev/ground/meadow-setup.ts --action dev/ground/meadow-walk.ts \
//     --video --seconds 9 --name meadow-walk --question "Do flowers and tufts come and go without popping as he walks?"
const { me, cam } = await import('/src/player/player.ts' as string);
const { input } = await import('/src/player/input.ts' as string);
const { teleport } = await import('/src/physics/engine.ts' as string);
const { H } = await import('/src/place/terrain.ts' as string);
const x = 931,
  z = 94;
teleport(me.body, x, H(x, z) + 1.2, z);
me.body.velocity.set(0, 0, 0);
cam.yaw = me.yaw = Math.PI; // south
window.__debugCam?.clear(); // look froze the camera at its view: the walk is seen through the player's own
input.keys.add('KeyW');
export {};

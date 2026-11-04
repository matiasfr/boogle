// A real hook input from the checkpoint before the first pull. Never grant an ability or relocate the player.
const { me, cam } = await import('/src/player/player.ts' as string);
const { techApi: tech } = await import('/src/proto/place/tech.ts' as string);
const { triggerAction } = await import('/src/player/controls.ts' as string);
const { job } = await import('/src/proto/place/job.ts' as string);
if (!job.tech.hook || !me.body) throw new Error('No earned hook at this prior checkpoint');
const here = me.body.position;
// The first pull in the bot route leaves the hub for p2; aim at that same destination.
const ring = tech.RINGS.find((r: { pad: { id: string } }) => r.pad.id === 'p2');
if (!ring) throw new Error('The first hook destination p2 is absent');
cam.yaw = me.yaw = Math.atan2(-(ring.at.x - here.x), -(ring.at.z - here.z));
cam.pitch = Math.min(
  0.85,
  Math.atan2(ring.at.y - (here.y + 1.35), Math.hypot(ring.at.x - here.x, ring.at.z - here.z)) - 0.3,
);
setTimeout(() => {
  if (!tech.move.pick || tech.whyNot(tech.move.pick) !== 'nothing') {
    console.error('SHEET no reachable ring in the saved pose after aiming');
    return;
  }
  triggerAction('hook', 'down');
  triggerAction('hook', 'up');
  if (!tech.move.pull) console.error('SHEET hook input did not start a pull');
  else console.log('SHEET hook started through the real action');
}, 400);
export {};

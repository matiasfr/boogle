// Walking-in sightline audit. Restore the named baseline save, relocate to a disclosed nearby approach,
// then walk with real inputs and the normal follow camera. Chest respawns are disclosed below.
const q = new URLSearchParams(location.search);
const cue = q.get('cue') ?? 'great';
// oxlint-disable-next-line typescript/no-explicit-any
const p = window.__place as any;
const { me, cam } = (await import('/src/player/player.ts' as string)) as typeof import('../../../src/player/player.ts');
const { teleport } = (await import(
  '/src/physics/engine.ts' as string
)) as typeof import('../../../src/physics/engine.ts');
const { makeBot } = (await import('/dev/look/bot.ts' as string)) as typeof import('../bot.ts');
const { dropGot } = (await import(
  '/src/proto/place/got.ts' as string
)) as typeof import('../../../src/proto/place/got.ts');
const { grantChest } = (await import(
  '/src/proto/place/ladder.ts' as string
)) as typeof import('../../../src/proto/place/ladder.ts');
// Fixed starts; the chest approaches end at the actual authored chest. Hook uses an absolute pillar height.
const walks: Record<string, [number, number, number, number, number]> = {
  great: [979, -109, 978, -97, 1.2],
  source: [976, -93, 982, -108, 1.2],
  axe: [937, -16, 932, -10, 1.2],
  pack: [910, -16, 915, -13, 1.2],
  forge: [910, -21, 911, -15, 1.2],
  depot: [946, 29, 938, 23, 1.2],
  hook: [999, 24, 997, 22.5, 26],
  boiler: [1004, -134, 1012, -142, 1.2],
  train: [1004, -134, 1012, -142, 1.2],
};
const route = walks[cue];
if (!route) throw new Error(`Unknown cue ${cue}`);
const [x, z, endX, endZ, up] = route;
let tx = endX,
  tz = endZ;
// The checkpoint has consumed the reward: respawn only that chest, without its original drop flight.
if (cue === 'axe' || cue === 'pack') {
  p.job.rung[cue] = 0;
  grantChest(cue, true);
  const chest = p.giftState.crates().find((c: { content: string }) => c.content === cue);
  tx = chest.x;
  tz = chest.z;
}
if (cue === 'hook') {
  tx = p.tech.devices.hook.x;
  tz = p.tech.devices.hook.z;
}
dropGot();
p.day.hold = true;
p.day.u = 0.26;
teleport(me.body!, x, cue === 'hook' ? up : p.H(x, z) + up, z);
me.body!.velocity.set(0, 0, 0);
cam.yaw = me.yaw = Math.atan2(-(tx - x), -(tz - z));
cam.pitch = -0.14;
window.__debugCam!.clear();
const bot = makeBot();
await bot.wait(500);
if (!(await bot.walk(tx, tz, 0.8, { limit: 12000 }))) throw new Error(`Cue approach failed: ${cue}`);
if (cue === 'axe' || cue === 'pack') {
  await bot.wait(3000);
  dropGot();
}
await bot.wait(600);
if (cue === 'depot' && q.has('arrival')) {
  const { cartHere } = (await import(
    '/src/proto/place/depot.ts' as string
  )) as typeof import('../../../src/proto/place/depot.ts');
  if (
    !(await bot.until(
      () => {
        const cart = cartHere();
        return p.cart.leg === 'out' && p.cart.load > 0 && Math.hypot(cart.x - tx, cart.z - tz) < 38;
      },
      60000,
      'loaded cart approaches the depot',
    ))
  )
    throw new Error('No loaded cart arrived');
  console.log(
    `CUE arriving cart: ${JSON.stringify({ cart: p.cart, rack: { x: p.rack.x, z: p.rack.z, logs: p.rack.logs } })}`,
  );
}
console.log(`CUE ${cue}: ${JSON.stringify({ start: [x, z], end: me.body!.position, yaw: cam.yaw, pitch: cam.pitch })}`);
bot.finish(`walking-in ${cue}`);
// Hide only the harness diagnostic overlay, retaining the entire player HUD.
document.querySelectorAll<HTMLElement>('[style*="z-index: 9999"]').forEach((el) => el.remove());
export {};

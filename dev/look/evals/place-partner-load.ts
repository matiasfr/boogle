// Two-player worn-load still: player 1 observes player 2. Use &load=logs|rails|stone|beam|boiler|pet|missing|invalid.
// The fixture stages inventory; rendering and delivery use the real avatar/presence paths.
const q = new URLSearchParams(location.search);
const who = q.get('player');
const kind = q.get('load') ?? 'rails';
const { me, cam } = (await import('/src/player/player.ts' as string)) as typeof import('../../../src/player/player.ts');
const { teleport } = (await import(
  '/src/physics/engine.ts' as string
)) as typeof import('../../../src/physics/engine.ts');
const { net, remotes } = (await import(
  '/src/netplay/net.ts' as string
)) as typeof import('../../../src/netplay/net.ts');
const { back, shoulder, setTrunkTaken } = (await import(
  '/src/proto/place/chop.ts' as string
)) as typeof import('../../../src/proto/place/chop.ts');
const { job } = (await import('/src/proto/place/job.ts' as string)) as typeof import('../../../src/proto/place/job.ts');
const { H } = (await import('/src/place/land.ts' as string)) as typeof import('../../../src/place/land.ts');
const { wearOwned } = (await import(
  '/src/proto/place/gifts.ts' as string
)) as typeof import('../../../src/proto/place/gifts.ts');
const { scene } = (await import('/src/render/scene.ts' as string)) as typeof import('../../../src/render/scene.ts');
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const until = async (fn: () => boolean, label: string) => {
  const deadline = performance.now() + 20000;
  while (!fn()) {
    if (performance.now() > deadline) throw new Error(`Partner load: ${label}`);
    await wait(100);
  }
};
await until(() => !!me.body && !!net.room && [...remotes.values()].some((r) => !!r.avatar), 'two avatars ready');
await wait(1800);
const x = 910,
  z = 22,
  y = H(x, z);
teleport(me.body!, who === '2' ? x : x - 7, y + 1, z);
me.body!.velocity.set(0, 0, 0);
cam.yaw = me.yaw = 0;
// Both copies must agree that big cargo exists; ordinary snapshots otherwise clear a stale shoulder.
setTrunkTaken(true);
job.boiler = 2;
if (who === '2') {
  back.logs = back.rails = back.stone = 0;
  back.big = null;
  if (kind === 'beam' || kind === 'boiler') shoulder(kind);
  else if (kind === 'logs' || kind === 'rails' || kind === 'stone') back[kind] = 8;
  else if (kind === 'pet') wearOwned('critter');
  else if (kind === 'missing' || kind === 'invalid') {
    // Start populated, then emulate an older/malformed sender over the existing room API.
    back.rails = back.stone = 8;
    wearOwned('critter');
    const room = net.room!;
    const presence = room.presence.bind(room);
    setTimeout(() => {
      room.presence = (patch: unknown) =>
        presence({
          ...(patch as Record<string, unknown>),
          placeLoad: kind === 'missing' ? null : { rails: 1e9, stone: -1, pack: 'yes' },
          placePet: kind === 'missing' ? null : { riding: 'yes' },
          placeBig: kind === 'missing' ? null : 'unknown-cargo',
        });
    }, 1800);
  } else throw new Error(`Unknown load ${kind}`);
}
// Override the harness's preset after it places its camera; frame only player 2 from behind/side.
setInterval(() => window.__debugCam!.set([x + 5.5, y + 3.7, z + 6.5], [x, y + 1.1, z], 45), 100);
await wait(4200);
if (who === '1') {
  const remote = [...remotes.values()].find((r) => r.avatar);
  const load = remote?.avatar?.getObjectByName('place-carried');
  const pet = scene.getObjectByName('place-pet');
  if (kind === 'missing' || kind === 'invalid') {
    if (load || pet) throw new Error(`${kind}: stale remote load/pet`);
  } else if (kind === 'pet') {
    if (!pet?.visible) throw new Error('Partner pet missing');
  } else if (kind !== 'logs' && !load) throw new Error(`Partner ${kind} missing`);
  console.log(
    `PARTNER ${kind}: remote avatar ${!!remote?.avatar}, worn load ${!!load}, pet ${!!pet}; inspection ready`,
  );
}
export {};

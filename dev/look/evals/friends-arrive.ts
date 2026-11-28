// npm run look -- --real --players 2 --rail-seed ring-joined --size 1200x750 --eval dev/look/evals/friends-arrive.ts --warm 1 --frames 3 --seconds 1 --wall 245 --name friends-reunion --question "Does the returning friend first appear beside the waiting player at Ring Island?"
// npm run look -- --real --rail-seed ring-joined --size 1200x750 --eval dev/look/evals/friends-arrive.ts --until "(sessionStorage.friendReload && import('/dev/look/evals/friends-arrive.ts'), !!document.body?.dataset.friendArrival)" --warm 65 --frames 3 --seconds 1 --wall 200 --name friends-home --question "Does a solo expired return settle dry at the hall pad facing the boards?"
const { me } = (await import('/src/player/player.ts' as string)) as typeof import('../../../src/player/player.ts');
const { teleport } = (await import(
  '/src/physics/engine.ts' as string
)) as typeof import('../../../src/physics/engine.ts');
const { remotes, onRemotePresence, onPeerRemoved, getRoomId } = (await import(
  '/src/netplay/net.ts' as string
)) as typeof import('../../../src/netplay/net.ts');
const { identity } = (await import(
  '/src/player/identity.ts' as string
)) as typeof import('../../../src/player/identity.ts');
const { railwayRoomId } = (await import(
  '/src/world/railway-namespace.ts' as string
)) as typeof import('../../../src/world/railway-namespace.ts');
const { returnKey, returnSettle, storedReturn } = (await import(
  '/src/place/return-settle.ts' as string
)) as typeof import('../../../src/place/return-settle.ts');
const { jumpOf } = (await import(
  '/src/world/railway-jump.ts' as string
)) as typeof import('../../../src/world/railway-jump.ts');
const { HALL_PAD } = (await import(
  '/src/place/works-landing.ts' as string
)) as typeof import('../../../src/place/works-landing.ts');
const { coverLifted } = (await import(
  '/src/boot/cover-hold.ts' as string
)) as typeof import('../../../src/boot/cover-hold.ts');
const ring = jumpOf('steel-kit')!.land!;
const role = new URLSearchParams(location.search).get('player');
const flat = (a: { x: number; z: number }, b: { x: number; z: number }) => Math.hypot(a.x - b.x, a.z - b.z);
const until = async (condition: () => boolean, what: string) => {
  const end = performance.now() + 80000;
  while (!condition()) {
    if (performance.now() > end) throw new Error('friends-arrive: ' + what);
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
};
const key = returnKey(railwayRoomId(getRoomId()), identity.pid);
if (sessionStorage.friendReload) {
  const record = storedReturn(localStorage, key, Date.now());
  if (!record.had || record.spot) throw new Error('Expected an expired record');
  await until(
    () => !!me.body && me.entered && coverLifted() && !returnSettle.pending() && me.coyote > 0,
    'solo failed to settle',
  );
  const p = me.body!.position;
  if (flat(p, HALL_PAD) > 1 || me.swimming || Math.abs(me.yaw - HALL_PAD.yaw) > 0.1)
    throw new Error('Solo missed Home hall: ' + JSON.stringify(p));
  window.__debugCam?.clear();
  console.log('FRIENDS SOLO', JSON.stringify({ x: p.x, y: p.y, z: p.z, yaw: me.yaw, swimming: me.swimming }));
  document.body.dataset.friendArrival = 'home';
} else if (role === '1') {
  await until(
    () => !!me.body && me.entered && [...remotes.values()].some((r) => r.entered),
    'other player never entered',
  );
  let rejoining = false,
    packets = 0,
    homePackets = 0,
    farthest = 0,
    drawn = 0,
    homeFrames = 0;
  let first: unknown,
    standing = false;
  onPeerRemoved(() => {
    rejoining = true;
    console.log('FRIENDS WATCH previous connection closed');
  });
  onRemotePresence((r, pr) => {
    if (!rejoining || !r.entered || !Array.isArray(pr.p)) return;
    const p = { x: Number(pr.p[0]), y: Number(pr.p[1]), z: Number(pr.p[2]) };
    if (!first) console.log('FRIENDS FIRST', JSON.stringify({ p, state: pr.s, watcher: me.body?.position }));
    first ??= p;
    packets++;
    farthest = Math.max(farthest, flat(p, ring));
    if (flat(p, HALL_PAD) < 150) homePackets++;
    standing = pr.s === 0 && Math.abs(p.y - ring.y) < 2;
  });
  const frame = () => {
    const other = [...remotes.values()].find((r) => r.entered && r.avatar?.visible);
    if (rejoining && other?.avatar) {
      drawn++;
      if (flat(other.avatar.position, HALL_PAD) < 150) homeFrames++;
    }
    if (!document.body.dataset.friendArrival) requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
  const b = me.body!;
  teleport(b, ring.x, ring.y + 1, ring.z);
  b.velocity.set(0, 0, 0);
  await until(
    () => packets >= 12 && drawn > 0 && standing,
    'no standing returning peer at Ring; first pose ' + JSON.stringify(first),
  );
  if (homePackets || homeFrames || farthest > 45 || me.swimming || me.coyote <= 0 || flat(b.position, ring) > 3)
    throw new Error(
      'Unexpected reunion ' + JSON.stringify({ homePackets, homeFrames, farthest, watcher: b.position, first }),
    );
  const other = [...remotes.values()].find((r) => r.entered)!.avatar!.position;
  const x = (other.x + b.position.x) / 2,
    z = (other.z + b.position.z) / 2;
  const dx = other.x - b.position.x,
    dz = other.z - b.position.z;
  const gap = Math.max(1, Math.hypot(dx, dz));
  window.__debugCam?.set([x + (6 * dz) / gap, ring.y + 2.8, z - (6 * dx) / gap], [x, ring.y + 1, z], 52);
  console.log(
    'FRIENDS REUNION',
    JSON.stringify({
      first,
      packets,
      drawn,
      homePackets,
      homeFrames,
      farthest,
      watcher: { x: b.position.x, y: b.position.y, z: b.position.z },
    }),
  );
  document.body.dataset.friendArrival = 'reunited';
} else {
  if (role === '2')
    await until(
      () =>
        [...remotes.values()].some((r) => r.entered && r.avatar && flat(r.avatar.position, ring) < 2 && r.state === 0),
      'watcher did not stand at Ring',
    );
  // Run after the game's pagehide writer, so this really reloads a named visitor with an aged record.
  const expire = () => {
    localStorage.setItem(key, JSON.stringify({ ...HALL_PAD, y: 19, at: Date.now() - 86400000 }));
    sessionStorage.friendReload = '1';
  };
  window.addEventListener('pagehide', expire);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) expire();
  });
  console.log(
    'FRIENDS RELOAD',
    JSON.stringify({ nameSaved: !!localStorage.getItem('boogle.name'), before: me.body?.position }),
  );
  setTimeout(() => location.reload(), 150);
}
export {};

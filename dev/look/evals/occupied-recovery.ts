// Two peers choose Get unstuck beyond the Ring Island gap. Stage only the approach.
// Run with look --players 2 --warp-speed 2 --rail-seed crossing-done --eval dev/look/evals/occupied-recovery.ts
const { me } = await import('/src/player/player.ts' as string);
const { teleport } = await import('/src/physics/engine.ts' as string);
const { remotes } = await import('/src/netplay/net.ts' as string);
const { getRailwayUnstuck } = await import('/src/entities/railway/state.ts' as string);
const { ringUnstuckHome } = await import('/src/entities/ring-island/state.ts' as string);
const { ringAt, RING_FORMATION } = await import('/src/sim/railway-ring-layout.ts' as string);
const second = new URLSearchParams(location.search).get('player') === '2';
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const pier = ringUnstuckHome;
const atPier = (p: { x: number; y: number; z: number }) =>
  Math.hypot(p.x - pier.x, p.z - pier.z) < 0.8 && Math.abs(p.y - pier.y) < 2;
if (second) {
  const deadline = performance.now() + 30000;
  while (![...remotes.values()].some((peer) => peer.entered && atPier(peer.target))) {
    if (performance.now() > deadline) throw new Error('Setup: first player never seen at the Pier recovery point');
    await sleep(50);
  }
}
const beyond = ringAt(28000, RING_FORMATION.mid);
teleport(me.body, beyond.x / 100, 10, beyond.z / 100);
getRailwayUnstuck();
const landed = me.body.position;
console.log('COOP recovery placement', JSON.stringify({ second, x: landed.x, y: landed.y, z: landed.z }));
if (
  second &&
  [...remotes.values()].some(
    (peer) =>
      peer.entered &&
      Math.hypot(peer.target.x - landed.x, peer.target.z - landed.z) < 0.8 &&
      Math.abs(peer.target.y - landed.y) < 1,
  )
) {
  throw new Error('Get unstuck placed the second player inside the first player at the Pier');
}
export {};

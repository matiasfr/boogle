// npm run look -- --players 2 --real --eval dev/look/evals/boogler-shadow.ts --until window.__placeDone
// Scripted diagnostic inputs (teleports and bg facts), not a human interaction/latency claim.
const { net, remotes, getRoomId } = (await import(
  '/src/netplay/net.ts' as string
)) as typeof import('../../../src/netplay/net.ts');
const { railwayRoomId } = (await import(
  '/src/world/railway-namespace.ts' as string
)) as typeof import('../../../src/world/railway-namespace.ts');
const { boogler } = (await import(
  '/src/boogler/boogler.ts' as string
)) as typeof import('../../../src/boogler/boogler.ts');
const { me } = (await import('/src/player/player.ts' as string)) as typeof import('../../../src/player/player.ts');
const { teleport } = (await import(
  '/src/physics/engine.ts' as string
)) as typeof import('../../../src/physics/engine.ts');
const { groundHeight } = (await import(
  '/src/island/terrain.ts' as string
)) as typeof import('../../../src/island/terrain.ts');
// Vite injects the local server address in its transformed module, not in this eval body.
const envText = await (await fetch('/src/netplay/net.ts')).text();
const server = /"VITE_BOOGLE_SERVER"\s*:\s*"([^"]+)"/.exec(envText)?.[1];
if (!server || !/^http:\/\/127\.0\.0\.1:\d+$/.test(server)) throw new Error('local server address unavailable');
const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
for (let n = 0; n < 120 && (!net.room || remotes.size < 1 || !me.body); n++) await sleep(250);
if (!net.room || remotes.size < 1 || !me.body) throw new Error('two clients did not meet');
const player = new URLSearchParams(location.search).get('player') ?? '1';
const status = async () => {
  const response = await fetch(`${server}/rooms/${railwayRoomId(getRoomId())}/host`);
  if (!response.ok) throw new Error(`status ${response.status}`);
  return response.json();
};
let phase = 'wander';
// Override only the diagnostic player's continuous presence facts. Keep the production g publisher and brain intact.
Object.defineProperties(boogler.me, {
  act: { configurable: true, get: () => (phase === 'talk' ? 1 : phase === 'ride' ? 2 : 0), set: () => {} },
  wary: { configurable: true, get: () => phase === 'wary', set: () => {} },
});
const results = [];
for (const next of ['wander', 'approach', 'talk', 'ride', 'wary', 'release']) {
  phase = next;
  for (let sample = 0; sample < 40; sample++) {
    const d = phase === 'wander' || phase === 'release' ? 18 : phase === 'approach' ? 6 : phase === 'ride' ? 0 : 2;
    const x = boogler.disp.x + d + (player === '2' ? 0.5 : 0),
      z = boogler.disp.z;
    teleport(me.body!, x, groundHeight(x, z) + 0.7, z);
    me.body!.velocity.set(0, 0, 0);
    await sleep(200);
    if (player === '1' && sample % 5 === 4) {
      const s = await status();
      results.push({
        phase,
        tick: s.tick,
        players: s.players,
        boogler: s.boogler,
        meter: s.booglerMeter,
        steps: s.steps,
      });
    }
  }
}
if (player === '1') console.log('BOOGLER SHADOW ' + JSON.stringify(results));
(window as Window & { __placeDone?: boolean }).__placeDone = true;
export {};

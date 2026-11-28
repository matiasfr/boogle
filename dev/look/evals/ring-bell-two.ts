// npm run look -- --rail-seed ring-bellhouse --players 2 --real --eval dev/look/evals/ring-bell-two.ts --until window.__bellSeen --cam 1409,15,-832 --look 1388,16,-846 --fov 65 --size 820x560 --wall 225 --frames 3 --seconds 0.7 --name v85-west-signal
// The platform observer must see a pull from inside the cottage.
const { me } = (await import('/src/player/player.ts' as string)) as typeof import('../../../src/player/player.ts');
const { teleport } = (await import(
  '/src/physics/engine.ts' as string
)) as typeof import('../../../src/physics/engine.ts');
const { interactTarget } = (await import(
  '/src/player/hands.ts' as string
)) as typeof import('../../../src/player/hands.ts');
const { triggerAction } = (await import(
  '/src/player/controls.ts' as string
)) as typeof import('../../../src/player/controls.ts');
const { scene } = (await import('/src/render/scene.ts' as string)) as typeof import('../../../src/render/scene.ts');
const { ringAt } = (await import(
  '/src/sim/railway-ring-layout.ts' as string
)) as typeof import('../../../src/sim/railway-ring-layout.ts');
const puller = new URLSearchParams(location.search).get('player') === '2';
const at = puller ? ringAt(47300, -2640) : ringAt(46400, -760);
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const { background } = (await import('/src/async.ts' as string)) as typeof import('../../../src/async.ts');
background(
  (async () => {
    while (!me.body) await wait(50);
    teleport(me.body, at.x / 100, puller ? 10 : 9.6, at.z / 100);
    me.body.velocity.set(0, 0, 0);
    const deadline = performance.now() + 45000;
    let last = -Infinity;
    while (performance.now() < deadline) {
      if (puller && performance.now() - last > 2200 && interactTarget()?.id === 'ring.bell') {
        triggerAction('interact', 'down');
        triggerAction('interact', 'up');
        last = performance.now();
        console.log('Ring bell pulled inside cottage');
      }
      if (scene.getObjectByName('ring:bell-signal')?.visible) {
        (window as Window & { __bellSeen?: boolean }).__bellSeen = true;
        console.log(puller ? 'Puller saw bell swing' : 'Platform observer saw the bell signal');
        if (!puller) break;
      }
      await wait(100);
    }
    if (!(window as Window & { __bellSeen?: boolean }).__bellSeen) throw new Error('No bell signal on this page');
  })(),
  'Ring Island bell witness',
);
export {};

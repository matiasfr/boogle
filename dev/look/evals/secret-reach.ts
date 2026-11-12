// The lookout's secret box (the mossy scarf) on a fresh production world: stand on the ground against its block, or up
// on it, and say whether Open the crate is offered (src/player/reach.ts). Also prints, for every secret box, whether any
// ground round it within reach is offered (a raised one shouldn't be) and how much ground round a ground box isn't.
//   npm run look -- --query 'shot=play&spot=ground' --eval dev/look/evals/secret-reach.ts --hud --name reach-ground
//   npm run look -- --query 'shot=play&spot=top' --eval dev/look/evals/secret-reach.ts --hud --name reach-top
const { me, cam } = (await import('/src/player/player.ts' as string)) as typeof import('../../../src/player/player.ts');
const { teleport } = (await import(
  '/src/physics/engine.ts' as string
)) as typeof import('../../../src/physics/engine.ts');
const { interactTarget } = (await import(
  '/src/player/hands.ts' as string
)) as typeof import('../../../src/player/hands.ts');
const { inReach } = (await import('/src/player/reach.ts' as string)) as typeof import('../../../src/player/reach.ts');
const { H } = (await import('/src/place/land.ts' as string)) as typeof import('../../../src/place/land.ts');
const { ORIGIN } = (await import('/src/place/layout.ts' as string)) as typeof import('../../../src/place/layout.ts');
const { SECRETS, padById } = (await import(
  '/src/place/tech-layout.ts' as string
)) as typeof import('../../../src/place/tech-layout.ts');
const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));
const ox = ORIGIN.x;
for (const s of SECRETS) {
  const x = s.x + ox,
    base = { x, y: s.y ?? H(x, s.z), z: s.z };
  let offered = 0,
    refused = 0,
    before = 0, // the old rule: within 2.6 m of the body's centre, either way
    low = Infinity,
    high = -Infinity;
  for (let a = 0; a < 48; a++)
    for (const d of [0.5, 1.25, 2, 2.8, 3.35]) {
      const px = x + Math.cos((a / 48) * Math.PI * 2) * d,
        pz = s.z + Math.sin((a / 48) * Math.PI * 2) * d,
        g = H(px, pz);
      low = Math.min(low, g);
      high = Math.max(high, g);
      if (Math.abs(g + 0.45 - base.y) <= 2.6) before++;
      if (inReach({ x: px, y: g + 0.45, z: pz }, base, 3.4)) offered++;
      else refused++;
    }
  console.log(
    `PLAY reach ${s.id} ${s.y === null ? 'ground' : 'raised'} base ${base.y.toFixed(2)} ground ${low.toFixed(2)}..${high.toFixed(2)}: from the ground ${offered} offered, ${refused} refused (old rule ${before} offered)`,
  );
}
// Keep the player's own camera, so the still shows the prompt (or none) as you'd see it.
window.__debugCam!.set = () => {};
await (async () => {
  const end = performance.now() + 60000;
  while (!me.body && performance.now() < end) await wait(100);
})();
const spot = new URLSearchParams(location.search).get('spot') ?? 'ground';
const lk = padById('lookout'),
  x = lk.x + ox,
  z = lk.z;
// On the ground: against the block's east face, 2.6 m from the box (its block is solid all the way down). On top: a metre
// and a half from the box.
const at =
  spot === 'top' ? { x: x + 1.5, y: lk.top + 1, z: z + 0.6 } : { x: x + 2.6, y: H(x + 2.6, z + 0.6) + 1, z: z + 0.6 };
teleport(me.body!, at.x, at.y, at.z);
me.body!.velocity.set(0, 0, 0);
cam.yaw = me.yaw = Math.atan2(at.x - x, at.z - z);
await wait(2500);
console.log(`PLAY reach spot ${spot}: target ${interactTarget()?.id ?? 'none'} at y ${me.body!.position.y.toFixed(2)}`);
export {};

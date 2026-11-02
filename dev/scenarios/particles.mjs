// Cosmetic dust and spray from the shared pool (src/render/particles.ts): a ball landing on sand, a
// hard-landing splat and a splash, fired together beside the seed stall so their looks can be compared in one still.
const HEAD = `
  const { teleport } = await import('/src/physics/physics.ts');
  const { groundHeight } = await import('/src/island/terrain.ts');
  const { claimBall } = await import('/src/physics/ball.ts');
  const { splash } = await import('/src/render/splash.ts');
  const { particleCounts } = await import('/src/render/particles.ts');
  const { me, ball } = window.boogle;`;
const FX = `${HEAD}
  teleport(me.body, 14.5, groundHeight(14.5, 22.5) + 14, 22.5);
  me.body.velocity.set(0, -6, 0);
  claimBall(false);
  ball.held = false;
  teleport(ball.body, 11.5, groundHeight(11.5, 20) + 5, 20);
  ball.body.velocity.set(0, -16, 0);
  splash(9.5, 23, 1, groundHeight(9.5, 23) + 0.05);
  // the most particles alive at once over the next 3 s
  const most = (window.__mostParticles = { soft: 0 });
  const t0 = performance.now();
  const peek = () => {
    const n = particleCounts();
    most.soft = Math.max(most.soft, n.soft);
    if (performance.now() - t0 < 3000) requestAnimationFrame(peek);
  };
  peek();`;

export default {
  about: 'ball puff, splat dust and a splash show up',
  async run(t) {
    const g = await t.open({ name: 'dusty' });
    await g.view({ cam: [12, 4.5, 29], look: [12, 0.8, 21] });
    await g.waitFor(`(async () => (await import('/src/world/sync.ts')).worldStatus().ready)()`, { timeout: 20000 });
    for (let k = 0; k < 2; k++) {
      await g.eval(FX);
      await t.sleep(150);
      const still = await g.still('fx' + k);
      await t.sleep(3000);
      const n = await g.eval('return window.__mostParticles;');
      t.check('dust and spray are in the air', n.soft > 20, `${JSON.stringify(n)} ${still}`);
    }
  },
};

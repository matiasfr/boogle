// Presents for The Boogler (ea29f9f): shake ripe fruit off a palm and pick it up; things wash up on the home beach.
// Page code: the ripe palm nearest home, with its position.
const PALM = `
  const { trees } = await import('/src/props.js');
  const { gifts } = await import('/src/gifts.js');
  const { isRipe } = await import('/src/sim/gifts.js');
  const { world } = await import('/src/world/sync.js');
  let best = null;
  gifts.trees.forEach((_, t) => {
    if (!isRipe(gifts, t, world.tick)) return;
    const d = Math.hypot(trees[t].x - 12, trees[t].z - 21);
    const top = trees[t].top;
    if (!best || d < best.d) best = { t, d, x: trees[t].x, z: trees[t].z, top: [top.x, top.y, top.z] };
  });
  return best;`;
const STAND = (x, z) => `
  const { groundHeight } = await import('/src/terrain.js');
  const b = window.boogle.me.body;
  b.position.set(${x}, groundHeight(${x}, ${z}) + 1, ${z}); b.velocity.set(0, 0, 0);
  return groundHeight(${x}, ${z});`;
const ACT = `return (await import('/src/gifts.js')).pickupAction()`;

export default {
  about: 'shake fruit off a palm and pocket it; finds on the beach',
  async run(c) {
    const g = await c.open({ room: 'clipgifts', hud: 'play' });
    await g.wait(3);
    const palm = await g.eval(PALM);
    if (!palm) throw new Error('no ripe palm');
    const px = palm.x + 1.6,
      pz = palm.z + 0.4;
    const y = await g.eval(STAND(px, pz));
    const out = [];
    // Start on the canopy (the fruit), follow it down when the palm is shaken, then watch it go into the pocket. The
    // camera stands off to the side so the player doesn't block the trunk.
    const side = Math.atan2(pz - palm.z, px - palm.x) + 1.35;
    const [tx, ty, tz] = palm.top;
    const ground = [px - 0.6, y + 0.4, pz];
    out.push(
      await g.record('gifts-palm', {
        seconds: 5.5,
        each: async (t, k) => {
          if (k < 30 && k % 3 === 0) await g.eval(STAND(px, pz));
          if (k === 24) await g.eval(ACT); // shake
          if (k === 96) await g.eval(ACT); // pick up what fell
          const u = c.ease.inOut(Math.min(1, Math.max(0, (t - 0.9) / 1.2)));
          const look = [tx, ty - 0.6, tz].map((v, i) => v + (ground[i] - v) * u);
          const d = 6.5 - u * 2.5,
            a = side + t * 0.04;
          await g.view({ cam: [look[0] + Math.cos(a) * d, y + 2.6 - u * 0.8, look[2] + Math.sin(a) * d], look });
        },
      }),
    );
    // Things that washed up: fast-forward the shared clock until a few lie on the beach, then glide along them.
    const items = await g.eval(`
      const { gifts } = await import('/src/gifts.js');
      const { updateWorld, world } = await import('/src/world/sync.js');
      const t0 = world.tick;
      while (gifts.items.filter((it) => it.src === 0).length < 5 && world.tick < t0 + 3000) updateWorld(0.1);
      const { CELL, HALF } = await import('/src/constants.js');
      return gifts.items.filter((it) => it.src === 0).map((it) => [-HALF + it.i * CELL, HALF - it.j * CELL, it.kind]);`);
    if (items.length) {
      // The find with the most company within 8 m, so several share the frame.
      const near = (a) => items.filter((b) => Math.hypot(a[0] - b[0], a[1] - b[1]) < 8).length;
      const [x, z] = items.reduce((a, b) => (near(b) > near(a) ? b : a));
      await g.eval(STAND(x + 30, z + 30));
      // Look from the land side, out over the find toward the sea: the direction where the ground is highest.
      const [gy, a] = await g.eval(`
        const { groundHeight } = await import('/src/terrain.js');
        let a = 0, best = -1e9;
        for (let k = 0; k < 16; k++) {
          const b = (k / 16) * Math.PI * 2, h = groundHeight(${x} + Math.cos(b) * 6, ${z} + Math.sin(b) * 6);
          if (h > best) (best = h), (a = b);
        }
        return [groundHeight(${x}, ${z}), a];`);
      const from = (d, h, da) => [x + Math.cos(a + da) * d, gy + h, z + Math.sin(a + da) * d];
      out.push(
        await g.record('gifts-beach', {
          seconds: 5,
          each: c.move(
            { cam: from(4.5, 2, 0.5), look: [x, gy + 0.2, z] },
            { cam: from(2.2, 0.9, 0.2), look: [x, gy + 0.2, z] },
            5,
          ),
        }),
      );
    }
    return out;
  },
};

// Presents for The Boogler (ea29f9f): shake ripe fruit off a palm and pick it up.
import { STAND } from './_stand.mjs';

// Page code: the ripe palm nearest home, with its position.
const PALM = `
  const { trees } = await import('/src/render/props.js');
  const { isRipe } = await import('/src/sim/gifts.js');
  const { gifts, sync: { world } } = window.boogle;
  let best = null;
  gifts.trees.forEach((_, t) => {
    if (!isRipe(gifts, t, world.tick)) return;
    const d = Math.hypot(trees[t].x - 12, trees[t].z - 21);
    const top = trees[t].top;
    if (!best || d < best.d) best = { t, d, x: trees[t].x, z: trees[t].z, top: [top.x, top.y, top.z] };
  });
  return best;`;
// A press of the interact button (E, pad B), through the controls registry.
const ACT = `const a = (await import('/src/player/controls.js')).actionById('interact'); a.down(); a.up();`;

export default {
  about: 'shake fruit off a palm and pocket it',
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
    return out;
  },
};

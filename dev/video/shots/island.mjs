// The island: a pull-back reveal from home, the windmill farm, the lighthouse lighting up at dusk.
// Places come from the POI site files, so the shot follows them when they move.
import lighthouse, { PAD_Y } from '../../../src/pois/lighthouse/site.js';
import windmills, { FARM_Y } from '../../../src/pois/windmills/site.js';

const TP = (x, z) => `
  const { groundHeight } = await import('/src/terrain.js');
  const b = window.boogle.me.body;
  b.position.set(${x}, groundHeight(${x}, ${z}) + 1, ${z}); b.velocity.set(0, 0, 0);`;
const SKY = (frac) => `(await import('/src/sky.js')).skyDebug.preview(${frac})`;
const ring = (c, a, d, h) => [c[0] + Math.cos(a) * d, c[1] + h, c[2] + Math.sin(a) * d];

export default {
  about: 'a reveal of the island, the windmill farm, the lighthouse at dusk',
  async run(c) {
    const g = await c.open({ room: 'clipisland' });
    await g.eval(SKY(0.3));
    await g.wait(3);
    const out = [];
    out.push(
      await g.record('island-reveal', {
        seconds: 9,
        each: c.move(
          { cam: [2, 6, 48], look: [4, 3, 10] },
          { cam: [10, 120, 110], look: [lighthouse.x, 0, lighthouse.z + 8] },
          9,
        ),
      }),
    );
    const farm = [windmills.x, FARM_Y + 1, windmills.z];
    await g.eval(TP(farm[0] - 34, farm[2] + 6));
    await g.wait(1);
    out.push(
      await g.record('island-windmills', {
        seconds: 7,
        each: (t) => g.view({ cam: ring(farm, 2.0 + t * 0.07, 34, 9 - t * 0.5), look: [farm[0] + 2, 7, farm[2] - 4] }),
      }),
    );
    const lamp = [lighthouse.x, PAD_Y + 5, lighthouse.z];
    await g.eval(TP(lamp[0] + 4, lamp[2] + 30));
    await g.eval(SKY(0.5));
    await g.wait(1);
    out.push(
      await g.record('island-lighthouse', {
        seconds: 9,
        each: async (t) => {
          await g.eval(SKY(0.5 + Math.min(1, t / 6) * 0.13));
          await g.view({ cam: ring(lamp, 2.6 - t * 0.05, 30, 2 - t * 0.2), look: [lamp[0], lamp[1] + 1, lamp[2]] });
        },
      }),
    );
    return out;
  },
};

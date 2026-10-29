// The bigger island (493ef26): a pull-back reveal from home, the windmill farm, the lighthouse lighting up at dusk.
const TP = (x, z) => `
  const { groundHeight } = await import('/src/terrain.js');
  const b = window.boogle.me.body;
  b.position.set(${x}, groundHeight(${x}, ${z}) + 1, ${z}); b.velocity.set(0, 0, 0);`;
const SKY = (frac) => `(await import('/src/sky.js')).skyDebug.preview(${frac})`;
const ring = (c, a, d, h) => [c[0] + Math.cos(a) * d, c[1] + h, c[2] + Math.sin(a) * d];

export default {
  about: 'a reveal of the 12x island, the windmill farm, the lighthouse at dusk',
  async run(c) {
    const g = await c.open({ room: 'clipisland' });
    await g.eval(SKY(0.3));
    await g.wait(3);
    const out = [];
    out.push(
      await g.record('island-reveal', {
        seconds: 9,
        each: c.move({ cam: [2, 6, 48], look: [4, 3, 10] }, { cam: [10, 150, 175], look: [15, 0, -95] }, 9),
      }),
    );
    const farm = [110, 4, -108];
    await g.eval(TP(70, -70));
    await g.wait(1);
    out.push(
      await g.record('island-windmills', {
        seconds: 7,
        each: (t) => g.view({ cam: ring(farm, 2.0 + t * 0.07, 34, 9 - t * 0.5), look: [farm[0] + 2, 7, farm[2] - 4] }),
      }),
    );
    const lamp = [212, 14, -48];
    await g.eval(TP(176, -26));
    await g.eval(SKY(0.5));
    await g.wait(1);
    out.push(
      await g.record('island-lighthouse', {
        seconds: 9,
        each: async (t) => {
          await g.eval(SKY(0.5 + Math.min(1, t / 6) * 0.13));
          await g.view({ cam: ring(lamp, 2.6 - t * 0.05, 30, 2 - t * 0.2), look: [lamp[0], 15, lamp[2]] });
        },
      }),
    );
    return out;
  },
};

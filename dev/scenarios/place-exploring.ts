// Shared abilities/gates, personal prizes, movement presence, then a genuinely fresh browser profile.
import type { T } from './run.ts';

export default {
  about: 'Exploring progress reaches a partner and a newcomer; secret rewards remain personal',
  timeout: 180000,
  async run(t: T) {
    const room = `explore-${Date.now().toString(36)}`;
    const open = (player: number) =>
      t.open({ name: `Explorer ${player}`, room, query: `proto=place&coop=1&player=${player}`, size: [960, 600] });
    const a = await open(1);
    const b = await open(2);
    const run = async (g: typeof a, player: number) => {
      g.page.on('console', (m) => m.text().startsWith('COOP ') && console.log(m.text()));
      await g.eval(
        `const { explore } = await import('/dev/look/evals/place-exploring.ts'); void explore('${player}');`,
      );
    };
    await run(a, 1);
    await run(b, 2);
    for (const [g, player] of [
      [a, 1],
      [b, 2],
    ] as const) {
      await g.waitFor('window.__placeExplore?.done || window.__placeExplore?.error', { timeout: 90000 });
      const r = await g.eval('return window.__placeExplore');
      if (!t.check(`player ${player} exploration contract`, r?.done && !r.error, JSON.stringify(r))) return;
    }
    const c = await open(3);
    await run(c, 3);
    await c.waitFor('window.__placeExplore?.done || window.__placeExplore?.error', { timeout: 30000 });
    const r = await c.eval('return window.__placeExplore');
    t.check('fresh newcomer inherits shared progress only', r?.done && !r.error, JSON.stringify(r));
    for (const [i, g] of [a, b, c].entries()) console.log(await g.still(`explorer-${i + 1}`));
  },
};

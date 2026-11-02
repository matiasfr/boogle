// A grown mushroom bounces you: grow one on open grass, drop the player onto the middle of its cap from 2 m above, and
// record the body's height for 2.5 s. The first bounce has to lift you well clear of the cap (an owner's playtest found
// you stuck on top, re-landing every frame). A motion sheet of the bounce. Serves DESIGN.md 1 and 10.
import { TP } from './lib/world.ts';

type Game = {
  eval: (body: string) => Promise<unknown>;
  waitFor: (expr: string, opts?: { timeout?: number }) => Promise<number>;
  view: (v: { cam: number[]; look: number[] }, fov?: number) => Promise<void>;
  motion: (label: string, o: { frames: number; seconds: number }) => Promise<{ sheet: string; score: number }>;
};
type Run = {
  open: (o: { name: string; room: string; hud?: boolean; query?: string }) => Promise<Game>;
  check: (label: string, ok: boolean, detail?: string) => void;
  sleep: (ms: number) => Promise<void>;
};

const MIN_RISE = 4; // m above the cap the first bounce has to reach (a full-grown bounce is 15 m/s: about 11 m)
const GROWN = `(async () => {
  const { garden } = await import('/src/adapters/mushroom-garden.ts');
  const { GROW_TICKS } = await import('/src/sim/mushrooms.ts');
  return garden.plots.some((p) => p.i === SPOT_I && p.j === SPOT_J && p.g >= GROW_TICKS); })()`;

export default {
  about: 'a player dropped onto a grown mushroom bounces high off it',
  timeout: 180000,
  async run(t: Run) {
    const room = 'mush' + Math.random().toString(36).slice(2, 6);
    const g = await t.open({ name: 'bouncer', room });
    await g.waitFor(`window.boogle?.me?.entered && window.boogle.sync.worldStatus().ready`, { timeout: 90000 });
    await g.eval(`document.querySelector('.first-run-close')?.click();`);

    // Open grass away from the dirt patch, planted and watered through edits.
    const spot = (await g.eval(`
      const { CELL, HALF } = await import('/src/constants.ts');
      const G = await import('/src/adapters/mushroom-garden.ts');
      const { PATCH } = await import('/src/sim/mushrooms.ts');
      for (let r = 8; r < 60; r += 2)
        for (let a = 0; a < 24; a++) {
          const i = Math.round(PATCH.i0 - r * Math.cos(a / 3.8)), j = Math.round(PATCH.j0 - r * Math.sin(a / 3.8));
          if (G.plantOk(i, j)) return { i, j, x: i * CELL - HALF, z: HALF - j * CELL };
        }
      return null;`)) as { i: number; j: number; x: number; z: number } | null;
    t.check('found open ground for a mushroom', !!spot, JSON.stringify(spot));
    if (!spot) return;
    await g.eval(`${TP(spot.x + 6, spot.z)}
      window.boogle.sync.submitEdit({ op: 'mush.plant', i: ${spot.i}, j: ${spot.j} });`);
    await g.waitFor(`(async () => {
      const { garden } = await import('/src/adapters/mushroom-garden.ts');
      return garden.plots.some((p) => p.i === ${spot.i} && p.j === ${spot.j}); })()`);
    await g.eval(`window.boogle.sync.submitEdit({ op: 'mush.water', i: ${spot.i}, j: ${spot.j} });`);
    const grown = await g.waitFor(GROWN.replace('SPOT_I', String(spot.i)).replace('SPOT_J', String(spot.j)), {
      timeout: 60000,
    });
    t.check('the mushroom grows', grown >= 0, grown + ' ms');
    await t.sleep(1500); // the drawn size eases up to full, and the collider follows it

    // The cap's top, from the collider (the body's highest shape).
    const cap = (await g.eval(`
      const { forEachStatic } = await import('/src/physics/engine.ts');
      let top = null;
      forEachStatic(-1, (b, shapes) => {
        if (Math.hypot(b.position.x - ${spot.x}, b.position.z - ${spot.z}) > 0.1 || shapes.length !== 2) return;
        const s = shapes[1];
        top = b.position.y + s.offset.y + s.h / 2;
      });
      return top;`)) as number | null;
    t.check('the grown mushroom has a cap collider', cap !== null, String(cap));
    if (cap === null) return;

    // Drop from 2 m over the cap and record the body's height every frame.
    await g.view({ cam: [spot.x + 9, cap + 3, spot.z + 9], look: [spot.x, cap + 3, spot.z] });
    await g.eval(`${TP(spot.x, spot.z, cap + 2)}
      window.__bounceTrace = [];
      const t0 = performance.now();
      const rec = () => {
        window.__bounceTrace.push([performance.now() - t0, b.position.y, b.velocity.y]);
        if (performance.now() - t0 < 2500) requestAnimationFrame(rec);
      };
      requestAnimationFrame(rec);`);
    const sheet = await g.motion('bounce', { frames: 8, seconds: 2 });
    await t.sleep(600);
    const trace = (await g.eval(`return window.__bounceTrace;`)) as [number, number, number][];
    // The first moment you are near the cap (landed), then the highest you get after it.
    const land = trace.findIndex(([, y]) => y < cap + 1);
    const peak = land < 0 ? -Infinity : Math.max(...trace.slice(land).map(([, y]) => y));
    const maxUp = Math.max(...trace.map(([, , vy]) => vy));
    const rise = peak - cap;
    t.check(
      `landing on a grown mushroom bounces you at least ${MIN_RISE} m`,
      rise >= MIN_RISE,
      `peak ${rise.toFixed(2)} m over the cap, top speed up ${maxUp.toFixed(1)} m/s, ${trace.length} frames; ${sheet.sheet}`,
    );
  },
};

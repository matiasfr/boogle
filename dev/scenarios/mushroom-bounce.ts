// A mushroom bounces you: sprout some on open grass, drop the player onto the middle of its cap from 2 m above, and
// record the body's height for 2.5 s. The first bounce has to lift you well clear of the cap (an owner's playtest found
// you stuck on top, re-landing every frame). A motion sheet of the bounce. Serves DESIGN.md 1 and 10.
import { TP } from './lib/world.ts';

type Game = {
  eval: (body: string) => Promise<unknown>;
  waitFor: (expr: string, opts?: { timeout?: number }) => Promise<number>;
  view: (v: { cam: number[]; look: number[] }, fov?: number) => Promise<void>;
  motion: (label: string, o: { frames: number; seconds: number }) => Promise<{ sheet: string; score: number }>;
  still: (label: string) => Promise<string>;
};
type Run = {
  open: (o: { name: string; room: string; hud?: boolean; query?: string }) => Promise<Game>;
  check: (label: string, ok: boolean, detail?: string) => void;
  sleep: (ms: number) => Promise<void>;
};

const MIN_RISE = 4; // m above the cap the first bounce has to reach (a bounce is 15 m/s: about 11 m)
// How many mushroom colliders a tab has now, as a promise (an earlier cached form read 0 on its first poll, so a
// wait for none passed at once on a tab that never counted).
const CAPS = `import('/src/physics/engine.ts').then(({ forEachStatic }) => { let n = 0; forEachStatic(-1, (b, shapes) => { if (shapes.length === 2 && shapes[1].rTop === 1.9) n++; }); return n; })`;

export default {
  island: true, // the classic island by the court (run.ts)
  about: 'a player dropped onto a sprouted mushroom bounces high off it',
  timeout: 180000,
  async run(t: Run) {
    const room = 'mush' + Math.random().toString(36).slice(2, 6);
    const g = await t.open({ name: 'bouncer', room });
    await g.waitFor(`window.boogle?.me?.entered && window.boogle.sync.worldStatus().ready`, { timeout: 90000 });
    const friend = await t.open({ name: 'friend', room });
    await friend.waitFor(`window.boogle?.me?.entered && window.boogle.remotes.size >= 1`, { timeout: 90000 });
    await g.waitFor(`window.boogle.remotes.size >= 1`, { timeout: 90000 });

    // Open grass: use a bag and let the mushrooms pop up.
    await g.eval(`${TP(-30, 30)} window.boogle.me.yaw = 0;`);
    await t.sleep(400);
    const spot = (await g.eval(`
      const M = await import('/src/adapters/mushrooms.ts');
      const I = await import('/src/player/inventory.ts');
      const H = await import('/src/player/hands.ts');
      const s = M.spotsAhead();
      if (!s.length) return null;
      I.take('seeds');
      H.useDown(); H.useUp();
      return { ground: s.length / 2 };`)) as { ground: number } | null;
    t.check('found open ground for mushrooms', !!spot, JSON.stringify(spot));
    if (!spot) return;
    await t.sleep(1000); // the pop, then the collider
    const seen = await friend.waitFor(`${CAPS}.then((n) => n === ${spot.ground})`, { timeout: 15000 });
    t.check('the other tab sees the same mushrooms', seen >= 0, seen + ' ms');
    // The friend's view of them: framed from beside the cluster, a still to look at (not a check).
    const mid = (await friend.eval(`
      const { forEachStatic } = await import('/src/physics/engine.ts');
      let x = 0, z = 0, y = 0, n = 0;
      forEachStatic(-1, (b, shapes) => {
        if (shapes.length !== 2 || shapes[1].rTop !== 1.9) return;
        x += b.position.x; z += b.position.z; y += b.position.y; n++;
      });
      return n ? [x / n, y / n, z / n] : null;`)) as [number, number, number] | null;
    if (mid) {
      const [mx, my, mz] = mid;
      await friend.view({ cam: [mx + 14, my + 7, mz + 10], look: [mx, my + 1, mz] });
      await friend.still('friend-sees');
    }

    // The cap's top, from the collider (the body's highest shape).
    const found = (await g.eval(`
      const { forEachStatic } = await import('/src/physics/engine.ts');
      let top = null;
      forEachStatic(-1, (b, shapes) => {
        if (shapes.length !== 2 || shapes[1].rTop !== 1.9) return;
        const s = shapes[1];
        top = { x: b.position.x, z: b.position.z, y: b.position.y + s.offset.y + s.h / 2 };
      });
      return top;`)) as { x: number; z: number; y: number } | null;
    t.check('a sprouted mushroom has a cap collider', found !== null, JSON.stringify(found));
    if (found === null) return;
    const { x, z, y: cap } = found;

    // Drop from 2 m over the cap and record the body's height every frame.
    await g.view({ cam: [x + 9, cap + 3, z + 9], look: [x, cap + 3, z] });
    await g.eval(`${TP(x, z, cap + 2)}
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
      `landing on a mushroom bounces you at least ${MIN_RISE} m`,
      rise >= MIN_RISE,
      `peak ${rise.toFixed(2)} m over the cap, top speed up ${maxUp.toFixed(1)} m/s, ${trace.length} frames; ${sheet.sheet}`,
    );

    // They are temporary, on both tabs (the sprouting tab first: the friend's count is 0 too when it never saw them).
    const goneHere = await g.waitFor(`${CAPS}.then((n) => n === 0)`, { timeout: 30000 });
    const gone = await friend.waitFor(`${CAPS}.then((n) => n === 0)`, { timeout: 30000 });
    t.check(
      'the mushrooms wilt away on their own, on both tabs',
      goneHere >= 0 && gone >= 0,
      `${goneHere} / ${gone} ms`,
    );
  },
};

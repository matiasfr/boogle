// The first-run controls card: on a laptop, a small laptop, a phone upright and a phone sideways it is on screen and
// clear of the other HUD pieces (hotbar, roster, connection pill, menu button, touch stick and buttons), and the close
// button dismisses it for good.
import type { T } from './run.ts';

const SIZES = [
  { id: 'laptop', size: [1280, 720] },
  { id: 'small', size: [1024, 600] },
  { id: 'portrait', size: [390, 844], touch: true },
  { id: 'landscape', size: [844, 390], touch: true },
];

const LAYOUT = `
  const box = (e) => { const b = e.getBoundingClientRect(); return { l: b.left, t: b.top, r: b.right, b: b.bottom }; };
  const hit = (a, b) => !(a.r <= b.l || b.r <= a.l || a.b <= b.t || b.b <= a.t);
  const card = document.querySelector('.first-run');
  if (!card) return { has: false };
  const c = box(card);
  const others = ['.hotbar-slot', '.hud-tl', '.net', '.menu-btn', '.stick', '.tbtn']
    .flatMap((s) => [...document.querySelectorAll(s)].filter((e) => e.getClientRects().length).map((e) => [s, box(e)]));
  return { has: true, card: [c.l, c.t, c.r, c.b].map(Math.round),
    inView: c.l >= 0 && c.t >= 0 && c.r <= innerWidth && c.b <= innerHeight,
    hits: [...new Set(others.filter(([, b]) => hit(c, b)).map(([s]) => s))],
    close: !!card.querySelector('.first-run-close') };`;

export default {
  about: 'the first-run card fits every screen, overlaps no HUD piece, and its close button dismisses it',
  timeout: 300000,
  async run(t: T) {
    for (const s of SIZES) {
      const g = await t.open({ name: s.id, hud: true, touch: s.touch, size: s.size });
      await g.wait(0.8);
      // Holding something brings up the held-item buttons (Toss) on a phone.
      if (s.touch) await g.eval(`const I = await import('/src/player/inventory.ts'); I.take('frisbee');`);
      await g.wait(0.4);
      const lay = await g.eval(LAYOUT);
      const shot = await g.still(s.id);
      t.check(
        `${s.id}: the card is on screen and clear of the HUD`,
        lay.has && lay.inView && lay.hits.length === 0,
        `${JSON.stringify(lay)}; ${shot}`,
      );
      if (s.id === 'laptop') {
        await g.eval(`document.querySelector('.first-run-close').click();`);
        const gone = await g.waitFor(`!document.querySelector('.first-run')`, { timeout: 3000 });
        t.check('the close button dismisses it', gone >= 0, `${gone} ms`);
      }
      await g.ctx.close();
    }
  },
};

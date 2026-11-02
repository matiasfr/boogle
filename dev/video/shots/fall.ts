// The fall into the world (aa20c27, bf5c9d9): a first visit rides a trolley above the clouds, Jump in runs it off the
// rail, and you smash through the BOOGLE title on the way down to the island. ?proto=fall replays it (src/features/fall.ts);
// the shot holds back the harness's own Jump in press, so the card scene is on film before the jump.
import type { Shot } from '../clip.ts';

// Before the page's code: swallow the lobby's submit until the shot lets it through (window.__hold = false).
const hold = () => {
  (window as unknown as { __hold: boolean }).__hold = true;
  window.addEventListener(
    'submit',
    (e) => {
      if (!(window as unknown as { __hold: boolean }).__hold) return;
      e.preventDefault();
      e.stopImmediatePropagation();
    },
    true,
  );
};
const JUMP_IN = `window.__hold = false; document.querySelector('#enter').click();`;
const SWATCH = (k: number) => `document.querySelector('#swatch-${k}')?.click();`;
// The game's own HUD comes back after the landing: keep the footage clean.
const CLEAN = `const s = document.createElement('style');
  s.textContent = '.proto-bar, .first-run, .hud-tl, .hud-tr, .reticle, .touch:not(body) { display: none !important }';
  document.head.append(s);`;

export default {
  about: 'the first visit: the trolley above the clouds, off the rail, through the BOOGLE title, a flat landing',
  query: 'proto=fall',
  async run(c) {
    const g = await c.open({ room: 'clipfall', name: 'Sunny Otter', hud: true, init: `(${hold})()` });
    await g.eval(CLEAN);
    await g.wait(1);
    return [
      await g.record('fall-ride', {
        seconds: 20,
        each: async (t, k) => {
          if (k === 25) await g.eval(SWATCH(2));
          if (k === 55) await g.eval(SWATCH(5));
          if (k === 100) await g.eval(JUMP_IN);
          // After the landing, any input stands you up: a short walk among the fallen letters.
          if (k === 450) await g.down('KeyW');
          if (k === 480) await g.up('KeyW');
        },
      }),
    ];
  },
} satisfies Shot;

// The pause view (7491721): H opens it over a world that keeps running; Controls with the Keyboard, Gamepad and Touch
// tabs (generated from the control registry), then the Room page.
import type { Shot } from '../clip.ts';
const PAUSE = `const { openPause } = await import('/src/features/pause.ts'); openPause();`;
const click = (sel: string) => `document.querySelector('dialog.pause ${sel}')?.click();`;

export default {
  about: 'the pause view: the main page, the controls on each input, the room',
  async run(c) {
    const g = await c.open({ room: 'sunny-cove', name: 'Sam', hud: 'play' }); // the room names the view
    await g.wait(3);
    // Behind it, the home beach, the camera drifting (the island keeps going while you read).
    return [
      await g.record('pause-view', {
        seconds: 9,
        each: async (t, k, gg) => {
          if (k === 12) await g.eval(PAUSE);
          if (k === 45) await g.eval(click('[data-act=controls]'));
          if (k === 105) await g.eval(click('.pause-tab:nth-child(2)'));
          if (k === 160) await g.eval(click('.pause-tab:nth-child(3)'));
          if (k === 215) await g.eval(click('[data-act=back]'));
          if (k === 225) await g.eval(click('[data-act=room]'));
          await c.move({ cam: [4, 5, 40], look: [8, 1.5, 14] }, { cam: [14, 4, 38], look: [6, 1.5, 14] }, 9)(t, k, gg);
        },
      }),
    ];
  },
} satisfies Shot;

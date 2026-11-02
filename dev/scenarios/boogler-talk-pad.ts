// Talking to The Boogler with a gamepad on an iPad (the owner's playtests: an iPad in touch mode with a Backbone, so
// body.touch stays on while the pad plays). A fake pad through navigator.getGamepads, polled like a real one, in three
// shapes: the standard mapping (D-pad = buttons 12-15), and a pad without it whose D-pad is axes 6 and 7, or a hat on
// axis 9 (SDL_GameControllerDB's shape for MFi pads). Its id is the one the owner's Backbone reports in Safari on iPad,
// which reads as PlayStation (✕ ○). Each time: X opens the talk, the box hints A Next while the line types, then A Answer, ↑↓ Pick, B Leave; X
// does nothing; the D-pad moves the selection (visibly) and repeats while held; B leaves. No petting: there is no pet
// badge. The shared talk input is src/player/conversation.ts, the pad src/features/gamepad.ts. Serves DESIGN.md 7
// (telegraph everything) and 8 (designed for drop-in).
import { TP } from './lib/world.ts';

type Game = {
  eval: (body: string) => Promise<unknown>;
  waitFor: (expr: string, opts?: { timeout?: number }) => Promise<number>;
  wait: (s: number) => Promise<void>;
  still: (label: string) => Promise<string>;
  errors: string[];
};
type Run = {
  open: (o: {
    name: string;
    hud?: boolean | string;
    touch?: boolean;
    size?: number[];
    init?: () => void;
  }) => Promise<Game>;
  check: (label: string, ok: boolean, detail?: string) => void;
};

// The owner's Backbone as Safari on iPad names it (the MFi "Extended Gamepad" profile; reads as PlayStation), shaped by window.__padShape: 'standard', 'axes'
// (D-pad on axes 6 / 7) or 'hat' (D-pad on axis 9, past 1 when centred). window.__padSet(i, on) presses button i;
// window.__dpad(dir) holds a D-pad direction ('' lets go) in the current shape.
function fakePad() {
  const HAT_IDLE = 9 / 7;
  const pad = {
    id: 'Wireless Controller Extended Gamepad',
    index: 0,
    connected: true,
    mapping: 'standard',
    timestamp: 0,
    axes: [0, 0, 0, 0, 0, 0, 0, 0, 0, HAT_IDLE],
    buttons: Array.from({ length: 17 }, () => ({ pressed: false, value: 0, touched: false })),
  };
  const w = window as unknown as Record<string, unknown>;
  const set = (i: number, on: boolean) => {
    pad.buttons[i].pressed = pad.buttons[i].touched = on;
    pad.buttons[i].value = on ? 1 : 0;
  };
  w.__padSet = set;
  w.__dpad = (dir: string) => {
    const shape = w.__padShape as string;
    pad.mapping = shape === 'standard' ? 'standard' : '';
    // A hat pad has 10 axes, its hat resting past 1; the axes pad has 8 (D-pad on 6 / 7) and no hat.
    pad.axes = shape === 'hat' ? [0, 0, 0, 0, 0, 0, 0, 0, 0, HAT_IDLE] : [0, 0, 0, 0, 0, 0, 0, 0];
    [12, 13, 14, 15].forEach((i) => set(i, false));
    if (!dir) return;
    if (shape === 'standard') set(12 + ['up', 'down', 'left', 'right'].indexOf(dir), true);
    else if (shape === 'axes')
      pad.axes[dir === 'up' || dir === 'down' ? 7 : 6] = dir === 'up' || dir === 'left' ? -1 : 1;
    else pad.axes[9] = -1 + ({ up: 0, right: 2, down: 4, left: 6 } as Record<string, number>)[dir] * (2 / 7);
  };
  w.__padShape = 'standard';
  navigator.getGamepads = () => [pad] as unknown as (Gamepad | null)[];
}

const shown = (sel: string) =>
  `(() => { const e = document.querySelector('${sel}'); return !!e && !e.closest('[hidden]'); })()`;
// He wanders: step up beside him, facing him, on every poll until `check` holds.
const beside = (check: string) => `(async () => {
  const bog = window.boogle.boogler.disp;
  ${TP('bog.x + 2', 'bog.z')}
  const { cam } = await import('/src/player/player.ts');
  cam.yaw = Math.PI / 2; cam.pitch = -0.2; // facing -x, at him
  await new Promise((r) => setTimeout(r, 150));
  return ${check};
})()`;
const OPEN = shown('.bd');
const READY = `${OPEN} && !document.querySelector('.bd-opts').hidden`;
const SEL = `[...document.querySelectorAll('.bd-opt')].findIndex((b) => b.classList.contains('talk-sel'))`;
const HINTS = `(() => { const h = document.querySelector('.bd-hints'); return h.hidden ? '' : h.textContent.replace(/\\s+/g, ' ').trim(); })()`;
// The selected answer is drawn (its outline), not just classed: an iPad keeps body.touch while the pad plays.
const SEL_DRAWN = `(() => { const b = document.querySelector('.bd-opt.talk-sel'); return !!b && getComputedStyle(b).outlineStyle !== 'none'; })()`;

export default {
  about:
    'a Boogler talk on an iPad with a pad (standard, D-pad axes, hat): hints, X idle, D-pad picks and repeats, B leaves',
  timeout: 300000,
  async run(t: Run) {
    // An iPad in touch mode: body.touch by hand, since this harness's touch contexts take blank stills.
    const g = await t.open({ name: 'padtalk', hud: 'play', size: [1180, 820], init: fakePad });
    await g.eval(`document.body.classList.add('touch');`);
    const press = async (i: number) => {
      await g.eval(`window.__padSet(${i}, true);`);
      await g.wait(0.25);
      await g.eval(`window.__padSet(${i}, false);`);
      await g.wait(0.25);
    };
    const dpad = async (dir: string, s = 0.25) => {
      await g.eval(`window.__dpad('${dir}');`);
      await g.wait(s);
      await g.eval(`window.__dpad('');`);
      await g.wait(0.25);
    };

    for (const shape of ['standard', 'axes', 'hat']) {
      // gamepadconnected puts the pad in use (src/features/gamepad.ts), as a real pad's first press would.
      await g.eval(`window.__padShape = '${shape}'; window.__dpad('');
        dispatchEvent(Object.assign(new Event('gamepadconnected'), { gamepad: navigator.getGamepads()[0] }));`);
      const tagMs = await g.waitFor(
        beside(
          `${shown('.boogler-tag-prompt')} && !${OPEN} && !!document.querySelector('.boogler-tag-prompt .g-pad[data-b="x"]')`,
        ),
        { timeout: 30000 },
      );
      if (shape === 'standard') {
        const modes = (await g.eval(
          `return { touch: document.body.classList.contains('touch'), pad: document.body.classList.contains('gamepad') };`,
        )) as { touch: boolean; pad: boolean };
        t.check(
          'an iPad in touch mode, the pad in use (body.touch and body.gamepad)',
          modes.touch,
          JSON.stringify(modes),
        );
      }
      t.check(`${shape}: beside him on a pad, his tag says X Talk`, tagMs >= 0, `${tagMs} ms`);

      await press(2); // X: interact, Talk
      await g.waitFor(OPEN, { timeout: 15000 });
      const early = (await g.eval(`
        const typing = !!document.querySelector('.bd-opts')?.hidden;
        return { typing, hints: ${HINTS}, pet: !!document.querySelector('.bd-pet, button.bd-face') };`)) as {
        typing: boolean;
        hints: string;
        pet: boolean;
      };
      t.check(
        `${shape}: while his line types the hints read Next and Leave; no pet badge`,
        !early.pet &&
          (!early.typing || (/Next/.test(early.hints) && /Leave/.test(early.hints) && !/Answer/.test(early.hints))),
        JSON.stringify(early),
      );
      await g.waitFor(READY, { timeout: 15000 });
      await g.wait(0.3);
      const view = (await g.eval(`
        const { inputState } = await import('/src/player/input.ts');
        const h = document.querySelector('.bd-hints');
        return { hints: ${HINTS}, a: !!h.querySelector('.g-pad[data-b="a"]'), b: !!h.querySelector('.g-pad[data-b="b"]'),
          x: !!h.querySelector('.g-pad[data-b="x"]'), sel: ${SEL}, drawn: ${SEL_DRAWN},
          n: document.querySelectorAll('.bd-opt').length, held: inputState.held };`)) as {
        hints: string;
        a: boolean;
        b: boolean;
        x: boolean;
        sel: number;
        drawn: boolean;
        n: number;
        held: boolean;
      };
      t.check(
        `${shape}: with choices the hints read A Answer, Pick, B Leave (no X); the first answer is selected and drawn`,
        view.n >= 2 &&
          view.a &&
          view.b &&
          !view.x &&
          /Answer/.test(view.hints) &&
          /Pick/.test(view.hints) &&
          /Leave/.test(view.hints) &&
          !/Say|Skip|Next/.test(view.hints) &&
          view.sel === 0 &&
          view.drawn &&
          view.held,
        JSON.stringify(view),
      );
      if (shape === 'standard') {
        const ps = (await g.eval(`return { brand: document.body.dataset.pad, hints: ${HINTS} };`)) as {
          brand: string;
          hints: string;
        };
        t.check(
          "the Backbone's id reads as PlayStation: ✕ Answer, ○ Leave (still: a talk with choices on an iPad)",
          ps.brand === 'ps' && /✕\s*Answer/.test(ps.hints) && /○\s*Leave/.test(ps.hints),
          `${JSON.stringify(ps)}; ${await g.still('talk-ps')}`,
        );
      }

      const say = `document.querySelector('.bd-say').textContent`;
      const before = await g.eval(`return ${say};`);
      await press(2); // X does nothing in a talk
      const x = (await g.eval(
        `return { open: ${OPEN}, sel: ${SEL}, same: ${say} === ${JSON.stringify(before)} };`,
      )) as {
        open: boolean;
        sel: number;
        same: boolean;
      };
      t.check(`${shape}: X does nothing in a talk`, x.open && x.sel === 0 && x.same, JSON.stringify(x));

      await dpad('down');
      const moved = (await g.eval(`return { sel: ${SEL}, drawn: ${SEL_DRAWN} };`)) as { sel: number; drawn: boolean };
      t.check(
        `${shape}: a D-pad down tap selects the next answer, drawn`,
        moved.sel === 1 && moved.drawn,
        JSON.stringify(moved),
      );
      await dpad('up');
      t.check(`${shape}: D-pad up selects the first again`, (await g.eval(`return ${SEL};`)) === 0);
      if (shape === 'standard') {
        // The owner's Backbone reports the standard mapping: a quick tap of button 13, held for only a frame or two.
        const tap = (await g.eval(`
          const frame = () => new Promise((r) => requestAnimationFrame(r));
          window.__padSet(13, true); await frame(); await frame(); window.__padSet(13, false);
          await new Promise((r) => setTimeout(r, 200));
          return { sel: ${SEL}, drawn: ${SEL_DRAWN} };`)) as { sel: number; drawn: boolean };
        t.check(
          'standard: a one-frame tap of button 13 selects the next answer, drawn',
          tap.sel === 1 && tap.drawn,
          JSON.stringify(tap),
        );
        await dpad('up');
      }

      // Held: one pick on the push, then repeats (first after 380 ms, then every 170 ms).
      await g.eval(`
        const { padGrab } = await import('/src/player/controls.ts');
        const grab = padGrab(), fn = grab.fn;
        window.__picks = 0;
        grab.fn = (s) => (s === 'down' && window.__picks++, fn(s));`);
      await dpad('down', 1.3);
      const picks = (await g.eval(`return window.__picks;`)) as number;
      t.check(`${shape}: holding D-pad down repeats`, picks >= 3, `${picks} picks in 1.3 s`);

      if (shape === 'standard') {
        await g.eval(`document.body.dataset.pad = 'xbox';`);
        await g.wait(0.3);
        const xb = (await g.eval(`return ${HINTS};`)) as string;
        t.check(
          'Xbox names: A Answer, B Leave',
          /A\s*Answer/.test(xb) && /B\s*Leave/.test(xb),
          `${xb}; ${await g.still('talk-xbox')}`,
        );
        await g.eval(`document.body.dataset.pad = 'ps';`);
      }

      await press(1); // B
      const after = (await g.eval(`
        const { inputState } = await import('/src/player/input.ts');
        const C = await import('/src/player/controls.ts');
        return { open: ${OPEN}, held: inputState.held, grab: !!C.padGrab() };`)) as {
        open: boolean;
        held: boolean;
        grab: boolean;
      };
      t.check(
        `${shape}: B leaves; the pad and movement come back`,
        !after.open && !after.held && !after.grab,
        JSON.stringify(after),
      );
      await g.wait(2);
    }
    t.check('no page errors', g.errors.length === 0, g.errors.join(' | '));
  },
};

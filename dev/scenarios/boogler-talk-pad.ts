// Talking to The Boogler with a gamepad at iPad size (the owner's playtest: an iPad and a controller). X opens the talk
// (his tag says X Talk), the box shows button hints for the pad (A Say, ↑↓ Pick, B Leave) named for its brand, the
// D-pad moves the selected answer, A says it, B leaves, and you stand still while you talk. The shared talk input is
// src/player/conversation.ts. Serves DESIGN.md 7 (telegraph everything) and 8 (designed for drop-in).
import { TP } from './lib/world.mjs';

type Game = {
  eval: (body: string) => Promise<unknown>;
  waitFor: (expr: string, opts?: { timeout?: number }) => Promise<number>;
  wait: (s: number) => Promise<void>;
  still: (label: string) => Promise<string>;
  errors: string[];
};
type Run = {
  open: (o: { name: string; hud?: boolean | string; size?: number[] }) => Promise<Game>;
  check: (label: string, ok: boolean, detail?: string) => void;
};

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
const C = `const C = await import('/src/player/controls.ts');`;
const PRESS = (slot: string) => `${C} const a = C.actionForSlot('${slot}'); a.down(); a.up();`;
const GRAB = (slot: string) => `${C} C.padGrab()?.fn('${slot}');`;
const OPEN = `${shown('.bd')}`;
const READY = `${OPEN} && !document.querySelector('.bd-opts').hidden`;
const SEL = `[...document.querySelectorAll('.bd-opt')].findIndex((b) => b.classList.contains('talk-sel'))`;
const HINTS = `document.querySelector('.bd-hints')`;

export default {
  about: 'a Boogler talk on a gamepad at iPad size: X talks, hints on the box, D-pad picks, A says, B leaves',
  timeout: 240000,
  async run(t: Run) {
    const g = await t.open({ name: 'padtalk', hud: 'play', size: [1180, 820] });
    await g.eval(`document.body.classList.add('gamepad'); document.body.dataset.pad = 'xbox';`);

    const tagMs = await g.waitFor(
      beside(`${shown('.boogler-tag-prompt')} && !!document.querySelector('.boogler-tag-prompt .g-pad[data-b="x"]')`),
      { timeout: 30000 },
    );
    t.check('beside him on a pad, his tag says X Talk', tagMs >= 0, `${tagMs} ms`);

    await g.eval(PRESS('x'));
    const openMs = await g.waitFor(READY, { timeout: 15000 });
    const view = (await g.eval(`
      const h = ${HINTS};
      const { inputState } = await import('/src/player/input.ts');
      return {
        hints: h.hidden ? '' : h.textContent.replace(/\\s+/g, ' ').trim(),
        a: !!h.querySelector('.g-pad[data-b="a"]'), b: !!h.querySelector('.g-pad[data-b="b"]'),
        sel: ${SEL}, n: document.querySelectorAll('.bd-opt').length, held: inputState.held,
      };`)) as { hints: string; a: boolean; b: boolean; sel: number; n: number; held: boolean };
    t.check(
      'X opens the talk; the box hints A Say, Pick, B Leave; the first answer is selected; you stand still',
      openMs >= 0 &&
        view.a &&
        view.b &&
        /Say/.test(view.hints) &&
        /Leave/.test(view.hints) &&
        view.sel === 0 &&
        view.held,
      JSON.stringify(view),
    );

    await g.eval(GRAB('down'));
    await g.wait(0.3);
    const moved = await g.eval(`return ${SEL};`);
    t.check('D-pad down selects the next answer', moved === 1, `selected ${moved}`);
    t.check('still: a pad talk at iPad size (Xbox names)', true, await g.still('talk-xbox'));

    await g.eval(`document.body.dataset.pad = 'ps';`);
    await g.wait(0.3);
    const ps = (await g.eval(
      `return ${HINTS}.textContent.includes('✕') && ${HINTS}.textContent.includes('○');`,
    )) as boolean;
    t.check('a PlayStation pad names them Cross and Circle', ps, await g.still('talk-ps'));
    await g.eval(`document.body.dataset.pad = 'xbox';`);

    await g.eval(GRAB('up'));
    const before = await g.eval(`return document.querySelector('.bd-say').textContent;`);
    await g.eval(GRAB('a'));
    const said = await g.waitFor(
      `!${OPEN} || document.querySelector('.bd-say').textContent !== ${JSON.stringify(before)}`,
      { timeout: 10000 },
    );
    t.check('A says the selected answer', said >= 0);

    if (await g.eval(`return ${OPEN};`)) {
      await g.eval(GRAB('b'));
      await g.wait(0.3);
    }
    const after = (await g.eval(`
      const { inputState } = await import('/src/player/input.ts');
      ${C}
      return { open: ${OPEN}, held: inputState.held, grab: !!C.padGrab() };`)) as {
      open: boolean;
      held: boolean;
      grab: boolean;
    };
    t.check(
      'B leaves: the box closes and the pad and movement come back',
      !after.open && !after.held && !after.grab,
      JSON.stringify(after),
    );
    t.check('no page errors', g.errors.length === 0, g.errors.join(' | '));
  },
};

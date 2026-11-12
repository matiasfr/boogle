// An iPad with a Magic Keyboard (the owner's playtest device): the page starts in touch mode (coarse pointer), a key
// press or a trackpad click switches to keyboard and mouse (no touch overlay, the reticle), a finger switches back.
// Touch has the HUD menu button; keyboard mode opens the menu with Escape.
// Serves DESIGN.md "Designed for drop-in, drop-out".
type Page = {
  touchscreen: { tap: (x: number, y: number) => Promise<void> };
  mouse: { click: (x: number, y: number) => Promise<void> };
  keyboard: { press: (k: string) => Promise<void> };
};
type Game = {
  page: Page;
  eval: (body: string) => Promise<unknown>;
  waitFor: (expr: string, opts?: { timeout?: number }) => Promise<number>;
  still: (label: string) => Promise<string>;
};
type Run = {
  open: (o: {
    name: string;
    room: string;
    hud?: boolean;
    query?: string;
    touch?: boolean;
    size?: number[];
  }) => Promise<Game>;
  check: (label: string, ok: boolean, detail?: string) => void;
  sleep: (ms: number) => Promise<void>;
};

// The centre of an element, and whether a press there lands on it (nothing on top of it).
const CENTRE = (sel: string) =>
  `const r = document.querySelector('${sel}').getBoundingClientRect(); const x = r.left + r.width / 2, y = r.top + r.height / 2;
   return { x, y, top: !!document.elementFromPoint(x, y)?.closest('${sel}') };`;
type Spot = { x: number; y: number; top: boolean };
const touchMode = `document.body.classList.contains('touch')`;
const PAUSED = `!!document.querySelector('dialog.pause')?.open`;
const CLOSE = `const P = await import('/src/features/pause.ts'); P.closePause();`;

export default {
  about:
    'iPad + keyboard: the input mode follows the last key, trackpad or finger, and touch has the menu button, the keyboard opens the menu with Escape',
  timeout: 240000,
  async run(t: Run) {
    const room = 'proto-ipad' + Math.random().toString(36).slice(2, 6);
    const g = await t.open({ name: 'ipad', room, hud: true, touch: true, size: [1194, 834] });
    await g.waitFor(`window.boogle?.me?.entered`, { timeout: 90000 });
    t.check('starts in touch mode', !!(await g.eval(`return ${touchMode};`)));
    t.check('still: touch mode', true, await g.still('ipad-touch'));

    // Touch: the menu button sits above the touch overlay.
    const menu = (await g.eval(CENTRE('.menu-btn'))) as Spot;
    await g.page.touchscreen.tap(menu.x, menu.y);
    t.check('touch: a tap on the menu button opens the menu', (await g.waitFor(PAUSED, { timeout: 3000 })) >= 0);
    await g.eval(CLOSE);

    // A key press switches to keyboard and mouse.
    await g.page.keyboard.press('KeyW');
    t.check('a key press switches to keyboard and mouse', !(await g.eval(`return ${touchMode};`)));
    t.check(
      'keyboard: no touch overlay, the reticle shows',
      !!(await g.eval(
        `return getComputedStyle(document.getElementById('touch')).display === 'none' && getComputedStyle(document.getElementById('reticle')).display === 'block';`,
      )),
    );
    t.check('still: keyboard mode', true, await g.still('ipad-keyboard'));
    // The menu button is touch-only (src/features/pause.css: body.touch.playing); with a keyboard, Escape opens the menu.
    t.check(
      'keyboard: the menu button is hidden',
      !!(await g.eval(`return getComputedStyle(document.querySelector('.menu-btn')).display === 'none';`)),
    );
    await g.page.keyboard.press('Escape');
    t.check('keyboard: Escape opens the menu', (await g.waitFor(PAUSED, { timeout: 3000 })) >= 0);
    await g.eval(CLOSE);

    // A finger switches back.
    await g.page.touchscreen.tap(800, 400);
    t.check('a tap switches back to touch mode', (await g.waitFor(touchMode, { timeout: 3000 })) >= 0);
  },
};

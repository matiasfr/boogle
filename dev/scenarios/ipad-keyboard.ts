// An iPad with a Magic Keyboard (the owner's playtest device): the page starts in touch mode (coarse pointer), a key
// press or a trackpad click switches to keyboard and mouse (no touch overlay, the reticle), a finger switches back.
// In both modes the HUD's own buttons take presses: the menu button, and the era prototype's "Lay the whole route".
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
const LAID = `(async () => { const { rules } = await import('/src/world/game-world.ts'); return rules.opening.ready(); })()`;

export default {
  about:
    'iPad + keyboard: the input mode follows the last key, trackpad or finger, and HUD buttons take presses in both',
  timeout: 240000,
  async run(t: Run) {
    const room = 'proto-era' + Math.random().toString(36).slice(2, 6);
    const g = await t.open({ name: 'ipad', room, hud: true, touch: true, size: [1194, 834], query: 'proto=era' });
    await g.waitFor(`!!document.querySelector('.era-proto button') && window.boogle?.me?.entered`, { timeout: 90000 });
    await g.eval(`document.querySelector('.first-run-close')?.click();`);
    t.check('starts in touch mode', !!(await g.eval(`return ${touchMode};`)));
    t.check('still: touch mode', true, await g.still('ipad-touch'));

    // Touch: the menu button and the shortcut sit above the touch overlay.
    const era = (await g.eval(CENTRE('.era-proto button'))) as Spot;
    t.check('touch: nothing covers "Lay the whole route"', era.top, JSON.stringify(era));
    let menu = (await g.eval(CENTRE('.menu-btn'))) as Spot;
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
    await g.page.mouse.click(era.x, era.y);
    t.check('keyboard: a click on "Lay the whole route" lays it', (await g.waitFor(LAID, { timeout: 10000 })) >= 0);
    menu = (await g.eval(CENTRE('.menu-btn'))) as Spot;
    await g.page.mouse.click(menu.x, menu.y);
    t.check('keyboard: a click on the menu button opens the menu', (await g.waitFor(PAUSED, { timeout: 3000 })) >= 0);
    await g.eval(CLOSE);

    // A finger switches back; the shortcut is still uncovered.
    await g.page.touchscreen.tap(800, 400);
    t.check('a tap switches back to touch mode', (await g.waitFor(touchMode, { timeout: 3000 })) >= 0);
    const again = (await g.eval(CENTRE('.era-proto button'))) as Spot;
    t.check('touch again: nothing covers the shortcut', again.top, JSON.stringify(again));
  },
};

// The iPad's trackpad and touch, as Safari on iPadOS offers them (research/cross-device-input.md recs 1, 2, 3, 5, 7, 8,
// 15): no Pointer Lock (removed before the page loads), wheel events from a two-finger scroll, a touch screen. Checks
// that hover never flips the input mode, a trackpad click never starts the touch stick, a scroll turns the camera,
// the touch stick has a dead zone, the buttons are tablet-sized, ← → turn without mouse look, and the pause view's
// Fullscreen explains the shoulder-button bug when a pad is connected. Serves DESIGN.md "Designed for drop-in,
// drop-out".
type Page = {
  touchscreen: { tap: (x: number, y: number) => Promise<void> };
  mouse: {
    move: (x: number, y: number, o?: { steps?: number }) => Promise<void>;
    click: (x: number, y: number) => Promise<void>;
    wheel: (dx: number, dy: number) => Promise<void>;
  };
  keyboard: {
    press: (k: string) => Promise<void>;
    down: (k: string) => Promise<void>;
    up: (k: string) => Promise<void>;
  };
  context: () => { newCDPSession: (p: Page) => Promise<{ send: (m: string, a: object) => Promise<unknown> }> };
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
    touch?: boolean;
    size?: number[];
    init?: () => void;
  }) => Promise<Game>;
  check: (label: string, ok: boolean, detail?: string) => void;
  sleep: (ms: number) => Promise<void>;
};

// Safari on iPadOS: no Pointer Lock, a Mac user agent with touch points; a pad shows up once window.__pad is set.
function ipad() {
  delete (Element.prototype as { requestPointerLock?: unknown }).requestPointerLock;
  delete (Document.prototype as { exitPointerLock?: unknown }).exitPointerLock;
  Object.defineProperty(Navigator.prototype, 'maxTouchPoints', { get: () => 5 });
  Object.defineProperty(Navigator.prototype, 'userAgent', {
    get: () =>
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/27.0 Safari/605.1.15',
  });
  const w = window as unknown as { __pad?: boolean };
  const pad = {
    id: 'DualSense Wireless Controller Extended Gamepad',
    index: 0,
    connected: true,
    mapping: 'standard',
    axes: [0, 0, 0, 0],
    buttons: Array.from({ length: 17 }, () => ({ pressed: false, value: 0, touched: false })),
  };
  navigator.getGamepads = () => (w.__pad ? [pad] : []) as unknown as (Gamepad | null)[];
}

const touchMode = `document.body.classList.contains('touch')`;
const PAUSED = `!!document.querySelector('dialog.pause')?.open`;
const CAM = `const { cam } = await import('/src/player/player.ts'); return { yaw: cam.yaw, pitch: cam.pitch };`;
const STICK = `const { input } = await import('/src/player/input.ts');
  return { x: input.stickX, y: input.stickY, shown: getComputedStyle(document.getElementById('stick')).display !== 'none' };`;
type Cam = { yaw: number; pitch: number };
type Stick = { x: number; y: number; shown: boolean };

export default {
  about: 'iPad trackpad and touch: scroll turns the camera, hover never flips modes, stick dead zone, tablet buttons',
  timeout: 240000,
  async run(t: Run) {
    const room = 'ipadtp' + Math.random().toString(36).slice(2, 6);
    const g = await t.open({ name: 'ipad', room, hud: true, touch: true, size: [1194, 834], init: ipad });
    await g.waitFor(`window.boogle?.me?.entered`, { timeout: 90000 });
    await g.eval(`document.querySelector('.first-run-close')?.click();`);
    const { page } = g;
    t.check('no Pointer Lock, as on iPad', !(await g.eval(`return 'requestPointerLock' in Element.prototype;`)));
    t.check('starts in touch mode', !!(await g.eval(`return ${touchMode};`)));
    t.check('still: touch mode at 1194x834', true, await g.still('ipad-tp-touch'));

    // Tablet-sized buttons (rec 8): the main button grows from 76 px.
    const grab = (await g.eval(
      `const r = document.getElementById('btn-grab').getBoundingClientRect(); return [r.width, r.right, r.bottom];`,
    )) as number[];
    t.check('tablet: the main button is at least 100 px', grab[0] >= 100, JSON.stringify(grab));
    t.check('tablet: the main button stays on screen', grab[1] <= 1194 && grab[2] <= 834, JSON.stringify(grab));

    // Touch stick dead zone (rec 7): a real touch through CDP (pointerType 'touch').
    const cdp = await page.context().newCDPSession(page);
    const touch = (type: string, x: number, y: number) =>
      cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y, id: 1 }] });
    await touch('touchStart', 200, 600);
    await touch('touchMove', 205, 600);
    await t.sleep(100);
    const small = (await g.eval(STICK)) as Stick;
    t.check(
      'stick: a 5 px nudge is inside the dead zone',
      small.shown && small.x === 0 && small.y === 0,
      JSON.stringify(small),
    );
    await touch('touchMove', 245, 600);
    await t.sleep(100);
    const push = (await g.eval(STICK)) as Stick;
    t.check('stick: a 45 px push moves', push.x > 0.5 && Math.abs(push.y) < 0.01, JSON.stringify(push));
    await touch('touchEnd', 245, 600);

    // Hover (a trackpad moves the pointer all the time) never leaves touch mode (rec 1).
    await page.mouse.move(150, 500);
    await page.mouse.move(900, 300, { steps: 12 });
    await t.sleep(200);
    t.check('touch mode: hovering the trackpad keeps touch mode', !!(await g.eval(`return ${touchMode};`)));

    // A trackpad click on the stick side switches to keyboard mode and starts no stick (rec 2).
    await page.mouse.click(200, 600);
    await t.sleep(150);
    const click = (await g.eval(STICK)) as Stick;
    t.check('a trackpad click switches to keyboard mode', !(await g.eval(`return ${touchMode};`)));
    t.check('a trackpad click on the left starts no stick', !click.shown && click.x === 0, JSON.stringify(click));
    const hint = (await g.eval(
      `return document.getElementById('hint').hidden ? '' : document.getElementById('hint').textContent;`,
    )) as string;
    t.check('keyboard mode, no lock: the hint says drag or scroll', /scroll/.test(hint), JSON.stringify(hint));
    t.check('still: keyboard mode at 1194x834', true, await g.still('ipad-tp-keyboard'));

    // Two-finger scroll turns the camera (rec 3).
    await page.mouse.move(700, 400);
    const before = (await g.eval(CAM)) as Cam;
    for (let i = 0; i < 6; i++) await page.mouse.wheel(50, 0);
    await t.sleep(200);
    const after = (await g.eval(CAM)) as Cam;
    const turned = after.yaw - before.yaw;
    t.check('a sideways scroll turns the camera (~1 rad)', turned > 0.6 && turned < 1.5, turned.toFixed(3));
    for (let i = 0; i < 4; i++) await page.mouse.wheel(0, -40);
    await t.sleep(200);
    const tilt = ((await g.eval(CAM)) as Cam).pitch - after.pitch;
    t.check('a vertical scroll tilts it', tilt < -0.2, tilt.toFixed(3));
    t.check('the hint goes once you have looked', !!(await g.eval(`return document.getElementById('hint').hidden;`)));

    // ← → turn the camera without mouse look (rec 15).
    const k0 = ((await g.eval(CAM)) as Cam).yaw;
    await page.keyboard.down('ArrowLeft');
    await t.sleep(1000);
    await page.keyboard.up('ArrowLeft');
    const keyTurn = ((await g.eval(CAM)) as Cam).yaw - k0;
    t.check('holding ← for a second turns the camera (2 rad/s)', keyTurn > 1 && keyTurn < 3.5, keyTurn.toFixed(3));

    // A finger switches back; a scroll then switches to keyboard mode again.
    await page.touchscreen.tap(900, 300);
    t.check('a tap switches to touch mode', (await g.waitFor(touchMode, { timeout: 3000 })) >= 0);
    await page.mouse.move(700, 420, { steps: 6 });
    t.check('hover after the tap keeps touch mode', !!(await g.eval(`return ${touchMode};`)));
    await page.mouse.wheel(30, 0);
    t.check('a scroll switches to keyboard mode', (await g.waitFor(`!${touchMode}`, { timeout: 3000 })) >= 0);

    // Fullscreen with a pad on iPad explains WebKit 311151 first (rec 5).
    const opened = await g.eval(
      `window.__pad = true; const P = await import('/src/features/pause.ts'); return P.openPause();`,
    );
    t.check(
      'the pause view opens',
      opened === true && (await g.waitFor(PAUSED, { timeout: 3000 })) >= 0,
      String(opened),
    );
    const fs = (await g.eval(`return !!document.querySelector('[data-act="fullscreen"]');`)) as boolean;
    t.check('the pause view has Fullscreen', fs);
    if (fs) {
      await g.eval(`document.querySelector('[data-act="fullscreen"]').click();`);
      const note = (await g.eval(
        `return [document.querySelector('.pause-note')?.textContent ?? '', document.querySelector('[data-act="fullscreen"]').textContent, !!document.fullscreenElement];`,
      )) as [string, string, boolean];
      t.check(
        'with a pad, Fullscreen explains and suggests Add to Home Screen',
        /Add to Home Screen/.test(note[0]) && note[1] === 'Fullscreen anyway' && !note[2],
        JSON.stringify(note),
      );
      await t.sleep(400);
      // the pause card fades in
      t.check('still: the Fullscreen note', true, await g.still('ipad-tp-fullscreen-note'));
    }
  },
};

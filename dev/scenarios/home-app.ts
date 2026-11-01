// The Home Screen web app on an iPad (the owner's Backbone playtest, 2 Nov 2026): standalone display mode, an iPad Pro
// 11" screen (820 x 1180, portrait numbers as iOS reports them) and a controller that was connected before the page
// loaded, with no gamepadconnected event ever fired. Checks that the pad is found anyway and plays on its first press,
// that the lobby's "press any button" line shows only while no pad is known, that the canvas fills the screen (and
// still does when the viewport comes up a status bar short, as iOS lays it out: WebKit bug 237961), and that a bare
// launch offers "Continue in" the room it was last in. Serves DESIGN.md "Designed for drop-in, drop-out".
type Page = {
  url: () => string;
  goto: (u: string) => Promise<unknown>;
  setViewportSize: (s: { width: number; height: number }) => Promise<void>;
  waitForSelector: (s: string, o?: { timeout?: number }) => Promise<unknown>;
  evaluate: (fn: string) => Promise<unknown>;
};
type Game = {
  page: Page;
  eval: (body: string) => Promise<unknown>;
  waitFor: (expr: string, opts?: { timeout?: number }) => Promise<number>;
  wait: (s: number) => Promise<void>;
  still: (label: string) => Promise<string>;
};
type Run = {
  open: (o: { name: string; hud?: boolean | string; size?: number[]; init?: () => void }) => Promise<Game>;
  check: (label: string, ok: boolean, detail?: string) => void;
};

// Before the page's code: a Home Screen app on an iPad, and a pad that is already there (no event for it).
function homeScreenIpad() {
  Object.defineProperty(Navigator.prototype, 'standalone', { get: () => true });
  Object.defineProperty(Navigator.prototype, 'maxTouchPoints', { get: () => 5 });
  Object.defineProperty(Screen.prototype, 'width', { get: () => 820 });
  Object.defineProperty(Screen.prototype, 'height', { get: () => 1180 });
  const w = window as unknown as { __pad: boolean; __padEvents: number; __press: (i: number, on: boolean) => void };
  w.__pad = true;
  w.__padEvents = 0;
  addEventListener('gamepadconnected', () => w.__padEvents++);
  const pad = {
    id: 'Wireless Controller Extended Gamepad', // what the owner's Backbone reports in Safari on his iPad
    index: 0,
    connected: true,
    mapping: 'standard',
    timestamp: 1,
    axes: [0, 0, 0, 0],
    buttons: Array.from({ length: 17 }, () => ({ pressed: false, value: 0, touched: false })),
  };
  w.__press = (i, on) => {
    pad.buttons[i] = { pressed: on, value: on ? 1 : 0, touched: on };
    pad.timestamp++;
  };
  navigator.getGamepads = () => (w.__pad ? [pad] : []) as unknown as (Gamepad | null)[];
}

const H = `getComputedStyle(document.documentElement).getPropertyValue('--app-h')`;
const CANVAS = `[document.getElementById('view').clientHeight, document.getElementById('view').height]`;

export default {
  about: 'the Home Screen app on iPad: a pad there before load is found, the canvas fills the screen, Continue in',
  timeout: 240000,
  async run(t: Run) {
    const g = await t.open({ name: 'homeapp', hud: true, size: [1180, 820], init: homeScreenIpad });

    const found = (await g.eval(`return {
      brand: document.body.dataset.pad ?? '', events: window.__padEvents,
      hint: !!document.querySelector('.pad-hint'), hintHidden: document.querySelector('.pad-hint')?.hidden ?? null,
    };`)) as { brand: string; events: number; hint: boolean; hintHidden: boolean | null };
    t.check(
      'a pad connected before load is found with no gamepadconnected event; the lobby hint is hidden',
      found.brand === 'ps' && found.events === 0 && found.hint && found.hintHidden === true,
      JSON.stringify(found),
    );

    await g.eval(`window.__press(0, true);`);
    const activeMs = await g.waitFor(`document.body.classList.contains('gamepad')`, { timeout: 5000 });
    await g.eval(`window.__press(0, false);`);
    t.check('its first press switches the game to the pad', activeMs >= 0, `${activeMs} ms`);

    await g.eval(`window.__pad = false; dispatchEvent(new Event('gamepaddisconnected'));`);
    const gone = (await g.eval(`return {
      gamepad: document.body.classList.contains('gamepad'), hintHidden: document.querySelector('.pad-hint').hidden };`)) as {
      gamepad: boolean;
      hintHidden: boolean;
    };
    t.check(
      'unplugged: back to touch, and "Press any button" shows again',
      !gone.gamepad && !gone.hintHidden,
      JSON.stringify(gone),
    );

    const full = (await g.eval(
      `return { appH: ${H}, canvas: ${CANVAS}, fill: document.documentElement.className };`,
    )) as {
      appH: string;
      canvas: number[];
      fill: string;
    };
    t.check(
      'standalone at iPad size: the canvas is the whole 820 px screen',
      /app-fill/.test(full.fill) && full.appH.trim() === '820px' && full.canvas[0] === 820,
      JSON.stringify(full),
    );
    t.check('still: the Home Screen app at iPad size, no bottom strip', true, await g.still('standalone-ipad'));

    // iOS lays a standalone page out a status bar short of the screen; the canvas must still reach the bottom.
    await g.page.setViewportSize({ width: 1180, height: 796 });
    await g.wait(0.5);
    const short = (await g.eval(
      `return { inner: innerHeight, appH: ${H}, canvas: ${CANVAS}, dpr: devicePixelRatio };`,
    )) as {
      inner: number;
      appH: string;
      canvas: number[];
      dpr: number;
    };
    t.check(
      'a viewport 24 px short of the screen: the canvas and its drawing buffer still span the 820 px screen',
      short.inner === 796 && short.appH.trim() === '820px' && short.canvas[0] === 820 && short.canvas[1] >= 819,
      JSON.stringify(short),
    );
    await g.page.setViewportSize({ width: 1180, height: 820 });

    // This visit was in a room; a bare launch of the app offers to go back to it.
    const room = new URL(g.page.url()).searchParams.get('room');
    const saved = await g.eval(`return localStorage.getItem('boogle.lastLaunch');`);
    t.check('a visit to a room is remembered', saved === `room=${room}`, String(saved));
    const bare = new URL(g.page.url());
    bare.search = '?dpr=fixed';
    await g.page.goto(bare.href);
    await g.page.waitForSelector('.continue-last', { timeout: 60000 });
    const label = await g.page.evaluate(`document.querySelector('.continue-last').textContent`);
    t.check('a bare launch offers Continue in that room', label === `Continue in room ${room}`, String(label));
    await g.page.waitForSelector('#enter:not([disabled])', { timeout: 120000 });
    await g.page.evaluate(`document.querySelector('.splash')?.remove()`);
    t.check('still: the lobby with Continue', true, await g.still('continue'));
  },
};

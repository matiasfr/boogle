// A second tab of the same browser is the same player (docs/plans/net-roadmap.md, phase 1): it takes over, the first
// tab stops and says so, and Play here there takes it back. Serves DESIGN.md 8 (you are the same player in any tab).
import type { Page, BrowserContext } from 'playwright';

type Game = {
  page: Page;
  ctx: BrowserContext;
  out: string;
  waitFor: (expr: string, opts?: { timeout?: number }) => Promise<number>;
  errors: string[];
};
type Run = {
  open: (o: { name: string; room: string; hud?: boolean }) => Promise<Game>;
  check: (label: string, ok: boolean, detail?: string) => void;
};

const NET = `(await import('/src/netplay/net.ts')).net`;
const state = (p: Page) =>
  p.evaluate(
    `(async () => { const n = ${NET}; return { state: n.state, error: n.error, card: !!document.querySelector('.elsewhere') }; })()`,
  ) as Promise<{
    state: string;
    error: string | null;
    card: boolean;
  }>;
async function until(p: Page, ok: (s: Awaited<ReturnType<typeof state>>) => boolean, ms: number) {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) {
    if (ok(await state(p).catch(() => ({ state: '', error: null, card: false })))) return Date.now() - t0;
    await new Promise((r) => setTimeout(r, 250));
  }
  return -1;
}
const live = (s: { state: string }) => s.state === 'live';
const told = (s: { state: string; error: string | null; card: boolean }) =>
  s.state === 'solo' && s.error === 'elsewhere' && s.card;

export default {
  about: 'a second tab of one browser takes over the player; the first stops, says so, and can take it back',
  timeout: 300000,
  async run(t: Run) {
    const room = 'st' + Math.random().toString(36).slice(2, 8);
    const A = await t.open({ name: 'first', room, hud: true });
    t.check('the first tab is live', (await until(A.page, live, 30000)) >= 0);

    // On a desktop Jump in takes the pointer lock, and the new tab taking focus ends it, which opens the pause menu just
    // before the server drops this tab (a Windows Edge run, 11 November). Headless Chromium never grants a lock, so
    // fake one and lose it the way a blur does.
    await A.page.evaluate(() => {
      let locked: Element | null = document.querySelector('canvas');
      Object.defineProperty(document, 'pointerLockElement', { configurable: true, get: () => locked });
      document.dispatchEvent(new Event('pointerlockchange'));
      locked = null;
      window.dispatchEvent(new Event('blur'));
      document.dispatchEvent(new Event('pointerlockchange'));
    });

    const B = await A.ctx.newPage(); // same context: same localStorage, so the same pid
    await B.setViewportSize(A.page.viewportSize()!);
    await B.goto(A.page.url());
    // Loaded, so game modules can be imported. Attached, not visible: a returning visit goes straight in
    // (src/player/arrival.ts), past the lobby.
    const loaded = { state: 'attached', timeout: 180000 } as const;
    await B.waitForSelector('#enter:not([disabled])', loaded);
    await B.waitForFunction(() => !!window.__debugCam, null, { timeout: 20000 });
    t.check('the second tab is live', (await until(B, live, 30000)) >= 0);
    const toldMs = await until(A.page, told, 5000);
    const shot = `${A.out}/first-elsewhere.png`;
    await A.page.screenshot({ path: shot });
    t.check('the first tab stops and shows the card', toldMs >= 0, `${toldMs} ms; ${shot}`);
    // Play here is the only way back, so nothing may sit over it: the pause menu (a modal dialog in the top layer,
    // which also makes the card inert) covered its left half.
    const cover = await A.page.evaluate(() => {
      const b = document.querySelector('.elsewhere button')?.getBoundingClientRect();
      if (!b) return 'no button';
      const hits = [0.1, 0.5, 0.9].map((f) => document.elementFromPoint(b.x + b.width * f, b.y + b.height / 2));
      const over = hits.find((e) => !e?.closest('.elsewhere button'));
      const menu = document.querySelector('dialog[open]');
      if (menu) return `open dialog .${menu.className}`;
      return over ? `${over.tagName.toLowerCase()}.${over.className}` : '';
    });
    t.check('nothing covers Play here', cover === '', cover ? `covered by ${cover}; ${shot}` : shot);
    if (cover) return void (await B.close());
    await A.page.keyboard.press('KeyH'); // the controls key opens the menu anywhere else; not over the card
    const menu = await A.page.$eval('body', () => document.querySelector('dialog[open]')?.className ?? '');
    t.check('and H does not open the menu over it', menu === '', menu && `open dialog .${menu}`);
    const pids = await Promise.all(
      [A.page, B].map((p) => p.evaluate(`import('/src/player/identity.ts').then((m) => m.identity.pid)`)),
    );
    t.check('both tabs are one player', pids[0] === pids[1], pids.join(' '));
    await A.page.waitForTimeout(6000);
    t.check('the first tab does not come back by itself', told(await state(A.page)));

    // A real click on a real GPU. On CI's software WebGPU a mouse press doesn't reach the button though the DOM has it on
    // top at its centre (elementsFromPoint: BUTTON, card, dim layer; nightly 41434493212), and a forced press changed
    // nothing (41436663037): the runner's input misses, not the card. So CI presses the button directly.
    await A.page.bringToFront();
    if (process.env.CI) await A.page.dispatchEvent('.elsewhere button', 'click');
    else await A.page.click('.elsewhere button');
    await A.page.waitForSelector('#enter:not([disabled])', loaded);
    t.check('Play here: the first tab is live again', (await until(A.page, live, 60000)) >= 0);
    t.check('with no menu left open', !(await A.page.$('dialog[open]')));
    t.check('and the second tab is told', (await until(B, told, 30000)) >= 0);
    await B.close();
  },
};

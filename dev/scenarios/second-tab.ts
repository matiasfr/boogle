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

    const B = await A.ctx.newPage(); // same context: same localStorage, so the same pid
    await B.setViewportSize(A.page.viewportSize()!);
    await B.goto(A.page.url());
    await B.waitForSelector('#enter:not([disabled])', { timeout: 180000 }); // loaded: game modules can be imported
    t.check('the second tab is live', (await until(B, live, 30000)) >= 0);
    const toldMs = await until(A.page, told, 5000);
    const shot = `${A.out}/first-elsewhere.png`;
    await A.page.screenshot({ path: shot });
    t.check('the first tab stops and shows the card', toldMs >= 0, `${toldMs} ms; ${shot}`);
    const pids = await Promise.all(
      [A.page, B].map((p) => p.evaluate(`import('/src/player/identity.ts').then((m) => m.identity.pid)`)),
    );
    t.check('both tabs are one player', pids[0] === pids[1], pids.join(' '));
    await A.page.waitForTimeout(6000);
    t.check('the first tab does not come back by itself', told(await state(A.page)));

    await A.page.click('.elsewhere button');
    await A.page.waitForSelector('#enter:not([disabled])', { timeout: 180000 });
    t.check('Play here: the first tab is live again', (await until(A.page, live, 60000)) >= 0);
    t.check('and the second tab is told', (await until(B, told, 5000)) >= 0);
    await B.close();
  },
};

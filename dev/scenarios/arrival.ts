// Arrival at iPad size (src/player/arrival.ts, src/features/welcome-back.ts; docs/game-design/first-run.md): a first
// visit gets the short card (a friendly name already filled in, colours, Jump in); a returning visit skips it, lands in
// the world with the saved name and colour and a "Welcome back" card that leaves on its own; and after time away with a
// friend in, the route laid and opening day started, the card says so. Solo in a proto- room (its shortcut lays the
// route). Stills of all three. Serves DESIGN.md 8 (Designed for drop-in) and 9 (Leave something for the next visitor).
type Page = {
  url: () => string;
  goto: (u: string) => Promise<unknown>;
  reload: () => Promise<unknown>;
  click: (s: string) => Promise<void>;
  waitForSelector: (s: string, o?: { timeout?: number }) => Promise<unknown>;
  waitForFunction: (fn: () => unknown, arg: null, o?: { timeout?: number }) => Promise<unknown>;
  addStyleTag: (o: { content: string }) => Promise<unknown>;
};
type Game = {
  page: Page;
  ctx: { close: () => Promise<void> };
  eval: (body: string) => Promise<unknown>;
  waitFor: (expr: string, opts?: { timeout?: number }) => Promise<number>;
  wait: (s: number) => Promise<void>;
  still: (label: string) => Promise<string>;
};
type Run = {
  open: (o: { name: string; room: string; hud?: boolean | string; size?: number[] }) => Promise<Game>;
  check: (label: string, ok: boolean, detail?: string) => void;
};

const IPAD = [1180, 820];
const NO_SPLASH = { content: '.splash { display: none !important }' };
const R = `const { rules } = await import('/src/world/game-world.ts'); const S = await import('/src/world/sync.ts');`;
const CARD = `(() => { const c = document.querySelector('.welcome-back'); return c && { hi: c.querySelector('.welcome-back-hi').textContent,
  lines: [...c.querySelectorAll('.welcome-back-line')].map((p) => p.textContent) }; })()`;

async function reloadIn(g: Game) {
  await g.page.reload();
  await g.page.waitForFunction(() => document.body.classList.contains('playing'), null, { timeout: 180000 });
  await g.page.addStyleTag(NO_SPLASH);
}

export default {
  about:
    'arrival at iPad size: first-visit card, straight in when returning, and a welcome back that says what changed',
  timeout: 420000,
  async run(t: Run) {
    const room = 'proto-arrival' + Math.random().toString(36).slice(2, 6);
    const g = await t.open({ name: 'Ana', room, hud: true, size: IPAD });

    // 1. A first visit: forget the name and load again. The card, with a friendly name filled in.
    await g.eval(`localStorage.clear();`);
    await g.page.reload();
    await g.page.waitForSelector('#enter:not([disabled])', { timeout: 180000 });
    await g.page.addStyleTag(NO_SPLASH);
    await g.wait(0.6);
    const first = (await g.eval(`return { lobby: !document.getElementById('lobby').hidden,
      name: document.getElementById('name-input').value, swatches: document.querySelectorAll('.swatch').length,
      entered: window.boogle.me.entered, words: document.querySelector('.card').innerText.split(/\\s+/).filter(Boolean).length };`)) as {
      lobby: boolean;
      name: string;
      swatches: number;
      entered: boolean;
      words: number;
    };
    const firstShot = await g.still('first-visit');
    t.check(
      'first visit: the card shows with a friendly name filled in, the colours and Jump in, and little else to read',
      first.lobby && first.name.length > 0 && first.swatches > 4 && !first.entered && first.words <= 6,
      `${JSON.stringify(first)}; ${firstShot}`,
    );
    await g.page.click('#enter');
    await g.waitFor(`window.boogle.me.entered`, { timeout: 10000 });
    const saved = await g.eval(`return localStorage.getItem('boogle.name');`);
    t.check('Jump in saves the name for next time', saved === first.name, String(saved));
    await g.waitFor(`!!localStorage.getItem('boogle.visit.${room}')`, { timeout: 20000 });

    // 2. Returning, nothing changed: straight in, no card, a welcome back that leaves on its own.
    await reloadIn(g);
    const back = (await g.eval(
      `return { lobby: document.getElementById('lobby').hidden, name: window.boogle.me.name };`,
    )) as {
      lobby: boolean;
      name: string;
    };
    await g.waitFor(`!!document.querySelector('.welcome-back.shown')`, { timeout: 8000 });
    await g.wait(0.5);
    const quiet = (await g.eval(`return ${CARD};`)) as { hi: string; lines: string[] } | null;
    const quietShot = await g.still('returning');
    t.check(
      'returning: no card, the saved name, and just "Welcome back, <name>"',
      back.lobby && back.name === first.name && quiet?.hi === `Welcome back, ${first.name}` && quiet.lines.length === 0,
      `${JSON.stringify({ back, quiet })}; ${quietShot}`,
    );
    const goneMs = await g.waitFor(`!document.querySelector('.welcome-back')`, { timeout: 8000 });
    t.check('the welcome back leaves on its own', goneMs >= 0, `${goneMs} ms`);

    // 3. Time away: remember the room as it is now, then a friend drops in, the route is laid and opening day starts.
    const memory = await g.eval(`return localStorage.getItem('boogle.visit.${room}');`);
    const bo = await t.open({ name: 'Bo', room, size: [640, 400] });
    await g.waitFor(`(async () => { ${R} return rules.roster.size() >= 2; })()`, { timeout: 20000 });
    await bo.ctx.close();
    await g.eval(`${R} S.submitEdit({ op: 'open.lay', i: 0, j: 0 });`);
    await g.waitFor(`(async () => { ${R} return rules.opening.ready(); })()`, { timeout: 10000 });
    await g.eval(`${R} S.submitEdit({ op: 'open.start', i: 0, j: 0 });`);
    await g.waitFor(`(async () => { ${R} return rules.opening.opening.t0 >= 0; })()`, { timeout: 10000 });
    await g.eval(`${R} S.saveNow?.(true);`);
    await g.wait(1);
    // Put back the memory from before, and keep this tab's last save (every few seconds, and on pagehide) off it.
    await g.eval(`localStorage.setItem('boogle.visit.${room}', ${JSON.stringify(memory)});
      const set = Storage.prototype.setItem;
      Storage.prototype.setItem = function (k, v) { if (!k.startsWith('boogle.visit.')) set.call(this, k, v); };`);
    await reloadIn(g);
    await g.waitFor(`!!document.querySelector('.welcome-back.shown')`, { timeout: 8000 });
    await g.wait(0.5);
    const news = (await g.eval(`return ${CARD};`)) as { hi: string; lines: string[] } | null;
    const newsShot = await g.still('returning-changes');
    const said = news?.lines.join(' / ') ?? '';
    t.check(
      'returning after changes: the card names the friend, the track laid and opening day',
      /Bo was here/.test(said) && /track/.test(said) && /Opening day/.test(said),
      `${JSON.stringify(news)}; ${newsShot}`,
    );
  },
};

// Arrival at iPad size (src/player/arrival.ts, src/features/welcome-back.ts; docs/game-design/first-run.md): a first
// visit gets the short card (a friendly name already filled in, colours, Jump in); a returning visit skips it and lands
// in the world with the saved name and colour and a "Welcome back" card that leaves on its own. Stills of both. Serves
// DESIGN.md 8 (Designed for drop-in) and 9 (Leave something for the next visitor).
//
// The third leg: returning to a room whose railway moved on since. This browser's memory of the fresh room in leg 2 (no
// stretch laid) becomes its memory of a jump room seeded at `q1-done` (T1 to T3 and Q1 laid), and the player comes
// back there: the card names the stretches laid. (Until 11 November this leg laid the classic route with `open.lay`,
// which the railway room refuses.)
type Page = {
  reload: () => Promise<unknown>;
  goto: (url: string) => Promise<unknown>;
  url: () => string;
  click: (s: string) => Promise<void>;
  waitForSelector: (s: string, o?: { timeout?: number }) => Promise<unknown>;
  waitForFunction: (fn: () => unknown, arg: null, o?: { timeout?: number }) => Promise<unknown>;
  addStyleTag: (o: { content: string }) => Promise<unknown>;
};
type Game = {
  page: Page;
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
const CARD = `(() => { const c = document.querySelector('.welcome-back'); return c && { hi: c.querySelector('.welcome-back-hi').textContent,
  lines: [...c.querySelectorAll('.welcome-back-line')].map((p) => p.textContent) }; })()`;

async function reloadIn(g: Game) {
  await g.page.reload();
  await g.page.waitForFunction(() => document.body.classList.contains('playing'), null, { timeout: 180000 });
  await g.page.addStyleTag(NO_SPLASH);
}

export default {
  about: 'arrival at iPad size: first-visit card, then straight in when returning with a welcome back',
  timeout: 420000,
  async run(t: Run) {
    const room = 'arrival' + Math.random().toString(36).slice(2, 6);
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

    // 3. Returning after the railway moved on: what this browser remembered of the fresh room, back in a room with
    // four stretches laid (q1-done). The memory is a real one, written by the visit above; only its room changes.
    const KEY = `boogle.visit.${room}`;
    await g.waitFor(`JSON.parse(localStorage.getItem('${KEY}') || '{}').items?.laid === 0`, { timeout: 20000 });
    const fresh = (await g.eval(`return localStorage.getItem('${KEY}');`)) as string;
    const jump = new URL(g.page.url());
    jump.searchParams.delete('room');
    jump.searchParams.set('from', 'q1-done');
    await g.page.goto(jump.href); // the real jump-in: a fresh private room seeded at q1-done, then the game in it
    await g.page.waitForFunction(() => document.body.classList.contains('playing'), null, { timeout: 180000 });
    const seeded = new URL(g.page.url()).searchParams.get('room') ?? '';
    await g.page.goto(new URL('/menu/', jump).href); // away: the game stops, so nothing writes the memory over
    await g.eval(
      `localStorage.setItem(${JSON.stringify(`boogle.visit.${seeded}`)}, ${JSON.stringify(fresh)}); return 0;`,
    );
    jump.searchParams.delete('from');
    jump.searchParams.set('room', seeded);
    await g.page.goto(jump.href);
    await g.page.waitForFunction(() => document.body.classList.contains('playing'), null, { timeout: 180000 });
    await g.page.addStyleTag(NO_SPLASH);
    await g.waitFor(`!!document.querySelector('.welcome-back.shown')`, { timeout: 8000 });
    await g.wait(0.5);
    const moved = (await g.eval(`return ${CARD};`)) as { hi: string; lines: string[] } | null;
    const movedShot = await g.still('returning-railway');
    t.check(
      'returning after the railway moved on: the card names the stretches of track laid',
      !!seeded &&
        moved?.hi === `Welcome back, ${first.name}` &&
        moved.lines.includes('4 new stretches of track were laid'),
      `${JSON.stringify({ seeded, moved })}; ${movedShot}`,
    );
  },
};

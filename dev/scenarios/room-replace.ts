// Replace room with stage, as two players see it (docs/plans/room-fast-forward.md; docs/game-design/dev-menu.md,
// "Replace room with stage"): Ana replaces the room she and Ben are in from Dev → Room. A wrong key and a wrong room
// name are refused in plain words and tell nobody; the right ones start the countdown on both screens; both pages
// then reload on their own into the stage, land at its landing and read the line. Stills of the dock, the refusal,
// the countdown on both screens and the world after.
//
// The key: the local stack's server takes ADVANCE_KEY from this process (dev/look/lib.ts). When the run has none, this
// file makes a random one for the run, before the stack starts; it is never written to disk or printed. The page gets
// it typed into the dock's Key field, as the owner would.
import crypto from 'node:crypto';
import type { Page } from 'playwright';
import { jumpOf } from '../../src/world/railway-jump.ts';

process.env.ADVANCE_KEY ||= crypto.randomBytes(32).toString('base64');
const KEY = process.env.ADVANCE_KEY;

type Game = {
  page: Page;
  consoleErrors: string[];
  eval: (code: string) => Promise<unknown>;
  waitFor: (expr: string, opts?: { timeout?: number }) => Promise<number>;
  still: (label: string) => Promise<string>;
};
type Run = {
  open: (o: {
    name: string;
    room: string;
    hud?: boolean;
    query?: string;
    size?: number[];
    trace?: boolean;
  }) => Promise<Game>;
  check: (label: string, ok: boolean, detail?: string) => boolean;
  sleep: (ms: number) => Promise<void>;
};

const STAGE = 'q1-done'; // "Cart starts": a row with a landing, by Q2's frame
const LABEL = jumpOf(STAGE)!.label;
const LAND = jumpOf(STAGE)!.land!;
const NOTE = `(document.querySelector('.notify.shown .notify-text')?.textContent ?? '')`;
const STATUS = `(document.querySelector('[data-dev-replace] .dev-status')?.textContent ?? '')`;
const POSE = `(() => { const p = window.boogle.me.body.position; return { x: p.x, y: p.y, z: p.z }; })()`;
const BUTTON = '[data-dev-command="room.replace"]';
const text = async (g: Game, expr: string) => String(await g.eval(`return ${expr};`));
// A refused request is also a console line from the browser itself ("Failed to load resource: ... 401"): expected here.
const forgive = (g: Game, status: number) => {
  for (let i = g.consoleErrors.length - 1; i >= 0; i--)
    if (g.consoleErrors[i]!.includes(`status of ${status}`)) g.consoleErrors.splice(i, 1);
};
async function reloaded(g: Game) {
  await g.page.waitForFunction(
    () => !('__before' in window) && document.body.classList.contains('playing') && !!window.boogle?.me?.body,
    null,
    { timeout: 180000 },
  );
  await g.page.addStyleTag({ content: '.splash { display: none !important }' });
}

export default {
  about: 'replace room with stage: refusals, the countdown on both screens, both land in the stage and read the line',
  timeout: 420000,
  async run(t: Run) {
    const room = 'swap' + Math.random().toString(36).slice(2, 8);
    // No Playwright trace for anyone here: a trace records `fill(KEY)` and the request's Authorization header
    // verbatim, and a failed run keeps its ZIP. `trace: false` overrides the runner's default for these players.
    const A = await t.open({ name: 'Ana', room, hud: true, query: 'dev=1', trace: false });
    const B = await t.open({ name: 'Ben', room, hud: true, trace: false });
    for (const g of [A, B]) await g.waitFor(`window.boogle.remotes.size === 1`, { timeout: 60000 });
    for (const g of [A, B]) await g.eval(`window.__before = 1; return 0;`);

    // 1. The dock's Room tab; the API with no key is refused before anything is sent.
    await A.eval(`await window.boogle.dev.open('room'); return 0;`);
    await A.page.waitForSelector('[data-dev-replace]', { timeout: 20000 });
    await A.page.selectOption('[data-dev-replace] select', STAGE);
    const noKey = (await A.eval(
      `return await window.boogle.dev.run('room', 'replace', { stage: '${STAGE}', confirm: '${room}', override: true });`,
    )) as { ok: boolean; message: string };
    t.check(
      'with no key, the command is refused and nothing is sent',
      !noKey.ok && /key/i.test(noKey.message),
      noKey.message,
    );
    const button = await text(A, `document.querySelector('${BUTTON}').textContent`);
    const crowd = await text(
      A,
      `document.querySelector('[data-dev-replace] input[type=checkbox]').parentElement.textContent`,
    );
    t.check(
      'the tab names the stage on its button and counts the other player',
      button === `Replace this room with ${LABEL}` && /1 other is here now/.test(crowd),
      `${button} | ${crowd.trim()} | ${await A.still('dock')}`,
    );

    // 2. Refused: a wrong key, then the right key with a wrong room name. Ben is told nothing.
    const [name, secret] = [
      A.page.locator('[data-dev-replace] input:not([type])'),
      A.page.locator('[data-dev-replace] input[type=password]'),
    ];
    await A.page.check('[data-dev-replace] input[type=checkbox]');
    await name.fill(room);
    await secret.fill('not-the-key-'.repeat(4));
    await A.page.click(BUTTON);
    const wrongKey = await A.waitFor(`/Wrong key/.test(${STATUS})`, { timeout: 20000 });
    forgive(A, 401);
    t.check('a wrong key is refused plainly', wrongKey >= 0, await text(A, STATUS));
    await secret.fill(KEY);
    await name.fill('some-other-room');
    await A.page.click(BUTTON);
    const wrongName = await A.waitFor(`/Wrong room name/.test(${STATUS})`, { timeout: 20000 });
    forgive(A, 409);
    await A.page.locator(BUTTON).scrollIntoViewIfNeeded();
    t.check(
      'a wrong room name is refused plainly, and nobody saw a countdown',
      wrongName >= 0 && !/replaced/.test(await text(A, NOTE)) && !/replaced/.test(await text(B, NOTE)),
      `${await text(A, STATUS)}; ${await A.still('refused')}`,
    );

    // Cy has not picked a name yet: a first visit, still on the lobby card over the fall's stage, where the HUD is
    // hidden (src/fall/fall.css). The countdown must show there too.
    const C = await t.open({ name: 'Cy', room, hud: true, trace: false });
    await C.eval(`localStorage.clear(); return 0;`);
    await C.page.goto(`${C.page.url()}&intro=1`);
    await C.page.waitForSelector('#enter:not([disabled])', { timeout: 180000 });
    await C.page.addStyleTag({ content: '.splash { display: none !important }' });
    await C.waitFor(
      `document.body.classList.contains('fall-air') && window.boogle?.net?.state === 'live' &&
        Object.keys(localStorage).some((k) => k.startsWith('boogle.room-born'))`,
      { timeout: 60000 },
    );
    await C.eval(`window.__before = 1; return 0;`);

    // 3. The right name: every screen counts down.
    await name.fill(room);
    await A.page.click(BUTTON);
    const counting = new RegExp(`^This room will be replaced with ${LABEL} (in \\d+ seconds?|now)\\. `).source;
    const [sawA, sawB] = await Promise.all(
      [A, B].map((g) => g.waitFor(`/${counting}/.test(${NOTE})`, { timeout: 60000 })),
    );
    const sawC = await C.waitFor(`/${counting}/.test(${NOTE})`, { timeout: 60000 });
    const [shotA, shotB] = [await A.still('countdown-p1'), await B.still('countdown-p2')];
    const inLobby = (await C.eval(`return {
      hud: getComputedStyle(document.querySelector('.hud')).visibility,
      lane: getComputedStyle(document.querySelector('.notify')).visibility,
      card: !document.getElementById('lobby').hidden };`)) as { hud: string; lane: string; card: boolean };
    t.check(
      'a player still on the lobby card sees the countdown, though the HUD is hidden there',
      sawC >= 0 && inLobby.hud === 'hidden' && inLobby.lane === 'visible' && inLobby.card,
      `${JSON.stringify(inLobby)}; ${await C.still('countdown-lobby')}`,
    );
    t.check(
      'both players see the countdown',
      sawA! >= 0 && sawB! >= 0,
      `${await text(A, NOTE).catch(() => 'reloading')}; ${shotA}; ${shotB}`,
    );

    // 4. Both pages reload on their own into the stage: no card, at the landing, with the line.
    await Promise.all([reloaded(A), reloaded(B)]);
    const line = `This room was replaced with ${LABEL} for testing. The world changed for everyone, and what you carried and found here is gone.`;
    for (const [g, who] of [
      [A, 'p1'],
      [B, 'p2'],
    ] as const) {
      const read = await g.waitFor(`${NOTE} === ${JSON.stringify(line)}`, { timeout: 60000 });
      const at = (await g.eval(`return ${POSE};`)) as { x: number; y: number; z: number };
      const off = Math.hypot(at.x - LAND.x, at.z - LAND.z);
      const lobby = await g.eval(`return !document.getElementById('lobby')?.hidden;`);
      t.check(
        `${who} landed at the stage with no card and read the line`,
        read >= 0 && off < 3 && Math.abs(at.y - LAND.y) < 2.5 && !lobby,
        `${off.toFixed(1)} m from the landing, y ${at.y.toFixed(1)} (landing ${LAND.y}); ${await g.still(`after-${who}`)}`,
      );
    }
    // Cy had no saved name: the card again, but no fall, and the stage's landing after it.
    await C.page.waitForFunction(
      () => !('__before' in window) && !!document.querySelector('#enter:not([disabled])'),
      null,
      { timeout: 180000 },
    );
    await C.page.addStyleTag({ content: '.splash { display: none !important }' });
    const carded = (await C.eval(`return { card: !document.getElementById('lobby').hidden,
      fall: document.body.classList.contains('fall-air') || document.body.classList.contains('fall-stage') };`)) as {
      card: boolean;
      fall: boolean;
    };
    await C.page.click('#enter');
    await C.waitFor(`window.boogle.me.entered && !!window.boogle.me.body`, { timeout: 60000 });
    const readC = await C.waitFor(`${NOTE} === ${JSON.stringify(line)}`, { timeout: 60000 });
    const atC = (await C.eval(`return ${POSE};`)) as { x: number; y: number; z: number };
    const offC = Math.hypot(atC.x - LAND.x, atC.z - LAND.z);
    t.check(
      'replaced while on the lobby card: the card again, no fall, then the stage and the line',
      carded.card && !carded.fall && readC >= 0 && offC < 3.5 && Math.abs(atC.y - LAND.y) < 2.5,
      `${JSON.stringify(carded)}; ${offC.toFixed(1)} m from the landing; ${await C.still('after-lobby')}`,
    );
    for (const g of [A, B, C]) await g.waitFor(`window.boogle.remotes.size === 2`, { timeout: 60000 });

    // 5. The key stayed in the tab's session and went nowhere else.
    const kept = (await A.eval(`
      const key = sessionStorage.getItem('boogle.dev.advance-key') ?? '';
      await window.boogle.dev.open('room');
      const elsewhere = [JSON.stringify(localStorage), location.href, JSON.stringify(window.boogle.dev.snapshot())];
      return { session: key.length, leaked: !!key && elsewhere.some((s) => s.includes(key)) };`)) as {
      session: number;
      leaked: boolean;
    };
    t.check(
      'the key is in sessionStorage only: not in localStorage, the URL or the dock snapshot',
      kept.session === KEY.length && !kept.leaked,
      JSON.stringify(kept),
    );
    const ben = await B.eval(`return sessionStorage.getItem('boogle.dev.advance-key');`);
    t.check('the other player never had the key', ben === null);
  },
};

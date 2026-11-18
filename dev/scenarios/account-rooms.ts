// Accounts in the real game (docs/plans/accounts.md, Checkpoint B): room progress stays with its room, and the browser's
// failure paths. Isolated browser stores, the production entry and the local stack's real account server.
//
// 1. Room isolation. A jumps into a room seeded at `house-ready` (a wallet, rails, built works), chops logs onto their
//    back, saves a PIN and rejoins: the room's progress and the back are still there. B, another store, signs in with
//    that PIN in a fresh room: the same pid, and that room matches a guest control's fresh room (no wallet, rails,
//    works or back came with the account). B then walks into A's room and finds A's back and progress.
// 2. Storage denied (localStorage, then both stores): the game boots, plays in a room and says "this visit only".
// 3. Expired session: the session's expiry is set in the past in the stack's accounts.sqlite. The next load keeps the
//    same identity, refuses the room and says so; signing in with the PIN restores it.
// 4. Lost create response: the server commits the account but the reply never reaches the page. The page recovers the
//    account from GET session, never shows a PIN, and offers Replace PIN.
//
// Secrets: PINs stay in this process's memory, are never printed, asserted equal in output, put in URLs or captured.
// No Playwright trace for any player here (a trace records evaluate arguments and typed text). Stills are taken only
// when no PIN is on screen. Dev harness proof, not part of the nightly list.
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import type { Page } from 'playwright';
import { enterGame, type Game } from '../look/lib.ts';
import { INV } from './lib/world.ts';
import type { T } from './run.ts';

const ACC = `const A = await import('/src/player/account.ts');`;
const READ = `const R = await import('/dev/look/rail-read.ts');`;
// The room's progress as this page sees it: the wallet, the line's milestones, built works and this player's back.
const DIGEST = `${READ} ${ACC}
  if (!(await R.railReady(30000))) return null;
  const w = R.rw();
  const pick = (o, keys) => (o ? Object.fromEntries(keys.map((k) => [k, o[k]])) : null);
  const till = R.till(w);
  return {
    pid: R.railPid(),
    account: A.accountStatus().pid,
    signedIn: !!A.accountStatus().accountId,
    wallet: till ? till.boogles + till.spent : null,
    boogles: till?.boogles ?? null,
    milestones: pick(R.rail(w), ['axe', 'jump', 'lever', 'sea', 'hook', 'glide', 'trains', 'pack']),
    works: { forge: pick(R.forge(w), ['lit', 'poured']), shed: pick(R.shed(w), ['fitted', 'steel']) },
    back: R.railBack(),
  };`;
type Digest = {
  pid: string;
  account: string;
  signedIn: boolean;
  wallet: number | null;
  boogles: number | null;
  milestones: Record<string, unknown> | null;
  works: Record<string, unknown>;
  back: { carry: number; stone: number; rails: number; foot: number };
};
const progress = (d: Digest) => JSON.stringify({ m: d.milestones, w: d.works });
const STATUS = `${ACC} return A.accountStatus();`;
const PROBLEM = `${ACC} return A.accountProblem() ?? '';`;

/** The page's URL in `room`, without a jump-in (a reload of a `from=` URL would make another room). */
function roomUrl(g: Game, room: string) {
  const u = new URL(g.page.url());
  u.searchParams.delete('from');
  u.searchParams.set('room', room);
  return u.href;
}
async function settle(page: Page) {
  await enterGame(page, 180000);
  await page.waitForFunction(() => !!window.boogle?.sync && !!window.boogle?.me?.body, null, { timeout: 120000 });
  await page.addStyleTag({ content: '.splash { display: none !important }' });
}
/** Goes to `url` (or follows a reload the page starts itself) and back into the game. */
async function arrive(g: Game, url?: string, start?: () => Promise<unknown>) {
  if (start) await Promise.all([g.page.waitForEvent('framenavigated', { timeout: 30000 }), start()]);
  else await g.page.goto(url!, { timeout: 90000 });
  await settle(g.page);
}
const signIn = (g: Game, pin: string) =>
  arrive(g, undefined, () =>
    g.page.evaluate(async (p) => {
      const A = await import('/src/player/account.ts' as string);
      void A.signInAccount(p); // it reloads the page: never await it inside the page
    }, pin),
  );
// A refused or aborted request is a console line from the browser itself: expected where this run causes it.
function forgive(g: Game, pattern: RegExp) {
  for (let i = g.consoleErrors.length - 1; i >= 0; i--)
    if (pattern.test(g.consoleErrors[i]!)) g.consoleErrors.splice(i, 1);
}
async function openAccount(g: Game) {
  await g.eval(
    `navigator.getGamepads = () => []; const { openPause } = await import('/src/features/pause.ts'); openPause();`,
  );
  await g.page.waitForSelector('dialog.pause[open]', { timeout: 10000 });
  await g.eval(
    `const { pauseNavigation } = await import('/src/player/pause-pages.ts'); pauseNavigation.open('account');`,
  );
  await g.page.waitForSelector('.account-page h2', { timeout: 10000 });
}
const accountText = (g: Game) => g.eval(`return document.querySelector('.account-page')?.innerText ?? '';`);

/** Chops until `n` logs are on this player's back (the nearest standing tree, as hud-glance does). */
async function chop(g: Game, n: number) {
  return g.eval(`${READ} ${INV}
    const { inspectRailway } = R;
    const { teleport } = await import('/src/physics/engine.ts');
    const { cam } = await import('/src/player/player.ts');
    const p = window.boogle.me.body.position;
    const s = inspectRailway().trees.filter((s) => !s.cleared && s.remaining > 2 && ![28, 209, 232].includes(s.id))
      .sort((a, b) => Math.hypot(a.x - p.x, a.z - p.z) - Math.hypot(b.x - p.x, b.z - p.z))[0];
    if (!s) return -1;
    const d = Math.hypot(p.x - s.x, p.z - s.z) || 1;
    const sx = s.x + ((p.x - s.x) / d) * 2, sz = s.z + ((p.z - s.z) / d) * 2;
    const b = window.boogle.me.body;
    teleport(b, sx, s.y + 1.2, sz);
    b.velocity.set(0, 0, 0);
    cam.yaw = window.boogle.me.yaw = Math.atan2(-(s.x - sx), -(s.z - sz)); cam.pitch = -0.2;
    await new Promise((r) => setTimeout(r, 600));
    for (let k = 0; k < 120 && R.railBack().carry < ${n}; k++) {
      if (inspectRailway().pending === 0) { H.interactDown(); H.interactUp(); }
      await new Promise((r) => setTimeout(r, 380));
    }
    for (let k = 0; k < 50 && inspectRailway().pending > 0; k++) await new Promise((r) => setTimeout(r, 100));
    return R.railBack().carry;`);
}

export default {
  about: 'accounts in the real game: room progress stays with each room; storage denied, expired session, lost create',
  timeout: 900000,
  async run(t: T) {
    const tag = Math.random().toString(36).slice(2, 7);
    const digest = async (g: Game) => (await g.eval(DIGEST)) as Digest | null;

    // 1. Room isolation.
    const a = await t.open({ name: 'store-A', query: 'from=house-ready', hud: true, trace: false });
    const roomR = new URL(a.page.url()).searchParams.get('room')!;
    const carried = await chop(a, 2);
    const a1 = (await digest(a))!;
    t.check(
      'A: the seeded room has progress (wallet, milestones) and logs on A’s back',
      !!a1 && (a1.wallet ?? 0) > 0 && a1.back.carry >= 2 && a1.pid === a1.account,
      `room ${roomR}; chopped to ${carried}; ${JSON.stringify({ ...a1, pid: undefined, account: undefined })}`,
    );
    const pin = (await a.eval(`${ACC} return await A.saveAccountPin();`)) as string;
    const promoted = await a.eval(STATUS);
    t.check('A: Save PIN promotes the guest, same pid', !!promoted.accountId && promoted.pid === a1.pid);
    await arrive(a, roomUrl(a, roomR));
    const a2 = (await digest(a))!;
    t.check(
      'A: rejoining the room keeps its progress and A’s back',
      !!a2 &&
        a2.pid === a1.pid &&
        a2.signedIn &&
        progress(a2) === progress(a1) &&
        (a2.wallet ?? 0) >= (a1.wallet ?? 0) &&
        JSON.stringify(a2.back) === JSON.stringify(a1.back),
      `wallet ${a1.wallet} → ${a2.wallet}; back ${JSON.stringify(a2.back)}`,
    );

    // A guest control in a fresh room: what a room nobody has played looks like.
    const c = await t.open({ name: 'control', room: `acct-fresh-${tag}`, hud: true, trace: false });
    const fresh = (await digest(c))!;
    await c.close();
    t.check(
      'control: a fresh room differs from the seeded one',
      !!fresh && progress(fresh) !== progress(a1) && fresh.back.carry === 0,
      JSON.stringify({ ...fresh, pid: undefined, account: undefined }),
    );

    // B: another store, a fresh room, then the account.
    const roomS = `acct-other-${tag}`;
    const b = await t.open({ name: 'store-B', room: roomS, hud: true, trace: false });
    const bGuest = (await digest(b))!;
    await signIn(b, pin);
    const b1 = (await digest(b))!;
    t.check(
      'B: signing in on another store resolves the same pid in its own room',
      !!b1 && b1.pid === a1.pid && b1.account === a1.pid && b1.signedIn && bGuest.pid !== a1.pid,
    );
    t.check(
      'B: the account brought no wallet, milestones, works or back into the other room',
      !!b1 &&
        progress(b1) === progress(fresh) &&
        b1.wallet === fresh.wallet &&
        JSON.stringify(b1.back) === JSON.stringify({ carry: 0, stone: 0, rails: 0, foot: 0 }),
      JSON.stringify({ ...b1, pid: undefined, account: undefined }),
    );
    t.check(
      'A keeps playing its room while the same account is in another room',
      (await a.eval(
        `return document.querySelector('.elsewhere') === null && !!(await import('/dev/look/rail-read.ts')).railRead()?.ready();`,
      )) as boolean,
    );
    await arrive(b, roomUrl(b, roomR));
    const b2 = (await digest(b))!;
    t.check(
      'B: walking into A’s room finds its progress and the account’s back there',
      !!b2 && b2.pid === a1.pid && progress(b2) === progress(a1) && JSON.stringify(b2.back) === JSON.stringify(a1.back),
      `back ${JSON.stringify(b2?.back)}`,
    );
    const aRetired = await a.waitFor(`document.querySelector('.elsewhere') !== null`, { timeout: 8000 });
    t.check('A, in the same room, is told it is playing elsewhere', aRetired >= 0, `${aRetired} ms`);
    t.check('isolation stills', true, `${await b.still('b-in-room-R')}`);
    await a.close();
    await b.close();

    // 2. Storage denied.
    const DENY_LOCAL = `Object.defineProperty(window, 'localStorage', { configurable: true, get() { throw new DOMException('denied', 'SecurityError'); } });`;
    const DENY_BOTH = `${DENY_LOCAL} Object.defineProperty(window, 'sessionStorage', { configurable: true, get() { throw new DOMException('denied', 'SecurityError'); } });`;
    const roomD = `acct-deny-${tag}`;
    const d = await t.open({ name: 'no-local', room: roomD, hud: true, trace: false, init: DENY_LOCAL });
    const d1 = await digest(d);
    const ds = await d.eval(STATUS);
    t.check(
      'localStorage denied: a verified guest plays in the room, not persistent',
      !!d1 && ds.state === 'ready' && ds.persistent === false && d1.pid === ds.pid,
      JSON.stringify({ state: ds.state, persistent: ds.persistent }),
    );
    await openAccount(d);
    const dText = await accountText(d);
    t.check(
      'localStorage denied: Account says this sign-in lasts for this visit only',
      /this visit only/i.test(dText),
      `${await d.still('no-local-account')}`,
    );
    await arrive(d, roomUrl(d, roomD));
    const d2 = await digest(d);
    t.check('localStorage denied: a reload in this tab keeps the identity (tab store)', !!d2 && d2.pid === d1?.pid);
    await d.close();
    const e = await t.open({ name: 'no-storage', room: roomD, hud: true, trace: false, init: DENY_BOTH });
    const e1 = await digest(e);
    const es = await e.eval(STATUS);
    t.check(
      'both stores denied: the game still boots into the room as an in-memory guest',
      !!e1 && es.state === 'ready' && es.persistent === false && e1.pid === es.pid,
      JSON.stringify({ state: es.state, persistent: es.persistent }),
    );
    await e.close();

    // 3. Expired session.
    const roomX = `acct-expiry-${tag}`;
    const x = await t.open({ name: 'expiry', room: roomX, hud: true, trace: false });
    const xPin = (await x.eval(`${ACC} return await A.saveAccountPin();`)) as string;
    const x0 = await x.eval(STATUS);
    if (!t.dataDir) t.check('expired session: needs the local stack’s data directory (no --url)', false);
    else {
      const db = new DatabaseSync(path.join(t.dataDir, 'accounts.sqlite'));
      const changed = db.prepare('UPDATE sessions SET expires_at = 1 WHERE pid = ?').run(x0.pid).changes;
      db.close();
      t.check('expired session: the device session’s expiry is now in the past', Number(changed) >= 1);
      await x.page.goto(roomUrl(x, roomX), { timeout: 90000 });
      let entered = 'entered';
      await settle(x.page).catch((err: Error) => (entered = err.message.split('\n')[0]!));
      forgive(x, /status of 401/);
      const xs = await x.eval(STATUS);
      const problem = await x.eval(PROBLEM);
      const inRoom = await x.eval(`return !!(await import('/dev/look/rail-read.ts')).railRead()?.ready();`);
      t.check(
        'expired session: the same identity is kept, the room is refused and the page says why',
        xs.state === 'revoked' &&
          xs.pid === x0.pid &&
          !!xs.accountId &&
          /expired or was replaced/.test(problem) &&
          !inRoom,
        `${entered}; ${JSON.stringify({ state: xs.state, signedIn: !!xs.accountId, inRoom })}; ${problem}`,
      );
      await openAccount(x);
      t.check(
        'expired session: Account shows the unavailable state',
        /Sign-in unavailable/.test(await accountText(x)),
        await x.still('expired-account'),
      );
      await signIn(x, xPin);
      const x2 = await digest(x);
      t.check(
        'expired session: signing in with the PIN restores the same pid in the room',
        !!x2 && x2.pid === x0.pid && x2.signedIn,
      );
    }
    await x.close();

    // 4. Lost create response.
    const g = await t.open({ name: 'lost-create', room: `acct-lost-${tag}`, hud: true, trace: false });
    let committed = 0;
    await g.page.route('**/account/create', async (route) => {
      const response = await route.fetch(); // the server commits the account
      committed = response.status();
      await route.abort('connectionreset'); // and the page never hears back
    });
    await openAccount(g);
    await g.page.click('.account-page button.primary'); // Save PIN
    await g.page
      .waitForFunction(
        () => /Could not show the PIN/.test(document.querySelector('.account-message')?.textContent ?? ''),
        null,
        { timeout: 15000 },
      )
      .catch(() => {});
    forgive(g, /ERR_CONNECTION_RESET|ERR_FAILED|Failed to load resource/);
    const lost = await g.eval(`${ACC} const s = A.accountStatus(); return { signedIn: !!s.accountId, state: s.state,
      text: document.querySelector('.account-page')?.innerText ?? '', pin: !!document.querySelector('.account-pin') };`);
    t.check(
      'lost create response: the server committed, the page recovers Signed in, shows no PIN and offers Replace PIN',
      committed === 200 &&
        lost.signedIn &&
        lost.state === 'ready' &&
        !lost.pin &&
        /Could not show the PIN/.test(lost.text) &&
        /Signed in/.test(lost.text) &&
        /Replace PIN/.test(lost.text),
      `create ${committed}; ${await g.still('lost-create-account')}`,
    );
    await g.page.unroute('**/account/create');
    await g.page.click('.account-page button.primary'); // Replace PIN (asks first)
    await g.page.click('.account-page button.primary'); // Replace PIN
    const shown = await g.waitFor(`/^[0-9]{5}$/.test(document.querySelector('.account-pin')?.textContent ?? '')`, {
      timeout: 10000,
    });
    t.check('lost create response: Replace PIN then shows a fresh five-digit PIN once (not captured)', shown >= 0);
    await g.page.click('.account-page button.primary'); // I saved my PIN
    t.check(
      'the revealed PIN leaves the page when dismissed',
      !(await g.eval(`return !!document.querySelector('.account-pin');`)),
    );
    await g.close();
  },
};

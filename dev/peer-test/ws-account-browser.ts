import { startWeb, ev, waitFor } from './harness.ts';

export async function accountBrowserChecks(options: {
  base: string;
  room: string;
  root?: string;
  restart: () => Promise<void>;
  check: (name: string, ok: boolean) => void;
}) {
  const { check } = options;
  const web = await startWeb('account-page.ts', options.root, options.base);
  const query = `server=${encodeURIComponent(options.base)}&room=${options.room}-browser`;
  try {
    const a = await web.open('account-store-A', query);
    const b = await web.open('account-store-B', query);
    const pid = await ev(a.page, () => window.T.status().pid);
    const guestB = await ev(b.page, () => window.T.status().pid);
    check('isolated browser stores register different verified guests', a.ctx !== b.ctx && pid !== guestB && !!pid);
    // Never print, assert-equal, persist in artifacts or put this value in a URL.
    const pin: string = await ev(a.page, () => window.T.savePin());
    await ev(b.page, () => localStorage.setItem('boogle.visit.account-proof', 'former guest'));
    await Promise.all([b.page.waitForEvent('framenavigated'), ev(b.page, (pin: string) => window.T.signIn(pin), pin)]);
    await b.page.waitForFunction(() => !!window.T?.start);
    const joined = await ev(b.page, () => window.T.start());
    check(
      'account switch admits the verified account in the second store',
      typeof joined === 'string' && (await ev(b.page, () => window.T.status().pid)) === pid,
    );
    check(
      'switch clears former-person visit memory',
      await ev(b.page, () => localStorage.getItem('boogle.visit.account-proof') === null),
    );
    check(
      'newer authenticated browser retires the first connection',
      (await waitFor(() => ev(a.page, () => window.T.fatal === 'elsewhere'), 3000)) >= 0,
    );
    await b.page.reload();
    await ev(b.page, () => window.T.start());
    check(
      'reload resolves the same account from the second browser store',
      (await ev(b.page, () => window.T.status().pid)) === pid,
    );
    await options.restart();
    await b.page.reload();
    const afterRestart = await ev(b.page, () => window.T.start());
    check(
      'restart preserves browser credential admission and principal',
      typeof afterRestart === 'string' && (await ev(b.page, () => window.T.status().pid)) === pid,
    );
    await Promise.all([b.page.waitForEvent('framenavigated'), ev(b.page, () => window.T.signOut())]);
    await b.page.waitForFunction(() => !!window.T?.start);
    const asGuest = await ev(b.page, () => window.T.start());
    const guest = await ev(b.page, () => window.T.status());
    check(
      'sign-out reloads into a distinct guest admitted to the room',
      typeof asGuest === 'string' && guest.state === 'ready' && !!guest.pid && guest.pid !== pid,
    );
    await Promise.all([b.page.waitForEvent('framenavigated'), ev(b.page, (pin: string) => window.T.signIn(pin), pin)]);
    await b.page.waitForFunction(() => !!window.T?.start);
    await ev(b.page, () => window.T.start());
    check('switch-back resolves the original account', (await ev(b.page, () => window.T.status().pid)) === pid);
    await ev(a.page, () => window.T.savePin(true).then(() => undefined));
    check(
      'revoked browser session stops with authentication refusal',
      (await waitFor(() => ev(b.page, () => window.T.fatal === 'unauthenticated'), 3000)) >= 0,
    );
    await b.page.reload();
    const refused = await ev(b.page, () => window.T.start());
    check(
      'revoked stored credential cannot enter a room or silently become a guest',
      typeof refused !== 'string' &&
        (await ev(b.page, () => window.T.status().state)) === 'revoked' &&
        (await ev(b.page, () => window.T.status().pid)) === pid,
    );
  } catch {
    // Browser exceptions may contain evaluated inputs. Keep credentials out of the runner's error log.
    throw new Error('Account browser proof failed; no browser input values recorded.');
  } finally {
    await web.close();
  }
}

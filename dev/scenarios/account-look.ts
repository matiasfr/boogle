// The Account page's visual review (docs/plans/accounts.md, Checkpoint B): Pause → Options → Account at desktop size
// (1200 × 800) with a controller, and at a narrow touch size (390 × 844). Stills of non-secret states only: a guest, the
// sign-in form refusing a made-up PIN, signed in, the Replace PIN warning, and a phone whose session another device
// replaced. A PIN is never on screen in a still: the real one stays in this process's memory and is never printed.
// No Playwright trace for any player here. Dev harness proof, not part of the nightly list.
import type { Game } from '../look/lib.ts';
import type { T } from './run.ts';

const ACC = `const A = await import('/src/player/account.ts');`;
const FOCUS = `return document.activeElement?.textContent?.trim() || document.activeElement?.className || '';`;
const pad = (g: Game, slot: string) =>
  g.eval(`const { padModal, menuSlot } = await import('/src/player/controls.ts');
    padModal()(${JSON.stringify(slot)} === 'confirm' ? menuSlot('confirm') : ${JSON.stringify(slot)});`);
const noPin = (g: Game) => g.eval(`return !document.querySelector('.account-pin');`);
function forgive(g: Game, pattern: RegExp) {
  for (let i = g.consoleErrors.length - 1; i >= 0; i--)
    if (pattern.test(g.consoleErrors[i]!)) g.consoleErrors.splice(i, 1);
}
/** Reach targets: every visible Account control's box, in CSS pixels. */
const BOXES = `return [...document.querySelectorAll('.account-page button, .account-page input')]
  .filter((e) => e.offsetParent).map((e) => { const r = e.getBoundingClientRect();
  return { t: e.textContent?.trim() || e.tagName, w: Math.round(r.width), h: Math.round(r.height), top: Math.round(r.top), bottom: Math.round(r.bottom) }; });`;

export default {
  about:
    'Account page at desktop with a controller and at a narrow touch size: guest, sign-in error, signed in, replaced',
  timeout: 600000,
  async run(t: T) {
    const room = 'acct-look-' + Math.random().toString(36).slice(2, 7);
    const desk = await t.open({ name: 'desk', room, hud: true, size: [1200, 800], trace: false });
    // A pad in use: Pause opens on You; RB to Options, Down to Account, A opens it (the pad's own menu routing).
    await desk.eval(`navigator.getGamepads = () => []; document.body.classList.add('gamepad');
      const { openPause } = await import('/src/features/pause.ts'); openPause();`);
    await desk.page.waitForSelector('dialog.pause[open]', { timeout: 10000 });
    await desk.wait(0.5);
    await pad(desk, 'rb');
    await desk.wait(0.3);
    const path: string[] = [];
    for (let k = 0; k < 12; k++) {
      const at = (await desk.eval(FOCUS)) as string;
      path.push(at);
      if (at === 'Account') break;
      await pad(desk, 'down');
      await desk.wait(0.1);
    }
    await pad(desk, 'confirm');
    await desk.page.waitForSelector('.account-page h2', { timeout: 10000 });
    await desk.wait(0.4);
    const first = await desk.eval(FOCUS);
    t.check(
      'controller: RB then Down reaches Account in Options, A opens it, focus lands on Save PIN',
      path.at(-1) === 'Account' && first === 'Save PIN',
      `${path.join(' → ')}; focus ${first}`,
    );
    t.check('desktop guest still', await noPin(desk), await desk.still('desk-guest'));
    const steps: string[] = [];
    for (let k = 0; k < 5; k++) {
      await pad(desk, 'down');
      await desk.wait(0.1);
      steps.push((await desk.eval(FOCUS)) as string);
    }
    t.check(
      'controller: Down walks the Account buttons',
      steps.includes('Sign in') && steps.includes('Back'),
      steps.join(' → '),
    );

    // Sign-in form, a made-up PIN refused (no account on this fresh server has it).
    await desk.eval(
      `[...document.querySelectorAll('.account-page button')].find((b) => b.textContent === 'Sign in').click();`,
    );
    await desk.page.waitForSelector('#account-pin-input', { timeout: 5000 });
    t.check(
      'sign-in form focuses the PIN field',
      (await desk.eval(`return document.activeElement?.id;`)) === 'account-pin-input',
    );
    await desk.page.fill('#account-pin-input', '00000');
    await desk.page.press('#account-pin-input', 'Enter');
    await desk.page.waitForFunction(
      () => (document.querySelector('.account-message')?.textContent ?? '') !== '',
      null,
      { timeout: 10000 },
    );
    forgive(desk, /status of 401/);
    const refused = await desk.eval(`return document.querySelector('.account-message').textContent;`);
    t.check(
      'a wrong PIN is refused in plain words',
      /did not work/.test(refused),
      `${refused}; ${await desk.still('desk-signin-refused')}`,
    );

    // Save PIN (revealed, dismissed before any still), then signed in and the Replace PIN warning.
    await desk.eval(
      `[...document.querySelectorAll('.account-page button')].find((b) => b.textContent === 'Cancel').click();`,
    );
    await desk.eval(`document.querySelector('.account-page button.primary').click();`); // Save PIN
    await desk.waitFor(`/^[0-9]{5}$/.test(document.querySelector('.account-pin')?.textContent ?? '')`, {
      timeout: 10000,
    });
    const pin = (await desk.eval(`return document.querySelector('.account-pin').textContent;`)) as string;
    const reveal = await desk.eval(
      `return { focus: document.activeElement?.textContent, warn: document.querySelector('.account-warning')?.textContent };`,
    );
    t.check(
      'the reveal focuses "I saved my PIN" and warns about a lost PIN (not captured)',
      reveal.focus === 'I saved my PIN' && /new account/.test(reveal.warn ?? ''),
      JSON.stringify(reveal),
    );
    await pad(desk, 'confirm');
    await desk.wait(0.3);
    const labels = `return [...document.querySelectorAll('.account-page button')].map((b) => b.textContent);`;
    const signedInLabels = (await desk.eval(labels)) as string[];
    t.check(
      'signed in: the account switch reads "Switch account" (18 November), not "Sign in"',
      signedInLabels.includes('Switch account') && !signedInLabels.includes('Sign in'),
      signedInLabels.join(' · '),
    );
    t.check('signed-in still', await noPin(desk), await desk.still('desk-signed-in'));
    await desk.eval(`document.querySelector('.account-page button.primary').click();`); // Replace PIN: asks first
    await desk.wait(0.3);
    t.check('replace warning still', await noPin(desk), await desk.still('desk-replace-warning'));
    await desk.eval(
      `[...document.querySelectorAll('.account-page button')].find((b) => b.textContent === 'Cancel').click();`,
    );

    // A phone: the same account, signed in, then replaced from the desktop.
    const phone = await t.open({
      name: 'phone',
      room: room + '-p',
      hud: true,
      size: [390, 844],
      touch: true,
      trace: false,
    });
    const openAccount = async () => {
      await phone.eval(`const { openPause } = await import('/src/features/pause.ts'); openPause();`);
      await phone.page.waitForSelector('dialog.pause[open]', { timeout: 10000 });
      await phone.eval(
        `const { pauseNavigation } = await import('/src/player/pause-pages.ts'); pauseNavigation.open('account');`,
      );
      await phone.page.waitForSelector('.account-page h2', { timeout: 10000 });
      await phone.wait(0.4);
    };
    await openAccount();
    const boxes = (await phone.eval(BOXES)) as { t: string; w: number; h: number; top: number; bottom: number }[];
    t.check(
      'phone guest: every control is at least 44 px tall and inside the 844 px screen',
      boxes.length > 0 && boxes.every((b) => b.h >= 44 && b.top >= 0 && b.bottom <= 844),
      `${JSON.stringify(boxes)}; ${await phone.still('phone-guest')}`,
    );
    await Promise.all([
      phone.page.waitForEvent('framenavigated', { timeout: 30000 }),
      phone.page.evaluate(async (p) => {
        const A = await import('/src/player/account.ts' as string);
        void A.signInAccount(p);
      }, pin),
    ]);
    const { enterGame } = await import('../look/lib.ts');
    await enterGame(phone.page, 180000, 'phone', true);
    await phone.page.waitForFunction(() => !!window.boogle?.sync && !!window.boogle?.me?.body, null, {
      timeout: 120000,
    });
    await phone.page.addStyleTag({ content: '.splash { display: none !important }' });
    await openAccount();
    t.check(
      'phone signed in still',
      /Signed in/.test(await phone.eval(`return document.querySelector('.account-page').innerText;`)),
      await phone.still('phone-signed-in'),
    );
    // The desktop replaces the PIN through the account service (its reveal never reaches a still or the log).
    await desk.eval(`${ACC} await A.saveAccountPin(true); return 0;`);
    const refusedMs = await phone.waitFor(`(async () => { ${ACC} return A.accountStatus().state === 'revoked'; })()`, {
      timeout: 15000,
    });
    await phone.eval(
      `const { pauseNavigation } = await import('/src/player/pause-pages.ts'); pauseNavigation.open('options'); pauseNavigation.open('account');`,
    );
    await phone.wait(0.5);
    const replacedText = await phone.eval(`return document.querySelector('.account-page')?.innerText ?? '';`);
    t.check(
      'phone replaced from another device: Account says sign-in is unavailable and why',
      refusedMs >= 0 && /Sign-in unavailable/.test(replacedText) && /expired or was replaced/.test(replacedText),
      `${refusedMs} ms; ${await phone.still('phone-replaced')}`,
    );
    // 18 November: "Sign in" is the main button and has focus, the reload is gone, and the island is hidden.
    const replaced = await phone.eval(`return {
      labels: [...document.querySelectorAll('.account-page button')].map((b) => b.textContent),
      primary: document.querySelector('.account-page button.primary')?.textContent,
      focus: document.activeElement?.textContent,
      dim: getComputedStyle(document.querySelector('.pause-dim')).backgroundColor,
    };`);
    t.check(
      'replaced: Sign in is the main button and has focus, no reload, the dim hides the island',
      replaced.primary === 'Sign in' &&
        replaced.focus === 'Sign in' &&
        !replaced.labels.includes('Reload to retry') &&
        replaced.dim === 'rgb(12, 28, 52)',
      JSON.stringify(replaced),
    );
    await phone.page.setViewportSize({ width: 1200, height: 800 });
    await phone.wait(0.5);
    t.check('replaced at desktop width still', true, await phone.still('desk-replaced'));
    forgive(phone, /status of 401/);
  },
};

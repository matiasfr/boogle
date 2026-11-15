// Optional Local page: the account service owns credentials and reloads; Pause owns input and focus.
import './account-page.css';
import {
  accountProblem,
  accountStatus,
  accountSwitching,
  saveAccountPin,
  signInAccount,
  signOutAccount,
} from './account.ts';
import { pauseNavigation } from './pause-pages.ts';

function el<K extends keyof HTMLElementTagNameMap>(tag: K, text = '', cls = '') {
  const node = document.createElement(tag);
  node.textContent = text;
  node.className = cls;
  return node;
}

export function mountAccount(parent: HTMLElement, resume: () => void) {
  const page = el('section', '', 'account-page');
  // The observer excludes this subtree, including textBlock ancestors. Input values are never recorded.
  page.dataset.private = '';
  let disposed = false;
  let busy = false;
  let error = '';
  let revealed = '';
  let mode: 'status' | 'sign-in' | 'replace' | 'sign-out' = 'status';
  const button = (text: string, action: () => void, primary = false) => {
    const node = el('button', text, `pause-btn${primary ? ' primary' : ''}`);
    node.type = 'button';
    node.disabled = busy || accountSwitching();
    node.addEventListener('click', action);
    return node;
  };
  const show = (next: typeof mode) => {
    mode = next;
    revealed = '';
    error = '';
    render();
  };
  async function execute(action: () => Promise<void>) {
    if (busy || accountSwitching()) return;
    busy = true;
    error = '';
    for (const control of page.querySelectorAll<HTMLInputElement | HTMLButtonElement>('button, input'))
      control.disabled = true;
    page.setAttribute('aria-busy', 'true');
    try {
      await action();
    } catch (cause) {
      error = cause instanceof Error ? cause.message : 'Could not finish. Try again.';
    } finally {
      busy = false;
      if (!disposed) render();
      else revealed = '';
    }
  }
  const savePin = (replace = false) =>
    void execute(async () => {
      revealed = await saveAccountPin(replace);
      mode = 'status';
    });

  function render() {
    const status = accountStatus();
    page.removeAttribute('aria-busy');
    page.replaceChildren(el('h2', 'Account', 'pause-h'));
    const signedIn = Boolean(status.accountId);
    page.append(
      el('strong', status.state === 'ready' ? (signedIn ? 'Signed in' : 'Playing as a guest') : 'Sign-in unavailable'),
    );
    page.append(el('p', 'Your account keeps your identity. Progress stays with each room.', 'pause-note'));
    if (!status.persistent)
      page.append(el('p', 'This sign-in lasts for this visit only. This browser cannot remember it.', 'pause-note'));
    if (status.state !== 'ready')
      page.append(el('p', accountProblem() ?? 'Reload to reconnect. Your saved identity was kept.', 'pause-note'));

    if (revealed) {
      page.append(el('p', 'Write down your PIN. It is only shown now.', 'pause-note'));
      const pin = el('output', revealed, 'account-pin');
      pin.setAttribute('aria-label', 'Your five-digit PIN');
      page.append(pin);
      page.append(
        el('p', 'If you lose your PIN and every device is signed out, you’ll need a new account.', 'account-warning'),
      );
      page.append(button('I saved my PIN', () => show('status'), true));
    } else if (mode === 'sign-in') {
      const form = el('form', '', 'account-form');
      const label = el('label', 'Five-digit PIN');
      label.htmlFor = 'account-pin-input';
      const input = el('input', '', 'account-input');
      input.id = label.htmlFor;
      input.type = 'text';
      input.inputMode = 'numeric';
      input.autocomplete = 'off';
      input.spellcheck = false;
      input.autocapitalize = 'off';
      input.setAttribute('aria-describedby', 'account-message');
      input.setAttribute('aria-invalid', String(Boolean(error)));
      input.disabled = busy || accountSwitching();
      const submit = button('Sign in', () => {}, true);
      submit.type = 'submit';
      form.addEventListener('submit', (event) => {
        event.preventDefault();
        const pin = input.value;
        input.value = '';
        void execute(() => signInAccount(pin));
      });
      form.append(label, input, submit);
      page.append(
        el('p', 'Signing in reloads the game. Your belongings do not move to another account.', 'pause-note'),
        form,
      );
    } else if (mode === 'replace') {
      page.append(el('p', 'Your old PIN will stop working. Every other device will be signed out.', 'account-warning'));
      page.append(button('Replace PIN', () => savePin(true), true));
    } else if (mode === 'sign-out') {
      page.append(
        el(
          'p',
          'Keep your PIN to sign back in. You’ll return as a new guest; the room keeps its progress.',
          'account-warning',
        ),
      );
      page.append(button('Sign out', () => void execute(() => signOutAccount()), true));
    } else {
      if (status.state === 'ready') {
        page.append(
          button(signedIn ? 'Replace PIN' : 'Save PIN', () => (signedIn ? show('replace') : savePin()), true),
        );
        if (!signedIn) page.append(el('p', 'Get a PIN to use this identity on another device.', 'pause-note'));
        else page.append(el('p', 'Forgot your PIN? Replace it here.', 'pause-note'));
      } else page.append(button('Reload to retry', () => location.reload()));
      page.append(button('Sign in', () => show('sign-in')));
      if (signedIn || status.state !== 'ready') page.append(button('Sign out', () => show('sign-out')));
    }
    const message = el('p', error, 'account-message');
    message.id = 'account-message';
    message.setAttribute('role', 'alert');
    page.append(message);
    const footer = el('div', '', 'account-footer');
    footer.append(
      button(mode === 'status' ? 'Back' : 'Cancel', () => {
        if (mode !== 'status') show('status');
        else pauseNavigation.open?.('options');
      }),
      button('Resume', resume),
    );
    page.append(footer);
    page
      .querySelector<HTMLElement>(mode === 'sign-in' ? 'input' : 'button:not(:disabled)')
      ?.focus({ preventScroll: true });
  }
  parent.replaceChildren(page);
  render();
  return () => {
    disposed = true;
    revealed = '';
    page.replaceChildren();
  };
}

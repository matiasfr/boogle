// Regression from the independent accounts step-3 review: device sign-out must stop every old tab's visit writes,
// including a tab whose credential fell back to sessionStorage. Real account/reset/arrival code, isolated globals.
import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
import type * as Account from '../../src/player/account.ts';
import type * as Arrival from '../../src/player/arrival.ts';

const compiled = await build({
  stdin: {
    contents: `export * from './src/player/account.ts'; export const arrival = () => import('./src/player/arrival.ts');`,
    resolveDir: fileURLToPath(new URL('../../', import.meta.url)),
    loader: 'ts',
  },
  bundle: true,
  write: false,
  format: 'iife',
  globalName: 'account',
  define: { 'import.meta.env.VITE_BOOGLE_SERVER': '"https://example.invalid"' },
  plugins: [
    {
      name: 'headless-arrival',
      setup(b) {
        b.onLoad({ filter: /src\/boot\/world-reset\.ts$/ }, () => ({
          contents: 'export const replacedStage="", worldWasReset=false;',
          loader: 'ts',
        }));
        b.onLoad({ filter: /src\/proto\/flags\.ts$/ }, () => ({ contents: 'export const PROTO="";', loader: 'ts' }));
      },
    },
  ],
});
const key = 'boogle.account';
const credentialA = { version: 1, token: 'a'.repeat(64), pid: 'aaaaaaaaaa', expiresAt: 9_000_000_000_000 };
const reply = (pid: string) => new Response(JSON.stringify({ pid, expiresAt: credentialA.expiresAt }));
class Store {
  data = new Map<string, string>();
  denyRemoval = false;
  get length() {
    return this.data.size;
  }
  key(i: number) {
    return [...this.data.keys()][i] ?? null;
  }
  getItem(k: string) {
    return this.data.get(k) ?? null;
  }
  setItem(k: string, v: string) {
    this.data.set(k, v);
  }
  removeItem(k: string) {
    if (this.denyRemoval) throw new Error('storage removal denied');
    this.data.delete(k);
  }
}

test('same-person renewal keeps a tab-only session and room running', async () => {
  const local = new Store(),
    session = new Store();
  local.setItem(key, JSON.stringify(credentialA));
  session.setItem(key, JSON.stringify(credentialA));
  const current = tab(local, session);
  await current.api.prepareAccount();
  local.setItem(key, JSON.stringify({ ...credentialA, expiresAt: credentialA.expiresAt + 1 }));
  current.changed();
  assert.equal(current.api.accountSwitching(), false);
  assert.equal(current.closes(), 0);
  assert.equal(current.reloads(), 0);
  assert.ok(session.getItem(key));
});

// The removable-fallback case is device sign-out's tab-only variant below; this is the fallback that cannot be removed.
test('removing the durable sign-in stops fallback visit writers even when the fallback cannot be removed', async () => {
  const local = new Store(),
    session = new Store();
  local.setItem(key, JSON.stringify(credentialA));
  session.setItem(key, JSON.stringify(credentialA));
  const current = tab(local, session);
  await current.api.prepareAccount();
  const arrival = await current.api.arrival();
  session.denyRemoval = true;
  local.removeItem(key);
  current.changed();
  arrival.rememberVisit('room', 12345);
  assert.equal(local.getItem('boogle.visit.room'), null);
  assert.equal(current.api.accountSwitching(), true);
  assert.equal(current.closes(), 1);
  assert.equal(current.reloads(), 0, 'never reload a fallback that could not be forgotten');
  assert.ok(session.getItem(key));
});
type CredentialChange = { key: string; newValue: string | null; storageArea: Store };
function tab(local: Store, session = new Store(), fetcher: typeof fetch = async () => reply(credentialA.pid)) {
  let changed = (_event: CredentialChange) => {};
  let reloads = 0,
    closes = 0;
  const context = vm.createContext({
    localStorage: local,
    sessionStorage: session,
    crypto,
    URL,
    URLSearchParams,
    Uint8Array,
    TextEncoder,
    AbortSignal,
    fetch: fetcher,
    console: { warn() {} },
    location: {
      reload() {
        reloads++;
      },
      assign() {
        reloads++;
      },
    },
    addEventListener: (name: string, fn: typeof changed) => {
      if (name === 'storage') changed = fn;
    },
  });
  vm.runInContext(compiled.outputFiles[0]!.text, context);
  const api = context.account as typeof Account & { arrival: () => Promise<typeof Arrival> };
  api.onAccountReload(() => {
    closes++;
  });
  return {
    api,
    session,
    changed: () => changed({ key, newValue: local.getItem(key), storageArea: local }),
    reloads: () => reloads,
    closes: () => closes,
  };
}

for (const fallback of [false, true]) {
  test(`device sign-out stops old visit writes (${fallback ? 'tab-only' : 'persistent'} credential, HTTP offline)`, async () => {
    const local = new Store();
    local.setItem(key, JSON.stringify(credentialA));
    const session = new Store();
    // The state after a previous localStorage quota failure: A has a private fallback, B has the durable record.
    if (fallback) session.setItem(key, JSON.stringify(credentialA));
    const old = tab(local, session);
    await old.api.prepareAccount();
    const oldArrival = await old.api.arrival();
    oldArrival.addWelcomeItem({ key: 'spot', save: () => ({ owner: 'person A', x: 123 }), since: () => null });
    const signingOut = tab(local, undefined, async (input) => {
      if (String(input).endsWith('/sign-out')) throw new Error('offline on this tab');
      return reply(credentialA.pid);
    });
    await signingOut.api.prepareAccount();
    await signingOut.api.signOutAccount();
    old.changed();
    const newPerson = tab(local, undefined, async () => reply('bbbbbbbbbb'));
    await newPerson.api.prepareAccount();
    oldArrival.rememberVisit('room', 12345);
    const reloaded = tab(local, undefined, async () => reply('bbbbbbbbbb'));
    await reloaded.api.prepareAccount();
    assert.equal(
      (await reloaded.api.arrival()).roomMemory('room'),
      null,
      "person B must not receive person A's saved visit/position",
    );
    assert.equal(old.api.accountSwitching(), true);
    assert.equal(old.closes(), 1, 'close the old room even though server-side revocation failed');
    assert.equal(old.reloads(), 1);
    assert.equal(session.getItem(key), null, 'the fallback must not restore the signed-out person on reload');
    const oldReloaded = tab(local, session, async () => reply('bbbbbbbbbb'));
    await oldReloaded.api.prepareAccount();
    assert.equal(oldReloaded.api.accountPid(), 'bbbbbbbbbb');
  });
}

// Review of Checkpoint A (transactions, client side): boot reads the credential, awaits the server, then saves what it
// read. If another tab signs in (or signs out) while that request is in flight, the late save puts the former person
// back over the newer record, so the sign-in silently reverts in every tab.
test('a tab still verifying its session never writes over a newer sign-in from another tab', async () => {
  const local = new Store();
  local.setItem(key, JSON.stringify(credentialA));
  let answer = (_response: Response) => {};
  const booting = tab(
    local,
    new Store(),
    () =>
      new Promise<Response>((resolve) => {
        answer = resolve;
      }),
  );
  const verifying = booting.api.prepareAccount();
  const signedIn = 'cccccccccc';
  const other = tab(local, new Store(), async (_input, init) =>
    String(new Headers(init?.headers).get('authorization')).endsWith(credentialA.token)
      ? reply(credentialA.pid)
      : reply(signedIn),
  );
  await other.api.prepareAccount();
  await other.api.signInAccount('12345');
  assert.equal(JSON.parse(local.getItem(key)!).pid, signedIn, 'the other tab installed its sign-in');
  booting.changed();
  assert.equal(booting.reloads(), 1, 'the verifying tab is switching to the new person');
  answer(reply(credentialA.pid));
  await verifying;
  assert.equal(
    JSON.parse(local.getItem(key)!).pid,
    signedIn,
    "the late boot save restored the former person's sign-in",
  );
});

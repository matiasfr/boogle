// Account credentials persist in the browser, but never in playthrough evidence.
import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
import { createService, loadConfig } from '../src/server.ts';
import { installObserver } from '../../dev/look/observe.ts';

test('playthrough checkpoint evidence must not contain the reusable account bearer', async () => {
  const dataDir = await fs.mkdtemp(path.join(os.tmpdir(), 'boogle-review-secret-'));
  const svc = createService(loadConfig({ DATA_DIR: dataDir, SERVER_ROOMS: '*' }, { log: () => {} }));
  const base = `http://127.0.0.1:${await svc.listen(0)}`;
  const entries = new Map<string, string>([
    ['boogle.key', 'retired-identity-secret'],
    ['boogle.name', 'Ana'],
    ['boogle.railway-pose.test', '{"x":3}'],
  ]);
  const localStorage = {
    getItem: (key: string) => entries.get(key) ?? null,
    setItem: (key: string, value: string) => entries.set(key, value),
    key: (index: number) => [...entries.keys()][index] ?? null,
    get length() {
      return entries.size;
    },
  };
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  Object.defineProperty(globalThis, 'localStorage', { value: localStorage, configurable: true });
  try {
    // Only supply Vite's env replacement. Execute the actual bootstrap against a real temp-volume server.
    const bundled = await build({
      entryPoints: [fileURLToPath(new URL('../../src/player/account.ts', import.meta.url))],
      bundle: true,
      write: false,
      format: 'esm',
      define: { 'import.meta.env.VITE_BOOGLE_SERVER': JSON.stringify(base) },
    });
    const account = await import(
      'data:text/javascript;base64,' + Buffer.from(bundled.outputFiles![0]!.text).toString('base64')
    );
    await account.prepareAccount();
    const credential = JSON.parse(localStorage.getItem(account.ACCOUNT_KEY)!);
    const verified = await fetch(base + '/account/session', {
      headers: { Authorization: `Bearer ${credential.token}` },
    });
    assert.equal(verified.status, 200);
    assert.equal((await verified.json()).pid, credential.pid);

    // Run the real observer's capture/serialization, without launching a browser or sampling UI.
    const context = vm.createContext({
      window: {},
      localStorage,
      performance,
      setInterval() {},
      CanvasRenderingContext2D: class {
        fillText() {}
      },
    });
    vm.runInContext(`(${installObserver.toString()})(''); window.__observe.take('review', true);`, context);
    const saved = vm.runInContext('window.__observe.read().saves[0]', context);
    // Same serialization as dev/look/playthrough.ts; never print the token in test output.
    const artifact = JSON.stringify({ ...saved, room: 'review', query: '', run: 'review' });
    assert.equal(
      artifact.includes(credential.token),
      false,
      'playthrough save JSON contains a live account bearer token',
    );
    assert.equal(Object.hasOwn(saved.storage, account.ACCOUNT_KEY), false);
    assert.equal(Object.hasOwn(saved.storage, 'boogle.key'), false);
    assert.equal(saved.storage['boogle.name'], 'Ana');
    assert.equal(saved.storage['boogle.railway-pose.test'], '{"x":3}');
    assert.equal(artifact.includes('retired-identity-secret'), false);
    // Capturing evidence must not sign the browser out or rewrite its credential.
    assert.equal(JSON.parse(localStorage.getItem(account.ACCOUNT_KEY)!).token === credential.token, true);
    const stillValid = await fetch(base + '/account/session', {
      headers: { Authorization: `Bearer ${credential.token}` },
    });
    assert.equal(stillValid.status, 200);
    assert.equal((await stillValid.json()).pid, credential.pid);
  } finally {
    if (previous) Object.defineProperty(globalThis, 'localStorage', previous);
    else Reflect.deleteProperty(globalThis, 'localStorage');
    await svc.close({ save: false });
    await fs.rm(dataDir, { recursive: true, force: true });
  }
});

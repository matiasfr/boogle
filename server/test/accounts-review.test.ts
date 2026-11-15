import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';
import { createAccountStore } from '../src/account-store.ts';
import { createAccounts } from '../src/accounts.ts';
import { createService, loadConfig } from '../src/server.ts';

const token = () => randomBytes(32).toString('hex');

test('review: a fresh account-enabled server has no unknown application files in its save inventory', async (t) => {
  const dataDir = await fs.mkdtemp(path.join(os.tmpdir(), 'boogle-account-inventory-review-'));
  const reportToken = token();
  const svc = createService(loadConfig({}, { dataDir, reportToken, log: () => {} }));
  t.after(async () => {
    await svc.close({ save: false });
    await fs.rm(dataDir, { recursive: true, force: true });
  });
  const port = await svc.listen(0);
  const response = await fetch(`http://127.0.0.1:${port}/admin/saves`, {
    headers: { authorization: `Bearer ${reportToken}` },
  });
  assert.equal(response.status, 200);
  const inventory = await response.json();
  assert.deepEqual(
    { unknown: inventory.unknown, cleanupUnknown: inventory.lastCleanup.unknown },
    { unknown: [], cleanupUnknown: [] },
    'accounts.sqlite is server-owned data, not an unrecognized file needing operator investigation',
  );
});

test('review: SIGKILL retains committed guests and rolls back partial guest creation and PIN rotation', async (t) => {
  const dataDir = await fs.mkdtemp(path.join(os.tmpdir(), 'boogle-account-crash-review-'));
  const store = createAccountStore({ dataDir });
  t.after(async () => {
    store.close();
    await fs.rm(dataDir, { recursive: true, force: true });
  });
  const crash = (operation: string, bearer: string) => {
    const child = spawnSync(
      process.execPath,
      [fileURLToPath(new URL('./fixtures/account-crash.ts', import.meta.url)), dataDir, operation, bearer],
      { encoding: 'utf8', timeout: 10_000 },
    );
    assert.equal(child.error, undefined);
    assert.equal(child.signal, 'SIGKILL', child.stderr);
  };
  const owner = token();
  crash('commit', owner);
  store.init();
  const accounts = createAccounts(store);
  const guest = accounts.resolveSession(owner);
  assert.equal(accounts.registerGuest(owner).pid, guest.pid);
  const saved = accounts.createAccount(owner);
  const peer = token();
  accounts.signIn(saved.pin, peer);
  store.close();

  crash('rotate', owner);
  store.init();
  assert.equal(accounts.resolveSession(peer).pid, saved.pid, 'uncommitted revocation must roll back');
  assert.equal(accounts.signIn(saved.pin, token()).accountId, saved.accountId, 'old PIN must remain valid');
  store.close();

  const pending = token();
  crash('guest', pending);
  store.init();
  const db = new DatabaseSync(path.join(dataDir, 'accounts.sqlite'));
  try {
    assert.equal(db.prepare('SELECT count(*) AS n FROM principals').get()?.n, 1, 'no orphan from crashed registration');
    assert.equal(db.prepare('PRAGMA integrity_check').get()?.integrity_check, 'ok');
  } finally {
    db.close();
  }
  const retried = accounts.registerGuest(pending);
  assert.notEqual(retried.pid, saved.pid);
  assert.equal(accounts.registerGuest(pending).pid, retried.pid);
});

test('review: room reset, obsolete-save cleanup and restart preserve accounts without granting admin rights', async (t) => {
  const dataDir = await fs.mkdtemp(path.join(os.tmpdir(), 'boogle-account-reset-review-'));
  const room = 'account-review-room';
  const cfg = loadConfig({}, { dataDir, serverRooms: [room], reportToken: token(), log: () => {} });
  // A configured room is current, and reset only needs its checkpoint file, not a loaded simulation.
  await fs.writeFile(path.join(dataDir, `${room}.json`), JSON.stringify({ tick: 0, writerId: 'server', data: {} }));
  await fs.writeFile(path.join(dataDir, 'v01-obsolete.json'), '{}');
  let svc = createService(cfg);
  let port = await svc.listen(0);
  t.after(async () => {
    await svc.close({ save: false });
    await fs.rm(dataDir, { recursive: true, force: true });
  });
  const request = (route: string, bearer: string, body?: object) =>
    fetch(`http://127.0.0.1:${port}${route}`, {
      method: body === undefined ? 'GET' : 'POST',
      headers: { authorization: `Bearer ${bearer}`, 'content-type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  const owner = token();
  assert.equal((await request('/account/guest', owner, {})).status, 200);
  const created = await request('/account/create', owner, {});
  assert.equal(created.status, 200);
  const saved = await created.json();
  assert.equal((await request(`/admin/rooms/${room}/reset`, owner, {})).status, 401);
  assert.equal((await request(`/admin/rooms/${room}/reset`, cfg.reportToken, {})).status, 200);
  const files = await fs.readdir(dataDir);
  assert.ok(!files.includes(`${room}.json`));
  assert.ok(!files.includes('v01-obsolete.json'));
  assert.ok(files.includes('accounts.sqlite'));
  assert.equal((await (await request('/account/session', owner)).json()).accountId, saved.accountId);
  assert.equal(await (await request('/healthz', '')).text(), 'ok');
  await svc.close({ save: false });
  svc = createService(cfg);
  port = await svc.listen(0);
  const signedIn = await request('/account/sign-in', token(), { pin: saved.pin });
  assert.equal(signedIn.status, 200);
  assert.equal((await signedIn.json()).pid, saved.pid);
  assert.equal((await (await request('/account/session', owner)).json()).accountId, saved.accountId);
});

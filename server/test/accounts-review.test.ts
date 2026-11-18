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

const token = () => randomBytes(32).toString('hex');

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

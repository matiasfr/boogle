import test from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes, createHash } from 'node:crypto';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { createAccountStore } from '../src/account-store.ts';
import { createAccounts, AccountError } from '../src/accounts.ts';
import { createService, loadConfig } from '../src/server.ts';

const token = () => randomBytes(32).toString('hex');
const hash = (value: string) => createHash('sha256').update(value).digest('hex');
const rejects = (run: () => unknown, code: string) =>
  assert.throws(run, (error) => error instanceof AccountError && error.code === code);

test('account transactions preserve guest identity, unique PINs and retry bindings across reopening', async (t) => {
  const dataDir = await fs.mkdtemp(path.join(os.tmpdir(), 'boogle-accounts-'));
  const store = createAccountStore({ dataDir });
  t.after(async () => {
    store.close();
    await fs.rm(dataDir, { recursive: true, force: true });
  });
  store.init();
  const accounts = createAccounts(store);
  const a = token();
  const guest = accounts.registerGuest(a);
  assert.match(guest.pid, /^[a-f0-9]{10}$/);
  assert.equal(accounts.registerGuest(a).pid, guest.pid);
  const saved = accounts.createAccount(a);
  assert.equal(saved.pid, guest.pid);
  assert.match(saved.pin, /^\d{8}$/);
  rejects(() => accounts.createAccount(a), 'already_account');
  const b = token();
  const grouped = `${saved.pin.slice(0, 4)}-${saved.pin.slice(4)}`;
  assert.equal(accounts.signIn(grouped, b).pid, guest.pid);
  assert.equal(accounts.signIn(saved.pin, b).accountId, saved.accountId);
  const other = token();
  const otherGuest = accounts.registerGuest(other);
  rejects(() => accounts.signIn(saved.pin, other), 'session_bound');
  const otherAccount = accounts.createAccount(other);
  assert.notEqual(otherAccount.pin, saved.pin);
  assert.notEqual(otherGuest.pid, guest.pid);
  store.close();
  store.init();
  assert.equal(accounts.resolveSession(b).accountId, saved.accountId);
  assert.equal(accounts.registerGuest(a).pid, guest.pid);
  assert.equal(accounts.signIn(saved.pin, token()).pid, guest.pid);
  const db = new DatabaseSync(path.join(dataDir, 'accounts.sqlite'));
  try {
    assert.equal(db.prepare('SELECT count(*) AS n FROM principals').get()?.n, 2);
    assert.equal(db.prepare('SELECT count(*) AS n FROM accounts').get()?.n, 2);
    assert.equal(db.prepare('SELECT count(*) AS n FROM sessions').get()?.n, 4);
    const records = JSON.stringify({
      accounts: db.prepare('SELECT * FROM accounts').all(),
      sessions: db.prepare('SELECT * FROM sessions').all(),
    });
    for (const secret of [saved.pin, otherAccount.pin, a, b, other]) assert.ok(!records.includes(secret));
    assert.ok(records.includes(hash(saved.pin)) && records.includes(hash(a)));
    assert.throws(
      () =>
        store.transaction(() => {
          store.addPrincipal('constraint-test-pid');
          store.addAccount('constraint-test-account', 'constraint-test-pid', hash(saved.pin));
        }),
      /UNIQUE constraint failed: accounts.pin_hash/,
    );
    assert.equal(db.prepare('SELECT count(*) AS n FROM principals').get()?.n, 2);
  } finally {
    db.close();
  }
});

test('PIN rotation, sign-out and expiry survive restart; known tokens never become new guests', async (t) => {
  const dataDir = await fs.mkdtemp(path.join(os.tmpdir(), 'boogle-accounts-'));
  const store = createAccountStore({ dataDir });
  t.after(async () => {
    store.close();
    await fs.rm(dataDir, { recursive: true, force: true });
  });
  store.init();
  let now = 1_800_000_000_000;
  const accounts = createAccounts(store, () => now);
  const a = token();
  accounts.registerGuest(a);
  const saved = accounts.createAccount(a);
  const b = token();
  accounts.signIn(saved.pin, b);
  const rotated = accounts.rotatePin(a);
  assert.notEqual(rotated.pin, saved.pin);
  assert.equal(rotated.pid, saved.pid);
  rejects(() => accounts.resolveSession(b), 'unauthenticated');
  rejects(() => accounts.registerGuest(b), 'unauthenticated');
  rejects(() => accounts.signIn(rotated.pin, b), 'unauthenticated');
  rejects(() => accounts.signIn(saved.pin, token()), 'unauthenticated');
  const c = token();
  accounts.signIn(rotated.pin, c);
  accounts.revokeSession(c);
  accounts.revokeSession(c);
  store.close();
  store.init();
  for (const revoked of [b, c]) rejects(() => accounts.registerGuest(revoked), 'unauthenticated');
  now += 1000;
  const renewed = accounts.resolveSession(a);
  assert.ok(renewed.expiresAt > rotated.expiresAt);
  now = renewed.expiresAt;
  rejects(() => accounts.resolveSession(a), 'unauthenticated');
  rejects(() => accounts.registerGuest(a), 'unauthenticated');
  rejects(() => accounts.signIn(rotated.pin, a), 'unauthenticated');
  assert.equal(accounts.signIn(rotated.pin, token()).accountId, saved.accountId);
});

test('failed writes roll back registration and PIN rotation without partial identity or revocation', async (t) => {
  const dataDir = await fs.mkdtemp(path.join(os.tmpdir(), 'boogle-accounts-'));
  const store = createAccountStore({ dataDir });
  store.init();
  const db = new DatabaseSync(path.join(dataDir, 'accounts.sqlite'));
  t.after(async () => {
    db.close();
    store.close();
    await fs.rm(dataDir, { recursive: true, force: true });
  });
  const accounts = createAccounts(store);
  db.exec(`CREATE TRIGGER fail_session BEFORE INSERT ON sessions BEGIN SELECT RAISE(ABORT, 'test write failure'); END`);
  const a = token();
  assert.throws(() => accounts.registerGuest(a), /test write failure/);
  assert.equal(db.prepare('SELECT count(*) AS n FROM principals').get()?.n, 0);
  assert.equal(db.prepare('SELECT count(*) AS n FROM sessions').get()?.n, 0);
  db.exec('DROP TRIGGER fail_session');
  accounts.registerGuest(a);
  const saved = accounts.createAccount(a);
  const b = token();
  accounts.signIn(saved.pin, b);
  db.exec(`CREATE TRIGGER fail_revoke BEFORE UPDATE ON sessions WHEN NEW.expires_at = 0
    BEGIN SELECT RAISE(ABORT, 'test revoke failure'); END`);
  assert.throws(() => accounts.rotatePin(a), /test revoke failure/);
  assert.equal(accounts.resolveSession(b).pid, saved.pid);
  assert.equal(accounts.signIn(saved.pin, token()).pid, saved.pid);
  db.exec('DROP TRIGGER fail_revoke');
  // A unique-PIN collision retries before writing, without creating another account or returning a duplicate.
  const lookup = store.accountForPin;
  let calls = 0;
  t.mock.method(store, 'accountForPin', (value: string) => {
    calls++;
    return calls === 1 ? { accountId: saved.accountId, pid: saved.pid, version: 1 } : lookup(value);
  });
  accounts.rotatePin(a);
  assert.equal(calls, 2);
});

test('invalid PIN/token formats and unsupported profiles fail closed', async (t) => {
  const dataDir = await fs.mkdtemp(path.join(os.tmpdir(), 'boogle-accounts-'));
  const store = createAccountStore({ dataDir });
  store.init();
  t.after(async () => {
    store.close();
    await fs.rm(dataDir, { recursive: true, force: true });
  });
  const accounts = createAccounts(store);
  const a = token();
  accounts.registerGuest(a);
  const saved = accounts.createAccount(a);
  for (const bad of [undefined, '', 12345678, '1234567', '123456789', 'abcdefgh', '１２３４５６７８', '0'.repeat(33)])
    rejects(() => accounts.signIn(bad, token()), 'invalid_request');
  for (const bad of [undefined, '', 'old-browser-key', 123, 'a'.repeat(63), 'a'.repeat(65)])
    rejects(() => accounts.registerGuest(bad), 'unauthenticated');
  // A leading-zero PIN stays a string through normalization and storage lookup.
  const db = new DatabaseSync(path.join(dataDir, 'accounts.sqlite'));
  try {
    db.prepare('UPDATE accounts SET pin_hash = ? WHERE pid = ?').run(hash('00123456'), saved.pid);
    assert.equal(accounts.signIn('0012 3456', token()).pid, saved.pid);
    db.exec('PRAGMA ignore_check_constraints = ON; UPDATE accounts SET version = 2;');
    rejects(() => accounts.resolveSession(a), 'unavailable');
    rejects(() => accounts.signIn('00123456', token()), 'unavailable');
    rejects(() => accounts.registerGuest(a), 'unavailable');
  } finally {
    db.close();
  }
});

test('existing unreadable, empty or unsupported account databases are never initialized over', async (t) => {
  const dataDir = await fs.mkdtemp(path.join(os.tmpdir(), 'boogle-accounts-'));
  t.after(() => fs.rm(dataDir, { recursive: true, force: true }));
  const file = path.join(dataDir, 'accounts.sqlite');
  for (const content of ['not a sqlite database', '']) {
    await fs.writeFile(file, content);
    const store = createAccountStore({ dataDir });
    assert.throws(() => store.init());
    assert.equal(await fs.readFile(file, 'utf8'), content);
    rejectsUnavailable(store);
    await fs.rm(file);
  }
  const store = createAccountStore({ dataDir });
  store.init();
  store.close();
  const db = new DatabaseSync(file);
  db.exec('PRAGMA user_version = 2');
  db.close();
  assert.throws(() => store.init(), /Unsupported account database format/);
  rejectsUnavailable(store);
  const svc = createService(loadConfig({}, { dataDir, log: () => {} }));
  try {
    await assert.rejects(svc.listen(0), /Unsupported account database format/);
    assert.equal(svc.server.listening, false);
  } finally {
    await svc.close({ save: false });
  }
});

function rejectsUnavailable(store: ReturnType<typeof createAccountStore>) {
  assert.throws(() => createAccounts(store).registerGuest(token()), /unavailable/);
}

test('HTTP accounts: concurrent retries, restart, rotation and sign-out use durable operations', async (t) => {
  const dataDir = await fs.mkdtemp(path.join(os.tmpdir(), 'boogle-account-http-'));
  const cfg = loadConfig({}, { dataDir, allowedOrigins: ['https://boogle.club'], log: () => {} });
  let svc = createService(cfg);
  let port = await svc.listen(0);
  t.after(async () => {
    await svc.close({ save: false });
    await fs.rm(dataDir, { recursive: true, force: true });
  });
  const request = (route: string, bearer: string, body?: unknown) =>
    fetch(`http://127.0.0.1:${port}/account/${route}`, {
      method: body === undefined ? 'GET' : 'POST',
      headers: { authorization: `Bearer ${bearer}`, 'content-type': 'application/json', origin: 'https://boogle.club' },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  const a = token();
  const guests = await Promise.all([request('guest', a, {}), request('guest', a, {})]);
  assert.deepEqual(
    guests.map((r) => r.status),
    [200, 200],
  );
  const guest = await guests[0]!.json();
  assert.equal((await guests[1]!.json()).pid, guest.pid);
  const creates = await Promise.all([request('create', a, {}), request('create', a, {})]);
  assert.deepEqual(creates.map((r) => r.status).sort(), [200, 409]);
  const saved = await creates.find((r) => r.status === 200)!.json();
  assert.equal(saved.pid, guest.pid);
  const b = token();
  const signedIn = await request('sign-in', b, { pin: saved.pin });
  assert.equal(signedIn.status, 200);
  assert.equal((await signedIn.json()).pid, saved.pid);
  assert.equal((await request('sign-in', b, { pin: saved.pin })).status, 200);
  await svc.close({ save: false });
  svc = createService(cfg);
  port = await svc.listen(0);
  const session = await request('session', b);
  assert.equal(session.headers.get('cache-control'), 'no-store');
  assert.equal(session.headers.get('access-control-allow-origin'), 'https://boogle.club');
  assert.equal((await session.json()).accountId, saved.accountId);
  const rotated = await (await request('rotate-pin', a, {})).json();
  assert.match(rotated.pin, /^\d{8}$/);
  assert.equal((await request('session', b)).status, 401);
  assert.equal((await request('sign-in', token(), { pin: saved.pin })).status, 401);
  assert.equal((await request('sign-out', a, {})).status, 204);
  assert.equal((await request('sign-out', a, {})).status, 204);
  assert.equal((await request('guest', a, {})).status, 401);
  assert.equal((await request('sign-in', token(), { pin: rotated.pin })).status, 200);
});

test('HTTP accounts enforce origins, bounded JSON, generic errors and a simple sign-in limit', async (t) => {
  const dataDir = await fs.mkdtemp(path.join(os.tmpdir(), 'boogle-account-http-'));
  const logs: unknown[][] = [];
  const svc = createService(
    loadConfig({}, { dataDir, allowedOrigins: ['https://boogle.club'], log: (...a) => logs.push(a) }),
  );
  const port = await svc.listen(0);
  t.after(async () => {
    await svc.close({ save: false });
    await fs.rm(dataDir, { recursive: true, force: true });
  });
  const a = token();
  const request = (route: string, body: string, origin = 'https://boogle.club', method = 'POST') =>
    fetch(`http://127.0.0.1:${port}/account/${route}`, {
      method,
      headers: { origin, authorization: `Bearer ${a}`, 'content-type': 'application/json' },
      body: method === 'OPTIONS' ? undefined : body,
    });
  assert.equal((await request('guest', '{}', 'https://other.example')).status, 403);
  const mixedCase = await fetch(`http://127.0.0.1:${port}/Account/session`, {
    headers: { origin: 'https://other.example', authorization: `Bearer ${a}` },
  });
  assert.equal(mixedCase.status, 403);
  assert.equal((await request('guest', '', 'https://other.example', 'OPTIONS')).status, 403);
  assert.equal((await request('guest', '', 'https://boogle.club', 'OPTIONS')).status, 204);
  assert.equal((await request('guest', '{')).status, 400);
  assert.equal((await request('guest', JSON.stringify({ ignored: 'x'.repeat(1100) }))).status, 413);
  assert.equal((await request('guest', JSON.stringify({ pid: 'forged' }))).status, 400);
  assert.equal((await request('guest', '[]')).status, 400);
  assert.equal((await request('guest', '{}')).status, 200);
  assert.equal((await request('rotate-pin', '{}')).status, 401); // guests cannot rotate
  assert.equal((await request('create', JSON.stringify({ pin: '12345678' }))).status, 400);
  assert.equal((await request('create', '{}')).status, 200);
  for (let i = 0; i < 10; i++) assert.equal((await request('sign-in', '{"pin":"bad"}')).status, 400);
  const limited = await request('sign-in', '{"pin":"bad"}');
  assert.equal(limited.status, 429);
  assert.equal(limited.headers.get('cache-control'), 'no-store');
  assert.ok(Number(limited.headers.get('retry-after')) > 0);
  // Simulate an I/O failure after startup. The route returns a typed failure without leaking/logging the error.
  const db = new DatabaseSync(path.join(dataDir, 'accounts.sqlite'));
  try {
    db.exec(
      `CREATE TRIGGER fail_rotate BEFORE UPDATE ON accounts BEGIN SELECT RAISE(ABORT, 'private test error'); END`,
    );
    const failed = await request('rotate-pin', '{}');
    assert.equal(failed.status, 503);
    assert.deepEqual(await failed.json(), { error: 'unavailable' });
  } finally {
    db.close();
  }
  assert.ok(!JSON.stringify(logs).includes(a));
  assert.ok(!JSON.stringify(logs).includes('private test error'));
});

// Account identity lives outside room saves and namespaces. Only digests cross this storage boundary.
import { existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';

export type Account = { accountId: string; pid: string; version: number };
type Session = { pid: string; expiresAt: number };

export function createAccountStore({ dataDir }: { dataDir: string }) {
  let db: DatabaseSync | undefined;
  function database() {
    if (!db) throw new Error('Account store is unavailable');
    return db;
  }
  function transaction<T>(run: () => T): T {
    const connection = database();
    connection.exec('BEGIN IMMEDIATE');
    try {
      const result = run();
      connection.exec('COMMIT');
      return result;
    } catch (error) {
      connection.exec('ROLLBACK');
      throw error;
    }
  }
  return {
    init() {
      if (db) return;
      mkdirSync(dataDir, { recursive: true });
      const file = path.join(dataDir, 'accounts.sqlite');
      const exists = existsSync(file);
      const connection = new DatabaseSync(file);
      try {
        connection.exec('PRAGMA foreign_keys = ON; PRAGMA synchronous = FULL; PRAGMA busy_timeout = 1000;');
        if (!exists) {
          connection.exec(`
            BEGIN IMMEDIATE;
            CREATE TABLE principals (pid TEXT PRIMARY KEY NOT NULL) STRICT;
            CREATE TABLE accounts (
              account_id TEXT PRIMARY KEY NOT NULL,
              pid TEXT NOT NULL UNIQUE REFERENCES principals(pid),
              pin_hash TEXT NOT NULL UNIQUE,
              version INTEGER NOT NULL CHECK (version = 1)
            ) STRICT;
            CREATE TABLE sessions (
              token_hash TEXT PRIMARY KEY NOT NULL,
              pid TEXT NOT NULL REFERENCES principals(pid),
              expires_at INTEGER NOT NULL
            ) STRICT;
            CREATE INDEX sessions_pid ON sessions(pid);
            PRAGMA user_version = 1;
            COMMIT;
          `);
        }
        if (connection.prepare('PRAGMA user_version').get()?.user_version !== 1)
          throw new Error('Unsupported account database format');
        // An existing but incomplete/corrupt database is never replaced with a fresh one.
        connection.prepare('SELECT pid FROM principals LIMIT 1').get();
        connection.prepare('SELECT token_hash, pid, expires_at FROM sessions LIMIT 1').get();
        connection.prepare('SELECT account_id, pid, pin_hash, version FROM accounts LIMIT 1').get();
        db = connection;
      } catch (error) {
        connection.close();
        throw error;
      }
    },
    close() {
      db?.close();
      db = undefined;
    },
    transaction,
    session(hash: string): Session | undefined {
      return database().prepare('SELECT pid, expires_at AS expiresAt FROM sessions WHERE token_hash = ?').get(hash) as
        Session | undefined;
    },
    accountForPid(pid: string): Account | undefined {
      return database().prepare('SELECT account_id AS accountId, pid, version FROM accounts WHERE pid = ?').get(pid) as
        Account | undefined;
    },
    accountForPin(hash: string): Account | undefined {
      return database()
        .prepare('SELECT account_id AS accountId, pid, version FROM accounts WHERE pin_hash = ?')
        .get(hash) as Account | undefined;
    },
    addPrincipal(pid: string) {
      database().prepare('INSERT INTO principals (pid) VALUES (?)').run(pid);
    },
    addSession(hash: string, pid: string, expiresAt: number) {
      database()
        .prepare('INSERT INTO sessions (token_hash, pid, expires_at) VALUES (?, ?, ?)')
        .run(hash, pid, expiresAt);
    },
    renewSession(hash: string, expiresAt: number) {
      database().prepare('UPDATE sessions SET expires_at = ? WHERE token_hash = ?').run(expiresAt, hash);
    },
    addAccount(accountId: string, pid: string, pinHash: string) {
      database()
        .prepare('INSERT INTO accounts (account_id, pid, pin_hash, version) VALUES (?, ?, ?, 1)')
        .run(accountId, pid, pinHash);
    },
    replacePin(pid: string, pinHash: string) {
      database().prepare('UPDATE accounts SET pin_hash = ? WHERE pid = ?').run(pinHash, pid);
    },
    revokeOthers(pid: string, keepHash: string) {
      database().prepare('UPDATE sessions SET expires_at = 0 WHERE pid = ? AND token_hash != ?').run(pid, keepHash);
    },
    revokeSession(hash: string) {
      // Keep the row: replaying a known token must never register a different person.
      database().prepare('UPDATE sessions SET expires_at = 0 WHERE token_hash = ?').run(hash);
    },
  };
}

export type AccountStore = ReturnType<typeof createAccountStore>;

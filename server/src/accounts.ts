import { createHash, randomBytes, randomInt, randomUUID } from 'node:crypto';
import express from 'express';
import type { Express, Request, RequestHandler, Response, NextFunction } from 'express';
import type { Account, AccountStore } from './account-store.ts';

const SESSION_MS = 90 * 24 * 60 * 60 * 1000;
const PIN_LENGTH = 5;
const digest = (secret: string) => createHash('sha256').update(secret).digest('hex');
export type AccountIdentity = { pid: string; expiresAt: number; accountId?: string };
type AccountErrorCode = 'invalid_request' | 'unauthenticated' | 'already_account' | 'session_bound' | 'unavailable';

export class AccountError extends Error {
  status: number;
  code: AccountErrorCode;
  constructor(status: number, code: AccountErrorCode) {
    super(code);
    this.status = status;
    this.code = code;
  }
}

function tokenHash(token: unknown) {
  if (typeof token !== 'string' || !/^[a-f0-9]{64}$/.test(token)) throw new AccountError(401, 'unauthenticated');
  return digest(token);
}
function pinHash(pin: unknown) {
  if (typeof pin !== 'string' || pin.length > 32) throw new AccountError(400, 'invalid_request');
  const digits = pin.replace(/[ -]/g, '');
  if (digits.length !== PIN_LENGTH || !/^[0-9]+$/.test(digits)) throw new AccountError(400, 'invalid_request');
  return digest(digits);
}
function supported(account: Account | undefined) {
  if (account && account.version !== 1) throw new AccountError(503, 'unavailable');
  return account;
}

/** Synchronous transactions acknowledge only committed identities. No room state, sockets or operator rights here. */
export function createAccounts(store: AccountStore, now: () => number = Date.now) {
  function active(hash: string) {
    const session = store.session(hash);
    if (!session || session.expiresAt <= now()) throw new AccountError(401, 'unauthenticated');
    return session;
  }
  function identity(hash: string): AccountIdentity {
    const session = active(hash);
    const account = supported(store.accountForPid(session.pid));
    const expiresAt = now() + SESSION_MS;
    store.renewSession(hash, expiresAt);
    return { pid: session.pid, expiresAt, ...(account && { accountId: account.accountId }) };
  }
  function newPin() {
    // Inside BEGIN IMMEDIATE, so checking uniqueness and assigning the PIN cannot race another writer.
    for (let attempt = 0; attempt < 32; attempt++) {
      const pin = String(randomInt(10 ** PIN_LENGTH)).padStart(PIN_LENGTH, '0');
      if (!store.accountForPin(digest(pin))) return pin;
    }
    throw new AccountError(503, 'unavailable');
  }
  return {
    registerGuest(token: unknown) {
      const hash = tokenHash(token);
      return store.transaction(() => {
        if (store.session(hash)) return identity(hash); // includes already-promoted guests; never rebound
        const pid = randomBytes(5).toString('hex');
        store.addPrincipal(pid);
        store.addSession(hash, pid, now() + SESSION_MS);
        return identity(hash);
      });
    },
    resolveSession(token: unknown) {
      const hash = tokenHash(token);
      return store.transaction(() => identity(hash));
    },
    createAccount(token: unknown) {
      const hash = tokenHash(token);
      return store.transaction(() => {
        const session = identity(hash);
        if (session.accountId) throw new AccountError(409, 'already_account');
        const pin = newPin();
        const accountId = randomUUID();
        store.addAccount(accountId, session.pid, digest(pin));
        return { ...session, accountId, pin };
      });
    },
    signIn(pin: unknown, token: unknown) {
      const hash = tokenHash(token);
      const lookup = pinHash(pin);
      return store.transaction(() => {
        const account = supported(store.accountForPin(lookup));
        if (!account) throw new AccountError(401, 'unauthenticated');
        const existing = store.session(hash);
        if (existing) {
          active(hash);
          if (existing.pid !== account.pid) throw new AccountError(409, 'session_bound');
        } else {
          store.addSession(hash, account.pid, now() + SESSION_MS);
        }
        return identity(hash);
      });
    },
    rotatePin(token: unknown) {
      const hash = tokenHash(token);
      return store.transaction(() => {
        const session = identity(hash);
        if (!session.accountId) throw new AccountError(401, 'unauthenticated');
        const pin = newPin();
        store.replacePin(session.pid, digest(pin));
        store.revokeOthers(session.pid, hash);
        return { ...session, pin };
      });
    },
    revokeSession(token: unknown) {
      const hash = tokenHash(token);
      store.transaction(() => store.revokeSession(hash));
    },
  };
}

/** JSON account boundary; unexpected failures never expose request bodies, headers, SQL or secrets in logs. */
export function addAccountRoutes(
  app: Express,
  accounts: ReturnType<typeof createAccounts>,
  limits: { requests: RequestHandler; signIn: RequestHandler },
) {
  const router = express.Router();
  router.use((_req, res, next) => {
    res.set('Cache-Control', 'no-store');
    next();
  });
  router.use(limits.requests);
  router.post('/sign-in', limits.signIn);
  router.use((req, _res, next) => {
    if (req.method === 'POST' && !req.is('application/json')) throw new AccountError(400, 'invalid_request');
    next();
  });
  router.use(express.json({ limit: '1kb' }));
  const bearer = (req: Request) => /^Bearer ([a-f0-9]{64})$/i.exec(req.get('authorization') ?? '')?.[1];
  const body = (req: Request, keys: string[] = []): Record<string, unknown> => {
    const value: unknown = req.body ?? {};
    if (
      !value ||
      typeof value !== 'object' ||
      Array.isArray(value) ||
      Object.keys(value).some((k) => !keys.includes(k))
    )
      throw new AccountError(400, 'invalid_request');
    return value as Record<string, unknown>;
  };
  router.post('/guest', (req, res) => {
    body(req);
    res.json(accounts.registerGuest(bearer(req)));
  });
  router.get('/session', (req, res) => res.json(accounts.resolveSession(bearer(req))));
  router.post('/create', (req, res) => {
    body(req);
    res.json(accounts.createAccount(bearer(req)));
  });
  router.post('/sign-in', (req, res) => res.json(accounts.signIn(body(req, ['pin']).pin, bearer(req))));
  router.post('/rotate-pin', (req, res) => {
    body(req);
    res.json(accounts.rotatePin(bearer(req)));
  });
  router.post('/sign-out', (req, res) => {
    body(req);
    accounts.revokeSession(bearer(req));
    res.status(204).end();
  });
  router.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (err instanceof AccountError) return res.status(err.status).json({ error: err.code });
    // Do not forward JSON parser errors (they carry the raw body) to generic server logging.
    const type = err && typeof err === 'object' && 'type' in err ? err.type : '';
    if (type === 'entity.too.large') return res.status(413).json({ error: 'invalid_request' });
    if (type === 'entity.parse.failed') return res.status(400).json({ error: 'invalid_request' });
    res.status(503).json({ error: 'unavailable' });
  });
  // Origin enforcement, including preflights, belongs to server.ts's CORS boundary.
  app.use('/account', router);
}

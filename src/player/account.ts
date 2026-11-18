// Device credentials are Local, outside the room namespace. Boot resolves them before any identity-keyed cache.
import { isSessionToken, type RoomAuth } from '../net/account-wire.ts';
import { okPid } from '../sim/roster.ts';
import { resetForPerson } from './world-reset.ts';

export const ACCOUNT_KEY = 'boogle.account';
type Credential = { version: 1; token: string; pid?: string; accountId?: string; expiresAt?: number };
export type AccountState = 'ready' | 'offline' | 'revoked' | 'unreadable';
let credential: Credential | undefined;
let savedPid: string | undefined;
let preparing: Promise<void> | undefined;
let persistent = true;
let visitStorage = false;
let state: AccountState = 'offline';
let problem: string | undefined;
let standIn: string | undefined;
let switching = false;
let beforeReload = () => {};

const newCredential = (): Credential => ({
  version: 1,
  token: Array.from(crypto.getRandomValues(new Uint8Array(32)), (b) => b.toString(16).padStart(2, '0')).join(''),
});
const okAccount = (id: unknown): id is string => typeof id === 'string' && /^[a-f0-9-]{36}$/.test(id);
function readCredential(text: string): Credential {
  const value: unknown = JSON.parse(text);
  const record = value as Partial<Credential> | null;
  if (
    !record ||
    record.version !== 1 ||
    !isSessionToken(record.token) ||
    (record.pid !== undefined && !okPid(record.pid)) ||
    (record.accountId !== undefined && (!record.pid || !okAccount(record.accountId))) ||
    (record.expiresAt !== undefined && (!Number.isSafeInteger(record.expiresAt) || record.expiresAt < 0))
  )
    throw new Error('The saved sign-in could not be read.');
  return {
    version: 1,
    token: record.token,
    ...(record.pid && { pid: record.pid }),
    ...(record.accountId && { accountId: record.accountId }),
    ...(record.expiresAt !== undefined && { expiresAt: record.expiresAt }),
  };
}

// A tab-only fallback can survive the switch's reload, but never promises to remember a future visit.
// If both stores are denied, initial play still works entirely in memory.
function save(next: Credential): boolean {
  if (!visitStorage) {
    try {
      localStorage.setItem(ACCOUNT_KEY, JSON.stringify(next));
      return true;
    } catch {
      persistent = false;
      visitStorage = true;
    }
  }
  try {
    sessionStorage.setItem(ACCOUNT_KEY, JSON.stringify(next));
    visitStorage = true;
    persistent = false;
    return true;
  } catch {
    return false;
  }
}

// Whether the store this tab saves to still holds the token it read; anything else there is someone's newer record.
function holds(token: string): boolean {
  try {
    const saved = (visitStorage ? sessionStorage : localStorage).getItem(ACCOUNT_KEY);
    return saved !== null && readCredential(saved).token === token;
  } catch {
    return false;
  }
}

async function request(path: string, token: string, method = 'GET', body: object = {}): Promise<unknown> {
  const server = import.meta.env.VITE_BOOGLE_SERVER;
  if (!server) throw new Error('The game server is not configured. Reload to retry.');
  const response = await fetch(new URL(`/account/${path}`, server), {
    method,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    ...(method === 'POST' && { body: JSON.stringify(body) }),
    cache: 'no-store',
    signal: AbortSignal.timeout(5000),
  });
  if (!response.ok)
    throw Object.assign(
      new Error(
        response.status === 429
          ? 'Too many tries. Wait a minute and try again.'
          : path === 'sign-in' && (response.status === 401 || response.status === 400)
            ? 'That PIN did not work. Check the five digits and try again.'
            : response.status === 401
              ? 'Sign-in expired or was replaced. Your saved identity was kept.'
              : 'Sign-in is unavailable. Reload to retry.',
      ),
      { status: response.status },
    );
  return response.status === 204 ? null : response.json();
}
function resolved(token: string, value: unknown): Credential {
  const result = value as { pid?: unknown; accountId?: unknown; expiresAt?: unknown } | null;
  if (
    !result ||
    !okPid(result.pid) ||
    typeof result.expiresAt !== 'number' ||
    !Number.isSafeInteger(result.expiresAt) ||
    result.expiresAt <= 0 ||
    (result.accountId !== undefined && !okAccount(result.accountId))
  )
    throw new Error('The server returned an unreadable identity. Reload to retry.');
  return {
    version: 1,
    token,
    pid: result.pid,
    expiresAt: result.expiresAt,
    ...(result.accountId !== undefined && { accountId: result.accountId }),
  };
}

export function prepareAccount(): Promise<void> {
  return (preparing ??= prepare()
    .catch(() => {
      // Even corrupt/blocked storage, a refused session, bad JSON or a timed-out response must reach main.
      problem ??= 'Sign-in is unavailable. Reload to retry.';
      console.warn('[boogle] account unverified, playing on:', problem);
    })
    .then(() => {
      try {
        resetForPerson(localStorage, accountPid(), savedPid);
      } catch {
        // Storage is optional, including its global getter.
      }
    }));
}
async function prepare() {
  let saved: string | null = null;
  try {
    saved = sessionStorage.getItem(ACCOUNT_KEY);
    if (saved !== null) {
      visitStorage = true;
      persistent = false;
    }
  } catch {
    /* Session storage is optional too. */
  }
  if (saved === null) {
    try {
      saved = localStorage.getItem(ACCOUNT_KEY);
    } catch {
      persistent = false;
      visitStorage = true; // The unreadable store may contain an account: never overwrite it.
    }
  }
  if (saved !== null) {
    try {
      credential = readCredential(saved);
      savedPid = credential.pid;
    } catch {
      state = 'unreadable';
      problem = 'The saved sign-in could not be read. It has been kept; this visit is solo.';
      return;
    }
  } else {
    credential = newCredential();
    save(credential); // Lost registration responses retry this token, never create a second person.
  }
  try {
    const next = resolved(
      credential.token,
      await request(credential.pid ? 'session' : 'guest', credential.token, credential.pid ? 'GET' : 'POST'),
    );
    if (credential.pid && credential.pid !== next.pid) throw new Error('The server returned a different identity.');
    credential = next;
    state = 'ready';
    // Another tab may have signed in or out while this check was in flight: never write the former person back.
    if (!switching && holds(next.token)) save(credential);
  } catch (error) {
    state = (error as { status?: number } | null)?.status === 401 ? 'revoked' : 'offline';
    problem =
      state === 'revoked'
        ? 'Sign-in expired or was replaced. Your saved identity was kept.'
        : 'Sign-in is unavailable. Reload to retry.';
    throw error;
  }
}

export function accountPid(): string {
  if (credential?.pid) return credential.pid;
  if (!preparing) throw new Error('Prepare the account before loading the game.');
  // Local only: never allowed into a room, even if registration becomes reachable later in this visit.
  return (standIn ??=
    'local' + Array.from(crypto.getRandomValues(new Uint8Array(8)), (b) => (b % 36).toString(36)).join(''));
}
export function roomAuthentication(tuneKey?: string): RoomAuth {
  if (!credential?.pid || state === 'revoked')
    throw Object.assign(new Error('account unverified'), {
      code: state === 'revoked' ? 'unauthenticated' : 'unverified',
    });
  // A previously verified pid may rejoin when HTTP is unavailable. Do not turn an outage into a fatal refusal.
  return { t: 'auth', token: credential.token, ...(tuneKey && { tuneKey }) };
}
export const accountProblem = () => problem;
export const accountIsPersistent = () => persistent;
export const accountStatus = () => ({ state, persistent, pid: credential?.pid, accountId: credential?.accountId });
export const accountSwitching = () => switching;

// PINs live only in the explicit form/reveal, never in the credential record or room state.
export async function signInAccount(pin: string): Promise<void> {
  if (switching) return;
  const normalized = pin.replace(/[\s-]/g, '');
  if (!/^[0-9]{5}$/.test(normalized)) throw new Error('Enter your five-digit PIN.');
  const next = newCredential();
  await request('sign-in', next.token, 'POST', { pin: normalized });
  await installAccount(next.token);
}

export async function saveAccountPin(replace = false): Promise<string> {
  const current = credential;
  if (switching || !current?.pid || state !== 'ready') throw new Error('Reload to reconnect before saving a PIN.');
  const keep = (value: unknown) => {
    const next = resolved(current.token, value);
    if (switching || credential?.token !== current.token || next.pid !== current.pid || !next.accountId)
      throw new Error('Sign-in changed. Reload to check this account.');
    credential = next;
    save(next);
    problem = undefined;
    return next;
  };
  try {
    const value = await request(replace ? 'rotate-pin' : 'create', current.token, 'POST');
    keep(value);
    const pin = (value as { pin?: unknown }).pin;
    if (typeof pin !== 'string' || !/^[0-9]{5}$/.test(pin)) throw new Error('PIN unavailable.');
    return pin;
  } catch (error) {
    // A lost create/rotate reply is not failure on the server. Recover status, never invent/reveal the old PIN.
    try {
      keep(await request('session', current.token));
    } catch {
      /* Keep the current identity; a reload can retry resolution. */
    }
    if ((error as { status?: number } | null)?.status === 429) throw error;
    throw new Error('Could not show the PIN. If this account was saved, use Replace PIN; otherwise reload to retry.', {
      cause: error,
    });
  }
}

/** A room can discover expiry/revocation after boot. Keep the same person, but stop offering that session. */
export function accountRefused() {
  state = 'revoked';
  problem = 'Sign-in expired or was replaced. Your saved identity was kept.';
}

/** The net owner closes the old room before navigation; reload disposes carry, seats, input and prediction. */
export function onAccountReload(close: () => void) {
  beforeReload = close;
}
function reload(destination?: string) {
  if (!switching) {
    switching = true;
    beforeReload();
  }
  if (destination) location.assign(destination);
  else location.reload();
}
/** Install only a server-verified device session. Never mutate the public identity of a running game. */
export async function installAccount(token: string): Promise<void> {
  if (switching) return;
  if (!isSessionToken(token)) throw new Error('Invalid device session.');
  const next = resolved(token, await request('session', token));
  if (switching) return;
  if (!save(next)) throw new Error('This browser cannot keep a sign-in through reload. Your current visit was kept.');
  reload();
}
/** Start fresh/sign-out forgets this device, not the server account or any room. */
export async function signOutAccount(destination?: string): Promise<void> {
  if (switching) return;
  const next = newCredential();
  if (!save(next)) {
    // With both stores blocked there is no safe way to replace a possibly saved session across reload.
    throw new Error('This browser cannot save the sign-out. Your current visit was kept.');
  }
  if (visitStorage) {
    try {
      // A tab-only replacement must not reveal the old durable sign-in when this tab closes, even offline.
      localStorage.removeItem(ACCOUNT_KEY);
    } catch {
      // The tab store just accepted a write, so put this visit back before reporting an incomplete sign-out.
      if (credential) save(credential);
      else sessionStorage.removeItem(ACCOUNT_KEY);
      throw new Error('This browser cannot forget its saved sign-in. Your current visit was kept.');
    }
  }
  switching = true;
  beforeReload();
  try {
    if (credential) await request('sign-out', credential.token, 'POST');
  } catch {
    /* Local sign-out still completes offline; never wait longer than the bounded request. */
  }
  reload(destination);
}

// Another tab switched people or signed out. Do not let this tab write the former person's unkeyed visit memory.
globalThis.addEventListener?.('storage', (event) => {
  if (switching || event.key !== ACCOUNT_KEY) return;
  let next: Credential | undefined;
  try {
    if (event.newValue) next = readCredential(event.newValue);
  } catch {
    /* Reload into the unreadable state. */
  }
  if (next?.token === credential?.token && next?.pid === credential?.pid) return;
  if (visitStorage) {
    try {
      // Device sign-out applies to tab-only credentials too. Reload must not restore the stale fallback.
      sessionStorage.removeItem(ACCOUNT_KEY);
    } catch {
      // If the browser cannot forget it, stop this tab's room and visit writers without reloading that person.
      switching = true;
      beforeReload();
      problem = 'Sign-in changed in another tab. Close this tab to finish signing out.';
      return;
    }
  }
  reload();
});

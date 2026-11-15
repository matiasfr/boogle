// Step 2's connection bootstrap only. Account UI and switching people belong to accounts step 3/4.
import { isSessionToken, type RoomAuth } from '../net/account-wire.ts';
import { okPid } from '../sim/roster.ts';

export const ACCOUNT_KEY = 'boogle.account';
type Credential = { version: 1; token: string; pid?: string };
let credential: Credential | undefined;
let preparing: Promise<void> | undefined;
let persistent = true;
// Set when boot could not verify this device with the account server (offline, server down, a refused or unreadable
// credential). The game still boots: with a previously verified pid it can rejoin rooms; without one it plays solo
// under a local stand-in pid that is never sent to a room.
let unverified: string | undefined;
let standIn: string | undefined;

function save() {
  try {
    localStorage.setItem(ACCOUNT_KEY, JSON.stringify(credential));
  } catch {
    persistent = false;
  }
}

export function prepareAccount(): Promise<void> {
  return (preparing ??= prepare().catch((error: unknown) => {
    unverified = error instanceof Error ? error.message : String(error);
    console.warn('[boogle] account unverified, playing on:', unverified);
  }));
}

async function prepare() {
  const server = import.meta.env.VITE_BOOGLE_SERVER;
  if (!server) throw new Error('The game server is not configured.');
  let saved: string | null = null;
  try {
    saved = localStorage.getItem(ACCOUNT_KEY);
  } catch {
    persistent = false;
  }
  if (saved !== null) {
    let value: unknown;
    try {
      value = JSON.parse(saved);
    } catch {
      /* Refuse corrupt credentials without overwriting them. */
    }
    const record = value as Partial<Credential> | null;
    if (
      !record ||
      record.version !== 1 ||
      !isSessionToken(record.token) ||
      (record.pid !== undefined && !okPid(record.pid))
    )
      throw new Error('The saved sign-in could not be read.');
    credential = { version: 1, token: record.token, ...(record.pid && { pid: record.pid }) };
  } else {
    const token = Array.from(crypto.getRandomValues(new Uint8Array(32)), (b) => b.toString(16).padStart(2, '0')).join(
      '',
    );
    credential = { version: 1, token };
    save(); // Persist before registration: a lost response retries the same token, never makes a second person.
  }
  const response = await fetch(new URL(credential.pid ? '/account/session' : '/account/guest', server), {
    method: credential.pid ? 'GET' : 'POST',
    headers: { Authorization: `Bearer ${credential.token}`, 'Content-Type': 'application/json' },
    ...(credential.pid ? {} : { body: '{}' }),
    cache: 'no-store',
    signal: AbortSignal.timeout(5000),
  });
  if (!response.ok)
    throw new Error(
      response.status === 401
        ? 'Sign-in expired. Your saved identity was kept.'
        : 'Sign-in is unavailable. Please reload to retry.',
    );
  const result: unknown = await response.json();
  const pid = (result as { pid?: unknown } | null)?.pid;
  if (!okPid(pid) || (credential.pid && credential.pid !== pid))
    throw new Error('The server returned a different identity.');
  credential.pid = pid;
  save();
}

export function accountPid(): string {
  if (credential?.pid) return credential.pid;
  if (!preparing) throw new Error('Prepare the account before loading the game.');
  // Unverified with no earlier pid: a local stand-in for this visit's solo play only.
  return (standIn ??=
    'local' + Array.from(crypto.getRandomValues(new Uint8Array(8)), (b) => (b % 36).toString(36)).join(''));
}
export function roomAuthentication(tuneKey?: string): RoomAuth {
  // A stand-in pid must never reach a room: the server would bind the token to a different person.
  if (!credential?.pid || !credential.token)
    throw Object.assign(new Error('account unverified'), { code: 'unverified' });
  return { t: 'auth', token: credential.token, ...(tuneKey && { tuneKey }) };
}
export const accountProblem = () => unverified;
export const accountIsPersistent = () => persistent;

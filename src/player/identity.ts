// Who this player is across reloads: the player id (pid). The one owner of where the pid comes from, so a later
// transfer code or optional account can adopt the same pid (adoptPid) instead of minting a new one. Plan:
// docs/plans/0.1-groundwork.md, "Identity: now and later".
//
//   identity            { pid, guest, ready }: ready resolves once pid is known (the Web Lock answers in a few ms)
//   adoptPid(pid)       make this browser play as pid from the next load (a transfer code or account link, later)
//
// The pid is 10 random [a-z0-9] characters in localStorage `boogle.pid`, shared by every room. The host binds it to
// this tab's session and stamps it on every edit (src/world/sync.ts), so a tab can't pour or take in someone else's
// name by claiming their pid in an edit, nor claim the pid of anyone in the room. A second tab of the same browser can't take the `boogle.pid` Web Lock, so it
// plays as a guest with its own pid in sessionStorage (it survives that tab's reloads; a lock of its own gives a
// duplicated tab a fresh one) and says so: two tabs on one pid
// would share one stack and one plaque line. Without Web Locks (an insecure context) every tab uses the stored pid.
// Nothing here is personal data: a random id next to the nickname you typed.
import { okPid } from '../sim/roster.ts';

const KEY = 'boogle.pid';
const GUEST_KEY = 'boogle.guestPid';
const LEN = 10;

function newPid() {
  const bytes = crypto.getRandomValues(new Uint8Array(LEN));
  return Array.from(bytes, (b) => (b % 36).toString(36)).join('');
}

// window.localStorage itself throws where site data is blocked: then every load is a new player.
function storage(name: 'localStorage' | 'sessionStorage'): Storage | null {
  try {
    return globalThis[name] ?? null;
  } catch {
    return null;
  }
}
function stored(store: Storage | null, key: string): string {
  try {
    if (!store) throw new Error('no storage');
    const v = store.getItem(key);
    if (okPid(v)) return v;
    const fresh = newPid();
    store.setItem(key, fresh);
    return fresh;
  } catch {
    return newPid(); // storage blocked (private mode): a new player each load
  }
}

// Resolves true if this tab holds the lock `name` for the rest of its life, false if another tab has it.
function takeLock(name: string): Promise<boolean> {
  if (!navigator.locks?.request) return Promise.resolve(true);
  return new Promise((resolve) => {
    navigator.locks
      .request(name, { ifAvailable: true }, (lock) => {
        resolve(!!lock);
        return lock ? new Promise(() => {}) : null; // held until the tab closes
      })
      .catch(() => resolve(true));
  });
}

export type Identity = { pid: string | null; guest: boolean; ready: Promise<Identity> };

// A guest pid has its own lock too: a duplicated tab copies sessionStorage, and must not play on its source's pid.
async function resolve(): Promise<Identity> {
  if (await takeLock(KEY)) {
    identity.pid = stored(storage('localStorage'), KEY);
    return identity;
  }
  identity.guest = true;
  const session = storage('sessionStorage');
  let pid = stored(session, GUEST_KEY);
  if (!(await takeLock(`${KEY}.${pid}`))) {
    pid = newPid();
    try {
      session?.setItem(GUEST_KEY, pid);
    } catch {
      // blocked storage: this guest pid lasts this load
    }
    await takeLock(`${KEY}.${pid}`);
  }
  identity.pid = pid;
  return identity;
}
// ready never rejects: a failure still gives this load a pid, so the room never waits on identity.
export const identity: Identity = {
  pid: null,
  guest: false,
  ready: resolve().catch(() => {
    identity.pid ??= newPid();
    return identity;
  }),
};

export function adoptPid(pid: unknown): boolean {
  if (!okPid(pid)) return false;
  try {
    storage('localStorage')?.setItem(KEY, pid);
    return !!storage('localStorage');
  } catch {
    return false;
  }
}

// Who this player is across reloads: the player id (pid). The one owner of where the pid comes from, so a later
// transfer code or optional account can adopt the same pid (adoptPid) instead of minting a new one. Plan:
// docs/plans/0.1-groundwork.md, "Identity: now and later".
//
//   identity            { pid, guest, ready }: ready resolves once pid is known (the Web Lock answers in a few ms)
//   adoptPid(pid)       make this browser play as pid from the next load (a transfer code or account link, later)
//
// The pid is 10 random [a-z0-9] characters in localStorage `boogle.pid`, shared by every room. The host binds it to
// this tab's session and stamps it on every edit (src/world/sync.js), so a tab can't pour or take in someone else's
// name by claiming their pid in an edit. A second tab of the same browser can't take the `boogle.pid` Web Lock, so it
// plays as a guest with its own pid in sessionStorage (it survives that tab's reloads) and says so: two tabs on one pid
// would share one stack and one plaque line. Without Web Locks (an insecure context) every tab uses the stored pid.
// Nothing here is personal data: a random id next to the nickname you typed.
const KEY = 'boogle.pid';
const GUEST_KEY = 'boogle.guestPid';
const LEN = 10;
const PID_RE = /^[a-z0-9]{1,32}$/; // the same rule as src/world/sync.js okPid

function newPid() {
  const bytes = crypto.getRandomValues(new Uint8Array(LEN));
  return Array.from(bytes, (b) => (b % 36).toString(36)).join('');
}

function stored(storage, key) {
  try {
    const v = storage.getItem(key);
    if (PID_RE.test(v ?? '')) return v;
    const fresh = newPid();
    storage.setItem(key, fresh);
    return fresh;
  } catch {
    return newPid(); // storage blocked (private mode): a new player each load
  }
}

// Resolves true if this tab holds the lock for the rest of its life, false if another tab has it.
function takeLock() {
  if (!navigator.locks?.request) return Promise.resolve(true);
  return new Promise((resolve) => {
    navigator.locks
      .request(KEY, { ifAvailable: true }, (lock) => {
        resolve(!!lock);
        return lock ? new Promise(() => {}) : null; // held until the tab closes
      })
      .catch(() => resolve(true));
  });
}

export const identity = { pid: null, guest: false, ready: null };
identity.ready = takeLock().then((primary) => {
  identity.guest = !primary;
  identity.pid = primary ? stored(localStorage, KEY) : stored(sessionStorage, GUEST_KEY);
  return identity;
});

export function adoptPid(pid) {
  if (!PID_RE.test(pid ?? '')) return false;
  try {
    localStorage.setItem(KEY, pid);
    return true;
  } catch {
    return false;
  }
}

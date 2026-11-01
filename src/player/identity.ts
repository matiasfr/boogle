// Who this player is across reloads: the player id (pid). The one owner of where the pid comes from, so a later
// transfer code or optional account can adopt the same pid (adoptPid) instead of minting a new one. Plans:
// docs/plans/0.1-groundwork.md, "Identity: now and later"; docs/plans/net-roadmap.md, phase 1.
//
//   identity            { pid, key }: key is this browser's secret behind pid (never in presence or on screen)
//   adoptPid(pid)       make this browser play as pid from the next load (a transfer code or account link, later)
//
// The pid is 10 random [a-z0-9] characters in localStorage `boogle.pid`, shared by every room and every tab of this
// browser, with a secret key in `boogle.key`. The tab sends both when it connects (src/net/ws-room.ts); the server
// binds the pid to that socket and stamps it on every edit (src/world/sync.ts), and refuses a pid that is in the room
// under another key, so nobody can take over a player who is there by copying the pid from presence. Two tabs of one
// browser are one player: the newer one takes over and the older one stops (src/features/identity.ts says so). Where storage is blocked
// (private mode, blocked site data) every load is a new player. Nothing here is personal data: a random id next to
// the nickname you typed.
import { okPid } from '../sim/roster.ts';
import { okKey } from '../net/ids.ts';

const KEY = 'boogle.pid';
const SECRET = 'boogle.key';
const LEN = 10;
const KEY_LEN = 24;

function newPid(len = LEN) {
  const bytes = crypto.getRandomValues(new Uint8Array(len));
  return Array.from(bytes, (b) => (b % 36).toString(36)).join('');
}

// window.localStorage itself throws where site data is blocked.
function local(): Storage | null {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}
function stored(name: string, ok: (v: unknown) => v is string, len: number): string {
  try {
    const store = local();
    if (!store) throw new Error('no storage');
    const v = store.getItem(name);
    if (ok(v)) return v;
    const fresh = newPid(len);
    store.setItem(name, fresh);
    return fresh;
  } catch {
    return newPid(len);
  }
}

export type Identity = { pid: string; key: string };
export const identity: Identity = { pid: stored(KEY, okPid, LEN), key: stored(SECRET, okKey, KEY_LEN) };

export function adoptPid(pid: unknown): boolean {
  if (!okPid(pid)) return false;
  try {
    local()?.setItem(KEY, pid);
    return !!local();
  } catch {
    return false;
  }
}

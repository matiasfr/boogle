// What the residents told this player (met, noticed, said, rumour, hello, street): Personal Local, per railway room and
// player, in localStorage `boogle.railway-town.v0:<railwayRoomId>:<pid>`. A world bump prunes it
// (src/player/world-reset.ts). The residents (src/proto/place/residents.ts) check whatever `load` returns, so bad data
// starts empty. Unavailable storage just forgets.
import { getRoomId } from '../../netplay/net.ts';
import { identity } from '../../player/identity.ts';
import { railwayRoomId } from '../../world/railway-namespace.ts';

const SAVE_MS = 400;

export function createTownMemory() {
  const key = `boogle.railway-town.v0:${railwayRoomId(getRoomId())}:${identity.pid}`;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let latest: unknown = null;
  const write = () => {
    timer = undefined;
    try {
      localStorage.setItem(key, JSON.stringify(latest));
    } catch {
      // Unavailable storage: the residents greet you again next visit, which is harmless.
    }
  };
  return {
    load(): unknown {
      try {
        return JSON.parse(localStorage.getItem(key) ?? 'null');
      } catch {
        return null;
      }
    },
    /** Debounced: a talk can change several things at once. */
    save(seen: unknown) {
      latest = seen;
      timer ??= setTimeout(write, SAVE_MS);
    },
    /** Write now, if anything's waiting (the town going away). */
    flush() {
      if (timer === undefined) return;
      clearTimeout(timer);
      write();
    },
  };
}

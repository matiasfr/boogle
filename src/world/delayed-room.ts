// A room with added latency for tests and captures: every message sent and heard waits half of `rttMs` (timers, not
// loss or jitter; connection changes are immediate, and what was still on its way when the connection changed is
// dropped, as a closed socket would). The headless room test's &lat and the game's dev-only &railLag=<ms> (the
// railway's own messages) use it. One wrapper per room and lag, so a re-attach sees the same object.
import type { WorldRoom } from './sync.ts';

const wrapped = new WeakMap<WorldRoom, Map<number, WorldRoom>>();
export function delayedRoom(room: WorldRoom, rttMs: number): WorldRoom {
  if (!(rttMs > 0)) return room;
  let byLag = wrapped.get(room);
  if (!byLag) wrapped.set(room, (byLag = new Map()));
  const known = byLag.get(rttMs);
  if (known) return known;
  const half = rttMs / 2;
  let generation = 0;
  room.onConnection(() => void generation++);
  const later = (fn: () => void) => {
    const g = generation;
    setTimeout(() => {
      if (g === generation) fn();
    }, half);
  };
  const out: WorldRoom = {
    get selfId() {
      return room.selfId;
    },
    send: (m) => later(() => room.send(m)),
    onMessage: (h) => room.onMessage((m, from) => later(() => h(m, from))),
    onConnection: (h) => room.onConnection(h),
  };
  byLag.set(rttMs, out);
  return out;
}

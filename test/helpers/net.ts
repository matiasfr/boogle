// A fake in-memory room for world sync tests: one host + clients, a deterministic frame driver. Peers are
// { s: createSync(), p: net.add(...) } (plus whatever state the test keeps); `run` steps every live peer's world.
// net.add(id, host, pid) binds the session to a player as the server does (pid defaults to the id; null: none), and
// every room's pidOf reads those bindings.
import { setImmediate } from 'node:timers';
import type { WorldRoom } from '../../src/world/sync.ts';

type MsgHandler = (m: unknown, from: string) => void;
type ConnHandler = (connected: boolean) => void;
export type FakePeer = {
  id: string;
  host?: boolean;
  pid: string | null;
  msg: Set<MsgHandler>;
  connCb: Set<ConnHandler>;
  alive: boolean;
  up: boolean;
  room: WorldRoom & { pidOf: (sid: string) => string | null };
};
export type FakeNet = ReturnType<typeof makeNet>;
/** What `run` steps: a sync with a world, bound to a fake peer. */
export type Driven = { s: { updateWorld(dt: number): void }; p: { alive: boolean; host?: boolean } };

export function makeNet() {
  const peers: FakePeer[] = [];
  const net = {
    queue: [] as { from: FakePeer; m: unknown }[],
    peers,
    add(id: string, host?: boolean, pid: string | null = id): FakePeer {
      const p: FakePeer = {
        id,
        host,
        pid,
        msg: new Set(),
        connCb: new Set(),
        alive: true,
        up: true,
        room: {
          selfId: id,
          send(m) {
            if (p.up) net.queue.push({ from: p, m: JSON.parse(JSON.stringify(m)) });
          },
          onMessage: (h) => (p.msg.add(h), () => p.msg.delete(h)),
          onConnection: (h) => (p.connCb.add(h), () => p.connCb.delete(h)),
          pidOf: (sid) => peers.find((x) => x.id === sid)?.pid ?? null,
        },
      };
      peers.push(p);
      return p;
    },
    // host's message -> all clients; a client's -> host and the other clients (as the server relays)
    flush() {
      const q = net.queue;
      net.queue = [];
      for (const { from, m } of q) {
        if (!from.alive) continue;
        for (const p of peers) if (p !== from && p.alive && p.up) for (const h of p.msg) h(m, from.id);
      }
    },
    // A peer's room drops and later comes back (a tab's socket reconnecting): nothing in or out meanwhile.
    setUp(p: FakePeer, up: boolean) {
      p.up = up;
      for (const h of p.connCb) h(up);
    },
  };
  return net;
}

// Drive `frames` frames of 50 ms: every live peer's world, then the microtasks (stamped-edit flushes), then the net.
export async function run(net: FakeNet, peers: readonly Driven[], frames: number) {
  for (let f = 0; f < frames; f++) {
    for (const x of peers) if (x.p.alive) x.s.updateWorld(0.05);
    await new Promise((r) => setImmediate(r));
    net.flush();
  }
}
export const live = <T extends Driven>(peers: readonly T[]) => peers.filter((x) => x.p.alive);

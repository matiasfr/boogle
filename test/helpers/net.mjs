// A fake in-memory room for world sync tests: one host + clients, a deterministic frame driver. Peers are
// { s: createSync(), p: net.add(...) } (plus whatever state the test keeps); `run` steps every live peer's world.
import { setImmediate } from 'node:timers';

export function makeNet() {
  const peers = []; // { id, room, handlers, host }
  const net = {
    queue: [],
    peers,
    add(id, host) {
      const p = { id, host, msg: new Set(), connCb: new Set(), alive: true, up: true };
      p.room = {
        selfId: id,
        send(m) {
          if (p.up) net.queue.push({ from: p, m: JSON.parse(JSON.stringify(m)) });
        },
        onMessage: (h) => (p.msg.add(h), () => p.msg.delete(h)),
        onConnection: (h) => (p.connCb.add(h), () => p.connCb.delete(h)),
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
    setUp(p, up) {
      p.up = up;
      for (const h of p.connCb) h(up);
    },
  };
  return net;
}

// Drive `frames` frames of 50 ms: every live peer's world, then the microtasks (stamped-edit flushes), then the net.
export async function run(net, peers, frames) {
  for (let f = 0; f < frames; f++) {
    for (const x of peers) if (x.p.alive) x.s.updateWorld(0.05);
    await new Promise((r) => setImmediate(r));
    net.flush();
  }
}
export const live = (peers) => peers.filter((x) => x.p.alive);

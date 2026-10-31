// Test page: wraps createPeerRoom and records everything the assertions in run.mjs need.
import { createPeerRoom } from '../../src/net/peer-room.ts';
import { createSync } from '../../src/world/sync.ts';
import { installRules } from '../../src/world/rules/index.ts';

const q = new URLSearchParams(location.search);

// Every RTCPeerConnection the page opens, for byte counts in stats() (load.mjs).
const pcs = [];
const RTC = window.RTCPeerConnection;
window.RTCPeerConnection = function (...a) {
  const pc = new RTC(...a);
  pcs.push(pc);
  return pc;
};
window.RTCPeerConnection.prototype = RTC.prototype;

const T = (window.T = {
  room: null,
  score: Number(q.get('score') || 0), // with ?score=: this tab's host score (tests change it to force a handover)
  events: [],
  left: [],
  msgs: {},
  lat: [],
  conn: [],
  hostChanges: [],
  errors: [],
  // Resolves to this tab's selfId, or { error: code } when the room turns it away (room_full).
  async start() {
    let room;
    try {
      room = T.room = await createPeerRoom({
        roomId: q.get('room'),
        signal: { host: '127.0.0.1', port: Number(q.get('port')), path: '/peerjs', secure: false },
        iceServers: q.get('stun') ? [{ urls: 'stun:stun.l.google.com:19302' }] : [],
        debug: Number(q.get('debug') || 0),
        ...(q.get('max') ? { maxPeers: Number(q.get('max')) } : {}),
        ...(q.get('score') ? { hostScore: () => T.score } : {}),
        ...(q.get('nolane') ? { fastLane: false } : {}),
      });
    } catch (e) {
      return { error: String(e.code), max: e.max };
    }
    room.onConnection(
      (c) => T.conn.push({ at: Date.now(), c }),
      (e) => T.errors.push(String(e.code)),
    );
    room.onHostChange((h) => T.hostChanges.push({ at: Date.now(), h }));
    if (q.get('pid')) startWorld(room, q.get('pid'));
    room.onMessage((m, from) => {
      if (typeof m.t === 'string') return; // world sync's own messages (w:...)
      if (m.from !== from) T.errors.push('from mismatch');
      (T.msgs[from] ||= []).push(m.n);
    });
    room.onPeers((ch) => {
      const at = Date.now();
      for (const p of ch.left) T.left.push({ peer: p.peer, at });
      for (const p of [...ch.joined, ...ch.updated]) {
        const pr = p.presence;
        if (!p.sameTab && pr.kind === 'lat') T.lat.push({ peer: p.peer, n: pr.n, ms: at - pr.ts });
      }
    });
    return room.selfId;
  },
  burst(count) {
    for (let i = 0; i < count; i++) T.room.send({ from: T.room.selfId, n: i });
  },
  latency(count, every) {
    return new Promise((res) => {
      let n = 0;
      const t = setInterval(() => {
        T.room.presence({ kind: 'lat', n: n++, ts: Date.now() });
        if (n >= count) {
          clearInterval(t);
          res();
        }
      }, every);
    });
  },
  // Sends a game-sized presence (pose plus a few feature fields) at `hz` until stopLoad(); counts the updates seen
  // (peer-room coalesces a peer's packets within one flush, latest wins, so this can be below what was sent).
  load(hz) {
    T.got = 0;
    T.lat.length = 0;
    T.unsubLoad?.();
    T.unsubLoad = T.room.onPeers((ch) => (T.got += ch.updated.filter((p) => !p.sameTab).length));
    let n = 0;
    T.loadTimer = setInterval(() => {
      const r = () => Math.round(Math.random() * 2000) / 100;
      T.room.presence({
        kind: 'lat',
        n: n++,
        ts: Date.now(),
        p: [r(), r(), r()],
        r: r(),
        s: 1,
        n2: 'player',
        c: 3,
        b: [r(), r(), r(), r()],
      });
    }, 1000 / hz);
  },
  stopLoad() {
    clearInterval(T.loadTimer);
    T.unsubLoad?.();
  },
  // Bytes over every connection this page opened; a closed one keeps its last reading, so totals never go down.
  async stats() {
    let sent = 0,
      received = 0;
    for (const pc of pcs) {
      if (pc.connectionState !== 'closed') {
        const t = { sent: 0, received: 0 };
        for (const s of (await pc.getStats()).values())
          if (s.type === 'transport') {
            t.sent += s.bytesSent || 0;
            t.received += s.bytesReceived || 0;
          }
        pc.last = t;
      }
      sent += pc.last?.sent ?? 0;
      received += pc.last?.received ?? 0;
    }
    return { sent, received, got: T.got, lat: T.lat.map((l) => l.ms), host: T.room.isHost() };
  },
  snap() {
    const r = T.room;
    return {
      self: r.selfId,
      host: r.isHost(),
      peers: r.peers().map((p) => ({ peer: p.peer, sameTab: p.sameTab, presence: p.presence })),
    };
  },
});

// With ?pid=: the real world sync and rules on this room, playing as that player id (run.mjs, "world ids").
function startWorld(room, pid) {
  const w = (T.world = createSync());
  w.setPid(pid);
  T.rules = installRules(w, { n: 409, layout: { trees: [], perches: [] } });
  w.attachWorld(room, { roomId: q.get('room'), storage: null });
  let last = performance.now();
  setInterval(() => {
    const now = performance.now();
    w.updateWorld((now - last) / 1000);
    last = now;
  }, 50);
  T.who = (n, u) => w.submitEdit({ op: 'who.set', i: 0, j: 0, n, c: 1, ...(u ? { u } : {}) });
  T.worldSnap = () => ({ ...w.worldStatus(), roster: JSON.parse(JSON.stringify(w.snapshot().data.roster)) });
}

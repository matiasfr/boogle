// Test page: wraps createPeerRoom and records everything the assertions in run.mjs need.
import { createPeerRoom } from '../../src/net/peer-room.js';

const q = new URLSearchParams(location.search);
const T = (window.T = {
  room: null, events: [], left: [], msgs: {}, lat: [], conn: [], hostChanges: [], errors: [],
  async start() {
    const room = (T.room = await createPeerRoom({
      roomId: q.get('room'),
      signal: { host: '127.0.0.1', port: Number(q.get('port')), path: '/peerjs', secure: false },
      iceServers: q.get('stun') ? [{ urls: 'stun:stun.l.google.com:19302' }] : [],
      debug: Number(q.get('debug') || 0),
    }));
    room.onConnection(c => T.conn.push({ at: Date.now(), c }), e => T.errors.push(String(e.code)));
    room.onHostChange(h => T.hostChanges.push({ at: Date.now(), h }));
    room.onMessage((m, from) => {
      if (m.from !== from) T.errors.push('from mismatch');
      (T.msgs[from] ||= []).push(m.n);
    });
    room.onPeers(ch => {
      const at = Date.now();
      for (const p of ch.left) T.left.push({ peer: p.peer, at });
      for (const p of [...ch.joined, ...ch.updated]) {
        const pr = p.presence;
        if (!p.sameTab && pr.kind === 'lat') T.lat.push({ peer: p.peer, n: pr.n, ms: at - pr.ts });
      }
    });
    return room.selfId;
  },
  burst(count) { for (let i = 0; i < count; i++) T.room.send({ from: T.room.selfId, n: i }); },
  latency(count, every) {
    return new Promise(res => {
      let n = 0;
      const t = setInterval(() => {
        T.room.presence({ kind: 'lat', n: n++, ts: Date.now() });
        if (n >= count) { clearInterval(t); res(); }
      }, every);
    });
  },
  snap() {
    const r = T.room;
    return {
      self: r.selfId, host: r.isHost(),
      peers: r.peers().map(p => ({ peer: p.peer, sameTab: p.sameTab, presence: p.presence })),
    };
  },
});

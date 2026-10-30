// peer-room.js - a "room" for Boogle on top of PeerJS (WebRTC data channels).
//
// Topology: star. The host's PeerJS id is `boogle-<room>-host`. Whoever registers it is the host; everyone else
// registers a random id and connects only to the host. If the host disappears, every client waits a random
// 200-1200 ms and tries to claim the host id; the winner becomes host and the rest reconnect to it.
//
// Each client opens TWO DataConnections to the host (JSON serialization, metadata { selfId }):
//   'u' (reliable:false)  presence, latest-state-wins.  NOTE: in peerjs 1.5.4 `reliable:false` only means
//                         `ordered:false` (the SCTP channel still retransmits, there is no maxRetransmits), so we
//                         coalesce in the app (LatestSender) and tag each update with a sequence number to drop stale ones.
//   'r' (reliable:true)   ordered messages, list/left notices, heartbeats.
//
// Wire messages (all plain objects with a `t` field; anything else is ignored):
//   client -> host   u: { t:'p', s, d }            my full presence `d`, sequence `s`
//                    r: { t:'m', d }               send() payload, host relays it with the origin id
//                    r: { t:'hb' } | { t:'bye' }   heartbeat (0.5 s) / leaving
//   host -> client   r: { t:'list', peers:[{id,s,d}], last }   everyone currently known (chunked), sent on connect
//                    u: { t:'p', id, s, d }        a peer's presence (relayed; includes the host's own)
//                    r: { t:'left', id, s }        a peer is gone (s = last seq seen, so late 'p' can't resurrect it)
//                    r: { t:'m', from, d }         relayed send() payload
//                    r: { t:'hb' }                 heartbeat (0.5 s); a client that hears nothing for 3 s assumes the host died
// Ids in messages are the tab's stable selfId, never PeerJS ids, so identities survive host migration.
// Host drops a client after 3 s of silence (and announces `left` at once). Either side also treats the WebRTC
// connection itself going 'failed'/'closed' (or 'disconnected' for > 1.5 s) as the peer being gone; a hard-killed
// renderer sends nothing and its channels can linger for tens of seconds, so the heartbeat is the reliable signal.
// A side whose own timers stalled (frozen tab, sleep) forgives the silence it could not have measured. After a migration, peers that haven't come back within GRACE_MS are
// reported as `left` (instead of flapping everyone at the moment the host dies).

import { Peer } from 'peerjs';

const MAX_MSG = 16000; // max JSON size of one presence / message (peerjs JSON channel refuses >= 16300 bytes)
const HEARTBEAT_MS = 500; // background tabs clamp timers to 1 s, still well inside DEAD_MS
const DEAD_MS = 3000;
const PC_GRACE_MS = 1500; // RTCPeerConnection 'disconnected' may recover (ICE restart / brief network blip); 'failed'/'closed' may not
const GRACE_MS = 9000; // after (re)connecting, how long peers from before a migration may stay silent (> DEAD_MS + max retry delay + connect)
const SIGNAL_TIMEOUT_MS = 8000; // registering an id with the signaling server
const OPEN_TIMEOUT_MS = 10000; // WebRTC connection to the host (both channels + peer list); generous for TURN and slow devices
const MIN_GAP_MS = 20; // per-key minimum spacing of presence packets (coalescing beyond this)
const HIGH_WATER = 64 * 1024; // dataChannel.bufferedAmount above which we hold presence back
const OUTBOX_MAX = 200; // send() calls kept while disconnected
const FATAL = new Set(['browser-incompatible', 'invalid-id', 'invalid-key', 'ssl-unavailable']);

const rand = (n) => {
  const b = crypto.getRandomValues(new Uint8Array(n));
  return Array.from(b, (x) => (x % 36).toString(36)).join('');
};
const SELF_ID = rand(10); // per page load; deliberately not the PeerJS id
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const isObj = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const okId = (s) => typeof s === 'string' && /^[a-z0-9]{1,32}$/.test(s);
const okSeq = (n) => Number.isSafeInteger(n) && n >= 0;
const tooBig = (v) => JSON.stringify(v).length > MAX_MSG;
const err = (code, msg) => Object.assign(new Error(msg || code), { code });
const safeRoom = (s) => s.replace(/[^A-Za-z0-9]/g, (c) => '_' + c.charCodeAt(0).toString(16));

// Sends, closes and destroys on a connection or peer that may already be closing: errors are expected, ignore them.
function quietly(fn) {
  try {
    fn();
  } catch {
    /* already closing */
  }
}
const safeSend = (conn, msg) => quietly(() => conn.send(msg));
const clearTimers = (timers) =>
  timers.forEach((t) => {
    clearInterval(t);
    clearTimeout(t);
  });

// Calls onGone (once) when the underlying RTCPeerConnection of a DataConnection fails, closes, or stays disconnected.
// Needed because a data channel can stay 'open' for a long time after the other end died.
function watchPc(conn, onGone, timers) {
  const pc = conn.peerConnection;
  if (!pc || !pc.addEventListener) return;
  let t = 0;
  const check = () => {
    clearTimeout(t);
    const st = pc.connectionState || pc.iceConnectionState;
    if (st === 'failed' || st === 'closed') onGone();
    else if (st === 'disconnected') {
      t = setTimeout(check, PC_GRACE_MS);
      timers.push(t);
    }
  };
  pc.addEventListener('connectionstatechange', check);
  pc.addEventListener('iceconnectionstatechange', check);
}

// Latest-wins sender: at most one pending packet per key, spaced >= MIN_GAP_MS, held back while buffers are full.
function makeSender(getConn) {
  const pending = new Map(),
    last = new Map();
  let timer = 0;
  const trySend = (key, msg) => {
    const c = getConn();
    if (!c || !c.open) return true; // nowhere to send: drop
    if ((c.dataChannel?.bufferedAmount || 0) > HIGH_WATER || (c.bufferSize || 0) > 0) return false;
    const now = performance.now();
    if (now - (last.get(key) ?? -1e9) < MIN_GAP_MS) return false;
    last.set(key, now);
    safeSend(c, msg);
    return true;
  };
  const drain = () => {
    timer = 0;
    for (const [k, m] of pending) if (trySend(k, m)) pending.delete(k);
    if (pending.size) timer = setTimeout(drain, MIN_GAP_MS);
  };
  return {
    put(key, msg) {
      if (!pending.size && trySend(key, msg)) return;
      pending.set(key, msg);
      if (!timer) timer = setTimeout(drain, MIN_GAP_MS);
    },
    clear() {
      pending.clear();
      clearTimeout(timer);
      timer = 0;
    },
  };
}

export async function createPeerRoom(opts = {}) {
  if (typeof RTCPeerConnection === 'undefined') throw err('browser-incompatible', 'WebRTC is not available');
  const roomId = String(opts.roomId ?? 'default');
  const hostId = `boogle-${safeRoom(roomId)}-host`;
  const peerOpts = { debug: opts.debug ?? 0 };
  for (const k of ['host', 'port', 'path', 'secure', 'key'])
    if (opts.signal?.[k] !== undefined) peerOpts[k] = opts.signal[k];
  if (opts.iceServers) peerOpts.config = { iceServers: opts.iceServers };

  // ---- peer table (me + everyone known) and change notification ----
  const table = new Map(); // id -> { presence, at, entry }
  const seqs = new Map(); // id -> highest presence seq seen (kept after leaving, as a tombstone)
  let mine = {},
    mySeq = 0,
    cache = null;
  const mkEntry = (id, rec) =>
    Object.freeze({ peer: id, sameTab: id === SELF_ID, presence: rec.presence, updatedAt: rec.at });
  function setRec(id, presence) {
    const rec = { presence: Object.freeze({ ...presence }), at: Date.now() };
    rec.entry = mkEntry(id, rec);
    table.set(id, rec);
    cache = null;
    return rec;
  }
  const peersHandlers = new Set(),
    connHandlers = new Set(),
    msgHandlers = new Set(),
    hostHandlers = new Set(),
    errHandlers = new Set();
  let pj = new Set(),
    pu = new Set(),
    pl = new Map(),
    flushTimer = 0;
  let shown = new Set(); // ids in pj that peers() has already handed out (so their departure must still be announced)
  function note(kind, id, entry) {
    if (kind === 'j') {
      if (pl.delete(id)) pu.add(id);
      else pj.add(id);
    } else if (kind === 'u') {
      if (!pj.has(id)) pu.add(id);
    } else if (pj.delete(id) && !shown.delete(id)) {
      /* never announced or seen */ pu.delete(id);
    } else {
      pu.delete(id);
      pl.set(id, entry);
    }
    if (!flushTimer) flushTimer = setTimeout(flush, 8);
  }
  function flush() {
    flushTimer = 0;
    const get = (id) => table.get(id)?.entry;
    const change = {
      peers: list(),
      joined: [...pj].map(get).filter(Boolean),
      left: [...pl.values()],
      updated: [...pu].map(get).filter(Boolean),
    };
    pj = new Set();
    pu = new Set();
    pl = new Map();
    shown = new Set();
    if (change.joined.length || change.left.length || change.updated.length) call(peersHandlers, change);
  }
  function list() {
    if (!cache) {
      for (const id of pj) shown.add(id);
      cache = Object.freeze([
        table.get(SELF_ID).entry,
        ...[...table].filter(([id]) => id !== SELF_ID).map(([, r]) => r.entry),
      ]);
    }
    return cache;
  }
  function call(set, ...args) {
    for (const h of [...set]) {
      try {
        h(...args);
      } catch (e) {
        console.error('[peer-room] handler threw', e);
      }
    }
  }

  function upsert(id, presence, seq) {
    // remote presence; false if stale
    if (id === SELF_ID || seq <= (seqs.get(id) ?? -1)) return false;
    seqs.set(id, seq);
    const had = table.has(id);
    note(had ? 'u' : 'j', id, setRec(id, presence).entry);
    return true;
  }
  function drop(id, seq) {
    // remove a remote peer; true if it was present
    if (id === SELF_ID) return false;
    if (seq != null) seqs.set(id, Math.max(seqs.get(id) ?? -1, seq));
    const rec = table.get(id);
    if (!rec) return false;
    table.delete(id);
    cache = null;
    note('l', id, rec.entry);
    return true;
  }
  setRec(SELF_ID, mine);

  // ---- state ----
  let closed = false,
    suspended = false,
    connected = false,
    isHostNow = false,
    fatalError = null;
  let role = null,
    wake = null;
  let clients = new Map(); // host side: id -> client record
  let hostU = null,
    hostR = null; // client side
  const view = new Set(); // client side: ids the current host has told us about
  const clientSender = makeSender(() => hostU);
  const outbox = [];
  const dbg = (...a) => {
    if (opts.debug) console.log('[peer-room]', Date.now() % 100000, ...a);
  };

  function setConnected(v) {
    if (v !== connected) {
      connected = v;
      call(connHandlers, v);
    }
  }
  function setHost(v) {
    if (v !== isHostNow) {
      isHostNow = v;
      call(hostHandlers, v);
    }
  }
  function deliver(msg, from) {
    call(msgHandlers, msg, from);
  }

  // ---- outgoing ----
  function pushPresence() {
    if (!connected) return;
    if (isHostNow) {
      const m = { t: 'p', id: SELF_ID, s: mySeq, d: mine };
      for (const c of clients.values()) if (c.ready) c.sender.put(SELF_ID, m);
    } else clientSender.put('me', { t: 'p', s: mySeq, d: mine });
  }
  function sendReliable(msg) {
    if (isHostNow) {
      const m = { t: 'm', from: SELF_ID, d: msg };
      for (const c of clients.values()) if (c.ready) safeSend(c.r, m);
    } else if (hostR?.open) safeSend(hostR, { t: 'm', d: msg });
  }
  function onEstablished() {
    mySeq++; // new seq so a tombstone left by a previous host can't suppress us
    pushPresence();
    while (outbox.length) sendReliable(outbox.shift());
  }

  // ---- host role ----
  function makeRole() {
    let end;
    const ended = new Promise((r) => {
      end = r;
    });
    return { ended, end, done: false, teardown() {}, isHost: false };
  }

  function startHost(peer) {
    const r = makeRole();
    r.isHost = true;
    const timers = [];
    clients = new Map();
    const hostClients = clients;
    const closeClient = (c) => {
      for (const k of ['u', 'r']) quietly(() => c[k]?.close());
      c.sender.clear();
    };
    const broadcastR = (msg, exceptId) => {
      for (const c of hostClients.values()) if (c.ready && c.id !== exceptId) safeSend(c.r, msg);
    };
    // tell: 0 = silent, 'now' = announce immediately (explicit bye), 'soon' = announce unless the client is back within
    // 400 ms. The delay matters when the *host* is the one dying: it can see its clients' connections close a few ms
    // before it vanishes, and must not announce "everyone left" on its way out.
    function dropClient(id, tell = 'soon') {
      const c = hostClients.get(id);
      if (!c) return;
      hostClients.delete(id);
      closeClient(c);
      const announce = () => {
        if (hostClients.has(id) || !table.has(id)) return;
        const s = seqs.get(id);
        drop(id, s);
        broadcastR({ t: 'left', id, s });
      };
      if (tell === 'now') announce();
      else if (tell) timers.push(setTimeout(announce, 400));
    }
    function sendList(c) {
      let batch = [],
        size = 0;
      const out = (last) => {
        safeSend(c.r, { t: 'list', peers: batch, last });
        batch = [];
        size = 0;
      };
      for (const [id, rec] of table) {
        if (id === c.id) continue;
        const item = id === SELF_ID ? { id, s: mySeq, d: mine } : { id, s: seqs.get(id) ?? 0, d: rec.presence };
        const n = JSON.stringify(item).length;
        if (batch.length && size + n > 12000) out(false);
        batch.push(item);
        size += n;
      }
      out(true);
    }
    function onData(c, d) {
      if (!isObj(d) || hostClients.get(c.id) !== c || !c.ready) return;
      c.seen = Date.now();
      if (d.t === 'p') {
        if (!okSeq(d.s) || !isObj(d.d) || tooBig(d.d)) return;
        if (d.s <= c.lastSeq) return;
        c.lastSeq = d.s;
        if (upsert(c.id, d.d, d.s)) {
          const m = { t: 'p', id: c.id, s: d.s, d: d.d };
          for (const o of hostClients.values()) if (o.ready && o !== c) o.sender.put(c.id, m);
        }
      } else if (d.t === 'm') {
        if (!isObj(d.d) || tooBig(d.d)) return;
        broadcastR({ t: 'm', from: c.id, d: d.d }, c.id);
        deliver(d.d, c.id);
      } else if (d.t === 'bye') dropClient(c.id, 'now');
      // 'hb' (and anything unknown) only refreshes `seen`
    }
    peer.on('connection', (conn) => {
      const id = conn.metadata?.selfId,
        label = conn.label;
      if (!okId(id) || id === SELF_ID || (label !== 'u' && label !== 'r')) {
        conn.close();
        return;
      }
      let c = hostClients.get(id);
      if (c && c[label]) {
        hostClients.delete(id);
        closeClient(c);
        c = null;
      } // the same tab came back on a fresh session
      if (!c) {
        c = { id, u: null, r: null, ready: false, seen: Date.now(), lastSeq: -1 };
        c.sender = makeSender(() => c.u);
        hostClients.set(id, c);
        const pair = c;
        timers.push(
          setTimeout(() => {
            if (!pair.ready && hostClients.get(id) === pair) dropClient(id, 0);
          }, OPEN_TIMEOUT_MS),
        );
      }
      const rec = c; // this connection's pair, fixed for its handlers
      rec[label] = conn;
      conn.on('open', () => {
        if (!rec.ready && rec.u?.open && rec.r?.open && hostClients.get(id) === rec) {
          rec.ready = true;
          rec.seen = Date.now();
          sendList(rec);
        }
      });
      conn.on('data', (d) => onData(rec, d));
      const gone = () => {
        if (hostClients.get(id) === rec && rec[label] === conn) dropClient(id, rec.ready ? 'soon' : 0);
      };
      conn.on('close', gone);
      conn.on('error', gone);
      conn.on('open', () =>
        watchPc(
          conn,
          () => {
            if (hostClients.get(id) === rec && rec[label] === conn) dropClient(id, 'now');
          },
          timers,
        ),
      );
    });
    peer.on('close', () => r.end());
    peer.on('error', (e) => dbg('host peer error', e.type));
    peer.on('disconnected', () => {
      // lost the signaling server: keep the id and keep trying
      const t = setInterval(() => {
        if (peer.destroyed || !peer.disconnected) {
          clearInterval(t);
          return;
        }
        quietly(() => peer.reconnect()); // fails until the server is back: try again next round
      }, 2000);
      timers.push(t);
    });
    let lastTick = Date.now();
    timers.push(
      setInterval(() => {
        const now = Date.now();
        const stalled = now - lastTick > 3 * HEARTBEAT_MS; // our own timers were frozen: silence from clients proves nothing
        lastTick = now;
        for (const [id, c] of [...hostClients]) {
          if (stalled) c.seen = now;
          // a silent client is not the host dying (we are running), so announce straight away
          if (now - c.seen > DEAD_MS) dropClient(id, c.ready ? 'now' : 0);
          else if (c.ready) safeSend(c.r, { t: 'hb' });
        }
      }, HEARTBEAT_MS),
    );
    timers.push(
      setTimeout(() => {
        // peers from before a migration that never came back
        for (const id of [...table.keys()]) {
          if (id === SELF_ID || hostClients.get(id)?.ready) continue;
          const s = seqs.get(id);
          if (drop(id, s)) broadcastR({ t: 'left', id, s });
        }
      }, GRACE_MS),
    );
    r.teardown = () => {
      if (r.done) return;
      r.done = true;
      clearTimers(timers);
      for (const c of hostClients.values()) closeClient(c);
      hostClients.clear();
      quietly(() => peer.destroy());
    };
    return r;
  }

  // ---- client role ----
  async function startClient(peer) {
    const r = makeRole();
    const timers = [];
    let lastData = Date.now(),
      resolveList;
    const gotList = new Promise((res) => {
      resolveList = res;
    });
    view.clear();
    const mk = (label, reliable) =>
      peer.connect(hostId, { label, reliable, serialization: 'json', metadata: { selfId: SELF_ID } });
    const u = mk('u', false),
      rel = mk('r', true);
    r.teardown = () => {
      if (r.done) return;
      r.done = true;
      clearTimers(timers);
      if (hostU === u) {
        hostU = hostR = null;
        clientSender.clear();
      }
      for (const c of [u, rel]) quietly(() => c?.close());
      quietly(() => peer.destroy());
    };
    if (!u || !rel) {
      r.teardown();
      return null;
    }
    hostU = u;
    hostR = rel;

    function onData(d) {
      lastData = Date.now();
      if (!isObj(d)) return;
      if (d.t === 'list') {
        if (!Array.isArray(d.peers)) return;
        for (const p of d.peers)
          if (isObj(p) && okId(p.id) && okSeq(p.s) && isObj(p.d)) {
            view.add(p.id);
            upsert(p.id, p.d, p.s);
          }
        if (d.last) resolveList();
      } else if (d.t === 'p') {
        if (okId(d.id) && okSeq(d.s) && isObj(d.d)) {
          view.add(d.id);
          upsert(d.id, d.d, d.s);
        }
      } else if (d.t === 'left') {
        if (okId(d.id)) {
          view.delete(d.id);
          drop(d.id, okSeq(d.s) ? d.s : null);
        }
      } else if (d.t === 'm') {
        if (okId(d.from) && d.from !== SELF_ID && isObj(d.d)) deliver(d.d, d.from);
      }
    }
    const failed = new Promise((res) => {
      peer.on('error', (e) => {
        if (e.type === 'peer-unavailable') res(false);
      });
      for (const c of [u, rel]) {
        c.on('data', onData);
        c.on('close', () => {
          r.end();
          res(false);
        });
        c.on('error', () => {
          r.end();
          res(false);
        });
      }
    });
    const opened = Promise.all([u, rel].map((c) => new Promise((res) => (c.open ? res() : c.on('open', res)))));
    const timeout = new Promise((res) => timers.push(setTimeout(() => res(false), OPEN_TIMEOUT_MS)));
    const ok = await Promise.race([
      opened.then(() => Promise.race([gotList.then(() => true), timeout])),
      failed,
      timeout,
    ]);
    if (!ok || r.done) {
      r.teardown();
      return null;
    }

    for (const c of [u, rel])
      watchPc(
        c,
        () => {
          dbg('host connection lost');
          r.end();
        },
        timers,
      );
    let lastTick = Date.now();
    timers.push(
      setInterval(() => {
        const now = Date.now();
        if (now - lastTick > 3 * HEARTBEAT_MS) lastData = now; // our own timers were frozen
        lastTick = now;
        if (now - lastData > DEAD_MS) {
          dbg('host silent');
          r.end();
          return;
        }
        safeSend(rel, { t: 'hb' });
      }, HEARTBEAT_MS),
    );
    timers.push(
      setTimeout(() => {
        // drop peers the new host never mentioned
        for (const id of [...table.keys()]) if (id !== SELF_ID && !view.has(id)) drop(id);
      }, GRACE_MS),
    );
    return r;
  }

  // ---- connect loop: claim host id, else join the host; on loss, retry (migration) ----
  function openPeer(id) {
    return new Promise((resolve, reject) => {
      const p = new Peer(id, peerOpts);
      const t = setTimeout(() => {
        p.destroy();
        reject(Object.assign(new Error('timeout'), { type: 'timeout' }));
      }, SIGNAL_TIMEOUT_MS);
      p.once('open', () => {
        clearTimeout(t);
        resolve(p);
      });
      p.once('error', (e) => {
        clearTimeout(t);
        quietly(() => p.destroy());
        reject(e);
      });
    });
  }
  const fatal = (e) => Object.assign(err(e.type || e.code || 'unknown', e.message), { fatal: true });
  async function attempt() {
    let p;
    try {
      p = await openPeer(hostId);
    } catch (e) {
      if (FATAL.has(e.type)) throw fatal(e);
      if (e.type !== 'unavailable-id') {
        dbg('claim failed', e.type);
        return null;
      }
      try {
        p = await openPeer(`boogle-${safeRoom(roomId)}-c${rand(10)}`);
      } catch (e2) {
        if (FATAL.has(e2.type)) throw fatal(e2);
        dbg('client peer failed', e2.type);
        return null;
      }
      return startClient(p);
    }
    return startHost(p);
  }

  let looping = false;
  let first, firstFail;
  const firstP = new Promise((res, rej) => {
    first = res;
    firstFail = rej;
  });
  const failAll = (e) => {
    fatalError = e;
    firstFail(e);
    call(errHandlers, e);
    closeRoom();
  };
  async function loop() {
    if (looping) return;
    looping = true;
    let delay = 0,
      fails = 0;
    while (!closed) {
      while (suspended && !closed)
        await new Promise((r) => {
          wake = r;
        });
      if (delay) await sleep(delay);
      if (closed) break;
      if (suspended) continue;
      let r = null;
      try {
        r = await attempt();
      } catch (e) {
        if (e.fatal) {
          failAll(e);
          break;
        }
      }
      dbg('attempt ->', r ? (r.isHost ? 'host' : 'client') : 'failed');
      if (closed || suspended) {
        r?.teardown();
        continue;
      }
      if (!r) {
        fails++;
        delay = Math.min(300 * 2 ** fails, 3000) + Math.random() * 300;
        continue;
      }
      fails = 0;
      role = r;
      setHost(r.isHost);
      setConnected(true);
      onEstablished();
      first();
      await r.ended;
      r.teardown();
      if (role === r) role = null;
      setConnected(false);
      setHost(false);
      delay = 200 + Math.random() * 1000; // migration: random wait before racing for the host id
    }
    looping = false;
  }

  // ---- leaving ----
  function leaveRole() {
    if (role && !role.isHost && hostR?.open) safeSend(hostR, { t: 'bye' });
    role?.teardown();
    role?.end();
  }
  function onHide() {
    if (closed) return;
    suspended = true;
    leaveRole();
  }
  function onShow(e) {
    if (e.persisted && !closed) {
      suspended = false;
      wake?.();
      wake = null;
      loop();
    }
  }
  addEventListener('pagehide', onHide);
  addEventListener('pageshow', onShow);

  function closeRoom() {
    if (closed) return;
    closed = true;
    removeEventListener('pagehide', onHide);
    removeEventListener('pageshow', onShow);
    leaveRole();
    wake?.();
    clearTimeout(flushTimer);
    clientSender.clear();
    connected = false;
    isHostNow = false;
  }

  loop();
  const timer = setTimeout(() => {
    if (!connected) failAll(err('timeout', 'could not reach the signaling server or host'));
  }, opts.connectTimeoutMs ?? 20000);
  try {
    await firstP;
  } finally {
    clearTimeout(timer);
  }

  const sub = (set, h, onError) => {
    set.add(h);
    if (onError) errHandlers.add(onError);
    if (fatalError && onError) setTimeout(() => onError(fatalError), 0);
    return () => {
      set.delete(h);
      if (onError) errHandlers.delete(onError);
    };
  };
  return {
    selfId: SELF_ID,
    presence(patch) {
      if (!isObj(patch)) return Promise.reject(new TypeError('presence patch must be an object'));
      const next = { ...mine };
      for (const [k, v] of Object.entries(patch)) {
        if (v === null) delete next[k];
        else next[k] = v;
      }
      if (tooBig(next)) return Promise.reject(err('too_big', 'presence is too large'));
      mine = next;
      mySeq++;
      note('u', SELF_ID, setRec(SELF_ID, mine).entry);
      pushPresence();
      return Promise.resolve();
    },
    peers: list,
    onPeers(h, onError) {
      const unsub = sub(peersHandlers, h, onError);
      setTimeout(() => {
        if (peersHandlers.has(h)) {
          const peers = list();
          try {
            h({ peers, joined: peers, left: [], updated: [] });
          } catch (e) {
            console.error(e);
          }
        }
      }, 0);
      return unsub;
    },
    onConnection(h, onError) {
      const unsub = sub(connHandlers, h, onError);
      setTimeout(() => {
        if (connHandlers.has(h))
          try {
            h(connected);
          } catch (e) {
            console.error(e);
          }
      }, 0);
      return unsub;
    },
    send(msg) {
      if (!isObj(msg)) throw new TypeError('send() takes a JSON object');
      if (tooBig(msg)) throw err('too_big', 'message too large');
      if (closed) return;
      if (!connected) {
        if (outbox.length < OUTBOX_MAX) outbox.push(msg);
        return;
      }
      sendReliable(msg);
    },
    onMessage(h) {
      msgHandlers.add(h);
      return () => msgHandlers.delete(h);
    },
    isHost: () => isHostNow,
    onHostChange(h) {
      hostHandlers.add(h);
      return () => hostHandlers.delete(h);
    },
    close: closeRoom,
  };
}

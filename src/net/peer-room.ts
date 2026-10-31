// peer-room.js - a "room" for Boogle on top of PeerJS (WebRTC data channels).
//
// Topology: star. The host's PeerJS id is `boogle-<room>-host`. Whoever registers it is the host; everyone else
// registers a random id and connects only to the host. If the host disappears, every client waits a random delay
// (shorter the better its host score, claimDelay) and tries to claim the host id; the winner becomes host and the rest
// reconnect to it. Host choice: each client reports its host score (opts.hostScore, default defaultHostScore: hidden 0,
// touch 2, desktop 3); a host that a client has outscored long enough names it in a 'handover' and lets go of the id.
// The named tab claims at once and keeps claiming for CLAIM_WINDOW_MS; the others give it HEAD_START_MS first.
//
// Each client opens TWO DataConnections to the host (JSON serialization, metadata { selfId }):
//   'u' (reliable:false)  presence, latest-state-wins.  NOTE: in peerjs 1.5.4 `reliable:false` only means
//                         `ordered:false` (the SCTP channel still retransmits, there is no maxRetransmits), so we
//                         coalesce in the app (LatestSender) and tag each update with a sequence number to drop stale ones.
//   'r' (reliable:true)   ordered messages, list/left notices, heartbeats.
// The fast lane (addFastLane): once both channels are open, each side adds a negotiated RTCDataChannel 'ux' (stream
// UX_ID, ordered:false, maxRetransmits:0) on the 'u' connection's RTCPeerConnection and says hello on it. A side sends
// presence there only after hearing the other on it, which proves the lane works and that the peer has it (old builds
// never answer, so they keep getting presence on 'u'). A lost packet is never resent and never holds back a newer one.
// Two guards keep 'unreliable' from meaning 'lost': the newest packet of each key goes again on 'u' after SETTLE_MS
// without a newer one (one-shot updates, the last pose before stopping), and packets over LANE_MAX go on 'u'.
//
// Wire messages (all plain objects with a `t` field; anything else is ignored):
//   client -> host   u: { t:'p', s, d }            my full presence `d`, sequence `s`
//                    r: { t:'m', d }               send() payload, host relays it with the origin id
//                    r: { t:'hb' } | { t:'bye' }   heartbeat (0.5 s) / leaving
//                    r: { t:'sc', v }              my host score, when it changes (checked with each heartbeat)
//   either way      ux: { t:'ux', ack }            fast-lane hello (ack: the answer to one); ux: 'p' as on 'u'
//   host -> client   r: { t:'list', peers:[{id,s,d}], last }   everyone currently known (chunked), sent on connect
//                    u: { t:'p', id, s, d }        a peer's presence (relayed; includes the host's own)
//                    r: { t:'left', id, s }        a peer is gone (s = last seq seen, so late 'p' can't resurrect it)
//                    r: { t:'m', from, d }         relayed send() payload
//                    r: { t:'hb' }                 heartbeat (0.5 s); a client that hears nothing for 3 s assumes the host died
//                    r: { t:'full', max }          the room has `max` players already; the host then closes both channels
//                    r: { t:'handover', to }       the host is letting go of the id for `to` (old builds ignore it and race)
// Ids in messages are the tab's stable selfId, never PeerJS ids, so identities survive host migration.
// Host drops a client after 3 s of silence (and announces `left` at once). Either side also treats the WebRTC
// connection itself going 'failed'/'closed' (or 'disconnected' for > 1.5 s) as the peer being gone; a hard-killed
// renderer sends nothing and its channels can linger for tens of seconds, so the heartbeat is the reliable signal.
// A side whose own timers stalled (frozen tab, sleep) forgives the silence it could not have measured. After a migration, peers that haven't come back within GRACE_MS are
// reported as `left` (instead of flapping everyone at the moment the host dies).
// Room cap: the host turns away a newcomer once `maxPeers` (default MAX_PEERS, host included) are in the room; peers
// it has seen before (back after a blip, or from before a migration) always get in, so the room can briefly hold one
// more. Peers from before a migration keep their place for GRACE_MS. The newcomer's createPeerRoom fails with code
// 'room_full' (`max`: the cap, when the host said). Old builds ignore 'full' and retry until their connect timeout.

import { Peer, type DataConnection } from 'peerjs';
import { SELF_ID, okId, safeRoom, peerHostId, rand } from './ids.ts';

type Timer = ReturnType<typeof setTimeout>;
/** A wire message: a plain object with a `t` field, read field by field (see the list above). */
type Msg = Record<string, unknown>;
/** What makeSender sends through: a DataConnection, or the fast lane standing in for one. */
type SendConn = {
  open: boolean;
  send(msg: unknown): unknown;
  dataChannel?: RTCDataChannel | null;
  bufferSize?: number;
};
type Lane = {
  ch: RTCDataChannel | null;
  peerHas: boolean;
  pick: (fallback: SendConn | null) => SendConn | null;
  close(): void;
};

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
export const MAX_PEERS = 8; // players per room, host included
const HIDDEN_HANDOVER_MS = 5000; // a host hidden this long, with a better tab in the room, hands over
const WEAK_HANDOVER_MS = 20000; // a visible but weaker host (touch) waits longer...
const HANDOVER_COOLDOWN_MS = 60000; // ...and never in its first minute as host, so a room doesn't flap between hosts
const HIDDEN_COOLDOWN_MS = 15000; // a hidden host never hands over in its first 15 s as host (alt-tab ping-pong)
const HANDOVER_TTL_MS = 5000; // a handover notice older than this no longer steers the election
const CLAIM_WINDOW_MS = 3000; // the named successor retries the host id this long (the old host may not have let go)
const HEAD_START_MS = 700; // after a handover, the others wait this long before racing, then by score
const MAX_SCORE = 3;

// How good this tab is as a host: a hidden tab's timers are throttled (coalesced relays wait up to a second, and after
// minutes in the background heartbeats stop, so clients see a dying host); touch devices are usually phones on weaker
// links. 0 hidden, 2 touch, 3 desktop. net.js also scores 0 until the tab holds the verified world.
const coarse = globalThis.matchMedia?.('(pointer: coarse)');
export function defaultHostScore() {
  if (typeof document === 'undefined') return 1;
  if (document.visibilityState === 'hidden') return 0;
  return coarse?.matches ? 2 : 3;
}
// Random wait before racing for the host id after the host is gone: better hosts claim it first.
const claimDelay = (score: number) =>
  score >= 3 ? 100 + Math.random() * 400 : score >= 2 ? 450 + Math.random() * 450 : 950 + Math.random() * 800;
const FATAL = new Set(['browser-incompatible', 'invalid-id', 'invalid-key', 'ssl-unavailable']);

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const isObj = (v: unknown): v is Msg => v !== null && typeof v === 'object' && !Array.isArray(v);
const okSeq = (n: unknown): n is number => Number.isSafeInteger(n) && (n as number) >= 0;
const tooBig = (v: unknown) => JSON.stringify(v).length > MAX_MSG;
const err = (code: string, msg?: string) => Object.assign(new Error(msg || code), { code });

// Sends, closes and destroys on a connection or peer that may already be closing: errors are expected, ignore them.
function quietly(fn: () => unknown) {
  try {
    fn();
  } catch {
    /* already closing */
  }
}
const safeSend = (conn: SendConn, msg: unknown) => quietly(() => conn.send(msg));
const clearTimers = (timers: Timer[]) =>
  timers.forEach((t) => {
    clearInterval(t);
    clearTimeout(t);
  });

// Calls onGone (once) when the underlying RTCPeerConnection of a DataConnection fails, closes, or stays disconnected.
// Needed because a data channel can stay 'open' for a long time after the other end died.
function watchPc(conn: DataConnection, onGone: () => void, timers: Timer[]) {
  const pc = conn.peerConnection;
  if (!pc || !pc.addEventListener) return;
  let t: Timer | undefined;
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

// The ICE pair a connection actually uses: whether either end is a TURN relay, and its round-trip time. Chrome and
// Safari name it on the transport stats, Firefox flags it `selected`; null until ICE has picked one.
async function pcLink(pc: RTCPeerConnection | undefined) {
  if (!pc?.getStats) return null;
  const stats = await pc.getStats();
  let pair: RTCIceCandidatePairStats | null = null as RTCIceCandidatePairStats | null;
  stats.forEach((s) => {
    if (s.type === 'transport' && s.selectedCandidatePairId) pair ??= stats.get(s.selectedCandidatePairId);
  });
  if (!pair)
    stats.forEach((s) => {
      if (s.type === 'candidate-pair' && (s.selected || (s.nominated && s.state === 'succeeded'))) pair ??= s;
    });
  if (!pair) return null;
  const local = stats.get(pair.localCandidateId)?.candidateType ?? '?';
  const remote = stats.get(pair.remoteCandidateId)?.candidateType ?? '?';
  const rtt = pair.currentRoundTripTime;
  return {
    relay: local === 'relay' || remote === 'relay',
    local,
    remote,
    rttMs: rtt !== undefined && Number.isFinite(rtt) ? Math.round(rtt * 1000) : null,
  };
}

// The fast lane for presence (see the header). `lane.pick(fallback)` is what makeSender sends through: the lane while
// it is proven, else `fallback` (the 'u' DataConnection). close() stops its timer and channel.
const UX_ID = 2; // negotiated stream id; PeerJS's one channel on this connection takes 0 or 1
const LANE_MAX = 1100; // bytes: bigger presence goes on 'u', since one lost fragment would lose all of it
const SETTLE_MS = 250; // the newest lane packet of a key goes again on 'u' after this long without a newer one
const HELLO_MS = 500;
const strings = new WeakMap<object, string>(); // msg -> JSON: a relayed message is serialized once for all its recipients
const json = (m: object) => {
  let str = strings.get(m);
  if (str === undefined) strings.set(m, (str = JSON.stringify(m)));
  return str;
};
function addFastLane(conn: DataConnection, onPresence: (d: Msg) => void): Lane {
  const lane: Lane = { ch: null, peerHas: false, pick: (fallback) => fallback, close() {} };
  quietly(() => {
    lane.ch = conn.peerConnection.createDataChannel('ux', {
      negotiated: true,
      id: UX_ID,
      ordered: false,
      maxRetransmits: 0,
    });
  });
  const ch = lane.ch as RTCDataChannel | null;
  if (!ch) return lane;
  const hello = (ack: boolean) =>
    ch.readyState === 'open' && quietly(() => ch.send(ack ? '{"t":"ux","ack":1}' : '{"t":"ux"}'));
  ch.onopen = () => hello(false);
  ch.onmessage = (e) => {
    let d: unknown;
    try {
      d = JSON.parse(e.data);
    } catch {
      return;
    }
    if (!isObj(d)) return;
    lane.peerHas = true;
    if (d.t === 'ux' && !d.ack) hello(true);
    else if (d.t === 'p') onPresence(d);
  };
  const latest = new Map<unknown, Msg>(), // key -> newest message that went only over the lane
    sentAt = new Map<unknown, number>();
  const proxy: SendConn = {
    get open() {
      return lane.peerHas && ch.readyState === 'open';
    },
    dataChannel: ch,
    bufferSize: 0,
    send(m: unknown) {
      const msg = m as Msg;
      const str = json(msg);
      if (str.length > LANE_MAX) return conn.send(msg);
      ch.send(str);
      const key = msg.id ?? '';
      latest.set(key, msg);
      sentAt.set(key, performance.now());
    },
  };
  let helloAt = 0;
  const timer = setInterval(() => {
    const now = performance.now();
    if (!lane.peerHas && now - helloAt > HELLO_MS) {
      helloAt = now;
      hello(false); // until the other side answers (old builds never do)
    }
    for (const [key, msg] of latest)
      if (now - (sentAt.get(key) ?? 0) > SETTLE_MS) {
        latest.delete(key);
        if (conn.open) safeSend(conn as unknown as SendConn, msg);
      }
  }, 100);
  lane.pick = (fallback) => (proxy.open ? proxy : fallback);
  lane.close = () => {
    clearInterval(timer);
    quietly(() => ch.close());
  };
  return lane;
}

// Latest-wins sender: at most one pending packet per key, spaced >= MIN_GAP_MS, held back while buffers are full.
function makeSender(getConn: () => SendConn | null) {
  const pending = new Map<string, Msg>(),
    last = new Map<string, number>();
  let timer: Timer | 0 = 0;
  const trySend = (key: string, msg: Msg) => {
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
    put(key: string, msg: Msg) {
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

/** createPeerRoom's options (src/net/README.md). */
export type RoomOptions = {
  roomId?: string;
  debug?: number;
  fastLane?: boolean; // false: presence only on 'u', as builds before the lane (tests, a kill switch)
  signal?: { host?: string; port?: number; path?: string; secure?: boolean; key?: string };
  iceServers?: RTCIceServer[];
  maxPeers?: number;
  hostScore?: () => number;
  connectTimeoutMs?: number; // default 20 s
};
/** One peer as onPeers and peers() hand it out. */
export type PeerEntry = Readonly<{ peer: string; sameTab: boolean; presence: Readonly<Msg>; updatedAt: number }>;
export type PeersChange = {
  peers: readonly PeerEntry[];
  joined: readonly PeerEntry[];
  left: readonly PeerEntry[];
  updated: readonly PeerEntry[];
};
/** A room failure: code is 'room_full' (max: the cap), 'timeout', or a PeerJS error type. */
export type RoomError = Error & { code?: string; fatal?: boolean; max?: number };
type Rec = { presence: Readonly<Msg>; at: number; entry: PeerEntry };
type Role = {
  ended: Promise<unknown>;
  end: (v?: unknown) => void;
  done: boolean;
  teardown(): void;
  isHost: boolean;
};
/** The host's record of one client: its two connections, fast lane, liveness, presence sequence and host score. */
type Client = {
  id: string;
  u: DataConnection | null;
  r: DataConnection | null;
  lane: Lane | null;
  ready: boolean;
  seen: number;
  lastSeq: number;
  score: number;
  sender: ReturnType<typeof makeSender>;
};

export async function createPeerRoom(opts: RoomOptions = {}) {
  if (typeof RTCPeerConnection === 'undefined') throw err('browser-incompatible', 'WebRTC is not available');
  const roomId = String(opts.roomId ?? 'default');
  const hostId = peerHostId(roomId);
  const peerOpts: Record<string, unknown> = { debug: opts.debug ?? 0 };
  const fastLane = opts.fastLane !== false; // false: presence only on 'u', as builds before the lane (tests, a kill switch)
  for (const k of ['host', 'port', 'path', 'secure', 'key'] as const)
    if (opts.signal?.[k] !== undefined) peerOpts[k] = opts.signal[k];
  if (opts.iceServers) peerOpts.config = { iceServers: opts.iceServers };
  const maxPeers = opts.maxPeers ?? MAX_PEERS;

  // ---- peer table (me + everyone known) and change notification ----
  const table = new Map<string, Rec>(); // id -> { presence, at, entry }
  const seqs = new Map<string, number>(); // id -> highest presence seq seen (kept after leaving, as a tombstone)
  let mine: Msg = {},
    mySeq = 0,
    cache: readonly PeerEntry[] | null = null;
  const mkEntry = (id: string, rec: { presence: Readonly<Msg>; at: number }): PeerEntry =>
    Object.freeze({ peer: id, sameTab: id === SELF_ID, presence: rec.presence, updatedAt: rec.at });
  function setRec(id: string, presence: Msg) {
    const base = { presence: Object.freeze({ ...presence }), at: Date.now() };
    const rec: Rec = { ...base, entry: mkEntry(id, base) };
    table.set(id, rec);
    cache = null;
    return rec;
  }
  const peersHandlers = new Set<(c: PeersChange) => void>(),
    connHandlers = new Set<(connected: boolean) => void>(),
    msgHandlers = new Set<(msg: unknown, from: string) => void>(),
    hostHandlers = new Set<(isHost: boolean) => void>(),
    errHandlers = new Set<(e: RoomError) => void>();
  let pj = new Set<string>(),
    pu = new Set<string>(),
    pl = new Map<string, PeerEntry>(),
    flushTimer: Timer | 0 = 0;
  let shown = new Set<string>(); // ids in pj that peers() has already handed out (so their departure must still be announced)
  function note(kind: 'j' | 'u' | 'l', id: string, entry: PeerEntry) {
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
    const get = (id: string) => table.get(id)?.entry;
    const change: PeersChange = {
      peers: list(),
      joined: [...pj].map(get).filter((e): e is PeerEntry => !!e),
      left: [...pl.values()],
      updated: [...pu].map(get).filter((e): e is PeerEntry => !!e),
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
        table.get(SELF_ID)!.entry,
        ...[...table].filter(([id]) => id !== SELF_ID).map(([, r]) => r.entry),
      ]);
    }
    return cache;
  }
  function call<A extends unknown[]>(set: Set<(...args: A) => void>, ...args: A) {
    for (const h of [...set]) {
      try {
        h(...args);
      } catch (e) {
        console.error('[peer-room] handler threw', e);
      }
    }
  }

  function upsert(id: string, presence: Msg, seq: number) {
    // remote presence; false if stale
    if (id === SELF_ID || seq <= (seqs.get(id) ?? -1)) return false;
    seqs.set(id, seq);
    const had = table.has(id);
    note(had ? 'u' : 'j', id, setRec(id, presence).entry);
    return true;
  }
  function drop(id: string, seq?: number | null) {
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
    fatalError: RoomError | null = null;
  // Host choice: the successor a handover named, and until when this tab, if named, keeps trying to claim the id.
  let handover: { to: string; at: number } | null = null,
    claimUntil = 0;
  const hostScore = () => {
    try {
      return opts.hostScore ? Number(opts.hostScore()) || 0 : defaultHostScore();
    } catch {
      return 0;
    }
  };
  let role: Role | null = null,
    wake: (() => void) | null = null;
  let clients = new Map<string, Client>(); // host side: id -> client record
  let hostU: DataConnection | null = null,
    hostR: DataConnection | null = null, // client side
    hostLane: Lane | null = null; // client side: the fast lane on hostU, once open
  const view = new Set<string>(); // client side: ids the current host has told us about
  const clientSender = makeSender(() => hostLane?.pick(hostU as SendConn | null) ?? (hostU as SendConn | null));
  const outbox: unknown[] = [];
  const dbg = (...a: unknown[]) => {
    if (opts.debug) console.log('[peer-room]', Date.now() % 100000, ...a);
  };

  function setConnected(v: boolean) {
    if (v !== connected) {
      connected = v;
      call(connHandlers, v);
    }
  }
  function setHost(v: boolean) {
    if (v !== isHostNow) {
      isHostNow = v;
      call(hostHandlers, v);
    }
  }
  function deliver(msg: unknown, from: string) {
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
  function sendReliable(msg: unknown) {
    if (isHostNow) {
      const m = { t: 'm', from: SELF_ID, d: msg };
      for (const c of clients.values()) if (c.ready) safeSend(c.r as SendConn, m);
    } else if (hostR?.open) safeSend(hostR as SendConn, { t: 'm', d: msg });
  }
  function onEstablished() {
    mySeq++; // new seq so a tombstone left by a previous host can't suppress us
    pushPresence();
    while (outbox.length) sendReliable(outbox.shift());
  }

  // ---- host role ----
  function makeRole(): Role {
    let end: (v?: unknown) => void = () => {};
    const ended = new Promise((r) => {
      end = r;
    });
    return { ended, end, done: false, teardown() {}, isHost: false };
  }

  function startHost(peer: Peer) {
    const r = makeRole();
    r.isHost = true;
    const timers: Timer[] = [];
    clients = new Map();
    const hostClients = clients;
    const closeClient = (c: Client) => {
      c.lane?.close();
      for (const k of ['u', 'r'] as const) quietly(() => c[k]?.close());
      c.sender.clear();
    };
    const broadcastR = (msg: Msg, exceptId?: string) => {
      for (const c of hostClients.values()) if (c.ready && c.id !== exceptId) safeSend(c.r as SendConn, msg);
    };
    // tell: 0 = silent, 'now' = announce immediately (explicit bye), 'soon' = announce unless the client is back within
    // 400 ms. The delay matters when the *host* is the one dying: it can see its clients' connections close a few ms
    // before it vanishes, and must not announce "everyone left" on its way out.
    function dropClient(id: string, tell: 0 | 'now' | 'soon' = 'soon') {
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
    // Everyone holding a place: the table (me, ready clients, peers from before a migration still in their grace
    // period) plus ready clients not in it yet.
    const inRoom = () => {
      let n = table.size;
      for (const c of hostClients.values()) if (c.ready && !table.has(c.id)) n++;
      return n;
    };
    function sendList(c: Client) {
      let batch: Msg[] = [],
        size = 0;
      const out = (last: boolean) => {
        safeSend(c.r as SendConn, { t: 'list', peers: batch, last });
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
    function onData(c: Client, d: unknown) {
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
      } else if (d.t === 'sc') {
        if (typeof d.v === 'number' && Number.isFinite(d.v)) c.score = Math.max(0, Math.min(MAX_SCORE, d.v)); // a lying client gets no edge
      } else if (d.t === 'bye') dropClient(c.id, 'now');
      // 'hb' (and anything unknown) only refreshes `seen`
    }
    peer.on('connection', (conn: DataConnection) => {
      const id: unknown = conn.metadata?.selfId,
        label = conn.label;
      if (!okId(id) || id === SELF_ID || (label !== 'u' && label !== 'r')) {
        conn.close();
        return;
      }
      let c = hostClients.get(id) ?? null;
      if (c && c[label]) {
        hostClients.delete(id);
        closeClient(c);
        c = null;
      } // the same tab came back on a fresh session
      if (!c) {
        const fresh: Client = {
          id,
          u: null,
          r: null,
          lane: null,
          ready: false,
          seen: Date.now(),
          lastSeq: -1,
          score: -1, // -1: never reported
          sender: makeSender(() => fresh.lane?.pick(fresh.u as SendConn | null) ?? (fresh.u as SendConn | null)),
        };
        c = fresh;
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
          // seqs keeps every id this room has seen, and ids are per page load: a known id is a tab coming back.
          if (!table.has(id) && !seqs.has(id) && inRoom() >= maxPeers) {
            safeSend(rec.r as SendConn, { t: 'full', max: maxPeers });
            timers.push(setTimeout(() => hostClients.get(id) === rec && dropClient(id, 0), 500)); // let 'full' arrive
            return;
          }
          rec.ready = true;
          rec.seen = Date.now();
          sendList(rec);
          if (fastLane && rec.u) rec.lane = addFastLane(rec.u, (d) => onData(rec, d));
        }
      });
      conn.on('data', (d: unknown) => onData(rec, d));
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
    peer.on('error', (e: { type?: string }) => dbg('host peer error', e.type));
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
          else if (c.ready) safeSend(c.r as SendConn, { t: 'hb' });
        }
      }, HEARTBEAT_MS),
    );
    // Handover: when a ready client has scored better than this tab for long enough, name it and let go of the id,
    // so it takes over with a short, planned migration instead of this tab hosting badly.
    // betterSince: when the current situation (this tab hidden or not, a better client present) began.
    const hostSince = Date.now();
    let betterSince = 0,
      wasHidden = false,
      handingOver = false;
    timers.push(
      setInterval(() => {
        if (r.done || handingOver) return;
        const mine = hostScore();
        const hidden = mine <= 0;
        let best: Client | null = null as Client | null;
        for (const c of hostClients.values()) if (c.ready && c.score > (best?.score ?? mine)) best = c;
        if (!best || hidden !== wasHidden) betterSince = 0;
        wasHidden = hidden;
        if (!best) return;
        const now = Date.now();
        betterSince ||= now;
        if (now - betterSince < (hidden ? HIDDEN_HANDOVER_MS : WEAK_HANDOVER_MS)) return;
        if (now - hostSince < (hidden ? HIDDEN_COOLDOWN_MS : HANDOVER_COOLDOWN_MS)) return;
        dbg('handover to', best.id, `(${best.score} > ${mine})`);
        handingOver = true;
        handover = { to: best.id, at: now };
        // On both channels: closing either ends the client's role, so the notice must not wait behind the other.
        for (const c of hostClients.values())
          if (c.ready) for (const k of ['r', 'u'] as const) safeSend(c[k] as SendConn, { t: 'handover', to: best!.id });
        timers.push(setTimeout(() => r.end(), 150)); // let the notice go out before the channels close
      }, 1000),
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
  async function startClient(peer: Peer) {
    const r = makeRole();
    const timers: Timer[] = [];
    let lastData = Date.now(),
      resolveList: (v?: unknown) => void = () => {};
    const gotList = new Promise((res) => {
      resolveList = res;
    });
    view.clear();
    const mk = (label: string, reliable: boolean) =>
      peer.connect(hostId, { label, reliable, serialization: 'json', metadata: { selfId: SELF_ID } });
    const u = mk('u', false),
      rel = mk('r', true);
    let lane: Lane | null = null; // the fast lane on u, once both channels are open
    r.teardown = () => {
      if (r.done) return;
      r.done = true;
      clearTimers(timers);
      if (hostU === u) {
        hostU = hostR = hostLane = null;
        clientSender.clear();
      }
      lane?.close();
      for (const c of [u, rel]) quietly(() => c?.close());
      quietly(() => peer.destroy());
    };
    if (!u || !rel) {
      r.teardown();
      return null;
    }
    hostU = u;
    hostR = rel;

    function onData(d: unknown) {
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
      } else if (d.t === 'handover') {
        if (okId(d.to)) handover = { to: d.to, at: Date.now() };
      } else if (d.t === 'full') {
        full = { max: okSeq(d.max) && d.max > 0 ? d.max : undefined };
        resolveFull(false);
      }
    }
    let full: { max?: number } | null = null as { max?: number } | null,
      resolveFull: (v: boolean) => void = () => {};
    const failed = new Promise<boolean>((res) => {
      resolveFull = res;
      peer.on('error', (e: { type?: string }) => {
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
    const opened = Promise.all(
      [u, rel].map((c) => new Promise<void>((res) => (c.open ? res() : c.on('open', () => res())))),
    );
    const timeout = new Promise((res) => timers.push(setTimeout(() => res(false), OPEN_TIMEOUT_MS)));
    const ok = await Promise.race([
      opened.then(() => Promise.race([gotList.then(() => true), timeout])),
      failed,
      timeout,
    ]);
    if (!ok || r.done) {
      r.teardown();
      if (full) throw Object.assign(err('room_full', 'the room is full'), { fatal: true, max: full.max });
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
    if (fastLane) lane = addFastLane(u, onData);
    if (hostU === u) hostLane = lane;
    let lastTick = Date.now(),
      sentScore: number | null = null;
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
        safeSend(rel as SendConn, { t: 'hb' });
        const score = hostScore(); // how good a host this tab would be, for the host's handover check
        if (score !== sentScore) safeSend(rel as SendConn, { t: 'sc', v: (sentScore = score) });
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
  function openPeer(id: string) {
    return new Promise<Peer>((resolve, reject) => {
      const p = new Peer(id, peerOpts);
      const t = setTimeout(() => {
        p.destroy();
        reject(Object.assign(new Error('timeout'), { type: 'timeout' }));
      }, SIGNAL_TIMEOUT_MS);
      p.once('open', () => {
        clearTimeout(t);
        resolve(p);
      });
      p.once('error', (e: unknown) => {
        clearTimeout(t);
        quietly(() => p.destroy());
        reject(e);
      });
    });
  }
  type PeerError = { type?: string; code?: string; message?: string; fatal?: boolean };
  const fatal = (e: PeerError) => Object.assign(err(e.type || e.code || 'unknown', e.message), { fatal: true });
  async function attempt() {
    let p: Peer;
    try {
      p = await openPeer(hostId);
    } catch (caught) {
      const e = caught as PeerError;
      if (FATAL.has(e.type ?? '')) throw fatal(e);
      if (e.type !== 'unavailable-id') {
        dbg('claim failed', e.type);
        return null;
      }
      if (Date.now() < claimUntil) return null; // named successor: the old host is still letting go; claim again
      try {
        p = await openPeer(`boogle-${safeRoom(roomId)}-c${rand(10)}`);
      } catch (caught2) {
        const e2 = caught2 as PeerError;
        if (FATAL.has(e2.type ?? '')) throw fatal(e2);
        dbg('client peer failed', e2.type);
        return null;
      }
      return startClient(p);
    }
    return startHost(p);
  }

  // Migration: how long to wait before racing for the host id. A fresh handover names the winner, who claims at once
  // (and keeps claiming for CLAIM_WINDOW_MS); everyone else gives it HEAD_START_MS, then races by host score.
  function electionDelay() {
    const named = handover && Date.now() - handover.at < HANDOVER_TTL_MS ? handover.to : null;
    handover = null;
    if (named === SELF_ID) {
      claimUntil = Date.now() + CLAIM_WINDOW_MS;
      return 0;
    }
    return (named ? HEAD_START_MS : 0) + claimDelay(hostScore());
  }

  let looping = false;
  let first: () => void = () => {},
    firstFail: (e: unknown) => void = () => {};
  const firstP = new Promise<void>((res, rej) => {
    first = res;
    firstFail = rej;
  });
  const failAll = (e: RoomError) => {
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
        await new Promise<void>((r) => {
          wake = r;
        });
      if (delay) await sleep(delay);
      if (closed) break;
      if (suspended) continue;
      let r: Role | null = null;
      try {
        r = await attempt();
      } catch (e) {
        if ((e as PeerError).fatal) {
          failAll(e as Error);
          break;
        }
      }
      dbg('attempt ->', r ? (r.isHost ? 'host' : 'client') : 'failed');
      if (closed || suspended) {
        r?.teardown();
        continue;
      }
      if (!r && Date.now() < claimUntil) {
        delay = 150;
        continue;
      }
      if (!r) {
        fails++;
        delay = Math.min(300 * 2 ** fails, 3000) + Math.random() * 300;
        continue;
      }
      claimUntil = 0;
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
      delay = electionDelay();
    }
    looping = false;
  }

  // ---- leaving ----
  function leaveRole() {
    if (role && !role.isHost && hostR?.open) safeSend(hostR as SendConn, { t: 'bye' });
    role?.teardown();
    role?.end();
  }
  function onHide() {
    if (closed) return;
    suspended = true;
    leaveRole();
  }
  function onShow(e: PageTransitionEvent) {
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

  const sub = <H>(set: Set<H>, h: H, onError?: (e: RoomError) => void) => {
    set.add(h);
    if (onError) errHandlers.add(onError);
    if (fatalError && onError) setTimeout(() => onError(fatalError!), 0);
    return () => {
      set.delete(h);
      if (onError) errHandlers.delete(onError);
    };
  };
  return {
    selfId: SELF_ID,
    presence(patch: unknown) {
      if (!isObj(patch)) return Promise.reject(new TypeError('presence patch must be an object'));
      const next: Msg = { ...mine };
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
    onPeers(h: (c: PeersChange) => void, onError?: (e: RoomError) => void) {
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
    onConnection(h: (connected: boolean) => void, onError?: (e: RoomError) => void) {
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
    send(msg: unknown) {
      if (!isObj(msg)) throw new TypeError('send() takes a JSON object');
      if (tooBig(msg)) throw err('too_big', 'message too large');
      if (closed) return;
      if (!connected) {
        if (outbox.length < OUTBOX_MAX) outbox.push(msg);
        return;
      }
      sendReliable(msg);
    },
    onMessage(h: (msg: unknown, from: string) => void) {
      msgHandlers.add(h);
      return () => msgHandlers.delete(h);
    },
    isHost: () => isHostNow,
    // Shared with the server room (src/net/README.md): on a peer room the lead is the host.
    transport: 'peer' as 'peer' | 'server' | 'fallback',
    isLead: () => isHostNow,
    onLeadChange(h: (isLead: boolean) => void) {
      hostHandlers.add(h);
      return () => hostHandlers.delete(h);
    },
    // One row per open presence link: a client's link to the host, or the host's link to each client. `fast`: presence
    // to that peer rides the fast lane (both sides have it and it is open).
    async linkStats() {
      const links: [string, DataConnection | null, Lane | null][] = isHostNow
        ? [...clients.values()].filter((c) => c.ready).map((c) => [c.id, c.u, c.lane])
        : hostU?.open
          ? [['host', hostU, hostLane]]
          : [];
      const rows = await Promise.all(
        links.map(async ([peer, conn, lane]) => {
          try {
            const link = await pcLink(conn?.peerConnection);
            return link && { peer, fast: lane?.pick(null) != null, ...link };
          } catch {
            return null; // closed while we asked
          }
        }),
      );
      return rows.filter(Boolean);
    },
    onHostChange(h: (isHost: boolean) => void) {
      hostHandlers.add(h);
      return () => hostHandlers.delete(h);
    },
    close: closeRoom,
  };
}

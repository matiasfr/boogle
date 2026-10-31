// ws-room: a room hosted by our server over one WebSocket (docs/plans/server-host.md, "Client"). The same interface as
// peer-room.ts (src/net/README.md), plus transport 'server', a lead the server picks, and two members for the room
// picker: onRedirect (the server stopped hosting this room) and downMs. Wire shapes: ./ws-wire.ts.
//
// Never the lockstep host: isHost() is always false and the server's sync is the host (messages from SERVER_ID). The
// first connect resolves after `welcome` and the last `list` chunk, or rejects with room_full (+ max), peer_hosted,
// unreachable or browser-incompatible. After that the room reconnects by itself (backoff 250 ms to 3 s, +-30%; 500-1500 ms
// after a graceful `bye`), reports onConnection(false/true), re-sends its presence with a new seq, flushes what send()
// held meanwhile, and drops the peers the server has not listed again within GRACE_MS.
import { SELF_ID, SERVER_ID } from './ids.ts';
import { WS_PROTOCOL, MAX_MSG, encode, decode, roomUrl, type WireMsg } from './ws-wire.ts';
import { createPeerTable } from './peer-table.ts';
import type { PeersChange, RoomError } from './peer-room.ts';

type Msg = Record<string, unknown>;
export type WsRoomOptions = {
  roomId?: string;
  server: string; // http(s) base of our server
  build?: string;
  debug?: number;
  openTimeoutMs?: number;
};

const HEARTBEAT_MS = 1000;
const DEAD_MS = 5000;
const GRACE_MS = 9000;
const OUTBOX_MAX = 200;
const HIGH_WATER = 64 * 1024; // hold presence back while this much is unsent
const BACKOFF = [250, 500, 1000, 2000, 3000];

const isObj = (v: unknown): v is Msg => v !== null && typeof v === 'object' && !Array.isArray(v);
const tooBig = (v: unknown) => JSON.stringify(v).length > MAX_MSG;
const err = (code: string, msg?: string, extra?: Msg): RoomError =>
  Object.assign(new Error(msg || code), { code }, extra);
const jitter = (ms: number) => ms * (0.7 + Math.random() * 0.6);

export async function createWsRoom(opts: WsRoomOptions) {
  if (typeof WebSocket === 'undefined') throw err('browser-incompatible', 'WebSocket is not available');
  const roomId = String(opts.roomId ?? 'default');
  const url = roomUrl(opts.server, roomId, SELF_ID, opts.build ?? 'dev');
  const log = (...a: unknown[]) => (opts.debug ?? 0) > 1 && console.log('[ws-room]', ...a);
  const table = createPeerTable(SELF_ID);
  const connHandlers = new Set<(c: boolean) => void>(),
    msgHandlers = new Set<(m: unknown, from: string) => void>(),
    leadHandlers = new Set<(lead: boolean) => void>(),
    redirectHandlers = new Set<(to: 'peer') => void>(),
    errHandlers = new Set<(e: RoomError) => void>();
  let ws: WebSocket | null = null;
  let connected = false,
    closed = false,
    redirected = false,
    lead: string | null = null,
    mine: Msg = {},
    mySeq = 0,
    presenceHeld = false,
    heard = 0,
    downSince = 0,
    attempt = 0,
    hbAt = 0,
    rttMs: number | null = null,
    reconnectTimer: ReturnType<typeof setTimeout> | 0 = 0,
    holdTimer: ReturnType<typeof setTimeout> | 0 = 0;
  const outbox: Msg[] = [];

  function call<A extends unknown[]>(set: Set<(...a: A) => void>, ...args: A) {
    for (const h of [...set])
      try {
        h(...args);
      } catch (e) {
        console.error('[ws-room] handler threw', e);
      }
  }
  const raw = (m: WireMsg) => ws?.readyState === WebSocket.OPEN && ws.send(encode(m));
  function pushPresence() {
    if (!connected || !ws) return;
    if (ws.bufferedAmount > HIGH_WATER) {
      presenceHeld = true;
      holdTimer ||= setTimeout(() => ((holdTimer = 0), presenceHeld && pushPresence()), 20);
      return;
    }
    presenceHeld = false;
    raw({ t: 'p', s: mySeq, d: mine });
  }
  function setLead(id: string | null) {
    const was = lead === SELF_ID;
    lead = id;
    if (was !== (lead === SELF_ID)) call(leadHandlers, lead === SELF_ID);
  }

  // One socket's life. `first` settles the first connect; later sockets only reconnect.
  function open(first?: { resolve: () => void; reject: (e: RoomError) => void }) {
    const sock = (ws = new WebSocket(url, WS_PROTOCOL));
    let listed = false,
      graceful = false;
    heard = performance.now();
    sock.onmessage = (ev) => {
      if (ws !== sock) return;
      heard = performance.now();
      const m = decode(ev.data);
      if (!m) return;
      switch (m.t) {
        case 'welcome':
          setLead(typeof m.lead === 'string' ? m.lead : null);
          return;
        case 'list':
          if (Array.isArray(m.peers))
            for (const p of m.peers)
              if (isObj(p) && typeof p.id === 'string' && isObj(p.d)) table.upsert(p.id, p.d, Number(p.s));
          if (m.last && !listed) {
            listed = true;
            attempt = 0;
            downSince = 0;
            const back = !first;
            connected = true;
            mySeq++; // a new seq, so the server (maybe a new process) takes it
            pushPresence();
            for (const msg of outbox.splice(0)) raw({ t: 'm', d: msg });
            if (back) {
              table.expectBack(GRACE_MS);
              call(connHandlers, true);
            }
            first?.resolve();
            first = undefined;
          }
          return;
        case 'p':
          if (typeof m.id === 'string' && isObj(m.d)) table.upsert(m.id, m.d, Number(m.s));
          return;
        case 'left':
          if (typeof m.id === 'string') table.drop(m.id, Number(m.s));
          return;
        case 'm':
          if (typeof m.from === 'string') call(msgHandlers, m.d, m.from);
          return;
        case 'hb':
          if (m.at === hbAt) rttMs = Math.round(performance.now() - hbAt);
          return;
        case 'lead':
          setLead(typeof m.id === 'string' ? m.id : null);
          return;
        case 'bye':
          graceful = true;
          return;
        case 'full':
          first?.reject(err('room_full', 'the room is full', { max: Number(m.max) || undefined }));
          first = undefined;
          return;
        case 'peer':
          redirected = true; // no point reconnecting: the room moved to PeerJS
          if (first) first.reject(err('peer_hosted', 'this room is not hosted by the server'));
          else call(redirectHandlers, 'peer');
          first = undefined;
          return;
        case 'bad':
          first?.reject(err('bad', 'the server refused this room or id'));
          first = undefined;
          return;
      }
    };
    sock.onerror = () => {};
    sock.onclose = () => {
      if (ws !== sock) return;
      ws = null;
      if (first) {
        first.reject(err('unreachable', 'could not reach the server'));
        first = undefined;
        return;
      }
      if (connected) {
        connected = false;
        downSince = performance.now();
        call(connHandlers, false);
      }
      if (closed || redirected) return;
      const delay = graceful ? 500 + Math.random() * 1000 : jitter(BACKOFF[Math.min(attempt++, BACKOFF.length - 1)]);
      log('reconnecting in', Math.round(delay), 'ms');
      reconnectTimer = setTimeout(() => open(), delay);
    };
  }

  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => {
      ws?.close();
      reject(err('unreachable', 'the server did not answer'));
    }, opts.openTimeoutMs ?? 5000);
    open({
      resolve: () => (clearTimeout(timer), resolve()),
      reject: (e) => {
        clearTimeout(timer);
        closed = true;
        ws?.close();
        reject(e);
      },
    });
  });

  const heartbeat = setInterval(() => {
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    if (performance.now() - heard > DEAD_MS) return void ws.close();
    hbAt = performance.now();
    raw({ t: 'hb', at: hbAt });
  }, HEARTBEAT_MS);

  function close() {
    if (closed) return;
    closed = true;
    clearInterval(heartbeat);
    clearTimeout(reconnectTimer);
    clearTimeout(holdTimer);
    table.clear();
    raw({ t: 'bye' });
    ws?.close(1000);
    ws = null;
    connected = false;
  }
  const onHide = () => raw({ t: 'bye' });
  addEventListener('pagehide', onHide);

  return {
    selfId: SELF_ID,
    transport: 'server' as 'peer' | 'server' | 'fallback',
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
      table.setSelf(mine);
      pushPresence();
      return Promise.resolve();
    },
    peers: table.list,
    onPeers(h: (c: PeersChange) => void, onError?: (e: RoomError) => void) {
      const unsub = table.onChange(h);
      if (onError) errHandlers.add(onError);
      setTimeout(() => {
        const peers = table.list();
        try {
          h({ peers, joined: peers, left: [], updated: [] });
        } catch (e) {
          console.error(e);
        }
      }, 0);
      return () => (unsub(), onError && errHandlers.delete(onError));
    },
    onConnection(h: (connected: boolean) => void, onError?: (e: RoomError) => void) {
      connHandlers.add(h);
      if (onError) errHandlers.add(onError);
      setTimeout(() => connHandlers.has(h) && h(connected), 0);
      return () => (connHandlers.delete(h), onError && errHandlers.delete(onError));
    },
    send(msg: unknown) {
      if (!isObj(msg)) throw new TypeError('send() takes a JSON object');
      if (tooBig({ t: 'm', d: msg })) throw err('too_big', 'message too large');
      if (closed) return;
      if (!connected) {
        if (outbox.length < OUTBOX_MAX) outbox.push(msg);
        return;
      }
      raw({ t: 'm', d: msg });
    },
    onMessage(h: (msg: unknown, from: string) => void) {
      msgHandlers.add(h);
      return () => msgHandlers.delete(h);
    },
    isHost: () => false, // the server's sync is the lockstep host
    onHostChange: (() => () => {}) as (h: (isHost: boolean) => void) => () => void, // never fires
    isLead: () => lead === SELF_ID,
    onLeadChange(h: (isLead: boolean) => void) {
      leadHandlers.add(h);
      return () => leadHandlers.delete(h);
    },
    async linkStats() {
      return connected ? [{ peer: SERVER_ID, fast: false, relay: false, local: 'ws', remote: 'ws', rttMs }] : [];
    },
    onRedirect(h: (to: 'peer') => void) {
      redirectHandlers.add(h);
      return () => redirectHandlers.delete(h);
    },
    downMs: () => (downSince ? performance.now() - downSince : 0),
    close() {
      removeEventListener('pagehide', onHide);
      close();
    },
  };
}
export type WsRoom = Awaited<ReturnType<typeof createWsRoom>>;

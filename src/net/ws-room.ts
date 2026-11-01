// ws-room: the room every tab joins (src/net/README.md; docs/plans/server-host.md). Our server hosts every room and runs
// its world; this is the room interface over one WebSocket to it, plus the lead the server picks (the tab that
// publishes Host fields: addHostField in src/netplay/net.ts). Wire shapes: ./ws-wire.ts.
//
// The server's sync is the lockstep host (its messages come from SERVER_ID). The first connect resolves after `welcome` and the last `list` chunk, or rejects with room_full (+ max), peer_hosted (a
// server that doesn't host this room), unreachable or browser-incompatible. After that the room reconnects by itself
// (backoff 250 ms to 3 s, +-30%; 500-1500 ms after a graceful `bye`; through a deploy that briefly doesn't host the
// room too), reports onConnection(false/true), re-sends its presence with a new seq, flushes what send() held
// meanwhile, and drops the peers the server has not listed again within GRACE_MS. A reconnect turned away as full or
// bad stops and reports a fatal error, and so does `elsewhere`: a newer tab of the same player (pid) joined.
import { SELF_ID, SERVER_ID } from './ids.ts';
import { WS_PROTOCOL, CLOSE, MAX_MSG, encode, decode, roomUrl, type WireMsg } from './ws-wire.ts';
import { createPeerTable } from './peer-table.ts';
import type { PeersChange } from './peer-table.ts';

/** A room failure: code is 'room_full' (max: the cap), 'peer_hosted', 'unreachable', 'bad' or 'browser-incompatible'. */
export type RoomError = Error & { code?: string; fatal?: boolean; max?: number };

type Msg = Record<string, unknown>;
export type WsRoomOptions = {
  roomId?: string;
  server: string; // http(s) base of our server
  pid: string; // the player this tab plays as (src/player/identity.ts); a newer tab with the same pid takes over
  key: string; // this browser's secret behind pid: another key can't take a pid that is in the room
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
  const url = roomUrl(opts.server, roomId, { self: SELF_ID, pid: opts.pid, key: opts.key, b: opts.build ?? 'dev' });
  const log = (...a: unknown[]) => (opts.debug ?? 0) > 1 && console.log('[ws-room]', ...a);
  const table = createPeerTable(SELF_ID);
  const connHandlers = new Set<(c: boolean) => void>(),
    msgHandlers = new Set<(m: unknown, from: string) => void>(),
    leadHandlers = new Set<(lead: boolean) => void>(),
    errHandlers = new Set<(e: RoomError) => void>();
  let ws: WebSocket | null = null;
  let connected = false,
    closed = false,
    stopped = false, // refused (full, bad): no reconnecting
    pausedUntil = 0, // pause(): no reconnect before this
    openedAt = 0,
    lead: string | null = null,
    mine: Msg = {}, // my presence, patched in place (no copy per send)
    mineJson = '{}', // JSON.stringify(mine), made once per presence() and reused by every push of it
    mySeq = 0,
    presenceHeld = false,
    heard = 0,
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
    // encode({ t: 'p', s: mySeq, d: mine }) byte for byte, without a second stringify of mine
    if (ws.readyState === WebSocket.OPEN) ws.send('{"t":"p","s":' + mySeq + ',"d":' + mineJson + '}');
  }
  const undoMine = () => (mine = JSON.parse(mineJson) as Msg); // back to the last good presence (a rare refusal)
  function setLead(id: string | null) {
    const was = lead === SELF_ID;
    lead = id;
    if (was !== (lead === SELF_ID)) call(leadHandlers, lead === SELF_ID);
  }

  // One socket's life. `first` settles the first connect; later sockets only reconnect.
  function open(first?: { resolve: () => void; reject: (e: RoomError) => void }) {
    const sock = (ws = new WebSocket(url, WS_PROTOCOL));
    openedAt = performance.now();
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
          if (!first) table.expectBack(GRACE_MS); // before the list: what it names is back
          return;
        case 'list':
          if (Array.isArray(m.peers))
            for (const p of m.peers)
              if (isObj(p) && typeof p.id === 'string' && isObj(p.d)) table.upsert(p.id, p.d, Number(p.s));
          if (m.last && !listed) {
            listed = true;
            attempt = 0;
            const back = !first;
            connected = true;
            mySeq++; // a new seq, so the server (maybe a new process) takes it
            pushPresence();
            for (const msg of outbox.splice(0)) raw({ t: 'm', d: msg });
            if (back) call(connHandlers, true);
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
          return refused(err('room_full', 'the room is full', { max: Number(m.max) || undefined }));
        case 'peer':
          if (!first) return; // a server between deploys: the close that follows reconnects
          return refused(err('peer_hosted', 'this room is not hosted by the server'));
        case 'elsewhere':
          return refused(err('elsewhere', 'this player joined from another tab'));
        case 'taken':
          return refused(err('pid_taken', 'another browser is playing as this player here'));
        case 'bad':
          return refused(err('bad', 'the server refused this room or id'));
      }
    };
    // The first connect rejects; a reconnect turned away stops and tells onError (fatal).
    function refused(e: RoomError) {
      stopped = true;
      if (first) first.reject(e);
      else call(errHandlers, Object.assign(e, { fatal: true }));
      first = undefined;
    }
    sock.onerror = () => {};
    sock.onclose = (ev) => {
      if (ws !== sock) return;
      ws = null;
      // The code alone is enough to stop, should the `elsewhere` frame before it have been lost.
      if (ev.code === CLOSE.ELSEWHERE && !stopped) refused(err('elsewhere', 'this player joined from another tab'));
      if (first) {
        first.reject(err('unreachable', 'could not reach the server'));
        first = undefined;
        return;
      }
      if (connected) {
        connected = false;
        call(connHandlers, false);
      }
      if (closed || stopped) return;
      const backoff = graceful ? 500 + Math.random() * 1000 : jitter(BACKOFF[Math.min(attempt++, BACKOFF.length - 1)]);
      const delay = Math.max(backoff, pausedUntil - performance.now());
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
    if (ws?.readyState === WebSocket.CONNECTING && performance.now() - openedAt > (opts.openTimeoutMs ?? 5000))
      return void ws.close(); // a reconnect stuck on a dead route: try again
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
    transport: 'server' as const,
    presence(patch: unknown) {
      if (!isObj(patch)) return Promise.reject(new TypeError('presence patch must be an object'));
      // Patched in place and stringified once: presence goes out at 20 Hz, so no copy or entry arrays per send.
      // Key order (so the JSON) is what a fresh copy would give: kept keys stay put, new ones go last.
      for (const k in patch) {
        const v = patch[k];
        if (v === null) delete mine[k];
        else mine[k] = v;
      }
      let json: string;
      try {
        json = JSON.stringify(mine);
      } catch (e) {
        undoMine(); // a value JSON can't take (a cycle, a BigInt): throws, as the copy did, and leaves mine as it was
        throw e;
      }
      if (json.length > MAX_MSG) return (undoMine(), Promise.reject(err('too_big', 'presence is too large')));
      mineJson = json;
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
      if (!connected || ws?.readyState !== WebSocket.OPEN) {
        if (outbox.length < OUTBOX_MAX) outbox.push(msg); // flushed once the next socket is listed
        return;
      }
      raw({ t: 'm', d: msg });
    },
    onMessage(h: (msg: unknown, from: string) => void) {
      msgHandlers.add(h);
      return () => msgHandlers.delete(h);
    },
    isLead: () => lead === SELF_ID,
    onLeadChange(h: (isLead: boolean) => void) {
      leadHandlers.add(h);
      return () => leadHandlers.delete(h);
    },
    // Tests (dev/scenarios/reconnect-edit.mjs): drop the socket as a network loss would, and hold reconnects for `ms`.
    pause(ms: number) {
      pausedUntil = performance.now() + ms;
      ws?.close();
    },
    async linkStats() {
      return connected ? [{ peer: SERVER_ID, rttMs }] : [];
    },
    close() {
      removeEventListener('pagehide', onHide);
      close();
    },
  };
}
export type WsRoom = Awaited<ReturnType<typeof createWsRoom>>;
/** The room the game joins. */
export type Room = WsRoom;

// The room the game joins (src/net/README.md; docs/plans/server-host.md, "Client" and "Transitions"). With no server
// configured it is a plain peer-room. Otherwise it is a switching room: one object with the room interface and one
// selfId, wrapping the current transport and moving between them as the server comes and goes:
//   ws        the server hosts the room (./ws-room.ts)
//   peer      a browser hosts it over PeerJS on our signaling (./peer-room.ts), as before the server hosted rooms
//   fallback  our server is unreachable: a browser hosts it on the public signaling, under `<room>-fb`
// It keeps its own presence and peer table (so a move doesn't pop avatars: peers the new transport lists again stay,
// the rest leave after GRACE_MS), buffers send() while moving, and forwards messages, connection, host and lead events
// from the current transport only. A move: the host of the transport it leaves says onHostChange(false) first (its
// sync hands the world to the server), waits handoffMs, then the old transport closes and the new one opens.
import { SELF_ID } from './ids.ts';
import { createPeerRoom, type RoomOptions, type PeersChange, type PeerEntry, type RoomError } from './peer-room.ts';
import { createWsRoom, type WsRoom } from './ws-room.ts';
import { createPeerTable } from './peer-table.ts';

type Msg = Record<string, unknown>;
type Kind = 'ws' | 'peer' | 'fallback';
/** What every room offers the game (src/net/README.md). */
export type Room = {
  readonly selfId: string;
  readonly transport: 'peer' | 'server' | 'fallback';
  presence(patch: unknown): Promise<void>;
  peers(): readonly PeerEntry[];
  onPeers(h: (c: PeersChange) => void, onError?: (e: RoomError) => void): () => void;
  onConnection(h: (connected: boolean) => void, onError?: (e: RoomError) => void): () => void;
  send(msg: unknown): void;
  onMessage(h: (msg: unknown, from: string) => void): () => void;
  isHost(): boolean;
  onHostChange(h: (isHost: boolean) => void): () => void;
  isLead(): boolean;
  onLeadChange(h: (isLead: boolean) => void): () => void;
  linkStats(): Promise<unknown[]>;
  close(): void;
};
type Timing = { wsGraceMs: number; probeMs: number; peerProbeMs: number; handoffMs: number; firstWsMs: number };
export type CreateRoomOptions = {
  roomId: string;
  server: string | null; // our server's http(s) base, or null: PeerJS only
  peerOptions?: () => Promise<Partial<RoomOptions>>; // signaling and ICE for `peer`
  fallbackSignal?: RoomOptions['signal']; // signaling for `fallback`; none: PeerJS's public cloud
  hostScore?: () => number;
  build?: string;
  debug?: number;
  connectTimeoutMs?: number;
  timing?: Partial<Timing>; // tests
};

const GRACE_MS = 9000;
const OUTBOX_MAX = 200;
const jitter = (ms: number) => ms * (0.7 + Math.random() * 0.6);
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function createRoom(opts: CreateRoomOptions): Promise<Room> {
  const peerRoom = async (): Promise<Room> =>
    createPeerRoom({
      roomId: opts.roomId,
      debug: opts.debug,
      hostScore: opts.hostScore,
      ...(await opts.peerOptions?.()),
    });
  if (!opts.server) return peerRoom();
  const server = opts.server;
  const t: Timing = {
    wsGraceMs: 30000,
    probeMs: 10000,
    peerProbeMs: 30000,
    handoffMs: 1500,
    firstWsMs: 6000,
    ...opts.timing,
  };
  const log = (...a: unknown[]) => (opts.debug ?? 0) > 0 && console.log('[room]', ...a);

  // Any HTTP answer (CORS or not) means the server is up; a network error or 2 s of silence means it isn't.
  async function reachable() {
    try {
      await fetch(new URL('/healthz', server), {
        mode: 'no-cors',
        cache: 'no-store',
        signal: AbortSignal.timeout(2000),
      });
      return true;
    } catch {
      return false;
    }
  }
  // Who hosts the room: 'server' or 'peer' (a 404 is an older server or a bare PeerServer), or null if unknown.
  async function hostStatus(): Promise<'server' | 'peer' | null> {
    try {
      const res = await fetch(new URL(`/rooms/${encodeURIComponent(opts.roomId)}/host`, server), {
        cache: 'no-store',
        signal: AbortSignal.timeout(3000),
      });
      if (res.status === 404) return 'peer';
      const body = await res.json();
      return body?.mode === 'server' ? 'server' : 'peer';
    } catch {
      return null;
    }
  }
  const openWs = (timeout = t.firstWsMs) =>
    createWsRoom({ roomId: opts.roomId, server, build: opts.build, debug: opts.debug, openTimeoutMs: timeout });
  const openFallback = (): Promise<Room> =>
    createPeerRoom({
      roomId: opts.roomId + '-fb',
      debug: opts.debug,
      hostScore: opts.hostScore,
      connectTimeoutMs: opts.connectTimeoutMs,
      ...(opts.fallbackSignal ? { signal: opts.fallbackSignal } : {}),
    });
  async function open(kind: Kind): Promise<Room> {
    return kind === 'ws' ? openWs() : kind === 'peer' ? peerRoom() : openFallback();
  }

  // Join (T1-T5): the server's room if it hosts it, else today's peer room, else the fallback when it's unreachable.
  async function join(): Promise<[Kind, Room]> {
    const until = performance.now() + t.wsGraceMs;
    for (;;) {
      try {
        return ['ws', await openWs()];
      } catch (e) {
        const code = (e as RoomError).code;
        if (code === 'room_full') throw e; // T5
        if (code !== 'unreachable') return ['peer', await peerRoom()]; // T2 (peer_hosted), or ws not possible here
      }
      if (!(await reachable())) return ['fallback', await openFallback()]; // T3
      const mode = await hostStatus();
      if (mode !== 'server') return ['peer', await peerRoom()]; // T4
      if (performance.now() > until) return ['fallback', await openFallback()];
      await sleep(jitter(1000)); // it hosts the room but the socket failed: try again for a while
    }
  }
  const [kind0, room0] = await join();

  // ---- the switching room ----
  const table = createPeerTable(SELF_ID);
  const connHandlers = new Set<(c: boolean) => void>(),
    msgHandlers = new Set<(m: unknown, from: string) => void>(),
    hostHandlers = new Set<(h: boolean) => void>(),
    leadHandlers = new Set<(l: boolean) => void>(),
    errHandlers = new Set<(e: RoomError) => void>();
  let kind: Kind = kind0,
    inner: Room | null = null,
    unsubs: (() => void)[] = [],
    mine: Msg = {},
    seq = 0,
    connected = false,
    host = false,
    lead = false,
    moving = false,
    closed = false,
    probeTimer: ReturnType<typeof setTimeout> | 0 = 0;
  const outbox: unknown[] = [];

  function call<A extends unknown[]>(set: Set<(...a: A) => void>, ...args: A) {
    for (const h of [...set])
      try {
        h(...args);
      } catch (e) {
        console.error('[room] handler threw', e);
      }
  }
  const setConnected = (c: boolean) => c !== connected && ((connected = c), call(connHandlers, c));
  const setHost = (h: boolean) => h !== host && ((host = h), call(hostHandlers, h));
  const setLead = (l: boolean) => l !== lead && ((lead = l), call(leadHandlers, l));

  function onInnerPeers(c: PeersChange) {
    for (const p of [...c.joined, ...c.updated]) if (!p.sameTab) table.upsert(p.peer, p.presence as Msg, ++seq);
    for (const p of c.left) if (!p.sameTab) table.drop(p.peer);
  }
  function attach(k: Kind, r: Room) {
    kind = k;
    inner = r;
    log('on', k);
    unsubs = [
      r.onPeers(onInnerPeers, (e) => fail(r, e)),
      r.onConnection(
        (c) => !moving && inner === r && setConnected(c),
        (e) => fail(r, e),
      ),
      r.onMessage((m, from) => inner === r && call(msgHandlers, m, from)),
      r.onHostChange((h) => inner === r && setHost(h)),
      r.onLeadChange((l) => inner === r && setLead(l)),
    ];
    if (k === 'ws') unsubs.push((r as unknown as WsRoom).onRedirect(() => move('peer'))); // T8
    r.presence(mine).catch(() => {});
    for (const m of outbox.splice(0))
      try {
        r.send(m);
      } catch (e) {
        console.warn('[room] dropped a held message', e); // too big for this transport
      }
    setHost(r.isHost());
    setLead(r.isLead());
    schedule();
  }
  // A transport that fails for good. Refusals (full, bad) go to the game, which shows them and retries; otherwise the
  // server's room tries the fallback, and a peer room the server's if it hosts the room now (T12).
  async function fail(r: Room, e: RoomError) {
    if (inner !== r || closed) return;
    log('transport failed', kind, e?.code);
    if (e?.code === 'room_full' || e?.code === 'bad') return call(errHandlers, e);
    if (kind === 'ws') return void move('fallback');
    if ((await hostStatus()) === 'server') return void move('ws');
    call(errHandlers, e);
  }
  const fatal = (e: unknown) => call(errHandlers, Object.assign(e as RoomError, { fatal: true }));

  // A move to the server's room opens it first and stays put if it can't (a probe saw it hosting, but this browser may
  // not reach its socket); the other moves leave a transport that is already failing. The host of the transport being
  // left says so first (its sync hands the world over: POST /rooms/:id/handoff) and goes first; the rest wait a bit.
  async function move(to: Kind) {
    if (moving || closed || to === kind) return;
    moving = true;
    log('move', kind, '->', to);
    let next: Room | null = null;
    if (to === 'ws') {
      try {
        next = await openWs();
      } catch (e) {
        log('server room unavailable', (e as RoomError).code);
        moving = false;
        return schedule();
      }
    }
    const old = inner!;
    const wasHost = host;
    setConnected(false);
    setLead(false);
    setHost(false);
    await sleep(wasHost ? t.handoffMs : t.handoffMs + Math.random() * 1000);
    for (const u of unsubs.splice(0)) u();
    if (!closed) old.close(); // close() already closed it otherwise
    inner = null;
    if (!closed && !next)
      try {
        next = await open(to);
      } catch (e) {
        moving = false;
        return fatal(e);
      }
    moving = false;
    if (closed) return void next?.close();
    table.expectBack(GRACE_MS);
    attach(to, next!);
  }

  // Watching for a better transport (T7, T9-T11).
  function schedule() {
    clearTimeout(probeTimer);
    if (closed) return;
    const every = kind === 'ws' ? 1000 : jitter(kind === 'fallback' ? t.probeMs : t.peerProbeMs);
    probeTimer = setTimeout(probe, every);
  }
  async function probe() {
    if (closed || moving || !inner) return schedule();
    if (kind === 'ws') {
      const down = (inner as unknown as WsRoom).downMs();
      if (down > t.wsGraceMs && !(await reachable())) return void move('fallback'); // T7
    } else if (kind === 'fallback') {
      if (await reachable()) {
        const mode = await hostStatus();
        if (mode) return void move(mode === 'server' ? 'ws' : 'peer'); // T9, T10
      }
    } else if ((await hostStatus()) === 'server') return void move('ws'); // T11
    schedule();
  }

  attach(kind0, room0);

  const sub = <H>(set: Set<H>, h: H, onError?: (e: RoomError) => void) => {
    set.add(h);
    if (onError) errHandlers.add(onError);
    return () => {
      set.delete(h);
      if (onError) errHandlers.delete(onError);
    };
  };
  return {
    selfId: SELF_ID,
    get transport() {
      return kind === 'ws' ? 'server' : kind;
    },
    presence(patch: unknown) {
      if (!patch || typeof patch !== 'object' || Array.isArray(patch))
        return Promise.reject(new TypeError('presence patch must be an object'));
      const next: Msg = { ...mine };
      for (const [k, v] of Object.entries(patch)) {
        if (v === null) delete next[k];
        else next[k] = v;
      }
      mine = next;
      table.setSelf(mine);
      return inner && !moving ? inner.presence(patch) : Promise.resolve();
    },
    peers: table.list,
    onPeers(h: (c: PeersChange) => void, onError?: (e: RoomError) => void) {
      const unsub = table.onChange(h);
      if (onError) errHandlers.add(onError);
      let live = true;
      setTimeout(() => {
        if (!live) return;
        const peers = table.list();
        h({ peers, joined: peers, left: [], updated: [] });
      }, 0);
      return () => {
        live = false;
        unsub();
        if (onError) errHandlers.delete(onError);
      };
    },
    onConnection(h: (c: boolean) => void, onError?: (e: RoomError) => void) {
      const unsub = sub(connHandlers, h, onError);
      setTimeout(() => connHandlers.has(h) && h(connected), 0);
      return unsub;
    },
    send(msg: unknown) {
      if (closed) return;
      if (inner && !moving) inner.send(msg);
      else if (outbox.length < OUTBOX_MAX) outbox.push(msg);
    },
    onMessage: (h: (m: unknown, from: string) => void) => sub(msgHandlers, h),
    isHost: () => host,
    onHostChange: (h: (h: boolean) => void) => sub(hostHandlers, h),
    isLead: () => lead,
    onLeadChange: (h: (l: boolean) => void) => sub(leadHandlers, h),
    linkStats: () => inner?.linkStats() ?? Promise.resolve([]),
    close() {
      closed = true;
      clearTimeout(probeTimer);
      for (const u of unsubs.splice(0)) u();
      inner?.close();
      inner = null;
      table.clear();
    },
  };
}

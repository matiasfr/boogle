// The server-hosted rooms (cfg.serverRooms; docs/plans/server-host.md, "The server host" and "Revision: full
// switchover"). `*` hosts current room ids (including bare generic names): a room loads on its first join, and is saved and
// unloaded after cfg.roomIdleMs with nobody in it; at most cfg.maxHostedRooms are loaded at once. A listed room loads
// with the process and stays. A railway room simulates only while someone is in it: hosted-room.ts pauses it
// cfg.roomPauseMs after it empties and the next join applies its away credit (world-host.ts, the paused world). A
// classic room still ticks until it unloads.
//
//   const roomHost = createRoomHost(cfg, store)
//   roomHost.upgrade(req, socket, head)   a /room/:id upgrade: checks, then the room's join (or a refusal)
//   roomHost.room(id)                     the hosted room, or undefined
//   roomHost.hosts(id), status(id)       whether it hosts that room; GET /rooms/:id/host
//   await roomHost.offline(id, fn)        admin.ts: close the room unsaved, run fn while joins are refused; 'busy' if closing
//   await roomHost.close({ save })
//   roomHost.closing()                    the ids still closing (index.ts names them if shutdown overruns)
import crypto from 'node:crypto';
import type http from 'node:http';
import type { Duplex } from 'node:stream';
import { WebSocketServer, type WebSocket } from 'ws';
import { WS_PROTOCOL, CLOSE, encode } from '../../../src/net/ws-wire.ts';
import { SERVER_ID, okId, okKey } from '../../../src/net/ids.ts';
import { okPid } from '../../../src/sim/roster.ts';
import { createHostedRoom, type HostCfg, type HostedRoom } from './hosted-room.ts';
import type { Store } from '../store.ts';
import { currentRoomId, roomNamespaces } from '../room-ids.ts';

const ROOM_ID_RE = /^[a-z0-9-]{1,32}$/;

export type RoomHostCfg = HostCfg & {
  serverRooms: string[];
  roomIdleMs: number;
  maxHostedRooms: number;
  roomCloseMs?: number; // a room's close (its last save) gets this long before its writer is fenced; default 5 s
  upgradesPerMin: number; // per IP
  allowedOrigins: string[];
  trustProxy: unknown;
  log: (...a: unknown[]) => void;
};

export function createRoomHost(cfg: RoomHostCfg, store: Store) {
  const boot = crypto.randomBytes(4).toString('hex');
  const rooms = new Map<string, HostedRoom>();
  const all = cfg.serverRooms.includes('*');
  const ns = roomNamespaces(cfg.serverRooms);
  const listed = new Set(ns.currentRooms);
  const hosts = (id: string) => currentRoomId(id, ns) && (all || listed.has(id));
  const closeMs = cfg.roomCloseMs ?? 5000;
  // Each authority writes through its own fence: once its close fails or overruns, it can never write again.
  const fences = new WeakMap<HostedRoom, { up: boolean }>();
  const load = (id: string) => {
    const fence = { up: false };
    const refused = () => Promise.reject(new Error(`room ${id}: this authority's close failed; its writes are fenced`));
    const own: Store = {
      ...store,
      write: (...a) => (fence.up ? refused() : store.write(...a)),
      create: (...a) => (fence.up ? refused() : store.create(...a)),
    };
    const room = createHostedRoom({ roomId: id, store: own, cfg, boot, log: cfg.log });
    fences.set(room, fence);
    failed.delete(id);
    rooms.set(id, room);
    return room;
  };
  const unloading = new Set<Promise<unknown>>();
  const closing = new Set<string>();
  // Rooms whose last close failed, until they load again (after their drain); shutdown reports them.
  const failed = new Map<string, unknown>();
  const offlines = new Map<string, Promise<void>>(); // offline() runs in progress, settled (never rejected) when done
  let stopping = false;
  for (const id of listed) load(id);
  // A room's close, bounded by closeMs; false when it failed (a refused or failed save, a save that did not load
  // cleanly) or overran. The authority is then fenced: every write it asks for from now on is refused. A write it asked
  // for before (an overrunning last save) can still be queued in the store's per-room lock and land later: see drain.
  async function closeBounded(id: string, room: HostedRoom, save: boolean) {
    let timer: NodeJS.Timeout | undefined;
    try {
      await Promise.race([
        room.close({ save }),
        new Promise<never>((_, reject) => {
          timer = setTimeout(() => reject(new Error(`close timed out after ${closeMs} ms`)), closeMs);
        }),
      ]);
      return true;
    } catch (error) {
      fences.get(room)!.up = true;
      failed.set(id, error);
      cfg.log(
        `room ${id}: close failed; its writer is fenced; the room reopens once its queued writes land`,
        String(error),
      );
      return false;
    } finally {
      clearTimeout(timer);
    }
  }
  // Every write a failed authority queued, landed. The next authority loads the file with store.readSync, which does
  // not wait on the store's lock: loaded before then, it would read an older tick and later save it back over the old
  // authority's last save. A slow disk recovers on its own; one that never answers keeps the room closing, as a hung
  // save always did.
  const drain = (id: string) => store.withLock(id, async () => {});
  // The slot is held until the close has drained, failed or not, then always freed: a join meanwhile is refused with
  // `bye restart`, and one after loads the room from its file. Shutdown waits for the bounded close, then for the drain
  // of every closing room within its own bound (close below).
  function closeRoom(id: string, room: HostedRoom, save: boolean) {
    if (closing.has(id)) return;
    closing.add(id);
    const p = closeBounded(id, room, save);
    unloading.add(p);
    void p
      .finally(() => unloading.delete(p))
      .then((ok) => (ok ? undefined : drain(id)))
      .finally(() => {
        if (rooms.get(id) === room) rooms.delete(id);
        closing.delete(id);
      });
  }
  // Keep the authority's map slot until its close has durably drained (or failed, been fenced and had its queued writes
  // land). A reconnect must never load an older checkpoint while a write of the previous writer is still pending.
  const idle = setInterval(() => {
    for (const [id, room] of rooms)
      if (!listed.has(id) && !closing.has(id) && room.idleMs() > cfg.roomIdleMs) {
        closeRoom(id, room, true);
      }
  }, 1000);
  idle.unref();
  const wss = new WebSocketServer({
    noServer: true,
    maxPayload: 64 * 1024,
    handleProtocols: (protocols) => (protocols.has(WS_PROTOCOL) ? WS_PROTOCOL : false),
  });
  const upgrades = new Map<string, { n: number; at: number }>(); // ip -> upgrades this minute
  const sweep = setInterval(() => upgrades.clear(), 60000);
  sweep.unref();
  if (all || listed.size) cfg.log(`hosting rooms: ${all ? 'all' : [...listed].join(', ')} (boot ${boot})`);

  const refuse = (socket: Duplex, status: string) => {
    socket.write(`HTTP/1.1 ${status}\r\nConnection: close\r\n\r\n`);
    socket.destroy();
  };
  const refuseWs = (ws: WebSocket, msg: Record<string, unknown> & { t: string }, code: number) => {
    ws.send(encode(msg));
    ws.close(code);
  };

  return {
    room: (id: string) => rooms.get(id),
    hosts,
    rooms: () => rooms.size,
    status(id: string) {
      const room = rooms.get(id);
      if (!room) return { mode: 'server', tick: store.readSync(id)?.tick ?? 0, players: 0, max: cfg.maxPlayers };
      const { boot: b, tick, players, max, noSave, replication, railway, steps } = room.status();
      return {
        mode: 'server',
        boot: b,
        tick,
        players,
        max,
        noSave,
        replication,
        railway,
        steps,
      };
    },
    upgrade(req: http.IncomingMessage, socket: Duplex, head: Buffer) {
      if (stopping) return refuse(socket, '503 Service Unavailable');
      const origin = req.headers.origin;
      if (!cfg.allowedOrigins.includes('*') && !(origin && cfg.allowedOrigins.includes(origin)))
        return refuse(socket, '403 Forbidden');
      // Fly's proxy sets fly-client-ip; without a trusted proxy in front a client could set it to dodge the limit.
      const ip = String((cfg.trustProxy && req.headers['fly-client-ip']) || req.socket.remoteAddress || '?');
      const now = Date.now();
      const u = upgrades.get(ip) ?? { n: 0, at: now };
      upgrades.set(ip, u);
      if (++u.n > cfg.upgradesPerMin) return refuse(socket, '429 Too Many Requests');

      // Split, never `new URL(req.url)`: a target like `//[` throws, and a throw in the upgrade listener crashes the
      // server. URLSearchParams and the guarded decode below don't throw.
      const [path = '', query = ''] = (req.url ?? '/').split('?', 2);
      let id = '';
      try {
        id = decodeURIComponent(path.slice('/room/'.length));
      } catch {
        // a malformed escape: refused as a bad id below
      }
      const params = new URLSearchParams(query);
      const self = params.get('self');
      const pid = params.get('pid');
      const key = params.get('key');
      wss.handleUpgrade(req, socket, head, (ws) => {
        if (stopping) return refuseWs(ws, { t: 'bye', why: 'restart' }, CLOSE.RESTART);
        if (
          ws.protocol !== WS_PROTOCOL ||
          !ROOM_ID_RE.test(id) ||
          !okId(self) ||
          self === SERVER_ID ||
          !okPid(pid) ||
          !okKey(key)
        )
          return refuseWs(ws, { t: 'bad' }, CLOSE.BAD);
        if (!hosts(id)) return refuseWs(ws, { t: 'peer' }, CLOSE.NOT_HOSTED);
        if (closing.has(id)) return refuseWs(ws, { t: 'bye', why: 'restart' }, CLOSE.RESTART);
        const room = rooms.get(id) ?? (rooms.size < cfg.maxHostedRooms ? load(id) : null);
        if (!room) return refuseWs(ws, { t: 'full', max: cfg.maxPlayers, rooms: true }, CLOSE.FULL);
        room.join(ws, self, pid, key);
      });
    },
    // The operator replacing a room's save (../admin.ts). The room's state is being discarded; the slot stays
    // `closing` until fn has settled, so no join loads the old file.
    async offline<T>(id: string, fn: () => Promise<T>): Promise<T | 'busy'> {
      if (stopping || closing.has(id)) return 'busy';
      closing.add(id);
      // Shutdown waits for this run (fn may queue its write only after other work, after shutdown's drain).
      let done = () => {};
      offlines.set(id, new Promise<void>((resolve) => (done = resolve)));
      try {
        const room = rooms.get(id);
        if (room) {
          if (!(await closeBounded(id, room, false))) await drain(id);
          failed.delete(id); // its state is being replaced: nothing is lost
          rooms.delete(id);
        }
        return await fn();
      } finally {
        closing.delete(id);
        offlines.delete(id);
        done();
        if (listed.has(id) && !rooms.has(id) && !stopping) load(id);
      }
    },
    // Rooms still closing (draining, or offline): index.ts names them if its hard exit fires.
    closing: () => [...closing],
    // Settles once every room has closed and every write a closing room queued (a fenced close's last save, one still
    // draining from an earlier failed idle close, or an offline() run's) has landed. The whole wait ends 1.5 x closeMs
    // after it begins (7.5 s by default); writes still queued then are reported, saving or not. Then every socket still
    // open is terminated, so server.ts's HTTP close (forced at 1 s) is not held open by a stalled room's players: the
    // report reaches index.ts by about 8.5 s, inside its 9 s hard exit and Fly's 10 s kill_timeout.
    async close({ save = true } = {}) {
      stopping = true;
      clearInterval(sweep);
      clearInterval(idle);
      const deadline = performance.now() + closeMs * 1.5;
      let timer: NodeJS.Timeout | undefined;
      try {
        for (const [id, room] of rooms) closeRoom(id, room, save);
        // Drain every writer before reporting any failure: another room may still have accepted edits.
        await Promise.all(unloading);
        const left = new Set(closing);
        const settled = [...left].map((id) => Promise.all([drain(id), offlines.get(id)]).then(() => left.delete(id)));
        const drained = await Promise.race([
          Promise.all(settled).then(() => true),
          new Promise<false>((resolve) => {
            timer = setTimeout(() => resolve(false), Math.max(0, deadline - performance.now()));
          }),
        ]);
        if (!drained) {
          const late = new Error(`writes still queued for ${[...left].join(', ')} after ${closeMs * 1.5} ms`);
          throw new AggregateError([...failed.values(), late], 'one or more rooms did not finish writing');
        }
        if (save && failed.size) throw new AggregateError([...failed.values()], 'one or more rooms failed to close');
      } finally {
        clearTimeout(timer);
        // Every player has been sent `bye`; a stalled room's own close would only close them once its save settles.
        for (const ws of wss.clients) ws.terminate();
        wss.close();
      }
    },
  };
}
export type RoomHost = ReturnType<typeof createRoomHost>;

// The server-hosted rooms (cfg.serverRooms; docs/plans/server-host.md, "The server host" and "Revision: full
// switchover"). `*` hosts every valid room id: a room loads (from its save) on its first join, and is saved and
// unloaded after cfg.roomIdleMs with nobody in it; at most cfg.maxHostedRooms are loaded at once. A listed room loads
// with the process and stays. A railway room simulates only while someone is in it: hosted-room.ts pauses it
// cfg.roomPauseMs after it empties and the next join applies its away credit (world-host.ts, the paused world). A
// classic room still ticks until it unloads.
//
//   const roomHost = createRoomHost(cfg, store)
//   roomHost.upgrade(req, socket, head)   a /room/:id upgrade: checks, then the room's join (or a refusal)
//   roomHost.room(id)                     the hosted room, or undefined
//   roomHost.hosts(id), status(id)       whether it hosts that room; GET /rooms/:id/host
//   await roomHost.close({ save })
import crypto from 'node:crypto';
import type http from 'node:http';
import type { Duplex } from 'node:stream';
import { WebSocketServer, type WebSocket } from 'ws';
import { WS_PROTOCOL, CLOSE, encode } from '../../../src/net/ws-wire.ts';
import { SERVER_ID, okId, okKey } from '../../../src/net/ids.ts';
import { okPid } from '../../../src/sim/roster.ts';
import { createHostedRoom, type HostCfg, type HostedRoom } from './hosted-room.ts';
import type { Store } from '../store.ts';

const ROOM_ID_RE = /^[a-z0-9-]{1,32}$/;

export type RoomHostCfg = HostCfg & {
  serverRooms: string[];
  roomIdleMs: number;
  maxHostedRooms: number;
  upgradesPerMin: number; // per IP
  allowedOrigins: string[];
  trustProxy: unknown;
  log: (...a: unknown[]) => void;
};

export function createRoomHost(cfg: RoomHostCfg, store: Store) {
  const boot = crypto.randomBytes(4).toString('hex');
  const rooms = new Map<string, HostedRoom>();
  const all = cfg.serverRooms.includes('*');
  const listed = new Set(cfg.serverRooms.filter((id) => ROOM_ID_RE.test(id)));
  const hosts = (id: string) => ROOM_ID_RE.test(id) && (all || listed.has(id));
  const load = (id: string) => {
    const room = createHostedRoom({ roomId: id, store, cfg, boot, log: cfg.log });
    rooms.set(id, room);
    return room;
  };
  for (const id of listed) load(id);
  const unloading = new Set<Promise<unknown>>();
  const closing = new Set<string>();
  const blocked = new Map<string, unknown>();
  let stopping = false;
  function closeRoom(id: string, room: HostedRoom, save: boolean) {
    if (closing.has(id)) return;
    closing.add(id);
    const p = Promise.resolve()
      .then(() => room.close({ save }))
      .then(() => {
        if (rooms.get(id) === room) rooms.delete(id);
        closing.delete(id);
      })
      .catch((error: unknown) => {
        // Keep the failed authority fenced until process restart/recovery, preserving its last good file.
        blocked.set(id, error);
        cfg.log(`room ${id}: close blocked`, String(error));
      })
      .finally(() => unloading.delete(p));
    unloading.add(p);
  }
  // Keep the authority's map slot until its close has durably drained. A reconnect must never load an older
  // checkpoint while the previous writer still owns a pending write to the same room file.
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
        noSave: noSave || blocked.has(id),
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
    async close({ save = true } = {}) {
      stopping = true;
      clearInterval(sweep);
      clearInterval(idle);
      try {
        for (const [id, room] of rooms) closeRoom(id, room, save);
        // Drain every writer before reporting any failure: another room may still have accepted edits.
        await Promise.all(unloading);
        if (save && blocked.size) throw new AggregateError([...blocked.values()], 'one or more rooms failed to close');
      } finally {
        wss.close();
      }
    },
  };
}
export type RoomHost = ReturnType<typeof createRoomHost>;

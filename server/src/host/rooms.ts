// The server-hosted rooms (cfg.serverRooms; docs/plans/server-host.md, "The server host"). Each one's world starts
// with the process and ticks with or without players; while a room is hosted here its PeerJS host id is held
// (upgrade.ts answers ID-TAKEN), so no browser can host it too.
//
//   const roomHost = createRoomHost(cfg, store)
//   roomHost.upgrade(req, socket, head)   a /room/:id upgrade: checks, then the room's join (or a refusal)
//   roomHost.holdsPeerId(id)              a PeerJS id this server holds
//   roomHost.room(id)                     the hosted room, or undefined
//   roomHost.status(id)                   GET /rooms/:id/host: { mode: 'server', ... } or { mode: 'peer' }
//   await roomHost.handoff(id, doc)       POST /rooms/:id/handoff for a hosted room ({ status, body }), else null
//   await roomHost.close({ save })
import crypto from 'node:crypto';
import type http from 'node:http';
import type { Duplex } from 'node:stream';
import { WebSocketServer, type WebSocket } from 'ws';
import { WS_PROTOCOL, CLOSE, encode } from '../../../src/net/ws-wire.ts';
import { SERVER_ID, okId, peerHostId } from '../../../src/net/ids.ts';
import { createHostedRoom, type HostCfg, type HostedRoom } from './hosted-room.ts';
import type { Store } from '../store.ts';

const ROOM_ID_RE = /^[a-z0-9-]{1,32}$/;
const UPGRADES_PER_MIN = 20; // per IP

export type RoomHostCfg = HostCfg & {
  serverRooms: string[];
  adoptWindowMs: number;
  allowedOrigins: string[];
  trustProxy: unknown;
  log: (...a: unknown[]) => void;
};

export function createRoomHost(cfg: RoomHostCfg, store: Store) {
  const boot = crypto.randomBytes(4).toString('hex');
  const startedAt = performance.now();
  const rooms = new Map<string, HostedRoom>();
  for (const id of cfg.serverRooms)
    if (ROOM_ID_RE.test(id)) rooms.set(id, createHostedRoom({ roomId: id, store, cfg, boot, log: cfg.log }));
  const held = new Set([...rooms.keys()].map(peerHostId));
  const wss = new WebSocketServer({
    noServer: true,
    maxPayload: 64 * 1024,
    handleProtocols: (protocols) => (protocols.has(WS_PROTOCOL) ? WS_PROTOCOL : false),
  });
  const upgrades = new Map<string, { n: number; at: number }>(); // ip -> upgrades this minute
  const sweep = setInterval(() => upgrades.clear(), 60000);
  sweep.unref();
  if (rooms.size) cfg.log(`hosting rooms: ${[...rooms.keys()].join(', ')} (boot ${boot})`);

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
    holdsPeerId: (id: string) => held.has(id),
    status(id: string) {
      const room = rooms.get(id);
      if (!room) return { mode: 'peer' };
      const { boot: b, tick, players, max, noSave } = room.status();
      return { mode: 'server', boot: b, tick, players, max, noSave };
    },
    // The newest-by-tick rule (docs/plans/server-host.md, "Adopting a handoff"): a world that loads cleanly, is newer
    // than the hosted one, and arrives while this process is young (a peer host the server just took over from).
    async handoff(id: string, doc: { tick: number; data: unknown }) {
      const room = rooms.get(id);
      if (!room) return null;
      const tick = room.status().tick;
      const at = (doc.data as { tick?: unknown } | null)?.tick;
      if (typeof at !== 'number') return { status: 400, body: { error: 'bad snapshot' } };
      // The cheap checks first: validating loads a whole scratch world on the thread every room ticks on.
      if (at <= tick || performance.now() - startedAt > cfg.adoptWindowMs)
        return { status: 409, body: { adopted: false, tick } };
      if (!room.world.validate(doc.data)) return { status: 400, body: { error: 'bad snapshot' } };
      const adopted = await room.adopt(doc.data);
      return adopted
        ? { status: 200, body: { adopted: true, tick: room.status().tick } }
        : { status: 400, body: { error: 'bad snapshot' } };
    },
    upgrade(req: http.IncomingMessage, socket: Duplex, head: Buffer) {
      const origin = req.headers.origin;
      if (!cfg.allowedOrigins.includes('*') && !(origin && cfg.allowedOrigins.includes(origin)))
        return refuse(socket, '403 Forbidden');
      // Fly's proxy sets fly-client-ip; without a trusted proxy in front a client could set it to dodge the limit.
      const ip = String((cfg.trustProxy && req.headers['fly-client-ip']) || req.socket.remoteAddress || '?');
      const now = Date.now();
      const u = upgrades.get(ip) ?? { n: 0, at: now };
      upgrades.set(ip, u);
      if (++u.n > UPGRADES_PER_MIN) return refuse(socket, '429 Too Many Requests');

      const url = new URL(req.url ?? '/', 'http://localhost');
      let id = '';
      try {
        id = decodeURIComponent(url.pathname.slice('/room/'.length));
      } catch {
        // a malformed escape: refused as a bad id below (this runs in the upgrade listener, so a throw would crash)
      }
      const self = url.searchParams.get('self');
      wss.handleUpgrade(req, socket, head, (ws) => {
        if (ws.protocol !== WS_PROTOCOL || !ROOM_ID_RE.test(id) || !okId(self) || self === SERVER_ID)
          return refuseWs(ws, { t: 'bad' }, CLOSE.BAD);
        const room = rooms.get(id);
        if (!room) return refuseWs(ws, { t: 'peer' }, CLOSE.NOT_HOSTED);
        room.join(ws, self);
      });
    },
    async close({ save = true } = {}) {
      clearInterval(sweep);
      await Promise.all([...rooms.values()].map((r) => r.close({ save })));
      wss.close();
    },
  };
}
export type RoomHost = ReturnType<typeof createRoomHost>;

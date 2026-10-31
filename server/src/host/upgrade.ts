// One `upgrade` listener for the whole server (docs/plans/server-host.md, "Who may host"): PeerJS signaling at its
// path, room sockets at /room/:id (once a room host exists), anything else 404. The PeerJS WebSocket server is made
// with noServer, because a ws server attached to the http server answers 400 to every upgrade outside its own path.
// A PeerJS registration of a host id this server holds gets the ID-TAKEN PeerJS sends for a taken id, so that tab
// becomes a client instead of a second host.
import type http from 'node:http';
import type { Duplex } from 'node:stream';
import type { WebSocketServer } from 'ws';

export type RoomHost = {
  upgrade(req: http.IncomingMessage, socket: Duplex, head: Buffer): void;
  holdsPeerId(id: string): boolean;
};
const ID_TAKEN = JSON.stringify({ type: 'ID-TAKEN', payload: { msg: 'ID is taken' } });

export function routeUpgrades(
  server: http.Server,
  { peerWss, roomHost }: { peerWss: () => WebSocketServer | null; roomHost: () => RoomHost | null },
) {
  server.on('upgrade', (req: http.IncomingMessage, socket: Duplex, head: Buffer) => {
    const url = new URL(req.url ?? '/', 'http://localhost');
    const wss = peerWss();
    const host = roomHost();
    if (wss && url.pathname === wss.options.path) {
      const taken = host?.holdsPeerId(url.searchParams.get('id') ?? '');
      wss.handleUpgrade(req, socket, head, (ws) => {
        if (!taken) return void wss.emit('connection', ws, req);
        ws.send(ID_TAKEN);
        ws.close();
      });
      return;
    }
    if (host && url.pathname.startsWith('/room/')) {
      host.upgrade(req, socket, head);
      return;
    }
    socket.write('HTTP/1.1 404 Not Found\r\nConnection: close\r\n\r\n');
    socket.destroy();
  });
}

// One `upgrade` listener for the whole server (docs/plans/server-host.md, "Who may host"): PeerJS signaling at its
// path, room sockets at /room/:id (once a room host exists), anything else 404. The PeerJS WebSocket server is made
// with noServer, because a ws server attached to the http server answers 400 to every upgrade outside its own path.
import type http from 'node:http';
import type { Duplex } from 'node:stream';
import type { WebSocketServer } from 'ws';

export type RoomHost = { upgrade(req: http.IncomingMessage, socket: Duplex, head: Buffer): void };

export function routeUpgrades(
  server: http.Server,
  { peerWss, roomHost }: { peerWss: () => WebSocketServer | null; roomHost: RoomHost | null },
) {
  server.on('upgrade', (req: http.IncomingMessage, socket: Duplex, head: Buffer) => {
    const { pathname } = new URL(req.url ?? '/', 'http://localhost');
    const wss = peerWss();
    if (wss && pathname === wss.options.path) {
      wss.handleUpgrade(req, socket, head, (ws) => wss.emit('connection', ws, req));
      return;
    }
    if (roomHost && pathname.startsWith('/room/')) {
      roomHost.upgrade(req, socket, head);
      return;
    }
    socket.write('HTTP/1.1 404 Not Found\r\nConnection: close\r\n\r\n');
    socket.destroy();
  });
}

// One `upgrade` listener for the whole server: room sockets at /room/:id (./rooms.ts), anything else 404.
import type http from 'node:http';
import type { Duplex } from 'node:stream';

export type RoomHost = { upgrade(req: http.IncomingMessage, socket: Duplex, head: Buffer): void };

export function routeUpgrades(server: http.Server, { roomHost }: { roomHost: () => RoomHost | null }) {
  server.on('upgrade', (req: http.IncomingMessage, socket: Duplex, head: Buffer) => {
    // Never parse req.url with URL here: a target like `//[` throws, and a throw in this listener exits the process.
    const pathname = (req.url ?? '/').split('?')[0];
    const host = roomHost();
    if (host && pathname.startsWith('/room/')) return host.upgrade(req, socket, head);
    socket.write('HTTP/1.1 404 Not Found\r\nConnection: close\r\n\r\n');
    socket.destroy();
  });
}

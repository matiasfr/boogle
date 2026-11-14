import type { IncomingMessage } from 'node:http';
import { isIP } from 'node:net';

// REPLACE_FLY_PROXY is the existing deployment opt-in, shared by HTTP and WebSocket admission.
// Enable only behind Fly's edge, which replaces this header. X-Forwarded-For is never trusted.
export function clientAddress(req: Pick<IncomingMessage, 'headers' | 'socket'>, fromFly = false): string {
  const header = fromFly ? req.headers['fly-client-ip'] : undefined;
  const edge = typeof header === 'string' ? header.trim() : undefined;
  return edge && isIP(edge) ? edge : req.socket.remoteAddress || 'unknown';
}

export const MAX_CLIENT_ADDRESSES = 1024;

/** Refresh an address's age, evicting the least recently seen entry before adding a new one. */
export function rememberAddress<T>(map: Map<string, T>, key: string, value: T): void {
  map.delete(key);
  if (map.size >= MAX_CLIENT_ADDRESSES) map.delete(map.keys().next().value!);
  map.set(key, value);
}

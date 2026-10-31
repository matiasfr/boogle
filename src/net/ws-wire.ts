// The wire between a browser and the server host (docs/plans/server-host.md, "Wire"): JSON text frames on a WebSocket
// at /room/<roomId>?self=<selfId>&b=<build>, subprotocol WS_PROTOCOL. Message shapes copy peer-room's, so both rooms
// share their handling. Pure; the server imports it too.
export const WS_PROTOCOL = 'boogle.1';
export const CLOSE = { NOT_HOSTED: 4000, FULL: 4008, REPLACED: 4009, BAD: 4400, RESTART: 1012 } as const;
export const MAX_MSG = 16000;

export type WireMsg = { t: string; [k: string]: unknown };
export const encode = (msg: WireMsg) => JSON.stringify(msg);
/** The message, or null for anything that is not a JSON object with a string `t`. */
export function decode(data: unknown): WireMsg | null {
  let v: unknown;
  try {
    v = JSON.parse(String(data));
  } catch {
    return null;
  }
  if (!v || typeof v !== 'object' || Array.isArray(v) || typeof (v as WireMsg).t !== 'string') return null;
  return v as WireMsg;
}
/** The room's WebSocket URL on the server at `base` (http -> ws, https -> wss). */
export function roomUrl(base: string, roomId: string, selfId: string, build: string) {
  const u = new URL(`/room/${encodeURIComponent(roomId)}`, base);
  u.protocol = u.protocol === 'https:' ? 'wss:' : 'ws:';
  u.searchParams.set('self', selfId);
  u.searchParams.set('b', build);
  return u.href;
}

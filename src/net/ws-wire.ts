// The wire between a browser and the server host (docs/plans/server-host.md, "Wire"): JSON text frames on a WebSocket
// at /room/<roomId>?self=<selfId>&pid=<pid>&key=<key>&b=<build>, subprotocol WS_PROTOCOL. Message shapes follow the
// old peer room's. Pure; the server imports it too.
export const WS_PROTOCOL = 'boogle.1';
// ELSEWHERE: a newer tab of the same player joined (src/player/identity.ts), so this one stops for good. TAKEN: that
// pid is in the room under another browser's key.
export const CLOSE = {
  NOT_HOSTED: 4000,
  FULL: 4008,
  REPLACED: 4009,
  ELSEWHERE: 4010,
  TAKEN: 4011,
  BAD: 4400,
  RESTART: 1012,
} as const;
export const MAX_MSG = 16000;

export type WireMsg = { t: string; [k: string]: unknown };
/** Server-origin only; clients have no room replacement command on the socket. */
export type ReplacingNotice = { label: string; seconds: number };
/** Placeholder UI copy from room-fast-forward.md, pending owner review. */
export const replacingText = ({ label, seconds }: ReplacingNotice) =>
  `This room will be replaced with ${label} in ${seconds} seconds. What you carry and your finds here will be lost.`;
/** Placeholder post-reset line from the plan; the client decides whether this browser actually rebirthed. */
export const replacedText = (label: string, shared: boolean) =>
  `${shared ? 'The shared island' : 'This room'} was replaced with ${label} for testing. The world changed for everyone, and what you carried and found here is gone.`;
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
// who: self (this connection), pid (the player), key (the browser's secret behind the pid), b (the build).
export function roomUrl(base: string, roomId: string, who: { self: string; pid: string; key: string; b: string }) {
  const u = new URL(`/room/${encodeURIComponent(roomId)}`, base);
  u.protocol = u.protocol === 'https:' ? 'wss:' : 'ws:';
  for (const [k, v] of Object.entries(who)) u.searchParams.set(k, v);
  return u.href;
}

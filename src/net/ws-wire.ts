// The wire between a browser and the server host (docs/plans/server-host.md, "Wire"): JSON text frames on a WebSocket
// at /room/<roomId>?self=<selfId>&b=<build>, subprotocol WS_PROTOCOL, then account-wire.ts's first auth frame. Shapes follow the
// old peer room's. Pure; the server imports it too.
export const WS_PROTOCOL = 'boogle.1';
// ELSEWHERE: a newer connection of this player joined, so this tab stops. TAKEN: a connection id belongs to another person.
export const CLOSE = {
  NOT_HOSTED: 4000,
  FULL: 4008,
  REPLACED: 4009,
  ELSEWHERE: 4010,
  TAKEN: 4011,
  AUTH: 4401,
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
// Only public connection/build metadata belongs in a URL.
export function roomUrl(
  base: string,
  roomId: string,
  who: { self: string; b: string; serverBuild?: string; world?: string },
) {
  const u = new URL(`/room/${encodeURIComponent(roomId)}`, base);
  u.protocol = u.protocol === 'https:' ? 'wss:' : 'ws:';
  u.searchParams.set('self', who.self);
  u.searchParams.set('b', who.b);
  if (who.serverBuild) u.searchParams.set('serverBuild', who.serverBuild);
  if (who.world) u.searchParams.set('world', who.world);
  return u.href;
}

// Ids shared by the PeerJS room, the server room and the server itself (docs/plans/server-host.md, "Ids"). Pure: no
// browser globals besides crypto.getRandomValues, which Node has too.
const rand = (n: number) => {
  const b = crypto.getRandomValues(new Uint8Array(n));
  return Array.from(b, (x) => (x % 36).toString(36)).join('');
};
/** This tab's id, per page load; deliberately not the PeerJS id. */
export const SELF_ID = rand(10);
export { rand };
/** The `from` of every message the server host sends; no tab may use it as its selfId. */
export const SERVER_ID = 'server';
export const okId = (s: unknown): s is string => typeof s === 'string' && /^[a-z0-9]{1,32}$/.test(s);
export const safeRoom = (s: string) => s.replace(/[^A-Za-z0-9]/g, (c) => '_' + c.charCodeAt(0).toString(16));
/** The PeerJS id whoever hosts a room holds. */
export const peerHostId = (roomId: string) => `boogle-${safeRoom(roomId)}-host`;

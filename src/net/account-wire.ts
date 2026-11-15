// The first socket frame only. Credentials never enter room messages, presence or the URL.
export const AUTH_TIMEOUT_MS = 5000;
export const AUTH_MAX_BYTES = 1024;
export type RoomAuth = { t: 'auth'; token: string; tuneKey?: string };
export const isSessionToken = (value: unknown): value is string =>
  typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);

export function readRoomAuth(value: unknown): RoomAuth | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const v = value as Record<string, unknown>;
  if (
    v.t !== 'auth' ||
    !isSessionToken(v.token) ||
    Object.keys(v).some((key) => !['t', 'token', 'tuneKey'].includes(key)) ||
    (v.tuneKey !== undefined && (typeof v.tuneKey !== 'string' || v.tuneKey.length > 256))
  )
    return null;
  return { t: 'auth', token: v.token, ...(typeof v.tuneKey === 'string' && { tuneKey: v.tuneKey }) };
}

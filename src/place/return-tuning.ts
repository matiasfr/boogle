// Local next-load preference. The catalogue and dev adapter share the owner's bounds.
import { validValue } from '../tunables/spec.ts';
export const railReturnMinutes = {
  id: 'railway.returnMinutes',
  type: 'number',
  scope: 'local',
  default: 30,
  min: 0,
  max: 1440,
  integer: false,
  units: 'minutes',
  at: 'next load',
  owner: 'src/entities/railway/arrival.ts',
  meaning: 'Recent return window; 0 disables returning to the remembered spot.',
} as const;
export const RETURN_MINUTES_KEY = 'boogle.railway-returnMinutes';
/** This browser's localStorage, or null where policy blocks it (a private window, blocked site data): reading the
 * global can itself throw, so every return-record reader and writer goes through here. */
export function localStore(): Storage | null {
  try {
    return localStorage;
  } catch {
    return null;
  }
}
export function readReturnMinutes(storage: Pick<Storage, 'getItem'> | null): number {
  try {
    const text = storage?.getItem(RETURN_MINUTES_KEY) ?? null;
    const value: unknown = text === null ? null : JSON.parse(text);
    return validValue(railReturnMinutes, value) ? value : railReturnMinutes.default;
  } catch {
    return railReturnMinutes.default;
  }
}

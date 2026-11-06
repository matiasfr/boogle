// Personal station claims, separate from the shared railway and all existing profile keys.
// The adapter must derive eligibility from verified completed railway state, then reveal only an `accepted`
// result. This headless contract does not reveal or grant anything on snapshot/load. A cross-tab exclusive lock is
// required: one localStorage write is atomic, but read/choose/write across two tabs is not.
import { okPid } from './sim/roster.ts';

export const MAX_RAILWAY_CLAIMS = 128;
export const MAX_RAILWAY_PROFILE_BYTES = 32768;
export type RailwayEntitlement = { world: string; station: 'T1' | 'T2'; completion: 1 };
export type RailwayClaim = RailwayEntitlement & { cosmetic: string };
export type RailwayProfile = { version: 0; claims: RailwayClaim[] };
export type RailwayClaimResult = { status: 'accepted' | 'claimed'; claim: RailwayClaim; profile: RailwayProfile };
export type RailwayProfileStorage = {
  getItem(key: string): string | null;
  // Like localStorage.setItem: successful return means the complete value was replaced; throw means no replacement.
  setItem(key: string, value: string): void;
};
// Browser integration must provide the same exclusive Web Lock name for every tab using this profile key. Do not
// substitute a per-tab mutex or an unlocked fallback. No browser APIs are imported by this headless module.
export type RailwayProfileLock = <T>(name: string, work: () => T) => Promise<T>;

const isObject = (v: unknown): v is Record<string, unknown> => v !== null && typeof v === 'object' && !Array.isArray(v);
const exactKeys = (v: Record<string, unknown>, keys: string[]) =>
  Object.keys(v).length === keys.length && keys.every((key) => Object.hasOwn(v, key));
const validWorld = (v: unknown): v is string => typeof v === 'string' && /^[a-zA-Z0-9:._/-]{1,96}$/.test(v);
const validCosmetic = (v: unknown): v is string => typeof v === 'string' && /^[a-zA-Z0-9._-]{1,64}$/.test(v);
const entitlementKey = (v: RailwayEntitlement) => `${v.world}:${v.station}:${v.completion}`;

function validEntitlement(v: unknown): v is RailwayEntitlement {
  return isObject(v) && validWorld(v.world) && (v.station === 'T1' || v.station === 'T2') && v.completion === 1;
}

export function createRailwayProfile({
  pid,
  cosmetics,
  storage,
  exclusive,
}: {
  pid: string;
  cosmetics: readonly string[];
  storage: RailwayProfileStorage;
  exclusive: RailwayProfileLock;
}) {
  if (!okPid(pid)) throw new Error('Invalid railway profile pid');
  if (!cosmetics.length || cosmetics.length > 1024 || !cosmetics.every(validCosmetic))
    throw new Error('Invalid railway cosmetic catalog');
  const catalog = new Set(cosmetics);
  if (catalog.size !== cosmetics.length) throw new Error('Duplicate railway cosmetic');
  const key = `boogle.railway-profile.v0.${pid}`;

  function read(): RailwayProfile {
    const text = storage.getItem(key);
    if (text === null) return { version: 0, claims: [] };
    if (
      text.length > MAX_RAILWAY_PROFILE_BYTES ||
      new TextEncoder().encode(text).byteLength > MAX_RAILWAY_PROFILE_BYTES
    )
      throw new Error('Railway profile exceeds byte budget');
    const value: unknown = JSON.parse(text);
    if (
      !isObject(value) ||
      !exactKeys(value, ['version', 'claims']) ||
      value.version !== 0 ||
      !Array.isArray(value.claims) ||
      value.claims.length > MAX_RAILWAY_CLAIMS
    )
      throw new Error('Invalid railway profile');
    const claims: RailwayClaim[] = [];
    const seen = new Set<string>();
    for (const row of value.claims) {
      if (
        !validEntitlement(row) ||
        !isObject(row) ||
        !exactKeys(row, ['world', 'station', 'completion', 'cosmetic']) ||
        !('cosmetic' in row) ||
        typeof row.cosmetic !== 'string' ||
        !catalog.has(row.cosmetic)
      )
        throw new Error('Invalid railway claim');
      const id = entitlementKey(row);
      if (seen.has(id)) throw new Error('Duplicate railway claim');
      seen.add(id);
      claims.push({ world: row.world, station: row.station, completion: 1, cosmetic: row.cosmetic });
    }
    return { version: 0, claims };
  }

  async function claim(entitlement: RailwayEntitlement, cosmetic: string): Promise<RailwayClaimResult> {
    if (!validEntitlement(entitlement) || !catalog.has(cosmetic)) throw new Error('Invalid railway claim request');
    // Capture validated scalar values before awaiting the lock; the caller cannot mutate the request while waiting.
    const chosen: RailwayClaim = { world: entitlement.world, station: entitlement.station, completion: 1, cosmetic };
    return exclusive(key, () => {
      // Re-read inside the lock. A second tab or an earlier request may already have accepted this entitlement.
      const profile = read();
      const existing = profile.claims.find((row) => entitlementKey(row) === entitlementKey(chosen));
      if (existing) return { status: 'claimed', claim: existing, profile };
      if (profile.claims.length >= MAX_RAILWAY_CLAIMS) throw new Error('Railway profile claim limit reached');
      const next: RailwayProfile = { version: 0, claims: [...profile.claims, chosen] };
      const text = JSON.stringify(next);
      // All serialized strings are bounded ASCII, so characters equal UTF-8 bytes.
      if (text.length > MAX_RAILWAY_PROFILE_BYTES) throw new Error('Railway profile exceeds byte budget');
      storage.setItem(key, text);
      // No accepted in-memory state or success notification exists until the whole claim+cosmetic write succeeds.
      return { status: 'accepted', claim: chosen, profile: next };
    });
  }

  return { key, read, claim };
}

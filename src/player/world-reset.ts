// Local progress belongs to one world; identity and preferences survive a wipe.
import { MAX_RAILWAY_CLAIMS, MAX_RAILWAY_PROFILE_BYTES } from '../railway-profile.ts';

export const WORLD_SEEN_KEY = 'boogle.worldSeen';
type Namespace = { world: string; rail: string };
const PROFILE_PREFIX = 'boogle.railway-profile.v0.';
// The wardrobe's prefix is WARDROBE_PREFIX in src/entities/wardrobe/state.ts.
const ROOM_PREFIXES = ['boogle.railway-seen.v0:', 'boogle.railway-pose.v0:', 'boogle.railway-wardrobe.v0:'];

export function staleKeys(keys: string[], marker: string | null, ns: Namespace): string[] {
  const changed = marker !== null && marker !== ns.world;
  return keys.filter((key) => {
    const prefix = ROOM_PREFIXES.find((p) => key.startsWith(p));
    if (prefix) return !key.slice(prefix.length).split(':')[0]!.startsWith(`${ns.rail}-`);
    return changed && (key.startsWith('boogle.visit.') || key === 'boogle.boogler');
  });
}

// Preserve unreadable profiles so the normal reward reader can report them, rather than hiding a broken save.
export function pruneClaims(text: string, rail: string): string | null | undefined {
  try {
    if (new TextEncoder().encode(text).byteLength > MAX_RAILWAY_PROFILE_BYTES) return;
    const value: unknown = JSON.parse(text);
    if (!record(value) || !exact(value, ['version', 'claims']) || value.version !== 0 || !Array.isArray(value.claims))
      return;
    if (value.claims.length > MAX_RAILWAY_CLAIMS) return;
    const seen = new Set<string>();
    for (const claim of value.claims) {
      if (
        !record(claim) ||
        !exact(claim, ['world', 'station', 'completion', 'cosmetic']) ||
        typeof claim.world !== 'string' ||
        !/^[a-zA-Z0-9:._/-]{1,96}$/.test(claim.world) ||
        (claim.station !== 'T1' && claim.station !== 'T2') ||
        claim.completion !== 1 ||
        typeof claim.cosmetic !== 'string' ||
        !/^[a-zA-Z0-9._-]{1,64}$/.test(claim.cosmetic)
      )
        return;
      const id = `${claim.world}:${claim.station}:${claim.completion}`;
      if (seen.has(id)) return;
      seen.add(id);
    }
    const claims = value.claims.filter((claim: { world: string }) => claim.world.startsWith(`${rail}-`));
    if (!claims.length) return null;
    if (claims.length === value.claims.length) return;
    return JSON.stringify({ version: 0, claims });
  } catch {
    return;
  }
}

const record = (v: unknown): v is Record<string, unknown> => v !== null && typeof v === 'object' && !Array.isArray(v);
const exact = (v: Record<string, unknown>, keys: string[]) =>
  Object.keys(v).length === keys.length && keys.every((key) => Object.hasOwn(v, key));

function storageKeys(storage: Storage): string[] {
  const keys: string[] = [];
  try {
    const length = storage.length;
    for (let i = 0; i < length; i++) {
      try {
        const key = storage.key(i);
        if (key !== null) keys.push(key);
      } catch {
        // Blocked storage must never prevent boot.
      }
    }
  } catch {
    // Even accessing length can be blocked.
  }
  return keys;
}

export function resetForWorld(storage: Storage, ns: Namespace): { removed: string[] } {
  let marker: string | null = null;
  try {
    marker = storage.getItem(WORLD_SEEN_KEY);
  } catch {
    // Without a readable marker, preserve plain progress.
  }
  const removed: string[] = [];
  for (const key of staleKeys(storageKeys(storage), marker, ns)) {
    try {
      storage.removeItem(key);
      removed.push(key);
    } catch {
      // Keep going if one key cannot be removed.
    }
  }
  try {
    storage.setItem(WORLD_SEEN_KEY, ns.world);
  } catch {
    // Storage is optional.
  }
  return { removed };
}

export async function pruneProfiles(storage: Storage, locks: LockManager | undefined, rail: string): Promise<void> {
  if (!locks) return; // Never rewrite a profile without the same cross-tab lock as claims.
  for (const key of storageKeys(storage).filter((key) => key.startsWith(PROFILE_PREFIX))) {
    try {
      await locks.request(key, { mode: 'exclusive' }, () => {
        const text = storage.getItem(key);
        if (text === null) return;
        const next = pruneClaims(text, rail);
        if (next === null) storage.removeItem(key);
        else if (next !== undefined) storage.setItem(key, next);
      });
    } catch {
      // A denied lock or blocked write must not reject boot, nor stop pruning another profile.
    }
  }
}

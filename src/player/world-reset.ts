// Local progress belongs to one world; identity and preferences survive a wipe.
import { MAX_RAILWAY_CLAIMS, MAX_RAILWAY_PROFILE_BYTES } from '../railway-profile.ts';

export const WORLD_SEEN_KEY = 'boogle.worldSeen';
type Namespace = { world: string; rail: string };
const PROFILE_PREFIX = 'boogle.railway-profile.v0.';
// The wardrobe's prefix is WARDROBE_PREFIX in src/entities/wardrobe/state.ts; the finds' is FINDS_PREFIX in
// src/entities/finds/state.ts; the jump-in arrival line's is SEEN in src/features/jump-in.ts.
const ROOM_PREFIXES = [
  'boogle.railway-seen.v0:',
  'boogle.railway-pose.',
  'boogle.railway-wardrobe.v0:',
  'boogle.railway-town.v0:',
  'boogle.railway-finds.v0:',
  'boogle.jump.seen.v1:', // src/features/jump-in.ts: a jump room's arrival line, shown once
  'boogle.room-born.v0:', // roomReborn below: the world this browser last joined in a room
];
const ROOM_BORN = 'boogle.room-born.v0:';
/** sessionStorage, `<room id> <room name>[ <stage>]`: this room's world started over, so the next load starts the
 * player over. The stage is there when the new world is a replacement by that stage (docs/plans/room-fast-forward.md). */
export const ROOM_RESET_KEY = 'boogle.roomReset';
/** How a load arrives (src/player/arrival.ts). `card`: the name-and-colour card shows: nobody is saved on this device,
 * or the world was reset. `fall`: the card's fall plays. A room replaced by a stage (`replacedStage`) comes first for
 * where the player lands: never the fall, always the stage's landing; a saved player skips the card too, and one who
 * had not picked a name yet (replaced while still in the lobby) keeps the card and lands at the stage after it. */
export function arrivalPlan(o: { saved: boolean; worldWasReset: boolean; replacedStage: string }) {
  const card = !o.saved || (o.worldWasReset && !o.replacedStage);
  return { card, fall: card && !o.replacedStage };
}
export type RoomReset = { id: string; name: string; stage: string };
export const roomResetNote = (id: string, name: string, stage = '') => [id, name, ...(stage ? [stage] : [])].join(' ');
export function readRoomReset(text: string | null): RoomReset | null {
  const [id, name, stage = ''] = (text ?? '').split(' ');
  return id && name ? { id, name, stage: /^[a-z0-9-]{1,40}$/.test(stage) ? stage : '' } : null;
}

export function staleKeys(keys: string[], marker: string | null, ns: Namespace): string[] {
  const changed = marker !== null && marker !== ns.world;
  return keys.filter((key) => {
    const prefix = ROOM_PREFIXES.find((p) => key.startsWith(p));
    if (prefix) return !roomKey(key, prefix).startsWith(`${ns.rail}-`);
    return changed && (key.startsWith('boogle.visit.') || key === 'boogle.boogler');
  });
}

const roomKey = (key: string, prefix: string) =>
  key
    .slice(prefix.length)
    .replace(/^v\d+:/, '')
    .split(':')[0]!;

// Preserve unreadable profiles so the normal reward reader can report them, rather than hiding a broken save.
export function pruneClaims(text: string, rail: string, resetRoom?: string): string | null | undefined {
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
    const claims = value.claims.filter(
      (claim: { world: string }) => claim.world.startsWith(`${rail}-`) && claim.world !== resetRoom,
    );
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

/** `newWorld`: this browser last played an older world, so this load starts the game over (docs/decisions.md,
 * 2026-11-09). A browser with no marker yet has never seen a world: it is a newcomer, or not, by its own saves. */
export function resetForWorld(storage: Storage, ns: Namespace): { removed: string[]; newWorld: boolean } {
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
  return { removed, newWorld: marker !== null && marker !== ns.world };
}

/** True when the room's world (the server's `born`, server/src/store.ts) is not the one this browser last joined
 * there: an operator reset or restored it (docs/decisions.md, 2026-11-09). Remembers `born` either way; a room seen
 * for the first time is not a reset. */
export function roomReborn(storage: Storage, id: string, born: string): boolean {
  const last = storage.getItem(ROOM_BORN + id);
  storage.setItem(ROOM_BORN + id, born);
  return last !== null && last !== born;
}

/** Forgets this browser's progress in one room (`id`, with `name` as the URL has it): what a world reset forgets, for
 * that room only, plus The Boogler's memory (global, but he is just another NPC: docs/decisions.md, 2026-11-09).
 * Reward claims go with pruneProfiles(..., id). */
export function resetForRoom(storage: Storage, id: string, name: string): string[] {
  const removed: string[] = [];
  for (const key of storageKeys(storage)) {
    const prefix = ROOM_PREFIXES.find((p) => p !== ROOM_BORN && key.startsWith(p));
    const mine = prefix ? roomKey(key, prefix) === id : key === `boogle.visit.${name}` || key === 'boogle.boogler';
    if (!mine) continue;
    try {
      storage.removeItem(key);
      removed.push(key);
    } catch {
      // Keep going if one key cannot be removed.
    }
  }
  return removed;
}

export async function pruneProfiles(
  storage: Storage,
  locks: LockManager | undefined,
  rail: string,
  resetRoom?: string,
): Promise<void> {
  if (!locks) return; // Never rewrite a profile without the same cross-tab lock as claims.
  for (const key of storageKeys(storage).filter((key) => key.startsWith(PROFILE_PREFIX))) {
    try {
      await locks.request(key, { mode: 'exclusive' }, () => {
        const text = storage.getItem(key);
        if (text === null) return;
        const next = pruneClaims(text, rail, resetRoom);
        if (next === null) storage.removeItem(key);
        else if (next !== undefined) storage.setItem(key, next);
      });
    } catch {
      // A denied lock or blocked write must not reject boot, nor stop pruning another profile.
    }
  }
}

// What you've found on the production railway (docs/plans/place-retirement.md, K1, F1, F2; docs/game-design/place.md,
// "Crystals"): Personal Local, one localStorage store per railway world and player,
// `boogle.railway-finds.v0:<railwayRoomId>:<pid>`, which a world bump prunes (src/player/world-reset.ts). Each player
// keeps their own moment of discovery (DESIGN.md 6; owner question 2, 9 November: personal crystals).
// The store has four fields from the start, so F1 and F2 add to it without a new key or a migration:
//   crystals  K1's crystals, by spot index, in the order found
//   finds     F1's gold finds, by Place's find id. Unused since the owner cut them (9 November); still parsed, so
//             existing saves keep their other fields
//   secrets   F2's secrets, by id
//   hubbed    F2's secrets that went to the finders' bay ("open either box and the other goes")
// Each field is validated on its own: a malformed one starts empty without costing the others. Headless: the view
// draws it and loads in Node (test/entity-state-node.test.ts); only main.ts's glob imports ./index.ts.

/** Where the seven crystals stand, in Place's layout coordinates (the view puts them in the world with `toWorld` and the
 * land's height). On a lookout, through an arch, on a river bank, at the top of the ridge, behind the old kiln, by the old
 * cart, on the far table. Ported from Place's crystals.ts SPOTS (archive/place). */
export const CRYSTAL_SPOTS: readonly (readonly [x: number, z: number])[] = [
  [-111, -126],
  [-142, -66],
  [-62, -68],
  [-24, -186],
  [-3, -166],
  [-66, 155],
  [122, 88],
];
export const CRYSTALS = CRYSTAL_SPOTS.length;

export const FINDS_PREFIX = 'boogle.railway-finds.v0:';
export type FindsSave = { crystals: number[]; finds: number[]; secrets: string[]; hubbed: string[] };
export type FindsEvent = { kind: 'crystal' | 'secret' | 'hub' | 'load'; id: number | string | null };
export type FindsStorage = { read(): string | null; write(text: string): void };

const MAX_TEXT = 4096;
const MAX_FIND_ID = 99;
const MAX_SECRETS = 32;
const SECRET_ID = /^[A-Za-z0-9-]{1,24}$/;

const record = (v: unknown): v is Record<string, unknown> => v !== null && typeof v === 'object' && !Array.isArray(v);
const empty = (): FindsSave => ({ crystals: [], finds: [], secrets: [], hubbed: [] });

/** Distinct values that all pass `ok`, at most `max` of them, in their order; anything else is null. */
function distinct<T>(v: unknown, max: number, ok: (x: unknown) => x is T): T[] | null {
  if (!Array.isArray(v) || v.length > max) return null;
  const out = new Set<T>();
  for (const x of v) {
    if (!ok(x) || out.has(x)) return null;
    out.add(x);
  }
  return [...out];
}
const index =
  (n: number) =>
  (x: unknown): x is number =>
    Number.isInteger(x) && (x as number) >= 0 && (x as number) < n;
const secretId = (x: unknown): x is string => typeof x === 'string' && SECRET_ID.test(x);

/** A save as stored, validated field by field (room-safety: malformed data never throws, it starts empty). */
export function parseFinds(text: string | null): FindsSave {
  if (text === null || text.length > MAX_TEXT) return empty();
  let v: unknown;
  try {
    v = JSON.parse(text);
  } catch {
    return empty();
  }
  if (!record(v)) return empty();
  return {
    crystals: distinct(v.crystals, CRYSTALS, index(CRYSTALS)) ?? [],
    finds: distinct(v.finds, MAX_FIND_ID + 1, index(MAX_FIND_ID + 1)) ?? [],
    secrets: distinct(v.secrets, MAX_SECRETS, secretId) ?? [],
    hubbed: distinct(v.hubbed, MAX_SECRETS, secretId) ?? [],
  };
}

/** One player's finds over a storage. The view reacts through onFinds. */
export function createFinds(storage: FindsStorage) {
  const read = () => {
    try {
      return storage.read();
    } catch {
      return null;
    }
  };
  let save = parseFinds(read());
  const listeners = new Set<(e: FindsEvent) => void>();
  const write = () => {
    try {
      storage.write(JSON.stringify(save));
    } catch {
      // Storage is optional: what you found stays found for this visit.
    }
  };
  const changed = (e: FindsEvent) => {
    for (const fn of listeners) fn(e);
  };
  return {
    /** Found crystals, by spot index, in the order found. */
    crystals: (): readonly number[] => save.crystals,
    hasCrystal: (k: number) => save.crystals.includes(k),
    /** Records crystal k as found and writes the store at once, before its flight and chime (so a reload mid-flight
     * keeps it). False if it isn't a crystal or was already found. */
    takeCrystal(k: number): boolean {
      if (!index(CRYSTALS)(k) || save.crystals.includes(k)) return false;
      save = { ...save, crystals: [...save.crystals, k] };
      write();
      changed({ kind: 'crystal', id: k });
      return true;
    },
    /** Found secrets, by Place's secret id (tech-layout.ts's SECRETS), in the order found. */
    secrets: (): readonly string[] => save.secrets,
    hasSecret: (id: string) => save.secrets.includes(id),
    /** Records secret `id` as found (from its box in the world or its box at the finders' bay: open either and the
     * other goes) and writes the store at once, before its reveal. False if it isn't an id or was already found. */
    takeSecret(id: string): boolean {
      if (!secretId(id) || save.secrets.includes(id) || save.secrets.length >= MAX_SECRETS) return false;
      save = { ...save, secrets: [...save.secrets, id] };
      write();
      changed({ kind: 'secret', id });
      return true;
    },
    /** Secrets whose second box has turned up at the finders' bay. */
    hubbed: (): readonly string[] => save.hubbed,
    isHubbed: (id: string) => save.hubbed.includes(id),
    /** You went on past secret `id` without it: its box turns up at the finders' bay too. Written at once. False if it
     * isn't an id or is already there. */
    hubSecret(id: string): boolean {
      if (!secretId(id) || save.hubbed.includes(id) || save.hubbed.length >= MAX_SECRETS) return false;
      save = { ...save, hubbed: [...save.hubbed, id] };
      write();
      changed({ kind: 'hub', id });
      return true;
    },
    onFinds(fn: (e: FindsEvent) => void) {
      listeners.add(fn);
      return () => void listeners.delete(fn);
    },
    /** Reads the store again (another tab of this player wrote it). */
    reload() {
      save = parseFinds(read());
      changed({ kind: 'load', id: null });
    },
    inspect: () => ({
      crystals: [...save.crystals],
      finds: [...save.finds],
      secrets: [...save.secrets],
      hubbed: [...save.hubbed],
    }),
  };
}
export type FindsApi = ReturnType<typeof createFinds>;

let mine: FindsApi | null = null;
/** The production entry starts it (./index.ts). */
export function startFinds(storage: FindsStorage) {
  mine ??= createFinds(storage);
  return mine;
}
/** This tab's finds, or null off the production railway. */
export const finds = () => mine;
/** What this player has found, plus what the view shows (set by ./index.ts), for debug and evals. */
let shown: (() => FindsViewInspection) | null = null;
export type FindsViewInspection = {
  /** Each crystal: where it stands in the world, and 0 waiting, 1 flying to you, 2 found. */
  spots: { x: number; y: number; z: number; state: 0 | 1 | 2 }[];
  /** How many of the shelf's crystal stubs are lit, and whether the row is on the shelf yet. */
  lit: number;
  onShelf: boolean;
  /** Each secret's two boxes, in the world and at the finders' bay, and whether each is waiting now (a glide-only
   * one's world box waits only once the glider is the room's). */
  boxes: {
    id: string;
    gift: string;
    world: { x: number; y: number; z: number; waiting: boolean };
    bay: { x: number; y: number; z: number; waiting: boolean };
  }[];
  /** The secret whose box is opening now, or null. */
  opening: string | null;
};
export const inspectFinds = () => (mine ? { ...mine.inspect(), ...(shown?.() ?? null) } : null);
/** Lifecycle owner only. */
export function setFindsView(view: (() => FindsViewInspection) | null) {
  shown = view;
}

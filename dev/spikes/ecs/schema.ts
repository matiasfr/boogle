// Shared by every option in the entity-system spike (docs/research/ecs-evaluation.md, 7 November section): the slice's
// declared schema, its rule constants, the hash fold and the op stream. Any option would declare these once; what the
// spike compares is the container under them. Not wired into the game.

// ---------------------------------------------------------------- schema
export type FieldType = 'f64' | 'u8' | 'u16' | 'u32' | 'i32';
export type Fields = Record<string, FieldType>;

// Place's felled trees, rocks and log piles, cut down to what a rule or the view reads.
export const TREE = {
  x: 'f64',
  z: 'f64',
  size: 'f64',
  work: 'u8',
  issued: 'u8',
  ceiling: 'u8',
  fell: 'u8',
  age: 'u32',
} as const;
export const ROCK = { x: 'f64', z: 'f64', r: 'f64', strokes: 'u8', shake: 'u8' } as const;
export const PILE = { i: 'i32', j: 'i32', k: 'u8', n: 'u16', settle: 'u8' } as const;
export type TreeRow = { id: number } & { -readonly [K in keyof typeof TREE]: number };
export type RockRow = { id: number } & { -readonly [K in keyof typeof ROCK]: number };
export type PileRow = { id: number } & { -readonly [K in keyof typeof PILE]: number };

const MAX: Record<FieldType, number> = { f64: 0, u8: 255, u16: 65535, u32: 4294967295, i32: 2147483647 };
/** A loaded value is legal for its type: finite floats that aren't -0, integers in range. */
export function okField(type: FieldType, v: unknown): v is number {
  if (typeof v !== 'number') return false;
  if (type === 'f64') return Number.isFinite(v) && !Object.is(v, -0);
  if (!Number.isInteger(v)) return false;
  return type === 'i32' ? v >= -2147483648 && v <= MAX.i32 : v >= 0 && v <= MAX[type];
}

// ---------------------------------------------------------------- hash
export const FNV_SEED = 2166136261;
export const fold = (h: number, v: number): number => Math.imul(h ^ v, 16777619) >>> 0;
const f64 = new Float64Array(1);
const words = new Uint32Array(f64.buffer);
/** A float by its bits, so peers agree only when the bits do. */
export function foldF64(h: number, v: number): number {
  f64[0] = v;
  return fold(fold(h, words[0]!), words[1]!);
}
export const foldField = (h: number, type: FieldType, v: number): number =>
  type === 'f64' ? foldF64(h, v) : fold(h, v | 0);

// ---------------------------------------------------------------- rules
export const KIND = { tree: 0, rock: 1, pile: 2 } as const;
export const CHOP_WORK = 3;
export const LOGS_PER_CHOP = 3;
export const FELL_WORK = 15;
export const FALL_TICKS = 20; // a felled trunk lies this many sim ticks, then goes
export const ROCK_STROKES = 5;
export const TAKE = 8;
export const PILE_MAX = 65535;
export const cellOf = (v: number): number => Math.floor(v / 2);
export const cellKey = (i: number, j: number, k: number): number => ((i + 4096) * 8192 + (j + 4096)) * 2 + k;

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---------------------------------------------------------------- what each option implements
/** One option's slice: lockstep state, the rules on a fixed clock, a view rebuilt from state. */
export interface Slice {
  readonly name: string;
  // ops, as the authority would stamp them; k picks the k-th live entity in canonical (id) order
  count(kind: number): number;
  idAt(kind: number, k: number): number;
  plantTree(x: number, z: number, size: number): void;
  placeRock(x: number, z: number, r: number): void;
  drop(i: number, j: number, k: number, n: number): void;
  chop(id: number): void;
  strike(id: number): void;
  take(id: number): void;
  /** The fixed-clock system: walks every entity once. */
  system(): void;
  tick: number;
  hash(): number;
  snapshot(): string | Uint8Array;
  load(snap: string | Uint8Array): void;
  /** Ids in the order lockstep code iterates them, every kind. */
  order(): number[];
  /** Ids in the order the container's own query yields them, where that differs (libraries). */
  nativeOrder?(): number[];
  /** Local-only churn in the same container (particles, previews): a different history. */
  localNoise?(n: number): void;
  view: { sync(): void; rebuild(): void };
  /** Frees the container (koota allows 16 worlds per process). */
  dispose?(): void;
}

/** One sim tick of the shared op stream at a target population of n entities. */
/** heat multiplies the work, and so the felling, breaking and replanting: 1 is ~10 spawns+despawns a tick at 3,000. */
export function step(s: Slice, rng: () => number, n: number, heat = 1): void {
  const r = (k: number): number => (rng() * k) | 0;
  const chops = Math.ceil((n * heat) / 150),
    strikes = Math.ceil((n * heat) / 300),
    takes = s.count(KIND.pile) > n * 0.15 ? Math.ceil((n * heat) / 60) : Math.ceil(n / 600); // keeps piles near 15%
  for (let c = 0; c < chops; c++) {
    const k = r(1 << 20);
    const t = s.count(KIND.tree);
    if (t) s.chop(s.idAt(KIND.tree, k % t));
  }
  for (let c = 0; c < strikes; c++) {
    const k = r(1 << 20);
    const t = s.count(KIND.rock);
    if (t) s.strike(s.idAt(KIND.rock, k % t));
  }
  for (let c = 0; c < takes; c++) {
    const k = r(1 << 20);
    const t = s.count(KIND.pile);
    if (t) s.take(s.idAt(KIND.pile, k % t));
  }
  s.system();
  // Planting keeps the population near n: 60% trees, 25% rocks, the rest piles from the work.
  const plant = Math.ceil((n * heat) / 100);
  for (let c = 0; c < plant && s.count(KIND.tree) < n * 0.6; c++)
    s.plantTree(rng() * 400 - 200, rng() * 400 - 200, 0.9 + rng() * 0.3);
  for (let c = 0; c < plant && s.count(KIND.rock) < n * 0.25; c++)
    s.placeRock(rng() * 400 - 200, rng() * 400 - 200, 0.6 + rng() * 0.8);
  s.tick++;
}

export function populate(s: Slice, rng: () => number, n: number): void {
  for (let c = 0; c < n * 0.6; c++) s.plantTree(rng() * 400 - 200, rng() * 400 - 200, 0.9 + rng() * 0.3);
  for (let c = 0; c < n * 0.25; c++) s.placeRock(rng() * 400 - 200, rng() * 400 - 200, 0.6 + rng() * 0.8);
  for (let c = 0; c < n * 0.15; c++)
    s.drop(cellOf(rng() * 400 - 200), cellOf(rng() * 400 - 200), (rng() * 2) | 0, 1 + ((rng() * 40) | 0));
}

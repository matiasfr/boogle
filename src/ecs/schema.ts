// E's component schema (docs/plans/ecs-e.md, section 2): a name and a field -> type table, nothing about storage. It is
// also replication's schema (src/world/replicate.ts): one table per component feeds the codec, the client mirror, the
// save, the hash and a later engine port. Pure; imports nothing from src/.
export type FieldType = 'bool' | 'u8' | 'u16' | 'u32' | 'i32' | 'int' | 'q16' | 'f32' | 'f64' | 'str';
export type FieldValue = number | boolean | string;
export type Spec = Readonly<Record<string, FieldType>>;
type Value<T extends FieldType> = T extends 'bool' ? boolean : T extends 'str' ? string : number;
/** A component's row: one typed value per field. */
export type Row<S extends Spec = Spec> = { -readonly [K in keyof S]: Value<S[K]> };
export type Component<S extends Spec = Spec> = Readonly<{
  kind: string;
  /** A process-wide index (the store's tables and systems' access are arrays indexed by it). Not saved or sent. */
  cid: number;
  fields: S;
  names: readonly (keyof S & string)[];
  /** A field unique per entity, indexed for world.lookup. */
  key: (keyof S & string) | undefined;
  /** Part of a server state's wire (false: this side's own bookkeeping, saved but never sent). */
  replicate: boolean;
  /** Changes are recorded for world.changes (default: replicated components). Untracked writes cost nothing. */
  track: boolean;
  /** Components every entity with this one also has (checked at spawn and load). */
  requires: readonly Component[];
  defaults: Readonly<Row<S>>;
}>;
export type AnyComponent = Component<any>; // oxlint-disable-line typescript/no-explicit-any

export const MAX_STR = 64;
const NAME = /^[a-z][a-zA-Z0-9]{0,23}$/;
const TYPES: ReadonlySet<string> = new Set(['bool', 'u8', 'u16', 'u32', 'i32', 'int', 'q16', 'f32', 'f64', 'str']);
let cids = 0;
const zero = (t: FieldType): FieldValue => (t === 'bool' ? false : t === 'str' ? '' : 0);

export function defineComponent<const S extends Spec>(
  kind: string,
  fields: S,
  opts: {
    key?: keyof S & string;
    replicate?: boolean;
    track?: boolean;
    requires?: readonly Component[];
    defaults?: Partial<Row<S>>;
  } = {},
): Component<S> {
  if (!NAME.test(kind)) throw new Error(`component name ${kind}`);
  const names = Object.keys(fields) as (keyof S & string)[];
  if (!names.length) throw new Error(`component ${kind} has no fields`);
  for (const f of names) if (!NAME.test(f) || !TYPES.has(fields[f]!)) throw new Error(`component field ${kind}.${f}`);
  if (opts.key !== undefined && !names.includes(opts.key)) throw new Error(`component ${kind} key ${opts.key}`);
  if (opts.replicate !== false && opts.track === false) throw new Error(`component ${kind}: replicated means tracked`);
  const defaults = Object.fromEntries(names.map((f) => [f, zero(fields[f]!)])) as Row<S>;
  for (const [f, v] of Object.entries(opts.defaults ?? {}))
    if (!names.includes(f) || !validValue(fields[f]!, v)) throw new Error(`component default ${kind}.${f}`);
  Object.assign(defaults, opts.defaults);
  return Object.freeze({
    kind,
    cid: cids++,
    fields: Object.freeze({ ...fields }),
    names: Object.freeze(names),
    key: opts.key,
    replicate: opts.replicate ?? true,
    track: opts.track ?? opts.replicate ?? true,
    requires: Object.freeze([...(opts.requires ?? [])]),
    defaults: Object.freeze(defaults),
  });
}

/** A value is well-formed for its type. Integers and floats refuse -0, so a value survives JSON unchanged. */
export function validValue(type: FieldType, v: unknown): v is FieldValue {
  if (type === 'bool') return typeof v === 'boolean';
  if (type === 'str') return typeof v === 'string' && v.length <= MAX_STR;
  if (typeof v !== 'number' || Object.is(v, -0)) return false;
  switch (type) {
    case 'u8':
      return Number.isInteger(v) && v >= 0 && v <= 0xff;
    case 'u16':
    case 'q16':
      return Number.isInteger(v) && v >= 0 && v <= 0xffff;
    case 'u32':
      return Number.isInteger(v) && v >= 0 && v <= 0xffffffff;
    case 'i32':
      return Number.isInteger(v) && v >= -0x80000000 && v <= 0x7fffffff;
    case 'int':
      return Number.isSafeInteger(v);
    case 'f32':
    case 'f64':
      return Number.isFinite(v);
  }
}

// ---------------------------------------------------------------- hashing (FNV-1a, 32 bit)
export const FNV = 2166136261;
export const fold = (h: number, v: number) => Math.imul(h ^ v, 16777619);
const f64 = new Float64Array(1);
const words = new Uint32Array(f64.buffer);
export function foldStr(h: number, s: string) {
  h = fold(h, s.length);
  for (let i = 0; i < s.length; i++) h = fold(h, s.charCodeAt(i));
  return h;
}
/** Every number by its float64 bits (exact for integers too), so peers agree only when the bits do. */
export function foldValue(h: number, v: FieldValue) {
  if (typeof v === 'boolean') return fold(h, v ? 1 : 0);
  if (typeof v === 'string') return foldStr(h, v);
  f64[0] = v === 0 ? 0 : v;
  return fold(fold(h, words[0]!), words[1]!);
}

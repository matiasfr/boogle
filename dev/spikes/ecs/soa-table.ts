// Option C's core: the same declared table as Option A, stored bitECS-style as one typed array per field (SoA).
// Rows stay in id order (ids only grow, so spawn appends; removal shifts the tail down with copyWithin, never
// swap-remove). Lookup by id is a binary search over the ids column. Snapshot is the columns' bytes.
import { FNV_SEED, fold, foldField, okField, type FieldType, type Fields } from './schema.ts';

const ARRAY = { f64: Float64Array, u8: Uint8Array, u16: Uint16Array, u32: Uint32Array, i32: Int32Array } as const;
type Col = Float64Array | Uint8Array | Uint16Array | Uint32Array | Int32Array;

export interface SoaTable<F extends Fields> {
  readonly name: string;
  readonly fields: F;
  /** One typed array per field; row k of every column is the same entity. Valid below len. */
  readonly col: { readonly [K in keyof F]: Col };
  readonly ids: Uint32Array;
  readonly len: number;
  /** Row index of id, or -1. */
  find(id: number): number;
  insert(values: { [K in keyof F]: number }): number;
  remove(id: number): void;
  touched(id: number): void;
  serialize(): Uint8Array;
  /** Reads what serialize wrote at offset; returns the offset after it, or -1 if malformed. */
  load(bytes: Uint8Array, offset: number): number;
  hash(h?: number): number;
  drain(): { added: number[]; changed: number[]; removed: number[] };
}

export function defineSoaTable<F extends Fields>(name: string, fields: F, capacity = 16384): SoaTable<F> {
  const keys = Object.keys(fields) as (keyof F & string)[];
  const types = keys.map((k) => fields[k]!) as FieldType[];
  const col = Object.fromEntries(keys.map((k) => [k, new ARRAY[fields[k]!](capacity)])) as Record<keyof F, Col>;
  const cols = keys.map((k) => col[k]);
  const ids = new Uint32Array(capacity);
  let len = 0,
    next = 1;
  let added: number[] = [],
    changed = new Set<number>(),
    removed: number[] = [];
  function find(id: number): number {
    let lo = 0,
      hi = len - 1;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1,
        v = ids[mid]!;
      if (v === id) return mid;
      if (v < id) lo = mid + 1;
      else hi = mid - 1;
    }
    return -1;
  }
  const t: SoaTable<F> = {
    name,
    fields,
    col,
    ids,
    get len() {
      return len;
    },
    find,
    insert(values) {
      if (len === capacity) throw new Error(`${name}: full`);
      const k = len++;
      ids[k] = next++;
      for (let f = 0; f < keys.length; f++) cols[f]![k] = values[keys[f]!];
      added.push(ids[k]!);
      return k;
    },
    remove(id) {
      const k = find(id);
      if (k < 0) return;
      ids.copyWithin(k, k + 1, len);
      for (const c of cols) c.copyWithin(k, k + 1, len);
      len--;
      changed.delete(id);
      removed.push(id);
    },
    touched: (id) => void changed.add(id),
    serialize() {
      const size = 8 + len * 4 + cols.reduce((s, c) => s + len * c.BYTES_PER_ELEMENT, 0);
      const out = new Uint8Array(size);
      const head = new DataView(out.buffer);
      head.setUint32(0, next, true);
      head.setUint32(4, len, true);
      let o = 8;
      for (const c of [ids, ...cols]) {
        const bytes = new Uint8Array(c.buffer, 0, len * c.BYTES_PER_ELEMENT);
        out.set(bytes, o);
        o += bytes.length;
      }
      return out;
    },
    load(bytes, offset) {
      if (bytes.length < offset + 8) return -1;
      const head = new DataView(bytes.buffer, bytes.byteOffset + offset);
      const n = head.getUint32(0, true),
        count = head.getUint32(4, true);
      if (count > capacity) return -1;
      let o = offset + 8;
      const read = (c: Col) => {
        const size = count * c.BYTES_PER_ELEMENT;
        if (o + size > bytes.length) return false;
        new Uint8Array(c.buffer, 0, size).set(bytes.subarray(o, o + size));
        o += size;
        return true;
      };
      for (let k = 0; k < len; k++) removed.push(ids[k]!);
      if (!read(ids) || !cols.every(read)) return -1;
      for (let k = 0; k < count; k++) {
        if (ids[k]! >= n || (k && ids[k]! <= ids[k - 1]!)) return -1;
        for (let f = 0; f < cols.length; f++) if (!okField(types[f]!, cols[f]![k])) return -1;
        added.push(ids[k]!);
      }
      len = count;
      next = n;
      changed.clear();
      return o;
    },
    hash(h = FNV_SEED) {
      h = fold(fold(h, next), len);
      for (let k = 0; k < len; k++) {
        h = fold(h, ids[k]!);
        for (let f = 0; f < cols.length; f++) h = foldField(h, types[f]!, cols[f]![k]!);
      }
      return h;
    },
    drain() {
      const out = { added, changed: [...changed], removed };
      added = [];
      changed = new Set();
      removed = [];
      return out;
    },
  };
  return t;
}

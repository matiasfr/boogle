// Option A's core: defineTable, the stricter GameEntity's lockstep half (ecs-evaluation.md, "Option B" of 6 November).
// Rows are plain objects kept in id order; ids come from the table's own counter, which is lockstep state, so every
// peer stamps the same id. Removal keeps order (splice), never swap-remove. serialize, load and hash all walk the
// declared fields, so they can't drift apart. Views drain what changed.
import { FNV_SEED, fold, foldField, okField, type Fields } from './schema.ts';

export type Row<F extends Fields> = { id: number } & { -readonly [K in keyof F]: number };
/** Saved form: next id, then [id, ...fields in declared order] per row, flat. */
export type TableJson = { next: number; rows: number[] };

export interface Table<F extends Fields> {
  readonly name: string;
  readonly fields: F;
  /** Live rows in id order. Read freely; change fields through set() so views hear of it. */
  readonly rows: readonly Row<F>[];
  get(id: number): Row<F> | undefined;
  insert(values: Omit<Row<F>, 'id'>): Row<F>;
  remove(id: number): void;
  /** Marks a row changed for views. Fields that no view reads may change without it. */
  touched(row: Row<F>): void;
  serialize(): TableJson;
  load(json: unknown): boolean;
  hash(h?: number): number;
  /** For views: what was added, changed or removed since the last drain. */
  drain(): { added: number[]; changed: number[]; removed: number[] };
}

export function defineTable<F extends Fields>(name: string, fields: F): Table<F> {
  const keys = Object.keys(fields) as (keyof F & string)[];
  const rows: Row<F>[] = [];
  const byId = new Map<number, Row<F>>();
  let next = 1;
  let added: number[] = [],
    changed = new Set<number>(),
    removed: number[] = [];
  const indexOf = (id: number): number => {
    let lo = 0,
      hi = rows.length - 1;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1,
        v = rows[mid]!.id;
      if (v === id) return mid;
      if (v < id) lo = mid + 1;
      else hi = mid - 1;
    }
    return -1;
  };
  const table: Table<F> = {
    name,
    fields,
    rows,
    get: (id) => byId.get(id),
    insert(values) {
      const row = { id: next++, ...values } as Row<F>; // ids only grow, so a push keeps id order
      rows.push(row);
      byId.set(row.id, row);
      added.push(row.id);
      return row;
    },
    remove(id) {
      const k = indexOf(id);
      if (k < 0) return;
      rows.splice(k, 1);
      byId.delete(id);
      changed.delete(id);
      removed.push(id);
    },
    touched: (row) => void changed.add(row.id),
    serialize() {
      const flat: number[] = [];
      for (const r of rows) {
        flat.push(r.id);
        for (const k of keys) flat.push(r[k]);
      }
      return { next, rows: flat };
    },
    load(json) {
      const j = json as TableJson | null;
      const width = keys.length + 1;
      if (!j || !Number.isSafeInteger(j.next) || !Array.isArray(j.rows) || j.rows.length % width) return false;
      const fresh: Row<F>[] = [];
      for (let o = 0; o < j.rows.length; o += width) {
        const id = j.rows[o];
        if (!okField('u32', id) || id >= j.next || (fresh.length && id <= fresh[fresh.length - 1]!.id)) return false;
        const row = { id } as Row<F>;
        for (let f = 0; f < keys.length; f++) {
          const v = j.rows[o + 1 + f];
          if (!okField(fields[keys[f]!]!, v)) return false;
          (row as Record<string, number>)[keys[f]!] = v;
        }
        fresh.push(row);
      }
      for (const r of rows) removed.push(r.id);
      rows.length = 0;
      byId.clear();
      changed.clear();
      for (const r of fresh) {
        rows.push(r);
        byId.set(r.id, r);
        added.push(r.id);
      }
      next = j.next;
      return true;
    },
    hash(h = FNV_SEED) {
      h = fold(fold(h, next), rows.length);
      for (const r of rows) {
        h = fold(h, r.id);
        for (const k of keys) h = foldField(h, fields[k]!, r[k]);
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
  return table;
}

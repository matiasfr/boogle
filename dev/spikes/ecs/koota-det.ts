// Option B's determinism wrapper over koota 0.6.6. koota's own queries yield entities in its dense order, which
// depends on history (swap-remove, recycled entity ids). Lockstep code therefore never calls world.query: it walks a
// kind through this wrapper, which keeps the kind's entities in stamped-id order (append on spawn, splice on destroy)
// and does serialize, load and hash over the declared columns. Views and local code may use koota's queries freely.
import { createWorld, getStore, trait, type Entity, type Trait, type World } from 'koota';
import { FNV_SEED, fold, foldField, okField, type FieldType } from './schema.ts';

/** The lockstep id every peer agrees on, stamped from the kind's counter (itself lockstep state). */
export const Sid = trait({ id: 0 });
/** A hashed column: which trait holds it, the field, its type. Order is hash and snapshot order. */
export type Column = readonly [Trait, string, FieldType];

export interface DetKind {
  readonly columns: readonly Column[];
  /** Entities in stamped-id order. Read-only outside this file. */
  readonly ents: readonly Entity[];
  readonly ids: readonly number[];
  get(id: number): Entity | undefined;
  spawn(...traits: Parameters<World['spawn']>): Entity;
  destroy(id: number): void;
  serialize(): { next: number; rows: number[] };
  load(json: unknown): boolean;
  hash(h: number): number;
}

export function createDetWorld() {
  const world = createWorld();
  const sid = () => getStore(world, Sid).id as number[];
  function kind(columns: readonly Column[]): DetKind {
    const ents: Entity[] = [];
    const ids: number[] = [];
    const byId = new Map<number, Entity>();
    let next = 1;
    const store = (c: Column) => (getStore(world, c[0]) as Record<string, number[]>)[c[1]]!;
    const put = (id: number, ...traits: Parameters<World['spawn']>) => {
      const e = world.spawn(Sid({ id }), ...traits);
      ents.push(e);
      ids.push(id);
      byId.set(id, e);
      return e;
    };
    const k: DetKind = {
      columns,
      ents,
      ids,
      get: (id) => byId.get(id),
      spawn: (...traits) => put(next++, ...traits),
      destroy(id) {
        const e = byId.get(id);
        if (!e) return;
        let lo = 0,
          hi = ids.length - 1;
        while (lo < hi) {
          const mid = (lo + hi) >> 1;
          if (ids[mid]! < id) lo = mid + 1;
          else hi = mid;
        }
        ids.splice(lo, 1);
        ents.splice(lo, 1);
        byId.delete(id);
        e.destroy();
      },
      serialize() {
        const cols = columns.map(store);
        const rows: number[] = [];
        for (const e of ents) {
          const eid = e.id();
          rows.push(sid()[eid]!);
          for (const c of cols) rows.push(c[eid]!);
        }
        return { next, rows };
      },
      load(json) {
        const j = json as { next: number; rows: number[] } | null;
        const width = columns.length + 1;
        if (!j || !Number.isSafeInteger(j.next) || !Array.isArray(j.rows) || j.rows.length % width) return false;
        for (let o = 0; o < j.rows.length; o += width) {
          if (!okField('u32', j.rows[o])) return false;
          for (let f = 0; f < columns.length; f++) if (!okField(columns[f]![2], j.rows[o + 1 + f])) return false;
        }
        for (const e of ents) e.destroy();
        ents.length = ids.length = 0;
        byId.clear();
        const traits = [...new Set(columns.map((c) => c[0]))];
        for (let o = 0; o < j.rows.length; o += width) {
          const values = new Map<Trait, Record<string, number>>(traits.map((t) => [t, {}]));
          columns.forEach(([t, f], c) => (values.get(t)![f] = j.rows[o + 1 + c]!));
          put(j.rows[o]!, ...traits.map((t) => t(values.get(t) as never)));
        }
        next = j.next;
        return true;
      },
      hash(h) {
        const cols = columns.map(store);
        h = fold(fold(h, next), ents.length);
        for (const e of ents) {
          const eid = e.id();
          h = fold(h, sid()[eid]!);
          for (let c = 0; c < cols.length; c++) h = foldField(h, columns[c]![2], cols[c]![eid]!);
        }
        return h;
      },
    };
    return k;
  }
  return { world, kind, seed: FNV_SEED };
}

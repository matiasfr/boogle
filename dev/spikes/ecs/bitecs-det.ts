// Option D's determinism wrapper over bitECS 0.4.0. bitECS queries yield entities in its sparse-set dense order,
// which swap-removes and recycles ids (./bitecs-order.ts shows a late joiner iterating differently). Lockstep code
// therefore never calls query(): it walks a kind through this wrapper, which keeps entities in stamped-id order
// (append on spawn, splice on remove) and does serialize, load and hash over the declared columns. bitECS has no
// change queries, so the wrapper also keeps per-kind added / changed / removed lists for views.
import { addComponent, addEntity, createWorld, deleteWorld, removeEntity, type World } from 'bitecs';
import { fold, foldField, okField, type FieldType, type Fields } from './schema.ts';

const ARRAY = { f64: Float64Array, u8: Uint8Array, u16: Uint16Array, u32: Uint32Array, i32: Int32Array } as const;
const MAX_EID = 1 << 16; // bitECS recycles eids, so they stay below the peak live count
type Col = Float64Array | Uint8Array | Uint16Array | Uint32Array | Int32Array;
/** A bitECS SoA component: one typed array per field, indexed by eid. */
export type Component<F extends Fields> = { readonly [K in keyof F]: Col };
export function component<F extends Fields>(fields: F): Component<F> {
  return Object.fromEntries(Object.keys(fields).map((k) => [k, new ARRAY[fields[k]!](MAX_EID)])) as Component<F>;
}
/** A hashed column: the component that holds it, the field, its type. Order is hash and snapshot order. */
export type Column = readonly [Record<string, Col>, string, FieldType];

export interface DetKind {
  /** Eids in stamped-id order; ids[k] is the stamped id of ents[k]. Read-only outside this file. */
  readonly ents: readonly number[];
  readonly ids: readonly number[];
  get(id: number): number | undefined;
  spawn(values: number[]): number; // values in column order
  remove(id: number): void;
  touched(eid: number): void;
  drain(): { added: number[]; changed: number[]; removed: number[] }; // stamped ids
  serialize(): { next: number; rows: number[] };
  load(json: unknown): boolean;
  hash(h: number): number;
}

export function createDetWorld() {
  const world: World = createWorld();
  // Components are plain arrays indexed by eid, so each world needs its own: two peers in one process (tests) would
  // otherwise write the same arrays.
  /** The lockstep id every peer agrees on, from the kind's counter (lockstep state). */
  const Sid = { id: new Uint32Array(MAX_EID) };
  function kind(columns: readonly Column[]): DetKind {
    const comps = [...new Set(columns.map((c) => c[0]))];
    const cols = columns.map(([c, f]) => c[f]!);
    const ents: number[] = [],
      ids: number[] = [];
    const byId = new Map<number, number>();
    let next = 1;
    let added: number[] = [],
      changed = new Set<number>(),
      removed: number[] = [];
    const put = (id: number, values: number[]) => {
      const eid = addEntity(world);
      addComponent(world, eid, Sid);
      for (const c of comps) addComponent(world, eid, c);
      Sid.id[eid] = id;
      for (let f = 0; f < cols.length; f++) cols[f]![eid] = values[f]!;
      ents.push(eid);
      ids.push(id);
      byId.set(id, eid);
      added.push(id);
      return eid;
    };
    const k: DetKind = {
      ents,
      ids,
      get: (id) => byId.get(id),
      spawn: (values) => put(next++, values),
      remove(id) {
        const eid = byId.get(id);
        if (eid === undefined) return;
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
        changed.delete(id);
        removed.push(id);
        removeEntity(world, eid);
      },
      touched: (eid) => void changed.add(Sid.id[eid]!),
      drain() {
        const out = { added, changed: [...changed], removed };
        added = [];
        changed = new Set();
        removed = [];
        return out;
      },
      serialize() {
        const rows: number[] = [];
        for (let k = 0; k < ents.length; k++) {
          rows.push(ids[k]!);
          for (const c of cols) rows.push(c[ents[k]!]!);
        }
        return { next, rows };
      },
      load(json) {
        const j = json as { next: number; rows: number[] } | null;
        const width = cols.length + 1;
        if (!j || !Number.isSafeInteger(j.next) || !Array.isArray(j.rows) || j.rows.length % width) return false;
        for (let o = 0; o < j.rows.length; o += width) {
          if (!okField('u32', j.rows[o])) return false;
          for (let f = 0; f < cols.length; f++) if (!okField(columns[f]![2], j.rows[o + 1 + f])) return false;
        }
        for (const id of [...ids]) k.remove(id);
        for (let o = 0; o < j.rows.length; o += width) put(j.rows[o]!, j.rows.slice(o + 1, o + width));
        next = j.next;
        changed.clear();
        return true;
      },
      hash(h) {
        h = fold(fold(h, next), ents.length);
        for (let e = 0; e < ents.length; e++) {
          const eid = ents[e]!;
          h = fold(h, ids[e]!);
          for (let c = 0; c < cols.length; c++) h = foldField(h, columns[c]![2], cols[c]![eid]!);
        }
        return h;
      },
    };
    return k;
  }
  return { world, kind, Sid, dispose: () => deleteWorld(world) };
}

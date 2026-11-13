// E's world and systems (docs/plans/ecs-e.md, section 2). Data-only component tables keyed by stamped integer ids;
// every walk is in ascending id order; structural changes inside a system wait for its end; systems declare what
// they read and write, and the world refuses anything else. Hash, snapshot, load and clone come from the schemas.
// Pure; imports nothing from src/. Reach it through ./index.ts.
//
// Storage: per component, ascending ids with their rows in a parallel array (walks are array walks) plus a Map for
// lookups by id, a key index, and the set of ids marked changed. Tables and a system's access are arrays indexed by
// the component's cid, so the per-call checks are array reads.
import {
  FNV,
  fold,
  foldStr,
  foldValue,
  validValue,
  type AnyComponent,
  type Component,
  type FieldValue,
  type Row,
  type Spec,
} from './schema.ts';

import { createBitStore, type BitStore, type Rows as StoreRows } from './bitecs.ts';

type AnyRow = Record<string, FieldValue>;
type Table = {
  c: AnyComponent;
  ids: number[];
  list: AnyRow[];
  rows: StoreRows;
  byKey: Map<FieldValue, number> | null;
  /** Ids marked since the last drain (may repeat), and the drain epoch a row's MARK compares with. */
  marked: number[];
  epoch: number;
  /** Rows removed but still in ids/list (as DEAD): compacted in one pass before the next walk. */
  dead: number;
  /** Worlds sharing this table: a clone shares every unmarked table until either side writes it (copy-on-write). */
  refs: number;
  /** After a copy-on-write split, the two tables still share their rows: each copies a row before its first write
   * to it (`mine` lists the rows this table has made its own). */
  borrowed: boolean;
  mine: Set<number>;
};
const DEAD: AnyRow = Object.freeze({});
// A row's last marked epoch, under a symbol: never a field, never in JSON, hash or snapshot (they walk the schema).
const MARK = Symbol('marked');
// Non-enumerable, so a spread or Object.assign of a row never carries it to another row.
function stamp(r: object, epoch: number) {
  if (Object.hasOwn(r, MARK)) (r as { [MARK]: number })[MARK] = epoch;
  else Object.defineProperty(r, MARK, { value: epoch, writable: true });
}
type State = { tables: Table[]; next: number; store?: BitStore };
type Op =
  | { t: 'spawn'; id: number; pairs: readonly (readonly [AnyComponent, object])[] }
  | { t: 'despawn'; id: number }
  | { t: 'add'; id: number; c: AnyComponent; row: object }
  | { t: 'remove'; id: number; c: AnyComponent };

export type RowOf<C> = C extends Component<infer S extends Spec> ? Row<S> : never;
type Rows<T extends readonly AnyComponent[], W extends readonly AnyComponent[]> = {
  [K in keyof T]: T[K] extends W[number] ? RowOf<T[K]> : Readonly<RowOf<T[K]>>;
};
type Pairs<P extends readonly AnyComponent[]> = { [K in keyof P]: readonly [P[K], Partial<RowOf<P[K]>>] };
export type Snapshot = { v: 1; next: number; c: Record<string, FieldValue[][]> };
export type System<I = void, R = void> = Readonly<{
  name: string;
  reads: readonly AnyComponent[];
  writes: readonly AnyComponent[];
  /** By cid: 1 read, 2 write. */
  access: readonly number[];
  phase: string;
  order: number;
  fn: (w: World, input: I) => R;
}>;
type AnySystem = System<never, unknown>;
export interface World {
  readonly components: readonly AnyComponent[];
  get<C extends AnyComponent>(c: C, id: number): Readonly<RowOf<C>> | undefined;
  /** The writable row; marks (c, id) changed. */
  mut<C extends AnyComponent>(c: C, id: number): RowOf<C> | undefined;
  has(c: AnyComponent, id: number): boolean;
  /** The rows of every entity with all of cs (up to four), in ascending id order: read-only, except those of the
   * components in `writes`, which are writable and each marked changed as it is visited (for a system that changes
   * most of them, as Bevy's Query<&mut T> does; otherwise mut() the few that change). */
  each<const T extends readonly AnyComponent[], const W extends readonly AnyComponent[] = []>(
    cs: T,
    fn: (id: number, ...rows: Rows<T, W>) => void,
    writes?: W,
  ): void;
  /** Ascending ids of c (live: do not hold it across structural changes). */
  ids(c: AnyComponent): readonly number[];
  count(c: AnyComponent): number;
  /** The one entity with c. */
  single(c: AnyComponent): number;
  /** The entity whose key field equals value. Key fields never change after spawn. */
  lookup(c: AnyComponent, value: FieldValue): number | undefined;
  /** A new entity; inside a system it appears at the system's end (its id is known at once). */
  spawn<const P extends readonly AnyComponent[]>(...pairs: Pairs<P>): number;
  despawn(id: number): void;
  add<C extends AnyComponent>(id: number, c: C, row: Partial<RowOf<C>>): void;
  remove(id: number, c: AnyComponent): void;
  /** The next spawn takes this id (a replica's id from its server, or a predicted entity's temporary one); the
   * counter moves past it if it was behind, so later stamps never collide with it. */
  reserve(id: number): void;
  nextId(): number;
  /** Run one system now: access is checked, structure is applied at its end, the audit runs in tests. */
  run<I, R>(sys: System<I, R>, input: I): R;
  /** Drain the ids of c marked changed (mut, spawn, add, remove, despawn) since the last drain, ascending. */
  changes(c: AnyComponent): number[];
  hash(): number;
  /** JSON-safe columns: ids as deltas, then one array per field in schema order; booleans as 0/1. */
  snapshot(): Snapshot;
  /** Replace everything with a snapshot, all or nothing: every value, id, key and required component is checked,
   * then check(world) (the domain's invariants) on the loaded copy, before the live state is touched. */
  load(json: unknown, check?: (w: World) => void): void;
  /** An independent copy (the predictor's scratch state). */
  clone(): World;
  inspect(): { next: number; counts: Record<string, number> };
}

export function defineSystem<I = void, R = void>(
  name: string,
  spec: { reads?: readonly AnyComponent[]; writes?: readonly AnyComponent[]; phase: string; order: number },
  fn: (w: World, input: I) => R,
): System<I, R> {
  const access: number[] = [];
  for (const c of spec.reads ?? []) access[c.cid] = 1;
  for (const c of spec.writes ?? []) access[c.cid] = 2;
  const sys = {
    name,
    reads: spec.reads ?? [],
    writes: spec.writes ?? [],
    access,
    phase: spec.phase,
    order: spec.order,
  };
  return Object.freeze({ ...sys, fn });
}
/** A fixed set of systems: run(w, phase, input) runs that phase's systems by (order, name). Orders are unique. */
export function createSchedule(systems: readonly AnySystem[]) {
  const seen = new Set<string>();
  for (const s of systems) {
    const key = `${s.phase}/${s.order}`;
    if (seen.has(s.name) || seen.has(key)) throw new Error(`schedule: ${s.name} (${key}) taken`);
    seen.add(s.name).add(key);
  }
  const sorted = [...systems].sort((a, b) => a.order - b.order || (a.name < b.name ? -1 : 1));
  return {
    run<I>(w: World, phase: string, input: I) {
      for (const s of sorted) if (s.phase === phase) w.run(s as System<I, unknown>, input);
    },
  };
}

const empty = (c: AnyComponent, store?: BitStore): Table => ({
  c,
  ids: [],
  list: [],
  rows: store ? store.table(c) : new Map(),
  byKey: c.key ? new Map() : null,
  marked: [],
  epoch: 0,
  dead: 0,
  refs: 1,
  borrowed: false,
  mine: new Set(),
});
// Removal leaves a hole; the next walk closes every hole in one pass (one O(n) pass per walk after removals, not a
// splice of two arrays per removal).
function pack(t: Table) {
  if (!t.dead) return t;
  let j = 0;
  for (let i = 0; i < t.ids.length; i++)
    if (t.list[i] !== DEAD) {
      t.ids[j] = t.ids[i]!;
      t.list[j++] = t.list[i]!;
    }
  t.ids.length = t.list.length = j;
  t.dead = 0;
  return t;
}
function at(ids: number[], id: number) {
  let lo = 0,
    hi = ids.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (ids[mid]! < id) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}
function fresh(components: readonly AnyComponent[], bitecs = false): State {
  const store = bitecs ? createBitStore(components) : undefined;
  const tables: Table[] = [];
  for (const c of components) tables[c.cid] = empty(c, store);
  return { tables, next: 1, store };
}
function copyTable(t: Table, store?: BitStore): Table {
  pack(t);
  const n = empty(t.c, store);
  n.ids = [...t.ids];
  for (let i = 0; i < t.ids.length; i++) {
    const r = { ...t.list[i]! };
    n.list.push(r);
    n.rows.set(t.ids[i]!, r);
  }
  if (t.byKey) n.byKey = new Map(t.byKey);
  n.epoch = t.epoch + 1; // copied stamps are all older: the copy marks afresh
  return n;
}
/** A table's own arrays and maps over the same rows; both sides then copy a row before writing it. */
function split(t: Table): Table {
  pack(t);
  const n = empty(t.c);
  n.ids = t.ids.slice();
  n.list = t.list.slice();
  n.rows = new Map(t.rows);
  if (t.byKey) n.byKey = new Map(t.byKey);
  n.epoch = t.epoch + 1;
  n.borrowed = t.borrowed = true;
  t.mine = new Set(); // rows it had made its own are shared again
  return n;
}
// A clone shares each table that has nothing marked (its marks would belong to both) and copies the rest.
function copy(st: State, components: readonly AnyComponent[]): State {
  const out: State = { tables: [], next: st.next, store: st.store ? createBitStore(components) : undefined };
  for (const c of components) {
    const t = st.tables[c.cid]!;
    if (st.store || t.marked.length || t.dead) out.tables[c.cid] = copyTable(t, out.store);
    else {
      t.refs++;
      out.tables[c.cid] = t;
    }
  }
  return out;
}

export function createWorld(
  components: readonly AnyComponent[],
  opts: { audit?: boolean; store?: 'inhouse' | 'bitecs'; queryOrder?: 'canonical' | 'native' } = {},
): World {
  // Explicit options win over the Node or Vite experiment switch. Unset builds keep the old store.
  const env = typeof process === 'undefined' ? undefined : process.env;
  const bitecs = (opts.store ?? env?.BOOGLE_ECS_STORE ?? import.meta.env?.VITE_ECS_STORE) === 'bitecs';
  const native = bitecs && (opts.queryOrder ?? env?.BOOGLE_ECS_ORDER ?? import.meta.env?.VITE_ECS_ORDER) === 'native';
  opts = { ...opts, store: bitecs ? 'bitecs' : 'inhouse', queryOrder: native ? 'native' : 'canonical' };
  const kinds = new Set<string>();
  for (const c of components) {
    if (kinds.has(c.kind)) throw new Error(`world: two components named ${c.kind}`);
    kinds.add(c.kind);
    for (const r of c.requires) if (!components.includes(r)) throw new Error(`world: ${c.kind} requires ${r.kind}`);
  }
  const byKind = [...components].sort((a, b) => (a.kind < b.kind ? -1 : 1));
  let st = fresh(components, bitecs);
  let sys: AnySystem | null = null;
  const ops: Op[] = [];
  let marked: Set<string> | null = null; // the audit: what this system run marked
  let iterating = 0;
  let reserved: number | null = null;

  function table(c: AnyComponent, need: number) {
    const t = st.tables[c.cid];
    if (!t || t.c !== c) throw new Error(`world: ${c.kind} is not a component of this world`);
    if (sys && (sys.access[c.cid] ?? 0) < need)
      throw new Error(`system ${sys.name} ${need > 1 ? 'writes' : 'reads'} ${c.kind} without declaring it`);
    return need > 1 ? own(c) : t;
  }
  /** This world's own copy of c's table, made on its first write while shared with a clone or a source. */
  function own(c: AnyComponent) {
    let t = st.tables[c.cid]!;
    if (t.refs > 1) {
      t.refs--;
      t = st.tables[c.cid] = split(t);
    }
    return t;
  }
  /** The row this table may write (its own copy, if the row is still shared after a split), marked changed. */
  function write(t: Table, id: number, row: AnyRow) {
    if (t.borrowed && !t.mine.has(id)) {
      row = { ...row };
      t.rows.set(id, row);
      t.list[at(t.ids, id)] = row;
      t.mine.add(id);
    }
    mark(t, id, row);
    return row;
  }
  function mark(t: Table, id: number, row?: AnyRow) {
    marked?.add(`${t.c.kind}:${id}`);
    if (!t.c.track) return;
    if (row) {
      const r = row as AnyRow & { [MARK]?: number };
      if (r[MARK] === t.epoch) return;
      stamp(r, t.epoch);
    }
    t.marked.push(id);
  }
  const bad = (c: AnyComponent, id: number, f: string) => new Error(`world: ${c.kind} ${id} field ${f} off schema`);
  function insert(t: Table, id: number, given: object) {
    if (t.rows.has(id)) throw new Error(`world: ${t.c.kind} ${id} exists`);
    for (const k in given) if (!(k in t.c.fields)) throw new Error(`world: ${t.c.kind} has no field ${k}`);
    pack(t);
    const row = { ...t.c.defaults, ...given } as AnyRow;
    if (opts.audit) for (const f of t.c.names) if (!validValue(t.c.fields[f], row[f])) throw bad(t.c, id, f);
    if (t.byKey) {
      const key = row[t.c.key!]!;
      if (t.byKey.has(key)) throw new Error(`world: ${t.c.kind} key ${key} taken`);
      t.byKey.set(key, id);
    }
    if (!t.ids.length || t.ids[t.ids.length - 1]! < id) {
      t.ids.push(id);
      t.list.push(row);
    } else {
      const k = at(t.ids, id);
      t.ids.splice(k, 0, id);
      t.list.splice(k, 0, row);
    }
    t.rows.set(id, row);
    if (t.borrowed) t.mine.add(id);
    if (t.c.track) stamp(row, t.epoch);
    mark(t, id);
  }
  function drop(t: Table, id: number) {
    const row = t.rows.get(id);
    if (!row) return;
    t.list[at(t.ids, id)] = DEAD;
    t.dead++;
    t.rows.delete(id);
    t.byKey?.delete(row[t.c.key!]!);
    mark(t, id);
  }
  function complete(id: number) {
    for (const c of components)
      if (st.tables[c.cid]!.rows.has(id))
        for (const r of c.requires)
          if (!st.tables[r.cid]!.rows.has(id)) throw new Error(`world: ${c.kind} ${id} requires ${r.kind}`);
  }
  function apply(op: Op) {
    if (op.t === 'spawn') {
      for (const [c, row] of op.pairs) insert(own(c), op.id, row);
      complete(op.id);
    } else if (op.t === 'despawn') {
      for (const c of components) if (st.tables[c.cid]!.rows.has(op.id)) drop(own(c), op.id);
    } else if (op.t === 'add') {
      insert(own(op.c), op.id, op.row);
      complete(op.id);
    } else {
      if (st.tables[op.c.cid]!.rows.has(op.id)) drop(own(op.c), op.id);
      complete(op.id);
    }
  }
  function structural(op: Op) {
    if (sys) return void ops.push(op);
    if (iterating) throw new Error('world: a structural change while iterating outside a system');
    apply(op);
  }
  // Every row as text, for the audit: a row that changed without mut() is a write through a read-only row.
  function rowsText() {
    const out = new Map<AnyComponent, Map<number, string>>();
    for (const c of components) {
      const m = new Map<number, string>();
      for (const [id, r] of st.tables[c.cid]!.rows) m.set(id, JSON.stringify(c.names.map((f) => r[f])));
      out.set(c, m);
    }
    return out;
  }
  function audit(name: string, before: Map<AnyComponent, Map<number, string>>, seen: Set<string>) {
    for (const [c, rows] of rowsText())
      for (const [id, text] of rows) {
        const was = before.get(c)!.get(id);
        if (was === undefined || was === text) continue;
        if (!seen.has(`${c.kind}:${id}`))
          throw new Error(`audit: system ${name} changed ${c.kind} ${id} without mut()`);
        const k = c.key ? c.names.indexOf(c.key) : -1;
        if (k >= 0 && JSON.parse(was)[k] !== JSON.parse(text)[k])
          throw new Error(`audit: system ${name} changed the key of ${c.kind} ${id}`);
      }
  }

  const world: World = {
    components,
    get: <C extends AnyComponent>(c: C, id: number) => table(c, 1).rows.get(id) as RowOf<C> | undefined,
    mut<C extends AnyComponent>(c: C, id: number) {
      const t = table(c, 2);
      const row = t.rows.get(id);
      return (row && write(t, id, row)) as RowOf<C> | undefined;
    },
    has: (c, id) => table(c, 1).rows.has(id),
    each(cs, fn, writes) {
      if (cs.length > 4) throw new Error('world: each takes up to four components');
      const ts = cs.map((c) => pack(table(c, writes?.includes(c) ? 2 : 1)));
      if (native) {
        iterating++;
        try {
          for (const id of st.store!.query(cs)) {
            const rows = ts.map((t) => {
              const row = t.rows.get(id)!;
              return writes?.includes(t.c) ? write(t, id, row) : row;
            });
            (fn as (id: number, ...rows: AnyRow[]) => void)(id, ...rows);
          }
        } finally {
          iterating--;
        }
        return;
      }
      let small = ts[0]!;
      for (const t of ts) if (t.ids.length < small.ids.length) small = t;
      const call = fn as (id: number, ...rows: AnyRow[]) => void;
      const { ids, list } = small;
      const [a, b, c, d] = ts;
      const w = writes?.length ? ts.map((t) => writes.includes(t.c)) : null;
      iterating++;
      try {
        if (!b) {
          for (let i = 0; i < ids.length; i++) call(ids[i]!, w?.[0] ? write(a!, ids[i]!, list[i]!) : list[i]!);
        } else if (!c) {
          const other = a === small ? b : a!;
          for (let i = 0; i < ids.length; i++) {
            const id = ids[i]!;
            const ro = other.rows.get(id);
            if (!ro) continue;
            let ra = a === small ? list[i]! : ro,
              rb = a === small ? ro : list[i]!;
            if (w?.[0]) ra = write(a!, id, ra);
            if (w?.[1]) rb = write(b, id, rb);
            call(id, ra, rb);
          }
        } else
          for (let i = 0; i < ids.length; i++) {
            const id = ids[i]!;
            let ra = a === small ? list[i] : a!.rows.get(id);
            let rb = b === small ? list[i] : b.rows.get(id);
            let rc = c === small ? list[i] : c.rows.get(id);
            let rd = d && (d === small ? list[i] : d.rows.get(id));
            if (!ra || !rb || !rc || (d && !rd)) continue;
            if (w) {
              if (w[0]) ra = write(a!, id, ra);
              if (w[1]) rb = write(b, id, rb);
              if (w[2]) rc = write(c, id, rc);
              if (w[3]) rd = write(d!, id, rd!);
            }
            call(id, ra, rb, rc, rd!);
          }
      } finally {
        iterating--;
      }
    },
    ids(c) {
      const t = table(c, 1);
      return native ? st.store!.query([c]) : pack(t).ids;
    },
    count: (c) => table(c, 1).rows.size,
    single(c) {
      const t = pack(table(c, 1));
      if (t.ids.length !== 1) throw new Error(`world: ${t.ids.length} entities with ${c.kind}, expected one`);
      return t.ids[0]!;
    },
    lookup(c, value) {
      const t = table(c, 1);
      if (!t.byKey) throw new Error(`world: ${c.kind} has no key`);
      return t.byKey.get(value);
    },
    spawn(...pairs) {
      for (const [c] of pairs) table(c, 2);
      const id = reserved ?? st.next++;
      if (reserved !== null && reserved >= st.next) st.next = reserved + 1;
      reserved = null;
      structural({ t: 'spawn', id, pairs });
      return id;
    },
    despawn(id) {
      for (const c of components) if (st.tables[c.cid]!.rows.has(id)) table(c, 2);
      structural({ t: 'despawn', id });
    },
    add(id, c, row) {
      table(c, 2);
      structural({ t: 'add', id, c, row });
    },
    remove(id, c) {
      table(c, 2);
      structural({ t: 'remove', id, c });
    },
    reserve(id) {
      if (!Number.isSafeInteger(id)) throw new Error('world: reserve');
      for (const c of components) if (st.tables[c.cid]!.rows.has(id)) throw new Error(`world: id ${id} in use`);
      reserved = id;
    },
    nextId: () => st.next,
    run<I, R>(s: System<I, R>, input: I): R {
      if (sys) throw new Error(`system ${s.name} run inside ${sys.name}`);
      const before = opts.audit ? rowsText() : null;
      const seen = (marked = before && new Set());
      sys = s as unknown as AnySystem;
      let result: R;
      try {
        result = s.fn(world, input);
      } catch (e) {
        ops.length = 0; // a system that throws changes no structure
        throw e;
      } finally {
        sys = null;
        marked = null;
      }
      if (before) audit(s.name, before, seen!);
      for (const op of ops.splice(0)) apply(op);
      return result;
    },
    changes(c) {
      const t = table(c, 1);
      if (!c.track) throw new Error(`world: ${c.kind} is not tracked`);
      const out = t.marked.sort((x, y) => x - y).filter((id, k, a) => !k || a[k - 1] !== id);
      t.marked = [];
      t.epoch++;
      return out;
    },
    hash() {
      let h = fold(FNV, st.next);
      for (const c of byKind) {
        const t = pack(st.tables[c.cid]!);
        h = fold(foldStr(h, c.kind), t.ids.length);
        for (let i = 0; i < t.ids.length; i++) {
          h = foldValue(h, t.ids[i]!);
          const r = t.list[i]!;
          for (const f of c.names) h = foldValue(h, r[f]!);
        }
      }
      return h >>> 0;
    },
    snapshot() {
      const out: Record<string, FieldValue[][]> = {};
      for (const c of byKind) {
        const t = pack(st.tables[c.cid]!);
        const cols: FieldValue[][] = [t.ids.map((id, k) => (k ? id - t.ids[k - 1]! : id))];
        for (const f of c.names) {
          const type = c.fields[f];
          cols.push(
            t.list.map((r, k) => {
              const v = r[f]!;
              if (!validValue(type, v)) throw bad(c, t.ids[k]!, f);
              return type === 'bool' ? (v ? 1 : 0) : v;
            }),
          );
        }
        out[c.kind] = cols;
      }
      return { v: 1, next: st.next, c: out };
    },
    load(json, check) {
      const next = parse(json);
      if (check) {
        const temp = createWorld(components, opts) as World & { adopt(s: State): void };
        temp.adopt(next);
        check(temp);
      }
      st = next;
    },
    clone() {
      const w = createWorld(components, opts) as World & { adopt(s: State): void };
      w.adopt(copy(st, components));
      return w;
    },
    inspect: () => ({
      next: st.next,
      counts: Object.fromEntries(byKind.map((c) => [c.kind, st.tables[c.cid]!.rows.size])),
    }),
  };
  // Internal (load and clone): take over a parsed or copied state.
  Object.defineProperty(world, 'adopt', { value: (s: State) => void (st = s) });

  function parse(json: unknown): State {
    const j = json as Snapshot | null;
    if (!j || typeof j !== 'object' || j.v !== 1 || !Number.isSafeInteger(j.next) || j.next < 1)
      throw new Error('load: header');
    if (!j.c || typeof j.c !== 'object' || Object.keys(j.c).sort().join() !== [...kinds].sort().join())
      throw new Error('load: components');
    const next = fresh(components, bitecs);
    next.next = j.next;
    for (const c of components) {
      const cols = j.c[c.kind];
      if (!Array.isArray(cols) || cols.length !== c.names.length + 1 || !cols.every(Array.isArray))
        throw new Error(`load: ${c.kind} columns`);
      const n = cols[0]!.length;
      if (cols.some((col) => col.length !== n)) throw new Error(`load: ${c.kind} column lengths`);
      const t = next.tables[c.cid]!;
      let id = 0;
      for (let k = 0; k < n; k++) {
        const d = cols[0]![k];
        if (!Number.isSafeInteger(d) || (d as number) < 1) throw new Error(`load: ${c.kind} ids`);
        id += d as number;
        if (id >= j.next) throw new Error(`load: ${c.kind} id ${id} past next`);
        const row: AnyRow = {};
        for (let i = 0; i < c.names.length; i++) {
          const f = c.names[i]!,
            type = c.fields[f];
          let v = cols[i + 1]![k];
          if (type === 'bool') v = v === 1 ? true : v === 0 ? false : v;
          if (!validValue(type, v)) throw new Error(`load: ${c.kind} ${id} ${f}`);
          row[f] = v;
        }
        if (t.byKey) {
          const key = row[c.key!]!;
          if (t.byKey.has(key)) throw new Error(`load: ${c.kind} key ${key} twice`);
          t.byKey.set(key, id);
        }
        t.ids.push(id);
        t.list.push(row);
        t.rows.set(id, row);
      }
    }
    for (const c of components)
      for (const id of next.tables[c.cid]!.ids)
        for (const r of c.requires)
          if (!next.tables[r.cid]!.rows.has(id)) throw new Error(`load: ${c.kind} ${id} requires ${r.kind}`);
    return next;
  }
  return world;
}

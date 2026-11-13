// Replication core, server side (docs/plans/replication.md, "Change tracking", "Send rate", "Reliability",
// "Relevancy", "Late join"). Headless and pure: the world host owns the step and the sockets, this owns what changed
// and who has seen it. Not yet used by any state (R0).
//
//   const rep = createReplicator()
//   rep.define({ schema, ids, project, cell })   a projection: rules state -> (kind, id) -> fields, and its cell.
//                                                project(id) returns null when the entity no longer exists
//   rep.touch(kind, id)                          an action or rule touched this entity this step
//   rep.touchAll(kind)                           fallback for a rule that cannot name what it touched
//   rep.commit(step)                             re-project only what was touched; stamp each changed field with step.
//                                                Once per step, before that step's flush: a flush marks everything up
//                                                to its step as sent, so a later commit at the same step would be lost
//   rep.addClient(cid, cells | 'all')            late join: every subscribed cell starts at change tick -1 (whole)
//   rep.subscribe(cid, cells | 'all')            cells entered start at -1; cells left send despawns for what it saw
//   rep.removeClient(cid)
//   rep.ack(cid, epoch, request) / reject(cid, epoch, request, reason) / remap(cid, temp, id)
//   rep.accepted(cid, epoch, request, n)         an accepted action and what it moved, for its actor's prediction (ok)
//   rep.resync(cid)                              the client's mirror diverged: whole state again (its ack is kept,
//                                                its queued events dropped: the whole state already shows them)
//   rep.emit(event, except?)                     a one-off event to every client (but `except`, the actor of a
//                                                predicted action) on its next send (effects of an accepted action); a
//                                                client backed up past MAX_EVENTS drops the oldest
//   rep.flush(step, send, ready?)                end of step: one packet set per client whose cells changed since its
//                                                change tick (or with an ack due). A client whose socket is backed up
//                                                (ready false) is skipped; its next send carries the latest values, so
//                                                backlog coalesces. TCP is ordered and reliable, so no acked baselines.
//
// Per client per cell the server keeps one change tick T ("sent everything up to step T"). Per cell it keeps an
// append-only change log of (step, entity), shared by every client in the cell and compacted when it grows.
import {
  GLOBAL_CELL,
  HASH_STEPS,
  MAX_PACKET_CHARS,
  hashComponents,
  entityKey,
  validFields,
  type ActionId,
  type Change,
  type Despawn,
  type EntityId,
  type Fields,
  type Schema,
  type ServerPacket,
} from './replicate.ts';

export type Projection = {
  schema: Schema;
  ids(): Iterable<EntityId>;
  project(id: EntityId): Fields | null;
  cell(id: EntityId, fields: Fields): string;
};
type Entry = {
  kind: string;
  id: EntityId;
  key: string;
  cell: string;
  values: Fields | null; // null: despawned (a tombstone until every subscriber has seen it)
  born: number;
  changed: number;
  fieldSteps: Record<string, number>;
};
type Cell = { key: string; entries: Map<string, Entry>; log: { step: number; key: string }[]; last: number };
type Client = {
  all: boolean;
  cells: Map<string, number>; // cell -> change tick T
  ack: ActionId | null;
  ackDue: boolean;
  rej: [number, number, string][];
  ok: [number, number, number][];
  ids: [string, EntityId][];
  drops: Despawn[];
  ev: Fields[];
  fresh: boolean; // joined, whole state not yet sent: the next send ends with w: 1
  hashAt: number; // next common server-step boundary due a hash (subscribed to everything only)
};
/** Refusals and acceptances held for one backed-up client; older ones are dropped (the ack still settles them; a
 * client has at most PREDICTION_WINDOW actions out, so only a long backlog of its own could lose any). */
export const MAX_REJECTS = 256;
/** Events held for one backed-up client; older ones are dropped (effects only, the state still arrives whole). */
export const MAX_EVENTS = 256;
export type FlushStats = { clients: number; packets: number; chars: number; skipped: number };

export function createReplicator() {
  const projections = new Map<string, Projection>();
  const cells = new Map<string, Cell>();
  const live = new Map<string, Entry>(); // entity key -> its current (non-tombstone) entry
  const touched = new Map<string, [string, EntityId]>();
  const clients = new Map<string, Client>();
  const stats = { projected: 0, changed: 0, spawned: 0, despawned: 0, compactions: 0 };

  const cellAt = (key: string) => {
    let c = cells.get(key);
    if (!c) cells.set(key, (c = { key, entries: new Map(), log: [], last: -1 }));
    return c;
  };
  function record(c: Cell, entry: Entry, step: number) {
    c.log.push({ step, key: entry.key });
    if (step > c.last) c.last = step;
    if (c.log.length > 2 * c.entries.size + 64) compact(c);
  }
  // Drop tombstones every subscriber has passed, and rewrite the log as one row per entry in change order.
  function compact(c: Cell) {
    stats.compactions++;
    let minT = Infinity;
    for (const cl of clients.values()) {
      const t = cl.cells.get(c.key);
      if (t !== undefined) minT = Math.min(minT, t);
      else if (cl.all) minT = -1;
    }
    for (const [k, e] of c.entries) if (!e.values && e.changed <= minT) c.entries.delete(k);
    c.log = [...c.entries.values()].sort((a, b) => a.changed - b.changed).map((e) => ({ step: e.changed, key: e.key }));
  }
  function spawn(kind: string, id: EntityId, key: string, cell: string, values: Fields, step: number) {
    const fieldSteps: Record<string, number> = {};
    for (const f in values) fieldSteps[f] = step;
    const entry: Entry = { kind, id, key, cell, values: { ...values }, born: step, changed: step, fieldSteps };
    const c = cellAt(cell);
    c.entries.set(key, entry);
    live.set(key, entry);
    stats.spawned++;
    record(c, entry, step);
  }
  function despawn(entry: Entry, step: number) {
    entry.values = null;
    entry.changed = step;
    live.delete(entry.key);
    stats.despawned++;
    record(cellAt(entry.cell), entry, step);
  }

  function commit(step: number) {
    let changed = 0;
    for (const [key, [kind, id]] of touched) {
      const proj = projections.get(kind)!;
      const values = proj.project(id);
      stats.projected++;
      const old = live.get(key);
      if (!values) {
        if (old) {
          despawn(old, step);
          changed++;
        }
        continue;
      }
      if (!validFields(proj.schema, values, false)) throw new Error(`projection ${kind} ${id}: fields off schema`);
      const cell = proj.cell(id, values);
      if (!old || old.cell !== cell) {
        if (old) despawn(old, step); // moved cell: a tombstone where it was, a whole entity where it is
        spawn(kind, id, key, cell, values, step);
        changed++;
        continue;
      }
      let any = false;
      for (const f of proj.schema.names)
        if (values[f] !== old.values![f]) {
          old.values![f] = values[f]!;
          old.fieldSteps[f] = step;
          any = true;
        }
      if (any) {
        old.changed = step;
        record(cellAt(cell), old, step);
        changed++;
      }
    }
    touched.clear();
    stats.changed += changed;
    return changed;
  }

  // What client cl has not seen in cell c since its change tick t.
  function since(c: Cell, t: number, x: Despawn[], out: Change[]) {
    if (c.last <= t) return;
    let lo = 0,
      hi = c.log.length;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (c.log[mid]!.step > t) hi = mid;
      else lo = mid + 1;
    }
    const seen = new Set<string>();
    for (let k = lo; k < c.log.length; k++) {
      const key = c.log[k]!.key;
      if (seen.has(key)) continue;
      seen.add(key);
      const e = c.entries.get(key);
      if (!e || e.changed <= t) continue;
      if (!e.values) {
        if (e.born <= t) x.push([e.kind, e.id]);
      } else if (e.born > t) out.push([e.kind, e.id, { ...e.values }]);
      else {
        const fields: Fields = {};
        for (const f in e.fieldSteps) if (e.fieldSteps[f]! > t) fields[f] = e.values[f]!;
        out.push([e.kind, e.id, fields]);
      }
    }
  }
  function subscribedCells(cl: Client) {
    if (cl.all) for (const key of cells.keys()) if (!cl.cells.has(key)) cl.cells.set(key, -1);
    return cl.cells;
  }
  // The packets client cl needs now (chunked under MAX_PACKET_CHARS), or [] for none. Marks them sent.
  let hashStep = -1,
    hashValue = 0;
  // The hash of everything committed, once per step at most, shared by every client due one.
  function hashNow(step: number) {
    if (hashStep !== step) {
      hashStep = step;
      hashValue = hashComponents(
        [...live.values()].map((e) => [e.kind, e.id, e.values!] as [string, EntityId, Fields]),
        new Map([...projections.values()].map((p) => [p.schema.kind, p.schema])),
      );
    }
    return hashValue;
  }
  function packetsFor(cl: Client, step: number): ServerPacket[] {
    const x: Despawn[] = cl.drops.splice(0);
    const c: Change[] = [];
    const sub = subscribedCells(cl);
    for (const [key, t] of sub) {
      const cell = cells.get(key);
      if (cell) since(cell, t, x, c);
    }
    const hashDue = cl.all && !cl.fresh && step >= cl.hashAt;
    if (
      !x.length &&
      !c.length &&
      !cl.ackDue &&
      !cl.rej.length &&
      !cl.ok.length &&
      !cl.ids.length &&
      !cl.ev.length &&
      !cl.fresh &&
      !hashDue
    )
      return [];
    for (const key of sub.keys()) sub.set(key, step);
    const packets: ServerPacket[] = [];
    let cur: ServerPacket = { t: 's', tk: step };
    let chars = 32;
    const push = (list: 'x' | 'c', item: Despawn | Change) => {
      const size = JSON.stringify(item).length + 1;
      if (chars + size > MAX_PACKET_CHARS && (cur.x || cur.c)) {
        cur.m = 1; // more follows: the state is consistent only at the last chunk
        packets.push(cur);
        cur = { t: 's', tk: step };
        chars = 32;
      }
      ((cur[list] ??= []) as (Despawn | Change)[]).push(item);
      chars += size;
    };
    for (const item of x) push('x', item);
    for (const item of c) push('c', item);
    if (cl.ackDue && cl.ack) cur.ack = cl.ack;
    if (cl.rej.length) cur.rej = cl.rej.splice(0);
    if (cl.ok.length) cur.ok = cl.ok.splice(0);
    if (cl.ids.length) cur.ids = cl.ids.splice(0);
    if (cl.ev.length) cur.ev = cl.ev.splice(0);
    if (cl.fresh) {
      cur.w = 1;
    }
    if (hashDue) {
      cur.h = hashNow(step);
    }
    // Join, refill and late delivery must not give each client its own idle-packet phase. A backed-up socket still
    // gets its overdue hash when writable, then rejoins the common server-step cadence at the next boundary.
    if (cl.fresh || hashDue) cl.hashAt = step + HASH_STEPS - (step % HASH_STEPS);
    cl.fresh = false;
    cl.ackDue = false;
    packets.push(cur);
    return packets;
  }
  function client(cid: string) {
    const cl = clients.get(cid);
    if (!cl) throw new Error(`replication: unknown client ${cid}`);
    return cl;
  }
  function subscribe(cid: string, want: readonly string[] | 'all') {
    const cl = client(cid);
    cl.all = want === 'all';
    const next = new Set(want === 'all' ? cells.keys() : want);
    for (const [key, t] of [...cl.cells]) {
      if (next.has(key)) continue;
      cl.cells.delete(key);
      // Leaving a cell: despawn what this client has seen there; its mirror keeps nothing it no longer hears about.
      for (const e of cells.get(key)?.entries.values() ?? [])
        if (e.values && e.born <= t) cl.drops.push([e.kind, e.id]);
    }
    for (const key of next) if (!cl.cells.has(key)) cl.cells.set(key, -1);
  }

  return {
    stats,
    define(p: Projection) {
      if (projections.has(p.schema.kind)) throw new Error(`replicated kind ${p.schema.kind} defined twice`);
      projections.set(p.schema.kind, p);
    },
    touch(kind: string, id: EntityId) {
      if (!projections.has(kind)) throw new Error(`replication: unknown kind ${kind}`);
      touched.set(entityKey(kind, id), [kind, id]);
    },
    touchAll(kind: string) {
      const p = projections.get(kind);
      if (!p) throw new Error(`replication: unknown kind ${kind}`);
      for (const id of p.ids()) touched.set(entityKey(kind, id), [kind, id]);
      for (const e of live.values()) if (e.kind === kind) touched.set(e.key, [kind, e.id]);
    },
    commit,
    addClient(cid: string, cellsWanted: readonly string[] | 'all' = 'all') {
      clients.set(cid, {
        all: false,
        cells: new Map(),
        ack: null,
        ackDue: false,
        rej: [],
        ok: [],
        ids: [],
        drops: [],
        ev: [],
        fresh: true,
        hashAt: 0,
      });
      subscribe(cid, cellsWanted);
    },
    subscribe,
    removeClient(cid: string) {
      clients.delete(cid);
    },
    ack(cid: string, epoch: number, request: number) {
      const cl = client(cid);
      cl.ack = [epoch, request];
      cl.ackDue = true;
    },
    reject(cid: string, epoch: number, request: number, reason: string) {
      const rej = client(cid).rej;
      rej.push([epoch, request, reason]);
      if (rej.length > MAX_REJECTS) rej.shift();
    },
    resync(cid: string) {
      const old = client(cid);
      clients.delete(cid);
      this.addClient(cid, old.all ? 'all' : [...old.cells.keys()]);
      const cl = client(cid);
      cl.ack = old.ack;
      cl.ackDue = !!old.ack;
      cl.rej = old.rej;
      cl.ok = old.ok;
    },
    accepted(cid: string, epoch: number, request: number, n: number) {
      const ok = client(cid).ok;
      ok.push([epoch, request, n]);
      if (ok.length > MAX_REJECTS) ok.shift();
    },
    remap(cid: string, temp: string, id: EntityId) {
      client(cid).ids.push([temp, id]);
    },
    emit(event: Fields, except?: string) {
      for (const [cid, cl] of clients) {
        if (cid === except) continue;
        cl.ev.push(event);
        if (cl.ev.length > MAX_EVENTS) cl.ev.shift();
      }
    },
    /** Whether cid is a replication client (tests drive hosts without a hosted room). */
    has: (cid: string) => clients.has(cid),
    /** End of step: send each client what changed in its cells. ready(cid) false skips a backed-up socket. */
    flush(
      step: number,
      send: (cid: string, packet: ServerPacket, json: string) => void,
      ready: (cid: string) => boolean = () => true,
    ): FlushStats {
      const out: FlushStats = { clients: 0, packets: 0, chars: 0, skipped: 0 };
      for (const [cid, cl] of clients) {
        if (!ready(cid)) {
          out.skipped++;
          continue;
        }
        const packets = packetsFor(cl, step);
        if (!packets.length) continue;
        out.clients++;
        for (const p of packets) {
          out.packets++;
          const json = JSON.stringify(p); // serialized once: the transport sends this text
          out.chars += json.length;
          send(cid, p, json);
        }
      }
      return out;
    },
    /** Live entities, for tests and the budget check. */
    size: () => live.size,
    cellsOf: () => [...cells.keys()],
    globalCell: GLOBAL_CELL,
  };
}
export type Replicator = ReturnType<typeof createReplicator>;

// Replication core, client side (docs/plans/replication.md, sections 1-2): the mirror of what the server sent, and
// the prediction hooks. Headless and pure. Not yet used by any state (R0); R1a mirrors railway, R1b predicts on it.
//
//   const mirror = createMirror([treeSchema, pileSchema])
//   mirror.apply(packet, atMs)        a server 's' packet (./replicate.ts). Validated whole before anything changes;
//                                     a malformed or out-of-order packet is refused (false) and changes nothing
//   mirror.get(kind, id) / entries(kind) / size()
//   mirror.onChange(kind, fn)         fn(id, fields | null, changed | null) after each applied change (null: despawned)
//   mirror.onPacket(fn)               fn(packet) after a packet applied (acks, refusals, id remaps and events ride on it)
//   mirror.whole()                    the late join's last chunk (w) has arrived since the last reset
//   mirror.step(atMs)                 estimated server step (src/world/room-clock.ts) from the packets' tk stamps
//   mirror.clone()                    a deep copy of every component (the predictor's confirmed base, budget test)
//   mirror.reset()                    drop everything (reconnect; the server re-sends whole from change tick -1)
//
//   const p = createPredictor({ confirmed, clone, apply, window })
//   p.session(epoch, next)            the session's action identity: the existing railway (epoch, request) pair
//   p.act(action, atMs)               returns its ActionId, or null when the window (8) is full (not predicted)
//   p.attach(mirror)                  acks drop confirmed actions, refusals drop theirs, any packet rebuilds
//   p.state()                         predicted state: clone(confirmed()) with pending actions replayed by the same
//                                     pure apply the server uses; rebuilt only after a packet or a new action
//   p.pending() / p.stalled(atMs)     actions still unconfirmed / those pending longer than STALL_MS (the stall cue)
//   p.onRejected(fn)                  fn(id, reason, action): the view eases the correction (Local presentation)
import { createStepEstimate } from './room-clock.ts';
import {
  validEvent,
  validFields,
  validId,
  entityKey,
  type ActionId,
  type EntityId,
  type Fields,
  type Schema,
  type ServerPacket,
} from './replicate.ts';

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => !!v && typeof v === 'object' && !Array.isArray(v);
const isStep = (v: unknown): v is number => Number.isSafeInteger(v) && (v as number) >= 0;
const isRequest = (v: unknown): v is number => Number.isSafeInteger(v) && (v as number) >= 1;
const MAX_LIST = 4096;
export const PREDICTION_WINDOW = 8;
export const STALL_MS = 1000;

export function createMirror(schemas: readonly Schema[]) {
  const kinds = new Map(schemas.map((s) => [s.kind, s]));
  const store = new Map<string, Map<EntityId, Fields>>(schemas.map((s) => [s.kind, new Map()]));
  const changeFns = new Map<string, ((id: EntityId, fields: Fields | null, changed: Fields | null) => void)[]>();
  const packetFns: ((p: ServerPacket) => void)[] = [];
  const estimate = createStepEstimate();
  let tk = -1;
  let whole = false;
  const stats = { applied: 0, refused: 0, chars: 0 };

  // Whole-packet validation: nothing is mutated unless every entry is well-formed for the current mirror.
  function valid(p: unknown): p is ServerPacket {
    if (!isObj(p) || p.t !== 's' || !isStep(p.tk) || p.tk < tk || (p.w !== undefined && p.w !== 1)) return false;
    if (
      p.ack !== undefined &&
      !(Array.isArray(p.ack) && p.ack.length === 2 && isRequest(p.ack[0]) && isRequest(p.ack[1]))
    )
      return false;
    if (
      p.rej !== undefined &&
      !(
        Array.isArray(p.rej) &&
        p.rej.length <= MAX_LIST &&
        p.rej.every(
          (r) => Array.isArray(r) && r.length === 3 && isRequest(r[0]) && isRequest(r[1]) && typeof r[2] === 'string',
        )
      )
    )
      return false;
    if (
      p.ids !== undefined &&
      !(
        Array.isArray(p.ids) &&
        p.ids.length <= MAX_LIST &&
        p.ids.every((r) => Array.isArray(r) && r.length === 2 && typeof r[0] === 'string' && validId(r[1]))
      )
    )
      return false;
    if (
      p.ev !== undefined &&
      !(Array.isArray(p.ev) && p.ev.length <= MAX_LIST && p.ev.every((e: unknown) => validEvent(e)))
    )
      return false;
    const gone = new Set<string>();
    if (p.x !== undefined) {
      if (!Array.isArray(p.x) || p.x.length > MAX_LIST) return false;
      for (const r of p.x) {
        if (!Array.isArray(r) || r.length !== 2 || !kinds.has(r[0]) || !validId(r[1])) return false;
        gone.add(entityKey(r[0], r[1]));
      }
    }
    if (p.c !== undefined) {
      if (!Array.isArray(p.c) || p.c.length > MAX_LIST) return false;
      for (const r of p.c) {
        if (!Array.isArray(r) || r.length !== 3 || !validId(r[1])) return false;
        const schema = kinds.get(r[0]);
        if (!schema) return false;
        // A change to an entity this mirror holds may be partial; anything else must arrive whole.
        const held = store.get(r[0])!.has(r[1]) && !gone.has(entityKey(r[0], r[1]));
        if (!validFields(schema, r[2], held)) return false;
      }
    }
    return true;
  }

  function notify(kind: string, id: EntityId, fields: Fields | null, changed: Fields | null) {
    for (const fn of changeFns.get(kind) ?? []) fn(id, fields, changed);
  }

  return {
    stats,
    apply(packet: unknown, at = 0) {
      if (!valid(packet)) {
        stats.refused++;
        return false;
      }
      tk = packet.tk;
      estimate.hear(packet.tk, at);
      for (const [kind, id] of packet.x ?? []) if (store.get(kind)!.delete(id)) notify(kind, id, null, null);
      for (const [kind, id, fields] of packet.c ?? []) {
        const rows = store.get(kind)!;
        const old = rows.get(id);
        const next = old ? Object.assign(old, fields) : { ...fields };
        if (!old) rows.set(id, next);
        notify(kind, id, next, fields);
      }
      if (packet.w) whole = true;
      stats.applied++;
      for (const fn of packetFns) fn(packet);
      return true;
    },
    get: (kind: string, id: EntityId) => store.get(kind)?.get(id) ?? null,
    entries: (kind: string) => store.get(kind)?.entries() ?? new Map<EntityId, Fields>().entries(),
    size() {
      let n = 0;
      for (const rows of store.values()) n += rows.size;
      return n;
    },
    onChange(kind: string, fn: (id: EntityId, fields: Fields | null, changed: Fields | null) => void) {
      if (!kinds.has(kind)) throw new Error(`mirror: unknown kind ${kind}`);
      let list = changeFns.get(kind);
      if (!list) changeFns.set(kind, (list = []));
      list.push(fn);
    },
    onPacket(fn: (p: ServerPacket) => void) {
      packetFns.push(fn);
    },
    step: (at: number) => estimate.now(at),
    lastStep: () => tk,
    /** The server's whole state has arrived since the last reset (a late join's last chunk carries w). */
    whole: () => whole,
    clone() {
      const out = new Map<string, Map<EntityId, Fields>>();
      for (const [kind, rows] of store) {
        const copy = new Map<EntityId, Fields>();
        for (const [id, f] of rows) copy.set(id, { ...f });
        out.set(kind, copy);
      }
      return out;
    },
    reset() {
      for (const [kind, rows] of store)
        for (const id of [...rows.keys()]) {
          rows.delete(id);
          notify(kind, id, null, null);
        }
      tk = -1;
      whole = false;
      estimate.reset();
    },
  };
}
export type Mirror = ReturnType<typeof createMirror>;

type Pending<A> = { id: ActionId; action: A; at: number };

export function createPredictor<S, A>({
  confirmed,
  clone,
  apply,
  window = PREDICTION_WINDOW,
}: {
  confirmed: () => S;
  clone: (s: S) => S;
  /** The same pure rule the server runs, applied to a scratch copy. */
  apply: (state: S, action: A, id: ActionId) => void;
  window?: number;
}) {
  let epoch = 0;
  let next = 1;
  let pending: Pending<A>[] = [];
  let cache: S | null = null;
  const rejectedFns: ((id: ActionId, reason: string, action: A) => void)[] = [];
  const stats = { acted: 0, confirmed: 0, rejected: 0, rebuilds: 0, full: 0 };

  function confirm([e, r]: ActionId) {
    const before = pending.length;
    pending = pending.filter((p) => p.id[0] > e || (p.id[0] === e && p.id[1] > r));
    stats.confirmed += before - pending.length;
    cache = null;
  }
  function reject([e, r]: ActionId, reason: string) {
    const k = pending.findIndex((p) => p.id[0] === e && p.id[1] === r);
    if (k < 0) return;
    const [p] = pending.splice(k, 1);
    stats.rejected++;
    cache = null;
    for (const fn of rejectedFns) fn(p!.id, reason, p!.action);
  }

  return {
    stats,
    session(e: number, n: number) {
      if (e !== epoch) {
        // A new session (takeover, reconnect) retires the old window: those actions are the server's to settle.
        pending = pending.filter((p) => p.id[0] === e);
        epoch = e;
        next = n;
      } else next = Math.max(next, n);
      cache = null;
    },
    act(action: A, at = 0): ActionId | null {
      if (!epoch || pending.length >= window) {
        stats.full++;
        return null;
      }
      const id: ActionId = [epoch, next++];
      pending.push({ id, action, at });
      stats.acted++;
      cache = null;
      return id;
    },
    confirm,
    reject,
    /** The confirmed base changed (a packet applied): rebuild on the next read. */
    invalidate() {
      cache = null;
    },
    attach(mirror: Mirror) {
      mirror.onPacket((p) => {
        for (const [e, r, reason] of p.rej ?? []) reject([e, r], reason);
        if (p.ack) confirm(p.ack);
        cache = null;
      });
    },
    state(): S {
      if (cache) return cache;
      const s = clone(confirmed());
      for (const p of pending) apply(s, p.action, p.id);
      stats.rebuilds++;
      return (cache = s);
    },
    pending: () => pending as readonly Pending<A>[],
    stalled: (at: number) => pending.filter((p) => at - p.at >= STALL_MS),
    onRejected(fn: (id: ActionId, reason: string, action: A) => void) {
      rejectedFns.push(fn);
    },
  };
}
export type Predictor<S, A> = ReturnType<typeof createPredictor<S, A>>;

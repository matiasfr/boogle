// Replication core, client side (docs/plans/replication.md, sections 1-2): the mirror of what the server sent, and
// the prediction hooks. Headless and pure. The railway mirrors through it (R1a), and its adapter predicts with
// createPredictor (R1b, src/adapters/railway-session.ts), settling acks and refusals itself rather than through attach.
//
//   const mirror = createMirror([treeSchema, pileSchema])
//   mirror.apply(packet, atMs)        a server 's' packet (./replicate.ts). Validated whole before anything changes;
//                                     a malformed or out-of-order packet is refused (false) and changes nothing
//   mirror.get(kind, id) / entries(kind) / size()
//   mirror.onChange(kind, fn)         fn(id, fields | null, changed | null) after each applied change (null: despawned)
//   mirror.onPacket(fn)               fn(packet) after a packet applied (acks, refusals, id remaps and events ride on it)
//   mirror.onDiverged(fn)             a refused packet or a hash (h) mismatch: reset and ask for the whole state
//   mirror.whole()                    the late join's last chunk (w) has arrived since the last reset
//   mirror.stamp(step, atMs)          a server clock stamp from outside the packets (the room's w:c clock)
//   mirror.step(atMs)                 estimated server step (src/world/room-clock.ts) from the packets' tk stamps
//   mirror.clone()                    a deep copy of every component (the predictor's confirmed base, budget test)
//   mirror.refill()                   a whole state is coming again (reconnect, resync): build it aside and keep
//                                     showing this one until its last chunk (w), then swap it in, rows it lacks deleted
//   mirror.reset()                    drop everything
//
//   const p = createPredictor({ confirmed, clone, apply, window })
//   p.session(epoch, next)            the session's action identity: the existing railway (epoch, request) pair
//   p.act(action, atMs)               returns its ActionId, or null when the window (8) is full (not predicted)
//   p.withdraw(id)                    take back the newest action before it was sent (its prediction moved nothing)
//   p.state()                         predicted state: clone(confirmed()) with pending actions replayed by the same
//                                     pure apply the server uses; rebuilt only after a packet or a new action
//   p.pending() / p.stalled(atMs)     actions still unconfirmed / those pending longer than STALL_MS (the stall cue)
//   p.confirm(ack) / p.reject(id)     settle actions (the owner reads them off packets: src/adapters/railway-session.ts)
//   p.invalidate()                    the confirmed base changed (a packet applied): rebuild on the next read
import { createStepEstimate } from './room-clock.ts';
import {
  hashComponents,
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
/** The step estimate runs at most this far past the newest step heard: two rule ticks, lockstep's old LEAD. */
export const LEAD_STEPS = 12;

export function createMirror(schemas: readonly Schema[]) {
  const kinds = new Map(schemas.map((s) => [s.kind, s]));
  const store = new Map<string, Map<EntityId, Fields>>(schemas.map((s) => [s.kind, new Map()]));
  const changeFns = new Map<string, ((id: EntityId, fields: Fields | null, changed: Fields | null) => void)[]>();
  const packetFns: ((p: ServerPacket) => void)[] = [];
  const divergedFns: ((why: 'refused' | 'hash') => void)[] = [];
  const estimate = createStepEstimate();
  let tk = -1;
  // While refilling: the incoming whole state, built aside (and its step) until its last chunk swaps it in.
  let staging: Map<string, Map<EntityId, Fields>> | null = null;
  let stagingTk = -1;
  const target = () => staging ?? store;
  let whole = false;
  let heard = -1; // the newest server step heard (packets and clock stamps)
  const stats = { applied: 0, refused: 0, chars: 0, diverged: 0 };
  function* rows(): Generator<[string, EntityId, Fields]> {
    for (const [kind, list] of store) for (const [id, f] of list) yield [kind, id, f];
  }

  // Whole-packet validation: nothing is mutated unless every entry is well-formed for the current mirror.
  function valid(p: unknown): p is ServerPacket {
    if (!isObj(p) || p.t !== 's' || !isStep(p.tk) || p.tk < (staging ? stagingTk : tk)) return false;
    if (p.w !== undefined && p.w !== 1) return false;
    if (p.m !== undefined && p.m !== 1) return false;
    if (
      p.ok !== undefined &&
      !(
        Array.isArray(p.ok) &&
        p.ok.length <= MAX_LIST &&
        p.ok.every(
          (r) => Array.isArray(r) && r.length === 3 && isRequest(r[0]) && isRequest(r[1]) && Number.isSafeInteger(r[2]),
        )
      )
    )
      return false;
    if (p.h !== undefined && !(Number.isInteger(p.h) && (p.h as number) >= 0 && (p.h as number) <= 0xffffffff))
      return false;
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
        const held = target().get(r[0])!.has(r[1]) && !gone.has(entityKey(r[0], r[1]));
        if (!validFields(schema, r[2], held)) return false;
      }
    }
    return true;
  }

  function notify(kind: string, id: EntityId, fields: Fields | null, changed: Fields | null) {
    for (const fn of changeFns.get(kind) ?? []) fn(id, fields, changed);
  }
  // The refill's last chunk: the staged state replaces this one, telling the views only what differs.
  function swap(next: Map<string, Map<EntityId, Fields>>) {
    for (const [kind, rows] of store) {
      const fresh = next.get(kind)!;
      for (const id of [...rows.keys()])
        if (!fresh.has(id)) {
          rows.delete(id);
          notify(kind, id, null, null);
        }
      for (const [id, f] of fresh) {
        const old = rows.get(id);
        const changed: Fields = {};
        let any = !old;
        for (const k in f)
          if (!old || old[k] !== f[k]) {
            changed[k] = f[k]!;
            any = true;
          }
        if (!any) continue;
        const now = old ? Object.assign(old, f) : { ...f };
        if (!old) rows.set(id, now);
        notify(kind, id, now, changed);
      }
    }
  }

  return {
    stats,
    apply(packet: unknown, at = 0) {
      if (!valid(packet)) {
        stats.refused++;
        // The server already counts what it sent as seen: a refused packet leaves this mirror behind for good.
        if (whole) for (const fn of divergedFns) fn('refused');
        return false;
      }
      estimate.hear(packet.tk, at);
      if (packet.tk > heard) heard = packet.tk;
      if (staging) {
        stagingTk = packet.tk;
        for (const [kind, id] of packet.x ?? []) staging.get(kind)!.delete(id);
        for (const [kind, id, fields] of packet.c ?? []) {
          const rows = staging.get(kind)!;
          const old = rows.get(id);
          if (old) Object.assign(old, fields);
          else rows.set(id, { ...fields });
        }
        if (packet.w) {
          const next = staging;
          staging = null;
          tk = stagingTk;
          swap(next);
        }
      } else {
        tk = packet.tk;
        for (const [kind, id] of packet.x ?? []) if (store.get(kind)!.delete(id)) notify(kind, id, null, null);
        for (const [kind, id, fields] of packet.c ?? []) {
          const rows = store.get(kind)!;
          const old = rows.get(id);
          const next = old ? Object.assign(old, fields) : { ...fields };
          if (!old) rows.set(id, next);
          notify(kind, id, next, fields);
        }
      }
      if (packet.w) whole = true;
      stats.applied++;
      for (const fn of packetFns) fn(packet);
      if (whole && packet.h !== undefined && hashComponents(rows(), kinds) !== packet.h) {
        stats.diverged++;
        for (const fn of divergedFns) fn('hash');
      }
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
    /** fn(why) when this mirror is known to differ from the server: a packet it had to refuse, or a hash mismatch.
     * The owner resets it and asks for the whole state (r:resync). Not called before the mirror is whole. */
    onDiverged(fn: (why: 'refused' | 'hash') => void) {
      divergedFns.push(fn);
    },
    /** A hash of every component held, as the server's packets' h is computed. */
    hash: () => hashComponents(rows(), kinds),
    /** Estimated server step: local time since the freshest stamp, but never more than LEAD_STEPS past the newest
     * step heard (a throttled or warped page clock cannot run the room's timed things ahead of the server). `away`:
     * the server cannot be heard (a lost connection), so the estimate runs on with the local clock: the room's timed
     * things go on meanwhile, and the state that comes back is not a jump forward. */
    step: (at: number, away = false) =>
      heard < 0 ? -1 : away ? estimate.now(at) : Math.min(estimate.now(at), heard + LEAD_STEPS),
    /** A server clock stamp heard outside a packet (the room's clock messages). */
    stamp(step: number, at: number) {
      if (!isStep(step)) return;
      estimate.hear(step, at);
      if (step > heard) heard = step;
    },
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
    /** The server is sending the whole state again (a reconnect, a resync): keep this one until it has all arrived. */
    refill() {
      staging = new Map(schemas.map((s) => [s.kind, new Map()]));
      stagingTk = -1;
      whole = false;
    },
    reset() {
      staging = null;
      for (const [kind, rows] of store)
        for (const id of [...rows.keys()]) {
          rows.delete(id);
          notify(kind, id, null, null);
        }
      tk = -1;
      heard = -1;
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
  const stats = { acted: 0, confirmed: 0, rejected: 0, rebuilds: 0, full: 0 };

  function confirm([e, r]: ActionId) {
    const before = pending.length;
    pending = pending.filter((p) => p.id[0] > e || (p.id[0] === e && p.id[1] > r));
    stats.confirmed += before - pending.length;
    cache = null;
  }
  /** Drop a refused action; whether it was still pending. */
  function reject([e, r]: ActionId) {
    const k = pending.findIndex((p) => p.id[0] === e && p.id[1] === r);
    if (k < 0) return false;
    pending.splice(k, 1);
    stats.rejected++;
    cache = null;
    return true;
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
    /** Take back the action just added, before anything was sent for it (the rule would not take it: "not yet"). */
    withdraw([e, r]: ActionId) {
      const last = pending.at(-1);
      if (!last || last.id[0] !== e || last.id[1] !== r) return false;
      pending.pop();
      next = r;
      stats.acted--;
      cache = null;
      return true;
    },
    /** The confirmed base changed (a packet applied): rebuild on the next read. */
    invalidate() {
      cache = null;
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
  };
}
export type Predictor<S, A> = ReturnType<typeof createPredictor<S, A>>;

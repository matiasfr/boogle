// World sync: tick clock + edit pipeline + state registry + snapshots/hashes + persistence. See README.md for the contract.
//
// Roles: 'local' (no room: edits apply next tick), 'host' (authoritative clock, stamps edits), 'client' (follows host).
// The host is our server (server/src/host/world-host.ts attaches with host: true); every tab is a client. All wire messages are `room.send` JSON with a `w:` type. NOTE room.send reaches every
// OTHER peer; a client's message also reaches the other clients (relayed, `from` = origin), so each side ignores types it does not own.
//
//   host -> client   { t:'w:rejected', to, op, requestId }   bounded correlated admission refusal; never state
//   client -> host   { t:'w:edit', e }                      an edit request (host overwrites e.p with the real sender id
//                                                           and e.u with that sender's pid)
//                    { t:'w:need' }                         please send me a snapshot (late join, desync, late edit)
//   host -> all      { t:'w:edits', ht, list:[{tick,seq,e}] }  stamped edits (tick = host tick + DELAY); ht = host tick now
//                    { t:'w:c', ht }                        clock, every CLOCK_EVERY ticks
//                    { t:'w:hash', tick, h, ht, hs }        worldHash right after `tick` was processed, every HASH_EVERY ticks;
//                                                           hs = { stateKey: hash } so a client can name what diverged
//                    { t:'w:snap', to, id, n, k, s }        chunk k of n (string slice) of JSON { snap, pend, seq, ht };
//                                                           only `to` uses it. pend = stamped edits not yet applied at snap.tick (so a
//                                                           joiner misses none)
// Player ids: `p` on an edit is the session (selfId), `u` the player (pid, src/player/identity.ts) that outlives a
// reload. The host sets both, never from the edit: u from the room's pidOf (the server binds each socket's pid when it
// connects); an edit from a session with no pid is rejected.
// Clients pin the first sender of a host-type message as the host (re-pinned if it was silent for HOST_STALE_MS, or at
// once after the room reconnects). Edits submitted while the room is down (a client reconnecting) are held; once it is
// back they go to the host one per HELD_EVERY_MS, so a burst never lands on one host tick. Held edits older than
// HELD_MAX_MS are dropped (stats.heldDropped): the player has moved on. So is the rest of the backlog once a fresh edit
// is submitted with the room back: the fresh one waits only for the next HELD_EVERY_MS slot, so live input is never
// stuck behind it.
// A client that receives an edit for a tick it already passed, or a hash mismatch, asks for a snapshot (w:need) and
// replaces its state.
//
// Persistence: the host saves the world to its storage (the server's store) every saveMs (attachWorld option, default
// SAVE_MS = 30 s; the server uses 2 s) if its states changed, and saveNow(force) at once; it starts from that save, or a
// fresh world. Tabs keep no copy.
//
// Development saves use the current state shapes. A WORLD_NS break replaces migrations. A state that fails to
// load starts fresh (stats.loadErrors), but that fallback must never be saved or served as authoritative state.

import { okPid } from '../sim/roster.ts';
import { RULE_MS, RULE_STEPS, STEP_MS, createFixedSteps, createStepEstimate } from './room-clock.ts';
import type { OpHandlers, StateHandlers, Edit } from './rules/types.ts';

// Wire messages and edits arrive as unchecked JSON objects: every field is read as unknown and checked before use.
type Obj = Record<string, unknown>;
/** A stamped edit waiting for its tick. */
export type Queued = { tick: number; seq: number; e: Obj };
// server: a Server-kind state (docs/plans/replication.md) registered only on the host. The host persists it with the
// world, but it never enters a hash or a served snapshot: clients mirror it through replication instead.
type State = StateHandlers & { fresh: string; server: boolean };
/** The world as saved and served: tick, seed, epoch and each state's serialized form. */
export type Snapshot = { tick: number; seed: number; epochMs: number; data: Obj };
/** Production recovery; ordinary world snapshots do not use this document. */
export type RecoveryEnvelope = {
  version: 1;
  namespace: string;
  catalog: string;
  checkpoint: Snapshot;
  hash: number;
  tail: Queued[];
  seq: number;
  checksum: number;
};
export type RecoveryStore = {
  namespace: string;
  catalog: string;
  read(): unknown;
  /** Resolve only after atomic replacement succeeds; refusal and I/O errors must reject. */
  write(envelope: RecoveryEnvelope): Promise<void>;
};
// Raised from 60 KB (owner, 6 November: the save size guarantee can be bigger) for line two's remaining stations.
export const MAX_RECOVERY_BYTES = 128000;
const MAX_RECOVERY_TAIL = 64;
/** The part of a room (src/net/README.md) the world uses. */
export type WorldRoom = {
  selfId: string;
  send(m: unknown): void;
  peers?: () => readonly { peer: string }[];
  pidOf?: (sid: string) => string | null; // the host's room: the player each session plays as
  onMessage(h: (m: unknown, from: string) => void): () => void;
  onConnection(h: (connected: boolean) => void): () => void;
};
export type AttachOptions = {
  roomId?: string;
  host?: boolean; // the server's world: stamps, ticks for everyone, saves (default: a client of the host)
  storage?: SaveStore | null; // the host's save (synchronous, like localStorage)
  now?: () => number;
  saveMs?: number; // how often the host saves a changed world; default SAVE_MS (30 s), the server uses 2 s
  recovery?: RecoveryStore; // railway rooms; replaces ordinary storage, never falls back to it
};
type Cfg = {
  roomId: string;
  storage: SaveStore | null;
  now: () => number;
  saveMs: number;
  recovery?: RecoveryStore;
};
type Desync = { tick: number; keys: string[] };
/** Where the host keeps the world: the server's store (world-host.ts), or a stand-in in tests. */
type SaveStore = Pick<Storage, 'getItem' | 'setItem'>;
type SnapFail = { from: string; reason: string };

export const TICK_MS = RULE_MS; // 100: a rule tick is RULE_STEPS (6) steps of the 60 Hz room clock (./room-clock.ts)
const DELAY = 3; // host stamps edits this many ticks ahead
const CLOCK_EVERY = 2;
const HASH_EVERY = 20; // 2 s
const LAG = 1.5; // clients aim to run this many ticks behind the host
const LEAD = 2; // never run past last known host tick + LEAD (< DELAY, so stamped edits always arrive in time)
const MAX_STEPS = 5; // ticks per frame
const CHUNK = 7000; // chars of snapshot JSON per message (rooms cap messages at 16 KB, escaping can double)
const MAX_CHUNKS = 400;
const MAX_EDIT_JSON = 1000;
const MAX_HELD = 64; // edits kept while the room is reconnecting
// Release held edits this far apart: two ticks (200 ms), so a burst never lands on one host tick, and under a held
// button's ~220 ms repeat, so a fresh edit waiting for its slot goes out before the next repeat replaces it. (No rules
// module rate-limits per player; ops bound themselves through state checks, such as a pour needing a stack.)
const HELD_EVERY_MS = 210;
const HELD_MAX_MS = 5000; // drop held edits older than this
const HOST_STALE_MS = 3000;
const SAVE_MS = 30000;
export const HOST_TYPES = new Set(['w:edits', 'w:c', 'w:hash', 'w:snap', 'w:rejected']); // what a client accepts, only from the host
export type EditRejection = { op: string; requestId: string; reason?: 'recovery-budget' };
const correlation = (v: unknown): v is string => typeof v === 'string' && v.length > 0 && v.length <= 80;
const isObj = (v: unknown): v is Obj => v !== null && typeof v === 'object' && !Array.isArray(v);
const isInt = (v: unknown): v is number => Number.isSafeInteger(v);
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
function recoveryChecksum(value: Omit<RecoveryEnvelope, 'checksum'>) {
  const text = JSON.stringify(value);
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619) >>> 0;
  return h;
}

// opts.env: host-only facts handed to validate as ctx.env (they may differ per machine, so never to apply or ticks).
export function createSync({ env: env0 }: { env?: Obj } = {}) {
  const world = { tick: 0, seed: 20261028, epochMs: 0 };
  const env: Obj = { ...(env0 ?? {}) };
  const ops = new Map<string, OpHandlers<object>>();
  const states = new Map<string, State>();
  const tickFns: ((tick: number) => void)[] = [];
  const afterFns: ((tick: number) => void)[] = []; // fn(tick) after every onTick handler (render work that reads the tick's final state)
  const appliedFns: ((e: Obj, tick: number, result: unknown) => void)[] = [];
  const rejectedFns = new Set<(e: EditRejection) => void>();
  const labels = new Map<unknown, string>(); // handler fn -> name shown by profileTicks
  const snapFns: ((tick: number) => void)[] = [];
  const desyncFns: ((d: Desync) => void)[] = []; // fn({ tick, keys }) on a client whose hash disagreed with the host's (keys = diverged states)
  const hashFns: ((tick: number) => void)[] = []; // fn(tick) on the host right after it sent a hash
  const snapFailFns: ((f: SnapFail) => void)[] = []; // fn({ from: 'peer'|'local'|'server'|'state', reason }): a snapshot (or a state) failed to load
  const stats = {
    resyncs: 0,
    snapsSent: 0,
    snapsLoaded: 0,
    hashOk: 0,
    hashBad: 0,
    lateEdits: 0,
    saves: 0,
    heldDropped: 0,
    loadErrors: 0, // states that failed to load and started fresh
    snapBytes: 0, // characters of the last snapshot saved or served (budget: MAX_RECOVERY_BYTES, test/world-size.test.ts)
  };
  // The host's own save failed to load (corrupt, or a state's load threw): it runs on a fresh fallback and must
  // never write that over the real save, which stays on disk for a fix. Cleared only by a restart.
  let badSave = false;
  let subsystems: Record<string, 'ok' | 'bad'> = {}; // stateKey -> 'ok' | 'bad' from the latest hash check (client)
  let lastBad: Desync | null = null; // { tick, keys } of the latest mismatch
  let queue: Queued[] = []; // [{ tick, seq, e }] stamped, not yet applied
  let seq = 0;
  let selfId = 'local';
  let pid: string | null = null; // this tab's player id (setPid); until set, its selfId stands in (tests, the first frames)
  const myPid = () => pid ?? selfId;
  const pidOf = (sid: string) => (sid === selfId ? myPid() : (room?.pidOf?.(sid) ?? null));
  let acc = 0;
  let wall = 0; // ms of frame time seen by updateWorld (all timers use this, so tests are deterministic)
  // The room clock (./room-clock.ts): the host's 60 Hz step counter is tick * RULE_STEPS + phase. A client estimates
  // it from the host's tick stamps.
  let phase = 0;
  const fixedSteps = createFixedSteps();
  const stepEstimate = createStepEstimate();
  const stepFns: ((step: number) => void)[] = [];

  let mode: 'local' | 'host' | 'client' = 'local';
  let room: WorldRoom | null = null;
  let cfg = {} as Cfg; // set by attachWorld
  let cleanup: (() => void)[] = [];
  let connected = true;
  let ready = true; // false until we hold authoritative state
  let hostId: string | null = null;
  let hostSeenAt = 0;
  let hostTick = 0;
  let hostTickAt = 0;
  const pendingHash = new Map<number, [number, unknown]>();
  let needAt = -1e9;
  let awaiting = false;
  let asm: { id: number; n: number; parts: string[]; got: number } | null = null; // snapshot being assembled
  let snapId = 0;
  const served = new Map<string, number>();
  let out: Queued[] = []; // stamped edits waiting to be broadcast
  let held: { e: Obj; at: number; fresh?: boolean }[] = []; // [{ e, at, fresh }] edits submitted while the room was down (or one waiting for its slot); releaseHeld
  let heldAt = 0; // wall time the next held edit may go
  let nextHashTick = HASH_EVERY;
  let lastSavedHash: number | null = null;
  let nextSave = SAVE_MS;
  let recoveryPending = false;
  // Stamped edits whose durable write is still out: the clock may not apply them before they are published.
  let publishing = false;
  let recoveryError: string | null = null;
  let recoveryWork: Promise<void> = Promise.resolve();
  let attachment = 0; // a completed old write cannot publish into a different attachment
  let processingTick = false;

  // Listeners are guarded: callers report from inside catch blocks, so a throwing listener would report twice.
  const snapFail = (from: string, reason: string) => {
    for (const fn of snapFailFns) {
      try {
        fn({ from, reason });
      } catch (e) {
        console.warn('[world] onSnapFail listener failed', e);
      }
    }
  };
  const send = (m: unknown) => {
    if (!room || !connected) return;
    try {
      room.send(m);
    } catch (e) {
      console.warn('[world] send failed', e);
    }
  };

  // ------------------------------------------------------------ registry
  // Registration order is wire order (hash combine, snapshot, load), so a key registered twice is a bug: throw.
  function registerOp<F>(op: string, handlers: OpHandlers<F>) {
    if (ops.has(op)) throw new Error('duplicate op ' + op);
    ops.set(op, handlers as unknown as OpHandlers<object>);
  }
  // What serialize returns now is the state's fresh form, loaded when a snapshot's copy fails.
  function registerState(key: string, handlers: StateHandlers, { server = false } = {}) {
    if (states.has(key)) throw new Error('duplicate state ' + key);
    states.set(key, {
      ...handlers,
      fresh: JSON.stringify(handlers.serialize()),
      server,
    });
  }
  const registry = () => ({ ops: [...ops.keys()], states: [...states.keys()] });
  function addHandler<F>(list: F[], fn: F, label?: string) {
    list.push(fn);
    if (label) labels.set(fn, label);
  }

  // ------------------------------------------------------------ edits
  // Host (or local): validate, stamp, queue, broadcast.
  let stampRefusal: EditRejection['reason'];
  function stamp(edit: Obj, from: string) {
    stampRefusal = undefined;
    const h = ops.get(String(edit.op));
    if (!ready || !h || !isInt(edit.i) || !isInt(edit.j)) return false;
    if (cfg.recovery && (recoveryPending || recoveryError || badSave)) return false;
    if (cfg.recovery && (seq >= Number.MAX_SAFE_INTEGER || world.tick > Number.MAX_SAFE_INTEGER - DELAY)) return false;
    const u = pidOf(from);
    if (!u) return false;
    if (h.hostOnly && from !== selfId) return false; // an op only the host itself submits (a broadcast can't be replayed)
    const e = { ...edit, p: from, u }; // never trust a client-supplied p or u
    try {
      if (h.validate && !h.validate(e as unknown as Edit, { from, tick: world.tick, env })) return false;
    } catch (err) {
      console.warn('[world] validate threw', err);
      return false;
    }
    const delay = mode === 'local' ? 1 : DELAY;
    const entry = { tick: world.tick + delay, seq: seq + 1, e };
    if (cfg.recovery) {
      // Budget the complete serialized envelope, including UTF-8, JSON escaping and authenticated ids.
      // Reserve metadata width so ticking toward this tail cannot turn a fitting batch into an overflow.
      // The durable barrier freezes state between this check and publication. Refusal consumes no sequence.
      try {
        const body = recoveryBody([...queue, entry], entry.seq);
        body.checkpoint.tick = Number.MAX_SAFE_INTEGER;
        body.hash = 0xffffffff;
        const bytes = new TextEncoder().encode(JSON.stringify({ ...body, checksum: 0xffffffff })).length;
        if (queue.length >= MAX_RECOVERY_TAIL || bytes > MAX_RECOVERY_BYTES) {
          stampRefusal = 'recovery-budget';
          return false;
        }
      } catch (err) {
        failRecovery(err instanceof Error ? err.message : 'recovery serialization failed');
        return false;
      }
    }
    seq = entry.seq;
    queue.push(entry);
    if (mode === 'host') {
      out.push(entry);
      if (out.length === 1) queueMicrotask(flush);
    }
    return true;
  }
  function flush() {
    if (!out.length) return;
    if (cfg.recovery && (recoveryPending || recoveryError || badSave)) return;
    const list = out;
    out = [];
    const publish = () => {
      publishing = false;
      send({ t: 'w:edits', ht: world.tick, list });
    };
    if (cfg.recovery) {
      publishing = true;
      checkpointRecovery(publish);
    } else publish();
  }

  function submitEdit(edit: unknown) {
    if (!isObj(edit) || !ops.has(String(edit.op)) || !isInt(edit.i) || !isInt(edit.j)) return false;
    const e: Obj = { ...edit, p: selfId };
    delete e.u; // the host sets it
    if (mode === 'client' && JSON.stringify(e).length > MAX_EDIT_JSON) return false;
    // Nowhere to deliver it yet (the room is down, so send() would drop it, or a reclaimed host is still loading): hold it.
    if (mode === 'client' ? !connected : held.length && !canRelease()) {
      if (held.length >= MAX_HELD) return false;
      held.push({ e, at: wall });
      return true;
    }
    // The room is back: a fresh edit replaces whatever is still held (the player has moved on; draining the backlog
    // first would turn a held button into seconds of input lag). It waits only for the slot after the last released
    // edit, so it does not take that one's per-player rate-limit slot.
    if (held.length) {
      stats.heldDropped += held.length;
      held = [];
    }
    if (wall < heldAt && canRelease()) {
      held.push({ e, at: wall, fresh: true });
      return true;
    }
    return deliver(e);
  }
  function deliver(e: Obj) {
    if (mode !== 'client') return stamp(e, selfId);
    send({ t: 'w:edit', e });
    return true;
  }
  const canRelease = () => connected && (mode === 'client' || ready);
  // updateWorld delivers what was held once the room is back.
  function onConnected(c: boolean) {
    const rejoined = c && !connected && mode === 'client';
    connected = c;
    // The server may have restarted behind our old tick. Its earlier hashes cannot repair a client
    // already ahead, so reconnect must rejoin from a snapshot instead of merely re-pinning the host.
    if (rejoined) becomeClient();
  }
  // One held edit per HELD_EVERY_MS, in submission order: a burst would land on one host tick.
  function releaseHeld() {
    while (held.length && wall - held[0]!.at > HELD_MAX_MS) {
      held.shift();
      stats.heldDropped++;
    }
    if (!held.length || !canRelease() || wall < heldAt) return; // a reclaimed host keeps them until it is ready
    const { e, fresh } = held.shift()!;
    deliver(e);
    if (!fresh) heldAt = wall + HELD_EVERY_MS; // a fresh edit is live input again: its caller paces the next one
  }

  // ------------------------------------------------------------ tick
  function step() {
    processingTick = true;
    try {
      runTick();
    } catch (e) {
      if (cfg.recovery) failRecovery('accepted production tick failed');
      throw e;
    } finally {
      processingTick = false;
    }
  }
  function runTick() {
    const t = world.tick + 1;
    const due = queue.filter((q) => q.tick <= t).sort((a, b) => a.tick - b.tick || a.seq - b.seq);
    queue = queue.filter((q) => q.tick > t);
    world.tick = t;
    for (const { e } of due) {
      try {
        const r = ops.get(String(e.op))?.apply(e as unknown as Edit, t); // a throwing apply skips the listeners
        // Listeners get apply's result; each is guarded, so a failing effect does not stop the next listener.
        for (const fn of appliedFns) {
          try {
            fn(e, t, r);
          } catch (err) {
            console.error('[world] onApplied failed', err);
          }
        }
      } catch (err) {
        if (cfg.recovery) {
          failRecovery(`accepted edit failed in apply: ${String(e.op)}`);
          throw err; // never silently discard a durably accepted production edit
        }
        console.error('[world] apply failed', err);
      }
    }
    for (const fn of tickFns) fn(t);
    for (const fn of afterFns) fn(t);
    if (mode === 'host' && (!cfg.recovery || (ready && !out.length && !recoveryPending && !recoveryError))) {
      if (t % CLOCK_EVERY === 0) send({ t: 'w:c', ht: t });
      if (t >= nextHashTick) {
        nextHashTick = t + HASH_EVERY;
        send({ t: 'w:hash', tick: t, h: worldHash(), ht: t, hs: stateHashes() });
        for (const fn of hashFns) fn(t);
      }
    } else if (mode === 'client' && pendingHash.has(t)) {
      const [h, hs] = pendingHash.get(t)!;
      checkHash(t, h, hs);
    }
    for (const k of pendingHash.keys()) if (k <= t) pendingHash.delete(k);
  }

  // Called from the frame loop with real elapsed seconds; runs whole ticks only.
  function updateWorld(dt: number) {
    wall += dt * 1000;
    // A production clock cannot overtake an unpublished stamp or a replacement checkpoint.
    if (mode === 'host' && cfg.recovery && (recoveryPending || recoveryError || out.length || !ready)) return;
    releaseHeld();
    if (mode === 'client') {
      if (awaiting && wall - needAt > 2000) {
        needAt = wall;
        send({ t: 'w:need' });
      }
      if (!ready || !hostId) return;
      const est = hostTick + Math.min((wall - hostTickAt) / TICK_MS, LAG);
      const diff = est - LAG - (world.tick + acc / TICK_MS); // ticks we should still gain (negative: slow down)
      acc += dt * 1000 * (diff > 6 ? MAX_STEPS : clamp(1 + diff * 0.25, 0.5, 2));
      let n = 0;
      while (acc >= TICK_MS && n < MAX_STEPS && world.tick + 1 <= hostTick + LEAD) {
        acc -= TICK_MS;
        n++;
        step();
      }
      if (acc >= TICK_MS) acc = TICK_MS * 0.99;
      return;
    }
    if (!ready) return;
    acc += dt * 1000;
    let n = 0;
    while (acc >= TICK_MS && n++ < MAX_STEPS) {
      acc -= TICK_MS;
      step();
      if (cfg.recovery && (out.length || recoveryPending || recoveryError || !ready)) break;
    }
    if (n >= MAX_STEPS) acc = 0;
    saveSoon();
  }
  // The host's (or a local world's) room clock: advance by ms of real time in whole 60 Hz steps (at most 5 rule ticks'
  // worth per call). Every RULE_STEPS steps runs one rule tick. While a durable write holds the production clock, the
  // step is not counted at all (as updateWorld always dropped that time), so a railway room under write back-pressure
  // runs no closer to real time than before, and the step counter (tick * RULE_STEPS + phase) never repeats a value.
  // onStep listeners run after every counted step, rules or not: the end-of-step flush of replication
  // (docs/plans/replication.md).
  function stepWorld(ms: number) {
    if (mode === 'client') throw new Error('stepWorld drives the host clock; a client follows it with updateWorld');
    fixedSteps.advance(ms, hostStep);
  }
  function hostStep() {
    wall += STEP_MS;
    // A production clock cannot overtake an unpublished stamp. A periodic checkpoint write alone does not hold it: the
    // envelope is already an immutable copy, stamps are refused until it lands, and a Server-kind state (the railway)
    // keeps applying and flushing (docs/plans/replication.md: nothing waits on a durable write).
    if (mode === 'host' && cfg.recovery && (recoveryError || out.length || publishing || !ready)) return;
    releaseHeld();
    if (!ready) return;
    if (phase < RULE_STEPS - 1) phase++;
    else {
      step();
      phase = 0;
      saveSoon();
    }
    const now = roomStep();
    for (const fn of stepFns) fn(now);
  }
  /** The room clock in 60 Hz steps: exact on the host; a client's estimate of the host's (whole steps, -1 before the
   * first stamp). */
  function roomStep() {
    if (mode !== 'client') return world.tick * RULE_STEPS + phase;
    const est = stepEstimate.now(wall);
    return est < 0 ? -1 : Math.floor(est);
  }
  function saveSoon() {
    if (mode === 'local' || wall < nextSave) return;
    nextSave = wall + cfg.saveMs;
    persist();
  }

  // ------------------------------------------------------------ snapshots + hashes
  // withServer: the host's own save includes Server-kind states; what it serves to clients does not.
  function snapshot(withServer = true): Snapshot {
    const data: Obj = {};
    for (const [k, s] of states) if (withServer || !s.server) data[k] = s.serialize();
    return { tick: world.tick, seed: world.seed, epochMs: world.epochMs, data };
  }
  function validSnap(s: unknown): s is Snapshot {
    return isObj(s) && isInt(s.tick) && s.tick >= 0 && isInt(s.seed) && isInt(s.epochMs) && isObj(s.data);
  }
  function loadSnapshot(snap: unknown) {
    if (!validSnap(snap)) return false;
    world.tick = snap.tick;
    world.seed = snap.seed;
    world.epochMs = snap.epochMs;
    for (const [k, s] of states) if (k in snap.data) loadState(k, s, snap.data[k]);
    queue = [];
    acc = 0;
    phase = 0;
    fixedSteps.reset();
    pendingHash.clear();
    return true;
  }
  // Load one current state from a snapshot. Never throws.
  function loadState(k: string, s: State, json: unknown) {
    try {
      s.load(json);
    } catch (err) {
      stats.loadErrors++;
      console.warn(`[world] ${k} failed to load; starting it fresh`, err);
      snapFail('state', `${k} load`);
      try {
        s.load(JSON.parse(s.fresh));
      } catch (err2) {
        console.error(`[world] ${k} fresh load failed`, err2);
      }
    }
  }
  // withServer: only the save's change detection covers Server-kind states; world hashes are lockstep only.
  function combine(h0: number, withServer = false) {
    let h = h0;
    for (const [, s] of states) if (withServer || !s.server) h = (Math.imul(h ^ s.hash(), 16777619) >>> 0) | 0;
    return h >>> 0;
  }
  function worldHash() {
    return combine(world.tick | 0);
  }
  function stateHashes() {
    const out: Record<string, number> = {};
    for (const [k, s] of states) if (!s.server) out[k] = s.hash() >>> 0;
    return out;
  }

  function checkHash(tick: number, h: number, hs0: unknown) {
    if (tick !== world.tick) return;
    // The combined hash checks the complete current registry; per-state hashes identify a mismatch.
    const hs = isObj(hs0) ? hs0 : {};
    const mine = isObj(hs0) ? stateHashes() : null;
    if (mine) subsystems = Object.fromEntries(Object.keys(mine).map((k) => [k, mine[k] === hs[k] ? 'ok' : 'bad']));
    const agree = worldHash() === h && (!mine || Object.keys(mine).every((k) => mine[k] === hs[k]));
    if (agree) {
      stats.hashOk++;
    } else {
      stats.hashBad++;
      const keys = mine ? Object.keys(mine).filter((k) => mine[k] !== hs[k]) : ['?'];
      lastBad = { tick, keys };
      console.warn(`[world] desync at tick ${tick} in: ${keys.join(', ') || 'tick/order'}`);
      for (const fn of desyncFns) fn(lastBad); // before the resync replaces the evidence
      requestResync();
    }
  }
  function requestResync() {
    if (mode !== 'client' || wall - needAt < 1000) return;
    needAt = wall;
    awaiting = true;
    stats.resyncs++;
    send({ t: 'w:need' });
  }

  function serveSnapshot(to: string) {
    // A failed-load fallback is not an authoritative world, even if its fresh state hashes consistently.
    if (!ready || badSave || wall - (served.get(to) ?? -1e9) < 1500) return;
    if (cfg.recovery && (recoveryPending || recoveryError || out.length)) return;
    served.set(to, wall);
    const pend = queue.map(({ tick, seq: s, e }) => ({ tick, seq: s, e }));
    const json = JSON.stringify({ snap: snapshot(false), pend, seq, ht: world.tick });
    stats.snapBytes = json.length;
    const id = ++snapId;
    const n = Math.ceil(json.length / CHUNK);
    for (let k = 0; k < n; k++) send({ t: 'w:snap', to, id, n, k, s: json.slice(k * CHUNK, (k + 1) * CHUNK) });
    stats.snapsSent++;
  }
  function onSnapChunk(m: Obj) {
    if (m.to !== selfId || !isInt(m.id) || !isInt(m.n) || !isInt(m.k) || typeof m.s !== 'string') return;
    if (m.n < 1 || m.n > MAX_CHUNKS || m.k < 0 || m.k >= m.n || m.s.length > 16000) return;
    if (!asm || asm.id !== m.id || asm.n !== m.n) asm = { id: m.id, n: m.n, parts: [], got: 0 };
    if (asm.parts[m.k] === undefined) asm.got++;
    asm.parts[m.k] = m.s;
    if (asm.got < asm.n) return;
    const text = asm.parts.join('');
    asm = null;
    try {
      if (!applyPayload(JSON.parse(text))) snapFail('peer', 'invalid');
    } catch (err) {
      console.warn('[world] bad snapshot', err);
      snapFail('peer', err instanceof SyntaxError ? 'parse' : 'load');
    }
  }
  function applyPayload(p: unknown) {
    if (!isObj(p) || !validSnap(p.snap) || !Array.isArray(p.pend)) return false;
    loadSnapshot(p.snap);
    queue = p.pend.filter(
      (q): q is Queued =>
        isObj(q) && isInt(q.tick) && isInt(q.seq) && isObj(q.e) && q.tick > world.tick && ops.has(String(q.e.op)),
    );
    if (isInt(p.seq)) seq = Math.max(seq, p.seq);
    hostTick = world.tick;
    hostTickAt = wall;
    ready = true;
    awaiting = false;
    stats.snapsLoaded++;
    for (const fn of snapFns) fn(world.tick);
    return true;
  }

  // ------------------------------------------------------------ messages
  function noteHostTick(ht: unknown) {
    // Every host stamp is taken at or after that tick's first step: a lower bound on the room clock.
    if (isInt(ht) && ht >= 0) stepEstimate.hear(ht * RULE_STEPS, wall);
    if (isInt(ht) && (ht > hostTick || hostTickAt === 0)) {
      hostTick = ht;
      hostTickAt = wall;
    }
  }
  function acceptHost(from: string) {
    if (hostId === null || (from !== hostId && wall - hostSeenAt > HOST_STALE_MS)) {
      hostId = from; // first sender, or the old host went quiet: a migration
      hostTick = 0;
      hostTickAt = 0;
      stepEstimate.reset();
      pendingHash.clear();
    }
    if (from !== hostId) return false;
    hostSeenAt = wall;
    return true;
  }

  function onMessage(msg: unknown, from: string) {
    if (!isObj(msg) || typeof msg.t !== 'string' || !msg.t.startsWith('w:') || from === selfId) return;
    if (mode === 'host') {
      if (msg.t === 'w:edit' && isObj(msg.e) && JSON.stringify(msg.e).length <= MAX_EDIT_JSON) {
        if (!stamp(msg.e, from) && correlation(msg.e.op) && correlation(msg.e.requestId))
          send({
            t: 'w:rejected',
            to: from,
            op: msg.e.op,
            requestId: msg.e.requestId,
            ...(stampRefusal ? { reason: stampRefusal } : {}),
          });
      } else if (msg.t === 'w:need') serveSnapshot(from);
      return;
    }
    if (mode !== 'client') return;
    // A refusal never elects a host or advances its clock. Only an already-pinned host can settle our request.
    if (msg.t === 'w:rejected') {
      if (from !== hostId || msg.to !== selfId || !correlation(msg.op) || !correlation(msg.requestId)) return;
      for (const fn of rejectedFns) {
        try {
          fn({
            op: msg.op,
            requestId: msg.requestId,
            ...(msg.reason === 'recovery-budget' ? { reason: msg.reason } : {}),
          });
        } catch (err) {
          console.warn('[world] onRejected failed', err);
        }
      }
      return;
    }
    if (!HOST_TYPES.has(msg.t) || !acceptHost(from)) return;
    if (msg.t === 'w:snap') return onSnapChunk(msg);
    noteHostTick(msg.ht);
    if (!ready) return;
    if (msg.t === 'w:hash' && isInt(msg.tick) && isInt(msg.h)) {
      if (msg.tick === world.tick) checkHash(msg.tick, msg.h >>> 0, msg.hs);
      else if (msg.tick > world.tick && pendingHash.size < 8) pendingHash.set(msg.tick, [msg.h >>> 0, msg.hs]);
    } else if (msg.t === 'w:edits' && Array.isArray(msg.list)) {
      for (const q of msg.list) {
        if (!isObj(q) || !isInt(q.tick) || !isInt(q.seq) || !isObj(q.e) || !ops.has(String(q.e.op))) continue;
        if (q.tick <= world.tick) {
          stats.lateEdits++;
          requestResync();
        } else queue.push({ tick: q.tick, seq: q.seq, e: q.e });
        seq = Math.max(seq, q.seq);
      }
    }
  }

  // ------------------------------------------------------------ profiling (npm run perf only)
  // Times every op apply, onApplied/onTick/onAfterTick handler and state hash until stop(), which returns
  // { rows, kinds }: one { label: ms } row per tick, and each label's registry as { label: kind }: 'sim' (op applies,
  // onTick handlers, state hashes), 'applied' (onApplied listeners: rules and render adapters alike) or 'view'
  // (onAfterTick). It swaps timed wrappers into the registries and puts the originals back on stop, so normal play pays
  // nothing; it only reads the clock, and nothing it measures feeds back into the sim. One at a time
  // (a second would wrap the first one's wrappers, and stopping them out of order would leave timers in place).
  let profiling = false;
  function profileTicks(now = () => performance.now()) {
    if (profiling) throw new Error('profileTicks: already profiling; stop() the first one');
    profiling = true;
    let active = true;
    const rows = new Map<number, Record<string, number>>(); // tick -> { label: ms }
    const kinds: Record<string, string> = {}; // label -> 'sim' | 'applied' | 'view'
    const timed = <A extends unknown[], R>(label: string, fn: (...args: A) => R, kind: string) => {
      kinds[label] = kind;
      return (...args: A) => {
        const t0 = now();
        try {
          return fn(...args);
        } finally {
          if (!rows.has(world.tick)) rows.set(world.tick, {});
          const row = rows.get(world.tick)!;
          row[label] = (row[label] ?? 0) + now() - t0;
        }
      };
    };
    const undo: (() => void)[] = [];
    const swap = <H extends object>(map: Map<string, H>, key: string, h: H, field: keyof H & string, label: string) => {
      map.set(key, { ...h, [field]: timed(label, h[field] as (...args: unknown[]) => unknown, 'sim') });
      undo.push(() => map.set(key, h));
    };
    for (const [op, h] of ops) swap(ops, op, h, 'apply', `op ${op}`);
    for (const [k, s] of states) swap(states, k, s, 'hash', `hash ${k}`);
    const swapAll = <F extends (...args: never[]) => unknown>(list: F[], kind: string, name: string) =>
      list.forEach((fn, k) => {
        list[k] = timed(labels.get(fn) || `${name} #${k}`, fn, kind) as F;
        undo.push(() => (list[k] = fn));
      });
    swapAll(appliedFns, 'applied', 'applied');
    swapAll(tickFns, 'sim', 'tick');
    swapAll(afterFns, 'view', 'after');
    return {
      stop() {
        if (active) profiling = active = false;
        for (const fn of undo.splice(0)) fn();
        return { rows: [...rows.values()], kinds };
      },
    };
  }

  // ------------------------------------------------------------ roles + persistence
  function failRecovery(reason: string) {
    recoveryError = reason;
    ready = false;
    snapFail('recovery', reason);
  }
  // One immutable envelope, one outstanding replacement. Stamps, ticking and serving are paused until it resolves.
  // The tail contains every published-but-not-applied edit, so replacement never drops the future queue.
  function recoveryBody(tail: Queued[] = queue, sequence = seq): Omit<RecoveryEnvelope, 'checksum'> {
    return {
      version: 1,
      namespace: cfg.recovery!.namespace,
      catalog: cfg.recovery!.catalog,
      checkpoint: snapshot(),
      hash: worldHash(),
      tail: tail.map(({ tick, seq: entrySeq, e }) => ({ tick, seq: entrySeq, e })),
      seq: sequence,
    };
  }
  function checkpointRecovery(publish: () => void = () => {}) {
    const recovery = cfg.recovery;
    if (!recovery || recoveryPending || recoveryError || badSave) return;
    let envelope: RecoveryEnvelope;
    const savedHash = combine(0, true); // Server-kind states keep changing while the write is out
    try {
      const body = recoveryBody();
      const text = JSON.stringify({ ...body, checksum: recoveryChecksum(body) });
      const bytes = new TextEncoder().encode(text).length;
      if (bytes > MAX_RECOVERY_BYTES || queue.length > MAX_RECOVERY_TAIL) throw new Error('recovery budget exceeded');
      stats.snapBytes = bytes;
      envelope = JSON.parse(text) as RecoveryEnvelope;
    } catch (e) {
      failRecovery(e instanceof Error ? e.message : 'recovery serialization failed');
      return;
    }
    recoveryPending = true;
    const generation = attachment;
    recoveryWork = Promise.resolve()
      .then(() => recovery.write(envelope))
      .then(() => {
        if (attachment !== generation) return;
        recoveryPending = false;
        stats.saves++;
        lastSavedHash = savedHash;
        publish();
      })
      .catch((e: unknown) => {
        if (attachment !== generation) return;
        recoveryPending = false;
        failRecovery(e instanceof Error ? e.message : 'recovery write failed');
      });
  }
  // Used by server close and tests. Also drains a stamp queued by a startup onSnapshot handler (offline resume).
  async function whenDurable() {
    if (!cfg.recovery) return;
    do {
      if (out.length && !recoveryPending && !recoveryError) flush();
      await recoveryWork;
      if (recoveryError) throw new Error(recoveryError);
    } while (recoveryPending || out.length);
  }
  function restoreRecovery(raw: unknown) {
    const recovery = cfg.recovery!;
    if (!isObj(raw) || raw.version !== 1 || raw.namespace !== recovery.namespace || raw.catalog !== recovery.catalog)
      throw new Error('unsupported recovery version, namespace or catalog');
    if (new TextEncoder().encode(JSON.stringify(raw)).length > MAX_RECOVERY_BYTES)
      throw new Error('recovery budget exceeded');
    if (
      !validSnap(raw.checkpoint) ||
      raw.checkpoint.epochMs < 0 ||
      !isInt(raw.hash) ||
      !isInt(raw.seq) ||
      raw.seq < 0 ||
      !isInt(raw.checksum) ||
      !Array.isArray(raw.tail) ||
      raw.tail.length > MAX_RECOVERY_TAIL
    )
      throw new Error('invalid recovery envelope');
    const checkpoint = raw.checkpoint;
    const keys = [...states.keys()];
    if (Object.keys(checkpoint.data).length !== keys.length || keys.some((key) => !(key in checkpoint.data)))
      throw new Error('recovery registry mismatch');
    const tail: Queued[] = [];
    let previous = 0;
    for (const q of raw.tail) {
      if (
        !isObj(q) ||
        !isInt(q.tick) ||
        q.tick <= checkpoint.tick ||
        q.tick > checkpoint.tick + DELAY ||
        !isInt(q.seq) ||
        q.seq <= previous ||
        q.seq > raw.seq ||
        !isObj(q.e) ||
        !ops.has(String(q.e.op)) ||
        !isInt(q.e.i) ||
        !isInt(q.e.j) ||
        typeof q.e.p !== 'string' ||
        typeof q.e.u !== 'string' ||
        JSON.stringify(q.e).length > MAX_EDIT_JSON
      )
        throw new Error('invalid recovery tail');
      previous = q.seq;
      tail.push({ tick: q.tick, seq: q.seq, e: q.e });
    }
    const body: Omit<RecoveryEnvelope, 'checksum'> = {
      version: 1,
      namespace: recovery.namespace,
      catalog: recovery.catalog,
      checkpoint,
      hash: raw.hash,
      tail,
      seq: raw.seq,
    };
    if (recoveryChecksum(body) !== raw.checksum) throw new Error('recovery checksum mismatch');
    const errors = stats.loadErrors;
    if (!loadSnapshot(checkpoint) || stats.loadErrors !== errors || worldHash() !== raw.hash)
      throw new Error('recovery checkpoint hash/load mismatch');
    queue = tail;
    seq = raw.seq;
    // Host sends are disabled while ready=false. Replay uses the ordinary tick order and stored host stamps.
    while (queue.length) step();
  }
  function becomeRecoveryHost() {
    try {
      const raw = cfg.recovery!.read();
      if (raw === null) world.epochMs = cfg.now();
      else restoreRecovery(raw);
    } catch (e) {
      badSave = true;
      failRecovery(e instanceof Error ? e.message : 'recovery load failed');
      return;
    }
    nextHashTick = world.tick + HASH_EVERY;
    checkpointRecovery(() => {
      ready = true;
      for (const fn of snapFns) fn(world.tick);
    });
  }
  const storageKey = () => `boogle.world.${cfg.roomId}`;
  // The host (our server: server/src/host/world-host.ts) keeps the world in its storage; tabs keep nothing.
  // force: write even if no state changed (the tick still moved on: the server's 30 s and shutdown saves).
  // Returns true when it wrote.
  function persist(force = false) {
    if (mode !== 'host' || !ready || badSave) return false;
    if (cfg.recovery && (processingTick || recoveryPending || recoveryError || out.length)) return false;
    const hsh = combine(0, true);
    if (hsh === lastSavedHash && !force) return false;
    if (cfg.recovery) {
      checkpointRecovery();
      return !recoveryError;
    }
    const text = JSON.stringify(snapshot());
    stats.snapBytes = text.length;
    try {
      cfg.storage?.setItem(storageKey(), text);
    } catch (err) {
      console.warn('[world] save failed', err);
      return false; // lastSavedHash unchanged: the next save tries again
    }
    lastSavedHash = hsh;
    stats.saves++;
    return true;
  }
  function loadPersisted(): Snapshot | null {
    try {
      const s = JSON.parse(cfg.storage?.getItem(storageKey()) ?? 'null');
      if (s === null) return null;
      if (validSnap(s)) return s;
      snapFail('local', 'invalid');
    } catch {
      snapFail('local', 'parse'); // a corrupt save
    }
    badSave = true;
    return null;
  }
  // The host starts from its saved world (or a fresh one) and then stamps, ticks, hashes and serves snapshots.
  function becomeHost() {
    mode = 'host';
    hostId = null;
    out = [];
    lastSavedHash = null;
    if (cfg.recovery) return becomeRecoveryHost();
    const snap = loadPersisted();
    const errs = stats.loadErrors;
    if (!snap || !loadSnapshot(snap)) world.epochMs = cfg.now();
    if (stats.loadErrors > errs) badSave = true;
    if (badSave) console.warn('[world] the saved world did not load cleanly: not saving over it');
    ready = true;
    nextHashTick = world.tick + HASH_EVERY;
    for (const fn of snapFns) fn(world.tick);
  }
  function becomeClient() {
    mode = 'client';
    ready = false;
    hostId = null;
    hostTick = 0;
    hostTickAt = 0;
    stepEstimate.reset();
    pendingHash.clear();
    asm = null;
    awaiting = true;
    needAt = wall;
    send({ t: 'w:need' });
  }

  // Join a room. Returns detach(). A tab is a client of the host (the server); the server attaches with host: true.
  function attachWorld(r: WorldRoom, opts: AttachOptions = {}) {
    detachWorld();
    room = r;
    selfId = r.selfId;
    cfg = {
      roomId: String(opts.roomId ?? 'beach'),
      storage: opts.storage ?? null,
      now: opts.now ?? Date.now,
      saveMs: opts.saveMs ?? SAVE_MS,
      recovery: opts.recovery,
    };
    nextSave = wall + cfg.saveMs;
    ready = false;
    queue = [];
    held = [];
    connected = true;
    recoveryPending = false;
    publishing = false;
    recoveryError = null;
    recoveryWork = Promise.resolve();
    cleanup = [r.onMessage(onMessage), r.onConnection(onConnected)];
    if (opts.host) becomeHost();
    else becomeClient();
    return detachWorld;
  }
  function detachWorld() {
    attachment++;
    if (cfg.recovery) {
      recoveryPending = false;
      publishing = false;
      out = [];
    }
    for (const fn of cleanup) fn();
    cleanup = [];
    room = null;
    mode = 'local';
    ready = true;
    held = [];
  }

  return {
    world,
    registerOp,
    registerState,
    registry,
    setEnv: (partial: Obj) => void Object.assign(env, partial), // host-only facts for validate (ctx.env)
    onTick: (fn: (tick: number) => void, label?: string) => addHandler(tickFns, fn, label), // label: its name in `npm run perf`
    onAfterTick: (fn: (tick: number) => void, label?: string) => addHandler(afterFns, fn, label), // fn(tick) after all onTick handlers
    // Listeners type the edit and result they handle (e: { op: 'gift.take', id: number }, ...); the sync passes each the
    // edit as stamped and apply's return value.
    onApplied: (fn: (e: never, tick: number, result: never) => void, label?: string) =>
      addHandler(appliedFns, fn as (e: Obj, tick: number, result: unknown) => void, label), // fn(edit, tick, result of apply)
    onRejected: (fn: (e: EditRejection) => void) => {
      rejectedFns.add(fn);
      return () => rejectedFns.delete(fn);
    },
    onSnapshot: (fn: (tick: number) => void) => snapFns.push(fn), // fn(tick) after state was replaced from a snapshot/persisted copy (rebuild meshes)
    onDesync: (fn: (d: Desync) => void) => desyncFns.push(fn),
    onHashSent: (fn: (tick: number) => void) => hashFns.push(fn),
    onSnapFail: (fn: (f: SnapFail) => void) => snapFailFns.push(fn),
    stateHashes,
    setSelfId: (id: string) => (selfId = id),
    // This tab's player id (src/player/identity.ts), for the edits it stamps itself (local, host). The server learns
    // a tab's from its connection, not from this.
    setPid(u: unknown) {
      if (okPid(u)) pid = u;
    },
    pidOf, // a session's pid, or null
    submitEdit,
    // Opt-in room coordinators own their receipts; the w:edit route correlates bounded requestId refusals itself.
    receiveEdit: (edit: unknown, from: string) =>
      mode === 'host' && isObj(edit) && JSON.stringify(edit).length <= MAX_EDIT_JSON && stamp(edit, from),
    updateWorld,
    stepWorld,
    stepsDropped: () => fixedSteps.dropped(), // host: steps the catch-up cap has dropped
    roomStep,
    onStep: (fn: (step: number) => void) => void stepFns.push(fn), // host: after every 60 Hz step, with the step
    requestResync,
    snapshot,
    loadSnapshot,
    saveNow: (force = false) => persist(force), // force: even if no state changed since the last save
    whenDurable,
    worldHash,
    attachWorld,
    detachWorld,
    worldStatus: () => ({
      mode,
      ready,
      hostId,
      queued: queue.length,
      ...stats,
      badSave,
      recoveryPending,
      recoveryError,
      subsystems,
      lastBad,
    }),
    profileTicks,
  };
}

const S = createSync();
export const world = S.world;
export const {
  registerOp,
  registerState,
  registry,
  setEnv,
  onTick,
  onAfterTick,
  onApplied,
  onRejected,
  onSnapshot,
  onDesync,
  onHashSent,
  onSnapFail,
  stateHashes,
  setSelfId,
  setPid,
  pidOf,
  submitEdit,
  updateWorld,
  roomStep,
  requestResync,
  snapshot,
  loadSnapshot,
  saveNow,
  attachWorld,
  detachWorld,
  worldStatus,
  profileTicks,
} = S;

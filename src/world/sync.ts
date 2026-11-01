// World sync: tick clock + edit pipeline + state registry + snapshots/hashes + persistence. See README.md for the contract.
//
// Roles: 'local' (no room: edits apply next tick), 'host' (authoritative clock, stamps edits), 'client' (follows host).
// The host is our server (server/src/host/world-host.ts attaches with host: true); every tab is a client. All wire messages are `room.send` JSON with a `w:` type. NOTE room.send reaches every
// OTHER peer; a client's message also reaches the other clients (relayed, `from` = origin), so each side ignores types it does not own.
//
//   client -> host   { t:'w:edit', e }                      an edit request (host overwrites e.p with the real sender id
//                                                           and e.u with that sender's pid)
//                    { t:'w:need' }                         please send me a snapshot (late join, desync, late edit)
//   host -> all      { t:'w:edits', ht, list:[{tick,seq,e}] }  stamped edits (tick = host tick + DELAY); ht = host tick now
//                    { t:'w:c', ht }                        clock, every CLOCK_EVERY ticks
//                    { t:'w:hash', tick, h, ht, hs }        worldHash right after `tick` was processed, every HASH_EVERY ticks;
//                                                           hs = { stateKey: hash } so a client can name what diverged
//                    { t:'w:snap', to, id, n, k, s }        chunk k of n (string slice) of JSON { snap, pend, seq, ht, noSave };
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
// Versions: each state registers a `version` (default 0) and `migrate[v]` steps (json at v-1 -> json at v); snapshots
// record them in `vers` (missing = 0) and loads run the steps in order. A state that fails to load starts fresh
// (stats.loadErrors). A state saved by a newer build is skipped, and the host stops saving (so an old server never
// overwrites a newer save); the snapshots it serves carry noSave.

import { okPid } from '../sim/roster.ts';
import type { OpHandlers, StateHandlers, Edit } from './rules/types.ts';

// Wire messages and edits arrive as unchecked JSON objects: every field is read as unknown and checked before use.
type Obj = Record<string, unknown>;
/** A stamped edit waiting for its tick. */
type Queued = { tick: number; seq: number; e: Obj };
type State = StateHandlers & { version: number; migrate: Record<number, (json: unknown) => unknown>; fresh: string };
/** The world as saved and served: tick, seed, epoch, each state's serialized form and version. */
export type Snapshot = { tick: number; seed: number; epochMs: number; data: Obj; vers: Obj };
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
};
type Cfg = {
  roomId: string;
  storage: SaveStore | null;
  now: () => number;
  saveMs: number;
};
type Desync = { tick: number; keys: string[] };
/** Where the host keeps the world: the server's store (world-host.ts), or a stand-in in tests. */
type SaveStore = Pick<Storage, 'getItem' | 'setItem'>;
type SnapFail = { from: string; reason: string };

export const TICK_MS = 100;
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
const HOST_TYPES = new Set(['w:edits', 'w:c', 'w:hash', 'w:snap']); // what a client accepts, only from the host
const isObj = (v: unknown): v is Obj => v !== null && typeof v === 'object' && !Array.isArray(v);
const isInt = (v: unknown): v is number => Number.isSafeInteger(v);
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

// opts.env: host-only facts handed to validate as ctx.env (they may differ per machine, so never to apply or ticks).
export function createSync({ env: env0 }: { env?: Obj } = {}) {
  const world = { tick: 0, seed: 20261028, epochMs: 0 };
  const env: Obj = { ...(env0 ?? {}) };
  const ops = new Map<string, OpHandlers<object>>();
  const states = new Map<string, State>();
  const tickFns: ((tick: number) => void)[] = [];
  const afterFns: ((tick: number) => void)[] = []; // fn(tick) after every onTick handler (render work that reads the tick's final state)
  const appliedFns: ((e: Obj, tick: number, result: unknown) => void)[] = [];
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
    loadErrors: 0, // states that failed to load (bad data or a throwing migration) and started fresh
    snapBytes: 0, // characters of the last snapshot saved or served (budget: 60 KB, test/world-size.test.ts)
  };
  let newerSave = false;
  const skipped = new Set<string>(); // states a snapshot held from a newer build: left out of hash checks // a loaded snapshot held a state from a newer build: never persist over it
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
  // handlers: { serialize, load, hash, version = 0, migrate = { [v]: json => json } }. What serialize returns now is the
  // state's fresh form, loaded when a snapshot's copy fails.
  function registerState(key: string, handlers: StateHandlers) {
    if (states.has(key)) throw new Error('duplicate state ' + key);
    const version = handlers.version ?? 0;
    if (!isInt(version) || version < 0) throw new Error(`state ${key}: bad version ${version}`);
    states.set(key, {
      ...handlers,
      version,
      migrate: handlers.migrate ?? {},
      fresh: JSON.stringify(handlers.serialize()),
    });
  }
  const registry = () => ({ ops: [...ops.keys()], states: [...states.keys()] });
  function addHandler<F>(list: F[], fn: F, label?: string) {
    list.push(fn);
    if (label) labels.set(fn, label);
  }

  // ------------------------------------------------------------ edits
  // Host (or local): validate, stamp, queue, broadcast.
  function stamp(edit: Obj, from: string) {
    const h = ops.get(String(edit.op));
    if (!ready || !h || !isInt(edit.i) || !isInt(edit.j)) return false;
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
    const entry = { tick: world.tick + delay, seq: ++seq, e };
    queue.push(entry);
    if (mode === 'host') {
      out.push(entry);
      if (out.length === 1) queueMicrotask(flush);
    }
    return true;
  }
  function flush() {
    if (!out.length) return;
    const list = out;
    out = [];
    send({ t: 'w:edits', ht: world.tick, list });
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
    // A client whose room just came back re-pins at once, instead of waiting HOST_STALE_MS (the server restarted: its
    // clock and hashes start over).
    if (c && !connected && mode === 'client') {
      hostId = null;
      hostTick = 0;
      hostTickAt = 0;
      pendingHash.clear();
    }
    connected = c;
  }
  // One held edit per HELD_EVERY_MS, in submission order: a burst would land on one host tick.
  function releaseHeld() {
    while (held.length && wall - held[0].at > HELD_MAX_MS) {
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
        console.error('[world] apply failed', err);
      }
    }
    for (const fn of tickFns) fn(t);
    for (const fn of afterFns) fn(t);
    if (mode === 'host') {
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
    }
    if (n >= MAX_STEPS) acc = 0;
    saveSoon();
  }
  function saveSoon() {
    if (mode === 'local' || wall < nextSave) return;
    nextSave = wall + cfg.saveMs;
    persist();
  }

  // ------------------------------------------------------------ snapshots + hashes
  function snapshot(): Snapshot {
    const data: Obj = {},
      vers: Obj = {};
    for (const [k, s] of states) {
      data[k] = s.serialize();
      vers[k] = s.version;
    }
    return { tick: world.tick, seed: world.seed, epochMs: world.epochMs, data, vers };
  }
  function validSnap(s: unknown): s is Snapshot {
    return isObj(s) && isInt(s.tick) && s.tick >= 0 && isInt(s.seed) && isInt(s.epochMs) && isObj(s.data);
  }
  function loadSnapshot(snap: unknown) {
    if (!validSnap(snap)) return false;
    world.tick = snap.tick;
    world.seed = snap.seed;
    world.epochMs = snap.epochMs;
    const vers: Obj = isObj(snap.vers) ? snap.vers : {};
    for (const [k, s] of states) if (k in snap.data) loadState(k, s, snap.data[k], vers[k] ?? 0);
    queue = [];
    acc = 0;
    pendingHash.clear();
    return true;
  }
  // One state from a snapshot: migrate from its saved version up to ours, then load. Never throws.
  function loadState(k: string, s: State, json: unknown, v: unknown) {
    if (isInt(v) && v > s.version) {
      newerSave = true;
      skipped.add(k);
      console.warn(`[world] ${k} was saved by a newer build (v${v} > v${s.version}): skipped; not saving`);
      snapFail('state', `${k} newer`);
      return;
    }
    try {
      if (!isInt(v) || v < 0) throw new Error(`bad version ${v}`);
      for (let x = v + 1; x <= s.version; x++) if (s.migrate[x]) json = s.migrate[x](json);
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
  function combine(h0: number) {
    let h = h0;
    for (const [, s] of states) h = (Math.imul(h ^ s.hash(), 16777619) >>> 0) | 0;
    return h >>> 0;
  }
  function worldHash() {
    return combine(world.tick | 0);
  }
  function stateHashes() {
    const out: Record<string, number> = {};
    for (const [k, s] of states) out[k] = s.hash() >>> 0;
    return out;
  }

  function checkHash(tick: number, h: number, hs0: unknown) {
    if (tick !== world.tick) return;
    // Per-state hashes, when the host sent them, decide: compared over the states both sides have, minus any this tab
    // skipped as newer (a host, such as the server, may hold states this build lacks, and the reverse). The combined
    // hash `h` decides only for a host that sent no per-state hashes.
    const hs = isObj(hs0) ? hs0 : {};
    const all = isObj(hs0) ? stateHashes() : null;
    const mine = all && Object.fromEntries(Object.entries(all).filter(([k]) => k in hs && !skipped.has(k)));
    if (mine) subsystems = Object.fromEntries(Object.keys(mine).map((k) => [k, mine[k] === hs[k] ? 'ok' : 'bad']));
    const agree = mine ? Object.keys(mine).every((k) => mine[k] === hs[k]) : worldHash() === h;
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
    if (!ready || wall - (served.get(to) ?? -1e9) < 1500) return;
    served.set(to, wall);
    const pend = queue.map(({ tick, seq: s, e }) => ({ tick, seq: s, e }));
    // noSave: this tab skipped a state from a newer build, so what it serves must not become anyone's save either.
    const json = JSON.stringify({ snap: snapshot(), pend, seq, ht: world.tick, noSave: newerSave });
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
    if (p.noSave === true) newerSave = true;
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
      pendingHash.clear();
    }
    if (from !== hostId) return false;
    hostSeenAt = wall;
    return true;
  }

  function onMessage(msg: unknown, from: string) {
    if (!isObj(msg) || typeof msg.t !== 'string' || !msg.t.startsWith('w:') || from === selfId) return;
    if (mode === 'host') {
      if (msg.t === 'w:edit' && isObj(msg.e) && JSON.stringify(msg.e).length <= MAX_EDIT_JSON) stamp(msg.e, from);
      else if (msg.t === 'w:need') serveSnapshot(from);
      return;
    }
    if (mode !== 'client') return;
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
  const storageKey = () => `boogle.world.${cfg.roomId}`;
  // The host (our server: server/src/host/world-host.ts) keeps the world in its storage; tabs keep nothing.
  // force: write even if no state changed (the tick still moved on: the server's 30 s and shutdown saves).
  // Returns true when it wrote.
  function persist(force = false) {
    if (mode !== 'host' || !ready || newerSave) return false;
    const hsh = combine(0);
    if (hsh === lastSavedHash && !force) return false;
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
    return null;
  }
  // The host starts from its saved world (or a fresh one) and then stamps, ticks, hashes and serves snapshots.
  function becomeHost() {
    mode = 'host';
    hostId = null;
    out = [];
    lastSavedHash = null;
    const snap = loadPersisted();
    if (!snap || !loadSnapshot(snap)) world.epochMs = cfg.now();
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
    };
    nextSave = wall + cfg.saveMs;
    ready = false;
    queue = [];
    held = [];
    connected = true;
    cleanup = [r.onMessage(onMessage), r.onConnection(onConnected)];
    if (opts.host) becomeHost();
    else becomeClient();
    return detachWorld;
  }
  function detachWorld() {
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
    updateWorld,
    snapshot,
    loadSnapshot,
    saveNow: (force = false) => persist(force), // force: even if no state changed since the last save
    worldHash,
    attachWorld,
    detachWorld,
    worldStatus: () => ({ mode, ready, hostId, queued: queue.length, ...stats, newerSave, subsystems, lastBad }),
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
  snapshot,
  loadSnapshot,
  saveNow,
  attachWorld,
  detachWorld,
  worldStatus,
  profileTicks,
} = S;

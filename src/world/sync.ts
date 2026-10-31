// World sync: tick clock + edit pipeline + state registry + snapshots/hashes + persistence. See README.md for the contract.
//
// Roles: 'local' (no room: edits apply next tick), 'host' (authoritative clock, stamps edits), 'client' (follows host).
// The host is whoever room.isHost() says. All wire messages are `room.send` JSON with a `w:` type. NOTE room.send reaches every
// OTHER peer; a client's message also reaches the other clients (relayed, `from` = origin), so each side ignores types it does not own.
//
//   client -> host   { t:'w:edit', e }                      an edit request (host overwrites e.p with the real sender id
//                                                           and e.u with that sender's pid)
//                    { t:'w:need' }                         please send me a snapshot (late join, desync, late edit)
//   any -> all       { t:'w:id', u }                        this tab's player id (pid, src/player/identity.ts). Sent before
//                                                           w:need, by a new host, after a reconnect and when a client
//                                                           re-pins the host; every tab keeps selfId -> pid, so a
//                                                           promoted client already knows the room's pids
//   host -> all      { t:'w:edits', ht, list:[{tick,seq,e}] }  stamped edits (tick = host tick + DELAY); ht = host tick now
//                    { t:'w:c', ht }                        clock, every CLOCK_EVERY ticks
//                    { t:'w:hash', tick, h, ht, hs }        worldHash right after `tick` was processed, every HASH_EVERY ticks;
//                                                           hs = { stateKey: hash } so a client can name what diverged
//                    { t:'w:snap', to, id, n, k, s }        chunk k of n (string slice) of JSON { snap, pend, seq, ht, noSave, ids };
//                                                           only `to` uses it. pend = stamped edits not yet applied at snap.tick (so a
//                                                           joiner misses none); ids = the host's [selfId, pid] pairs
// Player ids: `p` on an edit is the session (selfId), `u` the player (pid) that outlives a reload. The host sets both
// from its own records and never from the edit; an edit from a peer whose pid it doesn't know is rejected.
// Clients pin the first sender of a host-type message as the host (re-pinned if it was silent for HOST_STALE_MS, i.e. migration).
// Host migration: the new host continues from its own state, bumps seq, stamps with extra delay for a while and hashes soon.
// Edits a client submitted that the old host never stamped are lost. Edits submitted while the room is down (a client
// reconnecting after a stall) are held; once it is back they go to the host (or are stamped here, once ready, if this tab
// came back as the host) one per HELD_EVERY_MS, so a burst never lands on one host tick. Held edits older than HELD_MAX_MS
// are dropped (stats.heldDropped): the player has moved on. So is the rest of the backlog once a fresh edit is submitted
// with the room back: the fresh one waits only for the next HELD_EVERY_MS slot, so live input is never stuck behind it.
// A client that receives an edit for a tick it already passed, or a hash mismatch, asks for a snapshot (w:need) and
// replaces its state.
//
// Persistence: every SAVE_MS (30 s) and on pagehide, a peer that is ready and not awaiting a snapshot saves the world to
// localStorage (`boogle.world.<roomId>`) if its state changed since its last save. The host saves any tick; a client
// only a tick whose hash just matched the host's, so a diverged copy is never kept (on pagehide a client is rarely on
// such a tick, so its copy is usually its last periodic save). Only the host also PUTs
// { tick, writerId, data } to the server's /rooms/:id/snapshot (bodies under 250 KB; keepalive on unload only under
// 60 KB). A tab that becomes host without state loads the newest by tick of its local and server copies (the server gets
// 3 s); a migrating host keeps its live state, and its first save always uploads.
//
// Versions: each state registers a `version` (default 0) and `migrate[v]` steps (json at v-1 -> json at v); snapshots
// record them in `vers` (missing = 0) and loads run the steps in order. A state that fails to load starts fresh
// (stats.loadErrors); on a client nothing vouches for that until a host hash matches, so if it takes over as host first
// it loads the newest saved copy instead of keeping (and uploading) the fallback. A state saved by a newer build is
// skipped, and this tab stops persisting, so an old tab never overwrites a newer save; the snapshots it serves carry
// noSave, so the clients that load them stop persisting too.

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
  onMessage(h: (m: unknown, from: string) => void): () => void;
  onConnection(h: (connected: boolean) => void): () => void;
  onHostChange(h: (isHost: boolean) => void): () => void;
  isHost(): boolean;
};
export type AttachOptions = {
  roomId?: string;
  serverUrl?: string;
  storage?: SaveStore | null;
  fetch?: typeof fetch;
  now?: () => number;
};
type Cfg = { roomId: string; serverUrl: string; storage: SaveStore | null; fetch: typeof fetch; now: () => number };
type Desync = { tick: number; keys: string[] };
/** Where a peer keeps its copy of the world: localStorage, or a stand-in in tests. */
type SaveStore = Pick<Storage, 'getItem' | 'setItem'>;
type SnapFail = { from: string; reason: string };

export const TICK_MS = 100;
const DELAY = 3; // host stamps edits this many ticks ahead
const CLOCK_EVERY = 2;
const HASH_EVERY = 20; // 2 s
const LAG = 1.5; // clients aim to run this many ticks behind the host
const LEAD = 2; // never run past last known host tick + LEAD (< DELAY, so stamped edits always arrive in time)
const MAX_STEPS = 5; // ticks per frame
const CHUNK = 7000; // chars of snapshot JSON per message (peer-room caps messages at 16 KB, escaping can double)
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
const MAX_PIDS = 256; // selfId -> pid records kept (sessions seen this page load)
const ID_EVERY_MS = 5000; // a client repeats its w:id this often, so a host that missed or dropped it learns it again
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
  let newerSave = false; // a loaded snapshot held a state from a newer build: never persist over it
  // A client's state fell back to fresh and no host hash has vouched for it since: if it takes over as host it must not
  // keep (and upload) that state, but load the saved copy instead.
  let unverifiedFallback = false;
  let subsystems: Record<string, 'ok' | 'bad'> = {}; // stateKey -> 'ok' | 'bad' from the latest hash check (client)
  let lastBad: Desync | null = null; // { tick, keys } of the latest mismatch
  let queue: Queued[] = []; // [{ tick, seq, e }] stamped, not yet applied
  let seq = 0;
  let selfId = 'local';
  let pid: string | null = null; // this tab's player id (setPid); until set, its selfId stands in (tests, the first frames)
  const myPid = () => pid ?? selfId;
  const pids = new Map<string, string>(); // selfId -> pid of every tab heard from (w:id, snapshot ids)
  let acc = 0;
  let wall = 0; // ms of frame time seen by updateWorld (all timers use this, so tests are deterministic)

  let mode: 'local' | 'host' | 'client' = 'local';
  let room: WorldRoom | null = null;
  let cfg = {} as Cfg; // set by attachWorld
  let cleanup: (() => void)[] = [];
  let connected = true;
  let ready = true; // false until we hold authoritative state
  let epoch = 0; // bumps on every role change (cancels stale async loads)
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
  let extraUntil = 0;
  let nextHashTick = HASH_EVERY;
  let lastSavedHash: number | null = null;
  let nextSave = SAVE_MS;
  let verifiedTick = -1; // client: the tick whose hash last matched the host's (the only state a client may save)

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
    const u = from === selfId ? myPid() : pids.get(from);
    if (!u) return false; // no w:id from that tab yet (it repeats one every ID_EVERY_MS)
    if (h.hostOnly && from !== selfId) return false; // an op only the host itself submits (a broadcast can't be replayed)
    const e = { ...edit, p: from, u }; // never trust a client-supplied p or u
    try {
      if (h.validate && !h.validate(e as unknown as Edit, { from, tick: world.tick, env })) return false;
    } catch (err) {
      console.warn('[world] validate threw', err);
      return false;
    }
    const delay = mode === 'local' ? 1 : DELAY + (wall < extraUntil ? 3 : 0);
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
  // peer-room reports the new role before the connection; updateWorld delivers what was held once it is back.
  function onConnected(c: boolean) {
    connected = c;
  }
  let nextIdAt = 0;
  function sendId() {
    nextIdAt = wall + ID_EVERY_MS;
    send({ t: 'w:id', u: myPid() });
  }
  // Whether a session is in the room now (unknown without room.peers: assume it is).
  const live = (sid: string) => !room?.peers || room.peers().some((p) => p.peer === sid);
  // A pid belongs to one live session: a claim on a pid that this tab or another live session holds is ignored, so
  // a tab can't play as someone who is here (their pid is public in presence). The claimant keeps repeating its w:id
  // and gets the pid once the holder has left (a reload's old session times out in a few seconds).
  function notePid(from: unknown, u: unknown) {
    if (!okPid(u) || typeof from !== 'string' || from === selfId || pids.get(from) === u) return;
    if (u === myPid()) return;
    for (const [sid, v] of pids) if (v === u && sid !== from && live(sid)) return;
    pids.delete(from); // re-inserted last, so the oldest record goes first when full
    pids.set(from, u as string);
    if (pids.size <= MAX_PIDS) return;
    const gone = [...pids.keys()].find((sid) => !live(sid)) ?? pids.keys().next().value;
    if (gone !== undefined) pids.delete(gone);
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
      if (connected && wall >= nextIdAt) sendId();
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
      return; // a client saves from checkHash, at a tick the host just vouched for
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
    nextSave = wall + SAVE_MS;
    persist(false);
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
    verifiedTick = -1; // a loaded snapshot is verified only by the next hash check
    const vers: Obj = isObj(snap.vers) ? snap.vers : {};
    unverifiedFallback = false;
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
      if (mode === 'client') unverifiedFallback = true;
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
    const hs = isObj(hs0) ? hs0 : {};
    const mine = isObj(hs0) ? stateHashes() : null;
    if (mine) subsystems = Object.fromEntries(Object.keys(mine).map((k) => [k, mine[k] === hs[k] ? 'ok' : 'bad']));
    if (worldHash() === h) {
      stats.hashOk++;
      verifiedTick = tick;
      unverifiedFallback = false;
      saveSoon();
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
    const ids = [...pids, [selfId, myPid()]];
    const json = JSON.stringify({ snap: snapshot(), pend, seq, ht: world.tick, noSave: newerSave, ids });
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
    if (Array.isArray(p.ids)) for (const r of p.ids.slice(0, MAX_PIDS)) if (Array.isArray(r)) notePid(r[0], r[1]);
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
      if (hostId !== null) sendId(); // a migration: make sure the new host knows our pid before our next edit
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
    if (msg.t === 'w:id') return notePid(from, msg.u); // every tab keeps the map, in any role
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
  // Every peer keeps the latest world in its own storage, so whoever hosts next starts from it; only the host uploads.
  // A client saves only at a tick whose hash just matched the host's, so a diverged copy never becomes the next world.
  function persist(unloading: boolean) {
    if (mode === 'local' || !ready || awaiting || newerSave || (mode === 'client' && verifiedTick !== world.tick))
      return;
    const hsh = combine(0);
    if (hsh === lastSavedHash) return;
    lastSavedHash = hsh;
    const snap = snapshot();
    const text = JSON.stringify(snap);
    stats.snapBytes = text.length;
    try {
      cfg.storage?.setItem(storageKey(), text);
    } catch {
      // quota or private mode: ignore
    }
    const body =
      mode === 'host' && cfg.serverUrl ? JSON.stringify({ tick: snap.tick, writerId: selfId, data: snap }) : '';
    if (body && body.length < 250000) {
      const url = new URL(`/rooms/${cfg.roomId}/snapshot`, cfg.serverUrl);
      const init: RequestInit = {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body,
        keepalive: unloading && body.length < 60000,
      };
      cfg.fetch(url, init).catch(() => {});
      stats.saves++;
    }
  }
  async function loadPersisted() {
    let best: Snapshot | null = null as Snapshot | null;
    const consider = (s: unknown, from: string) => {
      if (s === null || s === undefined) return;
      if (!validSnap(s)) return snapFail(from, 'invalid');
      if (!best || s.tick > best.tick) best = s;
    };
    try {
      consider(JSON.parse(cfg.storage?.getItem(storageKey()) ?? 'null'), 'local');
    } catch {
      snapFail('local', 'parse'); // corrupt local copy
    }
    if (cfg.serverUrl) {
      try {
        const res = await cfg.fetch(new URL(`/rooms/${cfg.roomId}/snapshot`, cfg.serverUrl), {
          signal: AbortSignal.timeout(3000),
        });
        if (res.ok) consider((await res.json()).data, 'server');
        else if (res.status !== 404) snapFail('server', `http ${res.status}`);
      } catch (err) {
        // unreachable or garbled: go on with the local copy or a fresh world
        const reason =
          err instanceof SyntaxError ? 'parse' : (err as Error)?.name === 'TimeoutError' ? 'timeout' : 'unreachable';
        snapFail('server', reason);
      }
    }
    return best;
  }
  async function becomeHost() {
    const my = ++epoch;
    mode = 'host';
    hostId = null;
    out = [];
    // Client leftovers: a host waits for no snapshot (a stale flag would stop persist), and its first save always
    // uploads, even if its local copy as a client already recorded this hash.
    awaiting = false;
    asm = null;
    lastSavedHash = null;
    sendId();
    if (ready && !unverifiedFallback) {
      // Migration: our state is in sync; keep going, stamp conservatively, hash soon so others can resync.
      seq += 1000;
      extraUntil = wall + 2000;
      nextHashTick = world.tick + 4;
      return;
    }
    // No state yet, or a fallback no hash has vouched for: start from the newest saved copy instead.
    ready = false;
    const snap = await loadPersisted();
    if (my !== epoch) return;
    if (!snap || !loadSnapshot(snap)) world.epochMs = cfg.now();
    ready = true;
    nextHashTick = world.tick + HASH_EVERY;
    for (const fn of snapFns) fn(world.tick);
  }
  function becomeClient() {
    epoch++;
    mode = 'client';
    ready = false;
    hostId = null;
    hostTick = 0;
    hostTickAt = 0;
    awaiting = true;
    needAt = wall;
    sendId(); // before w:need and before any held edit is released: the same reliable channel keeps the order
    send({ t: 'w:need' });
  }

  // Join a room. Returns detach(). opts: { roomId, serverUrl?, storage?, fetch?, now? }
  function attachWorld(r: WorldRoom, opts: AttachOptions = {}) {
    detachWorld();
    room = r;
    selfId = r.selfId;
    cfg = {
      roomId: String(opts.roomId ?? 'beach'),
      serverUrl: opts.serverUrl || '',
      storage: opts.storage ?? (typeof localStorage === 'undefined' ? null : localStorage),
      fetch: opts.fetch ?? globalThis.fetch?.bind(globalThis),
      now: opts.now ?? Date.now,
    };
    ready = false;
    queue = [];
    held = [];
    connected = true;
    cleanup = [
      r.onMessage(onMessage),
      r.onConnection(onConnected),
      r.onHostChange((isHost) => {
        if (isHost) becomeHost();
        else if (mode !== 'client') becomeClient();
      }),
    ];
    if (typeof addEventListener === 'function') {
      const onHide = () => persist(true);
      addEventListener('pagehide', onHide);
      cleanup.push(() => removeEventListener('pagehide', onHide));
    }
    if (r.isHost()) becomeHost();
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
    epoch++;
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
    // This tab's player id (src/player/identity.ts); announced at once if a room is attached.
    setPid(u: unknown) {
      if (!okPid(u) || u === pid) return;
      pid = u as string;
      sendId();
    },
    pidOf: (sid: string) => (sid === selfId ? myPid() : (pids.get(sid) ?? null)), // a session's pid, or null
    submitEdit,
    updateWorld,
    snapshot,
    loadSnapshot,
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
  attachWorld,
  detachWorld,
  worldStatus,
  profileTicks,
} = S;

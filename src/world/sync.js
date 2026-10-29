// World sync: tick clock + edit pipeline + state registry + snapshots/hashes + persistence. See README.md for the contract.
//
// Roles: 'local' (no room: edits apply next tick), 'host' (authoritative clock, stamps edits), 'client' (follows host).
// The host is whoever room.isHost() says. All wire messages are `room.send` JSON with a `w:` type. NOTE room.send reaches every
// OTHER peer; a client's message also reaches the other clients (relayed, `from` = origin), so each side ignores types it does not own.
//
//   client -> host   { t:'w:edit', e }                      an edit request (host overwrites e.p with the real sender id)
//                    { t:'w:need' }                         please send me a snapshot (late join, desync, late edit)
//   host -> all      { t:'w:edits', ht, list:[{tick,seq,e}] }  stamped edits (tick = host tick + DELAY); ht = host tick now
//                    { t:'w:c', ht }                        clock, every CLOCK_EVERY ticks
//                    { t:'w:hash', tick, h, ht, hs }        worldHash right after `tick` was processed, every HASH_EVERY ticks;
//                                                           hs = { stateKey: hash } so a client can name what diverged
//                    { t:'w:snap', to, id, n, k, s }        chunk k of n (string slice) of JSON { snap, pend, seq, ht }; only `to` uses it.
//                                                           pend = stamped edits not yet applied at snap.tick (so a joiner misses none)
// Clients pin the first sender of a host-type message as the host (re-pinned if it was silent for HOST_STALE_MS, i.e. migration).
// Host migration: the new host continues from its own state, bumps seq, stamps with extra delay for a while and hashes soon.
// Edits a client submitted that the old host never stamped are lost. A client that receives an edit for a tick it already
// passed, or a hash mismatch, asks for a snapshot (w:need) and replaces its state.

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
const HOST_STALE_MS = 3000;
const SAVE_MS = 30000;
const isObj = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const isInt = Number.isSafeInteger;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

export function createSync() {
  const world = { tick: 0, seed: 20261028, epochMs: 0 };
  const ops = new Map();
  const states = new Map();
  const tickFns = [];
  const appliedFns = [];
  const labels = new Map(); // handler fn -> name shown by profileTicks
  const snapFns = [];
  const desyncFns = []; // fn({ tick, keys }) on a client whose hash disagreed with the host's (keys = diverged states)
  const hashFns = []; // fn(tick) on the host right after it sent a hash
  const snapFailFns = []; // fn({ from: 'peer'|'local'|'server', reason }) when a snapshot could not be loaded
  const stats = { resyncs: 0, snapsSent: 0, snapsLoaded: 0, hashOk: 0, hashBad: 0, lateEdits: 0, saves: 0 };
  let subsystems = {}; // stateKey -> 'ok' | 'bad' from the latest hash check (client)
  let lastBad = null; // { tick, keys } of the latest mismatch
  let queue = []; // [{ tick, seq, e }] stamped, not yet applied
  let seq = 0;
  let selfId = 'local';
  let acc = 0;
  let wall = 0; // ms of frame time seen by updateWorld (all timers use this, so tests are deterministic)

  let mode = 'local';
  let room = null;
  let cfg = {};
  let cleanup = [];
  let connected = true;
  let ready = true; // false until we hold authoritative state
  let epoch = 0; // bumps on every role change (cancels stale async loads)
  let hostId = null;
  let hostSeenAt = 0;
  let hostTick = 0;
  let hostTickAt = 0;
  const pendingHash = new Map();
  let needAt = -1e9;
  let awaiting = false;
  let asm = null; // snapshot being assembled
  let snapId = 0;
  const served = new Map();
  let out = []; // stamped edits waiting to be broadcast
  let extraUntil = 0;
  let nextHashTick = HASH_EVERY;
  let lastSavedHash = null;
  let nextSave = SAVE_MS;

  const snapFail = (from, reason) => {
    for (const fn of snapFailFns) fn({ from, reason });
  };
  const send = (m) => {
    if (!room || !connected) return;
    try {
      room.send(m);
    } catch (e) {
      console.warn('[world] send failed', e);
    }
  };

  // ------------------------------------------------------------ registry
  function registerOp(op, handlers) {
    ops.set(op, handlers);
  }
  function registerState(key, handlers) {
    states.set(key, handlers);
  }
  function addHandler(list, fn, label) {
    list.push(fn);
    if (label) labels.set(fn, label);
  }

  // ------------------------------------------------------------ edits
  // Host (or local): validate, stamp, queue, broadcast.
  function stamp(edit, from) {
    const h = ops.get(edit?.op);
    if (!ready || !h || !isInt(edit.i) || !isInt(edit.j)) return false;
    const e = { ...edit, p: from }; // never trust a client-supplied p
    try {
      if (h.validate && !h.validate(e, { from, tick: world.tick })) return false;
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

  function submitEdit(edit) {
    if (!isObj(edit) || !ops.has(edit.op) || !isInt(edit.i) || !isInt(edit.j)) return false;
    if (mode === 'client') {
      const e = { ...edit, p: selfId };
      if (JSON.stringify(e).length > MAX_EDIT_JSON) return false;
      send({ t: 'w:edit', e });
      return true;
    }
    return stamp(edit, selfId);
  }

  // ------------------------------------------------------------ tick
  function step() {
    const t = world.tick + 1;
    const due = queue.filter((q) => q.tick <= t).sort((a, b) => a.tick - b.tick || a.seq - b.seq);
    queue = queue.filter((q) => q.tick > t);
    world.tick = t;
    for (const { e } of due) {
      try {
        ops.get(e.op)?.apply(e, t);
        for (const fn of appliedFns) fn(e, t);
      } catch (err) {
        console.error('[world] apply failed', err);
      }
    }
    for (const fn of tickFns) fn(t);
    if (mode === 'host') {
      if (t % CLOCK_EVERY === 0) send({ t: 'w:c', ht: t });
      if (t >= nextHashTick) {
        nextHashTick = t + HASH_EVERY;
        send({ t: 'w:hash', tick: t, h: worldHash(), ht: t, hs: stateHashes() });
        for (const fn of hashFns) fn(t);
      }
    } else if (mode === 'client' && pendingHash.has(t)) {
      checkHash(t, ...pendingHash.get(t));
    }
    for (const k of pendingHash.keys()) if (k <= t) pendingHash.delete(k);
  }

  // Called from the frame loop with real elapsed seconds; runs whole ticks only.
  function updateWorld(dt) {
    wall += dt * 1000;
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
    if (mode === 'host' && wall >= nextSave) {
      nextSave = wall + SAVE_MS;
      persist(false);
    }
  }

  // ------------------------------------------------------------ snapshots + hashes
  function snapshot() {
    const data = {};
    for (const [k, s] of states) data[k] = s.serialize();
    return { tick: world.tick, seed: world.seed, epochMs: world.epochMs, data };
  }
  function validSnap(s) {
    return isObj(s) && isInt(s.tick) && s.tick >= 0 && isInt(s.seed) && isInt(s.epochMs) && isObj(s.data);
  }
  function loadSnapshot(snap) {
    if (!validSnap(snap)) return false;
    world.tick = snap.tick;
    world.seed = snap.seed;
    world.epochMs = snap.epochMs;
    for (const [k, s] of states) if (k in snap.data) s.load(snap.data[k]);
    queue = [];
    acc = 0;
    pendingHash.clear();
    return true;
  }
  function combine(h0) {
    let h = h0;
    for (const [, s] of states) h = (Math.imul(h ^ s.hash(), 16777619) >>> 0) | 0;
    return h >>> 0;
  }
  function worldHash() {
    return combine(world.tick | 0);
  }
  function stateHashes() {
    const out = {};
    for (const [k, s] of states) out[k] = s.hash() >>> 0;
    return out;
  }

  function checkHash(tick, h, hs) {
    if (tick !== world.tick) return;
    const mine = isObj(hs) ? stateHashes() : null;
    if (mine) subsystems = Object.fromEntries(Object.keys(mine).map((k) => [k, mine[k] === hs[k] ? 'ok' : 'bad']));
    if (worldHash() === h) stats.hashOk++;
    else {
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

  function serveSnapshot(to) {
    if (!ready || wall - (served.get(to) ?? -1e9) < 1500) return;
    served.set(to, wall);
    const pend = queue.map(({ tick, seq: s, e }) => ({ tick, seq: s, e }));
    const json = JSON.stringify({ snap: snapshot(), pend, seq, ht: world.tick });
    const id = ++snapId;
    const n = Math.ceil(json.length / CHUNK);
    for (let k = 0; k < n; k++) send({ t: 'w:snap', to, id, n, k, s: json.slice(k * CHUNK, (k + 1) * CHUNK) });
    stats.snapsSent++;
  }
  function onSnapChunk(m) {
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
  function applyPayload(p) {
    if (!isObj(p) || !validSnap(p.snap) || !Array.isArray(p.pend)) return false;
    loadSnapshot(p.snap);
    queue = p.pend.filter(
      (q) => isObj(q) && isInt(q.tick) && isInt(q.seq) && isObj(q.e) && q.tick > world.tick && ops.has(q.e.op),
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
  function noteHostTick(ht) {
    if (isInt(ht) && (ht > hostTick || hostTickAt === 0)) {
      hostTick = ht;
      hostTickAt = wall;
    }
  }
  function acceptHost(from) {
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

  function onMessage(msg, from) {
    if (!isObj(msg) || typeof msg.t !== 'string' || !msg.t.startsWith('w:') || from === selfId) return;
    if (mode === 'host') {
      if (msg.t === 'w:edit' && isObj(msg.e) && JSON.stringify(msg.e).length <= MAX_EDIT_JSON) stamp(msg.e, from);
      else if (msg.t === 'w:need') serveSnapshot(from);
      return;
    }
    if (mode !== 'client') return;
    if (!['w:edits', 'w:c', 'w:hash', 'w:snap'].includes(msg.t) || !acceptHost(from)) return;
    if (msg.t === 'w:snap') return onSnapChunk(msg);
    noteHostTick(msg.ht);
    if (!ready) return;
    if (msg.t === 'w:hash' && isInt(msg.tick) && isInt(msg.h)) {
      if (msg.tick === world.tick) checkHash(msg.tick, msg.h >>> 0, msg.hs);
      else if (msg.tick > world.tick && pendingHash.size < 8) pendingHash.set(msg.tick, [msg.h >>> 0, msg.hs]);
    } else if (msg.t === 'w:edits' && Array.isArray(msg.list)) {
      for (const q of msg.list) {
        if (!isObj(q) || !isInt(q.tick) || !isInt(q.seq) || !isObj(q.e) || !ops.has(q.e.op)) continue;
        if (q.tick <= world.tick) {
          stats.lateEdits++;
          requestResync();
        } else queue.push({ tick: q.tick, seq: q.seq, e: q.e });
        seq = Math.max(seq, q.seq);
      }
    }
  }

  // ------------------------------------------------------------ profiling (npm run perf only)
  // Times every op apply, onApplied/onTick handler and state hash until stop(), which returns one { label: ms } row
  // per tick. It swaps timed wrappers into the registries and puts the originals back on stop, so normal play pays
  // nothing; it only reads the clock, and nothing it measures feeds back into the sim.
  function profileTicks(now = () => performance.now()) {
    const rows = new Map(); // tick -> { label: ms }
    const timed =
      (label, fn) =>
      (...args) => {
        const t0 = now();
        try {
          return fn(...args);
        } finally {
          if (!rows.has(world.tick)) rows.set(world.tick, {});
          const row = rows.get(world.tick);
          row[label] = (row[label] ?? 0) + now() - t0;
        }
      };
    const undo = [];
    const swap = (map, key, h, field, label) => {
      map.set(key, { ...h, [field]: timed(label, h[field]) });
      undo.push(() => map.set(key, h));
    };
    for (const [op, h] of ops) swap(ops, op, h, 'apply', `op ${op}`);
    for (const [k, s] of states) swap(states, k, s, 'hash', `hash ${k}`);
    const swapAll = (list, kind) =>
      list.forEach((fn, k) => {
        list[k] = timed(labels.get(fn) || `${kind} #${k}`, fn);
        undo.push(() => (list[k] = fn));
      });
    swapAll(appliedFns, 'applied');
    swapAll(tickFns, 'tick');
    return {
      stop() {
        for (const fn of undo.splice(0)) fn();
        return [...rows.values()];
      },
    };
  }

  // ------------------------------------------------------------ roles + persistence
  const storageKey = () => `boogle.world.${cfg.roomId}`;
  function persist(unloading) {
    if (mode !== 'host' || !ready) return;
    const hsh = combine(0);
    if (hsh === lastSavedHash) return;
    lastSavedHash = hsh;
    const snap = snapshot();
    const body = JSON.stringify({ tick: snap.tick, writerId: selfId, data: snap });
    try {
      cfg.storage?.setItem(storageKey(), JSON.stringify(snap));
    } catch {
      // quota or private mode: ignore
    }
    if (cfg.serverUrl && body.length < 250000) {
      const url = new URL(`/rooms/${cfg.roomId}/snapshot`, cfg.serverUrl);
      const init = {
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
    let best = null;
    const consider = (s, from) => {
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
        const reason = err instanceof SyntaxError ? 'parse' : err?.name === 'TimeoutError' ? 'timeout' : 'unreachable';
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
    if (ready) {
      // Migration: our state is in sync; keep going, stamp conservatively, hash soon so others can resync.
      seq += 1000;
      extraUntil = wall + 2000;
      nextHashTick = world.tick + 4;
      return;
    }
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
    send({ t: 'w:need' });
  }

  // Join a room. Returns detach(). opts: { roomId, serverUrl?, storage?, fetch?, now? }
  function attachWorld(r, opts = {}) {
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
    connected = true;
    cleanup = [
      r.onMessage(onMessage),
      r.onConnection((c) => (connected = c)),
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
    epoch++;
  }

  return {
    world,
    registerOp,
    registerState,
    onTick: (fn, label) => addHandler(tickFns, fn, label), // label: its name in `npm run perf`
    onApplied: (fn, label) => addHandler(appliedFns, fn, label),
    onSnapshot: (fn) => snapFns.push(fn), // fn(tick) after state was replaced from a snapshot/persisted copy (rebuild meshes)
    onDesync: (fn) => desyncFns.push(fn),
    onHashSent: (fn) => hashFns.push(fn),
    onSnapFail: (fn) => snapFailFns.push(fn),
    stateHashes,
    setSelfId: (id) => (selfId = id),
    submitEdit,
    updateWorld,
    snapshot,
    loadSnapshot,
    worldHash,
    attachWorld,
    detachWorld,
    worldStatus: () => ({ mode, ready, hostId, queued: queue.length, ...stats, subsystems, lastBad }),
    profileTicks,
  };
}

const S = createSync();
export const world = S.world;
export const {
  registerOp,
  registerState,
  onTick,
  onApplied,
  onSnapshot,
  onDesync,
  onHashSent,
  onSnapFail,
  stateHashes,
  setSelfId,
  submitEdit,
  updateWorld,
  snapshot,
  loadSnapshot,
  worldHash,
  attachWorld,
  detachWorld,
  worldStatus,
  profileTicks,
} = S;

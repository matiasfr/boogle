// Room clock and server checkpoint. Clients mirror replication; they never run shared rules.
// Only w:c (the server clock) remains here. Commands and receipts belong to r:* / s.
import { SERVER_ID } from '../net/ids.ts';
import { RULE_MS, RULE_STEPS, STEP_MS, createFixedSteps, createStepEstimate } from './room-clock.ts';
import type { StateHandlers } from './rules/types.ts';

type Obj = Record<string, unknown>;
type State = StateHandlers & { fresh: string };
export type Snapshot = { tick: number; seed: number; epochMs: number; data: Obj };
/** Current namespace only: a verified checkpoint, with no classic edit journal. */
export type RecoveryEnvelope = {
  version: 1;
  namespace: string;
  catalog: string;
  checkpoint: Snapshot;
  hash: number;
  checksum: number;
};
export type RecoveryStore = {
  namespace: string;
  catalog: string;
  read(): unknown;
  /** Resolve only after atomic replacement succeeds; refusal and I/O errors must reject. */
  write(envelope: RecoveryEnvelope): Promise<void>;
};
export const MAX_RECOVERY_BYTES = 128000;
export type WorldRoom = {
  selfId: string;
  send(m: unknown): void;
  peers?: () => readonly { peer: string }[];
  pidOf?: (sid: string) => string | null;
  onMessage(h: (m: unknown, from: string) => void): () => void;
  onConnection(h: (connected: boolean) => void): () => void;
};
type SaveStore = Pick<Storage, 'getItem' | 'setItem'>;
export type AttachOptions = {
  roomId?: string;
  host?: boolean;
  storage?: SaveStore | null;
  now?: () => number;
  saveMs?: number;
  recovery?: RecoveryStore;
};
type Cfg = {
  roomId: string;
  storage: SaveStore | null;
  now: () => number;
  saveMs: number;
  recovery?: RecoveryStore;
};
export const TICK_MS = RULE_MS;
const CLOCK_EVERY = 2;
const SAVE_MS = 30000;
const isObj = (v: unknown): v is Obj => v !== null && typeof v === 'object' && !Array.isArray(v);
const isInt = (v: unknown): v is number => Number.isSafeInteger(v);
function recoveryChecksum(value: Omit<RecoveryEnvelope, 'checksum'>) {
  const text = JSON.stringify(value);
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619) >>> 0;
  return h;
}

export function createSync() {
  const world = { tick: 0, seed: 20261028, epochMs: 0 };
  const states = new Map<string, State>();
  const tickFns: ((tick: number) => void)[] = [];
  const afterFns: ((tick: number) => void)[] = [];
  const snapFns: ((tick: number) => void)[] = [];
  const stepFns: ((step: number) => void)[] = [];
  const labels = new Map<unknown, string>();
  const stats = { saves: 0, loadErrors: 0, snapBytes: 0 };
  // A failed-load fallback is never an authoritative save. Restart with a fresh sync to clear this guard.
  let badSave = false;
  let wall = 0;
  let phase = 0;
  const fixedSteps = createFixedSteps();
  const stepEstimate = createStepEstimate();
  let mode: 'local' | 'host' | 'client' = 'local';
  let room: WorldRoom | null = null;
  let cfg = {} as Cfg;
  let cleanup: (() => void)[] = [];
  let connected = true;
  let ready = true;
  let lastSavedHash: number | null = null;
  let nextSave = SAVE_MS;
  let recoveryPending = false;
  let recoveryError: string | null = null;
  let recoveryWork: Promise<void> = Promise.resolve();
  let attachment = 0;
  let processingTick = false;

  function registerState(key: string, handlers: StateHandlers, opts: { server: true }) {
    if (opts?.server !== true) throw new Error('only server states may be registered');
    if (mode === 'client') throw new Error('clients mirror server states');
    if (states.has(key)) throw new Error('duplicate state ' + key);
    states.set(key, { ...handlers, fresh: JSON.stringify(handlers.serialize()) });
  }
  const registry = () => ({ states: [...states.keys()] });
  function addHandler<F>(list: F[], fn: F, label?: string) {
    list.push(fn);
    if (label) labels.set(fn, label);
  }
  const send = (m: unknown) => {
    if (!room || !connected) return;
    try {
      room.send(m);
    } catch (e) {
      console.warn('[world] send failed', e);
    }
  };
  function failRecovery(reason: string) {
    recoveryError = reason;
    ready = false;
  }
  function step() {
    processingTick = true;
    try {
      world.tick++;
      for (const fn of tickFns) fn(world.tick);
      for (const fn of afterFns) fn(world.tick);
      if (mode === 'host' && world.tick % CLOCK_EVERY === 0) send({ t: 'w:c', ht: world.tick });
    } catch (e) {
      failRecovery('server tick failed');
      throw e;
    } finally {
      processingTick = false;
    }
  }
  function updateWorld(dt: number) {
    if (!Number.isFinite(dt) || dt <= 0) return;
    if (mode !== 'client') return stepWorld(dt * 1000);
    wall += dt * 1000;
    if (!ready || !connected) return;
    const tick = stepEstimate.tick(wall);
    if (tick !== world.tick && tick >= 0) {
      world.tick = tick;
      // View notifications only: clients never execute onTick shared rules.
      for (const fn of afterFns) fn(tick);
    }
  }
  function stepWorld(ms: number) {
    if (mode === 'client') throw new Error('stepWorld drives the host clock; a client follows it with updateWorld');
    if (!Number.isFinite(ms)) return;
    fixedSteps.advance(ms, hostStep);
  }
  function hostStep() {
    wall += STEP_MS;
    // Immutable periodic writes do not stop simulation. Startup and failures do.
    if (!ready || recoveryError || badSave) return;
    if (phase < RULE_STEPS - 1) phase++;
    else {
      step();
      phase = 0;
      saveSoon();
    }
    for (const fn of stepFns) fn(roomStep());
  }
  function roomStep() {
    if (mode !== 'client') return world.tick * RULE_STEPS + phase;
    const est = stepEstimate.now(wall);
    return est < 0 ? -1 : Math.floor(est);
  }
  function saveSoon() {
    if (mode !== 'host' || wall < nextSave) return;
    nextSave = wall + cfg.saveMs;
    persist();
  }
  function snapshot(): Snapshot {
    const data: Obj = {};
    for (const [k, s] of states) data[k] = s.serialize();
    return { tick: world.tick, seed: world.seed, epochMs: world.epochMs, data };
  }
  function validSnap(s: unknown): s is Snapshot {
    return (
      isObj(s) && isInt(s.tick) && s.tick >= 0 && isInt(s.seed) && isInt(s.epochMs) && s.epochMs >= 0 && isObj(s.data)
    );
  }
  function loadSnapshot(snap: unknown) {
    if (!validSnap(snap)) return false;
    const keys = [...states.keys()];
    if (Object.keys(snap.data).length !== keys.length || keys.some((k) => !Object.hasOwn(snap.data, k))) return false;
    world.tick = snap.tick;
    world.seed = snap.seed;
    world.epochMs = snap.epochMs;
    for (const [k, s] of states) {
      try {
        s.load(snap.data[k]);
      } catch (err) {
        stats.loadErrors++;
        badSave = true;
        console.warn(`[world] ${k} failed to load; refusing to save fallback`, err);
        try {
          s.load(JSON.parse(s.fresh));
        } catch (freshError) {
          console.error(`[world] ${k} fresh load failed`, freshError);
        }
      }
    }
    phase = 0;
    fixedSteps.reset();
    return !badSave;
  }
  function combine(h0: number) {
    let h = h0;
    for (const s of states.values()) h = Math.imul(h ^ s.hash(), 16777619) >>> 0;
    return h >>> 0;
  }
  /** Checkpoint integrity only. No client hashes or cross-client agreement. */
  const worldHash = () => combine(world.tick | 0);
  function onMessage(msg: unknown, from: string) {
    if (mode !== 'client' || !connected || from !== SERVER_ID || !isObj(msg) || msg.t !== 'w:c') return;
    if (!isInt(msg.ht) || msg.ht < 0 || !Number.isSafeInteger(msg.ht * RULE_STEPS)) return;
    stepEstimate.hear(msg.ht * RULE_STEPS, wall);
    world.tick = stepEstimate.tick(wall);
    if (!ready) {
      ready = true;
      for (const fn of snapFns) fn(world.tick);
    }
  }
  function onConnected(c: boolean) {
    connected = c;
    if (mode !== 'client') return;
    ready = false;
    stepEstimate.reset();
  }
  // Profiling wraps tick/view handlers and checkpoint hashes; normal play pays no timing cost.
  let profiling = false;
  function profileTicks(now = () => performance.now()) {
    if (profiling) throw new Error('profileTicks: already profiling; stop() the first one');
    profiling = true;
    let active = true;
    const rows = new Map<number, Record<string, number>>();
    const kinds: Record<string, string> = {};
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
    for (const [k, s] of states) {
      states.set(k, { ...s, hash: timed(`hash ${k}`, s.hash, 'sim') });
      undo.push(() => states.set(k, s));
    }
    const swapAll = (list: ((tick: number) => void)[], kind: string, name: string) =>
      list.forEach((fn, k) => {
        list[k] = timed(labels.get(fn) || `${name} #${k}`, fn, kind);
        undo.push(() => (list[k] = fn));
      });
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
  function checkpointRecovery(publish: () => void = () => {}) {
    const recovery = cfg.recovery;
    if (!recovery || recoveryPending || recoveryError || badSave) return;
    let envelope: RecoveryEnvelope;
    let savedHash: number;
    try {
      savedHash = combine(0);
      const body: Omit<RecoveryEnvelope, 'checksum'> = {
        version: 1,
        namespace: recovery.namespace,
        catalog: recovery.catalog,
        checkpoint: snapshot(),
        hash: worldHash(),
      };
      const text = JSON.stringify({ ...body, checksum: recoveryChecksum(body) });
      const bytes = new TextEncoder().encode(text).length;
      if (bytes > MAX_RECOVERY_BYTES) throw new Error('recovery budget exceeded');
      stats.snapBytes = bytes;
      envelope = JSON.parse(text) as RecoveryEnvelope;
    } catch (e) {
      failRecovery(e instanceof Error ? e.message : 'recovery serialization failed');
      return;
    }
    recoveryPending = true;
    const generation = attachment;
    recoveryWork = Promise.resolve()
      .then(() => {
        if (attachment !== generation || recoveryError || badSave) throw new Error('checkpoint no longer safe');
        return recovery.write(envelope);
      })
      .then(() => {
        if (attachment !== generation) return;
        recoveryPending = false;
        stats.saves++;
        lastSavedHash = savedHash;
        if (!recoveryError && !badSave) publish();
      })
      .catch((e: unknown) => {
        if (attachment !== generation) return;
        recoveryPending = false;
        failRecovery(e instanceof Error ? e.message : 'recovery write failed');
      });
  }
  async function whenDurable() {
    if (!cfg.recovery) return;
    do {
      await recoveryWork;
      if (recoveryError) throw new Error(recoveryError);
    } while (recoveryPending);
  }
  function restoreRecovery(raw: unknown) {
    const recovery = cfg.recovery!;
    if (!isObj(raw) || raw.version !== 1 || raw.namespace !== recovery.namespace || raw.catalog !== recovery.catalog)
      throw new Error('unsupported recovery version, namespace or catalog');
    if (new TextEncoder().encode(JSON.stringify(raw)).length > MAX_RECOVERY_BYTES)
      throw new Error('recovery budget exceeded');
    if (!validSnap(raw.checkpoint) || !isInt(raw.hash) || !isInt(raw.checksum))
      throw new Error('invalid recovery envelope');
    const body: Omit<RecoveryEnvelope, 'checksum'> = {
      version: 1,
      namespace: recovery.namespace,
      catalog: recovery.catalog,
      checkpoint: raw.checkpoint,
      hash: raw.hash,
    };
    if (recoveryChecksum(body) !== raw.checksum) throw new Error('recovery checksum mismatch');
    if (!loadSnapshot(raw.checkpoint) || worldHash() !== raw.hash)
      throw new Error('recovery checkpoint hash/load mismatch');
  }
  function becomeHost() {
    mode = 'host';
    try {
      if (cfg.recovery) {
        const raw = cfg.recovery.read();
        if (raw === null) world.epochMs = cfg.now();
        else restoreRecovery(raw);
        checkpointRecovery(() => {
          ready = true;
          for (const fn of snapFns) fn(world.tick);
        });
        return;
      }
      const raw: unknown = JSON.parse(cfg.storage?.getItem(storageKey()) ?? 'null');
      if (raw === null) world.epochMs = cfg.now();
      else if (!loadSnapshot(raw)) throw new Error('saved state did not load cleanly');
      ready = true;
      for (const fn of snapFns) fn(world.tick);
    } catch (e) {
      badSave = true;
      failRecovery(e instanceof Error ? e.message : 'checkpoint load failed');
    }
  }
  const storageKey = () => `boogle.world.${cfg.roomId}`;
  function persist(force = false) {
    if (mode !== 'host' || !ready || badSave || processingTick || recoveryPending || recoveryError) return false;
    const hsh = combine(0);
    if (hsh === lastSavedHash && !force) return false;
    if (cfg.recovery) {
      checkpointRecovery();
      return !recoveryError;
    }
    if (!cfg.storage) return false;
    try {
      const text = JSON.stringify(snapshot());
      stats.snapBytes = new TextEncoder().encode(text).length;
      cfg.storage.setItem(storageKey(), text);
    } catch (err) {
      console.warn('[world] save failed', err);
      return false;
    }
    lastSavedHash = hsh;
    stats.saves++;
    return true;
  }
  function attachWorld(r: WorldRoom, opts: AttachOptions = {}) {
    if (!opts.host && states.size) throw new Error('clients mirror server states');
    detachWorld();
    room = r;
    cfg = {
      roomId: String(opts.roomId ?? 'beach'),
      storage: opts.storage ?? null,
      now: opts.now ?? Date.now,
      saveMs: opts.saveMs ?? SAVE_MS,
      recovery: opts.recovery,
    };
    nextSave = wall + cfg.saveMs;
    ready = false;
    connected = true;
    lastSavedHash = null;
    recoveryPending = false;
    recoveryError = null;
    recoveryWork = Promise.resolve();
    phase = 0;
    fixedSteps.reset();
    stepEstimate.reset();
    mode = opts.host ? 'host' : 'client';
    cleanup = [r.onMessage(onMessage), r.onConnection(onConnected)];
    if (opts.host) becomeHost();
    return detachWorld;
  }
  function detachWorld() {
    attachment++;
    for (const fn of cleanup) fn();
    cleanup = [];
    room = null;
    mode = 'local';
    ready = true;
    recoveryPending = false;
    stepEstimate.reset();
  }
  return {
    world,
    registerState,
    registry,
    onTick: (fn: (tick: number) => void, label?: string) => addHandler(tickFns, fn, label),
    onAfterTick: (fn: (tick: number) => void, label?: string) => addHandler(afterFns, fn, label),
    onSnapshot: (fn: (tick: number) => void) => void snapFns.push(fn),
    updateWorld,
    stepWorld,
    stepsDropped: () => fixedSteps.dropped(),
    roomStep,
    onStep: (fn: (step: number) => void) => void stepFns.push(fn),
    snapshot,
    loadSnapshot,
    saveNow: (force = false) => persist(force),
    whenDurable,
    worldHash,
    attachWorld,
    detachWorld,
    worldStatus: () => ({ mode, ready, ...stats, badSave, recoveryPending, recoveryError }),
    profileTicks,
  };
}
const S = createSync();
export const world = S.world;
export const {
  registerState,
  registry,
  onTick,
  onAfterTick,
  onSnapshot,
  updateWorld,
  roomStep,
  snapshot,
  loadSnapshot,
  saveNow,
  attachWorld,
  detachWorld,
  worldStatus,
  profileTicks,
} = S;

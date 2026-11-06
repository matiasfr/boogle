// Local anticipation over the server's conserved T1 accounts. Neither receipts nor animation callbacks spend cargo.
import { SERVER_ID } from '../net/ids.ts';
import { RAILWAY_SOURCES, RAILWAY_T1 } from '../sim/railway-layout.ts';
import {
  railInt,
  railYaw,
  railJobs,
  railActiveStation,
  railCarry,
  RAILWAY_MAX_INT,
  RAILWAY_WINDOW,
  type RailResult,
} from '../sim/railway.ts';
import {
  LINE1_STATIONS,
  LINE1_ROCKS,
  LINE1_HARDWOODS,
  type RailMaterial,
  type LineStationId,
} from '../sim/railway-line-layout.ts';
import type { RailwayApi } from '../world/rules/railway.ts';
import { LINE_TIMING } from '../sim/railway-line.ts';
import type { createSync, WorldRoom } from '../world/sync.ts';

type Sync = Pick<
  ReturnType<typeof createSync>,
  | 'world'
  | 'worldStatus'
  | 'stateHashes'
  | 'onApplied'
  | 'onAfterTick'
  | 'onSnapshot'
  | 'onDesync'
  | 'onSnapFail'
  | 'requestResync'
>;
export type RailwayIntent =
  | { op: 'rail.wake' }
  | { op: 'rail.chop'; id: number; yaw?: number; collapsed?: boolean }
  | { op: 'rail.mine'; id: number }
  | { op: 'rail.axe' | 'rail.beamChop' | 'rail.jump' }
  | { op: 'rail.beamTake'; revision: number }
  | { op: 'rail.beamDrop'; revision: number; x: number; y: number; z: number }
  | { op: 'rail.beamDeposit'; revision: number; station: 'T3' }
  | { op: 'rail.take'; id: number; kind?: RailMaterial }
  | { op: 'rail.rackTake'; kind?: RailMaterial }
  | { op: 'rail.deposit'; station: LineStationId; n: number; kind?: RailMaterial }
  | { op: 'rail.drop'; x: number; y?: number; z: number; n: number; kind?: RailMaterial };
export type RailwayAccepted = Readonly<
  RailwayIntent & { pid: string; epoch: number; request: number; accepted: number; tick: number }
>;
type Pending = {
  intent: RailwayIntent;
  epoch: number;
  request: number;
  incoming: number;
  outgoing: number;
  sentAt: number;
  retry: boolean;
};
type Listener = {
  applied(e: Record<string, unknown>, tick: number, result: unknown): void;
  tick(): void;
  snapshot(): void;
  lost(): void;
};
// Sync's registration API has page lifetime. One router per sync keeps entity remounts from adding subscriptions.
const routers = new WeakMap<object, Set<Listener>>();
function listen(sync: Sync, listener: Listener) {
  let rows = routers.get(sync);
  if (!rows) {
    rows = new Set();
    routers.set(sync, rows);
    const listeners = rows;
    sync.onApplied((e: Record<string, unknown>, tick: number, result: unknown) => {
      for (const row of listeners) row.applied(e, tick, result);
    }, 'railway-view');
    sync.onAfterTick(() => {
      for (const row of listeners) row.tick();
    }, 'railway-view');
    sync.onSnapshot(() => {
      for (const row of listeners) row.snapshot();
    });
    sync.onDesync(() => {
      for (const row of listeners) row.lost();
    });
    sync.onSnapFail(() => {
      for (const row of listeners) row.lost();
    });
  }
  rows.add(listener);
  return () => rows.delete(listener);
}
const object = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const identity = (v: Record<string, unknown>) =>
  railInt(v.epoch, RAILWAY_MAX_INT, 1) && railInt(v.request, RAILWAY_MAX_INT, 1);
const key = (epoch: number, request: number) => `${epoch}:${request}`;
function result(v: unknown): v is RailResult & Record<string, unknown> {
  return (
    object(v) &&
    identity(v) &&
    typeof v.pid === 'string' &&
    railInt(v.accepted, RAILWAY_T1.carry) &&
    ['accepted', 'noop', 'rejected', 'snapshot-required'].includes(String(v.status))
  );
}
function intentOf(e: Record<string, unknown>): RailwayIntent | null {
  if (e.op === 'rail.wake') return { op: e.op };
  const kind = e.kind === 1 ? 1 : 0;
  if (e.op === 'rail.axe' || e.op === 'rail.beamChop' || e.op === 'rail.jump') return { op: e.op };
  if (e.op === 'rail.mine' && railInt(e.id, 2)) return { op: e.op, id: e.id };
  if (e.op === 'rail.beamTake' && railInt(e.revision)) return { op: e.op, revision: e.revision };
  if (e.op === 'rail.beamDeposit' && railInt(e.revision) && e.station === 'T3')
    return { op: e.op, revision: e.revision, station: 'T3' };
  if (
    e.op === 'rail.beamDrop' &&
    railInt(e.revision) &&
    railInt(e.x, 200000, -200000) &&
    railInt(e.y, 200000, -200000) &&
    railInt(e.z, 200000, -200000)
  )
    return { op: e.op, revision: e.revision, x: e.x, y: e.y, z: e.z };
  if (e.op === 'rail.rackTake') return { op: e.op, kind };
  if (e.op === 'rail.take' && railInt(e.id)) return { op: e.op, id: e.id, kind };
  if (e.op === 'rail.chop' && railInt(e.id))
    return {
      op: e.op,
      id: e.id,
      ...(railYaw(e.yaw) && typeof e.collapsed === 'boolean' ? { yaw: e.yaw, collapsed: e.collapsed } : {}),
    };
  if (
    e.op === 'rail.deposit' &&
    (e.station === 'T1' || e.station === 'T2' || e.station === 'T3') &&
    railInt(e.n, RAILWAY_T1.carry, 1)
  )
    return { op: e.op, station: e.station, n: e.n, kind };
  if (
    e.op === 'rail.drop' &&
    railInt(e.n, RAILWAY_T1.carry, 1) &&
    railInt(e.x, 200000, -200000) &&
    railInt(e.z, 200000, -200000)
  )
    return { op: e.op, x: e.x, z: e.z, n: e.n, kind, ...(railInt(e.y, 200000, -200000) ? { y: e.y } : {}) };
  return null;
}

export function createRailwayAdapter({ api, sync, pid }: { api: RailwayApi; sync: Sync; pid: string }) {
  const pending = new Map<string, Pending>();
  const effects = new Set<(event: RailwayAccepted) => void>();
  const resets = new Set<() => void>();
  const seen = new Set<string>();
  let room: WorldRoom | null = null;
  let offRoom: (() => void)[] = [];
  let connected = false;
  let disposed = false;
  let verified = false;
  let recovering = false;
  let epoch = 0;
  let next = 1;
  let status: 'connecting' | 'starting' | 'ready' | 'busy' | 'storage' | 'reconciling' = 'connecting';
  let clock = 0;
  let probeAt = -Infinity;
  let snapshotAt = -Infinity;
  let observedLoadErrors = 0;
  let lastGood: ReturnType<typeof readState> | null = null;
  const resetView = () => {
    for (const fn of resets) fn();
  };
  const healthy = () => {
    const s = sync.worldStatus();
    return s.mode === 'client' && s.ready && !s.badSave && !s.recoveryError;
  };
  const available = () =>
    !disposed &&
    connected &&
    verified &&
    !recovering &&
    healthy() &&
    epoch > 0 &&
    api.account(pid)?.epoch === epoch &&
    status !== 'storage' &&
    ![...pending.values()].some((p) => p.retry) &&
    untracked() === 0;

  function untracked() {
    const account = api.account(pid);
    if (!account || account.epoch !== epoch) return 0;
    let tracked = 0;
    for (const p of pending.values()) if (p.epoch === epoch && p.request > account.request) tracked++;
    // A same-tab entity remount may inherit a server window without the former Local anticipation records.
    return Math.max(0, next - account.request - 1 - tracked);
  }

  function needSnapshot() {
    recovering = true;
    status = 'reconciling';
    if (connected && room && clock - snapshotAt >= 1000) {
      snapshotAt = clock;
      sync.requestResync();
    }
  }
  function reconcile() {
    if (!verified || !healthy()) return;
    const account = api.account(pid);
    for (const [id, p] of pending) {
      // Read accepted state, never the response's quantity. Later epoch/watermark also retires evicted outcomes.
      if (account && (account.epoch > p.epoch || (account.epoch === p.epoch && account.request >= p.request)))
        pending.delete(id);
    }
    if (available()) status = 'ready';
  }
  function probe() {
    if (!connected || !room || clock - probeAt < 500) return;
    probeAt = clock;
    if (!epoch) room.send({ t: 'r:open' });
    if (!verified || recovering || status === 'storage') return;
    for (const p of pending.values()) {
      if (p.epoch !== epoch || clock - p.sentAt < 1000) continue;
      // A status reply never allocates a new identity. Re-admission, if needed, retries the original operation.
      if (p.retry) room.send({ t: 'r:edit', e: { ...p.intent, epoch: p.epoch, request: p.request } });
      else room.send({ t: 'r:status', epoch: p.epoch, request: p.request });
    }
  }
  function hear(message: unknown, from: string) {
    if (disposed || from !== SERVER_ID || !object(message) || message.to !== room?.selfId) return;
    if (
      message.t === 'r:session' &&
      railInt(message.epoch, RAILWAY_MAX_INT, 1) &&
      railInt(message.next, RAILWAY_MAX_INT, 1)
    ) {
      if (message.epoch < epoch) return;
      // Repeated open replies can arrive after a newer Local intent. Never rewind or reinterpret that identity.
      next = message.epoch === epoch ? Math.max(next, message.next) : message.next;
      epoch = message.epoch;
      if (status !== 'storage') status = 'starting';
      reconcile();
    } else if (message.t === 'r:result' && result(message) && message.pid === pid) {
      if (message.status === 'snapshot-required') needSnapshot();
      // Accepted/no-op/rejected responses may arrive before this client's apply; retain reservations until then.
      reconcile();
    } else if (message.t === 'r:state') {
      if (message.state === 'storage') status = 'storage';
      else if (message.state === 'snapshot-required' || message.state === 'invalid') needSnapshot();
      else if (message.state === 'busy') {
        status = 'busy';
        if (identity(message)) {
          const p = pending.get(key(message.epoch as number, message.request as number));
          if (p) p.retry = true;
        }
      } else if (message.state === 'starting') status = 'starting';
    }
  }
  const unlisten = listen(sync, {
    applied(e, tick, value) {
      if (disposed) return;
      reconcile();
      if (
        !connected ||
        !verified ||
        recovering ||
        !healthy() ||
        !result(value) ||
        value.status !== 'accepted' ||
        !value.accepted
      )
        return;
      const intent = intentOf(e);
      if (!intent) return;
      const id = `${value.pid}:${key(value.epoch, value.request)}`;
      if (seen.has(id)) return;
      seen.add(id);
      if (seen.size > 64) seen.delete(seen.values().next().value!);
      // The edit was validated and stamped by the host; this listener runs only after deterministic application.
      const event: RailwayAccepted = Object.freeze({ ...intent, ...value, tick });
      for (const fn of effects) fn(event);
    },
    tick: reconcile,
    snapshot() {
      if (disposed) return;
      const errors = sync.worldStatus().loadErrors;
      verified = healthy() && errors === observedLoadErrors;
      observedLoadErrors = errors;
      recovering = !verified;
      if (status === 'storage') status = 'starting';
      reconcile();
      resetView();
      probeAt = -Infinity;
    },
    lost() {
      verified = false;
      needSnapshot();
      resetView();
    },
  });

  function reservations() {
    let incoming = 0,
      outgoing = 0,
      logs = 0,
      stone = 0;
    for (const p of pending.values()) {
      incoming += p.incoming;
      outgoing += p.outgoing;
      if ('kind' in p.intent && p.intent.kind === 1) stone += p.outgoing;
      else logs += p.outgoing;
    }
    return { incoming, outgoing, logs, stone };
  }
  function submit(intent: RailwayIntent, incoming = 0, outgoing = 0): boolean {
    reconcile();
    if (!available() || !room || pending.size >= RAILWAY_WINDOW || next >= RAILWAY_MAX_INT) return false;
    const held = reservations();
    const account = api.account(pid);
    const carry = account ? railCarry(account) : 0;
    const stone = 'kind' in intent && intent.kind === 1;
    const balance = stone ? (account?.stone ?? 0) : (account?.carry ?? 0);
    if (incoming > RAILWAY_T1.carry - carry - held.incoming || outgoing > balance - (stone ? held.stone : held.logs))
      return false;
    const beam = api.railway.line?.beam;
    if (beam?.state === 'held' && beam.holder === pid && (incoming || outgoing)) return false;
    if (intent.op === 'rail.beamTake' && (carry || held.incoming || held.outgoing || pending.size)) return false;
    if (
      intent.op === 'rail.wake' &&
      (api.phase() !== 'asleep' || [...pending.values()].some((p) => p.intent.op === 'rail.wake'))
    )
      return false;
    if (intent.op === 'rail.chop' && ['asleep', 'waking'].includes(api.phase())) return false;
    if (intent.op === 'rail.deposit' && api.phase() !== 'idle') return false;
    const request = next++;
    pending.set(key(epoch, request), { intent, epoch, request, incoming, outgoing, sentAt: clock, retry: false });
    room.send({ t: 'r:edit', e: { ...intent, epoch, request } });
    return true;
  }

  function readState() {
    const s = api.railway;
    const activeStation = railActiveStation(s);
    const stations = railJobs(s).map((job, i) =>
      Object.freeze({
        id: LINE1_STATIONS[i]!.id,
        stock: job.stock,
        allocation: job.allocation,
        used: job.used,
        delivered: job.delivered,
        stoneStock: job.stoneStock ?? 0,
        stoneAllocation: job.stoneAllocation ?? 0,
        stoneUsed: job.stoneUsed ?? 0,
        stoneDelivered: job.stoneDelivered ?? 0,
        start: job.start,
        elapsed: job.elapsed,
        lastTick: job.lastTick,
        completion: job.completion,
        timing: Object.freeze({ ...(job.timing ?? LINE_TIMING) }),
      }),
    );
    const current = stations[activeStation]!;
    const panels = api.panels();
    return Object.freeze({
      tick: sync.world.tick,
      ...api.movement(),
      panelCount: panels.committed,
      panelStock: panels.stock,
      hash: sync.stateHashes().railway,
      phase: api.phase(),
      carry: api.account(pid)?.carry ?? 0,
      stoneCarry: api.account(pid)?.stone ?? 0,
      activeStation,
      stations: Object.freeze(stations),
      axe: s.line?.axe ?? false,
      jump: s.line?.jump ?? false,
      beam: s.line ? Object.freeze({ ...s.line.beam }) : null,
      rocks: Object.freeze(
        LINE1_ROCKS.map((rock, i) =>
          Object.freeze({
            ...rock,
            remaining: s.line?.rocks[i] ?? 0,
            work: s.line?.rockWork[i] ?? 0,
            age: s.line?.rockAge[i] ?? 0,
          }),
        ),
      ),
      stoneRack: s.line?.stoneRack ?? 0,
      hardwood: Object.freeze([...(s.line?.hardwood ?? [])]),
      upgrades: Object.freeze([...(s.line?.upgrades ?? [])]),
      hardwoodWork: Object.freeze([...(s.line?.hardwoodWork ?? [])]),
      awake: s.awake,
      start: current.start,
      elapsed: current.elapsed,
      completion: stations.reduce((n, job) => n + job.completion, 0),
      stock: current.stock,
      allocation: current.allocation,
      used: current.used,
      delivered: current.delivered,
      counts: Object.freeze(api.counts()),
      rack: s.supply?.rack ?? 0,
      growth: Object.freeze(s.sources.map((_n, k) => Math.max(0, (s.supply?.ages[k] ?? 0) - 31))),
      sources: Object.freeze([...s.sources]),
      work: Object.freeze([...s.work]),
      falls: s.falls
        ? Object.freeze({ yaw: Object.freeze([...s.falls.yaw]), collapsed: Object.freeze([...s.falls.collapsed]) })
        : undefined,
      piles: Object.freeze(s.piles.map((p) => Object.freeze({ ...p }))),
      accounts: Object.freeze(s.accounts.map((a) => Object.freeze({ ...a }))),
    });
  }
  function inspect() {
    if (verified && healthy() && !recovering) lastGood = readState();
    const state = lastGood ?? readState();
    const held = reservations();
    return Object.freeze({
      ...state,
      pid,
      status,
      connected,
      ready: available(),
      epoch,
      next,
      pending: pending.size,
      reservations: Object.freeze(held),
      availableCarry: Math.max(0, state.carry - held.logs),
      availableStone: Math.max(0, state.stoneCarry - held.stone),
      freeCarry: Math.max(0, RAILWAY_T1.carry - state.carry - state.stoneCarry - held.incoming),
    });
  }
  return {
    inspect,
    attach(nextRoom: WorldRoom) {
      if (disposed || room === nextRoom) return;
      for (const off of offRoom) off();
      room = nextRoom;
      epoch = 0;
      connected = true;
      verified = healthy() && sync.worldStatus().loadErrors === 0;
      recovering = !verified;
      status = 'starting';
      probeAt = -Infinity;
      offRoom = [
        room.onMessage(hear),
        room.onConnection((live) => {
          connected = live;
          if (!live) {
            verified = false;
            recovering = true; // The unsolicited reconnect snapshot may be throttled; keep requesting until verified.
            epoch = 0;
            status = 'connecting';
            resetView();
          } else {
            status = 'starting';
            probeAt = -Infinity;
          }
        }),
      ];
      probe();
    },
    update(nowMs: number) {
      if (disposed) return;
      clock = nowMs;
      reconcile();
      if (recovering) needSnapshot();
      if (!available() || pending.size) probe();
    },
    wake: () => submit({ op: 'rail.wake' }),
    openAxe: () => submit({ op: 'rail.axe' }),
    claimJump: () => submit({ op: 'rail.jump' }),
    beamChop: () => submit({ op: 'rail.beamChop' }),
    beamTake: (revision: number) => railInt(revision) && submit({ op: 'rail.beamTake', revision }),
    beamDrop: (x: number, y: number, z: number, revision: number) =>
      railInt(revision) &&
      railInt(x, 200000, -200000) &&
      railInt(y, 200000, -200000) &&
      railInt(z, 200000, -200000) &&
      submit({ op: 'rail.beamDrop', revision, x, y, z }),
    beamDeposit: (revision: number) => railInt(revision) && submit({ op: 'rail.beamDeposit', revision, station: 'T3' }),
    mine(id: number) {
      const a = api.account(pid);
      const n = Math.min(
        2,
        api.railway.line?.rocks[id] ?? 0,
        RAILWAY_T1.carry - (a ? railCarry(a) : 0) - reservations().incoming,
      );
      return railInt(id, 2) && n > 0 && submit({ op: 'rail.mine', id }, n);
    },
    chop(id: number, yaw?: number, collapsed?: boolean) {
      const k = RAILWAY_SOURCES.findIndex((source) => source[0] === id);
      const hardwood = LINE1_HARDWOODS.findIndex((source) => source[0] === id);
      if (
        (k < 0 && !(api.railway.line?.axe && hardwood >= 0)) ||
        (api.railway.falls && (!railYaw(yaw) || typeof collapsed !== 'boolean'))
      )
        return false;
      const held = reservations();
      const n = Math.min(
        api.railway.line?.axe ? 5 : RAILWAY_T1.strokeYield,
        (k < 0 ? api.railway.line!.hardwood[hardwood]! : api.railway.sources[k]!) +
          (api.railway.line?.axe && !api.railway.line.upgrades[k] && api.railway.sources[k]! > 0 ? 5 : 0),
        RAILWAY_T1.carry - (api.account(pid) ? railCarry(api.account(pid)!) : 0) - held.incoming,
      );
      return (
        n > 0 &&
        submit(
          { op: 'rail.chop', id, ...(railYaw(yaw) && typeof collapsed === 'boolean' ? { yaw, collapsed } : {}) },
          n,
        )
      );
    },
    take(id: number) {
      const pile = api.railway.piles.find((p) => p.id === id);
      if (!pile || [...pending.values()].some((p) => p.intent.op === 'rail.take' && p.intent.id === id)) return false;
      const held = reservations();
      const n = Math.min(
        pile.n,
        RAILWAY_T1.carry - (api.account(pid) ? railCarry(api.account(pid)!) : 0) - held.incoming,
      );
      return n > 0 && submit({ op: 'rail.take', id, kind: pile.kind === 1 ? 1 : 0 }, n);
    },
    rackTake(kind: RailMaterial = 0) {
      const n = Math.min(
        kind === 1 ? (api.railway.line?.stoneRack ?? 0) : (api.railway.supply?.rack ?? 0),
        RAILWAY_T1.carry - (api.account(pid) ? railCarry(api.account(pid)!) : 0) - reservations().incoming,
      );
      return n > 0 && submit({ op: 'rail.rackTake', kind }, n);
    },
    drop(x: number, y: number, z: number, n = 1, kind: RailMaterial = 0) {
      return (
        railInt(x, 200000, -200000) &&
        railInt(y, 200000, -200000) &&
        railInt(z, 200000, -200000) &&
        railInt(n, RAILWAY_T1.carry, 1) &&
        submit({ op: 'rail.drop', x, y, z, n, kind }, 0, n)
      );
    },
    deposit(n = 1, kind: RailMaterial = 0) {
      const station = LINE1_STATIONS[railActiveStation(api.railway)]!.id;
      return railInt(n, RAILWAY_T1.carry, 1) && submit({ op: 'rail.deposit', station, n, kind }, 0, n);
    },
    onAccepted(fn: (event: RailwayAccepted) => void) {
      effects.add(fn);
      return () => effects.delete(fn);
    },
    onReset(fn: () => void) {
      resets.add(fn);
      return () => resets.delete(fn);
    },
    dispose() {
      disposed = true;
      for (const off of offRoom) off();
      offRoom = [];
      unlisten();
      pending.clear();
      effects.clear();
      resets.clear();
      room = null;
    },
  };
}
export type RailwayAdapter = ReturnType<typeof createRailwayAdapter>;
export type RailwayInspection = ReturnType<RailwayAdapter['inspect']>;

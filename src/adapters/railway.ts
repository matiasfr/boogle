// The railway as a client sees it (docs/plans/replication.md, R1a): the server's state mirrored through replication,
// read as today's `Railway` so the views keep their shape. Actions go up with the actor's position and action time;
// each waits for the server (one round trip plus at most one step), then shows through the mirror. Local reservations
// keep a player from spending what an unconfirmed action already spent; R1b turns them into prediction.
import { SERVER_ID } from '../net/ids.ts';
import { RAILWAY_SOURCES, RAILWAY_T1 } from '../sim/railway-layout.ts';
import {
  railInt,
  railYaw,
  railJobs,
  railActiveStation,
  railCarry,
  railAccount,
  railCounts,
  railPhase,
  railPanelCount,
  railPanelStock,
  RAILWAY_MAX_INT,
  RAILWAY_WINDOW,
} from '../sim/railway.ts';
import {
  LINE1_STATIONS,
  LINE1_ROCKS,
  LINE1_HARDWOODS,
  type RailMaterial,
  type LineStationId,
} from '../sim/railway-line-layout.ts';
import { LINE_TIMING } from '../sim/railway-line.ts';
import { LINE2_STATIONS, line2Routes, type Line2StationId } from '../sim/railway-line2-layout.ts';
import { line2Active, line2Completed, line2GateOpen } from '../sim/railway-line2.ts';
import { RULE_STEPS } from '../world/room-clock.ts';
import type { RailwayMirror } from '../world/railway-replicate.ts';
import type { ServerPacket } from '../world/replicate.ts';
import type { WorldRoom } from '../world/sync.ts';
import type { TuneApi } from '../world/rules/tune.ts';

export type RailwayIntent =
  | { op: 'rail.wake' }
  | { op: 'rail.chop'; id: number; yaw?: number; collapsed?: boolean }
  | { op: 'rail.mine'; id: number }
  | { op: 'rail.axe' | 'rail.beamChop' | 'rail.jump' }
  | { op: 'rail.forgeTake' | 'rail.depotTake' | 'rail.lever' | 'rail.hook' }
  | { op: 'rail.beamTake'; revision: number }
  | { op: 'rail.beamDrop'; revision: number; x: number; y: number; z: number }
  | { op: 'rail.beamDeposit'; revision: number; station: 'T3' }
  | { op: 'rail.take'; id: number; kind?: RailMaterial | 2 }
  | { op: 'rail.rackTake'; kind?: RailMaterial }
  | { op: 'rail.deposit'; station: LineStationId | Line2StationId | 'F'; n: number; kind?: RailMaterial | 2 }
  | { op: 'rail.drop'; x: number; y?: number; z: number; n: number; kind?: RailMaterial | 2 };
export type RailwayAccepted = Readonly<
  RailwayIntent & {
    pid: string;
    epoch: number;
    request: number;
    accepted: number;
    status: 'accepted';
    tick: number;
  }
>;
type Pending = {
  intent: RailwayIntent;
  epoch: number;
  request: number;
  incoming: number;
  outgoing: number;
  sentAt: number;
};
/** Movement tunables the views read; tune stays lockstep, so a tab reads its own copy. */
export const railMovement = (tune: Pick<TuneApi, 'get'>) => ({
  beamSoloSpeed: tune.get('railBeamSoloSpeed') / 100,
  beamHelpSpeed: tune.get('railBeamHelpSpeed') / 100,
  jumpImpulse: tune.get('railJumpImpulse') / 100,
  jumpTurn: tune.get('railJumpTurn') / 100,
  jumpSteer: tune.get('railJumpSteer') / 100,
  jumpApexSpeed: tune.get('railJumpApexSpeed') / 100,
});
export type RailwayMovement = {
  beamSoloSpeed: number;
  beamHelpSpeed: number;
  jumpImpulse: number;
  jumpTurn: number;
  jumpSteer: number;
  jumpApexSpeed: number;
};
const object = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const key = (epoch: number, request: number) => `${epoch}:${request}`;
// Metres to whole centimetres; `|| 0` turns -0 (which railInt refuses) into 0.
const cm = (m: number) => Math.round(m * 100) || 0;
function intentOf(e: Record<string, unknown>): RailwayIntent | null {
  if (e.op === 'rail.wake') return { op: e.op };
  const kind = e.kind === 1 ? 1 : e.kind === 2 ? 2 : 0;
  if (
    e.op === 'rail.axe' ||
    e.op === 'rail.beamChop' ||
    e.op === 'rail.jump' ||
    e.op === 'rail.forgeTake' ||
    e.op === 'rail.depotTake' ||
    e.op === 'rail.lever' ||
    e.op === 'rail.hook'
  )
    return { op: e.op };
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
  if (e.op === 'rail.rackTake') return { op: e.op, kind: kind === 1 ? 1 : 0 };
  if (e.op === 'rail.take' && railInt(e.id)) return { op: e.op, id: e.id, kind };
  if (e.op === 'rail.chop' && railInt(e.id))
    return {
      op: e.op,
      id: e.id,
      ...(railYaw(e.yaw) && typeof e.collapsed === 'boolean' ? { yaw: e.yaw, collapsed: e.collapsed } : {}),
    };
  if (
    e.op === 'rail.deposit' &&
    (e.station === 'T1' ||
      e.station === 'T2' ||
      e.station === 'T3' ||
      e.station === 'F' ||
      e.station === 'Q1' ||
      e.station === 'Q2' ||
      e.station === 'Q3') &&
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

const accepted = (v: Record<string, unknown>) =>
  typeof v.pid === 'string' &&
  railInt(v.epoch, RAILWAY_MAX_INT, 1) &&
  railInt(v.request, RAILWAY_MAX_INT, 1) &&
  railInt(v.accepted, RAILWAY_T1.carry, 1) &&
  railInt(v.tick);

export type ActorPose = () => { x: number; y: number; z: number } | null;
export function createRailwayAdapter({
  mirror: rail,
  movement,
  pid,
  pose = () => null,
  now = () => performance.now(),
}: {
  mirror: RailwayMirror;
  movement: () => RailwayMovement;
  pid: string;
  /** The local body's position in metres, sent with each action. */
  pose?: ActorPose;
  /** The client's monotonic clock in ms: action times, and the server step estimate. */
  now?: () => number;
}) {
  const s = rail.railway;
  const pending = new Map<string, Pending>();
  const effects = new Set<(event: RailwayAccepted) => void>();
  const resets = new Set<() => void>();
  let room: WorldRoom | null = null;
  let offRoom: (() => void)[] = [];
  let connected = false;
  let disposed = false;
  let synced = false;
  let epoch = 0;
  let next = 1;
  let status: 'connecting' | 'starting' | 'ready' | 'storage' = 'connecting';
  let clock = 0;
  let probeAt = -Infinity;
  const resetView = () => {
    for (const fn of resets) fn();
  };
  const tick = () => {
    const step = rail.mirror.step(now());
    return step < 0 ? 0 : Math.floor(step / RULE_STEPS);
  };
  const available = () =>
    !disposed &&
    connected &&
    synced &&
    epoch > 0 &&
    railAccount(s, pid)?.epoch === epoch &&
    status !== 'storage' &&
    pending.size < RAILWAY_WINDOW;

  // The session is gone (a refusal that is not about the action itself, a takeover, a reconnect): its unconfirmed
  // actions are the server's to settle, and a new epoch starts.
  function lose() {
    epoch = 0;
    pending.clear();
    probeAt = -Infinity;
    if (status !== 'storage') status = connected ? 'starting' : 'connecting';
  }
  function probe() {
    if (!connected || !room || epoch || clock - probeAt < 500) return;
    probeAt = clock;
    room.send({ t: 'r:open' });
  }
  function settle(p: ServerPacket) {
    if (p.ack) {
      const [e, r] = p.ack;
      for (const [id, row] of pending) if (row.epoch < e || (row.epoch === e && row.request <= r)) pending.delete(id);
    }
    for (const [e, r, reason] of p.rej ?? []) {
      pending.delete(key(e, r));
      if (e !== epoch) continue;
      if (reason === 'storage') status = 'storage';
      if (reason !== 'refused') lose();
    }
    if (!synced && rail.synced()) {
      synced = true;
      resetView(); // the whole state arrived: views rebuild from it, without replaying effects
    }
    if (available()) status = 'ready';
    for (const raw of p.ev ?? []) {
      const intent = intentOf(raw);
      if (!intent || !accepted(raw)) continue;
      const event: RailwayAccepted = Object.freeze({
        ...intent,
        pid: raw.pid as string,
        epoch: raw.epoch as number,
        request: raw.request as number,
        accepted: raw.accepted as number,
        status: 'accepted' as const,
        tick: raw.tick as number,
      });
      for (const fn of effects) fn(event);
    }
  }
  rail.mirror.onPacket((p) => {
    if (!disposed) settle(p);
  });
  function hear(message: unknown, from: string) {
    if (disposed || from !== SERVER_ID || !object(message)) return;
    if (message.t === 's') {
      if (!rail.mirror.apply(message, now())) console.warn('[railway] refused a replication packet');
      return;
    }
    if (
      message.t === 'r:session' &&
      message.to === room?.selfId &&
      railInt(message.epoch, RAILWAY_MAX_INT, 1) &&
      railInt(message.next, RAILWAY_MAX_INT, 1)
    ) {
      if (message.epoch < epoch) return;
      next = message.epoch === epoch ? Math.max(next, message.next) : message.next;
      if (message.epoch !== epoch) pending.clear();
      epoch = message.epoch;
      if (status !== 'storage') status = 'starting';
      if (available()) status = 'ready';
    }
  }

  function reservations() {
    let incoming = 0,
      outgoing = 0,
      logs = 0,
      stone = 0,
      rails = 0;
    for (const p of pending.values()) {
      incoming += p.incoming;
      outgoing += p.outgoing;
      if ('kind' in p.intent && p.intent.kind === 1) stone += p.outgoing;
      else if ('kind' in p.intent && p.intent.kind === 2) rails += p.outgoing;
      else logs += p.outgoing;
    }
    return { incoming, outgoing, logs, stone, rails };
  }
  function submit(intent: RailwayIntent, incoming = 0, outgoing = 0): boolean {
    if (!available() || !room || next >= RAILWAY_MAX_INT) return false;
    const held = reservations();
    const account = railAccount(s, pid);
    const carry = account ? railCarry(account) : 0;
    const kind = 'kind' in intent ? (intent.kind ?? 0) : 0;
    const balance = kind === 1 ? (account?.stone ?? 0) : kind === 2 ? (account?.rails ?? 0) : (account?.carry ?? 0);
    const spent = kind === 1 ? held.stone : kind === 2 ? held.rails : held.logs;
    if (incoming > RAILWAY_T1.carry - carry - held.incoming || outgoing > balance - spent) return false;
    const beam = s.line?.beam;
    if (beam?.state === 'held' && beam.holder === pid && (incoming || outgoing)) return false;
    if (intent.op === 'rail.beamTake' && (carry || held.incoming || held.outgoing || pending.size)) return false;
    const phase = railPhase(s, tick());
    if (
      intent.op === 'rail.wake' &&
      (phase !== 'asleep' || [...pending.values()].some((p) => p.intent.op === 'rail.wake'))
    )
      return false;
    if (intent.op === 'rail.chop' && ['asleep', 'waking'].includes(phase)) return false;
    const line1Deposit = intent.op === 'rail.deposit' && intent.station.startsWith('T');
    if (line1Deposit && phase !== 'idle') return false;
    const request = next++;
    const body = pose();
    const at =
      body && Number.isFinite(body.x) && Number.isFinite(body.y) && Number.isFinite(body.z)
        ? ([cm(body.x), cm(body.y), cm(body.z)] as [number, number, number])
        : undefined;
    pending.set(key(epoch, request), { intent, epoch, request, incoming, outgoing, sentAt: clock });
    room.send({
      t: 'r:edit',
      e: { ...intent, epoch, request, ms: Math.max(0, Math.round(now())), ...(at ? { at } : {}) },
    });
    return true;
  }

  function readState() {
    const t = tick();
    rail.at(t);
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
    const l2 = s.line2!;
    const line2Done = line2Completed(s);
    const line2 = Object.freeze({
      forge: Object.freeze({ ...l2.forge }),
      active: line2Active(s),
      completed: line2Done,
      routes: Object.freeze(line2Routes(line2Done)),
      gateOpen: line2GateOpen(s),
      lever: l2.lever,
      hook: l2.hook,
      depot: l2.depot,
      stations: Object.freeze(
        l2.jobs.map((job, i) =>
          Object.freeze({ ...job, id: LINE2_STATIONS[i]!.id, timing: Object.freeze({ ...job.timing }) }),
        ),
      ),
    });
    const account = railAccount(s, pid);
    return Object.freeze({
      tick: t,
      ...movement(),
      panelCount: railPanelCount(s),
      panelStock: railPanelStock(s),
      phase: railPhase(s, t),
      carry: account?.carry ?? 0,
      stoneCarry: account?.stone ?? 0,
      railsCarry: account?.rails ?? 0,
      line2,
      activeStation,
      stations: Object.freeze(stations),
      axe: s.line!.axe,
      jump: s.line!.jump,
      beam: Object.freeze({ ...s.line!.beam }),
      rocks: Object.freeze(
        LINE1_ROCKS.map((rock, i) =>
          Object.freeze({
            ...rock,
            remaining: s.line!.rocks[i] ?? 0,
            work: s.line!.rockWork[i] ?? 0,
            age: s.line!.rockAge[i] ?? 0,
          }),
        ),
      ),
      stoneRack: s.line!.stoneRack,
      hardwood: Object.freeze([...s.line!.hardwood]),
      upgrades: Object.freeze([...s.line!.upgrades]),
      hardwoodWork: Object.freeze([...s.line!.hardwoodWork]),
      awake: s.awake,
      start: current.start,
      elapsed: current.elapsed,
      completion: stations.reduce((n, job) => n + job.completion, 0),
      stock: current.stock,
      allocation: current.allocation,
      used: current.used,
      delivered: current.delivered,
      counts: Object.freeze(railCounts(s)),
      rack: s.supply!.rack,
      growth: Object.freeze(s.sources.map((_n, k) => Math.max(0, (s.supply!.ages[k] ?? 0) - 31))),
      sources: Object.freeze([...s.sources]),
      work: Object.freeze([...s.work]),
      falls: Object.freeze({
        yaw: Object.freeze([...s.falls!.yaw]),
        collapsed: Object.freeze([...s.falls!.collapsed]),
      }),
      piles: Object.freeze(s.piles.map((p) => Object.freeze({ ...p }))),
      accounts: Object.freeze(s.accounts.map((a) => Object.freeze({ ...a }))),
    });
  }
  function inspect() {
    const state = readState();
    const held = reservations();
    return Object.freeze({
      ...state,
      pid,
      status,
      connected,
      synced,
      /** The server step the mirror is current to, and a hash of the mirror there (co-op witnesses compare them;
       * computed only when read). */
      step: rail.step(),
      get hash() {
        return rail.hash();
      },
      ready: available(),
      epoch,
      next,
      pending: pending.size,
      reservations: Object.freeze(held),
      availableCarry: Math.max(0, state.carry - held.logs),
      availableStone: Math.max(0, state.stoneCarry - held.stone),
      availableRails: Math.max(0, state.railsCarry - held.rails),
      freeCarry: Math.max(0, RAILWAY_T1.carry - state.carry - state.stoneCarry - state.railsCarry - held.incoming),
    });
  }
  const free = () => {
    const a = railAccount(s, pid);
    return RAILWAY_T1.carry - (a ? railCarry(a) : 0) - reservations().incoming;
  };
  return {
    inspect,
    attach(nextRoom: WorldRoom) {
      if (disposed || room === nextRoom) return;
      for (const off of offRoom) off();
      room = nextRoom;
      connected = true;
      lose();
      offRoom = [
        room.onMessage(hear),
        room.onConnection((live) => {
          connected = live;
          if (!live) {
            // The server re-sends everything whole when the socket comes back; nothing here outlives the old one.
            rail.reset();
            synced = false;
            lose();
            resetView();
          } else lose();
        }),
      ];
      probe();
    },
    update(nowMs: number) {
      if (disposed) return;
      clock = nowMs;
      probe();
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
      const n = Math.min(2, s.line!.rocks[id] ?? 0, free());
      return railInt(id, 2) && n > 0 && submit({ op: 'rail.mine', id }, n);
    },
    chop(id: number, yaw?: number, collapsed?: boolean) {
      const k = RAILWAY_SOURCES.findIndex((source) => source[0] === id);
      const hardwood = LINE1_HARDWOODS.findIndex((source) => source[0] === id);
      const l = s.line!;
      if ((k < 0 && !(l.axe && hardwood >= 0)) || !railYaw(yaw) || typeof collapsed !== 'boolean') return false;
      const n = Math.min(
        l.axe ? 5 : RAILWAY_T1.strokeYield,
        (k < 0 ? l.hardwood[hardwood]! : s.sources[k]!) + (l.axe && !l.upgrades[k] && s.sources[k]! > 0 ? 5 : 0),
        free(),
      );
      return n > 0 && submit({ op: 'rail.chop', id, yaw, collapsed }, n);
    },
    take(id: number) {
      const pile = s.piles.find((p) => p.id === id);
      if (!pile || [...pending.values()].some((p) => p.intent.op === 'rail.take' && p.intent.id === id)) return false;
      const n = Math.min(pile.n, free());
      return n > 0 && submit({ op: 'rail.take', id, kind: pile.kind === 1 ? 1 : pile.kind === 2 ? 2 : 0 }, n);
    },
    rackTake(kind: RailMaterial = 0) {
      const n = Math.min(kind === 1 ? s.line!.stoneRack : s.supply!.rack, free());
      return n > 0 && submit({ op: 'rail.rackTake', kind }, n);
    },
    drop(x: number, y: number, z: number, n = 1, kind: RailMaterial | 2 = 0) {
      return (
        railInt(x, 200000, -200000) &&
        railInt(y, 200000, -200000) &&
        railInt(z, 200000, -200000) &&
        railInt(n, RAILWAY_T1.carry, 1) &&
        submit({ op: 'rail.drop', x, y, z, n, kind }, 0, n)
      );
    },
    /** Line two: the forge frame ('F') or the active Q frame. The authority decides readiness. */
    depositLine2(station: 'F' | Line2StationId, n = 1, kind: 0 | 2 = 0) {
      return railInt(n, RAILWAY_T1.carry, 1) && submit({ op: 'rail.deposit', station, n, kind }, 0, n);
    },
    forgeTake() {
      const n = Math.min(s.line2!.forge.rack, free());
      return n > 0 && submit({ op: 'rail.forgeTake' }, n);
    },
    depotTake() {
      const n = Math.min(s.line2!.depot, free());
      return n > 0 && submit({ op: 'rail.depotTake' }, n);
    },
    pullLever: () => submit({ op: 'rail.lever' }),
    claimHook: () => submit({ op: 'rail.hook' }),
    deposit(n = 1, kind: RailMaterial = 0) {
      const station = LINE1_STATIONS[railActiveStation(s)]!.id;
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
      pending.clear();
      effects.clear();
      resets.clear();
      room = null;
    },
  };
}
export type RailwayAdapter = ReturnType<typeof createRailwayAdapter>;
export type RailwayInspection = ReturnType<RailwayAdapter['inspect']>;

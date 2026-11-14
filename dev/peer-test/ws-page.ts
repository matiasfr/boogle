// Test page for the server room (ws-run.ts): createWsRoom plus the real world sync and rules on the home land, and
// records of everything the checks need. Query: ?room=&server=&pid=&key= (the player and its browser's key; default
// one of each per page). Railway rooms also mirror the Server-kind railway (src/world/railway-replicate.ts); &lat=ms adds
// that much round trip to the railway's messages (half each way), &adapter=1 drives the real browser adapter.
import { createWsRoom, type Room } from '../../src/net/ws-room.ts';
import { createSync } from '../../src/world/sync.ts';
import { isRailwayRoom } from '../../src/world/railway-namespace.ts';
import { worldRoomId } from '../../src/world/namespace.ts';
import { createRailwayMirror } from '../../src/world/railway-replicate.ts';
import type { ServerPacket } from '../../src/world/replicate.ts';
import type { WorldRoom } from '../../src/world/sync.ts';
import { delayedRoom } from '../../src/world/delayed-room.ts';
import { SERVER_ID } from '../../src/net/ids.ts';
import { RAILWAY_SOURCES, RAILWAY_T1 } from '../../src/sim/railway-layout.ts';
import type { RailAction, RailAccount } from '../../src/sim/railway.ts';
import { railActiveStation, railId, railJobs } from '../../src/sim/railway-queries.ts';
import { freeCarryIgnoringBig, railMaxDuration, railPhase } from '../../src/sim/railway-queries-line1.ts';
import { railCounts } from '../../src/sim/railway-queries-line2.ts';
import { account, accounts, aperture, cart, lines, qjobs, train, trains, tree } from '../../src/sim/railway-rows.ts';
import { Pile, Rail } from '../../src/sim/railway-components.ts';
import { RULE_STEPS } from '../../src/world/room-clock.ts';
import { specOf } from '../../src/sim/tune.ts';
import { createRailwayAdapter } from '../../src/adapters/railway-session.ts';
import { railMovement } from '../../src/adapters/railway-read.ts';
import type { RailwayAccepted, RailwayCorrection } from '../../src/adapters/railway-effects.ts';
import type { RailwayIntent } from '../../src/adapters/railway-intents.ts';
import { trainAlong } from '../../src/sim/railway-train.ts';
import { RAIL_TRAINS } from '../../src/sim/railway-lines.ts';
import { cartAlong } from '../../src/sim/railway-cart.ts';
import { railwaySession, type RailwaySession } from '../../src/entities/railway/state.ts';

export type RailwayProbe = {
  pid: string;
  tick: number;
  /** The mirror has the whole state (late join complete). */
  ready: boolean;
  /** The server step the mirror is current to, and its hash: peers at the same step agree. */
  step: number;
  hash: number;
  phase: ReturnType<typeof railPhase>;
  /** The tick the confirmed world woke the rail at (-1 asleep), and the active station's whole schedule in ticks. */
  awake: number;
  scheduleTicks: number;
  activeStation: number;
  counts: ReturnType<typeof railCounts>;
  accounts: RailAccount[];
  messages: Record<string, unknown>[];
  registry: { states: string[] };
  sources: { id: number; remaining: number }[];
  /** Line two's job completions (Q1 first), empty before line two. */
  line2: number[];
  people: { pid: string; name: string }[];
  seats: { id: string; pid: string }[];
};
export type RailwayAdapterProbe = {
  /** `adapter.read`'s session values (ready, pending, status, stalled, tick) and its `debug()` (step, hash, epoch,
   * next, prediction, ...), taken when the probe was: the view inspection's own. */
  session: RailwaySession;
  /** Rows and queries on the world the views see, read when the probe was taken: the checks' facts, not a model of
   * the state (docs/plans/ecs-m12-m13.md, section 2). */
  rows: {
    account: ReturnType<typeof account>;
    freeCarry: number;
    phase: ReturnType<typeof railPhase>;
    counts: ReturnType<typeof railCounts>;
    jobs: ReturnType<typeof railJobs>;
    cart: ReturnType<typeof cart>;
    trains: ReturnType<typeof trains>;
    lines: ReturnType<typeof lines>;
    ring: ReturnType<typeof aperture>;
  };
  effects: readonly RailwayAccepted[];
  corrections: readonly RailwayCorrection[];
  resets: number;
};

declare global {
  interface Window {
    T: any; // oxlint-disable-line typescript/no-explicit-any -- the test API, driven by page.evaluate
  }
}

const q = new URLSearchParams(location.search);
const roomId = q.get('room') ?? worldRoomId('test');
const LAT = Number(q.get('lat') || 0); // added railway round trip, ms (half each way)
const PID = q.get('pid') ?? 'p' + Math.random().toString(36).slice(2, 10);

// The railway actor's position in cm, set by railPose: what each railway action carries.
let railAt: [number, number, number] | null = null;
// performance.now() of the press the adapter load is making (-1 between presses).
let pressedAt = -1;
const T = (window.T = {
  room: null as Room | null,
  left: [] as { peer: string; at: number }[],
  msgs: {} as Record<string, number[]>,
  lat: [] as number[],
  conn: [] as { at: number; c: boolean }[],
  errors: [] as string[],
  fatal: null as string | null, // a fatal room error's code (elsewhere, room_full)
  got: 0,
  railMessages: [] as Record<string, unknown>[],
  // Railway packets as they arrive (after the added delay): Date.now(), characters, and the events they carried.
  railPackets: [] as { at: number; chars: number; ack?: number[]; rej?: unknown[]; ok?: number[][] }[],
  railEvents: [] as { at: number; pid: string; request: number; op: string }[],
  railSent: [] as { at: number; epoch: number; request: number; op: string }[],
  // Adapter pages (R1b): ms from each press to its predicted effect, and every correction.
  railResponse: [] as number[],
  railCorrections: [] as { at: number; op: string; lost: number; reason: string }[],
  railSyncedAt: 0,
  railSyncedChars: 0, // packet characters received up to the whole late join
  railSyncedPackets: 0,
  railStartAt: 0,
  async start() {
    let room: Room;
    try {
      room = T.room = await createWsRoom({
        roomId,
        server: q.get('server')!,
        pid: PID,
        key: q.get('key') ?? 'k' + PID.padEnd(16, '0'), // one browser per page unless the query says otherwise
        build: 'test',
        debug: Number(q.get('debug') || 0),
      });
    } catch (e) {
      const x = e as { code?: string; max?: number };
      return { error: String(x.code), max: x.max };
    }
    room.onConnection(
      (c) => T.conn.push({ at: Date.now(), c }),
      (e) => (T.fatal = e.code ?? null),
    );
    room.onMessage((m, from) => {
      const msg = m as { t?: unknown; from?: string; n: number };
      if (msg.t === 'r:session' && from === SERVER_ID) {
        const response = m as Record<string, unknown>;
        if (response.to === room.selfId) T.railMessages.push(response);
      }
      if (typeof msg.t === 'string') return; // the world's own messages (w:...)
      if (msg.from !== from) T.errors.push('from mismatch');
      (T.msgs[from] ||= []).push(msg.n);
    });
    room.onPeers((ch) => {
      const at = Date.now();
      for (const p of ch.left) T.left.push({ peer: p.peer, at });
      for (const p of ch.updated) if (!p.sameTab) T.got++;
      for (const p of [...ch.joined, ...ch.updated]) {
        const pr = p.presence as { kind?: string; ts?: number };
        if (!p.sameTab && pr.kind === 'lat') T.lat.push(at - pr.ts!);
      }
    });
    startWorld(room);
    return room.selfId;
  },
  burst(count: number) {
    for (let i = 0; i < count; i++) T.room!.send({ from: T.room!.selfId, n: i });
  },
  latency(count: number, every: number) {
    return new Promise<void>((res) => {
      let n = 0;
      const t = setInterval(() => {
        // Fixed primitive-only patches are below the presence size limit; sending stays synchronous.
        void T.room!.presence({ kind: 'lat', n: n++, ts: Date.now() });
        if (n < count) return;
        clearInterval(t);
        res();
      }, every);
    });
  },
  // A game-sized presence at `hz` for `ms` (the WS_LOAD check).
  load(hz: number, ms: number) {
    T.got = 0;
    let n = 0;
    const r = () => Math.round(Math.random() * 2000) / 100;
    const t = setInterval(
      () => void T.room!.presence({ kind: 'load', n: n++, ts: Date.now(), p: [r(), r(), r()], r: r(), s: 1, c: 3 }),
      1000 / hz,
    );
    return new Promise<number>((res) => setTimeout(() => (clearInterval(t), res(T.got)), ms));
  },
  snap() {
    const r = T.room!;
    return {
      self: r.selfId,
      transport: r.transport,
      peers: r.peers().map((p) => ({ peer: p.peer, sameTab: p.sameTab, presence: p.presence })),
    };
  },
  rename: null as unknown as (name: string) => number | false | null, // server request number, set by startWorld
  world: (): unknown => null,
  rail: (): RailwayProbe | null => null,
  railAdapter: (): RailwayAdapterProbe | null => null,
  /** The depot cart where this tab draws it now (cm along its road), from its own estimate of the server's tick. */
  railTrain: null as unknown as (k: number) => {
    along: number;
    phase: number;
    depart: number;
    at: number;
    tick: number;
    conservativeTick: number;
    row: import('../../src/sim/railway-train.ts').RailTrain;
  } | null,
  railCart: (): { along: number; phase: number; tick: number; at: number } | null => null,
  railIntent: null as unknown as (intent: RailwayIntent) => boolean,
  railSnapshot: null as unknown as () => boolean,
  railOpen: () => railRoom!.send({ t: 'r:open' }),
  // A client action carries where its actor stands (cm, the last railPose) and its action clock (ms).
  railEdit: (
    e:
      | RailAction
      | { op: 'who.set'; n: string; c: number; epoch: number; request: number }
      | { op: 'seat.sit' | 'seat.stand'; id?: string; alt?: string[]; epoch: number; request: number },
  ) => {
    T.railSent.push({ at: Date.now(), epoch: e.epoch, request: e.request, op: e.op });
    railRoom!.send({ t: 'r:edit', e: { ...(railAt ? { at: railAt } : {}), ms: Math.round(performance.now()), ...e } });
  },
  railLoad: null as unknown as (o: {
    ms: number;
    every: number;
    first: number;
    epoch: number;
    next: number;
  }) => Promise<number>,
  railBaseEdit: (e: Record<string, unknown>) => T.room!.send({ t: 'w:edit', e }),
  /** Stand at a world point (cm): the next action carries it, and presence goes there. */
  railStand(x: number, y: number, z: number) {
    railAt = [x, y, z];
    void T.room!.presence({ p: [x / 100, y / 100, z / 100], v: 1 });
  },
  railPose(target: 'station' | 'source', id = RAILWAY_SOURCES[0]![0]) {
    const source = RAILWAY_SOURCES.find((row) => row[0] === id);
    if (target === 'source' && !source) throw new Error(`unknown railway source ${id}`);
    const point = target === 'station' ? [RAILWAY_T1.x, RAILWAY_T1.z] : source!.slice(1);
    railAt = [point[0]!, 3000, point[1]!];
    void T.room!.presence({ p: [point[0]! / 100, 30, point[1]! / 100], v: 1 });
  },
});

// The railway's messages, with LAT/2 added each way (room clock and presence are left undelayed).
let railRoom: WorldRoom | null = null;

function startWorld(room: Room) {
  const w = createSync();
  const rail = isRailwayRoom(roomId) ? createRailwayMirror() : null;
  T.railSnapshot = () => {
    if (!railRoom || !rail) return false;
    railRoom.send({ t: 'r:resync' });
    return true;
  };
  // What the probes read (ECS M11, M12): the mirror's confirmed world, published only once a whole state has fully
  // arrived (a late join's first chunk already carries Rail, its trees and jobs come later) and kept through a refill
  // and a reset; a fresh railway before that. Not `rail.synced()`: it goes false during a refill while the world is
  // still whole. Timed facts take the tick (a client's world holds no job clock).
  const mirrored = () => rail!.confirmed();
  railRoom = rail ? delayedRoom(room, LAT) : null;
  T.railStartAt = Date.now();
  const adapter =
    rail && q.get('adapter') === '1'
      ? createRailwayAdapter({
          mirror: rail,
          movement: () => ({
            ...railMovement({ get: (k) => specOf(k)!.def }),
            beamSoloSpeed: 2,
            beamHelpSpeed: 5,
            jumpImpulse: 6,
            jumpTurn: 1,
            jumpSteer: 25,
            jumpApexSpeed: 1,
          }),
          pid: PID,
          pose: () => (railAt ? { x: railAt[0] / 100, y: railAt[1] / 100, z: railAt[2] / 100 } : null),
        })
      : null;
  if (rail) {
    rail.mirror.onPacket((p: ServerPacket) => {
      const at = Date.now();
      T.railPackets.push({
        at,
        chars: JSON.stringify(p).length,
        ...(p.ack ? { ack: [...p.ack] } : {}),
        ...(p.rej ? { rej: p.rej } : {}),
        ...(p.ok ? { ok: p.ok.map((r) => [...r]) } : {}),
      });
      if (!T.railSyncedAt && rail.synced()) {
        T.railSyncedAt = at;
        T.railSyncedPackets = T.railPackets.length;
        T.railSyncedChars = T.railPackets.reduce((n, x) => n + x.chars, 0);
      }
      for (const e of p.ev ?? [])
        T.railEvents.push({
          at,
          pid: String(e.pid),
          request: Number(e.request),
          op: String(e.op),
        });
    });
    // Without the adapter the page owns both packet delivery and its reconnect lifecycle. Preserve the visible
    // rows while a fresh whole snapshot is assembled, including a restart with empty transient kinds.
    if (!adapter) {
      railRoom!.onConnection((live) => {
        if (!live) rail.refill();
      });
      railRoom!.onMessage((m, from) => {
        if (from !== SERVER_ID) return;
        const msg = m as { t?: string; ht?: number };
        if (msg.t === 's') rail.mirror.apply(m, performance.now());
        else if (msg.t?.startsWith('w:') && Number.isSafeInteger(msg.ht))
          rail.mirror.stamp(msg.ht! * RULE_STEPS, performance.now());
      });
    }
    // The load run (ws-run WS_LOAD): chop, drop and take in a cycle every `every` ms, near trees from `first` on.
    T.railLoad = ({ ms, every, first, epoch, next }) =>
      new Promise((resolve) => {
        let request = next;
        let k = 0;
        let source = first;
        const t = setInterval(() => {
          const mw = mirrored();
          const me = account(mw, PID);
          const phase = k++ % 3;
          while (tree(mw, source).left === 0) source = (source + 1) % RAILWAY_SOURCES.length;
          const [id, x, z] = RAILWAY_SOURCES[source]!;
          railAt = [x, 3000, z];
          let mine: { id: number } | undefined;
          mw.each([Pile], (pid, p) => {
            if (!mine && p.x === x && p.z === z && p.y === 3000) mine = { id: pid };
          });
          const e: RailAction =
            phase === 0 || !me
              ? { op: 'rail.chop', id, yaw: 0, collapsed: false, epoch, request }
              : phase === 1 && me.carry > 0
                ? { op: 'rail.drop', x, y: 3000, z, n: Math.min(2, me.carry), kind: 0, epoch, request }
                : mine
                  ? { op: 'rail.take', id: mine.id, kind: 0, epoch, request }
                  : { op: 'rail.chop', id, yaw: 0, collapsed: false, epoch, request };
          request++;
          T.railEdit(e);
        }, every);
        setTimeout(() => (clearInterval(t), resolve(request)), ms);
      });
  }
  if (adapter) {
    const effects: RailwayAccepted[] = [];
    const corrections: RailwayCorrection[] = [];
    let resets = 0;
    adapter.onAccepted((event) => {
      effects.push(event);
      // A predicted effect is the actor's visible response: from the press (railPressedAt) to here.
      if (event.predicted && pressedAt >= 0) {
        T.railSent.push({ at: Date.now(), epoch: event.epoch ?? 0, request: event.request, op: event.op });
        T.railResponse.push(performance.now() - pressedAt);
      }
    });
    adapter.onCorrected((c) => {
      corrections.push(c);
      T.railCorrections.push({ at: Date.now(), op: c.event.op, lost: c.lost, reason: c.reason });
    });
    adapter.onReset(() => resets++);
    T.railTrain = (k) => {
      // Train slot k (RAIL_TRAINS), on its own line.
      // The views' world (the predicted clone while an action is pending), as the read model's trains were.
      const row = Number.isInteger(k) && k >= 0 && k < RAIL_TRAINS.length ? train(adapter.read.world(), k) : null;
      if (!row) return null;
      const tick = adapter.read.tickNow();
      return {
        along: trainAlong(row, RAIL_TRAINS[k]!.line, tick),
        phase: row.phase,
        depart: row.depart,
        tick,
        row: { ...row },
        conservativeTick: rail!.mirror.step(performance.now()) / RULE_STEPS,
        at: performance.timeOrigin + performance.now(),
      };
    };
    T.railCart = () => {
      const c = cart(adapter.read.world());
      const tick = adapter.read.tickNow();
      return { along: cartAlong(c, tick), phase: c.phase, tick, at: Date.now() };
    };
    T.railAdapter = () => {
      const read = adapter.read,
        w = read.world(),
        at = read.tick();
      return {
        session: railwaySession(read),
        rows: {
          account: account(w, PID),
          freeCarry: freeCarryIgnoringBig(w, PID),
          phase: railPhase(w, at, at),
          counts: railCounts(w, at),
          jobs: railJobs(w, at),
          cart: cart(w),
          trains: trains(w),
          lines: lines(w),
          ring: aperture(w),
        },
        effects: effects.map((e) => ({ ...e })),
        corrections: corrections.map((c) => ({ ...c })),
        resets,
      };
    };
    // The load run through the real adapter (R1b): the same chop, drop and take cycle, predicted.
    T.railLoad = ({ ms, every, first }) =>
      new Promise((resolve) => {
        let k = 0;
        let source = first;
        let pressed = 0;
        const t = setInterval(() => {
          // The rows the views read (the predicted world while actions are pending): the tree's logs left, your
          // carry, and the first named pile (a predicted drop's temporary id is negative) at the tree's spot.
          const w = adapter.read.world();
          const carry = account(w, PID)?.carry ?? 0;
          const phase = k++ % 3;
          while (tree(w, source).left === 0) source = (source + 1) % RAILWAY_SOURCES.length;
          const [id, x, z] = RAILWAY_SOURCES[source]!;
          railAt = [x, 3000, z];
          let mine: { id: number } | undefined;
          w.each([Pile], (pid, p) => {
            if (!mine && pid > 0 && p.x === x && p.z === z && p.y === 3000) mine = { id: pid };
          });
          pressedAt = performance.now();
          if (phase === 1 && carry > 0) adapter.drop(x, 3000, z, Math.min(2, carry), 0);
          else if (phase === 2 && mine) adapter.take(mine.id);
          else adapter.chop(id, 0, false);
          pressedAt = -1;
          pressed++;
        }, every);
        setTimeout(() => (clearInterval(t), resolve(pressed)), ms);
      });
    T.railIntent = (intent) => {
      switch (intent.op) {
        case 'rail.wake':
          return adapter.wake();
        case 'rail.chop':
          return adapter.chop(intent.id, intent.yaw, intent.collapsed);
        case 'rail.deposit':
          return intent.station.startsWith('T')
            ? adapter.deposit(intent.n, intent.kind === 1 ? 1 : 0)
            : adapter.depositLine2(intent.station as 'F', intent.n, intent.kind === 2 ? 2 : 0);
        case 'rail.forgeTake':
          return adapter.forgeTake();
        case 'rail.depotTake':
          return adapter.depotTake();
        case 'rail.depotRailTake':
          return adapter.depotRailTake();
        case 'rail.pack':
          return adapter.openPack();
        case 'rail.boilerTake':
          return adapter.takeBoiler(intent.revision);
        case 'rail.boilerDrop':
          return adapter.dropBoiler(intent.x, intent.y, intent.z, intent.revision);
        case 'rail.boilerFit':
          return adapter.fitBoiler(intent.revision);
        case 'rail.call':
          return adapter.callTrain(intent.id, intent.dir);
        case 'rail.lever':
          return adapter.pullLever();
        case 'rail.seaSwitch':
          return adapter.pullSeaSwitch();
        case 'rail.hook':
          return adapter.claimHook();
        case 'rail.glide':
          return adapter.claimGlide();
        case 'rail.drop':
          return intent.y !== undefined && adapter.drop(intent.x, intent.y, intent.z, intent.n, intent.kind);
        case 'rail.take':
          return adapter.take(intent.id);
        case 'rail.rackTake':
          return adapter.rackTake(intent.kind);
        case 'rail.mine':
          return adapter.mine(intent.id);
        case 'rail.axe':
          return adapter.openAxe();
        case 'rail.jump':
          return adapter.claimJump();
        case 'rail.beamChop':
          return adapter.beamChop();
        case 'rail.beamTake':
          return adapter.beamTake(intent.revision);
        case 'rail.beamDrop':
          return adapter.beamDrop(intent.x, intent.y, intent.z, intent.revision);
        case 'rail.beamDeposit':
          return adapter.beamDeposit(intent.revision);
        case 'rail.breaker':
          return adapter.takeBreaker();
        case 'rail.strike':
          return adapter.strike(intent.id);
        case 'rail.kiln':
          return adapter.fillKiln();
        case 'rail.footTake':
          return adapter.shoulderFooting(intent.rack);
        case 'rail.footSet':
          return adapter.setFooting(intent.site);
        case 'rail.cradle':
          return adapter.fitCradle();
        case 'rail.turn':
          return adapter.turnTable(intent.to, intent.revision);
        case 'rail.brace':
          return adapter.braceLeaf();
        case 'rail.steelTake':
          return adapter.steelTake(intent.kind);
        case 'rail.legStock':
          return adapter.feedLeg(intent.leg);
        case 'rail.grant':
          return adapter.takeGrant(intent.id);
        case 'rail.gate':
          return adapter.openGate(intent.id);
        case 'rail.steel':
          return adapter.feedSteel();
        case 'rail.install':
          return adapter.installBoiler(intent.revision);
      }
    };
  }
  w.attachWorld(room, { roomId });
  if (adapter && railRoom) adapter.attach(railRoom);
  let last = performance.now();
  setInterval(() => {
    const now = performance.now();
    w.updateWorld((now - last) / 1000);
    adapter?.update(now);
    last = now;
  }, 50);
  T.rename = (name: string) => adapter?.act('who.set', { n: name, c: 2 }) ?? null;
  T.world = () => ({
    tick: w.world.tick,
    people: rail?.roster.roster.pids.map((pid, k) => ({ pid, name: rail.roster.nameOf(k) })) ?? [],
    status: w.worldStatus(),
  });
  if (rail)
    T.rail = () => {
      const tick = Math.max(0, Math.floor(rail.mirror.step(performance.now()) / RULE_STEPS));
      const mw = mirrored();
      const acks = T.railPackets.filter((p) => p.ack).map((p) => ({ t: 'ack', epoch: p.ack![0], request: p.ack![1] }));
      const ok = T.railPackets.flatMap((p) =>
        (p.ok ?? []).map(([epoch, request, accepted]) => ({ t: 'ok', epoch, request, accepted })),
      );
      const rej = T.railPackets.flatMap((p) =>
        ((p.rej ?? []) as [number, number, string][]).map(([epoch, request, reason]) => ({
          t: 'rej',
          epoch,
          request,
          reason,
        })),
      );
      return {
        pid: PID,
        tick,
        ready: rail.synced(),
        step: rail.step(),
        hash: rail.hash(),
        phase: railPhase(mw, tick, tick),
        awake: mw.get(Rail, railId(mw))!.awake,
        scheduleTicks: railMaxDuration(mw),
        activeStation: railActiveStation(mw),
        counts: railCounts(mw, tick),
        accounts: accounts(mw).map((a) => ({ ...a })),
        messages: [...T.railMessages.map((m) => ({ ...m })), ...acks, ...ok, ...rej],
        registry: w.registry(),
        sources: RAILWAY_SOURCES.map(([id], k) => ({ id, remaining: tree(mw, k).left })),
        line2: qjobs(mw).map((j) => j.completion),
        people: rail.roster.roster.pids.map((pid, k) => ({ pid, name: rail.roster.nameOf(k) })),
        seats: rail.seats.rows().map((row) => ({ ...row })),
      };
    };
}

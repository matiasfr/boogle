// Test page for the server room (ws-run.ts): createWsRoom plus the real world sync and rules on the home land, and
// records of everything the checks need. Query: ?room=&server=&pid=&key= (the player and its browser's key; default
// one of each per page).
import { createWsRoom, type Room } from '../../src/net/ws-room.ts';
import { createSync } from '../../src/world/sync.ts';
import { installRules } from '../../src/world/rules/index.ts';
import { installRailwayRules, installPlayableRailwayRules } from '../../src/world/rules/railway-index.ts';
import { isRailwayRoom, isPlayableRailwayRoom } from '../../src/world/railway-namespace.ts';
import { SERVER_ID } from '../../src/net/ids.ts';
import { RAILWAY_SOURCES, RAILWAY_T1 } from '../../src/sim/railway-layout.ts';
import { railActiveStation } from '../../src/sim/railway-line.ts';
import type { RailAction, RailAccount, railCounts, railPhase } from '../../src/sim/railway.ts';
import {
  createRailwayAdapter,
  type RailwayAccepted,
  type RailwayInspection,
  type RailwayIntent,
} from '../../src/adapters/railway.ts';
import home from '../../src/world/home-land.json';

export type RailwayProbe = {
  pid: string;
  tick: number;
  ready: boolean;
  phase: ReturnType<typeof railPhase>;
  activeStation: number;
  counts: ReturnType<typeof railCounts>;
  accounts: RailAccount[];
  messages: Record<string, unknown>[];
  registry: { states: string[]; ops: string[] };
  sources: { id: number; remaining: number }[];
  people: { pid: string; name: string }[];
  classicItems: number;
};
export type RailwayAdapterProbe = {
  state: RailwayInspection;
  effects: readonly RailwayAccepted[];
  resets: number;
};

declare global {
  interface Window {
    T: any; // oxlint-disable-line typescript/no-explicit-any -- the test API, driven by page.evaluate
  }
}

const q = new URLSearchParams(location.search);
const HASH_EVERY = 10; // ticks between recorded state hashes
const PID = q.get('pid') ?? 'p' + Math.random().toString(36).slice(2, 10);

// The railway actor's position in cm, set by railPose: what each railway action carries.
let railAt: [number, number, number] | null = null;
const T = (window.T = {
  room: null as Room | null,
  left: [] as { peer: string; at: number }[],
  msgs: {} as Record<string, number[]>,
  lat: [] as number[],
  conn: [] as { at: number; c: boolean }[],
  leads: [] as { at: number; lead: boolean }[],
  errors: [] as string[],
  fatal: null as string | null, // a fatal room error's code (elsewhere, room_full)
  hashes: {} as Record<number, string>,
  got: 0,
  railMessages: [] as Record<string, unknown>[],
  async start() {
    let room: Room;
    try {
      room = T.room = await createWsRoom({
        roomId: q.get('room') ?? 'test',
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
    room.onLeadChange((lead) => T.leads.push({ at: Date.now(), lead }));
    room.onMessage((m, from) => {
      const msg = m as { t?: unknown; from?: string; n: number };
      if (typeof msg.t === 'string' && msg.t.startsWith('r:') && from === SERVER_ID) {
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
      lead: r.isLead(),
      transport: r.transport,
      peers: r.peers().map((p) => ({ peer: p.peer, sameTab: p.sameTab, presence: p.presence })),
    };
  },
  toss: null as unknown as (i: number, j: number) => boolean, // set by startWorld
  world: (): unknown => null,
  rail: (): RailwayProbe | null => null,
  railAdapter: (): RailwayAdapterProbe | null => null,
  railIntent: null as unknown as (intent: RailwayIntent) => boolean,
  railSnapshot: null as unknown as () => boolean,
  railOpen: () => T.room!.send({ t: 'r:open' }),
  // A client action carries where its actor stands (cm, the last railPose) and its action clock (ms).
  railEdit: (e: RailAction) =>
    T.room!.send({ t: 'r:edit', e: { ...(railAt ? { at: railAt } : {}), ms: Math.round(performance.now()), ...e } }),
  railStatus: (epoch: number, request: number) => T.room!.send({ t: 'r:status', epoch, request }),
  railBaseEdit: (e: Record<string, unknown>) => T.room!.send({ t: 'w:edit', e }),
  railPose(target: 'station' | 'source', id = RAILWAY_SOURCES[0]![0]) {
    const source = RAILWAY_SOURCES.find((row) => row[0] === id);
    if (target === 'source' && !source) throw new Error(`unknown railway source ${id}`);
    const point = target === 'station' ? [RAILWAY_T1.x, RAILWAY_T1.z] : source!.slice(1);
    railAt = [point[0]!, 3000, point[1]!];
    void T.room!.presence({ p: [point[0]! / 100, 30, point[1]! / 100], v: 1 });
  },
});

function startWorld(room: Room) {
  const w = createSync();
  T.railSnapshot = () => {
    const before = w.worldStatus().resyncs;
    w.requestResync();
    return w.worldStatus().resyncs > before;
  };
  const land = { n: home.n, layout: home.layout } as Parameters<typeof installRules>[1];
  const roomId = q.get('room') ?? '';
  const playable = isPlayableRailwayRoom(roomId) ? installPlayableRailwayRules(w, land) : null;
  const railway = playable ?? (isRailwayRoom(roomId) ? installRailwayRules(w, land) : null);
  const rules = railway ? null : installRules(w, land);
  const adapter =
    railway && q.get('adapter') === '1'
      ? createRailwayAdapter({
          api: railway.railway,
          sync: w,
          pid: PID,
          pose: () => (railAt ? { x: railAt[0] / 100, y: railAt[1] / 100, z: railAt[2] / 100 } : null),
        })
      : null;
  if (adapter) {
    const effects: RailwayAccepted[] = [];
    let resets = 0;
    adapter.onAccepted((event) => effects.push(event));
    adapter.onReset(() => resets++);
    T.railAdapter = () => ({ state: adapter.inspect(), effects: effects.map((e) => ({ ...e })), resets });
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
        case 'rail.lever':
          return adapter.pullLever();
        case 'rail.hook':
          return adapter.claimHook();
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
      }
    };
  }
  w.onAfterTick((t) => {
    if (t % HASH_EVERY === 0) T.hashes[t] = JSON.stringify(w.stateHashes());
  });
  w.setPid(PID);
  w.attachWorld(room, { roomId: q.get('room') ?? 'test' });
  adapter?.attach(room);
  let last = performance.now();
  setInterval(() => {
    const now = performance.now();
    w.updateWorld((now - last) / 1000);
    adapter?.update(now);
    last = now;
  }, 50);
  T.toss = (i, j) => w.submitEdit({ op: 'gift.toss', i, j, k: 1, y: -1, n: 7, l: [0, 100, 0, 0, 0, 0] });
  T.world = () => ({
    tick: w.world.tick,
    items: rules?.gifts.gifts.items.map((p) => [p.i, p.j]) ?? [],
    status: w.worldStatus(),
  });
  if (railway)
    T.rail = () => ({
      pid: PID,
      tick: w.world.tick,
      ready: w.worldStatus().ready,
      phase: railway.railway.phase(),
      activeStation: railActiveStation(railway.railway.railway),
      counts: railway.railway.counts(),
      accounts: railway.railway.railway.accounts.map((a) => ({ ...a })),
      messages: T.railMessages.map((m) => ({ ...m })),
      registry: w.registry(),
      sources: RAILWAY_SOURCES.map(([id], k) => ({ id, remaining: railway.railway.railway.sources[k]! })),
      people: railway.roster.roster.pids.map((pid, k) => ({ pid, name: railway.roster.nameOf(k) })),
      classicItems: playable?.gifts.gifts.items.length ?? 0,
    });
}

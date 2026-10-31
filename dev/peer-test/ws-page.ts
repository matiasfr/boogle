// Test page for the server room (ws-run.ts): createWsRoom plus the real world sync and rules on the home land, and
// records of everything the checks need. Query: ?room=&server=.
import { createWsRoom, type WsRoom } from '../../src/net/ws-room.ts';
import { createSync } from '../../src/world/sync.ts';
import { installRules } from '../../src/world/rules/index.ts';
import home from '../../src/world/home-land.json';

declare global {
  interface Window {
    T: any; // eslint-disable-line @typescript-eslint/no-explicit-any -- the test API, driven by page.evaluate
  }
}

const q = new URLSearchParams(location.search);
const HASH_EVERY = 10; // ticks between recorded state hashes

const T = (window.T = {
  room: null as WsRoom | null,
  left: [] as { peer: string; at: number }[],
  msgs: {} as Record<string, number[]>,
  lat: [] as number[],
  conn: [] as { at: number; c: boolean }[],
  leads: [] as { at: number; lead: boolean }[],
  errors: [] as string[],
  hashes: {} as Record<number, string>,
  got: 0,
  async start() {
    let room: WsRoom;
    try {
      room = T.room = await createWsRoom({
        roomId: q.get('room') ?? 'test',
        server: q.get('server')!,
        build: 'test',
        debug: Number(q.get('debug') || 0),
      });
    } catch (e) {
      const x = e as { code?: string; max?: number };
      return { error: String(x.code), max: x.max };
    }
    room.onConnection((c) => T.conn.push({ at: Date.now(), c }));
    room.onLeadChange((lead) => T.leads.push({ at: Date.now(), lead }));
    room.onMessage((m, from) => {
      const msg = m as { t?: unknown; from?: string; n: number };
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
        T.room!.presence({ kind: 'lat', n: n++, ts: Date.now() });
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
      () => T.room!.presence({ kind: 'load', n: n++, ts: Date.now(), p: [r(), r(), r()], r: r(), s: 1, c: 3 }),
      1000 / hz,
    );
    return new Promise<number>((res) => setTimeout(() => (clearInterval(t), res(T.got)), ms));
  },
  snap() {
    const r = T.room!;
    return {
      self: r.selfId,
      host: r.isHost(),
      lead: r.isLead(),
      transport: r.transport,
      peers: r.peers().map((p) => ({ peer: p.peer, sameTab: p.sameTab, presence: p.presence })),
    };
  },
  plant: null as unknown as (i: number, j: number) => boolean, // set by startWorld
  world: (): unknown => null,
});

function startWorld(room: WsRoom) {
  const w = createSync({ env: { canPlantAt: () => true } });
  const rules = installRules(w, { n: home.n, layout: home.layout } as Parameters<typeof installRules>[1]);
  w.onAfterTick((t) => {
    if (t % HASH_EVERY === 0) T.hashes[t] = JSON.stringify(w.stateHashes());
  });
  w.attachWorld(room, { roomId: q.get('room') ?? 'test', storage: null });
  let last = performance.now();
  setInterval(() => {
    const now = performance.now();
    w.updateWorld((now - last) / 1000);
    last = now;
  }, 50);
  T.plant = (i, j) => w.submitEdit({ op: 'mush.plant', i, j });
  T.world = () => ({
    tick: w.world.tick,
    plots: rules.mushrooms.garden.plots.map((p) => [p.i, p.j]),
    status: w.worldStatus(),
  });
}

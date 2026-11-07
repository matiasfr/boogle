// The railway as Server-kind state (docs/plans/replication.md, R1a): its replicated components, the server's
// projections of the rules state into them, and the client mirror that rebuilds them into today's `Railway` shape so
// views keep reading what they read. Headless and pure.
//
//   RAIL_SCHEMAS                       tree, hardwood, rock, pile, account, job, qjob, beam, forge, rail (global)
//   railProjections(() => railway)     server: one projection per kind (./replicate-server.ts define)
//   railTouch(touch, railway, ...)     server: the entities an action, a rule tick or a supply pulse touched
//   createRailwayMirror()              client: { mirror, railway, at(tick), synced() }
//
// Timed things are not replicated as they run: a funded job sends its start tick, `ahead` (ticks of offline catch-up
// beyond start, so elapsed = tick - start + ahead) and, once complete, its end tick. The client derives elapsed, used
// and allocation at its estimate of the server tick (at), with the same arithmetic the rule tick uses, so laying, feed
// flights and the panel count advance smoothly without a packet per rule tick. Outcomes (the request history) stay on
// the server; a client learns its own through ack/rej.
import { defineReplicated, cellOf, GLOBAL_CELL, type EntityId, type Fields, type FieldType } from './replicate.ts';
import { createMirror } from './replicate-client.ts';
import type { Projection } from './replicate-server.ts';
import { createRailway, railJobs, type Railway, type RailAccount, type RailPile } from '../sim/railway.ts';
import { RAILWAY_SOURCES } from '../sim/railway-layout.ts';
import { LINE1_STATIONS, LINE1_ROCKS, LINE1_HARDWOODS } from '../sim/railway-line-layout.ts';
import { LINE2_STATIONS } from '../sim/railway-line2-layout.ts';
import { lineSchedule, type LineTiming } from '../sim/railway-line-schedule.ts';
import type { RailJob, RailBeam } from '../sim/railway-line.ts';
import type { RailQJob } from '../sim/railway-line2.ts';

const TIMING_KEYS = [
  'depositMs',
  'feedIntervalMs',
  'logFlightMs',
  'stoneFlightMs',
  'beamFlightMs',
  'cruiseCmPerTick',
  'departureTicks',
] as const;
const timingFields = Object.fromEntries(TIMING_KEYS.map((k) => [k, 'int'])) as Record<string, FieldType>;
const clockFields = { start: 'int', ahead: 'int', end: 'int', completion: 'int' } as const;

export const RAIL_TREE = defineReplicated('tree', {
  left: 'int',
  work: 'int',
  yaw: 'f32',
  fell: 'bool',
  age: 'int',
  big: 'bool',
});
export const RAIL_HARDWOOD = defineReplicated('hardwood', { left: 'int', work: 'int' });
export const RAIL_ROCK = defineReplicated('rock', { left: 'int', work: 'int', age: 'int' });
export const RAIL_PILE = defineReplicated('pile', { x: 'int', y: 'int', z: 'int', n: 'int', kind: 'int', age: 'int' });
export const RAIL_ACCOUNT = defineReplicated('account', {
  carry: 'int',
  stone: 'int',
  rails: 'int',
  epoch: 'int',
  request: 'int',
});
export const RAIL_JOB = defineReplicated('job', {
  stock: 'int',
  delivered: 'int',
  stoneStock: 'int',
  stoneDelivered: 'int',
  ...clockFields,
  ...timingFields,
});
export const RAIL_QJOB = defineReplicated('qjob', {
  stock: 'int',
  railStock: 'int',
  delivered: 'int',
  railDelivered: 'int',
  ...clockFields,
  ...timingFields,
});
export const RAIL_BEAM = defineReplicated('beam', {
  state: 'str',
  work: 'int',
  holder: 'str',
  epoch: 'int',
  revision: 'int',
  x: 'int',
  y: 'int',
  z: 'int',
  age: 'int',
});
// lastPour and depotLast are left out: they move every rule tick while the rack is full or the depot idle, and no
// client reads them (the client never runs the rule tick).
export const RAIL_FORGE = defineReplicated('forge', { used: 'int', lit: 'int', rack: 'int', poured: 'int' });
export const RAIL_GLOBAL = defineReplicated('rail', {
  awake: 'int',
  nextPile: 'int',
  axe: 'bool',
  jump: 'bool',
  stoneRack: 'int',
  stoneProduced: 'int',
  rack: 'int',
  produced: 'int',
  depot: 'int',
  depotProduced: 'int',
  lever: 'bool',
  hook: 'bool',
  ...Object.fromEntries(LINE2_STATIONS.map((_s, k) => [`out${k}`, 'int'])),
});
export const RAIL_SCHEMAS = [
  RAIL_TREE,
  RAIL_HARDWOOD,
  RAIL_ROCK,
  RAIL_PILE,
  RAIL_ACCOUNT,
  RAIL_JOB,
  RAIL_QJOB,
  RAIL_BEAM,
  RAIL_FORGE,
  RAIL_GLOBAL,
];

type AnyJob = RailJob | Railway | RailQJob;
const timingOf = (t: LineTiming | undefined): Fields => Object.fromEntries(TIMING_KEYS.map((k) => [k, t?.[k] ?? 0]));
function clockOf(job: AnyJob): Fields {
  const started = job.start >= 0;
  return {
    start: job.start,
    ahead: started ? job.elapsed - (job.lastTick - job.start) : 0,
    end: job.completion ? job.lastTick : -1,
    completion: job.completion,
  };
}
const range = (n: number) => Array.from({ length: n }, (_, k) => k);
const index = (id: EntityId, n: number) =>
  typeof id === 'number' && Number.isInteger(id) && id >= 0 && id < n ? id : -1;

/** Server: rules state -> components. Every id resolves against the live railway each call. */
export function railProjections(get: () => Railway): Projection[] {
  const at = (x: number, z: number) => () => cellOf(x, z);
  const global = () => GLOBAL_CELL;
  return [
    {
      schema: RAIL_TREE,
      ids: () => range(RAILWAY_SOURCES.length),
      project(id) {
        const s = get(),
          k = index(id, RAILWAY_SOURCES.length);
        if (k < 0) return null;
        return {
          left: s.sources[k]!,
          work: s.work[k]!,
          yaw: s.falls?.yaw[k] ?? 0,
          fell: s.falls?.collapsed[k] ?? false,
          age: s.supply?.ages[k] ?? 0,
          big: s.line?.upgrades[k] ?? false,
        };
      },
      cell: (id) => cellOf(RAILWAY_SOURCES[id as number]![1], RAILWAY_SOURCES[id as number]![2]),
    },
    {
      schema: RAIL_HARDWOOD,
      ids: () => range(LINE1_HARDWOODS.length),
      project(id) {
        const l = get().line,
          k = index(id, LINE1_HARDWOODS.length);
        return l && k >= 0 ? { left: l.hardwood[k]!, work: l.hardwoodWork[k]! } : null;
      },
      cell: (id) => at(LINE1_HARDWOODS[id as number]![1], LINE1_HARDWOODS[id as number]![2])(),
    },
    {
      schema: RAIL_ROCK,
      ids: () => range(LINE1_ROCKS.length),
      project(id) {
        const l = get().line,
          k = index(id, LINE1_ROCKS.length);
        return l && k >= 0 ? { left: l.rocks[k]!, work: l.rockWork[k]!, age: l.rockAge[k]! } : null;
      },
      cell: (id) => at(LINE1_ROCKS[id as number]!.x, LINE1_ROCKS[id as number]!.z)(),
    },
    {
      schema: RAIL_PILE,
      ids: () => get().piles.map((p) => p.id),
      project(id) {
        const p = get().piles.find((row) => row.id === id);
        return p ? { x: p.x, y: p.y ?? 0, z: p.z, n: p.n, kind: p.kind ?? 0, age: p.age ?? 0 } : null;
      },
      cell: (_id, f) => cellOf(f.x as number, f.z as number),
    },
    {
      schema: RAIL_ACCOUNT,
      ids: () => get().accounts.map((a) => a.pid),
      project(id) {
        const a = get().accounts.find((row) => row.pid === id);
        return a
          ? { carry: a.carry, stone: a.stone ?? 0, rails: a.rails ?? 0, epoch: a.epoch, request: a.request }
          : null;
      },
      cell: global,
    },
    {
      schema: RAIL_JOB,
      ids: () => range(LINE1_STATIONS.length),
      project(id) {
        const s = get(),
          k = index(id, LINE1_STATIONS.length);
        if (!s.line || k < 0) return null;
        const job = railJobs(s)[k]!;
        return {
          stock: job.stock,
          delivered: job.delivered,
          stoneStock: job.stoneStock ?? 0,
          stoneDelivered: job.stoneDelivered ?? 0,
          ...clockOf(job),
          ...timingOf(job.timing),
        };
      },
      cell: global,
    },
    {
      schema: RAIL_QJOB,
      ids: () => range(LINE2_STATIONS.length),
      project(id) {
        const l = get().line2,
          k = index(id, LINE2_STATIONS.length);
        if (!l || k < 0) return null;
        const job = l.jobs[k]!;
        return {
          stock: job.stock,
          railStock: job.railStock,
          delivered: job.delivered,
          railDelivered: job.railDelivered,
          ...clockOf(job),
          ...timingOf(job.timing),
        };
      },
      cell: global,
    },
    {
      schema: RAIL_BEAM,
      ids: () => [0],
      project(id) {
        const b = get().line?.beam;
        return b && id === 0
          ? {
              state: b.state,
              work: b.work,
              holder: b.holder,
              epoch: b.epoch,
              revision: b.revision,
              x: b.x,
              y: b.y,
              z: b.z,
              age: b.age,
            }
          : null;
      },
      cell: global,
    },
    {
      schema: RAIL_FORGE,
      ids: () => [0],
      project(id) {
        const f = get().line2?.forge;
        return f && id === 0 ? { used: f.used, lit: f.lit, rack: f.rack, poured: f.poured } : null;
      },
      cell: global,
    },
    {
      schema: RAIL_GLOBAL,
      ids: () => [0],
      project(id) {
        const s = get();
        if (id !== 0 || !s.line || !s.line2 || !s.supply) return null;
        return {
          awake: s.awake,
          nextPile: s.nextPile,
          axe: s.line.axe,
          jump: s.line.jump,
          stoneRack: s.line.stoneRack,
          stoneProduced: s.line.stoneProduced,
          rack: s.supply.rack,
          produced: s.supply.produced,
          depot: s.line2.depot,
          depotProduced: s.line2.depotProduced,
          lever: s.line2.lever,
          hook: s.line2.hook,
          ...Object.fromEntries(s.line2.depotOut.map((n, k) => [`out${k}`, n])),
        };
      },
      cell: global,
    },
  ];
}

type Touch = (kind: string, id: EntityId) => void;
/** The stations, the beam, the forge and the global row: what any action or rule tick may move. Ten projections. */
export function railTouchCore(touch: Touch) {
  for (let k = 0; k < LINE1_STATIONS.length; k++) touch('job', k);
  for (let k = 0; k < LINE2_STATIONS.length; k++) touch('qjob', k);
  touch('beam', 0);
  touch('forge', 0);
  touch('rail', 0);
}
/** Piles before an action ran, so a drop that created or emptied one is touched. */
export const railPileIds = (s: Railway) => new Set(s.piles.map((p) => p.id));
/** What a material action touched: its actor, its target and the core rows. */
export function railTouchAction(
  touch: Touch,
  s: Railway,
  pid: string,
  e: { op: string; id?: number; x?: number; y?: number; z?: number },
  pilesBefore: Set<number>,
) {
  touch('account', pid);
  railTouchCore(touch);
  if (e.op === 'rail.chop') {
    const k = RAILWAY_SOURCES.findIndex((row) => row[0] === e.id);
    if (k >= 0) touch('tree', k);
    const h = LINE1_HARDWOODS.findIndex((row) => row[0] === e.id);
    if (h >= 0) touch('hardwood', h);
  }
  if (e.op === 'rail.mine' && index(e.id ?? -1, LINE1_ROCKS.length) >= 0) touch('rock', e.id!);
  if (e.op === 'rail.take' || e.op === 'rail.drop')
    for (const id of new Set([...pilesBefore, ...s.piles.map((p) => p.id)]))
      if (
        !pilesBefore.has(id) ||
        !s.piles.some((p) => p.id === id) ||
        id === e.id ||
        (e.op === 'rail.drop' && pileAt(s, id, e))
      )
        touch('pile', id);
}
const pileAt = (s: Railway, id: number, e: { x?: number; y?: number; z?: number }) => {
  const p = s.piles.find((row) => row.id === id);
  return !!p && p.x === e.x && p.z === e.z && p.y === e.y;
};

// ---------------------------------------------------------------- client mirror

type Clock = {
  ahead: number;
  end: number;
  key: string;
  total: number;
  schedule: ReturnType<typeof lineSchedule> | null;
};

/** Client: the confirmed mirror and today's `Railway` shape rebuilt from it, for views and their pure helpers. */
export function createRailwayMirror() {
  const mirror = createMirror(RAIL_SCHEMAS);
  const s = createRailway(true, true);
  const piles = new Map<number, RailPile>();
  const accounts = new Map<string, RailAccount>();
  const l = s.line!,
    l2 = s.line2!;
  const clocks: Clock[] = [...LINE1_STATIONS, ...LINE2_STATIONS].map(() => ({
    ahead: 0,
    end: -1,
    key: '',
    total: 0,
    schedule: null,
  }));
  let synced = false;
  let hashAt = -1,
    hashed = 0;
  let pilesDirty = false;
  let accountsDirty = false;
  const num = (f: Fields, k: string) => f[k] as number;

  mirror.onChange('tree', (id, f) => {
    const k = id as number;
    if (!f) return;
    s.sources[k] = num(f, 'left');
    s.work[k] = num(f, 'work');
    s.falls!.yaw[k] = num(f, 'yaw');
    s.falls!.collapsed[k] = f.fell as boolean;
    s.supply!.ages[k] = num(f, 'age');
    l.upgrades[k] = f.big as boolean;
  });
  mirror.onChange('hardwood', (id, f) => {
    if (!f) return;
    l.hardwood[id as number] = num(f, 'left');
    l.hardwoodWork[id as number] = num(f, 'work');
  });
  mirror.onChange('rock', (id, f) => {
    if (!f) return;
    l.rocks[id as number] = num(f, 'left');
    l.rockWork[id as number] = num(f, 'work');
    l.rockAge[id as number] = num(f, 'age');
  });
  mirror.onChange('pile', (id, f) => {
    pilesDirty = true;
    if (!f) return void piles.delete(id as number);
    const p = piles.get(id as number) ?? ({ id: id as number } as RailPile);
    Object.assign(p, { x: f.x, y: f.y, z: f.z, n: f.n, kind: f.kind, age: f.age });
    piles.set(id as number, p);
  });
  mirror.onChange('account', (id, f) => {
    accountsDirty = true;
    if (!f) return void accounts.delete(id as string);
    const a = accounts.get(id as string) ?? ({ pid: id as string } as RailAccount);
    Object.assign(a, { carry: f.carry, stone: f.stone, rails: f.rails, epoch: f.epoch, request: f.request });
    accounts.set(id as string, a);
  });
  const timing = (f: Fields): LineTiming =>
    Object.fromEntries(TIMING_KEYS.map((k) => [k, num(f, k)])) as unknown as LineTiming;
  function setClock(job: AnyJob, c: Clock, f: Fields) {
    job.start = num(f, 'start');
    job.completion = num(f, 'completion');
    c.ahead = num(f, 'ahead');
    c.end = num(f, 'end');
    job.timing = timing(f);
  }
  mirror.onChange('job', (id, f) => {
    if (!f) return;
    const job = railJobs(s)[id as number]!;
    job.stock = num(f, 'stock');
    job.delivered = num(f, 'delivered');
    job.stoneStock = num(f, 'stoneStock');
    job.stoneDelivered = num(f, 'stoneDelivered');
    setClock(job, clocks[id as number]!, f);
  });
  mirror.onChange('qjob', (id, f) => {
    if (!f) return;
    const job = l2.jobs[id as number]!;
    job.stock = num(f, 'stock');
    job.railStock = num(f, 'railStock');
    job.delivered = num(f, 'delivered');
    job.railDelivered = num(f, 'railDelivered');
    setClock(job, clocks[LINE1_STATIONS.length + (id as number)]!, f);
  });
  mirror.onChange('beam', (_id, f) => {
    if (f) Object.assign(l.beam, { ...f, state: f.state as RailBeam['state'] });
  });
  mirror.onChange('forge', (_id, f) => {
    if (f) Object.assign(l2.forge, { used: f.used, lit: f.lit, rack: f.rack, poured: f.poured });
  });
  mirror.onChange('rail', (_id, f) => {
    if (!f) return;
    s.awake = num(f, 'awake');
    s.nextPile = num(f, 'nextPile');
    l.axe = f.axe as boolean;
    l.jump = f.jump as boolean;
    l.stoneRack = num(f, 'stoneRack');
    l.stoneProduced = num(f, 'stoneProduced');
    s.supply!.rack = num(f, 'rack');
    s.supply!.produced = num(f, 'produced');
    l2.depot = num(f, 'depot');
    l2.depotProduced = num(f, 'depotProduced');
    l2.lever = f.lever as boolean;
    l2.hook = f.hook as boolean;
    for (let k = 0; k < l2.depotOut.length; k++) l2.depotOut[k] = num(f, `out${k}`);
  });
  mirror.onPacket(() => {
    synced = mirror.whole();
    if (pilesDirty) s.piles = [...piles.values()].sort((a, b) => a.id - b.id);
    if (accountsDirty) s.accounts = [...accounts.values()];
    pilesDirty = accountsDirty = false;
  });

  // elapsed, used and allocation of one job at tick, as railLineTick/railLine2Tick would leave them.
  function advance(
    job: AnyJob,
    c: Clock,
    station: (typeof LINE1_STATIONS)[number] | (typeof LINE2_STATIONS)[number],
    second: 'stone' | 'rails' | null,
    tick: number,
  ) {
    const bill = station.bill;
    const set = (used: number, usedSecond: number, done: boolean) => {
      job.used = used;
      job.allocation = done || job.start < 0 ? 0 : bill[0] - used;
      if (second === 'stone') {
        (job as RailJob).stoneUsed = usedSecond;
        (job as RailJob).stoneAllocation = done || job.start < 0 ? 0 : bill[1] - usedSecond;
      } else if (second === 'rails') {
        (job as RailQJob).railUsed = usedSecond;
        (job as RailQJob).railAllocation = done || job.start < 0 ? 0 : bill[1] - usedSecond;
      }
    };
    if (job.start < 0) {
      job.elapsed = 0;
      job.lastTick = 0;
      return set(0, 0, false);
    }
    const key = TIMING_KEYS.map((k) => job.timing![k]).join(',');
    if (c.key !== key || !c.schedule) {
      c.key = key;
      c.schedule = lineSchedule(station, job.timing!);
    }
    const sch = c.schedule;
    if (job.completion) {
      job.elapsed = sch.totalTicks;
      job.lastTick = c.end;
      return set(bill[0], second ? bill[1] : 0, true);
    }
    job.elapsed = Math.min(sch.totalTicks, Math.max(0, tick - job.start + c.ahead));
    job.lastTick = Math.max(job.start, tick);
    const laying = Math.max(0, job.elapsed - sch.depositTicks - sch.feedTicks);
    set(
      Math.min(bill[0], Math.floor((laying * bill[0]) / sch.layTicks)),
      second ? Math.min(bill[1], Math.floor((laying * bill[1]) / sch.layTicks)) : 0,
      false,
    );
  }

  return {
    mirror,
    railway: s,
    /** Whether the whole state has arrived since the last reset. */
    synced: () => synced,
    /** A hash of every mirrored component (cached per packet): two peers at the same step agree on it. */
    hash() {
      if (hashAt === mirror.stats.applied) return hashed;
      let h = 2166136261;
      for (const schema of RAIL_SCHEMAS) {
        const rows = [...mirror.entries(schema.kind)].sort(([a], [b]) => (String(a) < String(b) ? -1 : 1));
        const text = JSON.stringify(rows.map(([id, f]) => [id, schema.names.map((n) => f[n])]));
        for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
      }
      hashAt = mirror.stats.applied;
      return (hashed = h >>> 0);
    },
    /** The server step the mirror is current to (-1 before a packet). */
    step: () => mirror.lastStep(),
    /** Bring every job's timed fields to the estimated server tick (views call it once per frame). `target` is this
     * mirror's railway or a copy of it (R1b's predicted state): the job clocks are the mirror's. */
    at(tick: number, target: Railway = s) {
      const jobs = railJobs(target);
      for (let k = 0; k < LINE1_STATIONS.length; k++)
        advance(jobs[k]!, clocks[k]!, LINE1_STATIONS[k]!, k > 0 ? 'stone' : null, tick);
      for (let k = 0; k < LINE2_STATIONS.length; k++)
        advance(target.line2!.jobs[k]!, clocks[LINE1_STATIONS.length + k]!, LINE2_STATIONS[k]!, 'rails', tick);
      return target;
    },
    reset() {
      mirror.reset();
      s.piles = [];
      s.accounts = [];
      pilesDirty = accountsDirty = false;
      synced = false;
    },
  };
}
export type RailwayMirror = ReturnType<typeof createRailwayMirror>;

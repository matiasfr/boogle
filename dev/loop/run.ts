// `npm run loop -- run [--players N] [--order <name>] [--json]`: plays each order the loop graph allows through the
// REAL rules (the host's install: railValid, railApply, railTick; dev/loop/host.ts) for 1 to 4 players and prints
// the time each node is reached. Walking is straight-line at WALK_MPS (no terrain, no trains ridden); cart, train,
// laying and kiln time come from the sim. A stall with nothing accepted is a softlock; an order the graph allows that
// the rules refuse is a graph bug. Decided edges the graph says nothing enforces (and edges said to be the rules')
// are probed: the dependent node is tried first on a copy of the world.
import { RAILWAY_SOURCES, RAILWAY_T1 as T1 } from '../../src/sim/railway-layout.ts';
import {
  LINE1_STATIONS,
  LINE1_ROCKS,
  LINE1_GREAT_TREE,
  LINE1_AXE_STAND,
  LINE1_JUMP_DEVICE,
  LINE1_HARDWOODS,
} from '../../src/sim/railway-line-layout.ts';
import {
  LINE2_STATIONS,
  LINE2_FORGE,
  LINE2_PACK,
  LINE2_LEVER,
  LINE2_HOOK,
  LINE2_SEA,
  LINE2_GLIDE,
  LINE2_OLD_TRAIN,
} from '../../src/sim/railway-line2-layout.ts';
import { line2Active } from '../../src/sim/railway-queries-line2.ts';
import { railCarryMax } from '../../src/sim/railway-queries.ts';
import {
  account,
  aperture,
  beam as beamOf,
  boiler as boilerOf,
  forge as forgeOf,
  hardwood,
  job,
  qjob,
  rail,
  rocks as rocksOf,
  shed,
  trains as trainsOf,
  tree,
  works,
} from '../../src/sim/railway-rows.ts';
import type { World } from '../../src/ecs/index.ts';
import {
  WORKS,
  WORKS_SEAMS,
  WORKS_BREAKER,
  WORKS_KILN,
  WORKS_RACK,
  WORKS_ROCKS,
  SHED_STALL,
  SHED_TABLE,
  PIER_STOP,
  PIER_RACK,
  PIER_FRAME,
} from '../../src/sim/railway-works-layout.ts';
import { RING_BRACE, RING_HEAD, RING_RIVET } from '../../src/sim/railway-ring-layout.ts';
import type { RailAction } from '../../src/sim/railway.ts';
import { DETOUR, NODES, WALK_MPS, cm, detourOf, node, proposeOrders, type NodeId, type Point } from './graph.ts';
import { createHost, type Host } from './host.ts';

type Cmd = { walk: Point } | { act: string; fields?: Partial<RailAction> } | { wait: number };
type Policy = Generator<Cmd, void, number>;
type Player = { pid: string; i: number; at: Point; busy: number; walked: number; gen: Policy | null };
type Tally = { carries: number; walked: number; refused: number; actions: number; accepted: number; last?: Cmd };
export type NodeTime = { id: NodeId; tick: number; startTick: number; parked: boolean } & Tally;
export type RunResult = {
  order: string;
  players: number;
  nodes: NodeTime[];
  ticks: number;
  softlock?: { node: NodeId; tick: number; why: string };
  graphBug?: string[];
  probes?: Probe[];
};

/** Assumed press times (ticks of 100 ms): one swing per chop or strike, `unloadMs` per unit unloaded, 0.3 s else. */
const SWING = Math.ceil(T1.swingMs / 100);
const PRESS = 3;
/** Ticks with nothing accepted and no node reached before the run calls it a softlock (20 minutes). */
const STALL = 12000;
const ticksFor = (cmd: Cmd, n: number) => {
  if (!('act' in cmd)) return 0;
  if (cmd.act === 'rail.chop' || cmd.act === 'rail.mine' || cmd.act === 'rail.beamChop' || cmd.act === 'rail.strike')
    return SWING;
  if (cmd.act === 'rail.deposit' || cmd.act === 'rail.kiln' || cmd.act === 'rail.cradle')
    return Math.max(PRESS, Math.ceil((n * T1.unloadMs) / 100));
  return PRESS;
};
const CARRY_OPS = new Set([
  'rail.deposit',
  'rail.kiln',
  'rail.cradle',
  'rail.footSet',
  'rail.beamDeposit',
  'rail.boilerFit',
]);

class Game {
  h: Host;
  players: Player[];
  /** Units each player has committed to bringing, by node and material, so friends split a bill. */
  bringing = new Map<string, number>();
  constructor(h: Host, players: Player[]) {
    this.h = h;
    this.players = players;
  }
  /** The host's world (ECS M11), read at each use. `world.mut` writes a row in place, so a row held across a press is
   * live: it shows what the press changed (the read model's copy kept the value from before). No policy here reads a held
   * row after a press that writes it: the loop's output hashes as main's did. */
  get w(): World {
    return this.h.api.world();
  }
  acct(pid: string) {
    return account(this.w, pid)!;
  }
  others(key: string, pid: string) {
    let n = 0;
    for (const [k, v] of this.bringing) if (k.startsWith(`${key}|`) && !k.endsWith(`|${pid}`)) n += v;
    return n;
  }
}

// ---------------------------------------------------------------- policies: one generator per player per node
function* walk(to: Point): Policy {
  yield { walk: to };
}
function* press(op: string, fields: Partial<RailAction> = {}): Generator<Cmd, number, number> {
  return yield { act: op, fields };
}
function* waitFor(g: Game, ok: () => boolean): Policy {
  while (!ok()) yield { wait: 10 };
}
/** Everything off the back where you stand. */
function* clearBack(g: Game, pl: Player, keep?: 0 | 1 | 2): Policy {
  const a = () => g.acct(pl.pid);
  const of = (kind: 0 | 1 | 2) =>
    keep === kind ? 0 : kind === 0 ? a().carry : kind === 1 ? (a().stone ?? 0) : (a().rails ?? 0);
  for (let k = 0; of(0) + of(1) + of(2) > 0 && k < 12; k++) {
    const kind = of(0) ? 0 : of(1) ? 1 : 2;
    const n = Math.min(of(kind), 8);
    yield* press('rail.drop', { x: Math.round(pl.at.x) + k * 20, z: Math.round(pl.at.z), y: pl.at.y ?? 0, n, kind });
  }
}
/** The boiler, the beam or a footing off the back, where you stand. */
function* dropBig(g: Game, pl: Player): Policy {
  const at = { x: Math.round(pl.at.x), z: Math.round(pl.at.z), y: pl.at.y ?? 0 };
  const boilerRow = boilerOf(g.w),
    beamRow = beamOf(g.w);
  if (boilerRow.state === 'held' && boilerRow.holder === pl.pid)
    yield* press('rail.boilerDrop', { revision: boilerRow.revision, ...at });
  if (beamRow.state === 'held' && beamRow.holder === pl.pid)
    yield* press('rail.beamDrop', { revision: beamRow.revision, ...at });
  if (g.acct(pl.pid).foot) yield* press('rail.drop', { ...at, n: 1, kind: 3 });
}
const free = (g: Game, pid: string) => {
  const a = g.acct(pid);
  return railCarryMax(g.w) - a.carry - (a.stone ?? 0) - (a.rails ?? 0);
};
/** Chop the nearest standing tree (or hardwood, with the proper axe) until `want` logs are on the back. */
function* chopTo(g: Game, pl: Player, want: number): Policy {
  for (let guard = 0; g.acct(pl.pid).carry < want && free(g, pl.pid) > 0 && guard < 200; guard++) {
    const w = g.w;
    let best: { id: number; at: Point } | null = null;
    let bd = Infinity;
    RAILWAY_SOURCES.forEach(([id, x, z], k) => {
      if (tree(w, k).left <= 0) return;
      const d = cm(pl.at, { x, z });
      if (d < bd) [bd, best] = [d, { id, at: { x, z } }];
    });
    if (rail(w).axe)
      LINE1_HARDWOODS.forEach(([id, x, z], h) => {
        if (hardwood(w, h).left <= 0) return;
        const d = cm(pl.at, { x, z });
        if (d < bd) [bd, best] = [d, { id, at: { x, z } }];
      });
    if (!best) {
      yield { wait: 100 }; // trees regrow on the supply pulse
      continue;
    }
    const b: { id: number; at: Point } = best;
    yield* walk(b.at);
    yield* press('rail.chop', { id: b.id, yaw: 0, collapsed: false });
  }
}
function* mineTo(
  g: Game,
  pl: Player,
  rocks: readonly { id: number; x: number; z: number; y?: number }[],
  want: number,
) {
  for (let guard = 0; (g.acct(pl.pid).stone ?? 0) < want && free(g, pl.pid) > 0 && guard < 200; guard++) {
    const left = rocks.filter((r) => (rocksOf(g.w)[r.id]?.left ?? 0) > 0);
    if (!left.length) return;
    const r = left.reduce((a, b) => (cm(pl.at, a) <= cm(pl.at, b) ? a : b));
    yield* walk({ x: r.x, z: r.z, ...(r.y === undefined ? {} : { y: r.y }) });
    yield* press('rail.mine', { id: r.id });
  }
}
function* forgeRails(g: Game, pl: Player, want: number) {
  yield* walk({ x: LINE2_FORGE.rackX, z: LINE2_FORGE.rackZ });
  for (let guard = 0; (g.acct(pl.pid).rails ?? 0) < want && free(g, pl.pid) > 0 && guard < 2000; guard++) {
    if (forgeOf(g.w).rack > 0 && (yield* press('rail.forgeTake')) > 0) continue;
    yield { wait: 10 };
  }
}
type Need = { key: string; left: () => number; kind: 0 | 1 | 2 };
/** Bring `need` to `to` and unload with `unload`, sharing it with friends through `bringing`. */
function* carry(
  g: Game,
  pl: Player,
  need: Need,
  fetch: (want: number) => Policy,
  have: () => number,
  to: Point,
  unload: (n: number) => Partial<RailAction> & { op: string },
): Policy {
  const mark = `${need.key}|${pl.pid}`;
  try {
    for (let guard = 0; guard < 200; guard++) {
      const left = need.left() - g.others(need.key, pl.pid);
      if (left <= 0 && have() === 0) return;
      if (have() < Math.min(left, railCarryMax(g.w))) {
        if (left <= 0) return;
        // Anything else on the back goes down first, so the whole carry is this material.
        const a = g.acct(pl.pid),
          other = a.carry + (a.stone ?? 0) + (a.rails ?? 0) - have();
        if (other > 0) yield* clearBack(g, pl, need.kind);
        const want = Math.min(left, railCarryMax(g.w));
        g.bringing.set(mark, want);
        yield* fetch(want);
      }
      if (have() === 0) {
        yield { wait: 20 };
        continue;
      }
      yield* walk(to);
      const { op, ...fields } = unload(have());
      const moved = yield* press(op, fields);
      g.bringing.set(mark, 0);
      if (!moved) {
        // Not taken (a friend filled it, or not yet ready): wait, then judge again.
        if (need.left() <= 0) return;
        yield { wait: 20 };
      }
    }
  } finally {
    g.bringing.delete(mark);
  }
}

const L1 = (id: string) => LINE1_STATIONS.find((s) => s.id === id)!;
const L2 = (k: number) => LINE2_STATIONS[k]!;
const stationIdx = { T1: 0, T2: 1, T3: 2 } as const;

function lineOne(g: Game, pl: Player, id: 'T1' | 'T2' | 'T3'): Policy {
  const k = stationIdx[id];
  const spec = L1(id);
  const lane = (pl.i + (spec.bill[1] ? 1 : 0)) % g.players.length;
  return (function* () {
    yield* waitFor(g, () => (k === 0 ? true : !!job(g.w, k - 1).completion));
    const logs: Need = { key: `${id}:logs`, kind: 0, left: () => spec.bill[0] - job(g.w, k).stock };
    const stone: Need = { key: `${id}:stone`, kind: 1, left: () => spec.bill[1] - job(g.w, k).stoneStock };
    const runs: Policy[] = [];
    // With friends, the stone goes to the last player; solo, stone first (it's nearer the frame on T2).
    const doStone = spec.bill[1] > 0 && (g.players.length === 1 || lane === 0);
    if (doStone)
      runs.push(
        carry(
          g,
          pl,
          stone,
          (want) => mineTo(g, pl, LINE1_ROCKS, want),
          () => g.acct(pl.pid).stone ?? 0,
          spec,
          (n) => ({ op: 'rail.deposit', station: id, kind: 1, n }),
        ),
      );
    runs.push(
      carry(
        g,
        pl,
        logs,
        (want) => chopTo(g, pl, want),
        () => g.acct(pl.pid).carry,
        spec,
        (n) => ({ op: 'rail.deposit', station: id, kind: 0, n }),
      ),
    );
    for (const r of runs) yield* r;
  })();
}
function* beam(g: Game, pl: Player): Policy {
  if (pl.i !== 0) return;
  yield* waitFor(g, () => !!job(g.w, 1).completion);
  yield* walk(LINE1_GREAT_TREE);
  for (let i = 0; i < 40 && beamOf(g.w).state === 'standing'; i++) yield* press('rail.beamChop');
  yield* clearBack(g, pl);
  yield* press('rail.beamTake', { revision: beamOf(g.w).revision });
  yield* walk(L1('T3'));
  yield* press('rail.beamDeposit', { revision: beamOf(g.w).revision, station: 'T3' });
}
function* forge(g: Game, pl: Player): Policy {
  yield* waitFor(g, () => !!job(g.w, 2).completion);
  const used = () => forgeOf(g.w).used;
  yield* carry(
    g,
    pl,
    { key: 'F:logs', kind: 0, left: () => LINE2_FORGE.logs - used() },
    (want) => chopTo(g, pl, want),
    () => g.acct(pl.pid).carry,
    LINE2_FORGE,
    (n) => ({ op: 'rail.deposit', station: 'F', kind: 0, n }),
  );
}
function* device(g: Game, pl: Player, at: Point, op: string, ready: () => boolean): Policy {
  if (pl.i !== 0) return;
  yield* waitFor(g, ready);
  yield* walk(at);
  yield* press(op);
}
/** `byHand`: the vehicle isn't there, so logs come from the trees and rails from the forge rack, on foot. */
function quarry(g: Game, pl: Player, k: number, byHand = false): Policy {
  const spec = L2(k);
  const depot = spec.depot && !byHand,
    shelf = spec.shelf && !byHand;
  const j = () => qjob(g.w, k);
  return (function* () {
    yield* waitFor(g, () => line2Active(g.w) === k && g.h.tick() >= forgeOf(g.w).lit + LINE2_FORGE.turnTicks);
    const logs: Need = { key: `${spec.id}:logs`, kind: 0, left: () => spec.bill[0] - j().stock };
    const rails: Need = { key: `${spec.id}:rails`, kind: 2, left: () => spec.bill[1] - j().railStock };
    const toFrame = (kind: 0 | 2) => (n: number) => ({ op: 'rail.deposit', station: spec.id, kind, n });
    // Rails first for whoever takes the rails lane; with one player, logs then rails.
    const railsLane = g.players.length > 1 && pl.i === g.players.length - 1;
    const logRun = carry(
      g,
      pl,
      logs,
      depot
        ? (want) => fromRack(g, pl, spec, 'rail.depotTake', () => rail(g.w).depot, want, 'carry')
        : (want) => chopTo(g, pl, want),
      () => g.acct(pl.pid).carry,
      spec,
      toFrame(0),
    );
    const railRun = carry(
      g,
      pl,
      rails,
      shelf
        ? (want) => fromRack(g, pl, spec, 'rail.depotRailTake', () => rail(g.w).depotRails, want, 'rails')
        : (want) => forgeRails(g, pl, want),
      () => g.acct(pl.pid).rails ?? 0,
      spec,
      toFrame(2),
    );
    for (const r of railsLane ? [railRun, logRun] : [logRun, railRun]) yield* r;
  })();
}
function* fromRack(
  g: Game,
  pl: Player,
  at: Point,
  op: string,
  stock: () => number,
  want: number,
  field: 'carry' | 'rails',
): Policy {
  yield* walk(at);
  const have = () => (field === 'carry' ? g.acct(pl.pid).carry : (g.acct(pl.pid).rails ?? 0));
  for (let guard = 0; have() < want && guard < 3000; guard++) {
    if (stock() > 0 && (yield* press(op)) > 0) continue;
    if (have() > 0) return;
    yield { wait: 10 };
  }
}
function* boiler(g: Game, pl: Player): Policy {
  if (pl.i !== 0) return;
  yield* waitFor(g, () => boilerOf(g.w).state === 'pedestal');
  const b = boilerOf(g.w);
  yield* walk({ x: b.x, z: b.z });
  yield* clearBack(g, pl);
  yield* press('rail.boilerTake', { revision: boilerOf(g.w).revision });
}
function* fit(g: Game, pl: Player): Policy {
  if (boilerOf(g.w).holder !== pl.pid) return;
  yield* walk(LINE2_OLD_TRAIN);
  yield* press('rail.boilerFit', { revision: boilerOf(g.w).revision });
}
function* pier(g: Game, pl: Player, reached: () => void): Policy {
  if (pl.i !== 0) return;
  yield* waitFor(g, () => !!qjob(g.w, 5).completion);
  yield* walk(PIER_STOP);
  reached();
}
function* strike(g: Game, pl: Player, id: 0 | 1 | 2): Policy {
  if (pl.i !== 0) return;
  yield* waitFor(g, () => works(g.w).breaker === 2);
  yield* walk(id === 2 ? RING_RIVET : WORKS_SEAMS[id]);
  yield* press('rail.strike', { id });
}
/** The ring's railhead now (v27): its rack and jib move out a bent with each pair of footings. */
const railhead = (g: Game) => RING_HEAD[Math.floor(aperture(g.w).set / 2)]!;
function* kiln(g: Game, pl: Player): Policy {
  yield* waitFor(g, () => !!(works(g.w).seams & 2));
  const w = () => works(g.w);
  const stone = carry(
    g,
    pl,
    { key: 'kiln:stone', kind: 1, left: () => WORKS.kilnStone - w().stone },
    (want) => mineTo(g, pl, WORKS_ROCKS, want),
    () => g.acct(pl.pid).stone ?? 0,
    WORKS_KILN,
    () => ({ op: 'rail.kiln' }),
  );
  const logs = carry(
    g,
    pl,
    { key: 'kiln:logs', kind: 0, left: () => WORKS.kilnLogs - w().logs },
    (want) => chopTo(g, pl, want),
    () => g.acct(pl.pid).carry,
    WORKS_KILN,
    () => ({ op: 'rail.kiln' }),
  );
  yield* clearBack(g, pl);
  for (const r of pl.i % 2 ? [stone, logs] : [logs, stone]) yield* r;
}
/** Footings from a rack to a site, one per back, shared among friends. */
function* footings(
  g: Game,
  pl: Player,
  rack: 0 | 1 | 2,
  site: 0 | 1 | 2 | 3,
  left: () => number,
  stock: () => number,
): Policy {
  const key = `foot${site}`,
    mark = `${key}|${pl.pid}`;
  // Rack 2 and site 3 are the railhead's, wherever it stands as you go (v27).
  const from = () => [WORKS_RACK, PIER_RACK, railhead(g).rack][rack]!,
    to = () => [SHED_STALL, SHED_STALL, PIER_FRAME, railhead(g).jib][site]!;
  try {
    for (let guard = 0; guard < 400; guard++) {
      if (left() - g.others(key, pl.pid) <= 0 && !g.acct(pl.pid).foot) return;
      if (!g.acct(pl.pid).foot) {
        g.bringing.set(mark, 1);
        yield* walk(from());
        yield* clearBack(g, pl);
        if (stock() <= 0 || !(yield* press('rail.footTake', { rack }))) {
          g.bringing.set(mark, 0);
          yield { wait: 20 };
          continue;
        }
      }
      yield* walk(to());
      yield* press('rail.footSet', { site });
      g.bringing.set(mark, 0);
    }
  } finally {
    g.bringing.delete(mark);
  }
}
function* cradle(g: Game, pl: Player): Policy {
  const sh = () => shed(g.w);
  if (pl.i === g.players.length - 1 || g.players.length === 1) {
    const rails = () => WORKS.cradleRails - sh().cradleRails;
    if (rails() > 0) {
      yield* clearBack(g, pl);
      yield* forgeRails(g, pl, rails());
      yield* walk(SHED_STALL);
      yield* press('rail.cradle');
      yield* clearBack(g, pl);
    }
  }
  yield* footings(
    g,
    pl,
    0,
    1,
    () => WORKS.cradle - sh().cradle,
    () => works(g.w).rack,
  );
}

type Run = {
  g: Game;
  done: Record<NodeId, () => boolean>;
  policy: Record<NodeId, (pl: Player) => Policy>;
  /** World facts the sim doesn't hold (the pier is reached by walking there). */
  flags: { atPier: boolean };
  /** The node being played, and how much farther than straight-line its walks are (1 unless calibrated). */
  current: NodeId | null;
  detour: (id: NodeId) => number;
};
function setup(h: Host, n: number, byHand: ReadonlySet<NodeId> = new Set()): Run {
  const players: Player[] = Array.from({ length: n }, (_v, i) => ({
    pid: `p${i + 1}`,
    i,
    at: { x: T1.wake.x + i * 150, z: T1.wake.z },
    busy: 0,
    walked: 0,
    gen: null,
  }));
  const g = new Game(h, players);
  const flags = { atPier: false };
  const w = () => g.w;
  const q = (k: number) => !!qjob(w(), k).completion;
  const done: Record<NodeId, () => boolean> = {
    wake: () => rail(w()).awake >= 0,
    T1: () => !!job(w(), 0).completion,
    T2: () => !!job(w(), 1).completion,
    beam: () => ['allocated', 'used'].includes(beamOf(w()).state),
    T3: () => !!job(w(), 2).completion,
    jump: () => rail(w()).jump,
    forge: () => forgeOf(w()).lit >= 0,
    axe: () => rail(w()).axe,
    pack: () => rail(w()).pack,
    Q1: () => q(0),
    Q2: () => q(1),
    hook: () => rail(w()).hook,
    Q3: () => q(2),
    lever: () => rail(w()).lever,
    Q4: () => q(3),
    sea: () => rail(w()).sea,
    Q5: () => q(4),
    glider: () => rail(w()).glide,
    boiler: () => ['held', 'fitted'].includes(boilerOf(w()).state),
    trains: () => rail(w()).trains >= 0,
    Q6: () => q(5),
    pier: () => flags.atPier,
    breaker: () => works(w()).breaker === 2,
    slab: () => !!(works(w()).seams & 1),
    throat: () => !!(works(w()).seams & 2),
    kiln: () => works(w()).lit >= 0,
    stall: () => shed(w()).stall >= WORKS.stall,
    cradle: () => shed(w()).fitted >= 0,
    table: () => trainsOf(w()).some((r) => r.wagon), // any of line 2's trains (v26)
    crossing: () => works(w()).pierSet >= WORKS.pier,
    Q7: () => q(6),
    bents: () => aperture(w()).set >= WORKS.ring,
    brace: () => aperture(w()).brace !== 1,
    weights: () => aperture(w()).cw >= WORKS.counterweight,
    rivet: () => aperture(w()).joined >= 0,
  };
  const ready = (id: NodeId) => () => node(id).requires.every((e) => e.scope === 'finish' || done[e.on]());
  const policy: Record<NodeId, (pl: Player) => Policy> = {
    wake: (pl) => device(g, pl, T1.wake, 'rail.wake', () => true),
    T1: (pl) => lineOne(g, pl, 'T1'),
    T2: (pl) => lineOne(g, pl, 'T2'),
    beam: (pl) => beam(g, pl),
    T3: (pl) => lineOne(g, pl, 'T3'),
    jump: (pl) => device(g, pl, LINE1_JUMP_DEVICE, 'rail.jump', () => true),
    forge: (pl) => forge(g, pl),
    axe: (pl) => device(g, pl, LINE1_AXE_STAND, 'rail.axe', ready('axe')),
    pack: (pl) => device(g, pl, LINE2_PACK, 'rail.pack', () => forgeOf(w()).used >= LINE2_FORGE.bills[0]),
    Q1: (pl) => quarry(g, pl, 0),
    Q2: (pl) => quarry(g, pl, 1, byHand.has('Q2')),
    hook: (pl) => device(g, pl, LINE2_HOOK, 'rail.hook', ready('hook')),
    Q3: (pl) => quarry(g, pl, 2, byHand.has('Q3')),
    lever: (pl) => device(g, pl, LINE2_LEVER, 'rail.lever', ready('lever')),
    Q4: (pl) => quarry(g, pl, 3, byHand.has('Q4')),
    sea: (pl) => device(g, pl, LINE2_SEA, 'rail.seaSwitch', () => true),
    Q5: (pl) => quarry(g, pl, 4, byHand.has('Q5')),
    glider: (pl) => device(g, pl, LINE2_GLIDE, 'rail.glide', ready('glider')),
    boiler: (pl) => boiler(g, pl),
    trains: (pl) => fit(g, pl),
    Q6: (pl) => quarry(g, pl, 5, byHand.has('Q6')),
    pier: (pl) => pier(g, pl, () => void (flags.atPier = true)),
    breaker: (pl) => device(g, pl, WORKS_BREAKER, 'rail.breaker', () => works(w()).breaker === 1),
    slab: (pl) => strike(g, pl, 0),
    throat: (pl) => strike(g, pl, 1),
    kiln: (pl) => kiln(g, pl),
    stall: (pl) =>
      footings(
        g,
        pl,
        0,
        0,
        () => WORKS.stall - shed(w()).stall,
        () => works(w()).rack,
      ),
    cradle: (pl) => cradle(g, pl),
    table: (pl) => device(g, pl, SHED_TABLE, 'rail.turn', () => shed(w()).stall >= WORKS.stall) as Policy,
    // By hand, the pier's footings come off the Works rack the kiln casts to, not off the wagon at the pier rack.
    crossing: (pl) =>
      byHand.has('crossing')
        ? footings(
            g,
            pl,
            0,
            2,
            () => WORKS.pier - works(w()).pierSet,
            () => works(w()).rack,
          )
        : footings(
            g,
            pl,
            1,
            2,
            () => WORKS.pier - works(w()).pierSet,
            () => works(w()).pierRack,
          ),
    Q7: (pl) => quarry(g, pl, 6, byHand.has('Q7')),
    // By hand, as the crossing: off the Works rack, not the wagon's at the railhead.
    bents: (pl) =>
      footings(
        g,
        pl,
        byHand.has('bents') ? 0 : 2,
        3,
        () => WORKS.ring - aperture(w()).set,
        () => (byHand.has('bents') ? works(w()).rack : aperture(w()).rack),
      ),
    brace: (pl) =>
      (function* () {
        if (pl.i !== 0) return;
        yield* waitFor(g, () => aperture(w()).set >= WORKS.ring);
        yield* walk(RING_BRACE);
        yield* press('rail.brace', { revision: 1 });
      })(),
    weights: (pl) =>
      footings(
        g,
        pl,
        byHand.has('weights') ? 0 : 2,
        3,
        () => WORKS.counterweight - aperture(w()).cw,
        () => (byHand.has('weights') ? works(w()).rack : aperture(w()).rack),
      ),
    rivet: (pl) => strike(g, pl, 2),
  };
  return { g, done, policy, flags, current: null, detour: () => 1 };
}

/** Steps one player's generator until it asks for time. */
function step(r: Run, pl: Player, t: Tally, log: string[]) {
  const { g } = r;
  let input = 0;
  for (let guard = 0; pl.gen && pl.busy <= g.h.tick() && guard < 100; guard++) {
    const next = pl.gen.next(input);
    if (next.done) {
      pl.gen = null;
      return;
    }
    const cmd = next.value;
    input = 0;
    if ('walk' in cmd) {
      const d = cm(pl.at, cmd.walk) * (r.current ? r.detour(r.current) : 1);
      pl.at = { ...cmd.walk };
      pl.walked += d / 100;
      t.walked += d / 100;
      pl.busy = g.h.tick() + Math.ceil((d / (WALK_MPS * 100)) * 10);
    } else if ('wait' in cmd) pl.busy = g.h.tick() + cmd.wait;
    else {
      const fields = { ...cmd.fields };
      // The table turn and fit name the revision the actor sees now.
      if (cmd.act === 'rail.turn') Object.assign(fields, { to: 1, revision: shed(g.w).tableRev });
      const res = g.h.act(pl.pid, cmd.act, fields, pl.at);
      t.actions++;
      if (res.status === 'rejected') {
        t.refused++;
        log.push(`${g.h.tick()} ${pl.pid} ${cmd.act} refused at (${Math.round(pl.at.x)}, ${Math.round(pl.at.z)})`);
      }
      if (res.status === 'accepted' && res.accepted > 0 && CARRY_OPS.has(cmd.act)) t.carries++;
      input = res.status === 'accepted' ? res.accepted : 0;
      pl.busy = g.h.tick() + ticksFor(cmd, input);
      if (input > 0) {
        t.accepted++;
        t.last = cmd;
      }
    }
  }
}

// ---------------------------------------------------------------- order probes
/** What a player would try for `id` if nothing told them to wait: logs by hand for a bill, else its own press. */
function probePolicy(r: Run, pl: Player, id: NodeId): Policy | null {
  const n = node(id);
  const { g } = r;
  const station = [...LINE1_STATIONS, ...LINE2_STATIONS].find((s) => s.id === id);
  if (station || id === 'forge' || id === 'kiln')
    return (function* () {
      yield* dropBig(g, pl);
      yield* clearBack(g, pl, 0);
      yield* chopTo(g, pl, T1.carry);
      yield* walk(id === 'forge' ? LINE2_FORGE : id === 'kiln' ? WORKS_KILN : station!);
      yield* press(id === 'kiln' ? 'rail.kiln' : 'rail.deposit', {
        station: id === 'forge' ? 'F' : id,
        kind: 0,
        n: g.acct(pl.pid).carry,
      });
    })();
  const seam = id === 'slab' ? 0 : id === 'throat' ? 1 : id === 'rivet' ? 2 : -1;
  // The pier is the world's (a walk), the crossing's footings ride the wagon: nothing to press early.
  if (seam < 0 && !n.ops.length) return null;
  return (function* () {
    yield* walk(n.at);
    const op = seam >= 0 ? 'rail.strike' : n.ops[0]!;
    yield* press(op, seam >= 0 ? { id: seam } : op === 'rail.brace' ? { revision: 1 } : {});
  })();
}
export type Probe = { node: NodeId; before: NodeId; by: string; accepted: boolean; what: string };
/** On a copy of the world at the moment `before` starts: does the rule accept `id`'s own first action? */
function probe(h: Host, players: Player[], id: NodeId, before: NodeId): Probe | null {
  const pids = players.map((p) => p.pid);
  const copy = createHost(pids, { snapshot: h.snapshot(), tick: h.tick() });
  const r = setup(copy, players.length);
  const pl = r.g.players[0]!;
  pl.at = { ...players[0]!.at };
  const gen = probePolicy(r, pl, id);
  if (!gen) return null;
  pl.gen = gen;
  const t: Tally = { carries: 0, walked: 0, refused: 0, actions: 0, accepted: 0 };
  const own = new Set([...node(id).ops, 'rail.deposit', 'rail.kiln']);
  let accepted = false;
  for (let k = 0; k < PROBE && pl.gen; k++) {
    const before = t.accepted;
    step(r, pl, t, []);
    if (t.accepted > before && t.last && 'act' in t.last && own.has(t.last.act)) accepted = true;
    copy.advance();
  }
  const edge = node(id).requires.find((e) => e.on === before && e.status === 'decided')!;
  return { node: id, before, by: edge.by, accepted, what: edge.source };
}
/** Ticks a probe may take (10 minutes: a chop and a walk across the map). */
const PROBE = 6000;

/** Everything a run holds at the start of a node, between nodes (no player has a policy running then): enough to go
 * on from there in a fresh host made from the world's own snapshot. */
export type Checkpoint = {
  index: number;
  snapshot: unknown;
  tick: number;
  players: Pick<Player, 'at' | 'busy' | 'walked'>[];
  bringing: [string, number][];
  flags: Run['flags'];
  nodes: NodeTime[];
  parked: number[];
  lastProgress: number;
};

export function playOrder(
  order: readonly NodeId[],
  name: string,
  players: number,
  opts: {
    verbose?: boolean;
    probes?: boolean;
    mutate?: (h: Host) => void;
    byHand?: ReadonlySet<NodeId>;
    /** Scale each node's walks by its calibrated detour factor (graph.ts detourOf; uncalibrated nodes stay 1). */
    detour?: boolean;
    /** Go on from this checkpoint (an earlier run of an order that shares `order`'s first `index` nodes). */
    from?: Checkpoint;
    /** Keep a checkpoint at the start of each node, for orders that share this one's prefix. */
    checkpoints?: Checkpoint[];
  } = {},
): RunResult {
  const pids = Array.from({ length: players }, (_v, i) => `p${i + 1}`);
  const h = opts.from ? createHost(pids, { snapshot: opts.from.snapshot, tick: opts.from.tick }) : createHost(pids);
  opts.mutate?.(h);
  const r = setup(h, players, opts.byHand);
  if (opts.detour) r.detour = (id) => detourOf(id)?.median ?? 1;
  const { g, done } = r;
  const result: RunResult = { order: name, players, nodes: [], ticks: 0 };
  const log: string[] = [];
  const parked: { id: NodeId; t: NodeTime }[] = [];
  let lastProgress = 0;
  const probes: Probe[] = [];
  let start = 0;
  if (opts.from) {
    const cp = opts.from;
    start = cp.index;
    cp.players.forEach((p, i) => Object.assign(g.players[i]!, { at: { ...p.at }, busy: p.busy, walked: p.walked }));
    g.bringing = new Map(cp.bringing);
    Object.assign(r.flags, cp.flags);
    result.nodes = cp.nodes.map((t) => ({ ...t }));
    for (const k of cp.parked) parked.push({ id: result.nodes[k]!.id, t: result.nodes[k]! });
    lastProgress = cp.lastProgress;
  }
  const capture = (index: number): Checkpoint => ({
    index,
    snapshot: h.snapshot(),
    tick: h.tick(),
    players: g.players.map((p) => ({ at: { ...p.at }, busy: p.busy, walked: p.walked })),
    bringing: [...g.bringing],
    flags: { ...r.flags },
    nodes: result.nodes.map((t) => ({ ...t })),
    parked: parked.map((p) => result.nodes.indexOf(p.t)),
    lastProgress,
  });
  /** Before `id` starts: every node that a decided edge holds behind it, whose other prerequisites are met. */
  const probeBefore = (id: NodeId) => {
    for (const b of NODES)
      for (const e of b.requires) {
        if (e.on !== id || e.status !== 'decided' || e.by === 'world' || (e.scope ?? 'start') !== 'start') continue;
        const others = b.requires.filter((x) => x !== e && x.status === 'decided' && (x.scope ?? 'start') === 'start');
        if (done[b.id]() || !others.every((x) => done[x.on]())) continue;
        const p = probe(h, g.players, b.id, id);
        if (p) probes.push(p);
      }
  };
  const finishParked = () => {
    for (let k = parked.length - 1; k >= 0; k--)
      if (done[parked[k]!.id]()) {
        parked[k]!.t.tick = h.tick();
        parked.splice(k, 1);
        lastProgress = h.tick();
      }
  };
  for (let index = start; index < order.length; index++) {
    const id = order[index]!;
    if (opts.checkpoints) opts.checkpoints[index] = capture(index);
    r.current = id;
    const t: NodeTime = {
      id,
      tick: -1,
      startTick: h.tick(),
      parked: false,
      carries: 0,
      walked: 0,
      refused: 0,
      actions: 0,
      accepted: 0,
    };
    result.nodes.push(t);
    if (done[id]()) {
      t.tick = h.tick();
      continue;
    }
    if (opts.probes) probeBefore(id);
    for (const pl of g.players) pl.gen = r.policy[id](pl);
    for (;;) {
      const before = t.accepted;
      for (const pl of g.players) step(r, pl, t, log);
      if (t.accepted > before) lastProgress = h.tick();
      finishParked();
      if (done[id]()) {
        t.tick = h.tick();
        lastProgress = h.tick();
        break;
      }
      const idle = g.players.every((pl) => !pl.gen);
      const waitsOnFinish = node(id).requires.some((e) => e.scope === 'finish' && !done[e.on]());
      if (idle && waitsOnFinish) {
        t.parked = true;
        parked.push({ id, t });
        break;
      }
      if (h.tick() - lastProgress > STALL) {
        result.softlock = {
          node: id,
          tick: h.tick(),
          why: idle ? 'every player is done and the node is not' : 'nothing accepted',
        };
        break;
      }
      h.advance();
    }
    for (const pl of g.players) pl.gen = null;
    if (result.softlock) break;
  }
  while (!result.softlock && parked.length) {
    finishParked();
    if (!parked.length) break;
    if (h.tick() - lastProgress > STALL)
      result.softlock = { node: parked[0]!.id, tick: h.tick(), why: 'parked and never finished' };
    else {
      h.advance();
    }
  }
  result.ticks = h.tick();
  if (opts.probes) result.probes = probes;
  if (opts.verbose) console.error(log.slice(-40).join('\n'));
  return result;
}

const clock = (ticks: number) => {
  const s = Math.max(0, Math.round(ticks / 10));
  const h = Math.floor(s / 3600),
    m = Math.floor((s % 3600) / 60),
    ss = String(s % 60).padStart(2, '0');
  return h ? `${h}:${String(m).padStart(2, '0')}:${ss}` : `${m}:${ss}`;
};

export function runLoop(args: string[]) {
  const value = (flag: string) => {
    const i = args.indexOf(flag);
    return i >= 0 ? args[i + 1] : undefined;
  };
  const counts = value('--players') ? [Number(value('--players'))] : [1, 2, 3, 4];
  if (counts.some((n) => !Number.isInteger(n) || n < 1 || n > 4)) throw new Error('--players: 1 to 4');
  const only = value('--order');
  const broken = value('--break');
  if (broken) breakBill(broken);
  const handArg = value('--by-hand');
  if (handArg) return runByHand(handArg, counts, args);
  const orders = proposeOrders().filter((o) => (broken ? o.name === 'canonical' : !only || o.name === only));
  const share = !args.includes('--no-share');
  const started = performance.now();
  const results: RunResult[] = [];
  for (const players of counts) {
    // Each order replays only from where it leaves the canonical order: the canonical run keeps a checkpoint at the
    // start of every node, and an order whose first k nodes are the canonical's goes on from checkpoint k.
    const canonical = proposeOrders()[0]!.order;
    const checkpoints: Checkpoint[] = [];
    for (const o of orders) {
      const probes = o.name === 'canonical' && players === counts[0] && !args.includes('--no-probes');
      let k = 0;
      while (k < o.order.length && o.order[k] === canonical[k]) k++;
      const from = share && o.name !== 'canonical' ? checkpoints[k] : undefined;
      const res = playOrder(o.order, o.name, players, {
        verbose: args.includes('--verbose'),
        probes,
        ...(from ? { from } : {}),
        ...(share && o.name === 'canonical' ? { checkpoints } : {}),
      });
      if (res.softlock && o.name !== 'canonical')
        res.graphBug = [`the graph allows "${o.name}" but the rules never finished ${res.softlock.node}`];
      results.push(res);
    }
  }
  // The shown order again with each node's walks scaled by its calibrated detour (dev/loop/detour.json).
  const calibrated = new Map<number, RunResult>();
  const shownOrder = proposeOrders().find((o) => o.name === (only && !broken ? only : 'canonical'))!;
  if (DETOUR && !broken && !args.includes('--no-calibrated'))
    for (const players of counts)
      calibrated.set(players, playOrder(shownOrder.order, `${shownOrder.name}, calibrated`, players, { detour: true }));
  const ms = Math.round(performance.now() - started);
  if (args.includes('--json'))
    return console.log(JSON.stringify({ ms, results, calibrated: [...calibrated.values()] }, null, 2));
  const out: string[] = [
    `Loop run through the real rules (railway-server install: railValid, railApply, railTick). A lower bound: walking`,
    `is straight-line at ${WALK_MPS} m/s with no terrain, trains are not ridden, presses take ${PRESS / 10} s, there`,
    `are no regrowth or recovery pulses; cart, trains, laying and kiln time are the sim's. ${ms} ms.`,
  ];
  if (broken) out.push(`BROKEN BILL (--break ${broken}): its log bill is a hundred times the catalog's.`);
  const probes = results.find((r) => r.probes)?.probes ?? [];
  if (probes.length) {
    out.push(
      '',
      `Order probes at ${results.find((r) => r.probes)!.players} player(s): the held node tried first, on a copy.`,
    );
    for (const p of probes) {
      const claim = p.by === 'none' ? 'nothing enforces it' : 'the rules enforce it';
      const fact = p.accepted ? 'the rules ACCEPT it out of order' : 'the rules refuse it';
      const flag =
        p.accepted && p.by === 'none'
          ? '  <- DEFECT (decided order not enforced)'
          : p.accepted
            ? '  <- GRAPH BUG (graph says the rules enforce it)'
            : p.by === 'none'
              ? '  <- GRAPH BUG (graph says nothing enforces it)'
              : '';
      out.push(`  ${p.node} before ${p.before}: graph says ${claim}; ${fact}${flag}`);
    }
  }
  for (const players of counts) {
    const shown = only && !broken ? only : 'canonical';
    const canon = results.find((r) => r.players === players && r.order === shown)!;
    const cal = calibrated.get(players);
    out.push(
      '',
      `${players} player${players > 1 ? 's' : ''}, ${shown} order: straight-line ${verdict(canon)}${cal ? `; calibrated ${verdict(cal)}` : ''}`,
    );
    out.push('  node      reached    took     carries  walked m  refused   calibrated: reached  detour');
    for (const t of canon.nodes) {
      // From the moment its turn came to the moment it was reached (a parked node finishes later).
      const took = t.tick < 0 ? '-' : clock(t.tick - t.startTick);
      const c = cal?.nodes.find((x) => x.id === t.id);
      const d = detourOf(t.id);
      const calCol = cal
        ? `${(c && c.tick >= 0 ? clock(c.tick) : 'never').padStart(19)}  ${d ? `x${d.median.toFixed(2)} (n ${d.n})` : 'x1 (uncalibrated)'}`
        : '';
      out.push(
        `  ${t.id.padEnd(9)} ${(t.tick < 0 ? 'never' : clock(t.tick)).padStart(8)}  ${took.padStart(7)}${t.parked ? ' (parked)' : '         '}${String(t.carries).padStart(4)} ${String(Math.round(t.walked)).padStart(9)} ${String(t.refused).padStart(8)}  ${calCol}`,
      );
    }
    for (const r of results.filter((x) => x.players === players && x.order !== shown))
      out.push(`  order "${r.order}": ${verdict(r)}`);
  }
  console.log(out.join('\n'));
}
// ---------------------------------------------------------------- by hand: the vehicle isn't there
/** The nodes a vehicle feeds today (dev/loop/graph.ts `supply`). */
const VEHICLE_FED = NODES.filter((n) => Object.values(n.supply).some((s) => s.by !== 'hand')).map((n) => n.id);
/** How each is played on foot. A cart station: its depot and shelf flags are off in this process only (the catalog
 * object, as --break does), so the cart never serves it; every action still goes through the host's rules. The kit
 * train and the wagon have no such flag (src/sim hard-codes Q6's kit and the wagon's footings). Q6 stays in its place
 * after the boiler, since station 6 takes nothing by hand before trains run (decisions.md, 9 November), and is fed on
 * foot alongside the kit train; the crossing is played before the table turn, its footings carried from the Works rack. */
function byHandPlan(id: NodeId) {
  const s = LINE2_STATIONS.find((x) => x.id === id);
  if (s && !s.feed) return { flags: s, before: null };
  if (id === 'Q6' || id === 'Q7') return { flags: null, before: null };
  if (id === 'bents' || id === 'weights') return { flags: null, before: null };
  if (id === 'crossing') return { flags: null, before: 'table' as NodeId };
  throw new Error(`--by-hand: no vehicle feeds ${id}`);
}
function handOrder(ids: readonly NodeId[]) {
  const order = [...proposeOrders()[0]!.order];
  for (const id of ids) {
    const { before } = byHandPlan(id);
    if (!before) continue;
    order.splice(order.indexOf(id), 1);
    order.splice(order.indexOf(before), 0, id);
  }
  return order;
}
function runByHand(arg: string, counts: number[], args: string[]) {
  const ids: NodeId[] = arg === 'all' ? VEHICLE_FED : [arg as NodeId];
  if (!ids.every((id) => VEHICLE_FED.includes(id)))
    throw new Error(`--by-hand: one of ${VEHICLE_FED.join(', ')}, or all`);
  const started = performance.now();
  const rows: { players: number; base: RunResult; hand: RunResult }[] = [];
  for (const players of counts) {
    const base = playOrder(proposeOrders()[0]!.order, 'canonical', players);
    const saved = ids.map((id) => byHandPlan(id).flags).map((s) => (s ? { s, depot: s.depot, shelf: s.shelf } : null));
    for (const x of saved) if (x) Object.assign(x.s, { depot: false, shelf: false });
    let hand: RunResult;
    try {
      hand = playOrder(handOrder(ids), `by hand: ${ids.join(', ')}`, players, { byHand: new Set(ids) });
    } finally {
      for (const x of saved) if (x) Object.assign(x.s, { depot: x.depot, shelf: x.shelf });
    }
    rows.push({ players, base, hand });
  }
  const ms = Math.round(performance.now() - started);
  if (args.includes('--json')) return console.log(JSON.stringify({ ms, rows }, null, 2));
  const out = [
    `By hand: ${ids.join(', ')} fed on foot through the real rules, against the canonical run. ${ms} ms.`,
    `Cart stations play with their depot and shelf off (this process only); Q6 plays after the boiler, on foot beside`,
    `the kit train (it takes nothing by hand before trains), and the crossing before the table, so the wagon doesn't`,
    `exist yet. Straight-line walking, as \`loop -- run\`.`,
  ];
  for (const { players, base, hand } of rows) {
    out.push('', `${players} player${players > 1 ? 's' : ''}: canonical ${verdict(base)}; by hand ${verdict(hand)}`);
    out.push('  node      took (vehicle)   took (by hand)   difference   carries by hand   walked m by hand');
    for (const id of ids) {
      const b = base.nodes.find((t) => t.id === id),
        hd = hand.nodes.find((t) => t.id === id);
      const took = (t?: NodeTime) => (t && t.tick >= 0 ? t.tick - t.startTick : undefined);
      const tb = took(b),
        th = took(hd);
      const diff = tb !== undefined && th !== undefined ? `${th >= tb ? '+' : '-'}${clock(Math.abs(th - tb))}` : '-';
      out.push(
        `  ${id.padEnd(9)} ${(tb === undefined ? 'never' : clock(tb)).padStart(14)} ${(th === undefined ? 'never' : clock(th)).padStart(16)} ${diff.padStart(12)} ${String(hd?.carries ?? 0).padStart(17)} ${String(Math.round(hd?.walked ?? 0)).padStart(18)}`,
      );
    }
    if (!hand.softlock && !base.softlock) {
      const d = hand.ticks - base.ticks;
      out.push(`  whole loop: ${d >= 0 ? '+' : '-'}${clock(Math.abs(d))} by hand`);
    }
  }
  console.log(out.join('\n'));
}

/** In this process only: a station's log bill a hundred times over, so the run must report a softlock. */
function breakBill(id: string) {
  const s = [...LINE1_STATIONS, ...LINE2_STATIONS].find((x) => x.id === id);
  if (!s)
    throw new Error(`--break: a station id (${[...LINE1_STATIONS, ...LINE2_STATIONS].map((x) => x.id).join(', ')})`);
  Object.assign(s, { bill: [s.bill[0] * 100, s.bill[1]] });
}
const verdict = (r: RunResult) =>
  r.softlock
    ? `SOFTLOCK at ${r.softlock.node} (${clock(r.softlock.tick)}: ${r.softlock.why})${r.graphBug ? `; GRAPH BUG: ${r.graphBug.join('; ')}` : ''}`
    : `finished in ${clock(r.ticks)}`;

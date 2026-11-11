// Differential check for the railway's move onto E (docs/plans/ecs-e.md, step 3): the pre-move rules (a copy of
// src/sim from before the move, at LEGACY) and the systems run the same random action streams, and the read model
// must equal the legacy state after every action, tick, pulse and resume. Run once during the move:
//   LEGACY=/path/to/legacy/sim node dev/spikes/ecs/railway-diff.ts [seeds]
import { createRailwayWorld } from '../../../src/sim/railway-components.ts';
import { railwayView } from '../../../src/sim/railway-read-model.ts';
import { railwayCheck } from '../../../src/sim/railway-check.ts';
import * as sysCore from '../../../src/sim/railway-sys-core.ts';
import * as sys from '../../../src/sim/railway-systems.ts';
import * as sysAway from '../../../src/sim/railway-sys-away.ts';
import * as sysLine1 from '../../../src/sim/railway-sys-line1.ts';
import { RAILWAY_SOURCES } from '../../../src/sim/railway-layout.ts';
import { LINE1_STATIONS, LINE1_GREAT_TREE } from '../../../src/sim/railway-line-layout.ts';
import { LINE2_STATIONS } from '../../../src/sim/railway-line2-layout.ts';
import { line2Active } from '../../../src/sim/railway-line2.ts';
import { railActiveStation, type RailAction, type Railway } from '../../../src/sim/railway.ts';
import { mulberry32 } from '../../../src/sim/rng.ts';

const L = process.env.LEGACY;
if (!L) throw new Error('LEGACY=<dir of the pre-move src/sim>');
const old = (await import(`${L}/railway.ts`)) as Record<string, (...a: unknown[]) => unknown>;
const oldSupply = (await import(`${L}/railway-supply.ts`)) as Record<string, (...a: unknown[]) => unknown>;
const oldLine = (await import(`${L}/railway-line.ts`)) as Record<string, (...a: unknown[]) => unknown>;

const PIDS = ['aa', 'bb', 'cc'];
const canon = (v: unknown): unknown =>
  Array.isArray(v)
    ? v.map(canon)
    : v && typeof v === 'object'
      ? Object.fromEntries(
          Object.keys(v)
            .sort()
            .map((k) => [k, canon((v as Record<string, unknown>)[k])]),
        )
      : v;
function norm(s: Railway) {
  const { piles, accounts, ...rest } = structuredClone(s) as Railway;
  delete (rest as Partial<Railway>).nextPile;
  return JSON.stringify(
    canon({
      ...rest,
      piles: piles.map(({ x, z, n, kind, y, age }) => [x, z, n, kind ?? 0, y, age]),
      accounts: accounts.map((a) => ({ ...a, stone: a.stone ?? 0, rails: a.rails ?? 0 })),
      stoneStock: rest.stoneStock ?? 0,
      stoneAllocation: rest.stoneAllocation ?? 0,
      stoneUsed: rest.stoneUsed ?? 0,
      stoneDelivered: rest.stoneDelivered ?? 0,
    }),
  );
}
function firstDiff(a: string, b: string) {
  let k = 0;
  while (k < a.length && a[k] === b[k]) k++;
  return `legacy …${a.slice(Math.max(0, k - 80), k + 60)}\n    new …${b.slice(Math.max(0, k - 80), k + 60)}`;
}

let checks = 0;
// Time spent in each side's rules (the audit is on for every fourth seed, so E's figure includes some audit cost).
const cost = { legacyAct: 0, eAct: 0, acts: 0, legacyTick: 0, eTick: 0, ticks: 0 };
/** What moves the line on for pid: wake, cut, fill the active frame, the axe and beam, the forge, the Q frames. */
function useful(s: Railway, pid: string): Partial<RailAction> {
  const a = s.accounts.find((row) => row.pid === pid)!;
  const load = a.carry + (a.stone ?? 0) + (a.rails ?? 0);
  const active = railActiveStation(s),
    spec = LINE1_STATIONS[active]!;
  const job = active === 0 ? s : s.line!.jobs[active - 1]!;
  const l = s.line!,
    l2 = s.line2!,
    b = l.beam;
  if (s.awake < 0) return { op: 'rail.wake' };
  if (b.state === 'held' && b.holder === pid) return { op: 'rail.beamDeposit', station: 'T3', revision: b.revision };
  if (!job.completion && job.start < 0) {
    if (active === 2 && job.stock === 40) {
      if (!l.axe) return { op: 'rail.axe' };
      if (b.state === 'standing') return { op: 'rail.beamChop' };
      if ((b.state === 'available' || b.state === 'ground') && load === 0)
        return { op: 'rail.beamTake', revision: b.revision };
      if (load) return { op: 'rail.drop', x: 400, z: 400, y: 10, n: a.carry || 1, kind: a.carry ? 0 : a.stone ? 1 : 2 };
    }
    const needStone = (job.stoneStock ?? 0) < spec.bill[1];
    if (load < 8) {
      if (needStone && (a.stone ?? 0) < 4) return { op: 'rail.mine', id: l.rocks.findIndex((n) => n > 0) };
      const k = s.sources.findIndex((n) => n > 0);
      return k >= 0
        ? { op: 'rail.chop', id: RAILWAY_SOURCES[k]![0], yaw: 0.5, collapsed: false }
        : { op: 'rail.rackTake' };
    }
    if (needStone && a.stone) return { op: 'rail.deposit', station: spec.id, n: a.stone, kind: 1 };
    return { op: 'rail.deposit', station: spec.id, n: a.carry, kind: 0 };
  }
  if (l.jobs[1].completion) {
    if (l2.forge.lit < 0)
      return a.carry >= 4
        ? { op: 'rail.deposit', station: 'F', n: a.carry, kind: 0 }
        : {
            op: 'rail.chop',
            id: RAILWAY_SOURCES[
              Math.max(
                0,
                s.sources.findIndex((n) => n > 0),
              )
            ]![0],
            yaw: 1,
            collapsed: true,
          };
    const q = line2Active(s);
    if (q >= 0) {
      const qs = LINE2_STATIONS[q]!,
        qj = l2.jobs[q]!;
      if (qj.railStock < qs.bill[1] && (a.rails ?? 0) > 0)
        return { op: 'rail.deposit', station: qs.id, n: a.rails!, kind: 2 };
      if (qj.stock < qs.bill[0] && a.carry > 0) return { op: 'rail.deposit', station: qs.id, n: a.carry, kind: 0 };
      if (load < 8) {
        if (qj.railStock < qs.bill[1] && l2.forge.rack) return { op: 'rail.forgeTake' };
        if (l2.depot) return { op: 'rail.depotTake' };
        const k = s.sources.findIndex((n) => n > 0);
        if (k >= 0) return { op: 'rail.chop', id: RAILWAY_SOURCES[k]![0], yaw: 2, collapsed: false };
      }
      return { op: 'rail.drop', x: 500, z: 500, y: 0, n: 1, kind: a.carry ? 0 : a.stone ? 1 : 2 };
    }
    return pick2([
      { op: 'rail.lever' },
      { op: 'rail.seaSwitch' },
      { op: 'rail.hook' },
      { op: 'rail.jump' },
      { op: 'rail.boilerTake', revision: l2.boiler.revision },
      { op: 'rail.boilerDrop', revision: l2.boiler.revision, x: 91900, y: 1815, z: 540 },
      { op: 'rail.boilerFit', revision: l2.boiler.revision },
      { op: 'rail.call', id: 2 },
      { op: 'rail.breaker' },
      { op: 'rail.strike', id: 1 },
      { op: 'rail.kiln' },
      { op: 'rail.footTake', rack: 0 },
      { op: 'rail.footSet', site: 0 },
      { op: 'rail.cradle' },
      { op: 'rail.turn', to: 1, revision: s.shed?.tableRev ?? 0 },
    ]);
  }
  return { op: 'rail.jump' };
}
let flip = 0;
const pick2 = <T>(xs: T[]) => xs[flip++ % xs.length]!;
function run(seed: number, steps: number) {
  const r = mulberry32(seed);
  const pick = <T>(xs: readonly T[]) => xs[Math.floor(r() * xs.length)]!;
  const o = old.createRailway!(true, true) as Railway;
  const w = createRailwayWorld({ audit: !process.env.NO_AUDIT && seed % 4 === 0 });
  let tick = 0;
  const req = new Map<string, number>();
  const ep = new Map<string, number>();
  const same = (what: string, extra?: [unknown, unknown]) => {
    checks++;
    const a = norm(o),
      b = norm(railwayView(w));
    if (a !== b) throw new Error(`seed ${seed} after ${what}:\n    ${firstDiff(a, b)}`);
    if (extra && JSON.stringify(extra[0]) !== JSON.stringify(extra[1]))
      throw new Error(`seed ${seed} ${what}: legacy ${JSON.stringify(extra[0])} new ${JSON.stringify(extra[1])}`);
  };
  for (const pid of PIDS) {
    ep.set(pid, 1);
    req.set(pid, 0);
    same('session', [old.railSession!(o, pid, 1), sysCore.railSession(w, pid, 1)]);
  }
  const pileIds = () => [o.piles.map((p) => p.id), railwayView(w).piles.map((p) => p.id)] as const;
  for (let step = 0; step < steps; step++) {
    const roll = r();
    if (roll < 0.12) {
      tick += pick([1, 1, 2, 5, 30, 200]);
      let t0 = performance.now();
      old.railTick!(o, tick);
      cost.legacyTick += performance.now() - t0;
      t0 = performance.now();
      sys.railTick(w, tick);
      cost.eTick += performance.now() - t0;
      cost.ticks++;
      same(`tick ${tick}`);
      continue;
    }
    if (roll < 0.14) {
      const [oi, ni] = pileIds();
      const take = oi.map(() => r() < 0.5);
      const pulse = (ids: number[]) => ({
        marker: Math.floor(tick / 600) + 1 + step,
        grow: Array.from({ length: 25 }, () => pick('0123456789abcdef'.split(''))).join(''),
        recover: ids.filter((_id, k) => take[k]),
        ...(r() < 0.5 ? { beam: o.line!.beam.revision } : {}),
      });
      const p = pulse(oi);
      const intervals = { regrow: pick([1, 5, 31]), recover: pick([1, 3, 21]) };
      same(`supply`, [
        oldSupply.railSupplyPulse!(o, p, intervals),
        sysAway.railSupplyPulse(w, { ...p, recover: pulse(ni as number[]).recover }, intervals),
      ]);
      continue;
    }
    if (roll < 0.15) {
      const ticks = pick([1, 10, 100, 2000]),
        marker = step + 1;
      same('resume', [old.railResume!(o, ticks, marker, tick), sysAway.railResume(w, ticks, marker, tick)]);
      continue;
    }
    const pid = pick(PIDS);
    if (roll < 0.16) {
      const b = { ...o.line!.beam }; // a copy: the legacy call below changes the original
      const which = pick(['release', 'stood', 'putDown', 'session']);
      if (which === 'release')
        same('beamRelease', [
          oldLine.railBeamRelease!(o, b.holder || pid, b.epoch, b.revision),
          sysLine1.railBeamRelease(w, b.holder || pid, b.epoch, b.revision),
        ]);
      else if (which === 'stood') {
        const [x, y, z] = pick([
          [99000, 3000, -13000],
          [LINE1_GREAT_TREE.x, 3000, LINE1_GREAT_TREE.z],
          [0, 0, 0],
        ]);
        same('beamStood', [
          oldLine.railBeamStood!(o, b.holder || pid, x, y, z),
          sysLine1.railBeamStood(w, b.holder || pid, x!, y!, z!),
        ]);
      } else if (which === 'putDown')
        same('beamPutDown', [
          oldLine.railBeamPutDown!(o, b.holder || pid),
          sysLine1.railBeamPutDown(w, b.holder || pid),
        ]);
      else {
        const e = ep.get(pid)! + 1;
        ep.set(pid, e);
        req.set(pid, 0);
        same('session', [old.railSession!(o, pid, e), sysCore.railSession(w, pid, e)]);
      }
      continue;
    }
    // An action: mostly purposeful (what moves the line on), sometimes random.
    const s = o;
    const active = railActiveStation(s),
      q = line2Active(s);
    const kind = pick([0, 0, 0, 1, 2]);
    const [oi, ni] = pileIds();
    const pk = oi.length ? Math.floor(r() * oi.length) : -1;
    const beam = s.line!.beam;
    const ops: (() => Partial<RailAction>)[] = [
      () => ({ op: 'rail.wake' }),
      () => ({
        op: 'rail.chop',
        id: r() < 0.1 ? pick([209, 232]) : RAILWAY_SOURCES[Math.floor(r() * 12)]![0],
        yaw: pick([0.5, 1.25, -2]),
        collapsed: r() < 0.5,
      }),
      () => ({ op: 'rail.mine', id: Math.floor(r() * 5) }),
      () => ({
        op: 'rail.deposit',
        station: pick([LINE1_STATIONS[active]!.id, 'F', q >= 0 ? LINE2_STATIONS[q]!.id : 'Q1', 'T1']),
        n: 1 + Math.floor(r() * 8),
        kind,
      }),
      () => ({ op: 'rail.drop', x: pick([100, 200]), z: 300, y: 50, n: 1 + Math.floor(r() * 4), kind }),
      () => ({ op: 'rail.take', id: pk >= 0 ? -1 : 999, kind }),
      () => ({ op: 'rail.rackTake', kind: pick([0, 1, 2]) }),
      () => ({ op: 'rail.axe' }),
      () => ({ op: 'rail.beamChop' }),
      () => ({ op: 'rail.beamTake', revision: r() < 0.8 ? beam.revision : beam.revision + 1 }),
      () => ({
        op: 'rail.beamDrop',
        revision: beam.revision,
        ...pick([
          { x: 99000, y: 3000, z: -13000 },
          { x: 0, y: 0, z: 0 },
        ]),
      }),
      () => ({ op: 'rail.beamDeposit', station: 'T3', revision: beam.revision }),
      () => ({ op: 'rail.jump' }),
      () => ({ op: 'rail.forgeTake' }),
      () => ({ op: 'rail.depotTake' }),
      () => ({ op: 'rail.lever' }),
      () => ({ op: 'rail.seaSwitch' }),
      () => ({ op: 'rail.hook' }),
      () => ({ op: 'rail.boilerTake', revision: s.line2!.boiler.revision }),
      () => ({ op: 'rail.boilerDrop', revision: s.line2!.boiler.revision, x: 91900, y: 1815, z: 540 }),
      () => ({ op: 'rail.boilerFit', revision: s.line2!.boiler.revision }),
      () => ({ op: 'rail.call', id: Math.floor(r() * 6) }),
      () => ({ op: 'rail.breaker' }),
      () => ({ op: 'rail.strike', id: Math.floor(r() * 2) }),
      () => ({ op: 'rail.kiln' }),
      () => ({ op: 'rail.footTake', rack: Math.floor(r() * 2) }),
      () => ({ op: 'rail.footSet', site: Math.floor(r() * 3) }),
      () => ({ op: 'rail.cradle' }),
      () => ({ op: 'rail.turn', to: Math.floor(r() * 2), revision: s.shed?.tableRev ?? 0 }),
      () => ({ op: 'rail.reject' }),
    ];
    const weights = [1, 8, 3, 8, 3, 3, 1, 1, 2, 1, 1, 1, 1, 2, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0.3];
    let x = r() * weights.reduce((a, b) => a + b, 0),
      k = 0;
    while ((x -= weights[k]!) > 0) k++;
    const base = r() < 0.55 ? useful(o, pid) : ops[k]!();
    const request = req.get(pid)! + 1;
    req.set(pid, request);
    const e = { ...base, epoch: ep.get(pid)!, request } as RailAction;
    const eo = e.op === 'rail.take' && pk >= 0 ? { ...e, id: oi[pk] } : e;
    const en = e.op === 'rail.take' && pk >= 0 ? { ...e, id: ni[pk] } : e;
    let t0 = performance.now();
    const ro = old.railApply!(o, pid, eo, tick);
    cost.legacyAct += performance.now() - t0;
    t0 = performance.now();
    const rn = sys.railApply(w, pid, en, tick);
    sysCore.railSettle(w);
    cost.eAct += performance.now() - t0;
    cost.acts++;
    same(`${e.op} by ${pid} at ${tick}`, [ro, rn]);
  }
  railwayCheck(w);
  const progress = railwayView(w);
  if (process.env.DEBUG)
    console.log(
      seed,
      JSON.stringify(progress.line2!.forge),
      progress.sources.reduce((a, b) => a + b, 0),
      JSON.stringify(progress.accounts),
      progress.supply!.rack,
      tick,
    );
  const t = [progress, ...progress.line!.jobs].filter((j) => j.completion).length;
  const q = progress.line2!.jobs.filter((j) => j.completion).length;
  return `T done ${t}, Q done ${q}, lever ${progress.line2!.lever} piles ${progress.piles.length}`;
}

const seeds = Number(process.argv[2] ?? 200);
const reached = new Map<string, number>();
for (let seed = 1; seed <= seeds; seed++) {
  const at = run(seed, 1500).split(' piles')[0]!;
  reached.set(at, (reached.get(at) ?? 0) + 1);
}
console.log(`${seeds} seeds, ${checks} comparisons, all equal. Reached:`, Object.fromEntries(reached));
const us = (ms: number, n: number) => `${((ms / n) * 1000).toFixed(1)} µs`;
console.log(
  `per action: legacy ${us(cost.legacyAct, cost.acts)}, E ${us(cost.eAct, cost.acts)};`,
  `per rule tick: legacy ${us(cost.legacyTick, cost.ticks)}, E ${us(cost.eTick, cost.ticks)}`,
);

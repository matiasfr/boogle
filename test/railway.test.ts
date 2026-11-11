// The railway on E (docs/plans/ecs-e.md, step 3): bounded request receipts, the world's save and its load check, and
// the catalog the line is built from. Line one's and line two's rules: railway-line-authority and railway-line2.
import test from 'node:test';
import assert from 'node:assert/strict';
import { RAILWAY_OUTCOMES, type RailAction } from '../src/sim/railway.ts';
import { RAILWAY_SOURCES, RAILWAY_T1 as T1 } from '../src/sim/railway-layout.ts';
import { mulberry32 } from '../src/sim/rng.ts';
import { Account, Beam, Outcome, Tree, createRailwayWorld, RAIL_COMPONENTS } from '../src/sim/railway-components.ts';
import { railwayCheck } from '../src/sim/railway-check.ts';
import type { World } from '../src/ecs/index.ts';
import { railPhase } from '../src/sim/railway-queries-line1.ts';
import { railCounts } from '../src/sim/railway-queries-line2.ts';
import {
  account,
  accounts,
  apply,
  beam,
  createRailway,
  hash,
  invariant,
  outcomes,
  railOutcome,
  railSession,
  restore,
  trees,
} from './helpers/rail.ts';

function awake(pids = ['p0']) {
  const s = createRailway();
  for (const pid of pids) railSession(s, pid, 1);
  apply(s, pids[0]!, { op: 'rail.wake', epoch: 1, request: 1 }, 0);
  return s;
}
const action = (s: World, pid: string, op: string, fields: Partial<RailAction> = {}) => {
  const a = account(s, pid)!;
  const e = { epoch: a.epoch, request: a.request + 1, op, ...fields } as RailAction;
  const result = apply(s, pid, e, 100);
  assert.equal(invariant(s), null);
  return { result, e };
};

test('terminal receipts survive retries, rejection, eviction, takeover and restart without respending', () => {
  const s = awake();
  action(s, 'p0', 'rail.chop', { id: RAILWAY_SOURCES[0]![0], yaw: 0, collapsed: false });
  const first = action(s, 'p0', 'rail.drop', { n: 1, x: T1.x, y: 0, z: T1.z });
  assert.deepEqual(apply(s, 'p0', first.e, 100), first.result, 'a retry answers from the receipt');
  for (let i = 0; i < RAILWAY_OUTCOMES + 1; i++) action(s, 'p0', 'rail.reject');
  assert.equal(outcomes(s).length, RAILWAY_OUTCOMES, 'the history keeps its bound, the oldest despawned');
  const r = restore(s);
  assert.equal(apply(r, 'p0', first.e, 200).status, 'snapshot-required');
  const carry = account(r, 'p0')!.carry;
  const rejected = action(r, 'p0', 'rail.reject');
  assert.equal(
    apply(r, 'p0', { ...rejected.e, op: 'rail.drop', n: 1, x: T1.x, y: 0, z: T1.z }, 200).status,
    'rejected',
  );
  assert.equal(railSession(r, 'p0', 2), true);
  assert.equal(railSession(r, 'p0', 2), false);
  assert.equal(railOutcome(r, 'p0', 1, rejected.e.request + 1)!.status, 'snapshot-required');
  assert.equal(account(r, 'p0')!.carry, carry, 'nothing was spent twice');
});

test('an action from a player with no account is refused and changes nothing', () => {
  const s = awake();
  const before = hash(s);
  const e = { op: 'rail.chop', id: RAILWAY_SOURCES[0]![0], yaw: 0, collapsed: false, epoch: 1, request: 2 };
  assert.equal(apply(s, 'nobody', e as RailAction, 100).status, 'snapshot-required');
  assert.equal(hash(s), before, 'no receipt, no state');
  assert.equal(invariant(s), null);
});

test('wake eligibility is scheduled', () => {
  const s = createRailway();
  railSession(s, 'p0', 1);
  assert.equal(
    apply(s, 'p0', { op: 'rail.chop', id: 0, yaw: 0, collapsed: false, epoch: 1, request: 1 }, 1).accepted,
    0,
  );
  apply(s, 'p0', { op: 'rail.wake', epoch: 1, request: 2 }, 2);
  assert.equal(railPhase(s, 2), 'waking');
  assert.equal(railPhase(s, 2 + T1.wakeTicks), 'idle');
});

test('a saved world loads all or nothing: archetypes, catalog, keys and every domain invariant', () => {
  const s = awake(['a', 'b']);
  const r = mulberry32(5);
  for (let k = 0; k < 40; k++)
    action(s, r() < 0.5 ? 'a' : 'b', 'rail.chop', { id: RAILWAY_SOURCES[k % 9]![0], yaw: r(), collapsed: true });
  const w = s;
  const good = w.snapshot();
  const before = w.hash();
  type Snap = typeof good;
  const col = (j: Snap, kind: string, field: string) => {
    const c = RAIL_COMPONENTS.find((row) => row.kind === kind)!;
    return j.c[kind]![1 + c.names.indexOf(field)]!;
  };
  const cases: [string, (j: Snap) => void][] = [
    ['an account over its carry', (j) => (col(j, 'account', 'carry')[0] = 9)],
    ['a log made from nothing', (j) => (col(j, 'tree', 'left')[0] = 10)],
    ['a tree missing', (j) => j.c.tree!.forEach((c) => c.pop())],
    ['a second account for one pid', (j) => (col(j, 'account', 'pid')[1] = col(j, 'account', 'pid')[0]!)],
    ['a tree with a job', (j) => j.c.jobRun!.forEach((c, i) => c.push(i ? 0 : (j.c.tree![0]![0]! as number)))],
    ['a pid that is not one', (j) => (col(j, 'account', 'pid')[0] = 'A!')],
    ['a request that is not a number', (j) => (col(j, 'account', 'request')[0] = 'NaN')],
  ];
  for (const [name, change] of cases) {
    const j = JSON.parse(JSON.stringify(good)) as Snap;
    change(j);
    assert.throws(() => w.load(j, railwayCheck), Error, name);
    assert.equal(w.hash(), before, name);
  }
  const copy = createRailwayWorld();
  copy.load(JSON.parse(JSON.stringify(good)), railwayCheck);
  assert.equal(copy.hash(), before);
  assert.deepEqual(
    [copy.snapshot(), accounts(copy), outcomes(copy), trees(copy), railCounts(copy)],
    [w.snapshot(), accounts(w), outcomes(w), trees(w), railCounts(w)],
  );
});

test('rows are plain data: read from the world, carrying only their schema fields', () => {
  const w = awake(['a']);
  const plain = (row: object) => Object.fromEntries(Object.entries(row));
  assert.deepEqual(
    [structuredClone(account(w, 'a')), structuredClone(beam(w)), structuredClone(trees(w))],
    [plain(account(w, 'a')!), plain(beam(w)), trees(w).map(plain)],
  );
  assert.deepEqual(Object.keys(beam(w)), Beam.names);
  assert.deepEqual(Object.keys(accounts(w)[0]!), Account.names);
  assert.equal(w.count(Tree), RAILWAY_SOURCES.length);
  assert.equal(w.count(Account), 1);
  assert.ok(w.count(Outcome) > 0, 'the request history is part of the world (not replicated)');
  assert.equal(Outcome.replicate, false);
});

test('catalog exactly pins current T1 recipe and every starter source to centimetres', async () => {
  const layout = await import('../src/place/layout.ts');
  const { frameBesideLine } = await import('../src/place/spatial-station.ts');
  const { LAND_TREES } = await import('../src/place/tree-catalog.ts');
  const rng = mulberry32(77),
    rows: number[][] = [];
  let id = 0;
  for (const g of layout.GROVES)
    for (let k = 0; k < g.n; k++) {
      const a = (k / g.n) * Math.PI * 2 + rng() * 0.5,
        r = g.r * (0.35 + rng() * 0.65);
      rows.push([
        id++,
        Math.round((g.x + Math.cos(a) * r + layout.ORIGIN.x) * 100),
        Math.round((g.z + Math.sin(a) * r + layout.ORIGIN.z) * 100),
      ]);
      rng(); // tree size consumes the third value
    }
  rows.push([
    id++,
    Math.round((layout.OAK.x + layout.ORIGIN.x) * 100),
    Math.round((layout.OAK.z + layout.ORIGIN.z) * 100),
  ]);
  id++; // great tree is a later beam, not T1 material
  for (const t of LAND_TREES) {
    if (!t.hardwood) rows.push([id, Math.round(t.x * 100), Math.round(t.z * 100)]);
    id++;
  }
  assert.deepEqual(RAILWAY_SOURCES, rows);
  const link = layout.LINKS[0]!,
    station = link.stations[0]!,
    at = frameBesideLine(station, link.line, link.dir);
  assert.equal(T1.bill, station.logs);
  assert.equal(station.rails, 0);
  assert.equal(T1.carry, layout.TUNE.carry);
  assert.equal(T1.strokeYield, layout.TUNE.logsPerStroke);
  assert.equal(T1.sourceYield, layout.TUNE.strokes * layout.TUNE.logsPerStroke);
  assert.equal(T1.fromCm, Math.round(station.s * 100));
  assert.equal(T1.toCm, Math.round(station.to * 100));
  assert.equal(T1.x, Math.round(at.x * 100));
  assert.equal(T1.z, Math.round(at.z * 100));
  assert.equal(T1.layTicks, Math.ceil(((station.s - station.to) / layout.TUNE.laySpeed) * 10));
  assert.equal(T1.feedTicks, Math.ceil(((station.logs - 1) * layout.TUNE.feedS + 0.55) * 10));
  assert.equal(T1.starterRails, layout.TUNE.rackStart);
  assert.equal(T1.swingMs, layout.TUNE.swingS * 1000);
  assert.equal(T1.unloadMs, layout.TUNE.unloadS * 1000);
});

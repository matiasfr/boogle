// Owner-requested exception to the test diet: offline material conservation, not UI/gameplay tests.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { model, prototype, simulateCampaign } from '../dev/economy/model.ts';
import { validateCampaign, railSeconds } from '../dev/economy/campaign.ts';
import { threeArea } from '../dev/economy/three-area.ts';
import { fiveArea } from '../dev/economy/five-area.ts';
import type { Campaign, Stock } from '../dev/economy/campaign-types.ts';

const sum = (s: Stock) => Object.values(s).reduce((a, b) => a + b, 0);
function conserved(r: ReturnType<typeof simulateCampaign>) {
  const l = r.ledger;
  for (const g of new Set([...Object.keys(l.initial), ...Object.keys(l.produced), ...Object.keys(l.held)])) {
    assert.equal(
      (l.initial[g] ?? 0) + (l.produced[g] ?? 0) - (l.recipeInputs[g] ?? 0),
      (l.held[g] ?? 0) + (l.installed[g] ?? 0),
      g,
    );
    for (const account of [l.initial, l.produced, l.recipeInputs, l.held, l.installed])
      assert.ok(Number.isSafeInteger(account[g] ?? 0) && (account[g] ?? 0) >= 0);
  }
  assert.equal(sum(l.initial), sum(l.held) + sum(l.installed) + l.processing);
  assert.ok(r.auditCount > 1);
}
function tiny(): Campaign {
  return {
    ...structuredClone(threeArea),
    id: 'fixture',
    targetS: 600,
    horizonS: 1200,
    profile: { ...structuredClone(threeArea.profile), carry: 4, rack: 8 },
    sources: [
      { id: 'wood', node: 'source', requires: [], raw: 'raw', good: 'W', reserve: 24, seed: 0, batch: 4, seconds: 2 },
    ],
    lines: [
      {
        id: 'one',
        from: 'source',
        to: 'hub',
        requires: [],
        metres: 12,
        speedMps: 6,
        accelerationMps2: 2,
        dwellS: 1,
        transferS: 1,
        trains: 1,
        capacity: 4,
      },
      {
        id: 'two',
        from: 'hub',
        to: 'site',
        requires: [],
        metres: 12,
        speedMps: 6,
        accelerationMps2: 2,
        dwellS: 1,
        transferS: 1,
        trains: 1,
        capacity: 4,
      },
    ],
    tasks: [
      {
        id: 'a',
        label: 'A',
        area: 'test',
        site: 'site',
        requires: [],
        bill: { W: 8 },
        authoredS: 2,
        buildS: 10,
        carryM: 6,
        kind: 'R',
      },
      {
        id: 'b',
        label: 'B',
        area: 'test',
        site: 'site',
        requires: [],
        bill: { W: 8 },
        authoredS: 2,
        buildS: 10,
        carryM: 6,
        kind: 'F',
      },
      {
        id: 'end',
        label: 'End',
        area: 'test',
        site: 'site',
        requires: ['a', 'b'],
        bill: {},
        authoredS: 0,
        buildS: 0,
        carryM: 0,
        kind: 'E',
      },
    ],
    terminal: 'end',
    scenarios: {},
  };
}

test('historical calibration remains 437 seconds', () => assert.equal(model(prototype, 1).totalS, 437));
for (const c of [threeArea, fiveArea])
  for (const party of [1, 2, 3, 4]) {
    test(`${c.id}, ${party}: production, transfers and installs conserve every good`, () => {
      const r = simulateCampaign(c, party);
      conserved(r);
      assert.ok(r.complete);
      assert.ok(r.totals.maxConcurrentDeliveries > 1);
      assert.ok(r.totals.transfers > 0);
      const expected: Stock = {};
      const finished = new Set(r.trace.filter((e) => e.type === 'funded').map((e) => e.id));
      for (const t of c.tasks.filter((t) => finished.has(t.id)))
        for (const [g, n] of Object.entries(t.bill)) expected[g] = (expected[g] ?? 0) + n;
      assert.deepEqual(r.ledger.installed, expected);
      assert.ok(Math.abs(r.elapsedS - r.authoredS - r.haulOnlyS - r.waitS - r.absentS) < 1e-7);
    });
  }

test('competing jobs, bounded racks and transfers never reserve the final unit twice', () => {
  const c = tiny(),
    r = simulateCampaign(c, 4);
  conserved(r);
  assert.ok(r.complete);
  assert.equal(r.ledger.produced.W, 16);
  assert.equal(r.ledger.installed.W, 16);
  assert.equal(r.ledger.held.raw, 8);
  assert.equal(r.totals.transfers, 4);
  assert.deepEqual(r, simulateCampaign(c, 4));
});

test('a full-pack departure retains personal goods and the remaining worker can fund the deficit', () => {
  const c = tiny();
  const baseline = simulateCampaign(c, 2);
  const pickup = baseline.trace.find((e) => e.type === 'carry' && e.detail.startsWith('p1:'))!;
  assert.ok(pickup);
  const r = simulateCampaign(c, 2, {
    presence: [
      { atS: 0, players: ['p1', 'p2'] },
      { atS: pickup.atS + 0.1, players: ['p2'] },
    ],
  });
  conserved(r);
  assert.ok(r.complete);
  assert.equal(sum(r.people.find((p) => p.id === 'p1')!.retainedCargo), 4);
  assert.equal(r.ledger.installed.W, 16);
  assert.equal(r.ledger.produced.W, 20);
});

test('funded machinery can finish in absence; no new production starts while empty', () => {
  const c = tiny();
  const baseline = simulateCampaign(c, 1);
  const funded = baseline.trace.find((e) => e.type === 'funded' && e.id === 'a')!;
  const leave = funded.atS + 0.1,
    back = leave + 100;
  const r = simulateCampaign(c, 1, {
    presence: [
      { atS: 0, players: ['p1'] },
      { atS: leave, players: [] },
      { atS: back, players: ['p1'] },
    ],
  });
  conserved(r);
  assert.ok(r.complete);
  assert.ok(r.trace.some((e) => e.type === 'complete' && e.id === 'a' && e.atS > leave && e.atS < back));
  assert.equal(
    r.trace.filter(
      (e) => ['purchase', 'process', 'dispatch', 'carry'].includes(e.type) && e.atS > leave && e.atS < back,
    ).length,
    0,
  );
});

test('late join grants current access and unexperienced reveals without material or repeated fees', () => {
  const c = tiny();
  const base = simulateCampaign(c, 1);
  const joined = simulateCampaign(c, 1, {
    presence: [
      { atS: 0, players: ['p1'] },
      { atS: base.elapsedS + 1, players: ['p1', 'late'] },
    ],
  });
  conserved(joined);
  assert.deepEqual(joined.ledger, base.ledger);
  assert.deepEqual(joined.people.find((p) => p.id === 'late')!.unexperienced.sort(), ['a', 'b', 'end']);
});

test('insufficient finite stock blocks explicitly, preserving partial and in-flight stock', () => {
  const c = tiny();
  c.sources[0]!.reserve = 7;
  const r = simulateCampaign(c, 2);
  conserved(r);
  assert.equal(r.complete, false);
  assert.equal(r.ledger.produced.W, 7);
  assert.equal(r.terminalS, null);
});

test('zero detours and all-optional-first preserve the main route; the Arc A bill matches research', () => {
  const r = simulateCampaign(fiveArea, 1, { optional: false });
  conserved(r);
  assert.ok(r.complete);
  assert.deepEqual(r.ledger.installed, { W: 348, stone: 8, rails: 102, C: 60, S: 68, X: 3, U: 24 });
  const all = simulateCampaign(fiveArea, 1, { policy: 'optional-first' });
  conserved(all);
  assert.ok(all.complete);
  assert.deepEqual(all.ledger.installed, { W: 380, stone: 8, rails: 102, C: 86, S: 92, X: 5, U: 52 });
});

test('bad graphs, invalid quantities and optional gates fail before scheduling', () => {
  const c = tiny();
  c.tasks[0]!.requires = ['end'];
  assert.throws(() => validateCampaign(c), /Circular/);
  c.tasks[0]!.requires = [];
  c.tasks[0]!.optional = true;
  assert.throws(() => validateCampaign(c), /needs optional/);
  c.tasks[0]!.optional = false;
  c.tasks[0]!.bill.W = 1.5;
  assert.throws(() => validateCampaign(c), /Invalid/);
  assert.throws(() => simulateCampaign(tiny(), 5), /1–4/);
  assert.throws(() => simulateCampaign(tiny(), 1, { supply: 0 }), /Invalid/);
});

test('acceleration and line length affect the physical rail leg, including short triangular trips', () => {
  assert.equal(railSeconds(100, 10, 2), 15);
  assert.equal(railSeconds(8, 10, 2), 4);
});

test('iterative moves open alternate routes; skipping them preserves a solo main path', () => {
  const upgraded = simulateCampaign(threeArea, 1, { policy: 'optional-first' });
  const direct = simulateCampaign(threeArea, 1, { optional: false });
  assert.ok(upgraded.complete && direct.complete);
  assert.ok(upgraded.trace.some((e) => e.type === 'path' && e.detail === 'final-plate'));
  assert.ok(upgraded.trace.some((e) => e.type === 'path' && e.detail === 'basket-glide'));
  assert.ok(direct.trace.some((e) => e.type === 'path' && e.detail === 'final-walk'));
  assert.equal(upgraded.profile.extraJumps, 2);
  assert.ok(upgraded.unlocks.find((u) => u.id === 'jump-plus')!.pathsOpened.includes('final-jump'));
  assert.ok(!upgraded.unlocks.some((u) => u.id === 'sail-practice'));
});

test('zero-duration/zero-cost counterfactuals and omitted dependent options remain finite', () => {
  const free = simulateCampaign(tiny(), 1, { cost: 0, content: 0 });
  conserved(free);
  assert.ok(free.complete);
  const omitted = simulateCampaign(fiveArea, 1, { omit: ['C5'] });
  conserved(omitted);
  assert.ok(omitted.complete);
  assert.ok(!omitted.unlocks.some((u) => u.id === 'C5' || u.id === 'U6'));
});

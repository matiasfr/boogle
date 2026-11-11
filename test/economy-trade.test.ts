// Owner-requested (10 and 11 November): the passenger-trade economy model's invariants. Offline design arithmetic, not
// game code. Shares dev/economy/trade-model.ts with docs/world/trade-economy.html.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  awayCredit,
  billOf,
  catalog,
  defaultTunables,
  headline,
  playRooms,
  POLICIES,
  run,
} from '../dev/economy/trade-model.ts';
import { TUNABLES, TOWNS, SEAT_STEPS, MATS } from '../dev/economy/trade-data.ts';
import { routeSpine } from '../dev/economy/trade-route.ts';
import { PAGE, pageData, sourceHash } from '../dev/economy/build-trade-page.ts';

const spine = routeSpine();
const T = defaultTunables();
const room = (id: string) => POLICIES.find((p) => p.id === id)!;
const sum = (o: Record<string, number>) => Object.values(o).reduce((a, b) => a + b, 0);

test("trade: every number is one named tunable, and the fares are the brief's", () => {
  assert.equal(new Set(TUNABLES.map((r) => r.key)).size, TUNABLES.length);
  const fare = (km: number) => T['fare.board']! + T['fare.per100m']! * km * 10;
  assert.equal(fare(T['km.village']!), 7);
  assert.equal(fare(T['km.ring']!), 14);
  assert.equal(fare(T['km.canopy']!), 31);
});

test('trade: materials and Boogles never convert', () => {
  for (const p of POLICIES) {
    const r = run(spine, T, p);
    const b = r.ledger.boogles;
    // The Boogle account balances on its own: what landed is what is held plus what was spent.
    assert.ok(Math.abs(b.earned - (b.wallet + b.spent)) < 1e-6, p.id);
    assert.ok(Math.abs(sum(b.spentOn) - b.spent) < 1e-6, p.id);
    // Materials are hauled only for seats, and exactly the seat bills.
    const bills: Record<string, number> = { W: 0, St: 0, Fi: 0, Cu: 0 };
    for (const s of r.seatSteps) {
      const [town, step] = s.split('@')[0]!.split('.') as [
        (typeof TOWNS)[number],
        (typeof SEAT_STEPS)['village'][number],
      ];
      if (p.seats === 'haul') for (const m of MATS) bills[m]! += billOf(T, town, step)[m] ?? 0;
    }
    for (const m of MATS) assert.equal(r.ledger.materials[m], bills[m], `${p.id} ${m}`);
    // Seats cost one currency in a room, never both.
    if (p.seats === 'haul') assert.equal(b.spentOn.seat ?? 0, 0, p.id);
    if (p.seats === 'boogles') assert.equal(sum(r.ledger.materials), 0, p.id);
    if (p.seats !== 'haul') assert.equal(r.ledger.hauledSeatMin, 0, p.id);
    // No item is priced in both: every catalog item is a Boogle price and carries no bill.
    for (const it of catalog(T, p)) assert.ok(!('bill' in it) && Number.isFinite(it.price) && it.price > 0, it.id);
    if (p.seats === 'haul') assert.ok(!catalog(T, p).some((it) => it.kind === 'seat'));
  }
});

test('trade: the room that never spends finishes the route on its base hours', () => {
  const never = run(spine, T, room('never'));
  assert.equal(never.ledger.boogles.spent, 0);
  assert.ok(Math.abs(never.routeHours - never.baseRouteHours) < 1e-9);
  assert.equal(never.seatSteps.length, 0);
  // Seats in Boogles move no route minute; seats on materials stop the route for exactly the minutes hauled.
  const boogleSeats = run(spine, T, room('boogleSeats'));
  assert.ok(Math.abs(boogleSeats.routeHours - boogleSeats.baseRouteHours) < 1e-9);
  const houses = run(spine, T, room('houses'));
  assert.ok(houses.ledger.hauledSeatMin > 0);
  assert.ok(Math.abs((houses.routeHours - houses.baseRouteHours) * 60 - houses.ledger.hauledSeatMin) < 1e-6);
  const sources = run(spine, T, room('sources'));
  assert.ok(sources.ledger.savedBySourcesMin > 0);
  assert.ok(
    Math.abs(
      (sources.routeHours - sources.baseRouteHours) * 60 -
        (sources.ledger.hauledSeatMin - sources.ledger.savedBySourcesMin),
    ) < 1e-6,
  );
});

test('trade: nothing earns while the room is empty', () => {
  const base = run(spine, T, room('houses'));
  const gap: [number, number][] = [[60, 180]];
  const paused = run(spine, T, room('houses'), { empty: gap });
  assert.equal(paused.ledger.emptyMin, 120);
  // The empty minutes freeze everything: the same room, two hours later, with the same Boogles in the end.
  assert.ok(Math.abs(paused.routeHours - base.routeHours - 2) < 1e-9);
  assert.ok(Math.abs(paused.ledger.boogles.earned - base.ledger.boogles.earned) < 1e-6);
  assert.deepEqual(
    paused.buys.map((b) => b.id),
    base.buys.map((b) => b.id),
  );
  // Nobody is there to carry the sack's worth home either: a night adds at most one capped sack.
  const rate = 500;
  const a = awayCredit(T, rate, 0, 1e9, 22);
  assert.ok(a.credit <= T['sack.min']! * rate + 1e-9);
  assert.ok(a.credit > 0);
  assert.equal(awayCredit(T, rate, 0, 1e9, 0).credit, 0);
});

test('trade: fares past a full strongbox do not land', () => {
  const never = run(spine, T, room('never'));
  assert.ok(never.ledger.boogles.capped > 0, 'a room that never spends fills its box');
  never.series.wallet.forEach((w, i) => assert.ok(w <= never.series.cap[i]! + 1e-6, `tick ${i}`));
  // The box is the larger of 20 minutes of income or 1.5 times the dearest thing on offer.
  assert.ok(
    Math.abs(
      never.series.cap[0]! - Math.max(T['box.incomeMin']! * never.series.potential[0]!, T['box.dearestMult']! * 1800),
    ) < 1e-6,
  );
  // Lift the box and the same fares land.
  const open = run(spine, { ...T, 'box.incomeMin': 1e7 }, room('never'));
  assert.equal(open.ledger.boogles.capped, 0);
  assert.ok(open.ledger.boogles.earned > never.ledger.boogles.earned);
  // A night away never credits past the room left in the box.
  const full = awayCredit(T, 500, 4900, 5000, 22);
  assert.ok(full.credit <= 100 + 1e-9);
  assert.equal(awayCredit(T, 500, 5000, 5000, 22).credit, 0);
});

test('trade: four or more waiting riders stop a train, fewer do not', () => {
  const none = run(spine, { ...T, 'crowd.stop': 1e6 }, room('never'));
  assert.equal(none.ledger.boogles.earned, 0);
  assert.equal(none.riders.carried, 0);
  assert.ok(run(spine, T, room('never')).riders.carried > 0);
});

test('trade: deterministic for a seed, and the seed matters', () => {
  const a = playRooms(spine, T, { seed: 7, players: 3 });
  const b = playRooms(spine, T, { seed: 7, players: 3 });
  assert.deepEqual(a, b);
  const c = playRooms(spine, T, { seed: 8, players: 3 });
  assert.notDeepEqual(a[1]!.series.wallet, c[1]!.series.wallet);
  // Three players finish sooner than one (the ring model's gap), in every room.
  const solo = playRooms(spine, T, { players: 1 });
  const trio = playRooms(spine, T, { players: 3 });
  solo.forEach((s, i) => assert.ok(trio[i]!.routeHours < s.routeHours, s.policy.id));
});

test("trade: the brief's buys and the first house are on offer as written", () => {
  const houses = catalog(T, room('houses'));
  const first = houses.find((i) => i.id === 'house.village.1')!;
  assert.equal(first.price, 450); // 300 Boogles, half as much again, while seats cost materials
  assert.equal(catalog(T, room('boogleSeats')).find((i) => i.id === 'house.village.1')!.price, 300);
  assert.ok(headline(run(spine, T, room('houses'))).houses > 0);
});

test('trade: each next house in a town costs the house order times the last', () => {
  const price = (id: string, t = T) => catalog(t, room('houses')).find((i) => i.id === id)!.price;
  assert.equal(price('house.village.2'), 800 * 1.5 * 2);
  assert.equal(price('house.village.3'), 3000 * 1.5 * 4);
  assert.equal(price('house.village.2', { ...T, 'house.order': 1 }), 800 * 1.5);
});

test('trade: the committed page is current', () => {
  assert.equal(
    pageData(readFileSync(PAGE, 'utf8')).sourceHash,
    sourceHash(),
    'run node dev/economy/build-trade-page.ts',
  );
});

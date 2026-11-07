import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  assignSeats,
  readGrants,
  seatVerdict,
  CLAIM_GRACE_MS,
  type ClaimSeat,
  type SeatRequest,
} from '../src/proto/place/seat-claims.ts';

const deck = (open = [true, true]): ClaimSeat[] =>
  open.map((on, i) => ({ id: `machine-deck-${i}`, group: 'machine-deck', available: () => on }));
const asks = (...rows: [string, string, number][]) =>
  new Map<string, SeatRequest>(rows.map(([peer, id, ticket]) => [peer, { id, ticket }]));

test('a lone request claims its chair, and releasing frees it', () => {
  const seats = deck();
  let grants = assignSeats({}, asks(['a', 'machine-deck-0', 1]), seats);
  assert.deepEqual(grants, { 'machine-deck-0': { peer: 'a', ticket: 1 } });
  grants = assignSeats(grants, asks(), seats);
  assert.deepEqual(grants, {});
});

test('two players racing for one chair: one wins it, the other gets its neighbour, whatever the arrival order', () => {
  const seats = deck();
  for (const requests of [
    asks(['b', 'machine-deck-0', 4], ['a', 'machine-deck-0', 9]),
    asks(['a', 'machine-deck-0', 9], ['b', 'machine-deck-0', 4]),
  ])
    assert.deepEqual(assignSeats({}, requests, seats), {
      'machine-deck-0': { peer: 'a', ticket: 9 },
      'machine-deck-1': { peer: 'b', ticket: 4 },
    });
});

test('an incumbent keeps their chair against a later rival; a third rider gets nothing', () => {
  const seats = deck();
  let grants = assignSeats({}, asks(['z', 'machine-deck-0', 1]), seats);
  grants = assignSeats(
    grants,
    asks(['z', 'machine-deck-0', 1], ['a', 'machine-deck-0', 1], ['b', 'machine-deck-1', 1]),
    seats,
  );
  assert.deepEqual(grants, {
    'machine-deck-0': { peer: 'z', ticket: 1 },
    'machine-deck-1': { peer: 'a', ticket: 1 },
  });
});

test('a new ticket (stood up and sat again) drops the old grant before reassigning', () => {
  const seats = deck();
  const grants = assignSeats({}, asks(['a', 'machine-deck-0', 1]), seats);
  assert.deepEqual(assignSeats(grants, asks(['a', 'machine-deck-1', 2]), seats), {
    'machine-deck-1': { peer: 'a', ticket: 2 },
  });
});

test('an unavailable chair is neither kept nor granted', () => {
  const grants = assignSeats({}, asks(['a', 'machine-deck-0', 1]), deck());
  assert.deepEqual(assignSeats(grants, asks(['a', 'machine-deck-0', 1]), deck([false, false])), {});
});

test('followers drop malformed, unknown and double-booked grants', () => {
  const known = (id: string) => id.startsWith('machine-deck-');
  assert.deepEqual(readGrants(null, known), {});
  assert.deepEqual(readGrants([1], known), {});
  assert.deepEqual(
    readGrants(
      {
        'machine-deck-0': { peer: 'a', ticket: 1 },
        'machine-deck-1': { peer: 'a', ticket: 2 },
        nowhere: { peer: 'b', ticket: 1 },
        'machine-deck-2': { peer: 'c', ticket: -1 },
        'machine-deck-3': { peer: 'x'.repeat(200), ticket: 1 },
      },
      known,
    ),
    { 'machine-deck-0': { peer: 'a', ticket: 1 } },
  );
});

test('a sitter holds while the lead is silent, then steps off after the grace', () => {
  const base = { grants: {}, peer: 'a', ticket: 3, sitting: 'machine-deck-0', seats: deck() };
  assert.deepEqual(seatVerdict({ ...base, waitedMs: 100 }), { kind: 'hold' });
  assert.deepEqual(seatVerdict({ ...base, waitedMs: CLAIM_GRACE_MS + 1 }), { kind: 'release' });
});

test('a granted sitter holds, or moves to the chair the lead gave them', () => {
  const base = { peer: 'a', ticket: 3, sitting: 'machine-deck-0', seats: deck(), waitedMs: 0 };
  assert.deepEqual(seatVerdict({ ...base, grants: { 'machine-deck-0': { peer: 'a', ticket: 3 } } }), { kind: 'hold' });
  assert.deepEqual(seatVerdict({ ...base, grants: { 'machine-deck-1': { peer: 'a', ticket: 3 } } }), {
    kind: 'move',
    id: 'machine-deck-1',
  });
  // An old ticket's grant is not this sit's.
  assert.deepEqual(seatVerdict({ ...base, grants: { 'machine-deck-0': { peer: 'a', ticket: 2 } } }), { kind: 'hold' });
});

test('the loser of a race slides to the free neighbour, or gets off when both chairs are taken', () => {
  const base = { peer: 'b', ticket: 1, sitting: 'machine-deck-0', seats: deck(), waitedMs: 0 };
  assert.deepEqual(seatVerdict({ ...base, grants: { 'machine-deck-0': { peer: 'a', ticket: 1 } } }), {
    kind: 'move',
    id: 'machine-deck-1',
  });
  assert.deepEqual(
    seatVerdict({
      ...base,
      grants: { 'machine-deck-0': { peer: 'a', ticket: 1 }, 'machine-deck-1': { peer: 'c', ticket: 1 } },
    }),
    { kind: 'release' },
  );
});

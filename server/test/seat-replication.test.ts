import test from 'node:test';
import assert from 'node:assert/strict';
import { fixture } from './helpers/rail-tune.ts';
import { createRailwayMirror } from '../../src/world/railway-replicate.ts';

test('server seat rows agree across client mirrors, late joins, departure and pause', async (t) => {
  const f = await fixture(t);
  const a = f.join('alice'),
    b = f.join('bob');
  f.run(3);
  a.adapter.act('seat.sit', { id: 'bench-0', alt: ['bench-1'] });
  b.adapter.act('seat.sit', { id: 'bench-0', alt: ['bench-1'] });
  f.run(3);
  const expected = [
    { id: 'bench-0', pid: 'alice' },
    { id: 'bench-1', pid: 'bob' },
  ];
  assert.deepEqual(a.mirror.seats.rows(), expected);
  assert.deepEqual(b.mirror.seats.rows(), expected);
  assert.equal(a.mirror.seats.occupant('bench-0'), 'alice');
  assert.equal(a.mirror.seats.seatOf('bob'), 'bench-1');
  const late = f.join('late');
  f.run(3);
  assert.deepEqual(late.mirror.seats.rows(), expected);
  assert.equal(a.mirror.hash(), late.mirror.hash());
  a.disconnect();
  f.host.depart('alice');
  f.run(3);
  assert.deepEqual(b.mirror.seats.rows(), expected.slice(1));
  f.host.pause();
  f.run(3);
  assert.deepEqual(b.mirror.seats.rows(), []);
  assert.deepEqual(f.host.sync.registry().states, ['roster', 'railTune', 'railway']);
});

test('seat mirror publishes only complete packet sets and retains its view during refill', () => {
  const m = createRailwayMirror();
  const changes: unknown[] = [];
  m.seats.onChange((e) => changes.push(e));
  assert.equal(m.mirror.apply({ t: 's', tk: 6, w: 1, c: [['seat', 'chair', { pid: 'alice' }]] }), true);
  assert.equal(m.seats.occupant('chair'), 'alice');
  const hash = m.hash();
  assert.equal(m.mirror.apply({ t: 's', tk: 12, m: 1, c: [['seat', 'next', { pid: 'alice' }]] }), true);
  assert.equal(m.seats.seatOf('alice'), 'chair', 'partial move is not published');
  assert.equal(changes.length, 1);
  assert.equal(m.mirror.apply({ t: 's', tk: 12, x: [['seat', 'chair']] }), true);
  assert.equal(m.seats.seatOf('alice'), 'next');
  assert.notEqual(m.hash(), hash, 'seat rows are included in mirror hash');
  m.refill();
  assert.equal(m.seats.seatOf('alice'), 'next');
  assert.equal(m.mirror.apply({ t: 's', tk: 18, w: 1 }), true);
  assert.equal(m.seats.seatOf('alice'), null);
  assert.deepEqual(m.seats.rows(), []);
  assert.equal(changes.length, 3);
});

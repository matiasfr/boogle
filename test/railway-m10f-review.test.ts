// Review of M10 f (the readers outside the railway folder: the town view's reader, the finds' secrets): the behaviour
// the review added, read through the real town reader (`createTownReader`) and the rows. A late joiner's town look
// holds the room-wide facts the server holds, and the look is built once for a frame however often it is asked. The
// conversion proofs (the town look and the finds' reads against the `inspect()` fields they replaced, every frame of
// scripted runs at the seeds) and the cost guide went with `inspect()`; secrets-view's reads are not restated here.
import test from 'node:test';
import assert from 'node:assert/strict';
import { RAILWAY_SOURCES } from '../src/sim/railway-layout.ts';
import { line2Trains } from '../src/sim/railway-queries-line2.ts';
import { createTownReader } from '../src/entities/town/town-read.ts';
import { townRead } from '../src/sim/town-facts.ts';
import { railRoom, type RoomClient } from './helpers/rail-room.ts';
import { buildSeedWorld } from './helpers/rail.ts';

/** One reader per client, as the town view holds one. */
const townReader = (c: RoomClient) => createTownReader(() => c.adapter.read);

test('a late joiner reads the room-wide facts the server holds', () => {
  const r = railRoom(buildSeedWorld('trains-on'));
  r.join('a', 'a', 4);
  r.ready();
  r.run(10);
  const b = r.join('b', 'b', 6);
  r.run(80);
  assert.equal(line2Trains(r.serverWorld()), true, 'the server has the trains on');
  const look = townReader(b).look()!;
  assert.equal(look.facts.trains, true, 'the late joiner sees the trains');
  assert.deepEqual(look.facts, townRead(r.serverWorld()), 'the facts the server holds');
});

test('the look is built once for a frame however often it is asked, and again for a press', () => {
  const r = railRoom(buildSeedWorld('q5-finishing'));
  const a = r.join('a', 'a', 0);
  r.ready();
  r.run(5);
  const t = townReader(a);
  const n0 = t.stats.builds;
  const first = t.look();
  for (let i = 0; i < 20; i++) assert.deepEqual(t.look(), first);
  assert.equal(t.stats.builds - n0, 1, 'twenty asks in a frame: one build');
  // A predicted press makes a new world: the look is built again for it, once.
  let took = false;
  for (let k = 0; k < 40 && !took; k++)
    took = a.adapter.chop(RAILWAY_SOURCES[k % RAILWAY_SOURCES.length]![0], 0, false);
  assert.ok(took, 'a chop was taken');
  const after = t.look()!;
  t.look();
  assert.equal(t.stats.builds - n0, 2, 'the press: a second build, shared by the asks after it');
  assert.deepEqual(
    after.facts,
    townRead(a.adapter.read.world()),
    'the rebuilt look holds the facts of the pressed world',
  );
});

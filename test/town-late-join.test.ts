import test from 'node:test';
import assert from 'node:assert/strict';
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

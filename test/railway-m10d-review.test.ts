// Review of M10 d (the Works group's views: works-view, breaker-view, footing-view, crossing-view, roundhouse-view,
// home-station-view, trophy-plinth): the behaviour the review added, read as rows. A client's world (`adapter.read.world()`)
// is held against the server's (`serverWorld()`) at the moments that matter: a predicted press shows before the server
// answers, a footing set down reads as a pile, a late joiner sees the room-wide Works. The conversion proofs (the views'
// reads against the `inspect()` fields they replaced, every frame of scripted runs) went with `inspect()`.
import test from 'node:test';
import assert from 'node:assert/strict';
import { RAILWAY_SOURCES, RAILWAY_T1 as T1 } from '../src/sim/railway-layout.ts';
import { account, shed, works, type ReadWorld } from '../src/sim/railway-rows.ts';
import { railRoom } from './helpers/rail-room.ts';
import { buildSeedWorld, pilesWithIds } from './helpers/rail.ts';

/** The footing piles (kind 3) in a world. */
const footPiles = (w: ReadWorld) => pilesWithIds(w).filter((p) => p.kind === 3);

test('a late joiner reads its own account and the room-wide Works, as the server holds them', () => {
  const seed = buildSeedWorld('works-lit');
  const kiln = works(seed.w);
  assert.ok(kiln.lit, 'the seed has the kiln lit');
  const r = railRoom(seed);
  r.join('a', 'a', 4);
  r.ready();
  r.run(10);
  const b = r.join('b', 'b', 6);
  r.run(80);
  const w = b.adapter.read.world();
  assert.equal(b.adapter.read.pid, 'b');
  assert.equal(b.adapter.read.ready(), true);
  assert.ok(account(w, 'b'), 'its own account arrived');
  assert.deepEqual(account(w, 'b'), account(r.serverWorld(), 'b'));
  assert.deepEqual(works(w), works(r.serverWorld()), 'the room-wide Works, row for row');
  assert.deepEqual(shed(w), shed(r.serverWorld()));
});

test('a predicted press shows in the client rows before the server answers', () => {
  const r = railRoom(buildSeedWorld('works-open'));
  const a = r.join('a', 'a', 12);
  r.ready();
  const mine = (w: ReadWorld) => account(w, 'a')!;
  assert.equal(mine(a.adapter.read.world()).carry, 0, 'an empty back to start');
  let pressed = false;
  for (const source of RAILWAY_SOURCES) if ((pressed = a.adapter.chop(source[0], 0, false))) break;
  assert.ok(pressed, 'a chop was taken');
  assert.equal(a.adapter.read.pending(), 1, 'the server has not answered');
  assert.ok(mine(a.adapter.read.world()).carry > 0, 'the logs are on the back on the press, ahead of the answer');
  assert.equal(mine(r.serverWorld()).carry, 0, 'the server has not seen the press');
  r.run(60);
  assert.equal(a.adapter.read.pending(), 0, 'answered');
  assert.deepEqual(mine(a.adapter.read.world()), mine(r.serverWorld()), 'the answer is the prediction');
  assert.ok(mine(r.serverWorld()).carry > 0);
});

test('a footing shouldered and set down is a pile in both players rows, on the press and after the answer', () => {
  const r = railRoom(buildSeedWorld('wagon-on'));
  const a = r.join('a', 'a', 6);
  const b = r.join('b', 'b', 2);
  r.ready();
  r.run(10);
  const foot = (c: typeof a, pid: string) => account(c.adapter.read.world(), pid)!.foot;
  const racked = [0, 1].find((rack) => a.adapter.shoulderFooting(rack as 0 | 1));
  assert.notEqual(racked, undefined, 'a footing was on a rack');
  assert.equal(foot(a, 'a'), 1, 'worn on the press');
  r.run(30);
  assert.equal(account(r.serverWorld(), 'a')!.foot, 1, 'the server has it worn');
  assert.equal(foot(b, 'a'), 1, 'the other player sees it worn');
  assert.equal(footPiles(a.adapter.read.world()).length, 0);
  assert.equal(a.adapter.drop(T1.x + 100, 3000, T1.z + 100, 1, 3), true);
  assert.equal(footPiles(a.adapter.read.world()).length, 1, 'the pile shows on the press');
  assert.equal(footPiles(r.serverWorld()).length, 0, 'ahead of the server');
  r.run(30);
  assert.equal(footPiles(r.serverWorld()).length, 1);
  assert.equal(footPiles(b.adapter.read.world()).length, 1, 'the second player sees it');
  assert.equal(foot(a, 'a'), 0, 'no longer worn');
  assert.equal(account(r.serverWorld(), 'a')!.foot, 0);
});

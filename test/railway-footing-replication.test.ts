import test from 'node:test';
import assert from 'node:assert/strict';
import { RAILWAY_T1 as T1 } from '../src/sim/railway-layout.ts';
import { account, type ReadWorld } from '../src/sim/railway-rows.ts';
import { railRoom } from './helpers/rail-room.ts';
import { buildSeedWorld, pilesWithIds } from './helpers/rail.ts';

/** The footing piles (kind 3) in a world. */
const footPiles = (w: ReadWorld) => pilesWithIds(w).filter((p) => p.kind === 3);

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

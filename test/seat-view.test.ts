// Owner-requested view-model regression: a quiet sitter must not look as if they stood up.
import test from 'node:test';
import assert from 'node:assert/strict';
import { seatViews } from '../src/entities/railway/seat-view.ts';

test('a server seat stays drawn through stale or missing Owner presence', () => {
  const rows = [{ id: 'bench0', pid: 'friend' }];
  assert.equal(seatViews(rows, [{ id: 'bench0', pid: 'friend', at: 0 }], 3000).get('friend'), 'bench0');
  assert.equal(seatViews(rows, [], 3000).get('friend'), 'bench0');
  assert.equal(seatViews(rows, [{ id: 'bench1', pid: 'friend', at: 3000 }], 3000).get('friend'), 'bench0');
  assert.equal(seatViews([], [], 3000).has('friend'), false, 'departure removes the pose with its row');
});

test('a fresh uncontested Owner pose bridges a rate-refused re-sit until the row returns', () => {
  const poses = [{ id: 'bench0', pid: 'friend', at: 1000 }];
  assert.equal(seatViews([], poses, 1199).get('friend'), 'bench0');
  assert.equal(seatViews([], poses, 1200).has('friend'), false, 'an unconfirmed stale pose cannot hold a chair');
  assert.equal(seatViews([{ id: 'bench0', pid: 'friend' }], poses, 3000).get('friend'), 'bench0');
});

test('prediction never draws over an authoritative occupant, a local prediction or a competing fresh pose', () => {
  const poses = [{ id: 'bench0', pid: 'friend', at: 1000 }];
  const held = seatViews([{ id: 'bench0', pid: 'winner' }], poses, 1000);
  assert.deepEqual([...held], [['winner', 'bench0']]);
  assert.equal(seatViews([], poses, 1000, 'bench0').size, 0);
  assert.equal(seatViews([], [...poses, { id: 'bench0', pid: 'other', at: 1000 }], 1000).size, 0);
  assert.equal(seatViews([], [...poses, { id: 'bench0', pid: 'other', at: 700 }], 1000).get('friend'), 'bench0');
});

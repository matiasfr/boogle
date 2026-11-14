// A finished station frame packs up without dropping anyone and without leaving its footprint behind
// (src/entities/railway/frame-pack.ts; review of the 14 November honest-feedback branch, two P2s).
import test from 'node:test';
import assert from 'node:assert/strict';
import { packSolid, packStep, type PackState } from '../src/entities/railway/frame-pack.ts';

const step = (
  state: PackState,
  o: Partial<{ laid: boolean; sawWork: boolean; occupied: boolean; fold: number; reducedMotion: boolean }>,
) =>
  packStep(state, {
    laid: o.laid ?? true,
    sawWork: o.sawWork ?? true,
    occupied: () => o.occupied ?? false,
    fold: o.fold ?? 0,
    reducedMotion: o.reducedMotion ?? false,
  });

test('a frame someone stands on keeps its colliders: it does not fold until it is clear', () => {
  let s = step('up', { occupied: true });
  assert.equal(s, 'held');
  for (let frame = 0; frame < 120; frame++) {
    s = step(s, { occupied: true, fold: 1 });
    assert.equal(s, 'held');
    assert.equal(packSolid(s), true, 'support is never removed under a player');
  }
  s = step(s, { occupied: false });
  assert.equal(s, 'folding');
  assert.equal(packSolid(s), true, 'still solid while it folds');
});

test('stepping on mid-fold stands it back up; it is gone only after a whole clear fold', () => {
  let s: PackState = 'folding';
  s = step(s, { occupied: true, fold: 0.5 });
  assert.equal(s, 'held');
  s = step(s, {});
  assert.equal(s, 'folding');
  assert.equal(step(s, { fold: 0.99 }), 'folding');
  s = step(s, { fold: 1 });
  assert.equal(s, 'gone');
  assert.equal(packSolid(s), false, 'colliders and footprint retire together, once gone');
});

test('a join or a reload finds a laid frame gone at once, footprint retired, whoever stands there', () => {
  const s = step('up', { sawWork: false, occupied: true });
  assert.equal(s, 'gone');
  assert.equal(packSolid(s), false);
});

test('reduced motion skips the fold but still waits for a clear frame; an un-laid stretch stands again', () => {
  assert.equal(step('held', { reducedMotion: true, occupied: true }), 'held');
  assert.equal(step('held', { reducedMotion: true }), 'gone');
  assert.equal(step('gone', { laid: false }), 'up');
});

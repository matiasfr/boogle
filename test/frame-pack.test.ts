// A finished station frame packs up without dropping anyone and without leaving its footprint behind
// (src/entities/railway/frame-pack.ts; review of the 14 November honest-feedback branch, two P2s).
import test from 'node:test';
import assert from 'node:assert/strict';
import { packDrawn, packSolid, packStep, type PackState } from '../src/entities/railway/frame-pack.ts';

const step = (
  state: PackState,
  o: Partial<{
    laid: boolean;
    sawWork: boolean;
    occupied: boolean;
    remote: boolean;
    fold: number;
    settled: boolean;
    reducedMotion: boolean;
  }>,
) =>
  packStep(state, {
    laid: o.laid ?? true,
    sawWork: o.sawWork ?? true,
    occupied: () => o.occupied ?? false,
    remote: () => o.remote ?? o.occupied ?? false,
    fold: o.fold ?? 0,
    settled: o.settled ?? false,
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

test('a backgrounded tab that missed the work keeps the frame under whoever stands on it', () => {
  // The tab saw the stretch open, then nothing until it was laid: sawWork is false and you are still on the frame.
  let s = step('up', { sawWork: false, occupied: true, settled: true });
  assert.equal(s, 'held');
  assert.equal(packSolid(s), true, 'support does not depend on what the tab watched');
  assert.equal(packDrawn(s), true);
  for (let frame = 0; frame < 300; frame++) s = step(s, { sawWork: false, occupied: true, settled: true });
  assert.equal(s, 'held');
  s = step(s, { sawWork: false, settled: true });
  assert.equal(s, 'folding', 'it folds once you step off');
});

test('a joining observer keeps a frame a friend stands on, even when the friend appears after the load', () => {
  // The load: laid, nobody drawn yet. Solid but not shown while the room's avatars arrive.
  let s = step('up', { sawWork: false });
  assert.equal(s, 'checking');
  assert.equal(packSolid(s), false, 'open ground at once');
  assert.equal(packDrawn(s), false, 'no frame flashes up on a plain load');
  // The friend's avatar arrives standing on it, before the wait is over: the frame is drawn and solid under them.
  s = step(s, { sawWork: false, occupied: true });
  assert.equal(s, 'held');
  assert.equal(packSolid(s) && packDrawn(s), true);
  s = step(s, { sawWork: false, occupied: true, settled: true });
  assert.equal(s, 'held');
  // A friend already drawn when the stretch is first seen laid is held at once.
  assert.equal(step('up', { sawWork: false, occupied: true }), 'held');
});

test('a plain reload with nobody there: never drawn, no fold, gone once the room has settled', () => {
  let s = step('up', { sawWork: false });
  const seen: string[] = [s];
  for (let frame = 0; frame < 5; frame++) seen.push((s = step(s, { sawWork: false })));
  s = step(s, { sawWork: false, settled: true });
  seen.push(s);
  assert.equal(s, 'gone');
  assert.equal(packSolid(s), false, 'colliders and footprint retired');
  assert.ok(!seen.includes('folding') && !seen.some((state) => packDrawn(state as PackState)), 'no animation on load');
});

test('reduced motion skips the fold but still waits for a clear frame; an un-laid stretch stands again', () => {
  assert.equal(step('held', { reducedMotion: true, occupied: true }), 'held');
  assert.equal(step('held', { reducedMotion: true }), 'gone');
  assert.equal(step('gone', { laid: false }), 'up');
});

test("a reload onto a retired frame's ground: the footprint is gone before the saved pose is tried", () => {
  // arrival.ts tries the saved return pose in the same frames the room first reads as laid, and does not retry. The
  // footprint (its pose exclusion) and the colliders must be retired on the first laid step, not after the wait for
  // friends' avatars: you are restored onto open ground, and standing there must not bring the frame back.
  let s = step('up', { sawWork: false });
  assert.equal(packSolid(s), false, 'footprint and colliders retire at once on a load that finds the frame clear');
  for (let frame = 0; frame < 10; frame++) {
    s = step(s, { sawWork: false, occupied: true, remote: false });
    assert.equal(packSolid(s) || packDrawn(s), false, 'your own restored body does not resurrect it');
  }
  // Only a friend's avatar, drawn where the frame stands, brings it back during the wait.
  assert.equal(step(s, { sawWork: false, occupied: true, remote: true }), 'held');
  assert.equal(step(s, { sawWork: false, occupied: true, remote: false, settled: true }), 'gone');
});

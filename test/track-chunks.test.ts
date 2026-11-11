import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three/webgpu';
import {
  TRACK_CHUNK_M,
  TRACK_SHADOW_HYSTERESIS_M,
  TRACK_SHADOW_M,
  castsShadow,
  chunkOf,
  chunkRuns,
  growBounds,
  isHidden,
} from '../src/entities/railway/track-chunks.ts';

test('a piece on a chunk boundary belongs to exactly one chunk, the later', () => {
  assert.equal(chunkOf(0), 0);
  assert.equal(chunkOf(TRACK_CHUNK_M - 1e-9), 0);
  assert.equal(chunkOf(TRACK_CHUNK_M), 1);
  assert.equal(chunkOf(2 * TRACK_CHUNK_M + 0.01), 2);
});

test('runs keep every piece once, in its kind order, so the grain seed (kind index) is from + slot', () => {
  const kinds = ['sleeper', 'rail', 'sleeper', 'sleeper', 'rail', 'leg', 'sleeper', 'rail'];
  const chunks = [0, 0, 0, 1, 1, 1, 1, 1];
  const { runs, of } = chunkRuns(kinds, chunks);
  assert.equal(of.length, kinds.length);
  const seen = new Map<string, number>();
  kinds.forEach((kind, k) => {
    const index = seen.get(kind) ?? 0;
    seen.set(kind, index + 1);
    const r = runs[of[k]!.run]!;
    assert.equal(r.kind, kind);
    assert.equal(r.chunk, chunks[k]);
    assert.equal(r.from + of[k]!.slot, index, `piece ${k}`);
    assert.ok(of[k]!.slot < r.count);
  });
  assert.equal(
    runs.reduce((n, r) => n + r.count, 0),
    kinds.length,
  );
  assert.deepEqual(
    runs.map((r) => [r.kind, r.chunk, r.from, r.count]),
    [
      ['sleeper', 0, 0, 2],
      ['rail', 0, 0, 1],
      ['sleeper', 1, 2, 2],
      ['rail', 1, 1, 2],
      ['leg', 1, 0, 1],
    ],
  );
});

test('a kind that returns to an earlier chunk gets a new run, never a shared slot', () => {
  const { runs } = chunkRuns(['leg', 'leg', 'leg'], [0, 1, 0]);
  assert.deepEqual(
    runs.map((r) => [r.chunk, r.from, r.count]),
    [
      [0, 0, 1],
      [1, 1, 1],
      [0, 2, 1],
    ],
  );
});

test('bounds cover the placed unit box, grow with each piece and ignore hidden ones', () => {
  const box = new THREE.Box3();
  const at = (x: number, y: number, z: number, sx = 1, sy = 1, sz = 1) =>
    new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion(), new THREE.Vector3(sx, sy, sz));
  growBounds(box, at(10, 5, 0, 2, 8, 4), 0);
  assert.deepEqual(box.min.toArray(), [9, 5, -2]);
  assert.deepEqual(box.max.toArray(), [11, 13, 2]);
  growBounds(box, at(40, 0, 0), 0);
  assert.equal(box.max.x, 40.5);
  assert.equal(box.min.x, 9, 'the first piece stays covered');
  growBounds(box, at(40, 0, 0), 0.3);
  growBounds(box, at(40, 0, 0), 0.3);
  assert.ok(Math.abs(box.max.x - 40.8) < 1e-9, 'padding does not accumulate call by call');
  assert.ok(isHidden(new THREE.Matrix4().makeScale(0, 0, 0)));
  assert.ok(!isHidden(at(0, 0, 0)));
  assert.ok(!isHidden(new THREE.Matrix4().makeRotationY(Math.PI / 2)), 'a quarter turn has zeros but is a piece');
  const yawed = new THREE.Box3();
  growBounds(yawed, new THREE.Matrix4().makeRotationY(Math.PI / 4).scale(new THREE.Vector3(2, 1, 2)), 0);
  assert.ok(Math.abs(yawed.max.x - Math.SQRT2) < 1e-9, 'a yawed piece is covered by its corners');
});

test('a chunk casts inside the range and keeps casting a little beyond it, then stops', () => {
  assert.ok(castsShadow(TRACK_SHADOW_M - 1, false));
  assert.ok(!castsShadow(TRACK_SHADOW_M + 1, false));
  assert.ok(castsShadow(TRACK_SHADOW_M + 1, true));
  assert.ok(!castsShadow(TRACK_SHADOW_M + TRACK_SHADOW_HYSTERESIS_M + 1, true));
});

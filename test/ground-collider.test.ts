// Owner-requested regression for the verification tool; no game or renderer code is changed.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { colliderWalkable, incidentColliderFaces, walkableFaces } from '../dev/ground/collider.ts';

test('the opposing steep faces at world (899, -177) do not average into walkable ground', () => {
  assert.equal(colliderWalkable(899, -177), false);
  const faces = incidentColliderFaces(899, -177);
  assert.equal(faces.length, 2);
  assert.ok(faces.every((face) => face.ny < 0.435));
});

test('a flat heightfield face at a shared cell edge remains walkable beside a steep face', () => {
  const faces = incidentColliderFaces(1001, 0.5, [
    {
      heights: [
        [0, 0],
        [0, 0],
        [4, 4],
      ],
      cell: 1,
      position: { x: 1000, y: 0, z: 1 },
    },
  ]);
  assert.equal(faces.length, 2);
  assert.ok(faces.some((face) => face.ny === 1));
  assert.ok(faces.some((face) => face.ny < 0.25));
  assert.equal(walkableFaces(faces, 0), true);
});

test('both sides of a heightfield tile join and its closed outer corner are included', () => {
  const tiles = [
    {
      heights: [
        [0, 0],
        [0, 0],
      ],
      cell: 1,
      position: { x: 1000, y: 0, z: 1 },
    },
    {
      heights: [
        [0, 0],
        [4, 4],
      ],
      cell: 1,
      position: { x: 1001, y: 0, z: 1 },
    },
  ];
  assert.equal(walkableFaces(incidentColliderFaces(1001, 0.5, tiles), 0), true);
  assert.equal(walkableFaces(incidentColliderFaces(1000, 0, tiles), 0), true);
});

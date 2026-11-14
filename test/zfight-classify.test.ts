// Owner-requested classifier tests: portable face/material data only, no three.js or browser.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { findZfights, type Face, type Contact } from '../src/geometry/zfight.ts';
import { classifyZfights, makeBaseline, baselineDelta } from '../src/geometry/zfight-classify.ts';
import type { Surface } from '../src/geometry/zfight-surface.ts';
const surface: Surface = { material: 'stone', color: [1, 1, 1], castShadow: true, receiveShadow: true };
const face = (piece: string, patch: Partial<Surface> = {}): Face => ({
  piece,
  points: [
    [0, 0, 0],
    [0, 0, 1],
    [1, 0, 0],
  ],
  surface: { ...surface, ...patch },
});
test('same drawn material/colour is a joint; appearance differences are actionable', () => {
  assert.equal(classifyZfights(findZfights([face('a'), face('b')]))[0]!.class, 'b');
  for (const patch of [
    { material: 'steel' },
    { color: [0, 1, 1] },
    {
      vertex: [
        [0.5, 1, 1],
        [0.5, 1, 1],
        [0.5, 1, 1],
      ],
    },
    { castShadow: false },
    { receiveShadow: false },
    { uncertain: 'unknown shader' },
    {
      texture: {
        id: 'image',
        uv: [
          [0, 0, 0],
          [0, 1, 0],
          [1, 0, 0],
        ],
      },
    },
  ] as Partial<Surface>[]) {
    assert.equal(classifyZfights(findZfights([face('a'), face('b', patch)]))[0]!.class, 'a');
  }
  const unknown = face('b');
  delete unknown.surface;
  assert.equal(classifyZfights(findZfights([face('a'), unknown]))[0]!.class, 'a');
});
test('texture identity AND sampled UV matter; vertex interpolation compares the overlap', () => {
  const texture = {
    id: 'image',
    uv: [
      [0, 0, 0],
      [0, 1, 0],
      [1, 0, 0],
    ] as const,
  };
  assert.equal(classifyZfights(findZfights([face('a', { texture }), face('b', { texture })]))[0]!.class, 'b');
  assert.equal(
    classifyZfights(
      findZfights([
        face('a', { texture }),
        face('b', {
          texture: {
            ...texture,
            uv: [
              [0.1, 0, 0],
              [0, 1, 0],
              [1, 0, 0],
            ],
          },
        }),
      ]),
    )[0]!.class,
    'a',
  );
  const vertex = [
    [0.3, 1, 1],
    [0.6, 1, 1],
    [0.9, 1, 1],
  ] as const;
  assert.equal(classifyZfights(findZfights([face('a', { vertex }), face('b', { vertex })]))[0]!.class, 'b');
  // Same centroid colour/UV, different gradients across the overlapping face.
  const reversed = [vertex[2], vertex[1], vertex[0]];
  assert.equal(classifyZfights(findZfights([face('a', { vertex }), face('b', { vertex: reversed })]))[0]!.class, 'a');
  assert.equal(
    classifyZfights(
      findZfights([
        face('a', { texture }),
        face('b', { texture: { ...texture, uv: [texture.uv[2], texture.uv[1], texture.uv[0]] } }),
      ]),
    )[0]!.class,
    'a',
  );
});
const contact = (b: string, patch: Partial<Contact> = {}): Contact => ({
  a: 'anchor',
  b,
  familyA: 'anchor-kind',
  familyB: 'repeat',
  position: [0, 0, 0],
  normal: [0, 1, 0],
  area: 1,
  separation: 0,
  differences: ['colour'],
  ...patch,
});
test('groups both orientations and repeated instances; preserves all member coordinates', () => {
  const rows = classifyZfights([
    contact('part-1'),
    contact('part-1', { normal: [0, -1, 0] }),
    contact('part-2', { position: [1, 0, 0] }),
  ]);
  assert.equal(rows.length, 1);
  assert.equal(rows[0]!.count, 3);
  assert.equal(rows[0]!.area, 2);
  assert.equal(rows[0]!.members.length, 3);
  assert.equal(
    classifyZfights([contact('part-1'), contact('part-2', { a: 'other-anchor', familyB: 'different' })]).length,
    2,
  );
});
test('only proved occlusion is hidden; a partially exposed pair stays actionable', () => {
  assert.equal(classifyZfights([contact('b', { hidden: true })])[0]!.class, 'c');
  assert.equal(classifyZfights([contact('b', { hidden: true }), contact('b')])[0]!.class, 'a');
  const a = face('a'),
    b = face('b', { material: 'steel' });
  const ground = { ...face('ground'), ground: true, points: a.points.map(([x, , z]) => [x, 0.1, z] as const) };
  const rows = classifyZfights(findZfights([a, b, ground], { includeHidden: true }));
  assert.equal(rows.length, 1);
  assert.equal(rows[0]!.class, 'c');
  // A downward face alone is NOT proof of inaccessible space.
  assert.equal(classifyZfights([contact('b', { normal: [0, -1, 0] })])[0]!.class, 'a');
});
test('baseline identifies new member pairs even within an existing group and retires fixed pairs', () => {
  const old = classifyZfights([contact('part-1')]);
  const baseline = makeBaseline(old);
  assert.equal(baselineDelta(old, baseline).newFindings.length, 0);
  assert.equal(baselineDelta(classifyZfights([contact('part-1'), contact('part-2')]), baseline).newFindings.length, 1);
  assert.equal(baselineDelta([], baseline).stalePairs.length, 1);
  assert.equal(baselineDelta(classifyZfights([contact('part-1', { hidden: true })]), baseline).stalePairs.length, 1);
  assert.equal(baselineDelta(classifyZfights([contact('part-1', { differences: [] })]), baseline).stalePairs.length, 1);
});
test('repeated family-pair patterns group only within an explicitly declared assembly', () => {
  const a = contact('part-1', { assembly: 'line-one' });
  const b = contact('part-2', { a: 'other-anchor', assembly: 'line-one' });
  const grouped = classifyZfights([a, b]);
  assert.equal(grouped.length, 1);
  assert.equal(grouped[0]!.count, 2);
  assert.equal(grouped[0]!.area, 2);
  assert.equal(classifyZfights([a, { ...b, assembly: 'line-two' }]).length, 2);
});
test('an open sided enclosure cannot prove a contact hidden', () => {
  const a = face('a'),
    b = face('b', { color: [0, 1, 0] });
  const walls: Face[] = [
    {
      piece: 'walls',
      points: [
        [-1, -1, -1],
        [-1, -1, 2],
        [-1, 1, 2],
        [-1, 1, -1],
      ],
    },
    {
      piece: 'walls',
      points: [
        [2, -1, 2],
        [2, -1, -1],
        [2, 1, -1],
        [2, 1, 2],
      ],
    },
    {
      piece: 'walls',
      points: [
        [-1, -1, 2],
        [2, -1, 2],
        [2, 1, 2],
        [-1, 1, 2],
      ],
    },
    {
      piece: 'walls',
      points: [
        [2, -1, -1],
        [-1, -1, -1],
        [-1, 1, -1],
        [2, 1, -1],
      ],
    },
  ];
  assert.equal(classifyZfights(findZfights([a, b, ...walls], { includeHidden: true }))[0]!.class, 'a');
});

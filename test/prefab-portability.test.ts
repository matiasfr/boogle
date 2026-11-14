import { prefabs as greybox } from '../src/content/prefabs/greybox.ts';
import { prefabs as town } from '../src/content/prefabs/town.ts';
import { prefabs as rock } from '../src/content/prefabs/bell-rock.ts';
import { levels as leg2 } from '../src/content/levels/leg2.ts';
import { levels as gorge } from '../src/content/levels/gorge.ts';
import { levels as workshop } from '../src/content/levels/workshop.ts';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { assertAuthoredNumbers } from '../dev/prefab/authored.ts';
import { compile, writeArtifacts } from '../dev/prefab/compiler.ts';
import { metadata } from '../src/prefab/types.ts';
import * as validation from '../src/prefab/validate.ts';
import { prefabGolden } from './helpers/prefab-golden.ts';
import artifact from '../content/built/prefabs.json' with { type: 'json' };
import bell from '../content/built/levels/bell.json' with { type: 'json' };

test('every committed prefab artifact holds authored numbers, never long derived geometry', () => {
  for (const file of fs.globSync('content/built/**/*.json'))
    assertAuthoredNumbers(JSON.parse(fs.readFileSync(file, 'utf8')), file);
  assert.throws(() => assertAuthoredNumbers({ rot: [-0.030615130498210262] }), /looks derived/);
  assert.throws(() => assertAuthoredNumbers({ pos: [-0.20000000000000018] }), /do not round/);
});
test('artifact serialization is independent of runtime native transcendental results', () => {
  const original = { sin: Math.sin, cos: Math.cos, atan2: Math.atan2, hypot: Math.hypot };
  try {
    for (const key of ['sin', 'cos', 'atan2', 'hypot'] as const) {
      const f: (...args: number[]) => number = original[key];
      Math[key] = (...args: number[]) => f(...args) + 1e-15;
    }
    writeArtifacts(compile([...greybox, ...town, ...rock], [...leg2, ...gorge, ...workshop]), 'content/built', true);
  } finally {
    Object.assign(Math, original);
  }
});
test('authored full-precision values round-trip losslessly; no decimal quantization', () => {
  const n = 0.7312345678901234;
  const outputs = compile([], [{ place: 'exact', placements: [], analysis: { authored: n } }]);
  assert.equal(JSON.parse(outputs.get('levels/exact.json')!).analysis.authored, n);
});
test('runtime golden permits only tight numeric error and preserves structural contracts', () => {
  prefabGolden(
    { rotation: [0.24463630871500675, 0.007493084921739873] },
    { rotation: [0.24463630871500672, 0.0074930849217398725] },
  );
  for (const [a, b] of [
    [1.000001, 1],
    [1, 2],
    ['copy', 'changed'],
    [
      [1, 2],
      [2, 1],
    ],
    [{ id: 'a' }, { id: 'b' }],
    [{ flag: true }, { flag: false }],
    [[], [0]],
  ])
    assert.throws(() => prefabGolden(a, b));
});
test('authored layouts reject malformed geometry and mixed expanded data before use', () => {
  const records: unknown = artifact;
  validation.validateArtifact(records);
  const definitions = records.prefabs;
  for (const layout of [
    { ...bell.layout, kind: 'typo' },
    { ...bell.layout, data: { ...bell.layout.data, pieces: [{ compute: 'unknown' }] } },
    {
      ...bell.layout,
      data: {
        ...bell.layout.data,
        pieces: [{ id: 'bad', x: 0, z: 0, w: 0, d: 1, h: 1, top: 1, yaw: 0, tone: 'grey' }],
      },
    },
  ])
    assert.throws(() => validation.loadLevelArtifact({ ...bell, layout }, definitions));
  assert.throws(
    () =>
      validation.loadLevelArtifact(
        { ...bell, placements: [{ id: 'x', prefab: 'greybox.box', pos: [0, 0, 0] }] },
        definitions,
      ),
    /coexist/,
  );
  const resolved = validation.loadLevelArtifact(bell, definitions);
  assert.equal(resolved.placements.length, 68);
  assert.ok(!('layout' in resolved));
  assert.deepEqual(
    { ...metadata, format: 'boogle-level', place: 'empty', placements: [] },
    validation.loadLevelArtifact({ ...metadata, format: 'boogle-level', place: 'empty', placements: [] }, definitions),
  );
});

test('layout arithmetic rejects coercible operands instead of generating different valid geometry', () => {
  const definitions: unknown = artifact;
  validation.validateArtifact(definitions);
  const raw = JSON.parse(JSON.stringify(bell)) as { layout: { data: { pieces: Record<string, unknown>[] } } };
  for (const field of ['bounds', 'frame', 'top', 'posts', 'rise']) {
    const changed = structuredClone(raw),
      p = changed.layout.data.pieces[0]!;
    if (field === 'bounds') p.bounds = ['-60', 60, -3.8, 3.8];
    else if (field === 'frame') p.frame = { o: { x: null, z: -850 }, u: { x: 0, z: 1 }, v: { x: 1, z: 0 } };
    else if (field === 'top') p.top = '3.9';
    else if (field === 'rise') p.rise = '1';
    else p.posts = 'false';
    assert.throws(() => validation.loadLevelArtifact(changed, definitions.prefabs), /prefabs:/, field);
  }
});

test('null layouts reject without recursive revalidation', () => {
  const records: unknown = artifact;
  validation.validateArtifact(records);
  assert.throws(() => validation.loadLevelArtifact({ ...bell, layout: null }, records.prefabs), /layout operand/);
  for (const id of [123, '', null]) {
    const changed = JSON.parse(JSON.stringify(bell));
    changed.layout.data.extras[0].id = id;
    assert.throws(() => validation.loadLevelArtifact(changed, records.prefabs), /nonempty string/);
  }
});

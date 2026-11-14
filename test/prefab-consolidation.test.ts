// Pure compiler/loader representation proofs; no runtime golden is regenerated here.
import test from 'node:test';
import assert from 'node:assert/strict';
import { compile } from '../dev/prefab/compiler.ts';
import { expandOperands } from '../src/prefab/operands.ts';
import { loadPrefabArtifact, loadLevelArtifact } from '../src/prefab/validate.ts';
import { prefabs as rooms } from '../src/content/prefabs/rooms.ts';
import { prefabs as greybox } from '../src/content/prefabs/greybox.ts';
import { levels as gorge } from '../src/content/levels/gorge.ts';
import { metadata, type JsonObject } from '../src/prefab/types.ts';

test('shared authored frames, compact placement rows and omitted solid defaults resolve exactly', () => {
  const outputs = compile(greybox, gorge);
  const definitions = loadPrefabArtifact(JSON.parse(outputs.get('prefabs.json')!)).prefabs;
  const actual = loadLevelArtifact(JSON.parse(outputs.get('levels/gorge.json')!), definitions);
  const expected = loadLevelArtifact({ ...metadata, format: 'boogle-level', ...gorge[0] }, definitions);
  assert.deepEqual(actual, expected);
  const raw = JSON.parse(outputs.get('levels/gorge.json')!);
  assert.ok(raw.layout.operands.length > 0);
  assert.ok(raw.layout.boxes.every((box: JsonObject) => box.solid !== true));
  // The loader supplies solid=true: omission must retain every existing solid and decoration.
  assert.ok(actual.placements.some((p) => p.prefab === 'greybox.box'));
  assert.ok(actual.placements.some((p) => p.prefab === 'greybox.decoration'));
  const placements = [{ id: 'box', prefab: 'greybox.box' as const, pos: [0, 0, 0] as const }];
  const bytes = compile(greybox, [{ place: 'row', placements }]).get('levels/row.json')!;
  assert.deepEqual(loadLevelArtifact(JSON.parse(bytes), definitions).placements, placements);
});

test('shared operand references reject unknown, coercible, recursive and ambiguous values', () => {
  const definitions = [{ x: 1, z: 2 }];
  assert.deepEqual(expandOperands({ operands: definitions, frame: { operand: 0 } }), { frame: definitions[0] });
  for (const operand of [-1, 1, 0.5, '0', null, true])
    assert.throws(() => expandOperands({ operands: definitions, frame: { operand } }), /shared operand/);
  const invalid: JsonObject[] = [
    { operands: {}, frame: { operand: 0 } },
    { operands: [{ operand: 0 }], frame: { operand: 0 } },
    { operands: definitions, frame: { operand: 0, x: 10 } },
  ];
  for (const layout of invalid) assert.throws(() => expandOperands(layout), /prefabs:/);
});

test('room visuals and hulls share a single serialized dimension specification', () => {
  const raw = { ...metadata, format: 'boogle-prefabs', prefabs: Object.fromEntries(rooms.map((p) => [p.key, p])) };
  const expected = loadPrefabArtifact(raw);
  const artifact = JSON.parse(compile(rooms, []).get('prefabs.json')!);
  assert.deepEqual(loadPrefabArtifact(artifact), expected);
  const hull = artifact.prefabs['town.room-house-hulls-0'];
  assert.equal(hull.layout.source, 'town.room-house-shell');
  assert.ok(!('w' in hull.layout));
  for (const source of ['missing.shell', hull.key, 'town.room-plot-board', null]) {
    const bad = structuredClone(artifact);
    bad.prefabs[hull.key].layout.source = source;
    assert.throws(() => loadPrefabArtifact(bad), /dimension source/);
  }
  const ambiguous = structuredClone(artifact);
  ambiguous.prefabs[hull.key].layout.w = 7.4;
  assert.throws(() => loadPrefabArtifact(ambiguous), /dimension source/);
});

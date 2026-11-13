import test from 'node:test';
import assert from 'node:assert/strict';
import { validateArtifact, validateJson, validateLevel, validatePrefab } from '../src/prefab/validate.ts';
import { metadata, type PrefabDef, type Placement } from '../src/prefab/types.ts';
import type { NameRegistry } from '../src/prefab/names.ts';
import { compile } from '../dev/prefab/compiler.ts';

const registry: NameRegistry = {
  builders: ['chair'],
  interactions: [],
  gates: [],
  materials: [],
  assets: { chair: { nodes: ['Seat'] } },
  retired: ['town.retired'],
};
const prefab = (): PrefabDef => ({
  key: 'town.chair',
  visual: { none: true },
  colliders: [{ shape: 'box', at: [0, 0, 0], half: [1, 1, 1] }],
  scope: 'owner',
});
test('valid records and artifacts validate', () => {
  validatePrefab(prefab(), registry);
  validateArtifact({ ...metadata, format: 'boogle-prefabs', prefabs: { 'town.chair': prefab() } }, registry);
});
for (const [name, change] of Object.entries({
  'unknown builder': { visual: { builder: 'missing', params: {} } },
  'unknown asset': { visual: { asset: 'missing' } },
  'unknown node': { visual: { asset: 'chair', node: 'Missing' } },
  'retired key reused': { key: 'town.retired' },
  'non-JSON value': { components: { value: () => 1 } },
  'degenerate collider': { colliders: [{ shape: 'box', at: [0, 0, 0], half: [0, 1, 1] }] },
  'seat without exit': { attach: { seat: { kind: 'seat', at: [0, 1, 0], yaw: 0 } } },
}))
  test(name, () => assert.throws(() => validatePrefab({ ...prefab(), ...change }, registry)));
test('duplicate placements, unresolved references and cycles fail', () => {
  const p = { id: 'chair', prefab: 'town.chair', pos: [0, 0, 0] };
  const defs = { 'town.chair': prefab() as PrefabDef };
  assert.throws(() => validateLevel({ place: 'town', placements: [p, p] }, defs));
  assert.throws(() => validateLevel({ place: 'town', placements: [{ ...p, prefab: 'town.missing' }] }, defs));
  assert.throws(() => validateLevel({ place: 'town', placements: [{ ...p, parent: 'chair' }] }, defs));
});
test('unknown artifact version fails closed', () =>
  assert.throws(() => validateArtifact({ ...metadata, version: 2, format: 'boogle-prefabs', prefabs: {} }, registry)));
test('JSON rejects values serialization would erase', () => {
  for (const value of [undefined, NaN, Infinity, new Date(), { a: undefined }, Array(2), { a: 1n }])
    assert.throws(() => validateJson(value));
  const cycle: unknown[] = [];
  cycle.push(cycle);
  assert.throws(() => validateJson(cycle));
});

test('review regression: compiler rejects callback properties on arrays', () => {
  const values = Object.assign([], { callback: () => 0 });
  const record = { ...prefab(), visual: { builder: 'chair', params: { values } } };
  assert.throws(() => compile([record as unknown as PrefabDef], [], registry), /non-JSON/);
});

test('review regression: array accessors are rejected without executing them', () => {
  let calls = 0;
  const values = [0];
  Object.defineProperty(values, '0', {
    enumerable: true,
    get() {
      calls++;
      return 0;
    },
  });
  assert.throws(() => validateJson(values), /non-JSON/);
  assert.equal(calls, 0);
});

test('review regression: inherited names never satisfy registry membership', () => {
  for (const name of ['toString', 'constructor', '__proto__']) {
    assert.throws(() => validatePrefab({ ...prefab(), visual: { asset: name } }, registry), /unknown asset/);
    assert.throws(
      () => validatePrefab({ ...prefab(), visual: { builder: name, params: {} } }, registry),
      /unknown name/,
    );
    assert.throws(() => validatePrefab({ ...prefab(), interactions: [{ action: name }] }, registry), /unknown name/);
    assert.throws(
      () =>
        validatePrefab(
          { ...prefab(), interactions: [{ action: 'sit', gate: name }] },
          { ...registry, interactions: ['sit'] },
        ),
      /unknown name/,
    );
    assert.throws(() => validatePrefab({ ...prefab(), material: name }, registry), /unknown name/);
  }
});

test('re-review: unsupported collider scale fails validation and compilation', () => {
  const record: PrefabDef = {
    ...prefab(),
    colliders: [{ shape: 'box', at: [0, 0, 0], half: [1, 1, 1], rot: [0.3, 0, 0] }],
  };
  const placement: Placement = { id: 'chair', prefab: record.key, pos: [0, 0, 0], rot: [0, 0.7, 0], scale: [2, 1, 1] };
  const level = { place: 'town', placements: [placement] };
  assert.throws(() => validateLevel(level, { [record.key]: record }), /shear/);
  assert.throws(() => compile([record], [level], registry), /shear/);
  assert.doesNotThrow(() =>
    compile([record], [{ ...level, placements: [{ ...placement, scale: [1, 1, 1] }] }], registry),
  );
  const parent: Placement = { id: 'room', prefab: 'town.frame', pos: [0, 0, 0], scale: [2, 1, 1] };
  const frame: PrefabDef = { ...prefab(), key: 'town.frame', colliders: [] };
  assert.throws(
    () =>
      compile(
        [record, frame],
        [{ place: 'town', placements: [parent, { ...placement, parent: parent.id, scale: [1, 1, 1] }] }],
        registry,
      ),
    /shear/,
  );
});

test('re-review: array subclasses cannot compile as JSON data', () => {
  class AuthoredArray extends Array<number> {}
  const values = new AuthoredArray(1, 2, 3);
  assert.throws(() => validateJson(values), /non-JSON/);
  const record = { ...prefab(), visual: { builder: 'chair', params: { values } } };
  assert.throws(() => compile([record as PrefabDef], [], registry), /non-JSON/);
  validateJson([1, 2, 3]);
});

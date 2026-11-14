// Owner-requested review regressions: portable material properties and face lists, no three.js/DOM.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isOpaqueMaterial, materialSurface, type DrawMaterial } from '../src/geometry/zfight-surface.ts';
import { findZfights, type Face, type Point } from '../src/geometry/zfight.ts';
import { classifyZfights } from '../src/geometry/zfight-classify.ts';

const material = (patch: Partial<DrawMaterial> = {}): DrawMaterial => ({
  type: 'MeshStandardNodeMaterial',
  visible: true,
  transparent: false,
  opacity: 1,
  colorWrite: true,
  depthWrite: true,
  color: { toArray: () => [1, 1, 1] },
  ...patch,
});
const face = (piece: string, paint: DrawMaterial): Face => ({
  piece,
  points: [
    [0, 0, 0],
    [0, 0, 0.5],
    [0.5, 0, 0],
  ],
  surface: materialSurface(paint, true, true),
});
const different = material({ color: { toArray: () => [1, 0, 0] } });
const exposed = [face('a', material()), face('b', different)];

test('a shadow-only proxy cannot hide an exposed overlap or become a candidate', () => {
  const points: Point[] = [
    [-1, -1, -1],
    [-1, -1, 1],
    [1, -1, 1],
    [1, -1, -1],
    [-1, 1, -1],
    [-1, 1, 1],
    [1, 1, 1],
    [1, 1, -1],
  ];
  const box = [
    [4, 5, 6, 7],
    [3, 2, 1, 0],
    [0, 1, 5, 4],
    [2, 3, 7, 6],
    [1, 2, 6, 5],
    [3, 0, 4, 7],
  ];
  const scan = (paint: DrawMaterial) =>
    classifyZfights(
      findZfights(
        [
          ...exposed,
          ...(isOpaqueMaterial(paint)
            ? box.map((ids): Face => ({
                piece: 'proxy',
                points: ids.map((i) => points[i]!),
                surface: materialSurface(paint, true, true),
              }))
            : []),
        ],
        { includeHidden: true },
      ),
    );
  assert.equal(scan(material())[0]!.class, 'c', 'a genuinely opaque enclosing box hides the overlap');
  const proxy = material({ colorWrite: false, depthWrite: false });
  assert.equal(scan(proxy)[0]!.class, 'a', 'the room/forge shadow proxy must not suppress the exposed pair');
  const eligible = [material(), different, proxy].filter(isOpaqueMaterial);
  assert.equal(eligible.length, 2, 'the proxy cannot contribute candidate faces either');
});

test('the shared opaque-hit predicate skips invisible and non-depth-writing proxies', () => {
  for (const patch of [{ colorWrite: false, depthWrite: false }, { colorWrite: false }, { depthWrite: false }]) {
    const hits = [
      { name: 'proxy', material: material(patch) },
      { name: 'drawn', material: material() },
    ];
    assert.equal(hits.find((hit) => isOpaqueMaterial(hit.material))?.name, 'drawn');
  }
});

test('red emission at intensity 0 versus 2 is actionable, not a same-appearance joint', () => {
  const emissive = { toArray: () => [1, 0, 0] };
  const rows = classifyZfights(
    findZfights([
      face('a', material({ emissive, emissiveIntensity: 0 })),
      face('b', material({ emissive, emissiveIntensity: 2 })),
    ]),
  );
  assert.equal(rows[0]!.class, 'a');
});

for (const slot of ['emissiveNode', 'normalNode'] as const) {
  test(`unresolved ${slot} shading cannot be classified as a harmless joint`, () => {
    const paint = material({ [slot]: {} });
    const rows = classifyZfights(findZfights([face('a', material()), face('b', paint)]));
    assert.equal(rows[0]!.class, 'a');
    assert.ok(materialSurface(paint, true, true).uncertain);
    assert.equal(materialSurface(paint, true, true).occlusionUncertain, false, 'shading does not change coverage');
  });
}

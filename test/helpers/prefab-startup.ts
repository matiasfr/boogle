// Import the real page consumers in an isolated ESM cache. Runtime boundary dependencies are mocked;
// catalogue JSON, resolution, validation, consumer source and Node's module caching remain real.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { mock } from 'node:test';
import { parseSync } from 'oxc-parser';
import * as validation from '../../src/prefab/validate.ts';
import { names } from '../../src/prefab/names.ts';

const sourceRoot = new URL('../../src/', import.meta.url);
const consumerPaths = [
  'entities/town/workshop-kit.ts',
  'entities/town/shop.ts',
  'entities/town/curio-shelf.ts',
  'entities/town/museum.ts',
  'entities/town/rooms.ts',
  'entities/town/house.ts',
  'entities/route-greybox/boxes.ts',
  'entities/route-greybox/leg2-draw.ts',
  'prefab/instantiate.ts',
  'entities/railway/halt-kit.ts',
];
const bootstrapPaths = ['entities/town/index.ts', 'entities/town/view.ts'];
const real = new Set(
  [
    ...consumerPaths,
    ...bootstrapPaths,
    'prefab/catalogue.ts',
    'prefab/validate.ts',
    'prefab/names.ts',
    'sim/rng.ts',
  ].map((file) => new URL(file, sourceRoot).href),
);
const dependencies = new Map<string, Set<string>>();
const realImports = new Map<string, string[]>();
for (const relative of [...consumerPaths, ...bootstrapPaths]) {
  const url = new URL(relative, sourceRoot);
  const program = parseSync(relative, fs.readFileSync(url, 'utf8')).program;
  const edges: string[] = [];
  realImports.set(url.href, edges);
  for (const node of program.body) {
    if (node.type !== 'ImportDeclaration' || node.importKind === 'type' || !node.source.value.startsWith('.')) continue;
    const dependency = new URL(node.source.value, url);
    if (real.has(dependency.href)) {
      edges.push(dependency.href);
      continue;
    }
    if (dependency.pathname.endsWith('.json')) continue;
    const exports = dependencies.get(dependency.href) ?? new Set<string>();
    for (const specifier of node.specifiers) {
      if (specifier.type === 'ImportSpecifier' && specifier.importKind !== 'type')
        exports.add(specifier.imported.type === 'Identifier' ? specifier.imported.name : specifier.imported.value);
      else if (specifier.type === 'ImportDefaultSpecifier') exports.add('default');
      else if (specifier.type === 'ImportNamespaceSpecifier')
        throw new Error(`Add an explicit dependency mock: ${dependency.href}`);
    }
    dependencies.set(dependency.href, exports);
  }
}
for (const [url, exports] of dependencies) {
  const values: Record<string, unknown> = Object.fromEntries([...exports].map((name) => [name, () => {}]));
  if (url.endsWith('/proto/flags.ts')) values.productionRailway = false;
  if (url.endsWith('/world/game-world.ts')) values.railwayMirror = null;
  if (url.endsWith('/render/cosmetic-parts.ts')) values.GIFTS = [];
  if (url.endsWith('/prefab/builders.ts')) values.builders = new Map(names.builders.map((name) => [name, () => {}]));
  mock.module(url, { exports: values, cache: true });
}
const load = mock.fn(validation.loadPrefabArtifact);
const rawValidation = mock.fn(validation.validateArtifact);
mock.module(new URL('../../src/prefab/validate.ts', import.meta.url), {
  exports: { ...validation, loadPrefabArtifact: load, validateArtifact: rawValidation },
  cache: true,
});
// Verify and evaluate all ten real modules without acquiring their legacy constructor exports.
const consumerFixture = new URL('./prefab-consumers.ts', import.meta.url);
const fixtureImports = parseSync('prefab-consumers.ts', fs.readFileSync(consumerFixture, 'utf8'))
  .program.body.filter((node) => node.type === 'ImportDeclaration')
  .map((node) => new URL(node.source.value, consumerFixture).href);
assert.deepEqual(
  fixtureImports,
  consumerPaths.map(
    (file) => new URL(file === 'entities/town/curio-shelf.ts' ? 'entities/town/index.ts' : file, sourceRoot).href,
  ),
);
const reached = new Set<string>();
const pending = [...fixtureImports];
while (pending.length) {
  const url = pending.pop()!;
  if (reached.has(url)) continue;
  reached.add(url);
  pending.push(...(realImports.get(url) ?? []));
}
for (const file of consumerPaths)
  assert.ok(reached.has(new URL(file, sourceRoot).href), `${file}: real startup import is missing`);
const { roomCamera } = await import('./prefab-consumers.ts');
assert.equal(typeof roomCamera.enter, 'number');
assert.equal(load.mock.callCount(), 1, 'all ten consumer imports must share one catalogue validation');
assert.equal(rawValidation.mock.callCount(), 0, 'no consumer may directly revalidate the shared catalogue');
// A repeated import must reuse the already validated catalogue too.
await import('../../src/prefab/catalogue.ts');
assert.equal(load.mock.callCount(), 1);
console.log(
  JSON.stringify({
    consumers: consumerPaths.length,
    catalogueValidations: load.mock.callCount(),
    directValidations: rawValidation.mock.callCount(),
  }),
);

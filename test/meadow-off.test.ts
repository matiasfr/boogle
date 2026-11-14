// The meadow is Home's default ground dressing (docs/game-design/place.md, "The meadow"), and `?meadow=0` turns it
// off for comparison: with that flag the ground material must not evaluate the meadow's modules, and the seam they
// join through must add nothing to its graph, so "off" is the ground before the meadow. test/meadow-on.test.ts holds
// the default. Asked for by the meadow's review (14 November): a still cannot show a module that loaded and did
// nothing, so this test builds the material's node graph in Node. It draws nothing.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { registerHooks } from 'node:module';

const loaded: string[] = [];
registerHooks({
  load(url, context, next) {
    loaded.push(url);
    return next(url, context);
  },
});
(globalThis as { location?: unknown }).location = { search: '?meadow=0' };
const { homeGroundMaterial } = await import('../src/place/ground-material.ts');
const { applyPathSurface } = await import('../src/place/path-surface.ts');
const flags = await import('../src/place/meadow-flags.ts');
const MEADOW_MODULE = /\/meadow(?:-field|-flowers)?\.ts$/;
const loadedOff = loaded.filter((url) => MEADOW_MODULE.test(url));

type Layer = Parameters<typeof homeGroundMaterial>[0];
/** The finished ground material's graph with its random ids numbered in order of appearance. */
function graph(layer?: Layer) {
  const ids = new Map<string, string>();
  const canonical = (value: unknown): unknown => {
    if (typeof value === 'string' && /^[\da-f]{8}-[\da-f-]{27}$/i.test(value)) {
      if (!ids.has(value)) ids.set(value, `id-${ids.size}`);
      return ids.get(value);
    }
    if (Array.isArray(value)) return value.map(canonical);
    if (value && typeof value === 'object')
      return Object.fromEntries(Object.entries(value).map(([key, inner]) => [key, canonical(inner)]));
    return value;
  };
  return canonical(applyPathSurface(homeGroundMaterial(layer)).toJSON()) as { textures?: { name: string }[] };
}

test('with meadow=0 the ground material evaluates no meadow module', () => {
  assert.deepEqual(loadedOff, []);
  assert.deepEqual(flags.MEADOW, { tint: false, flowers: false, tier: '' });
  assert.equal(flags.meadowBeforeLand(), null);
  assert.equal(flags.meadowLawnLayer(), undefined);
});

test('the land, the ground material and the flags import no meadow module statically', () => {
  for (const file of ['land.ts', 'ground-material.ts', 'meadow-flags.ts', 'path-surface.ts']) {
    const source = fs.readFileSync(new URL(`../src/place/${file}`, import.meta.url), 'utf8');
    const imports = [...source.matchAll(/^import\s+(?!type\b)[^;]*?from\s+'([^']+)';/gm)].map((match) => match[1]!);
    assert.deepEqual(
      imports.filter((path) => MEADOW_MODULE.test(path)),
      [],
      file,
    );
  }
});

test('with meadow=0 the ground graph is the graph before the meadow: the lawn-layer seam adds nothing', () => {
  const off = graph(flags.meadowLawnLayer());
  assert.deepEqual(
    graph((lawn) => lawn),
    off,
  );
  assert.ok(!off.textures?.some((texture) => texture.name.startsWith('place-meadow')));
});

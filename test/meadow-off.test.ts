// The meadow experiments are off by default (docs/research/small-magic-look.md, "What was built"): with no flag the
// ground material must not evaluate their modules, and the seam they join through must add nothing to its graph.
// Asked for by the experiments' review (14 November): a still cannot show a module that loaded and did nothing, so
// this one test builds the material's node graph in Node. It draws nothing.
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
(globalThis as { location?: unknown }).location = { search: '' };
const { homeGroundMaterial } = await import('../src/place/ground-material.ts');
const { applyPathSurface } = await import('../src/place/path-surface.ts');
const flags = await import('../src/place/meadow-flags.ts');
const EXPERIMENT = /\/meadow(?:-field|-flowers)?\.ts$/;
const loadedOff = loaded.filter((url) => EXPERIMENT.test(url));

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

test('with no meadow flag the ground material evaluates no meadow experiment module', () => {
  assert.deepEqual(loadedOff, []);
  assert.deepEqual(flags.MEADOW, { tint: false, flowers: false });
  assert.equal(flags.meadowBeforeLand(), null);
  assert.equal(flags.meadowLawnLayer(), undefined);
});

test('the land, the ground material and the flags import no meadow experiment statically', () => {
  for (const file of ['land.ts', 'ground-material.ts', 'meadow-flags.ts', 'path-surface.ts']) {
    const source = fs.readFileSync(new URL(`../src/place/${file}`, import.meta.url), 'utf8');
    const imports = [...source.matchAll(/^import\s+(?!type\b)[^;]*?from\s+'([^']+)';/gm)].map((match) => match[1]!);
    assert.deepEqual(
      imports.filter((path) => EXPERIMENT.test(path)),
      [],
      file,
    );
  }
});

test('the lawn-layer seam adds nothing to the flag-off graph, and the tint does change it', async () => {
  const off = graph();
  assert.deepEqual(
    graph((lawn) => lawn),
    off,
  );
  const { meadowLawn } = await import('../src/place/meadow.ts');
  const tinted = graph(meadowLawn);
  assert.notDeepEqual(tinted, off);
  assert.ok(tinted.textures?.some((texture) => texture.name === 'place-meadow-field'));
  assert.ok(!off.textures?.some((texture) => texture.name === 'place-meadow-field'));
});

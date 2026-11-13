// There are no client lockstep registrations: all persisted live state belongs to the server.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { serverWorld } from './helpers/server-world.ts';

test('the server registry contains exactly roster, rail tuning and railway', () => {
  const { sync } = serverWorld();
  assert.deepEqual(sync.registry().states, ['roster', 'railTune', 'railway']);
  assert.deepEqual(Object.keys(sync.snapshot().data), ['roster', 'railTune', 'railway']);
});

test('rules runtime imports reach only pure modules (type-only boundaries are erased)', () => {
  const allowed = /\/src\/(world\/rules\/[^/]+|world\/grid|sim\/[^/]+)\.(js|ts)$/;
  const seen = new Set<string>();
  const visit = (url: URL) => {
    if (seen.has(url.href)) return;
    seen.add(url.href);
    assert.match(url.pathname, allowed, `rules reach ${url.pathname}`);
    const src = fs.readFileSync(url, 'utf8');
    for (const [, a, b] of src.matchAll(
      /^\s*(?:import|export)\b(?!\s+type\b)[^'";]*?\bfrom\s*['"]([^'"]+)['"]|^\s*import\s*['"]([^'"]+)['"]/gm,
    )) {
      const spec = a ?? b!;
      assert.ok(spec.startsWith('.'), `${url.pathname} imports the package ${spec}`);
      visit(new URL(spec, url));
    }
  };
  visit(new URL('../src/world/rules/roster.ts', import.meta.url));
  visit(new URL('../src/world/rules/tune.ts', import.meta.url));
});

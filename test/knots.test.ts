// The import-knot ratchet (dev/registry/knots.ts): the component finder and what it fails on.
import test from 'node:test';
import assert from 'node:assert/strict';
import { checkKnots, findKnots, importsOf } from '../dev/registry/knots.ts';

const graph = (edges: Record<string, string[]>) => new Map(Object.entries(edges));

test('findKnots finds cycles, and nothing in a chain, a self-import or an import outside the graph', () => {
  assert.deepEqual(findKnots(graph({ a: ['b'], b: ['c'], c: [] })), []);
  assert.deepEqual(findKnots(graph({ a: ['a', 'pkg'] })), []);
  assert.deepEqual(findKnots(graph({ b: ['a'], a: ['c'], c: ['b'], d: ['a'] })), [['a', 'b', 'c']]);
});

test('findKnots keeps separate cycles apart and joins overlapping ones', () => {
  assert.deepEqual(findKnots(graph({ x: ['y'], y: ['x', 'a'], a: ['b'], b: ['a'] })), [
    ['a', 'b'],
    ['x', 'y'],
  ]);
  assert.deepEqual(findKnots(graph({ a: ['b'], b: ['a', 'c'], c: ['d'], d: ['b'] })), [['a', 'b', 'c', 'd']]);
});

test('importsOf counts static value imports and re-exports only', () => {
  const g = importsOf([
    {
      path: 'src/a.ts',
      text: "import { b } from './b.ts';\nimport type { C } from './c.ts';\nexport { d } from './d.ts';\nimport('./e.ts');\nb;",
    },
  ]);
  assert.deepEqual(g.get('src/a.ts'), ['src/b.ts', 'src/d.ts']);
});

const ALLOWED = [
  ['a', 'b', 'c'],
  ['x', 'y'],
];

test('the ratchet passes the list as it is', () => {
  assert.deepEqual(checkKnots(ALLOWED, ALLOWED), []);
});

test('a file joining a knot fails, naming it', () => {
  const errors = checkKnots([['a', 'b', 'c', 'new'], ALLOWED[1]!], ALLOWED);
  assert.equal(errors.length, 1);
  assert.match(errors[0]!, /^new joined the import knot/);
});

test('a new knot fails, naming its files', () => {
  const errors = checkKnots([...ALLOWED, ['p', 'q']], ALLOWED);
  assert.equal(errors.length, 1);
  assert.match(errors[0]!, /new import knot: p, q/);
});

test('two listed knots merging fails', () => {
  const errors = checkKnots([['a', 'b', 'c', 'x', 'y']], ALLOWED);
  assert.equal(errors.length, 1);
  assert.match(errors[0]!, /merged: a and x/);
});

test('a listed file that left its knot fails until its line goes', () => {
  const errors = checkKnots([['a', 'b'], ALLOWED[1]!], ALLOWED);
  assert.equal(errors.length, 1);
  assert.match(errors[0]!, /^c has left its import knot.*Delete its line/);
  assert.deepEqual(checkKnots([['a', 'b'], ALLOWED[1]!], [['a', 'b'], ALLOWED[1]!]), []);
});

test('a listed knot that split fails until the list says so', () => {
  const errors = checkKnots([['a', 'b'], ['c', 'd'], ALLOWED[1]!], [['a', 'b', 'c', 'd'], ALLOWED[1]!]);
  assert.equal(errors.length, 1);
  assert.match(errors[0]!, /split in 2/);
});

test('an empty list means no knots allowed', () => {
  assert.deepEqual(checkKnots([], []), []);
  assert.equal(checkKnots([['a', 'b']], []).length, 1);
});

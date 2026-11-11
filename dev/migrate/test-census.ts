// The census for the railway test rewrite (docs/plans/ecs-migration-railway.md, M3c and T1 to T7): per test file, the
// test() calls and the assert calls written in it, counted on the syntax tree (a call in a loop counts once; a skipped
// or todo test and the asserts inside it are not counted). A batch
// prints it before and after its conversion: equal, or each difference named in its commit body. Not part of
// `npm run check`.
//
//   node dev/migrate/test-census.ts <test files...>
import fs from 'node:fs';
import { parseSync } from 'oxc-parser';

type Node = { type: string; [k: string]: unknown };
const callee = (n: Node): string => {
  const c = n.callee as Node;
  if (c.type === 'Identifier') return c.name as string;
  if (c.type === 'MemberExpression') {
    const o = c.object as Node;
    if (o.type === 'Identifier') return `${o.name as string}.`;
    if (o.type === 'MemberExpression' && (o.object as Node).type === 'Identifier')
      return `${(o.object as Node).name as string}.`; // assert.strict.equal and the like
  }
  return '';
};
const OFF = new Set(['skip', 'todo']);
/** A test that never runs: `test.skip(…)`, `test.todo(…)`, or a `{ skip }` / `{ todo }` option set to a truthy literal
 * (`true`, a reason). A computed one (`skip: process.getuid?.() === 0`) runs on most machines and still counts. */
function skipped(n: Node) {
  const c = n.callee as Node;
  const member = c.type === 'MemberExpression' ? ((c.property as Node).name as string) : '';
  if (OFF.has(member)) return true;
  return (n.arguments as Node[]).some(
    (a) =>
      a.type === 'ObjectExpression' &&
      (a.properties as Node[]).some(
        (p) =>
          p.type === 'Property' &&
          OFF.has(((p.key as Node).name ?? (p.key as Node).value) as string) &&
          (p.value as Node).type === 'Literal' &&
          !!(p.value as Node).value,
      ),
  );
}
function count(file: string) {
  const { program, errors } = parseSync(file, fs.readFileSync(file, 'utf8'));
  if (errors.length) throw new Error(`${file}: ${errors[0]!.message}`);
  let tests = 0,
    asserts = 0;
  const walk = (v: unknown) => {
    if (Array.isArray(v)) return v.forEach(walk);
    if (!v || typeof v !== 'object') return;
    const n = v as Node;
    if (n.type === 'CallExpression') {
      const name = callee(n);
      if (name === 'test' || name === 'it' || name === 'test.' || name === 'it.') {
        if (skipped(n)) return; // neither it nor the asserts written in it run
        tests++;
      } else if (name === 'assert' || name === 'assert.') asserts++;
    }
    for (const [k, child] of Object.entries(n)) if (k !== 'parent') walk(child);
  };
  walk(program);
  return { tests, asserts };
}

const files = process.argv.slice(2);
if (!files.length) {
  console.log('usage: node dev/migrate/test-census.ts <test files...>');
  process.exit(1);
}
let tests = 0,
  asserts = 0;
console.log('| File | Tests | Asserts |\n| --- | --- | --- |');
for (const f of files) {
  const c = count(f);
  tests += c.tests;
  asserts += c.asserts;
  console.log(`| ${f} | ${c.tests} | ${c.asserts} |`);
}
console.log(`| total | ${tests} | ${asserts} |`);

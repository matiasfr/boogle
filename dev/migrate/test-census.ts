// The census for the railway test rewrite (docs/plans/ecs-migration-railway.md, M3c and T1 to T7): per test file, the
// test() calls and the assert calls written in it, counted on the syntax tree (a call in a loop counts once). A batch
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
      if (name === 'test' || name === 'it' || name === 'test.' || name === 'it.') tests++;
      else if (name === 'assert' || name === 'assert.') asserts++;
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

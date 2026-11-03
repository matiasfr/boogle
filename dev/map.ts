// npm run map -- <folder> [more folders or files]: what's in a folder, without reading it. Each file's size, what its opening
// comment says, and what it exports. Start here, then use focused line ranges to follow ownership and dependencies;
// read everything needed to understand and verify the task.
import fs from 'node:fs';
import path from 'node:path';
import { docLabel, searchDocs } from './scan/docs.ts';
import { TASK_ROUTES, taskRouteLines } from './scan/task-routes.ts';
import { readFile } from './scan/read.ts';
import { readSection } from './scan/sections.ts';

const asked = process.argv.slice(2);
if (asked[0] === '--section') {
  if (!asked[1] || !asked[2]) throw new Error('npm run map -- --section <file> <heading-or-anchor>');
  const reference = `${asked[1]}#${asked.slice(2).join(' ')}`;
  const section = readSection('.', reference);
  console.log(`${reference} (lines ${section.start}-${section.end}; ${[...section.text].length} characters)`);
  console.log(section.text);
  process.exit(0);
}
if (asked[0] === '--kind') {
  if (!asked[1]) console.log(`Task kinds: ${Object.keys(TASK_ROUTES).join(', ')}`);
  else {
    const lines = taskRouteLines('.', asked.slice(1).join('-').toLowerCase());
    if (!lines) {
      console.error(`Unknown task kind: ${asked.slice(1).join(' ')}; npm run map -- --kind lists them`);
      process.exit(2);
    }
    console.log(lines.join('\n'));
  }
  process.exit(0);
}
if (asked[0] === '--docs') {
  if (!asked[1]) {
    console.error('npm run map -- --docs <text>');
    process.exit(2);
  }
  console.log(searchDocs('.', asked.slice(1).join(' ')).join('\n') || '(no matching documents)');
  process.exit(0);
}
if (!asked.length) {
  console.error('npm run map -- <folder> [more] | --kind [kind] | --docs <text>');
  process.exit(2);
}
const files = asked.flatMap((a) =>
  fs.statSync(a).isDirectory()
    ? fs
        .readdirSync(a)
        .filter((f) => /\.(ts|md)$/.test(f))
        .sort()
        .map((f) => path.join(a, f))
    : [a],
);
for (const f of files) {
  const text = fs.readFileSync(f, 'utf8');
  if (f.endsWith('.md')) {
    console.log(docLabel(f, text));
    continue;
  }
  const lines = text.split('\n');
  const facts = readFile(f, text);
  const sentence = facts.head.match(/^.*?\.(\s|$)/)?.[0]?.trim() ?? facts.head;
  // The shared runtime reader deliberately excludes types; keep the map's type-owner discovery too.
  const types = [...text.matchAll(/^export (?:type|interface) (\w+)/gm)].map((m) => m[1]!);
  const names = [...new Set([...facts.exports, ...types])];
  const shown = names.slice(0, 14).join(', ') + (names.length > 14 ? `, +${names.length - 14}` : '');
  console.log(`${f}  ${lines.length} lines, ${Math.round(text.length / 1000)}k`);
  if (sentence) console.log(`  ${sentence.slice(0, 170)}`);
  if (shown) console.log(`  exports: ${shown}`);
}

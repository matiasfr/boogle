// npm run atlas [-- --json]
//   (default)  extract the facts, write .look/atlas/facts.json and print a one-line summary
//   --json     print the facts to stdout instead
// Every mode exits 0 unless the CLI itself crashes: the atlas never blocks anything.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { extractFacts } from './extract.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const args = process.argv.slice(2);

function summary(facts) {
  const sum = (key) => facts.files.reduce((n, f) => n + f[key].length, 0);
  const parts = [
    `${facts.files.length} files`,
    `${facts.files.reduce((n, f) => n + f.loc, 0)} lines`,
    `${sum('ops')} ops`,
    `${sum('states')} states`,
    `${sum('owner')} presence keys`,
    `${sum('host')} host fields`,
    `${new Set(facts.files.flatMap((f) => f.msgs)).size} message types`,
    `${sum('actions')} actions`,
    `${sum('frames')} hooks`,
    `${sum('routes')} routes`,
    `${facts.files.filter((f) => f.parseError).length} parse errors`,
  ];
  return parts.join(', ');
}

const facts = extractFacts({ root: ROOT, git: true });

if (args.includes('--json')) {
  process.stdout.write(JSON.stringify(facts, null, 2) + '\n');
} else {
  const out = path.join(ROOT, '.look/atlas/facts.json');
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, JSON.stringify(facts, null, 2) + '\n');
  console.log(`atlas facts: ${summary(facts)}`);
  console.log(`wrote ${path.relative(ROOT, out)}`);
}

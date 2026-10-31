// npm run atlas [-- --json | --check]
//   (default)  extract the facts, write .look/atlas/facts.json and print a one-line summary
//   --json     print the facts to stdout instead
//   --check    the citation report: what in docs/atlas/ no longer matches the code or atlas/layout.js
// Every mode exits 0 unless the CLI itself crashes: the atlas never blocks anything.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { extractFacts } from './extract.mjs';
import { parseNarrative } from '../../atlas/narrative.js';
import { checkAtlas, foldersToDo } from '../../atlas/check.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const args = process.argv.slice(2);
const read = (rel) => {
  try {
    return fs.readFileSync(path.join(ROOT, rel), 'utf8');
  } catch {
    return undefined;
  }
};

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

// The citation report as { problems, todo }: reads the narrative files from disk.
export function report(facts) {
  const storyDir = path.join(ROOT, 'docs/atlas/stories');
  const storyTexts = {};
  if (fs.existsSync(storyDir)) {
    for (const f of fs.readdirSync(storyDir).sort()) {
      if (f.endsWith('.json')) storyTexts[`docs/atlas/stories/${f}`] = fs.readFileSync(path.join(storyDir, f), 'utf8');
    }
  }
  const { N, loadProblems } = parseNarrative({ conceptsText: read('docs/atlas/concepts.json'), storyTexts });
  const problems = checkAtlas({
    facts,
    concepts: N,
    stories: N.stories,
    changes: read('docs/atlas/changes.md'),
    mainSource: read('src/main.js'),
    loadProblems,
  });
  return { problems, todo: foldersToDo(facts, N) };
}

function printReport(facts) {
  const { problems, todo } = report(facts);
  const groups = new Map();
  for (const p of problems) {
    const key = p.match(/^\S+?\.(?:json|md|js|mjs)\b/)?.[0] ?? 'other';
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(p);
  }
  for (const [file, list] of groups) {
    console.log(`\n${file}`);
    for (const p of list) console.log(`  - ${p}`);
  }
  if (todo.length) {
    console.log(`\nFolders with no note in docs/atlas/concepts.json "folders" (to do, not errors):`);
    for (const d of todo) console.log(`  - ${d}`);
  }
  console.log(`\n${problems.length} problem${problems.length === 1 ? '' : 's'}`);
}

if (args.includes('--check')) {
  printReport(extractFacts({ root: ROOT, git: false }));
} else if (args.includes('--json')) {
  process.stdout.write(JSON.stringify(extractFacts({ root: ROOT, git: true }), null, 2) + '\n');
} else {
  const facts = extractFacts({ root: ROOT, git: true });
  const out = path.join(ROOT, '.look/atlas/facts.json');
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, JSON.stringify(facts, null, 2) + '\n');
  console.log(`atlas facts: ${summary(facts)}`);
  console.log(`wrote ${path.relative(ROOT, out)}`);
}

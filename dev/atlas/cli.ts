// npm run atlas [-- --json | --check]
//   (default)  extract the facts, write .look/atlas/facts.json and print a one-line summary
//   --json     print the facts to stdout instead
//   --check    the citation report: what in docs/atlas/ no longer matches the code or atlas/layout.ts
//   --changes [--since <ref>]  for the daily upkeep: the report, the commits since <ref> (default: the last commit that
//              touched docs/atlas/), what the code gained and lost since then, and folders with no note
//   --gate [--event schedule|merge|push|manual] [--since <ref>]  whether the upkeep should run: prints `last=<sha>` and
//              `go=0|1` for $GITHUB_OUTPUT (the reason goes to stderr). Needs no `npm ci`.
// Every mode exits 0 unless the CLI itself crashes: the atlas never blocks anything.
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { gate, git, sinceRef } from './git.ts';
import type { Facts, FileFacts, KeyKind } from '../../atlas/types.ts';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const args = process.argv.slice(2);
const msg = (err: unknown) => (err instanceof Error ? err.message : String(err));
const flag = (name: string) => (args.includes(name) ? (args[args.indexOf(name) + 1] ?? '') : undefined);
const ref = () => flag('--since') || sinceRef(ROOT);

if (args.includes('--gate')) {
  const r = gate(ROOT, ref(), flag('--event') || 'manual');
  console.error(r.why);
  console.log(`last=${r.last}\ngo=${r.go ? 1 : 0}`);
} else {
  await run();
}

async function run() {
  const fs = await import('node:fs');
  const { diffFacts, extractFacts, factsAt } = await import('./extract.ts');
  const { parseNarrative } = await import('../../atlas/narrative.ts');
  const { checkAtlas, foldersToDo } = await import('../../atlas/check.ts');
  const { sumLoc } = await import('../../atlas/model.ts');

  const read = (rel: string) => {
    try {
      return fs.readFileSync(path.join(ROOT, rel), 'utf8');
    } catch {
      return undefined;
    }
  };

  function summary(facts: Facts) {
    const sum = (key: KeyKind | 'frames') => facts.files.reduce((n: number, f: FileFacts) => n + f[key].length, 0);
    const parts = [
      `${facts.files.length} files`,
      `${sumLoc(facts.files)} lines`,
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
  function report(facts: Facts) {
    const storyDir = path.join(ROOT, 'docs/atlas/stories');
    const storyTexts: Record<string, string> = {};
    if (fs.existsSync(storyDir)) {
      for (const f of fs.readdirSync(storyDir).sort()) {
        if (f.endsWith('.json')) storyTexts[`docs/atlas/stories/${f}`] = read(`docs/atlas/stories/${f}`) ?? '';
      }
    }
    const N = parseNarrative({ conceptsText: read('docs/atlas/concepts.json'), storyTexts });
    const problems = checkAtlas({
      facts,
      concepts: N,
      stories: N.stories,
      changes: read('docs/atlas/changes.md'),
      loadProblems: N.loadProblems,
    });
    return { problems, todo: foldersToDo(facts, N) };
  }

  const todoLines = (todo: string[]) => (todo.length ? todo.map((d) => `  - ${d}`).join('\n') : '(none)');

  // Prints the problems grouped by file and returns the folders with no note, for the caller to print once.
  function printProblems(facts: Facts) {
    const { problems, todo } = report(facts);
    const groups = new Map<string, string[]>();
    for (const p of problems) {
      const key = p.match(/^\S+?\.(?:json|md|js|mjs)\b/)?.[0] ?? 'other';
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(p);
    }
    for (const [file, list] of groups) {
      console.log(`\n${file}`);
      for (const p of list) console.log(`  - ${p}`);
    }
    console.log(`\n${problems.length} problem${problems.length === 1 ? '' : 's'}`);
    return todo;
  }

  // The upkeep report: the --check report, commits since <ref>, the code's diff since then, folders to do.
  function printChanges() {
    const since = ref();
    const now = extractFacts({ root: ROOT, git: false });
    console.log(`# 1. Citation report`);
    const todo = printProblems(now);
    console.log(`\n# 2. Commits since ${since.slice(0, 7)}`);
    try {
      console.log(git(ROOT, 'log', '--no-merges', '--format=%h %s', `${since}..HEAD`) || '(none)');
    } catch (err) {
      console.log(`(could not read the log: ${msg(err)})`);
    }
    console.log(`\n# 3. What the code gained and lost`);
    try {
      const d = diffFacts(factsAt(ROOT, since), now);
      const list = (label: string, items: string[]) => items.length && console.log(`${label}: ${items.join(', ')}`);
      list('Files added', d.filesAdded);
      list('Files removed', d.filesRemoved);
      list('Folders added', d.foldersAdded);
      list('Folders removed', d.foldersRemoved);
      for (const [kind, { added, removed }] of Object.entries(d.keys)) {
        list(`${kind} added`, added);
        list(`${kind} removed`, removed);
      }
      if (!d.filesAdded.length && !d.filesRemoved.length && !Object.keys(d.keys).length)
        console.log('(no files or keys added or removed)');
    } catch (err) {
      console.log(`(could not read ${since}: ${msg(err)})`);
    }
    console.log(`\n# 4. Folders with no note`);
    console.log(todoLines(todo));
  }

  if (args.includes('--changes')) {
    printChanges();
  } else if (args.includes('--check')) {
    const todo = printProblems(extractFacts({ root: ROOT, git: false }));
    if (todo.length) {
      console.log(`\nFolders with no note in docs/atlas/concepts.json "folders" (to do, not errors):`);
      console.log(todoLines(todo));
    }
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
}

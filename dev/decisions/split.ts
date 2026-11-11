// node dev/decisions/split.ts [--from <git ref>] [--dry-run]: splits the single-file decision log and calls table into
// topic files (owner, 10 November 2026: "Should we optimize storage of decisions to keep the record but save context
// reads?", "Yes"). Deterministic and re-runnable: after a rebase brings new entries into the old two files, restore
// main's copies and run it again (see the "Re-run" lines it prints). It writes docs/decisions.md (the routing table),
// docs/decisions-<topic>.md, docs/decisions-open-questions.md, docs/decisions-archive.md, docs/agent-calls.md (open
// calls by topic) and dev/decisions/manifest.json, which `npm run decisions` checks every later tree against.
// Topics, superseded entries and Current rules wording are data in dev/decisions/topics.ts.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { chars, isLegacyLog, manifestOf, split } from './log.ts';
import { CALLS_FILE, MANIFEST_FILE, ROUTING_FILE } from './topics.ts';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const args = process.argv.slice(2);
const from = args.includes('--from') ? args[args.indexOf('--from') + 1] : undefined;
const dry = args.includes('--dry-run');
if (args.includes('--from') && !from) throw new Error('split: --from needs a git ref');

function legacy(file: string): string {
  if (from) return execFileSync('git', ['show', `${from}:${file}`], { cwd: ROOT, maxBuffer: 1 << 26 }).toString();
  return fs.readFileSync(path.join(ROOT, file), 'utf8');
}

const decisions = legacy(ROUTING_FILE);
const calls = legacy(CALLS_FILE);
if (!isLegacyLog(decisions)) {
  console.error(
    `split: ${from ?? 'the working'} ${ROUTING_FILE} is already split. Pass --from <ref> with the old single file (for example origin/main before the split landed), or restore it: git checkout <ref> -- ${ROUTING_FILE} ${CALLS_FILE}`,
  );
  process.exit(2);
}
const source = from
  ? `\`${from}\` (${execFileSync('git', ['rev-parse', '--short=8', from], { cwd: ROOT }).toString().trim()})`
  : 'the single-file log';
const result = split(decisions, calls, source);
const manifest = manifestOf(decisions, calls, source.replaceAll('`', ''));

if (result.unmatchedSuperseded.length) {
  console.error(`split: SUPERSEDED names entries that aren't in the log: ${result.unmatchedSuperseded.join(' | ')}`);
  process.exit(1);
}
for (const [file, text] of Object.entries(result.files)) {
  if (!dry) fs.writeFileSync(path.join(ROOT, file), text);
  console.log(`split: ${dry ? 'would write' : 'wrote'} ${file} (${chars(text).toLocaleString('en')} characters)`);
}
if (!dry) fs.writeFileSync(path.join(ROOT, MANIFEST_FILE), `${JSON.stringify(manifest, null, 2)}\n`);
console.log(
  `split: ${manifest.entries} entries and ${manifest.rows} call rows in; ${result.archived.length} entries archived as superseded; calls: ${result.calls.open} open (live), ${result.calls.ruled} ruled (archive), ${result.calls.keyword} placed by keyword`,
);
for (const [topic, [open, ruled]] of Object.entries(result.calls.byTopic))
  console.log(`split:   calls ${topic}: ${open} open, ${ruled} ruled`);
for (const f of result.fallbacks) console.log(`split: top entry placed by keyword (add it to TOP_TOPIC to pin): ${f}`);
console.log('split: now run `npm run decisions` (the no-loss check).');

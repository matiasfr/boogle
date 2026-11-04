// Report merged work without changing GitHub. The ship bot records the human in the PR body.
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';

const state = '.look/friends-report-date';
const args = process.argv.slice(2);
function validDate(value: string): boolean {
  return (
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    !Number.isNaN(Date.parse(`${value}T00:00:00Z`)) &&
    new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value
  );
}
if (args.length && (args.length !== 2 || args[0] !== '--since' || !validDate(args[1]!))) {
  throw new Error('Usage: npm run friends-report -- [--since YYYY-MM-DD]');
}
const now = new Date();
const today = now.toISOString().slice(0, 10);
let since = args[1];
if (!since) {
  try {
    since = readFileSync(state, 'utf8').trim();
    if (!validDate(since)) throw new Error('Invalid saved report date');
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
    since = new Date(now.getTime() - 7 * 86400000).toISOString().slice(0, 10);
  }
}
const workflow = readFileSync('.github/workflows/automerge.yml', 'utf8');
const owners = new Set(
  (workflow.match(/^\s+OWNERS:\s*([^\n#]+)/m)?.[1] ?? '')
    .trim()
    .split(/\s+/)
    .map((s) => s.toLowerCase()),
);
if (owners.has('')) throw new Error('Could not read OWNERS from automerge.yml');
const gh = (...argv: string[]) => execFileSync('gh', argv, { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 });
type Pull = {
  number: number;
  title: string;
  mergedAt: string;
  author: { login: string } | null;
  body: string;
  headRefName: string;
};
const pulls = JSON.parse(
  gh(
    'pr',
    'list',
    '--state',
    'merged',
    '--base',
    'main',
    '--search',
    `merged:>=${since}`,
    '--limit',
    '1000',
    '--json',
    'number,title,mergedAt,author,body,headRefName',
  ),
) as Pull[];
if (pulls.length === 1000) throw new Error('Report reached the 1000 PR limit; use a later --since date');
const risky =
  /^(src\/(net|netplay|world|sim)\/|server\/|scripts\/|\.github\/|dev\/lint\/|\.oxlintrc\.json$|lint-suppressions\.json$|package[^/]*\.json$)/;
console.log(`Friends' PRs merged to main since ${since} (UTC):`);
let count = 0;
for (const pr of pulls) {
  const author =
    (pr.headRefName.startsWith('ship/') && pr.body.match(/<!-- shipper: ([^\s]+) -->/)?.[1]) ||
    pr.author?.login ||
    'unknown';
  if (owners.has(author.toLowerCase())) continue;
  const pages = JSON.parse(
    gh('api', '--paginate', '--slurp', `repos/{owner}/{repo}/pulls/${pr.number}/files?per_page=100`),
  ) as { filename: string; previous_filename?: string }[][];
  const files = pages.flat();
  const flagged = files.some(
    (file) => risky.test(file.filename) || (file.previous_filename && risky.test(file.previous_filename)),
  );
  console.log(
    `\n#${pr.number} @${author} ${pr.mergedAt.slice(0, 10)}${flagged ? ' [sensitive paths]' : ''} ${pr.title}`,
  );
  for (const file of files)
    console.log(`  ${file.filename}${file.previous_filename ? ` (from ${file.previous_filename})` : ''}`);
  count++;
}
if (!count) console.log('None.');
mkdirSync('.look', { recursive: true });
writeFileSync(state, `${today}\n`);

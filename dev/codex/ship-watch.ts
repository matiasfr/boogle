// Read-only watch for shipping work that needs attention.
import { execFileSync } from 'node:child_process';

type Check = { state?: string; conclusion?: string; status?: string; completedAt?: string };
type PR = { number: number; headRefName: string; mergeable: string; createdAt: string; statusCheckRollup: Check[] };
function gh(...args: string[]): string {
  return execFileSync('gh', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
}
function check(): string | undefined {
  const prs: PR[] = JSON.parse(
    gh(
      'pr',
      'list',
      '--state',
      'open',
      '--limit',
      '1000',
      '--json',
      'number,headRefName,mergeable,createdAt,statusCheckRollup',
    ),
  );
  for (const pr of prs) {
    if (pr.mergeable === 'CONFLICTING') return `PR #${pr.number} (${pr.headRefName}) has a merge conflict`;
    const checks = pr.statusCheckRollup ?? [];
    if (
      checks.some((c) =>
        ['FAILURE', 'ERROR', 'TIMED_OUT', 'ACTION_REQUIRED', 'CANCELLED'].includes(c.conclusion ?? c.state ?? ''),
      )
    )
      return `PR #${pr.number} (${pr.headRefName}) has red CI`;
    if (
      checks.length &&
      checks.every((c) => ['SUCCESS', 'NEUTRAL', 'SKIPPED'].includes(c.conclusion ?? c.state ?? '')) &&
      Date.now() -
        Math.max(Date.parse(pr.createdAt), ...checks.map((c) => (c.completedAt ? Date.parse(c.completedAt) : 0))) >
        20 * 60_000
    )
      return `PR #${pr.number} (${pr.headRefName}) has been open with green CI for over 20 minutes`;
  }
  // List remote ship branches too; a branch without an open PR has no PR checks to evaluate.
  const branches = gh('api', '--paginate', 'repos/{owner}/{repo}/branches?per_page=100', '--jq', '.[].name')
    .trim()
    .split('\n');
  for (const branch of branches.filter(
    (name) => name.startsWith('ship/') && !prs.some((pr) => pr.headRefName === name),
  )) {
    const ref = encodeURIComponent(branch);
    const status = JSON.parse(gh('api', `repos/{owner}/{repo}/commits/${ref}/status`));
    const runs = JSON.parse(gh('api', `repos/{owner}/{repo}/commits/${ref}/check-runs?per_page=100`));
    if (
      ['failure', 'error'].includes(status.state) ||
      runs.check_runs.some((run: Check) =>
        ['failure', 'timed_out', 'action_required', 'cancelled'].includes(run.conclusion ?? ''),
      )
    )
      return `Branch ${branch} has red CI`;
  }
  return undefined;
}
const once = process.argv.slice(2);
if (once.some((arg) => arg !== '--once') || once.length > 1) throw new Error('Usage: npm run ship-watch -- [--once]');
for (;;) {
  try {
    const reason = check();
    if (reason) {
      console.log(reason);
      process.exitCode = 1;
      break;
    }
    if (once.length) {
      console.log('No shipping issues found');
      break;
    }
  } catch (error) {
    console.error(
      `ship-watch could not check GitHub: ${error instanceof Error ? error.message.split('\n')[0] : error}`,
    );
    process.exitCode = 1;
    break;
  }
  await new Promise((resolve) => setTimeout(resolve, 120_000));
}

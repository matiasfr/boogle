// Every `Daily <job>: <status>. Evidence: <dir>` verdict a job has given, oldest first, for `npm run heartbeat` and
// dev/ship-queue.sh. Two sources: each run's evidence.json (<state>/runs/<job>-<time>-<pid>/, written by dev/daily/run.ts
// on every run, by hand or scheduled) and launchd's stdout log (<state>/<job>.log, scheduled runs only, kept for runs
// whose folder was cleaned up). Until 11 November the readers took only the log, so a pass by hand (`npm run daily --
// scenarios`) never reached the heartbeat or the ship queue's hold.
//   node dev/daily/verdicts.ts <job>
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { stateDir } from './jobs.ts';

/** Verdict lines, one per run (by its evidence folder), sorted by the run's start time in the folder's name. */
export function verdicts(job: string, state = stateDir): string[] {
  const lines = new Map<string, string>();
  const log = path.join(state, `${job}.log`);
  for (const line of (fs.existsSync(log) ? fs.readFileSync(log, 'utf8') : '').split('\n'))
    if (line.startsWith(`Daily ${job}:`)) lines.set(/Evidence: (.*)$/.exec(line)?.[1] ?? line, line);
  const runs = path.join(state, 'runs');
  for (const name of fs.existsSync(runs) ? fs.readdirSync(runs) : []) {
    if (!name.startsWith(`${job}-`)) continue;
    const dir = path.join(runs, name);
    try {
      const { status } = JSON.parse(fs.readFileSync(path.join(dir, 'evidence.json'), 'utf8')) as { status?: string };
      if (status) lines.set(dir, `Daily ${job}: ${status}. Evidence: ${dir}`);
    } catch {
      // still running (no evidence yet) or unreadable: not a verdict
    }
  }
  const time = (line: string) => /\d{4}-\d\d-\d\dT[\d-]+Z/.exec(line)?.[0] ?? '';
  return [...lines.values()].sort((a, b) => time(a).localeCompare(time(b)));
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const job = process.argv[2];
  if (!job) {
    console.error('usage: node dev/daily/verdicts.ts <job>');
    process.exit(1);
  }
  for (const line of verdicts(job)) console.log(line);
}

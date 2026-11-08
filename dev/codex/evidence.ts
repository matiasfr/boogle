// Broker-owned execution evidence. A command passing is separate from the worker's visual judgement in report.md.
import fs from 'node:fs';
import path from 'node:path';
import { buildAt, sameBuild, type Build } from './source.ts';

export type Operation = 'look' | 'playthrough' | 'scenario' | 'cold-start' | 'net' | 'perf';
export type Request = {
  operation: Operation;
  url: string;
  dataDir: string;
  args: string[];
  query: string;
  clockUrl?: string;
};
export type Evidence = {
  id: string;
  operation: Operation;
  args: string[];
  query: string;
  started: string;
  finished: string;
  status: number;
  before: Build;
  after: Build;
  harness: Build;
  harnessAfter: Build;
  changedDuringRun: boolean;
  artifacts: string[];
};

/** Relative artifact paths; never follow a symlink into another job's files. */
export function artifacts(dir: string, prefix = ''): string[] {
  return fs
    .readdirSync(path.join(dir, prefix), { withFileTypes: true })
    .flatMap((entry) => {
      const file = path.join(prefix, entry.name);
      return entry.isDirectory() ? artifacts(dir, file) : entry.isFile() ? [file] : [];
    })
    .sort();
}

export function handoff(cwd: string, logs: string) {
  const source = path.join(cwd, '.look/evidence');
  const out = path.join(logs, 'evidence');
  const finalBuild = buildAt(cwd);
  const runs: (Evidence & { directory: string; matchesFinalBuild: boolean })[] = [];
  if (fs.existsSync(source)) {
    for (const entry of fs.readdirSync(source, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const dir = path.join(source, entry.name);
      const file = path.join(dir, 'evidence.json');
      if (!fs.existsSync(file)) continue;
      const evidence = JSON.parse(fs.readFileSync(file, 'utf8')) as Evidence;
      // Workers may save their own evidence.json here; only broker manifests have build fingerprints.
      if (!evidence.after || typeof evidence.after.tree !== 'string') continue;
      const dest = path.join(out, entry.name);
      fs.mkdirSync(dest, { recursive: true });
      const copied = artifacts(dir);
      for (const artifact of copied) {
        fs.mkdirSync(path.dirname(path.join(dest, artifact)), { recursive: true });
        fs.copyFileSync(path.join(dir, artifact), path.join(dest, artifact));
      }
      runs.push({
        ...evidence,
        artifacts: copied.filter((f) => f !== 'evidence.json'),
        directory: dest,
        matchesFinalBuild: sameBuild(evidence.after, finalBuild),
      });
    }
  }
  fs.writeFileSync(path.join(logs, 'evidence.json'), JSON.stringify({ finalBuild, runs }, null, 2) + '\n');
  const lines = [
    '# Codex handoff',
    '',
    `Final build: \`${finalBuild.commit}\`; ${finalBuild.dirty ? 'uncommitted changes' : 'clean'}.`,
    '[Worker assessment](report.md) · [Machine evidence](evidence.json)',
    '',
    'Command status is execution evidence, not a visual verdict. Read the worker assessment for inspected images and observations.',
    '',
  ];
  for (const run of runs) {
    const base = `evidence/${run.id}`;
    lines.push(
      `- **${run.operation}: exit ${run.status}**${run.changedDuringRun ? ' — BUILD CHANGED DURING RUN' : ''}${run.matchesFinalBuild ? '' : ' — differs from final build'}. [Log](${base}/output.txt) · [Manifest](${base}/evidence.json)`,
    );
    // Show the useful entry points, not every saved checkpoint or trace chunk.
    for (const file of run.artifacts.filter((f) => /(?:\.png|report\.txt|bot\.txt|\.csv|\.webm|\.zip)$/.test(f)))
      lines.push(`  - [${file}](${base}/${file.split(path.sep).map(encodeURIComponent).join('/')})`);
  }
  if (!runs.length) lines.push('No broker evidence was collected.');
  // The assessment must keep working after the caller removes the worker worktree too.
  const report = path.join(logs, 'report.md');
  if (fs.existsSync(report)) {
    const text = fs.readFileSync(report, 'utf8');
    fs.writeFileSync(
      report,
      text
        .replaceAll(source + path.sep, out + path.sep)
        .replaceAll('](.look/evidence/', '](evidence/')
        .replaceAll('](./.look/evidence/', '](evidence/'),
    );
  }
  lines.push(
    '',
    'Limits: warped playthroughs do not establish first-time-player pacing, real-time smoothness, or subjective feel. Images and curves need interpretation.',
  );
  fs.writeFileSync(path.join(logs, 'handoff.md'), lines.join('\n') + '\n');
}

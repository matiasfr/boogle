// Read-only job inventory across every checkout, including older launcher metadata.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { alive } from './session.ts';

const args = process.argv.slice(2);
if (args.some((arg) => !['--all', '--json'].includes(arg)))
  throw new Error('usage: npm run codex-status -- [--all] [--json]');
const now = Date.now();
const date = (value: unknown) => (typeof value === 'string' ? Date.parse(value) || 0 : 0);
const label = (value: unknown, fallback: string) => (typeof value === 'string' ? value : fallback);
const age = (started: number) => {
  if (!started) return '?';
  const seconds = Math.max(0, Math.floor((now - started) / 1000));
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
  return `${Math.floor(seconds / 86400)}d`;
};
type Row = {
  topic: string;
  status: 'running' | 'stale' | 'finished' | 'failed' | 'dead' | 'unknown';
  model: string;
  age: string;
  report: string;
  meta: string;
  started: number;
  finished: number;
  pid?: number;
  exitCode?: number;
  surviving: { name: string; pid: number }[];
  error?: string;
};
const rows: Row[] = [];
// -z avoids Git's quoting of spaces, non-ASCII characters and newlines in worktree paths.
const worktrees = execFileSync('git', ['worktree', 'list', '--porcelain', '-z'], { encoding: 'utf8' })
  .split('\0')
  .filter((field) => field.startsWith('worktree '))
  .map((field) => field.slice(9));
for (const worktree of new Set(worktrees)) {
  const root = path.join(worktree, '.look/codex');
  let topics: string[];
  try {
    topics = fs.readdirSync(root);
  } catch {
    continue;
  }
  for (const topic of topics) {
    const file = path.join(root, topic, 'meta.json');
    // Directories without metadata aren't jobs yet. An unreadable existing file still gets a row.
    try {
      fs.lstatSync(file);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') continue;
    }
    const row: Row = {
      topic,
      status: 'unknown',
      model: '?',
      age: '?',
      report: path.join(root, topic, 'report.md'),
      meta: file,
      started: 0,
      finished: 0,
      surviving: [],
    };
    try {
      const parsed: unknown = JSON.parse(fs.readFileSync(file, 'utf8'));
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('Invalid metadata object');
      const meta = parsed as Record<string, unknown>;
      row.topic = label(meta.topic, topic);
      row.model = label(meta.model, '?');
      row.started = date(meta.started);
      row.finished = date(meta.finished);
      row.age = age(row.started);
      if (typeof meta.status === 'number') row.exitCode = meta.status;
      if (typeof meta.pid === 'number' && Number.isSafeInteger(meta.pid) && meta.pid > 0) row.pid = meta.pid;
      if (meta.state === 'finished' || meta.finished) row.status = row.exitCode ? 'failed' : 'finished';
      else if (row.pid !== undefined || meta.state === 'running') {
        row.status = alive(row.pid) ? 'running' : 'dead';
        const heartbeat = date(meta.heartbeat);
        if (row.status === 'running' && heartbeat && now - heartbeat > 5 * 60_000) row.status = 'stale';
        if (row.status === 'dead')
          for (const name of ['codexPid', 'brokerPid']) {
            const pid = meta[name];
            if (alive(pid)) row.surviving.push({ name, pid });
          }
      }
    } catch (error) {
      row.error = String(error);
    }
    if (args.includes('--all') || row.status !== 'finished' || now - row.finished < 86400_000) rows.push(row);
  }
}
rows.sort((a, b) => b.started - a.started || a.meta.localeCompare(b.meta));
if (args.includes('--json')) console.log(JSON.stringify(rows, null, 2));
else {
  console.log('TOPIC\tSTATUS\tMODEL\tAGE\tREPORT');
  for (const row of rows) {
    const detail = row.error ?? row.surviving.map(({ name, pid }) => `${name} ${pid} alive`).join(', ');
    console.log([row.topic, row.status + (detail ? ` (${detail})` : ''), row.model, row.age, row.report].join('\t'));
  }
}

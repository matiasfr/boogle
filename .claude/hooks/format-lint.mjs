// Claude Code PostToolUse hook (see .claude/settings.json): after Claude edits a file, run Prettier on it and,
// for JS, ESLint. Keeps formatting consistent so concurrent edits merge cleanly. Lint errors go back to Claude
// (exit 2) without blocking; anything unexpected (no node_modules yet, odd path) is skipped silently.
import { existsSync, readFileSync } from 'node:fs';
import { dirname, extname, join } from 'node:path';
import { spawnSync } from 'node:child_process';

let file;
try {
  file = JSON.parse(readFileSync(0, 'utf8')).tool_input?.file_path;
} catch {
  process.exit(0);
}
if (!file || !existsSync(file)) process.exit(0);
if (!['.js', '.mjs', '.ts', '.css', '.json', '.html', '.yml', '.yaml'].includes(extname(file))) process.exit(0);

// The checkout (main repo or a worktree) that owns the file, and the nearest installed tools.
const up = (from, hit) => {
  for (let d = from; ; d = dirname(d)) {
    if (hit(d)) return d;
    if (dirname(d) === d) return null;
  }
};
const root = up(dirname(file), (d) => existsSync(join(d, '.git')));
const bin = root && up(root, (d) => existsSync(join(d, 'node_modules/.bin/prettier')));
if (!bin) process.exit(0);
const run = (tool, args) =>
  spawnSync(join(bin, 'node_modules/.bin', tool), args, { cwd: root, encoding: 'utf8', timeout: 20000 });

run('prettier', ['--write', '--log-level', 'silent', '--ignore-unknown', file]);

if (/\.(m?js|ts)$/.test(file) && existsSync(join(bin, 'node_modules/.bin/eslint'))) {
  const r = run('eslint', ['--quiet', '--no-warn-ignored', file]);
  if (r.status === 1) {
    process.stderr.write(`ESLint errors (fix them before you finish; fine to ignore mid-edit):\n${r.stdout}`);
    process.exit(2);
  }
}

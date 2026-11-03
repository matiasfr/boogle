// PostToolUse hook for Claude Code (.claude/settings.json) and Codex (.codex/hooks.json): after an agent edits a file, run
// Prettier on it and, for JS, ESLint. Keeps formatting consistent so concurrent edits merge cleanly. Lint errors go back to Claude
// (exit 2) without blocking; anything unexpected (no node_modules yet, odd path) is skipped silently. Bulk suppressions
// apply here as in `npm run lint` (eslint-suppressions.json, found from cwd), except that one going stale mid-edit isn't an
// error yet: `npm run lint` catches that when you ship.
import { existsSync, readFileSync } from 'node:fs';
import { dirname, extname, join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

// Claude Code names one file; Codex's apply_patch names them in the patch's headers, relative to the session's directory.
let files: string[] = [];
let cwd = process.cwd();
try {
  const input = JSON.parse(readFileSync(0, 'utf8'));
  cwd = input.cwd ?? cwd;
  const { file_path, command } = input.tool_input ?? {};
  if (file_path) files = [file_path];
  else if (typeof command === 'string')
    files = [...command.matchAll(/^\*\*\* (?:Add File|Update File|Move to): (.+)$/gm)].map((m) => resolve(cwd, m[1]!.trim()));
} catch {
  process.exit(0);
}
const EXTS = ['.js', '.mjs', '.ts', '.css', '.json', '.html', '.yml', '.yaml'];
files = files.filter((f) => existsSync(f) && EXTS.includes(extname(f)));
if (!files.length) process.exit(0);
const file = files[0]!;

// The checkout (main repo or a worktree) that owns the file, and the nearest installed tools.
const up = (from: string, hit: (d: string) => boolean): string | null => {
  for (let d = from; ; d = dirname(d)) {
    if (hit(d)) return d;
    if (dirname(d) === d) return null;
  }
};
const root = up(dirname(file), (d) => existsSync(join(d, '.git')));
const bin = root && up(root, (d) => existsSync(join(d, 'node_modules/.bin/prettier')));
if (!bin) process.exit(0);
const run = (tool: string, args: string[]) =>
  spawnSync(join(bin!, 'node_modules/.bin', tool), args, { cwd: root, encoding: 'utf8', timeout: 20000 });

run('prettier', ['--write', '--log-level', 'silent', '--ignore-unknown', ...files]);

const code = files.filter((f) => /\.(m?js|ts)$/.test(f));
if (code.length && existsSync(join(bin, 'node_modules/.bin/eslint'))) {
  const r = run('eslint', ['--quiet', '--no-warn-ignored', '--pass-on-unpruned-suppressions', ...code]);
  if (r.status === 1) {
    process.stderr.write(`ESLint errors (fix them before you finish; fine to ignore mid-edit):\n${r.stdout}`);
    process.exit(2);
  }
}

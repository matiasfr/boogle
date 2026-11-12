// npm run patch -- <file>: many edits in one go, for an agent changing several files at once. Each edit's text must be in its
// file exactly once, or nothing at all is written and it says which failed: a throwaway script's `s.replace` misses in silence.
// Then Prettier and the full lint runner on what it touched and a typecheck, since the editor's own format hook doesn't see this.
//
//   === src/entities/railway/view.ts
//   <<<<
//   const old = 1;
//   ====
//   const replacement = 2;
//   >>>>
//   === a/new/file.ts       (an empty <<<< side with no matching text makes a new file only when it doesn't exist)
//
// --no-check skips the Prettier, lint and typecheck step.
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';

const args = process.argv.slice(2);
const noCheck = args.includes('--no-check');
const specFile = args.find((a) => !a.startsWith('--'));
if (!specFile) {
  console.error('npm run patch -- <file> [--no-check]');
  process.exit(2);
}
const spec = fs.readFileSync(specFile, 'utf8');
type Edit = { file: string; from: string; to: string; line: number };
const edits: Edit[] = [];
let file = '';
let mode: 'out' | 'from' | 'to' = 'out';
let from: string[] = [];
let to: string[] = [];
let startLine = 0;
spec.split('\n').forEach((text, k) => {
  if (mode === 'out') {
    const head = /^=== (.+)$/.exec(text);
    if (head) file = head[1]!.trim();
    else if (text === '<<<<') {
      mode = 'from';
      from = [];
      to = [];
      startLine = k + 1;
    } else if (text.trim()) throw new Error(`line ${k + 1}: expected "=== path" or "<<<<", got: ${text.slice(0, 80)}`);
  } else if (mode === 'from') {
    if (text === '====') mode = 'to';
    else from.push(text);
  } else if (text === '>>>>') {
    if (!file) throw new Error(`line ${k + 1}: an edit before any "=== path"`);
    edits.push({ file, from: from.join('\n'), to: to.join('\n'), line: startLine });
    mode = 'out';
  } else to.push(text);
});
if (mode !== 'out') throw new Error('the last edit never closed with >>>>');

const next = new Map<string, string>();
const failed: string[] = [];
for (const e of edits) {
  const exists = next.has(e.file) || fs.existsSync(e.file);
  if (!exists && e.from === '') {
    next.set(e.file, e.to + '\n');
    continue;
  }
  if (!exists) {
    failed.push(`${e.file} (edit at line ${e.line}): no such file`);
    continue;
  }
  const text = next.get(e.file) ?? fs.readFileSync(e.file, 'utf8');
  const at = text.indexOf(e.from);
  const again = at < 0 ? -1 : text.indexOf(e.from, at + 1);
  if (e.from === '' || at < 0 || again >= 0) {
    const why =
      e.from === '' ? 'empty target on an existing file' : at < 0 ? 'text not found' : 'text found more than once';
    failed.push(`${e.file} (edit at line ${e.line}): ${why}: ${e.from.split('\n')[0]!.slice(0, 80)}`);
    continue;
  }
  next.set(e.file, text.slice(0, at) + e.to + text.slice(at + e.from.length));
}
if (failed.length) {
  console.error(`Nothing written. ${failed.length} of ${edits.length} edits failed:\n  ${failed.join('\n  ')}`);
  process.exit(1);
}
for (const [f, text] of next) {
  fs.mkdirSync(f.split('/').slice(0, -1).join('/') || '.', { recursive: true });
  fs.writeFileSync(f, text);
}
console.log(`${edits.length} edits in ${next.size} files.`);
if (noCheck) process.exit(0);
const files = [...next.keys()];
const run = (cmd: string, a: string[]) => spawnSync(cmd, a, { encoding: 'utf8' });
run('npx', ['prettier', '--write', '--log-level', 'silent', '--ignore-unknown', ...files]);
const code = files.filter((f) => /\.(ts|js)$/.test(f));
let bad = false;
if (code.length) {
  const lint = run(process.execPath, [
    'dev/lint/run.ts',
    '--quiet',
    '--no-warn-ignored',
    '--pass-on-unpruned-suppressions',
    ...code,
  ]);
  if (lint.status) {
    bad = true;
    console.log(lint.stdout + lint.stderr);
  }
  const types = run('npm', ['run', 'typecheck']);
  if (types.status) {
    bad = true;
    console.log(types.stdout.split('\n').slice(0, 30).join('\n'));
  }
}
if (!bad) console.log('Formatted; lint and types are clean.');
process.exit(bad ? 1 : 0);

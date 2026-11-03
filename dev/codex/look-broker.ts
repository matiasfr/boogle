// Runs `npm run look` for a sandboxed Codex job (./see.ts) from outside its sandbox, because Chromium can't start inside it:
// node dev/codex/look-broker.ts <worktree>. Started and stopped by ./run.ts. It runs this checkout's harness, never the
// job's, and only a browser touches the job's code, so the job's edits still can't run anything outside the sandbox.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

const worktree = path.resolve(process.argv[2]!);
const dir = path.join(worktree, '.look/see');
const lookTs = fileURLToPath(new URL('../look/look.ts', import.meta.url));
const FORBIDDEN = ['--url', '--out', '--root'];
const FILE_FLAGS = ['--eval', '--action', '--curves-vs'];
const parent = process.ppid;

/** The options as the harness should get them, or the reason they can't be run. */
function vet(request: { url?: unknown; args?: unknown; query?: unknown }) {
  const { url, args, query } = request;
  if (typeof url !== 'string' || !/^http:\/\/127\.0\.0\.1:\d+\/?$/.test(url)) return 'url must be on 127.0.0.1';
  if (typeof query !== 'string') return 'query must be a string';
  if (!Array.isArray(args) || args.some((a) => typeof a !== 'string')) return 'args must be strings';
  const out = [...(args as string[])];
  for (let i = 0; i < out.length; i++) {
    if (FORBIDDEN.includes(out[i]!)) return `${out[i]} is set by the broker`;
    if (FILE_FLAGS.includes(out[i]!) && out[i + 1]) {
      const file = path.resolve(worktree, out[++i]!);
      if (!file.startsWith(worktree + path.sep)) return `${file} is outside the worktree`;
      out[i] = file;
    }
  }
  return { url, query, args: out };
}

function look(args: string[], url: string, query: string) {
  return new Promise<{ status: number; output: string }>((resolve) => {
    const out = path.join(worktree, '.look');
    const child = spawn(process.execPath, [lookTs, '--url', url, '--out', out, ...args], {
      cwd: path.dirname(path.dirname(path.dirname(lookTs))),
      env: { ...process.env, BOOGLE_QUERY: query },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let output = '';
    child.stdout.on('data', (d) => (output += d));
    child.stderr.on('data', (d) => (output += d));
    const timer = setTimeout(() => child.kill(), 5 * 60_000);
    child.on('close', (code) => {
      clearTimeout(timer);
      resolve({ status: code ?? 1, output });
    });
  });
}

fs.mkdirSync(dir, { recursive: true });
for (;;) {
  try {
    process.kill(parent, 0);
  } catch {
    process.exit(0); // run.ts is gone
  }
  for (const name of fs.readdirSync(dir)) {
    if (!name.endsWith('.json') || name.endsWith('.done.json')) continue;
    const id = name.slice(0, -'.json'.length),
      done = path.join(dir, `${id}.done.json`);
    if (fs.existsSync(done)) continue;
    let answer: { status: number; output: string };
    try {
      const vetted = vet(JSON.parse(fs.readFileSync(path.join(dir, name), 'utf8')));
      answer =
        typeof vetted === 'string' ? { status: 2, output: vetted } : await look(vetted.args, vetted.url, vetted.query);
    } catch (e) {
      answer = { status: 2, output: String(e) };
    }
    fs.writeFileSync(`${done}.tmp`, JSON.stringify(answer));
    fs.renameSync(`${done}.tmp`, done);
  }
  await new Promise((r) => setTimeout(r, 300));
}

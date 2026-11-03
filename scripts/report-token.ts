// The token that reads what players sent (GET /reports, GET /playdata): REPORT_TOKEN from the environment, else a
// `REPORT_TOKEN=...` line in `.env.local` at the repo root (gitignored), or at the main checkout's root when this is a
// worktree. It is the Fly secret of the same name; send it only as the Authorization header and never print it.
// Null when there is none.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function mainCheckout(): string | null {
  try {
    const common = execFileSync('git', ['rev-parse', '--path-format=absolute', '--git-common-dir'], {
      cwd: ROOT,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
    return path.dirname(common);
  } catch {
    return null;
  }
}

export function reportToken(): string | null {
  if (process.env.REPORT_TOKEN) return process.env.REPORT_TOKEN;
  for (const dir of [ROOT, mainCheckout()]) {
    if (!dir) continue;
    try {
      const line = fs
        .readFileSync(path.join(dir, '.env.local'), 'utf8')
        .split('\n')
        .find((l) => l.startsWith('REPORT_TOKEN='));
      if (line)
        return line
          .slice('REPORT_TOKEN='.length)
          .trim()
          .replace(/^['"]|['"]$/g, '');
    } catch {
      // no file here
    }
  }
  return null;
}

// Docs or code: which gate a change needs (owner call "Fast ships", 10 November). A docs-only change gets the fast
// docs checks (registry, agent model frontmatter) and skips lint, typecheck, unit tests, build, server and net; anything
// else is code and gets everything. The list is an allowlist, so an unknown path is code.
//
// CLI, for CI, the local ship gate and automerge's overlap check. Paths come on stdin, NUL- or newline-separated:
//   node dev/ci/change-class.ts          prints `docs` or `code` (an empty list is code: run everything)
//   node dev/ci/change-class.ts --code   prints only the code paths, one per line
// Feed it both sides of a rename (git diff --no-renames): a file moving out of docs is a code change.
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

// Code bundles or tests read these directories, whatever the extension: atlas/main.ts bundles docs/atlas/ (its
// changes.md included), the greybox and sickle backdrop import docs/world/map-prototypes.html, and tests read both.
// test/ fixtures and public/ (copied into the site as is) are never prose. .github/ is CI itself.
const READ_BY_CODE = /^(?:docs\/(?:atlas|world)|test|server\/test|public|\.github)\//;
const IMAGE = /^docs\/.+\.(?:png|jpe?g|gif|webp|svg)$/;

/** True for a path no build, bundle or test reads apart from the docs checks. test/change-class.test.ts keeps it so. */
export function isDocs(file: string): boolean {
  const f = file.replace(/^\.\//, '');
  if (!f || f.startsWith('/') || f.split('/').includes('..') || READ_BY_CODE.test(f)) return false;
  return f.endsWith('.md') || IMAGE.test(f);
}

export function changeClass(files: readonly string[]): 'docs' | 'code' {
  return files.length > 0 && files.every(isDocs) ? 'docs' : 'code';
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const files = fs
    .readFileSync(0, 'utf8')
    .split(/[\0\n]/)
    .map((f) => f.trim())
    .filter(Boolean);
  if (process.argv.includes('--code')) {
    for (const f of files) if (!isDocs(f)) console.log(f);
  } else console.log(changeClass(files));
}

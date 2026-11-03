// Launch context is a byte budget, not a line-count budget. Keep detailed rules on demand.
import fs from 'node:fs';
import path from 'node:path';

const BUDGETS = { 'AGENTS.md': 3000, 'CLAUDE.md': 1000 };
const remedy = 'Budgets: AGENTS.md 3,000 bytes; CLAUDE.md 1,000 bytes. Move detail into docs/agents/.';

// Imports inside code examples do not load Claude memory. Markdown links are ordinary pointers.
function imports(text: string): string[] {
  const prose = text.replace(/^(`{3,}|~{3,})[^\n]*\n[\s\S]*?^\1\s*$/gm, '').replace(/`+[^`\n]*`+/g, '');
  return [...prose.matchAll(/(?:^|[\s([{])@([^\s<>"'`)\]}]+)/g)].map((m) => m[1]!.replace(/[.,;:!?]+$/, ''));
}

// Deliberately accept a small auditable frontmatter shape: paths: followed by quoted YAML list entries.
// Reject empty/universal scopes: these would recreate a launch-loaded rule even without an @import.
function scoped(text: string): boolean {
  const front = text.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/)?.[1];
  if (!front) return false;
  const block = front.match(/^paths:\s*\r?\n((?:[ \t]+-[^\n]*(?:\n|$))+)/m)?.[1];
  if (!block) return false;
  const globs = block
    .trim()
    .split('\n')
    .map((line) => line.trim().match(/^-\s+["']([^"']+)["']\s*$/)?.[1]);
  return globs.length > 0 && globs.every((glob) => !!glob && /^[\w.-]+\//.test(glob) && !glob.includes('..'));
}

export function checkAgentDocs(root: string): { errors: string[]; elapsedMs: number } {
  const started = performance.now();
  const errors: string[] = [];
  const fail = (message: string) => errors.push(`${message} ${remedy}`);
  for (const [file, budget] of Object.entries(BUDGETS)) {
    const full = path.join(root, file);
    if (!fs.existsSync(full)) {
      fail(`${file} is missing.`);
      continue;
    }
    const content = fs.readFileSync(full);
    if (content.byteLength > budget) fail(`${file} is ${content.byteLength} bytes, over its ${budget}-byte budget.`);
    for (const target of imports(content.toString('utf8'))) {
      if (file !== 'CLAUDE.md' || target !== 'AGENTS.md')
        fail(`${file} imports @${target} at launch; only CLAUDE.md importing @AGENTS.md is allowed.`);
    }
  }
  // These alternate root memories would bypass the measured launch files.
  for (const file of ['.claude/CLAUDE.md', 'CLAUDE.local.md', 'AGENTS.override.md']) {
    if (fs.existsSync(path.join(root, file)) && fs.statSync(path.join(root, file)).size)
      fail(`${file} adds unbudgeted launch instructions; use the measured root files and scoped pointers.`);
  }
  const rules = path.join(root, '.claude/rules');
  const visit = (dir: string) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) visit(full);
      else if (entry.isSymbolicLink())
        fail(`${path.relative(root, full)} is a rule symlink; keep path scope auditable in this tree.`);
      else if (entry.name.endsWith('.md')) {
        const text = fs.readFileSync(full, 'utf8');
        if (!scoped(text)) {
          const extra = imports(text)
            .map((s) => `@${s}`)
            .join(', ');
          fail(
            `${path.relative(root, full)} needs paths frontmatter with quoted, directory-scoped list entries${extra ? `; launch imports: ${extra}` : ''}.`,
          );
        }
      }
    }
  };
  if (fs.existsSync(rules)) {
    if (fs.lstatSync(rules).isSymbolicLink())
      fail('.claude/rules is a symlink; keep path scope auditable in this tree.');
    else visit(rules);
  }
  return { errors, elapsedMs: Number((performance.now() - started).toFixed(2)) };
}

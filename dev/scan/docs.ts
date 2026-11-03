// Document authority for map search. Status describes guidance, not whether proposed code shipped.
// Historical text stays intact; show its current replacement beside every search hit.
import fs from 'node:fs';
import path from 'node:path';

type Authority = { status: 'current' | 'historical' | 'parked'; next: string; why: string };
const decisions = 'docs/proposals/boogle-2.md';
const work = 'docs/plans/find-the-fun.md';
const built = 'docs/game-design.md';

export function docAuthority(file: string, text: string): Authority {
  const f = file.replaceAll('\\', '/').replace(/^\.\//, '');
  const header = text.split('\n').slice(0, 12).join('\n');
  if (f === 'docs/ideas.md') return { status: 'parked', next: decisions, why: 'ideas are not tasks' };
  if (['PLAN.md', 'SETTLED.md'].includes(f) || f.startsWith('docs/plans/done/'))
    return { status: 'historical', next: work, why: 'superseded plan or record' };
  if (f.startsWith('docs/proposals/') && ![decisions, 'docs/proposals/README.md'].includes(f))
    return {
      status: /parked/i.test(header) ? 'parked' : 'historical',
      next: decisions,
      why: 'proposal is not binding',
    };
  if (f.startsWith('docs/research/') && f !== 'docs/research/README.md')
    return { status: 'historical', next: decisions, why: 'dated evidence; reverify against owning code' };
  if (f.startsWith('docs/plans/') && f !== work) {
    if (/Status:.*(?:complete|done|superseded|archived)/i.test(header))
      return { status: 'historical', next: built, why: 'completed or superseded plan' };
    if (/Status:.*(?:active|in progress|approved)/i.test(header))
      return { status: 'current', next: built, why: 'active plan; as-built state is separate' };
    return { status: 'parked', next: work, why: 'no explicit active status; consult current work before implementing' };
  }
  return {
    status: 'current',
    next: f.startsWith('src/') ? 'AGENTS.md' : built,
    why: 'maintained guidance; verify assertions in code',
  };
}

export function docLabel(file: string, text: string): string {
  const a = docAuthority(file, text);
  return `[${a.status}] ${file} → ${a.next} (${a.why})`;
}

/** Literal, case-insensitive search of repository Markdown; no dependency or generated trees. */
export function searchDocs(root: string, query: string): string[] {
  const out: string[] = [];
  const skip = new Set(['node_modules', '.git', '.look', 'dist', '.boogle-data']);
  const walk = (dir: string) => {
    for (const e of fs
      .readdirSync(path.join(root, dir), { withFileTypes: true })
      .sort((a, b) => a.name.localeCompare(b.name))) {
      const f = path.join(dir, e.name);
      if (e.isDirectory() && !skip.has(e.name)) walk(f);
      else if (e.isFile() && e.name.endsWith('.md')) {
        const text = fs.readFileSync(path.join(root, f), 'utf8');
        const hits = text
          .split('\n')
          .flatMap((line, i) =>
            line.toLowerCase().includes(query.toLowerCase()) ? [`  ${i + 1}: ${line.trim()}`] : [],
          );
        if (hits.length) out.push(docLabel(f, text), ...hits);
      }
    }
  };
  walk('');
  return out;
}

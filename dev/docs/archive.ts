// Move a reviewed list and repair repository links: npm run docs-archive -- <list-file>
// One repo-relative docs/plans/ or docs/proposals/ file per line; blank lines and # comments are ignored.
// Run from the repo root on a clean tree. Safe to repeat after the moves, or on a fresh main.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const git = (...args: string[]) => execFileSync('git', args, { encoding: 'utf8', maxBuffer: 32 << 20 });
const root = git('rev-parse', '--show-toplevel').trim();
process.chdir(root);
const list = process.argv[2];
if (!list || process.argv.length !== 3) throw new Error('Usage: npm run docs-archive -- <list-file>');
const moves = new Map<string, string>();
for (const line of fs.readFileSync(list, 'utf8').split(/\r?\n/)) {
  const source = line.trim();
  if (!source || source.startsWith('#')) continue;
  if (!/^docs\/(plans|proposals)\/.+/.test(source) || path.posix.normalize(source) !== source)
    throw new Error(`Expected a normalized docs/plans/ or docs/proposals/ path: ${source}`);
  moves.set(source, source.replace(/^docs\//, 'docs/archive/'));
}
if (!moves.size) throw new Error('Empty archive list');
const tracked = new Set(git('ls-files', '-z').split('\0').filter(Boolean));
const pending = new Map<string, string>();
// Validate the whole list before moving anything. A destination alone means an earlier run moved it.
for (const [source, dest] of moves) {
  if (fs.existsSync(source)) {
    if (!tracked.has(source) || !fs.lstatSync(source).isFile() || fs.existsSync(dest))
      throw new Error(`Untracked, non-file source or occupied destination: ${source} -> ${dest}`);
    pending.set(source, dest);
  } else if (!tracked.has(dest) || !fs.existsSync(dest)) throw new Error(`Neither source nor archive: ${source}`);
}

const issues = new Set<string>();
let links = 0;
function rewrite(url: string, before: string, after: string, repoPath = false): string {
  // Preserve immutable commit URLs and external links. main/HEAD links into this repo can follow moves.
  const github = url.match(/^(https:\/\/github\.com\/matiasfr\/boogle\/blob\/(?:main|HEAD)\/)(.*)$/);
  const local = github?.[2] ?? url;
  if (!github && /^(?:[a-z][\w+.-]*:|\/\/)/i.test(local)) return url;
  const split = local.search(/[?#]/);
  const pathname = split < 0 ? local : local.slice(0, split);
  const suffix = split < 0 ? '' : local.slice(split);
  if (!pathname) return url; // a moved file's own anchor stays local
  let decoded: string;
  try {
    decoded = decodeURIComponent(pathname.replace(/\\([ ()])/g, '$1'));
  } catch {
    issues.add(`${after}: invalid URL encoding: ${url}`);
    return url;
  }
  const rooted = repoPath || !!github || decoded.startsWith('/');
  const target = path.posix.normalize(
    rooted ? decoded.replace(/^\//, '') : path.posix.join(path.posix.dirname(before), decoded),
  );
  const next = moves.get(target) ?? target;
  if (target === next && before === after) return url;
  if (!fs.existsSync(target) && !fs.existsSync(next)) issues.add(`${after}: missing local target: ${url} -> ${next}`);
  let relative = rooted ? next : path.posix.relative(path.posix.dirname(after), next);
  if (decoded.startsWith('./') && !relative.startsWith('.')) relative = `./${relative}`;
  if (decoded.startsWith('/') && !repoPath) relative = `/${relative}`;
  const encoded = relative.split('/').map(encodeURIComponent).join('/');
  const result = `${github?.[1] ?? ''}${encoded}${suffix}`;
  if (result !== url) links++;
  return result;
}

// Work out edits before git mv, so links from moved files resolve against their original directory.
const edits = new Map<string, string>();
for (const before of tracked) {
  if (!fs.existsSync(before) || !fs.lstatSync(before).isFile()) continue;
  const bytes = fs.readFileSync(before);
  if (bytes.includes(0) || !bytes.equals(Buffer.from(bytes.toString('utf8')))) continue;
  const after = pending.get(before) ?? before;
  const original = bytes.toString('utf8');
  function edit(text: string): string {
    // Inline links and images, with angle destinations, escaped spaces and balanced path parentheses.
    text = text.replace(
      /(\]\(\s*)(<[^>\n]+>|(?:\\.|[^\s()\\]|\((?:\\.|[^()\\])*\))+)/g,
      (_, prefix: string, dest: string) => {
        const angled = dest.startsWith('<');
        const url = angled ? dest.slice(1, -1) : dest;
        const next = rewrite(url, before, after);
        return prefix + (angled ? `<${next}>` : next);
      },
    );
    // Reference definitions (including image references), with optional titles left untouched.
    text = text.replace(
      /^(\s{0,3}\[[^\]\n]+\]:\s*)(<[^>\n]+>|\S+)/gm,
      (_, prefix: string, dest: string) =>
        prefix +
        (dest.startsWith('<') ? `<${rewrite(dest.slice(1, -1), before, after)}>` : rewrite(dest, before, after)),
    );
    // HTML links/images, also in generator templates. Do not interpret dynamic templates as file paths.
    text = text.replace(
      /((?:href|src)\s*=\s*)(["'])([^"'\n]+)\2/g,
      (all: string, prefix: string, quote: string, url: string) =>
        url.includes('${') ? all : prefix + quote + rewrite(url, before, after) + quote,
    );
    // Only machine-readable path data: inline code in Markdown is historical prose, not a link.
    if (!before.endsWith('.md'))
      text = text.replace(
        /(["'`])(docs\/(?:plans|proposals)\/[^"'`\n]+)\1/g,
        (all: string, quote: string, url: string) =>
          moves.has(url.split(/[?#]/)[0]!) ? quote + rewrite(url, before, after, true) + quote : all,
      );
    return text;
  }
  let text = '';
  let cursor = 0;
  // Fenced Markdown examples are not rendered links; preserve their source code verbatim.
  if (before.endsWith('.md')) {
    for (const m of original.matchAll(/^ {0,3}(`{3,}|~{3,})[^\n]*\n[\s\S]*?^ {0,3}\1[ \t]*(?:\n|$)/gm)) {
      text += edit(original.slice(cursor, m.index)) + m[0];
      cursor = m.index + m[0].length;
    }
  }
  text += edit(original.slice(cursor));
  if (text !== original) edits.set(after, text);
}
for (const [source, dest] of pending) {
  fs.mkdirSync(path.posix.dirname(dest), { recursive: true });
  git('mv', '--', source, dest);
}
for (const [file, text] of edits) fs.writeFileSync(file, text);

// Bare prose/code references aren't necessarily links. Surface them for a human, never guess their base.
for (const file of git('ls-files', '-z').split('\0').filter(Boolean)) {
  if (!fs.existsSync(file) || !fs.lstatSync(file).isFile()) continue;
  const bytes = fs.readFileSync(file);
  if (bytes.includes(0)) continue;
  for (const [i, line] of bytes.toString('utf8').split('\n').entries()) {
    for (const source of moves.keys()) {
      if (line.includes(source) && file !== list)
        issues.add(`${file}:${i + 1}: remaining literal (review; may be a label or historical reference): ${source}`);
    }
  }
}
console.log(
  `docs-archive: ${pending.size} moved, ${moves.size - pending.size} already archived, ${links} links rewritten in ${edits.size} files`,
);
console.log(`Unrewritten references (${issues.size}):`);
for (const issue of [...issues].sort()) console.log(issue);

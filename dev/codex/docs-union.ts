// Resolves a docs-only rebase conflict for ship-branch.sh, from diff3 markers (main, base, the replayed commit).
// Keeps main's lines plus the lines the commit added; a line the commit only carried over from the base is dropped
// when main removed it. A plain union resurrected a merged job's claim row and kept two copies of two backlog rows
// (25 November, #2397 against #2396). A table row both sides edited (same first two cells) is not guessed at:
// exit 5, and the session redoes its edit on fresh main. Exit 1: markers it could not read are left in the file.
import { readFileSync, writeFileSync } from 'node:fs';

const path = process.argv[2];
if (!path) throw new Error('usage: node dev/codex/docs-union.ts <file>');
const hunk = /<<<<<<< [^\n]*\n([\s\S]*?)\|\|\|\|\|\|\| [^\n]*\n([\s\S]*?)=======\n([\s\S]*?)>>>>>>> [^\n]*\n/g;
const lines = (s: string) => s.split('\n').slice(0, -1);
const rowKey = (line: string) => {
  const cells = line.split('|').slice(1, 3).map((c) => c.trim());
  return line.startsWith('|') && cells.length === 2 ? cells.join(' | ') : null;
};
const clashes: string[] = [];
const text = readFileSync(path, 'utf8');
// A Windows checkout with core.autocrlf writes the conflicted file with CRLF; match and write back in kind.
const crlf = text.includes('\r\n');
const merged = text.replace(/\r\n/g, '\n').replace(hunk, (_all, main: string, base: string, commit: string) => {
  const kept = lines(main);
  const baseLines = new Set(lines(base));
  for (const line of lines(commit)) if (!baseLines.has(line) && !kept.includes(line)) kept.push(line);
  const seen = new Set<string>();
  for (const line of kept) {
    const key = rowKey(line);
    if (key && seen.has(key)) clashes.push(key);
    if (key) seen.add(key);
  }
  return kept.map((l) => `${l}\n`).join('');
});
if (clashes.length > 0) {
  console.log(`SAME ROW EDITED on both sides in ${path}: ${clashes.map((k) => k.slice(0, 80)).join('; ')}`);
  process.exit(5);
}
writeFileSync(path, crlf ? merged.replace(/\n/g, '\r\n') : merged);
if (/^(<<<<<<< |\|\|\|\|\|\|\| |=======$|>>>>>>> )/m.test(merged)) process.exit(1);

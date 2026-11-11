// npm run decisions: the decision log's no-loss and shape check (also run by npm run registry, so by check and CI).
// (1) Every non-blank line and every quotation of the old single-file docs/decisions.md and docs/agent-calls.md
// (hashed in dev/decisions/manifest.json by split.ts) is still somewhere in the new files, byte for byte (an entry's
// added anchor aside). (2) Nothing is added to a retired location: no entry in docs/decisions.md, no ruled call left in
// the live table. (3) Every entry in a topic file has a Current rules line and every rules line its entry. (4) Every
// link to these files' headings or anchors, anywhere in the repo's Markdown, resolves. Prints the numbers.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { anchorOf, cells, chars, hash, isOpenStatus, quotes, unanchored } from './log.ts';
import type { Manifest } from './log.ts';
import { ARCHIVE_FILE, CALLS_FILE, MANIFEST_FILE, OPEN_FILE, ROUTING_FILE, TOPICS } from './topics.ts';

const ENTRY = /^- (?:<a id="[^"]+"><\/a>)?\*\*/;
const ROW = /^\| \d{4}-/;

export const LOG_FILES = [ROUTING_FILE, ...TOPICS.map((t) => t.file), OPEN_FILE, ARCHIVE_FILE, CALLS_FILE];

function anchorsOf(text: string): Set<string> {
  const out = new Set<string>();
  let fence = false;
  for (const line of text.split('\n')) {
    if (/^\s*(```|~~~)/.test(line)) fence = !fence;
    if (fence) continue;
    const h = /^#{1,6} (.+?)(?: +#+)?$/.exec(line);
    if (h) out.add(anchorOf(h[1]!));
    for (const m of line.matchAll(/<a id="([^"]+)"><\/a>/g)) out.add(m[1]!);
  }
  return out;
}

function markdownFiles(root: string): string[] {
  try {
    return execFileSync('git', ['ls-files', '-co', '--exclude-standard', '--', '*.md'], {
      cwd: root,
      maxBuffer: 1 << 26,
    })
      .toString()
      .split('\n')
      .filter((f) => f && !f.startsWith('.claude/worktrees/') && fs.existsSync(path.join(root, f)));
  } catch {
    return LOG_FILES;
  }
}

export function checkDecisions(root: string): { errors: string[]; notes: string[] } {
  const errors: string[] = [];
  const notes: string[] = [];
  const read = (f: string) => (fs.existsSync(path.join(root, f)) ? fs.readFileSync(path.join(root, f), 'utf8') : null);
  const texts = new Map<string, string>();
  for (const f of LOG_FILES) {
    const t = read(f);
    if (t === null) errors.push(`${f} is missing (decision log file)`);
    else texts.set(f, t);
  }
  const manifestText = read(MANIFEST_FILE);
  if (!manifestText)
    return { errors: [...errors, `${MANIFEST_FILE} is missing: run node dev/decisions/split.ts`], notes };
  const manifest = JSON.parse(manifestText) as Manifest;

  // (1) No loss.
  const lineSet = new Set<string>();
  const quoteSet = new Set<string>();
  for (const t of texts.values()) {
    for (const line of t.split('\n')) if (line.trim()) lineSet.add(hash(unanchored(line)));
    for (const q of quotes(t.replace(/<a id="[^"]+"><\/a>/g, ''))) quoteSet.add(hash(q));
  }
  const lost = manifest.lines.filter((h) => !lineSet.has(h)).length;
  const lostQuotes = manifest.quotes.filter((h) => !quoteSet.has(h)).length;
  if (lost)
    errors.push(
      `${lost} line(s) of the old decision log or calls table are no longer anywhere in the new files, word for word (git show ${manifest.source.split(' ')[0]}:${ROUTING_FILE} has the originals)`,
    );
  if (lostQuotes)
    errors.push(`${lostQuotes} quotation(s) of the old decision log or calls table are no longer in the new files`);
  const all = [...texts.values()].join('\n');
  const entriesAfter = all.split('\n').filter((l) => ENTRY.test(l)).length;
  const rowsAfter = [texts.get(CALLS_FILE), texts.get(ARCHIVE_FILE)]
    .join('\n')
    .split('\n')
    .filter((l) => ROW.test(l)).length;
  if (entriesAfter < manifest.entries)
    errors.push(`entries: ${manifest.entries} before the split, ${entriesAfter} now`);
  if (rowsAfter < manifest.rows) errors.push(`call rows: ${manifest.rows} before the split, ${rowsAfter} now`);
  notes.push(
    `no loss: ${manifest.lines.length - lost}/${manifest.lines.length} lines and ${manifest.quotes.length - lostQuotes}/${manifest.quotes.length} quotations of the old files found; entries ${manifest.entries} before, ${entriesAfter} now; call rows ${manifest.rows} before, ${rowsAfter} now (source ${manifest.source})`,
  );
  const before = Object.entries(manifest.files)
    .map(([f, s]) => `${f} ${s.characters.toLocaleString('en')}`)
    .join(', ');
  const after = [...texts].map(([f, t]) => `${f.replace(/^docs\//, '')} ${chars(t).toLocaleString('en')}`).join(', ');
  notes.push(`characters before: ${before}`);
  notes.push(`characters now: ${after}`);

  // (2) Retired locations.
  const routing = texts.get(ROUTING_FILE) ?? '';
  routing.split('\n').forEach((l, i) => {
    if (ENTRY.test(l) || ROW.test(l) || /^## Current-decision index$/.test(l))
      errors.push(
        `${ROUTING_FILE}:${i + 1}: a decision entry in the routing table; add it to its topic file instead (docs/decisions.md, "Recording a decision")`,
      );
  });
  (texts.get(CALLS_FILE) ?? '').split('\n').forEach((l, i) => {
    if (!ROW.test(l)) return;
    const c = cells(l);
    if (c.length < 6) errors.push(`${CALLS_FILE}:${i + 1}: a call row without six cells`);
    else if (!isOpenStatus(c.at(-1)!))
      errors.push(
        `${CALLS_FILE}:${i + 1}: a ruled call (${c.at(-1)!.split(' ')[0]}) in the live table; move the row to its topic's section of ${ARCHIVE_FILE}`,
      );
  });

  // (3) Current rules and entries agree in each topic file.
  for (const t of TOPICS) {
    const text = texts.get(t.file);
    if (!text) continue;
    const lines = text.split('\n');
    const rulesAt = lines.indexOf('## Current rules');
    const decidedAt = lines.indexOf('## Decided');
    if (rulesAt < 0 || decidedAt < rulesAt) {
      errors.push(`${t.file}: needs "## Current rules" followed by "## Decided"`);
      continue;
    }
    const links = new Set(
      lines.slice(rulesAt, decidedAt).flatMap((l) => [...l.matchAll(/\]\(#([^)]+)\)/g)].map((m) => m[1]!)),
    );
    const ids = new Set<string>();
    lines.slice(decidedAt).forEach((l, i) => {
      if (/^- \*\*/.test(l))
        errors.push(`${t.file}:${decidedAt + i + 1}: an entry without its <a id> anchor and Current rules line`);
      const id = /^- <a id="([^"]+)"><\/a>/.exec(l)?.[1];
      if (!id) return;
      if (ids.has(id)) errors.push(`${t.file}: anchor ${id} is used twice`);
      ids.add(id);
      if (!links.has(id)) errors.push(`${t.file}: entry #${id} has no line in Current rules`);
    });
    for (const id of links)
      if (!ids.has(id)) errors.push(`${t.file}: Current rules links #${id}, which is no entry here`);
  }

  // (4) Links into the log resolve, from any Markdown in the repo.
  const anchorCache = new Map<string, Set<string> | null>();
  const anchorsAt = (f: string) => {
    if (!anchorCache.has(f)) {
      const t = texts.get(f) ?? read(f);
      anchorCache.set(f, t === null ? null : anchorsOf(t));
    }
    return anchorCache.get(f)!;
  };
  const logNames = new Set(LOG_FILES.map((f) => path.basename(f)));
  let checked = 0;
  for (const file of markdownFiles(root)) {
    const text = texts.get(file) ?? read(file);
    if (!text) continue;
    const archive = file === ARCHIVE_FILE; // The retired index's own links point at the old file's sections.
    for (const m of text.matchAll(/\]\(([^)\s]*?)#([^)\s]+)\)/g)) {
      const target = m[1]!;
      const isLog = target ? logNames.has(path.basename(target)) : LOG_FILES.includes(file) && !archive;
      if (!isLog) continue;
      const resolved = target ? path.normalize(path.join(path.dirname(file), target)) : file;
      const anchors = anchorsAt(resolved);
      checked++;
      if (!anchors) errors.push(`${file}: link to ${target}#${m[2]} names a missing file`);
      else if (!anchors.has(decodeURIComponent(m[2]!)))
        errors.push(`${file}: link to ${target || file}#${m[2]} names no heading or anchor there`);
    }
  }
  notes.push(`links into the log: ${checked} checked`);
  return { errors, notes };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
  const { errors, notes } = checkDecisions(root);
  for (const n of notes) console.log(`decisions: ${n}`);
  if (errors.length) {
    console.error(`\ndecisions: ${errors.length} problem(s):`);
    for (const e of errors) console.error(`  - ${e}`);
    process.exit(1);
  }
  console.log('decisions: ok');
}

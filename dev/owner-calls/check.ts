// npm run owner-calls [-- --no-loss <git-ref>]: anchors, index, repo links and the 6,000-character index budget.
// --no-loss compares complete call text (only the entry's anchor markup excluded), including paragraph calls,
// against both files at the ref. Archive notes and topic headings are not part of a call. Node built-ins only.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { anchor, readSection } from '../scan/sections.ts';

const LIVE = 'docs/agents/owner-calls.md';
const ARCHIVE = 'docs/agents/owner-calls-archive.md';
const INDEX_BUDGET = 6000;
const CALL = /^(?:- (?:<a id="[^"]+"><\/a>)?\*\*|(?:<a id="[^"]+"><\/a>)?\*\*.+?\*\* \(owner,)/;
const ID = /^(?:- )?<a id="([^"]+)"><\/a>/;
const chars = (s: string) => [...s].length;
type Call = { id?: string; title: string; text: string };

function calls(text: string): Call[] {
  const out: Call[] = [];
  let current: string[] | null = null;
  const finish = () => {
    if (!current) return;
    const text = current.join('\n').replace(/\n+$/, '');
    out.push({ id: ID.exec(text)?.[1], title: /\*\*(.+?)\*\*/.exec(text)![1]!, text });
    current = null;
  };
  for (const line of text.split('\n')) {
    if (CALL.test(line)) {
      finish();
      current = [line];
    } else if (/^#{1,6} |^_Archived /.test(line)) finish();
    else current?.push(line);
  }
  finish();
  return out;
}

function anchors(text: string): Set<string> {
  const out = new Set<string>();
  for (const line of text.split('\n')) {
    const heading = /^#{1,6} (.+)$/.exec(line)?.[1];
    if (heading) out.add(anchor(heading));
    for (const m of line.matchAll(/<a id="([^"]+)"><\/a>/g)) out.add(m[1]!);
  }
  return out;
}

function git(root: string, args: string[]): string {
  return execFileSync('git', args, { cwd: root, encoding: 'utf8', maxBuffer: 1 << 27, stdio: 'pipe' });
}

export function checkOwnerCalls(root: string, noLossRef?: string): { errors: string[]; notes: string[] } {
  const errors: string[] = [];
  const notes: string[] = [];
  const texts = new Map<string, string>();
  for (const file of [LIVE, ARCHIVE]) {
    const absolute = path.join(root, file);
    if (!fs.existsSync(absolute)) errors.push(`${file} is missing`);
    else texts.set(file, fs.readFileSync(absolute, 'utf8'));
  }
  if (errors.length) return { errors, notes };
  const live = texts.get(LIVE)!;
  const archived = calls(texts.get(ARCHIVE)!);
  const active = calls(live);
  const all = [...active, ...archived];
  const byId = new Map<string, Call>();
  for (const call of all) {
    if (!call.id) errors.push(`call has no anchor: ${call.title}`);
    else if (byId.has(call.id)) errors.push(`duplicate call anchor #${call.id}`);
    else byId.set(call.id, call);
  }
  // Every explicit anchor is unique within its file; archived compatibility pointers live in the index.
  for (const [file, text] of texts) {
    const seen = new Set<string>();
    for (const m of text.matchAll(/<a id="([^"]+)"><\/a>/g)) {
      if (seen.has(m[1]!)) errors.push(`${file}: duplicate anchor #${m[1]}`);
      seen.add(m[1]!);
    }
  }
  let index = '';
  try {
    index = readSection(root, `${LIVE}#index`).text;
  } catch (error) {
    errors.push(String(error));
  }
  const indexed = new Set<string>();
  for (const line of index.split('\n').filter((l) => l.startsWith('- '))) {
    const link = /^- (?:<a id="([^"]+)"><\/a>)?\[([^\]]+)\]\(([^)]+)\) · (?:[\d–]+ Nov \d{4}|undated)$/.exec(line);
    if (!link) {
      errors.push(`malformed index line (one dated link per call): ${line}`);
      continue;
    }
    const target = link[3]!;
    const id = link[1] ?? (target.startsWith('#') ? target.slice(1) : undefined);
    if (!id || !byId.has(id)) errors.push(`index line has no matching call: ${line}`);
    else {
      if (indexed.has(id)) errors.push(`duplicate index line for #${id}`);
      indexed.add(id);
      const isArchived = archived.some((c) => c.id === id);
      if (isArchived !== Boolean(link[1]))
        errors.push(`#${id}: archived calls need an anchored forwarding line; live calls need a local call link`);
      if (isArchived && !texts.get(ARCHIVE)!.includes(`${byId.get(id)!.text}\n\n_Archived `))
        errors.push(`#${id}: archived call needs an archive note`);
    }
    // Check the actual target, including a game-rule pointer into a decisions topic.
    const [file, fragment] = target.split('#');
    const resolved = file ? path.normalize(path.join(path.dirname(LIVE), file)) : LIVE;
    const absolute = path.join(root, resolved);
    if (!fragment || !fs.existsSync(absolute)) errors.push(`index target missing: ${target}`);
    else if (!anchors(texts.get(resolved) ?? fs.readFileSync(absolute, 'utf8')).has(fragment))
      errors.push(`index target has no anchor: ${target}`);
  }
  for (const [id, call] of byId) if (!indexed.has(id)) errors.push(`call has no index line: #${id} ${call.title}`);
  if (chars(index) > INDEX_BUDGET) errors.push(`index ${chars(index)} characters exceeds ${INDEX_BUDGET}`);
  notes.push(
    `${indexed.size} indexed calls: ${active.length} live, ${archived.length} archived; index ${chars(index)}/${INDEX_BUDGET} characters`,
  );

  // All tracked and unignored repo files, including code, HTML, dotfiles and newly added docs; no binary contents.
  const liveAnchors = anchors(live);
  const files = new Set(git(root, ['ls-files', '-co', '--exclude-standard', '-z']).split('\0').filter(Boolean));
  let checked = 0;
  for (const file of files) {
    const absolute = path.join(root, file);
    if (!fs.existsSync(absolute) || !fs.statSync(absolute).isFile()) continue;
    const buffer = fs.readFileSync(absolute);
    if (buffer.includes(0)) continue;
    for (const m of buffer.toString('utf8').matchAll(/\bowner-calls\.md#([^\s"'<>()[\]{}`\\]+)/g)) {
      checked++;
      let fragment = m[1]!;
      try {
        fragment = decodeURIComponent(fragment);
      } catch {
        errors.push(`${file}: invalid encoded owner-calls anchor #${fragment}`);
      }
      if (!liveAnchors.has(fragment)) errors.push(`${file}: ${LIVE}#${fragment} does not resolve`);
    }
  }
  notes.push(`links into owner-calls.md: ${checked} checked across ${files.size} repo files`);

  if (noLossRef) {
    // No whitespace normalization, line hashing or quote extraction: each entire call must still match exactly.
    const canonical = (c: Call) =>
      c.text.replace(/^(?:- )?<a id="[^"]+"><\/a>/, (m) => (m.startsWith('- ') ? '- ' : ''));
    const remaining = all.map(canonical);
    const oldFiles = git(root, ['ls-tree', '--name-only', noLossRef, '--', LIVE, ARCHIVE]).trim().split('\n');
    if (!oldFiles.includes(LIVE)) errors.push(`${noLossRef}: ${LIVE} is missing; cannot prove no loss`);
    let found = 0;
    let total = 0;
    let preservedChars = 0;
    for (const file of oldFiles.filter(Boolean)) {
      for (const call of calls(git(root, ['show', `${noLossRef}:${file}`]))) {
        total++;
        const original = canonical(call);
        const at = remaining.indexOf(original);
        if (at < 0) errors.push(`no loss: ${noLossRef}: missing or changed call: ${call.title}`);
        else {
          remaining.splice(at, 1);
          found++;
          preservedChars += chars(original);
        }
      }
    }
    if (!total) errors.push(`${noLossRef}: no calls found; cannot prove no loss`);
    notes.push(
      `no loss vs ${noLossRef}: ${found}/${total} complete calls preserved character for character (${preservedChars} characters; only entry anchor markup excluded)`,
    );
  }
  return { errors, notes };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  if (args.length && (args.length !== 2 || args[0] !== '--no-loss' || !args[1])) {
    console.error('usage: npm run owner-calls [-- --no-loss <git-ref>]');
    process.exit(1);
  }
  try {
    const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
    const { errors, notes } = checkOwnerCalls(root, args[1]);
    for (const note of notes) console.log(`owner-calls: ${note}`);
    if (errors.length) {
      for (const error of errors) console.error(`owner-calls: ${error}`);
      process.exit(1);
    }
    console.log('owner-calls: ok');
  } catch (error) {
    console.error(`owner-calls: ${String(error)}`);
    process.exit(1);
  }
}

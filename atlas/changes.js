// docs/atlas/changes.md: "# What changed", then one "## YYYY-MM-DD" section per update, newest first. PURE.
import { esc } from './model.js';

// -> [{ date, body }] in file order. Text before the first "## " heading is ignored.
export function parseChanges(md) {
  const out = [];
  let cur = null;
  for (const line of String(md ?? '').split('\n')) {
    const m = /^##\s+(\S+)\s*$/.exec(line);
    if (m) {
      cur = { date: m[1], body: '' };
      out.push(cur);
    } else if (cur) cur.body += line + '\n';
  }
  for (const e of out) e.body = e.body.trim();
  return out;
}

// The [text](#story|concept|view/id) links in a body, as [{ kind, id }]; the id is whatever sits between the slash and
// the closing bracket, so a broken one can be reported.
export const linksOf = (body) =>
  [...body.matchAll(/\]\(#(story|concept|view)\/([^)]*)\)/g)].map(([, kind, id]) => ({ kind, id }));

const INLINE = /`([^`]+)`|\[([^\]]+)\]\(#(story|concept|view)\/([a-z0-9-]+)\)/g;

// Escaped inline HTML: `code`, and [text](#story/id | #concept/id | #view/id) links. A link whose target is not in
// `known` renders as plain text. Everything else is escaped.
function inline(text, known) {
  let out = '';
  let last = 0;
  for (const m of text.matchAll(INLINE)) {
    out += esc(text.slice(last, m.index));
    last = m.index + m[0].length;
    if (m[1] !== undefined) out += `<code>${esc(m[1])}</code>`;
    else {
      const [, , label, kind, id] = m;
      const live =
        kind === 'story' ? known.stories?.has(id) : kind === 'concept' ? known.concepts?.has(id) : known.views?.has(id);
      out += live ? `<a href="#${kind}/${id}">${esc(label)}</a>` : esc(label);
    }
  }
  return out + esc(text.slice(last));
}

// entries -> escaped HTML. known = { stories: Set, concepts: Set, views?: Set }.
export function renderChanges(entries, known = {}) {
  return entries
    .map((e) => {
      const blocks = [];
      let para = [];
      let list = null;
      const flush = () => {
        if (para.length) blocks.push(`<p>${inline(para.join(' '), known)}</p>`);
        para = [];
      };
      const endList = () => {
        if (list) blocks.push(`<ul>${list.map((t) => `<li>${inline(t, known)}</li>`).join('')}</ul>`);
        list = null;
      };
      for (const line of e.body.split('\n')) {
        const li = /^\s*-\s+(.*)$/.exec(line);
        if (li) {
          flush();
          (list ||= []).push(li[1]);
        } else if (!line.trim()) {
          flush();
          endList();
        } else if (list && /^\s+/.test(line)) list[list.length - 1] += ' ' + line.trim();
        else {
          endList();
          para.push(line.trim());
        }
      }
      flush();
      endList();
      return `<section class="change"><h3>${esc(e.date)}</h3>${blocks.join('')}</section>`;
    })
    .join('');
}

// Deliberately small Markdown subset. Raw HTML is always text; only http(s) links become anchors.
const REPO = 'https://github.com/matiasfr/boogle/blob/main/';
const SOURCE = 'docs/agents/orchestrator-state.md';

export const escapeHtml = (text: string) =>
  text.replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!);

function link(target: string, source: string) {
  // Reject schemes other than http(s), protocol-relative URLs, controls and backslashes.
  if ([...target].some((char) => char.charCodeAt(0) <= 32 || char === '\\') || target.startsWith('//')) return null;
  if (/^[a-z][a-z\d+.-]*:/i.test(target)) return /^https?:\/\//i.test(target) ? target : null;
  // Explicit / paths and known repo directories are root-relative; other Markdown links are file-relative.
  const root = target.startsWith('/') || /^(docs|src|dev|server|test)\//.test(target);
  const url = new URL(target.replace(/^\//, ''), root ? REPO : REPO + source);
  return url.href.startsWith(REPO) ? url.href : null;
}

export function renderInline(text: string, source = SOURCE, depth = 0): string {
  if (depth > 8) return escapeHtml(text);
  const token = /`([^`]+)`|\*\*(.+?)\*\*|\[([^\]]+)\]\(([^\s)]+)\)/g;
  let out = '';
  let start = 0;
  for (const match of text.matchAll(token)) {
    out += escapeHtml(text.slice(start, match.index));
    if (match[1] !== undefined) out += `<code>${escapeHtml(match[1])}</code>`;
    else if (match[2] !== undefined) out += `<strong>${renderInline(match[2], source, depth + 1)}</strong>`;
    else {
      const href = link(match[4]!, source);
      const label = renderInline(match[3]!, source, depth + 1);
      out += href ? `<a href="${escapeHtml(href)}">${label}</a>` : label;
    }
    start = match.index + match[0].length;
  }
  return out + escapeHtml(text.slice(start));
}

const cells = (line: string) =>
  line
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map((cell) => cell.trim());
const separator = (line: string) => line.includes('|') && cells(line).every((cell) => /^:?-{3,}:?$/.test(cell));
const listItem = (line: string) => /^(\s*)([-+*]|\d+\.)\s+(.+)$/.exec(line);

export function renderMarkdown(markdown: string, headingOffset = 1) {
  const lines = markdown.replace(/\r\n?/g, '\n').split('\n');
  const out: string[] = [];
  for (let i = 0; i < lines.length;) {
    const line = lines[i]!;
    if (!line.trim()) {
      i++;
      continue;
    }
    const fence = /^\s*(`{3,}|~{3,})/.exec(line);
    if (fence) {
      const code: string[] = [];
      i++;
      while (i < lines.length && !lines[i]!.trim().startsWith(fence[1]!)) code.push(lines[i++]!);
      i++;
      out.push(`<pre><code>${escapeHtml(code.join('\n'))}</code></pre>`);
      continue;
    }
    const heading = /^(#{1,6})\s+(.+)$/.exec(line);
    if (heading) {
      // Nest the source's headings below the page's own heading(s).
      const level = Math.min(6, heading[1]!.length + headingOffset);
      out.push(`<h${level}>${renderInline(heading[2]!)}</h${level}>`);
      i++;
      continue;
    }
    if (line.includes('|') && separator(lines[i + 1] ?? '')) {
      const headers = cells(line);
      const row = (values: string[], tag: 'td' | 'th') =>
        '<tr>' +
        headers
          .map((_, n) => `<${tag}${tag === 'th' ? ' scope="col"' : ''}>${renderInline(values[n] ?? '')}</${tag}>`)
          .join('') +
        '</tr>';
      out.push(
        '<div class="table-scroll" role="region" aria-label="Status table" tabindex="0"><table><thead>' +
          row(headers, 'th') +
          '</thead><tbody>',
      );
      i += 2;
      while (i < lines.length && lines[i]!.includes('|') && lines[i]!.trim()) out.push(row(cells(lines[i++]!), 'td'));
      out.push('</tbody></table></div>');
      continue;
    }
    if (listItem(line)) {
      const stack: { indent: number; tag: string }[] = [];
      while (i < lines.length) {
        const item = listItem(lines[i]!);
        if (!item) break;
        const indent = item[1]!.length;
        const tag = /^\d/.test(item[2]!) ? 'ol' : 'ul';
        while (
          stack.length &&
          (indent < stack.at(-1)!.indent || (indent === stack.at(-1)!.indent && tag !== stack.at(-1)!.tag))
        )
          out.push(`</li></${stack.pop()!.tag}>`);
        if (!stack.length || indent > stack.at(-1)!.indent) {
          out.push(`<${tag}>`);
          stack.push({ indent, tag });
        } else out.push('</li>');
        out.push(`<li>${renderInline(item[3]!)}`);
        i++;
      }
      while (stack.length) out.push(`</li></${stack.pop()!.tag}>`);
      continue;
    }
    out.push(`<p>${renderInline(line)}</p>`);
    i++;
  }
  return out.join('\n');
}

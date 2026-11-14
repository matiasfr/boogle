import { renderInline } from './markdown.ts';

export const BACKLOG = 'docs/backlog.md';
const REPO = 'https://github.com/matiasfr/boogle/blob/main/';
const HEADERS = ['Rank', 'Effort', 'Status', 'Plan or source', 'Next step', 'Owner words'];
const RANKS = ['P1', 'P2', 'P3'] as const;
type Rank = (typeof RANKS)[number];
type Row = { rank: Rank; effort: string; status: string; source: string; nextStep: string };

function cells(line: string) {
  return line
    .trim()
    .replace(/^\|/, '')
    .replace(/(?<!\\)\|$/, '')
    .split(/(?<!\\)\|/)
    .map((cell) => cell.trim().replace(/\\\|/g, '|'));
}

export function parseBacklog(markdown: string) {
  const lines = markdown.replace(/\r\n?/g, '\n').split('\n');
  const fail = (line: number, reason: string): never => {
    throw new Error(`${BACKLOG}:${line + 1}: ${reason}`);
  };
  const start = lines.findIndex((line) => /^## Committed work\s*$/.test(line));
  if (start < 0) fail(0, 'Missing Committed work table (section not found)');
  let end = start + 1;
  while (end < lines.length && !/^#{1,2} /.test(lines[end]!)) end++;
  const header = lines.findIndex((line, i) => i > start && i < end && line.includes('|'));
  if (header < 0) fail(start, 'Missing Committed work table');
  const checkedCells = (i: number) => {
    const values = cells(lines[i] ?? '');
    if (values.length !== HEADERS.length)
      fail(i, `Committed work table needs ${HEADERS.length} columns; found ${values.length}`);
    return values;
  };
  if (checkedCells(header).some((cell, i) => cell !== HEADERS[i]))
    fail(header, `Committed work table headers must be: ${HEADERS.join(', ')}`);
  if (checkedCells(header + 1).some((cell) => !/^:?-{3,}:?$/.test(cell)))
    fail(header + 1, 'Missing Committed work table separator');
  const rows: Row[] = [];
  let i = header + 2;
  for (; i < end && lines[i]!.trim(); i++) {
    // Deliberately discard Owner words at the parse boundary: public rendering never receives it.
    const [rank, effort, status, source, nextStep] = checkedCells(i);
    if (!RANKS.some((value) => value === rank)) fail(i, `Unknown rank ${rank}; expected P1, P2 or P3`);
    rows.push({ rank: rank as Rank, effort: effort!, status: status!, source: source!, nextStep: nextStep! });
  }
  for (; i < end; i++) {
    if (lines[i]!.includes('|')) fail(i, 'Expected a single Committed work table with no blank lines between rows');
  }
  const droppedStart = lines.findIndex((line) => /^## Dropped\s*$/.test(line));
  let dropped = 0;
  if (droppedStart >= 0) {
    for (let n = droppedStart + 1; n < lines.length && !/^#{1,2} /.test(lines[n]!); n++) {
      const line = lines[n]!.trim();
      // The section's instructions and empty-state sentence are not dropped efforts.
      if (line && !/^One line each:/.test(line) && !/^Nothing yet\.?$/.test(line)) dropped++;
    }
  }
  return { rows, dropped };
}

export function renderBacklog(markdown: string) {
  const { rows, dropped } = parseBacklog(markdown);
  const inline = (text: string) => renderInline(text, BACKLOG);
  return (
    '<section class="backlog" aria-labelledby="committed"><h2 id="committed">Committed work</h2>' +
    RANKS.map((rank) => {
      const group = rows.filter((row) => row.rank === rank);
      return `<section aria-labelledby="${rank}"><h3 id="${rank}">${rank} <span class="count">${group.length}</span></h3><div class="work-list">${group
        .map((row) => {
          const [status, ...detail] = row.status.split(':');
          return `<article class="work"><h4>${inline(row.effort)}</h4><p class="work-status"><span class="status">${inline(status!)}</span>${detail.length ? ` <span>${inline(detail.join(':').trim())}</span>` : ''}</p><p><strong>Next step</strong> ${inline(row.nextStep)}</p><p class="source"><strong>Plan or source</strong> ${inline(row.source)}</p></article>`;
        })
        .join('')}</div></section>`;
    }).join('') +
    `<p class="dropped"><a href="${REPO}${BACKLOG}#dropped">Dropped: ${dropped}</a></p></section>`
  );
}

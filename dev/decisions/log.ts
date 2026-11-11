// Parsing and rendering for the topic-split decision log, shared by split.ts, check.ts and the tests. Pure functions:
// text in, text out, no file system.
import crypto from 'node:crypto';
import {
  ANNOTATIONS,
  ARCHIVE_FILE,
  CALL_DOC_TOPIC,
  CALL_KEYWORDS,
  CALLS_FILE,
  OPEN_FILE,
  OVERRIDES,
  RAIL_WHERE,
  ROUTING_FILE,
  STILL_OPEN,
  SUPERSEDED,
  TOP_KEYWORDS,
  TOP_TOPIC,
  TOPICS,
} from './topics.ts';
import type { TopicId } from './topics.ts';

/** One list item or paragraph, with its continuation lines, exactly as written. */
export type Unit = { lines: string[]; blankBefore: boolean };
type Section = { heading: string; units: Unit[] };

const ANCHOR = /^- <a id="([^"]+)"><\/a>/;
const LEAD = /^(?: {2})?- (?:<a id="[^"]+"><\/a>)?\*\*(.+?)\*\*/;

export const lead = (line: string): string | null => LEAD.exec(line)?.[1] ?? null;
export const isEntry = (u: Unit) => /^- \*\*/.test(u.lines[0]!);
/** A line as the old single file had it: the anchor the split adds before an entry's lead is not part of the record. */
export const unanchored = (line: string) => line.replace(ANCHOR, '- ');
export const hash = (s: string) => crypto.createHash('sha256').update(s).digest('hex').slice(0, 16);
export const chars = (s: string) => [...s].length;

/** Quoted text: straight and curly double quotes, within a line. */
export function quotes(text: string): string[] {
  return [...text.matchAll(/"[^"\n]+"|“[^”\n]+”/g)].map((m) => m[0]);
}

export function parseUnits(lines: string[]): Unit[] {
  const units: Unit[] = [];
  let blank = false;
  let cur: Unit | null = null;
  for (const line of lines) {
    if (!line.trim()) {
      blank = true;
      cur = null;
      continue;
    }
    if (!cur || line.startsWith('- ')) {
      cur = { lines: [line], blankBefore: blank };
      units.push(cur);
      blank = false;
    } else cur.lines.push(line);
  }
  return units;
}

export function renderUnits(units: Unit[]): string[] {
  return units.flatMap((u, i) => [...(i > 0 && u.blankBefore ? [''] : []), ...u.lines]);
}

/** Splits text at headings of one depth: the part before the first, then each heading with its body. */
function blocks(lines: string[], depth: number): { before: string[]; parts: { heading: string; body: string[] }[] } {
  const marker = `${'#'.repeat(depth)} `;
  const before: string[] = [];
  const parts: { heading: string; body: string[] }[] = [];
  for (const line of lines) {
    if (line.startsWith(marker)) parts.push({ heading: line.slice(marker.length), body: [] });
    else (parts.at(-1)?.body ?? before).push(line);
  }
  return { before, parts };
}

export type Legacy = {
  preamble: string[];
  authority: string[];
  index: string[];
  top: Unit[];
  sections: Section[];
  changed: string[];
  parked: string[];
  open: string[];
};

export const isLegacyLog = (text: string) => /^## Current-decision index$/m.test(text) || /^- \*\*/m.test(text);

export function parseLegacyLog(text: string): Legacy {
  const lines = text.replace(/\n+$/, '').split('\n');
  const { before, parts } = blocks(lines, 2);
  const part = (name: string) => {
    const found = parts.filter((p) => p.heading === name || p.heading.startsWith(`${name} (`));
    if (found.length > 1) throw new Error(`decisions.md: two "## ${name}" sections`);
    return found[0];
  };
  const known = ['Current-decision index', 'Decided', 'Changed', 'Parked by the owner', 'Open questions'];
  for (const p of parts)
    if (!known.some((k) => p.heading === k || p.heading.startsWith(`${k} (`)))
      throw new Error(`decisions.md: unknown section "## ${p.heading}"; add it to dev/decisions/log.ts`);
  const indexPart = part('Current-decision index');
  const index = indexPart ? [`## ${indexPart.heading}`, ...indexPart.body] : [];
  // The italic authority note closing the index ("_Decision log, 1 November 2026 ..._") stays on the routing page.
  const at = index.findIndex((l) => l.startsWith('_Decision log'));
  const authority = at >= 0 ? index.splice(at, 1) : [];
  const decided = part('Decided');
  if (!decided) throw new Error('decisions.md: no "## Decided" section');
  const sub = blocks(decided.body, 3);
  const whole = (p: { heading: string; body: string[] } | undefined) =>
    p ? [`## ${p.heading}`, ...p.body].join('\n').replace(/\n+$/, '').split('\n') : [];
  return {
    preamble: before.join('\n').replace(/\n+$/, '').split('\n'),
    authority,
    index: index.join('\n').replace(/\n+$/, '').split('\n'),
    top: parseUnits(sub.before),
    sections: sub.parts.map((p) => ({ heading: p.heading, units: parseUnits(p.body) })),
    changed: whole(part('Changed')),
    parked: whole(part('Parked by the owner')),
    open: whole(part('Open questions')),
  };
}

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

/** The entry's date: an ISO date at the start of its lead, else "(9 November" at the start of its text, else the section's. */
export function entryDate(leadText: string, rest: string, fallback: string): string {
  const iso = /^(\d{4}-\d{2}-\d{2})/.exec(leadText);
  if (iso) return iso[1]!;
  const day = new RegExp(`^\\s*\\((\\d{1,2}) (${MONTHS.join('|')})\\b`).exec(rest);
  if (day) return `2026-${String(MONTHS.indexOf(day[2]!) + 1).padStart(2, '0')}-${day[1]!.padStart(2, '0')}`;
  return fallback;
}

function sectionDate(heading: string): string {
  const iso = /\d{4}-\d{2}-\d{2}/.exec(heading)?.[0];
  return iso ?? entryDate('', heading.replace(/^[^(]*/, ''), '');
}

/** The first sentence after a lead, skipping a leading "(owner: ...)" note; links and bold dropped; at most 200 characters. */
export function firstSentence(rest: string): string {
  let t = rest.replace(/^[\s:]+/, '');
  if (t.startsWith('(')) {
    let depth = 0;
    let i = 0;
    for (; i < t.length; i++) {
      if (t[i] === '(') depth++;
      else if (t[i] === ')' && --depth === 0) break;
    }
    t = t.slice(i + 1).replace(/^[\s.:;,]+/, '');
  }
  t = t
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replaceAll('**', '')
    .replace(/_\(([^)]*)\)_/g, '($1)');
  const end = /\.(\s|$)/.exec(t);
  if (end) t = t.slice(0, end.index + 1);
  if (chars(t) > 200) {
    t = [...t].slice(0, 200).join('');
    t = `${t.slice(0, t.lastIndexOf(' '))}…`;
  }
  if ((t.match(/`/g) ?? []).length % 2) t = `${t.slice(0, t.lastIndexOf('`')).trimEnd()}…`;
  return t.trim();
}

export function ruleText(leadText: string, rest: string): string {
  if (OVERRIDES[leadText]) return OVERRIDES[leadText];
  const t = leadText.replace(/^\d{4}-\d{2}-\d{2},?\s*/, '').replace(/^[\s:]+$/, '');
  // A lead that is the subject of its sentence ("**The mainland port city** is visible ...") reads on into it.
  if (t && /^\s*[a-z,]/.test(rest)) return `${t} ${firstSentence(rest)}`.replace(/ ,/, ',');
  const short = !t || /:$/.test(t) || t.split(/\s+/).length <= 3;
  if (!short) return t;
  const s = firstSentence(rest);
  return t ? `${t}${/[:.]$/.test(t) ? '' : ':'} ${s}` : s;
}

export function slug(leadText: string): string {
  return leadText
    .replace(/^\d{4}-\d{2}-\d{2},?\s*/, '')
    .toLowerCase()
    .replace(/[^a-z0-9 ]+/g, ' ')
    .trim()
    .split(/\s+/)
    .slice(0, 6)
    .join('-');
}

const restOf = (u: Unit) => u.lines[0]!.replace(LEAD, '');

type Placed = { unit: Unit; topic: TopicId; via: 'table' | 'keyword' | 'section'; date: string };

export type Split = {
  files: Record<string, string>;
  fallbacks: string[];
  archived: { lead: string; topic: TopicId; by: string }[];
  unmatchedSuperseded: string[];
  calls: { open: number; ruled: number; keyword: number; byTopic: Record<string, [number, number]> };
};

export function topicOfEntry(u: Unit): { topic: TopicId; via: 'table' | 'keyword' } {
  const l = lead(u.lines[0]!) ?? '';
  if (TOP_TOPIC[l]) return { topic: TOP_TOPIC[l], via: 'table' };
  const text = u.lines.join(' ');
  return { topic: TOP_KEYWORDS.find(([re]) => re.test(text))?.[1] ?? 'rail', via: 'keyword' };
}

function topicOfSection(heading: string): TopicId {
  const t = TOPICS.find((x) => x.sections.includes(heading));
  if (!t)
    throw new Error(`decisions.md: section "### ${heading}" has no topic; add it to TOPICS in dev/decisions/topics.ts`);
  return t.id;
}

export function topicOfCall(where: string, call: string): { topic: TopicId; via: 'doc' | 'keyword' } {
  for (const m of where.matchAll(/\]\(([^)#\s]+)/g)) {
    const doc = m[1]!.replace(/^(\.\.\/)+/, '').replace(/^docs\//, '');
    if (CALL_DOC_TOPIC[doc]) return { topic: CALL_DOC_TOPIC[doc], via: 'doc' };
  }
  for (const [re, topic] of CALL_KEYWORDS) if (re.test(where)) return { topic, via: 'keyword' };
  if (RAIL_WHERE.test(where)) return { topic: 'rail', via: 'keyword' };
  for (const [re, topic] of CALL_KEYWORDS) if (re.test(call)) return { topic, via: 'keyword' };
  return { topic: 'rail', via: 'keyword' };
}

export function cells(row: string): string[] {
  return row
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split(' | ')
    .map((c) => c.trim());
}

export const isOpenStatus = (status: string) => /^open\b/.test(status) || STILL_OPEN.test(status);

function rulesLines(u: Unit, id: string, date: string): string[] {
  const l = lead(u.lines[0]!)!;
  const note = (k: string) => (ANNOTATIONS[k] ? ` _(${ANNOTATIONS[k]})_` : '');
  const out = [`- ${date || 'undated'} · ${ruleText(l, restOf(u))}${note(l)} ([entry](#${id}))`];
  for (const line of u.lines.slice(1)) {
    const sub = /^ {2}- \*\*(.+?)\*\*(.*)$/.exec(line);
    if (sub) out.push(`  - ${ruleText(sub[1]!, sub[2]!)}${note(sub[1]!)}`);
  }
  return out;
}

const routeLink = (file: string) => file.replace(/^docs\//, '');

export function split(decisionsText: string, callsText: string, source: string): Split {
  const legacy = parseLegacyLog(decisionsText);
  const fallbacks: string[] = [];
  const placed: Placed[] = [];
  for (const unit of legacy.top) {
    if (!isEntry(unit)) {
      // A loose note at the top of the log follows the entry above it.
      const prev = placed.at(-1);
      placed.push({ unit, topic: prev?.topic ?? 'process', via: 'table', date: '' });
      continue;
    }
    const { topic, via } = topicOfEntry(unit);
    if (via === 'keyword') fallbacks.push(`${topic}: ${lead(unit.lines[0]!)}`);
    placed.push({ unit, topic, via, date: '' });
  }

  // Superseded entries, matched by lead and occurrence across the whole log.
  const seen = new Map<string, number>();
  const archivedUnits = new Set<Unit>();
  const archived: Split['archived'] = [];
  const matched = new Set<(typeof SUPERSEDED)[number]>();
  const allUnits: { unit: Unit; topic: TopicId }[] = [
    ...placed.map((p) => ({ unit: p.unit, topic: p.topic })),
    ...legacy.sections.flatMap((s) => s.units.map((unit) => ({ unit, topic: topicOfSection(s.heading) }))),
  ];
  for (const { unit, topic } of allUnits) {
    if (!isEntry(unit)) continue;
    const l = lead(unit.lines[0]!)!;
    const n = (seen.get(l) ?? 0) + 1;
    seen.set(l, n);
    const s = SUPERSEDED.find((x) => x.lead === l && (x.nth ?? n) === n);
    if (s) {
      archivedUnits.add(unit);
      matched.add(s);
      archived.push({ lead: l, topic, by: s.by });
    }
  }
  const unmatchedSuperseded = SUPERSEDED.filter((s) => !matched.has(s)).map((s) => s.lead);

  // Agent calls.
  const callLines = callsText.replace(/\n+$/, '').split('\n');
  const headAt = callLines.findIndex((l) => l.startsWith('| Date |'));
  if (headAt < 0) throw new Error('agent-calls.md: no "| Date |" table header');
  const intro = callLines.slice(0, headAt);
  const header = callLines.slice(headAt, headAt + 2);
  // Rows run to the end of the file; a stray blank line between rows (one split the old table in two) is dropped.
  const rest = callLines.slice(headAt + 2);
  const rows = rest.filter((l) => l.startsWith('|'));
  const after = rest.filter((l) => l.trim() && !l.startsWith('|'));
  const live = new Map<TopicId, string[]>();
  const ruled = new Map<TopicId, string[]>();
  let keyword = 0;
  for (const row of rows) {
    const c = cells(row);
    const { topic, via } = c.length >= 6 ? topicOfCall(c[2]!, c[1]!) : { topic: 'rail' as TopicId, via: 'keyword' };
    if (via === 'keyword') keyword++;
    const target = c.length >= 6 && !isOpenStatus(c.at(-1)!) ? ruled : live;
    target.set(topic, [...(target.get(topic) ?? []), row]);
  }

  const files: Record<string, string> = {};
  const archiveSections: string[] = [];
  for (const t of TOPICS) {
    const ids = new Set<string>();
    const anchorFor = (u: Unit, date: string) => {
      const base = `d-${date || 'undated'}-${slug(lead(u.lines[0]!)!)}`.replace(/-+$/, '');
      let id = base;
      for (let i = 2; ids.has(id); i++) id = `${base}-${i}`;
      ids.add(id);
      return id;
    };
    const rules: string[] = [];
    const anchorUnits = (units: Unit[], fallbackDate: string): Unit[] =>
      units
        .filter((u) => !archivedUnits.has(u))
        .map((u) => {
          if (!isEntry(u)) return u;
          const l = lead(u.lines[0]!)!;
          const date = entryDate(l, restOf(u), fallbackDate);
          const id = anchorFor(u, date);
          rules.push(...rulesLines(u, id, date));
          return { ...u, lines: [u.lines[0]!.replace(/^- /, `- <a id="${id}"></a>`), ...u.lines.slice(1)] };
        });
    const top = anchorUnits(
      placed
        .filter((p) => p.topic === t.id && !archivedUnits.has(p.unit))
        .map((p) => ({ ...p.unit, blankBefore: false })),
      '',
    );
    const sections = legacy.sections
      .filter((s) => topicOfSection(s.heading) === t.id)
      .sort((a, b) => t.sections.indexOf(a.heading) - t.sections.indexOf(b.heading))
      .map((s) => ['', `### ${s.heading}`, '', ...renderUnits(anchorUnits(s.units, sectionDate(s.heading)))]);
    files[t.file] = [
      `# ${t.title}`,
      '',
      `One topic of the owner's decision log: [decisions.md](decisions.md) routes every topic. Read **Current rules**, then open a dated entry only for its full words. Entries are verbatim, newest first; entries a later one superseded in full are in the [archive](decisions-archive.md) (history, not for current work). To record a decision, see [Recording a decision](decisions.md#recording-a-decision).`,
      '',
      '## Current rules',
      '',
      `One line per entry in force, in the log's order, linking to it. An italic note marks a part a later entry changed. Generated from the entries by \`dev/decisions/split.ts\` (10 November 2026), kept by hand since.`,
      '',
      ...rules,
      '',
      '## Decided',
      ...(top.length ? ['', ...renderUnits(top)] : []),
      ...sections.flat(),
      '',
    ].join('\n');

    const gone = allUnits.filter((x) => x.topic === t.id && archivedUnits.has(x.unit));
    const calls = ruled.get(t.id) ?? [];
    if (!gone.length && !calls.length) continue;
    archiveSections.push(
      '',
      `## Archive: ${t.title}`,
      '',
      `History for [${routeLink(t.file)}](${routeLink(t.file)}), verbatim.`,
      ...(gone.length
        ? [
            '',
            '### Superseded entries',
            '',
            ...gone.flatMap(({ unit }) => [
              ...unit.lines,
              `  _Archived 10 November 2026; superseded by ${archived.find((a) => a.lead === lead(unit.lines[0]!) && a.topic === t.id)!.by}._`,
            ]),
          ]
        : []),
      ...(calls.length ? ['', '### Agent calls the owner ruled on', '', ...header, ...calls] : []),
    );
  }

  files[OPEN_FILE] = [
    '# Open questions and parked',
    '',
    `Part of the owner's decision log: [decisions.md](decisions.md) routes every topic. Moved here verbatim on 10 November 2026.`,
    '',
    ...legacy.parked,
    '',
    ...legacy.open,
    '',
  ].join('\n');

  files[ARCHIVE_FILE] = [
    '# Decision log archive',
    '',
    `**History: don't read this for current work.** Entries a later entry superseded in full, calls made without the owner that he has since confirmed or overruled (or that a later call superseded), the old log's "Changed" record and its retired current-decision index, all verbatim. Current rules live in the topic files that [decisions.md](decisions.md) routes. Links inside the retired index point at the old single file's sections; [decisions.md](decisions.md#moved-sections) forwards them.`,
    ...archiveSections,
    '',
    ...legacy.changed,
    ...(legacy.index.length && legacy.index[0]
      ? [
          '',
          ...legacy.index.slice(0, 1),
          '',
          '_Retired 10 November 2026, when the log was split by topic._',
          ...legacy.index.slice(1),
        ]
      : []),
    '',
  ].join('\n');

  const moved: [string, string][] = [
    [
      'Current-decision index',
      `Retired 10 November 2026: use the table above. Its text: [archive](decisions-archive.md#current-decision-index).`,
    ],
    ...TOPICS.flatMap((t) =>
      t.sections
        .filter((s) => legacy.sections.some((x) => x.heading === s))
        .map((s): [string, string] => [s, `[${routeLink(t.file)}](${routeLink(t.file)}#${anchorOf(s)})`]),
    ),
    ...(legacy.changed.length > 1
      ? [['Changed', `[decisions-archive.md](decisions-archive.md#changed)`] as [string, string]]
      : []),
    ...(legacy.parked.length > 1
      ? [
          ['Parked by the owner', `[decisions-open-questions.md](decisions-open-questions.md#parked-by-the-owner)`] as [
            string,
            string,
          ],
        ]
      : []),
    ...legacy.open
      .slice(0, 1)
      .map((h): [string, string] => [
        h.replace(/^## /, ''),
        `[decisions-open-questions.md](decisions-open-questions.md#${anchorOf(h.replace(/^## /, ''))})`,
      ]),
  ];
  files[ROUTING_FILE] = [
    ...legacy.preamble,
    '',
    ...(legacy.authority.length ? [...legacy.authority, ''] : []),
    `Split by topic on 10 November 2026 (owner: "Should we optimize storage of decisions to keep the record but save context reads?", "Yes"). Every entry moved word for word, by \`dev/decisions/split.ts\` from ${source}; \`npm run decisions\` proves nothing was lost.`,
    '',
    '## Decided',
    '',
    `Find your task's topic, read that file's **Current rules** (\`npm run map -- --section docs/decisions-<topic>.md current-rules\`), and open a dated entry only for its full words. Later explicit owner calls win; [owner calls](agents/owner-calls.md) bind every task; [DESIGN](../DESIGN.md) owns principles, plans own tasks, and [game-design](game-design.md) records what exists.`,
    '',
    '| Topic | File | Holds |',
    '| --- | --- | --- |',
    ...TOPICS.map((t) => `| ${t.title} | [${routeLink(t.file)}](${routeLink(t.file)}#current-rules) | ${t.holds} |`),
    `| Open questions and parked | [${routeLink(OPEN_FILE)}](${routeLink(OPEN_FILE)}) | Parked by the owner; Open questions (round 8 and the architecture review) |`,
    `| Calls made without the owner, still open | [${routeLink(CALLS_FILE)}](${routeLink(CALLS_FILE)}) | One table per topic above |`,
    `| Archive (history, not for current work) | [${routeLink(ARCHIVE_FILE)}](${routeLink(ARCHIVE_FILE)}) | Superseded entries, calls the owner has ruled on, the "Changed" record, the retired current-decision index |`,
    '',
    '## Recording a decision',
    '',
    '- An owner decision is a dated entry at the top of its topic file\'s "Decided": `- <a id="d-YYYY-MM-DD-short-slug"></a>**YYYY-MM-DD, the rule in a few words** (owner: "his words"). The rule.` Add its line to that file\'s "Current rules", linking to the anchor. A decision for two topics goes in the one it changes most, with a link from the other\'s rules.',
    "- When it supersedes an entry by name: move the old entry, word for word, to its topic's section of the archive with an `_Archived ..._` note, and drop its rules line; if it replaces only part, keep the entry and add an italic note to its rules line.",
    "- A call made without the owner is a row at the top of its topic's table in [agent-calls.md](agent-calls.md). When he confirms or overrules it, record his decision as above and move the row, word for word, to its topic's archive section.",
    '- Nothing is added to this file. `npm run decisions` (also run by `npm run registry`) fails on an entry here, a ruled row left in the live calls table, an entry without a rules line, or a link to a heading that does not exist.',
    '',
    '## Moved sections',
    '',
    'Links into the old single file land here; each points to where its section went.',
    ...moved.flatMap(([h, to]) => ['', `### ${h}`, '', to]),
    '',
  ].join('\n');

  const byTopic: Record<string, [number, number]> = {};
  const callSections = TOPICS.flatMap((t) => {
    const r = live.get(t.id) ?? [];
    byTopic[t.id] = [r.length, (ruled.get(t.id) ?? []).length];
    return ['', `## ${t.title}`, '', ...header, ...r];
  });
  files[CALLS_FILE] = [
    ...intro.join('\n').replace(/\n+$/, '').split('\n'),
    '',
    `Split by topic on 10 November 2026 (see [decisions.md](decisions.md#recording-a-decision)): this file keeps only the calls still open for the owner, one table per topic of the decision log. A new call goes at the top of its topic's table. Once he confirms or changes a call, its row moves, word for word, to that topic's section of the [archive](decisions-archive.md).`,
    ...callSections,
    ...(after.some((l) => l.trim()) ? ['', ...after.join('\n').trim().split('\n')] : []),
    '',
  ].join('\n');

  return {
    files,
    fallbacks,
    archived,
    unmatchedSuperseded,
    calls: {
      open: [...live.values()].flat().length,
      ruled: [...ruled.values()].flat().length,
      keyword,
      byTopic,
    },
  };
}

/** Same as dev/scan/sections.ts's anchor(). */
export function anchorOf(heading: string): string {
  return heading
    .toLowerCase()
    .replace(/[^\p{L}\p{N}_\-\s]/gu, '')
    .replace(/\s/g, '-');
}

export type Manifest = {
  source: string;
  files: Record<string, { characters: number; lines: number }>;
  entries: number;
  rows: number;
  lines: string[];
  quotes: string[];
};

/** What the no-loss check proves later: a hash of every non-blank line and every quotation in the old two files. */
export function manifestOf(decisionsText: string, callsText: string, source: string): Manifest {
  const all = [decisionsText, callsText];
  const lines = new Set<string>();
  const qs = new Set<string>();
  for (const text of all) {
    for (const line of text.split('\n')) if (line.trim()) lines.add(hash(line));
    for (const q of quotes(text)) qs.add(hash(q));
  }
  return {
    source,
    files: {
      [ROUTING_FILE]: { characters: chars(decisionsText), lines: decisionsText.split('\n').length },
      [CALLS_FILE]: { characters: chars(callsText), lines: callsText.split('\n').length },
    },
    entries: decisionsText.split('\n').filter((l) => /^- \*\*/.test(l)).length,
    rows: callsText.split('\n').filter((l) => /^\| \d{4}-/.test(l)).length,
    lines: [...lines].sort(),
    quotes: [...qs].sort(),
  };
}

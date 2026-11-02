// npm run verdicts [-- --days N] [--md] [--all]
// Playtest verdicts the prototype bar sent to the server (POST /report, kind `playtest`; server/src/server.ts), read
// back through GET /reports for the last N UTC days (default 3), newest first, grouped by prototype.
// The bar sends on the verdict tap and again with the note, so by default only the latest report per card and variant
// in a sitting (reports less than SITTING_MS apart) shows; --all shows every send.
//   --md   print draft lines in docs/playtests.md's entry format instead, one `## <day>` block per day.
// Token: REPORT_TOKEN from the environment, else a `REPORT_TOKEN=...` line in `.env.local` at the repo root
// (gitignored). It is the Fly secret of the same name; it is sent only as the Authorization header, never printed.
// Server: BOOGLE_SERVER if set, else the production server (the VITE_BOOGLE_SERVER repo variable that deploy.yml builds
// the site with).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PROTOS } from '../protos/protos.ts';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SERVER = process.env.BOOGLE_SERVER || 'https://boogle-server.fly.dev';
const args = process.argv.slice(2);
const days = Math.max(1, Math.min(30, Number(args[args.indexOf('--days') + 1]) || 3));
const md = args.includes('--md');
const all = args.includes('--all');
const SITTING_MS = 30 * 60_000;

type Playtest = {
  at: string;
  room: string;
  detail: {
    proto: string;
    verdict: 'yes' | 'no' | 'cant';
    variant: string;
    note: string;
    counts?: Record<string, number>;
    trace?: string;
    values?: string;
    build?: string;
  };
};

function token(): string {
  if (process.env.REPORT_TOKEN) return process.env.REPORT_TOKEN;
  try {
    const line = fs
      .readFileSync(path.join(ROOT, '.env.local'), 'utf8')
      .split('\n')
      .find((l) => l.startsWith('REPORT_TOKEN='));
    if (line)
      return line
        .slice('REPORT_TOKEN='.length)
        .trim()
        .replace(/^['"]|['"]$/g, '');
  } catch {
    // no file: fall through
  }
  console.error('No REPORT_TOKEN: set it in the environment or as REPORT_TOKEN=... in .env.local (see the header).');
  process.exit(1);
}

async function fetchDay(day: string, auth: string): Promise<Playtest[]> {
  const r = await fetch(`${SERVER}/reports?day=${day}`, { headers: { authorization: `Bearer ${auth}` } });
  if (r.status === 401) throw new Error('the server refused the token (401)');
  if (!r.ok) throw new Error(`GET /reports?day=${day}: ${r.status}`);
  const out: Playtest[] = [];
  for (const line of (await r.text()).split('\n')) {
    if (!line.trim()) continue;
    try {
      const rep = JSON.parse(line);
      if (rep.kind === 'playtest' && rep.detail?.proto) out.push(rep);
    } catch {
      // a torn line: skip it
    }
  }
  return out;
}

const VERDICT = { yes: 'Yes', no: 'No', cant: 'Can’t tell' };
const oneLine = (s: string) => s.trim().replace(/\s*\n\s*/g, ' ');
const countsLine = (c: Record<string, number> = {}) => {
  const parts = Object.entries(c)
    .filter(([k]) => k !== 'seconds')
    .map(([k, v]) => `${Math.round(v)} ${k}`);
  const s = c.seconds ?? 0;
  if (s >= 1) parts.push(`${s < 90 ? `${Math.round(s)} s` : `${Math.round(s / 60)} min`} in prototype`);
  return parts.join(', ');
};
// A sentence that already ends in punctuation gets no extra full stop.
const stop = (s: string) => (/[.!?…]$/.test(s) ? s : `${s}.`);
const answer = (d: Playtest['detail']) =>
  stop(`${VERDICT[d.verdict]}${d.variant ? ` (on ${d.variant})` : ''}${d.note.trim() ? `: ${oneLine(d.note)}` : ''}`);

const auth = token();
const list: Playtest[] = [];
for (let i = 0; i < days; i++) {
  const day = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10);
  try {
    list.push(...(await fetchDay(day, auth)));
  } catch (e) {
    console.error(e instanceof Error ? e.message : String(e));
    process.exit(1);
  }
}
list.sort((a, b) => b.at.localeCompare(a.at));
// One report per card and variant per sitting: newest first, a report within SITTING_MS before a later one of the same
// card and variant (the tap before its note, a changed mind) is dropped.
if (!all) {
  const seen = new Map<string, number>(); // card/variant -> time of the last report looked at (a later one)
  const kept = list.filter((r) => {
    const key = `${r.detail.proto}/${r.detail.variant}`;
    const t = Date.parse(r.at);
    const later = seen.get(key);
    seen.set(key, t);
    return later === undefined || later - t >= SITTING_MS;
  });
  list.splice(0, list.length, ...kept);
}
if (!list.length) {
  console.log(`No playtest verdicts in the last ${days} day${days === 1 ? '' : 's'}.`);
  process.exit(0);
}

// Group by key (prototype, or day then prototype for --md), keeping newest-first order.
const group = <T>(items: T[], key: (t: T) => string) => {
  const m = new Map<string, T[]>();
  for (const t of items) m.set(key(t), [...(m.get(key(t)) ?? []), t]);
  return m;
};

if (md) {
  for (const [day, ofDay] of group(list, (r) => r.at.slice(0, 10))) {
    console.log(`## ${day}\n- Who: Matias, solo`);
    for (const [id, rs] of group(ofDay, (r) => r.detail.proto)) {
      const p = PROTOS.find((q) => q.id === id);
      console.log(`- Prototype: ${p?.title ?? id}${p ? ` (\`${p.url}\`)` : ''}`);
      // Newest per variant is the verdict that stands; older ones were changed minds.
      for (const r of group(rs, (r) => r.detail.variant).values()) {
        const d = r[0].detail;
        console.log(`- ${p?.question ?? 'Verdict:'} ${answer(d)}`);
        if (countsLine(d.counts)) console.log(`- Did: ${countsLine(d.counts)}`);
        if (d.trace) console.log(`- Last sitting: ${d.trace}`);
        if (d.values) console.log(`- Values: \`${oneLine(d.values)}\``);
      }
    }
    console.log('');
  }
} else {
  for (const [id, rs] of group(list, (r) => r.detail.proto)) {
    const p = PROTOS.find((q) => q.id === id);
    console.log(`${p?.title ?? id} (${id})${p ? `: ${p.question}` : ''}`);
    for (const { at, detail: d } of rs) {
      const extra = [countsLine(d.counts), d.trace, d.build && `build ${d.build}`].filter(Boolean).join('; ');
      console.log(`  ${at.slice(0, 16).replace('T', ' ')}Z  ${answer(d)}${extra ? `  [${extra}]` : ''}`);
    }
    console.log('');
  }
}

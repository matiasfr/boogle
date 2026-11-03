import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { basename, join, resolve } from 'node:path';
import { claude } from './transcript/claude.ts';
import { codex } from './transcript/codex.ts';
import { obj, str } from './transcript/types.ts';
import type { Call, Session } from './transcript/types.ts';

// Order is the priority for a command containing several kinds, not a duration measurement.
const kinds: [string, RegExp][] = [
  ['ship', /\b(?:npm run ship|dev\/.*ship)\b/],
  ['playthrough', /\bplaythrough\b/],
  ['look', /\b(?:npm run look|dev\/codex\/see\.ts)\b/],
  ['session', /\b(?:npm run session|dev\/session)\b/],
  ['sim', /\b(?:npm run sim|dev\/sim)\b/],
  ['typecheck/lint', /\b(?:typecheck|eslint|lint)\b/],
  ['map', /\b(?:npm run map|dev\/map)\b/],
  ['patch', /\b(?:npm run patch|dev\/patch\.ts)\b/],
  ['python', /\bpython(?:3)?\b/],
  ['git', /\bgit\b/],
];
function walk(dir: string): string[] {
  try {
    return readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
      e.isDirectory() ? walk(join(dir, e.name)) : e.name.endsWith('.jsonl') ? [join(dir, e.name)] : [],
    );
  } catch {
    return [];
  }
}
function inventory(): string[] {
  return [...walk(join(homedir(), '.claude/projects')), ...walk(join(homedir(), '.codex/sessions'))].sort(
    (a, b) => statSync(b).mtimeMs - statSync(a).mtimeMs,
  );
}
function load(path: string): Session {
  const lines = readFileSync(path, 'utf8').split('\n');
  const isCodex =
    basename(path).startsWith('rollout-') ||
    lines.slice(0, 5).some((l) => {
      try {
        return obj(JSON.parse(l)).type === 'session_meta';
      } catch {
        return false;
      }
    });
  return isCodex ? codex(path, lines) : claude(path, lines);
}
function select(q: string, files: string[]): string {
  if (existsSync(q)) return resolve(q);
  const found = files.filter((f) => basename(f).includes(q));
  if (found.length !== 1)
    throw new Error(found.length ? `Ambiguous id: ${found.length} matches` : `No log matches ${q}`);
  return found[0]!;
}
function short(s: string, n = 100): string {
  return s.replace(/\s+/g, ' ').trim().slice(0, n);
}
function command(c: Call): string {
  const i = obj(c.input);
  const direct = str(i.command) || str(i.cmd);
  if (direct) return direct;
  if (/^(?:bash|shell|terminal)$/i.test(c.name) && typeof c.input === 'string') return c.input;
  if (c.name === 'exec' && typeof c.input === 'string') {
    const commands = [
      ...c.input.matchAll(/tools\.exec_command\s*\(\s*\{\s*(?:cmd|command)\s*:\s*("(?:\\.|[^"\\])*")/g),
    ];
    return commands
      .map((m) => {
        try {
          return String(JSON.parse(m[1]!));
        } catch {
          return '';
        }
      })
      .join(' ; ');
  }
  return '';
}
function safeCommand(cmd: string): string {
  return short(
    cmd
      .split('\n')[0]!
      .replace(/(?:<<|\b(?:python3?|node|ruby)\s+-[ce]\s+|\b(?:echo|printf)\s+).*/, '[inline content omitted]')
      .replace(/'[^']*'|"(?:\\.|[^"\\])*"/g, '[quoted text omitted]'),
  );
}
function outputText(x: unknown): string {
  if (typeof x === 'string') return x;
  if (Array.isArray(x)) return x.map((v) => str(obj(v).text) || str(obj(v).content)).join('');
  return '';
}
function report(s: Session) {
  const calls = s.calls.filter((c) => c.start && c.end && c.end >= c.start),
    durations = calls.map((c) => ({ c, ms: c.end! - c.start }));
  const intervals = durations.map(({ c }) => [c.start, c.end!] as [number, number]).sort((a, b) => a[0] - b[0]);
  let tools = 0,
    end = 0;
  for (const [a, b] of intervals) {
    tools += Math.max(0, b - Math.max(a, end));
    end = Math.max(end, b);
  }
  let model = 0;
  const events = durations
    .flatMap(({ c }) => [
      { t: c.start, type: 'start' },
      { t: c.end!, type: 'end' },
    ])
    .sort((a, b) => a.t - b.t);
  let lastEnd: number | null = null,
    active = 0;
  for (const e of events) {
    if (e.type === 'start') {
      if (!active && lastEnd !== null) model += e.t - lastEnd;
      active++;
    } else {
      active--;
      if (!active) lastEnd = e.t;
    }
  }
  const shell = durations.filter(({ c }) => !!command(c));
  const grouped: Record<string, number> = {};
  for (const { c, ms } of shell) {
    const cmd = command(c),
      kind = kinds.find(([, re]) => re.test(cmd))?.[0] || 'other';
    grouped[kind] = (grouped[kind] || 0) + ms;
  }
  let wholeRead = 0,
    rangeRead = 0,
    wholeWrite = 0,
    edits = 0,
    scripts = 0,
    reads = 0,
    writes = 0;
  const files: Record<string, number> = {},
    adoption: Record<string, number> = {
      'look --at': 0,
      'look --filmstrip': 0,
      'look --curves': 0,
      session: 0,
      map: 0,
      patch: 0,
      'throwaway scripts': 0,
    };
  for (const c of s.calls) {
    const i = obj(c.input),
      cmd = command(c),
      path = str(i.file_path) || str(i.path);
    const out = outputText(c.output);
    if (/^read$/i.test(c.name) && path) {
      reads++;
      const n = out.length;
      if (i.offset !== undefined || i.limit !== undefined) rangeRead += n;
      else wholeRead += n;
      files[path] = (files[path] || 0) + n;
    }
    if (/^write$/i.test(c.name)) {
      writes++;
      wholeWrite += str(i.content).length;
    }
    if (/edit|apply_patch/i.test(c.name)) {
      writes++;
      edits += (str(i.new_string) || str(i.patch) || (typeof c.input === 'string' ? c.input : '')).length;
    }
    const script = /(?:^|[\s/])p(?:atch|atch\w*|\d+|_\w*)?\.py\b/i.test(cmd + ' ' + path);
    if (script) {
      scripts++;
      adoption['throwaway scripts']!++;
    }
    for (const flag of ['at', 'filmstrip', 'curves'])
      if (/\b(?:look|see\.ts)\b/.test(cmd) && new RegExp(`--${flag}\\b`).test(cmd)) adoption[`look --${flag}`]!++;
    for (const k of ['session', 'map', 'patch'])
      if (new RegExp(`\\b(?:npm run ${k}|dev/${k}(?:\\.ts|/))\\b`).test(cmd)) adoption[k]!++;
  }
  const samples = s.samples.filter((x) => x.context >= 0),
    peak = samples.length ? Math.max(...samples.map((x) => x.context)) : null;
  const points = samples.length
    ? [0, 0.25, 0.5, 0.75, 1].map((p) => {
        const target = s.start + (s.end - s.start) * p;
        const sample = samples.reduce((a, b) => (Math.abs(b.time - target) < Math.abs(a.time - target) ? b : a));
        return { percent: p * 100, context: sample.context };
      })
    : [];
  return {
    format: s.format,
    path: s.path,
    model: s.model || null,
    start: Number.isFinite(s.start) ? new Date(s.start).toISOString() : null,
    end: s.end ? new Date(s.end).toISOString() : null,
    spanMs: s.end && Number.isFinite(s.start) ? s.end - s.start : null,
    toolMs: calls.length ? tools : null,
    modelGapMs: calls.length > 1 ? model : null,
    timingNote:
      'Approximate: parallel calls overlap; bundled commands are assigned as one. Model gaps exclude session edges and can include waiting.',
    shellMs: grouped,
    longest: shell
      .sort((a, b) => b.ms - a.ms)
      .slice(0, 6)
      .map(({ c, ms }) => ({ ms, command: safeCommand(command(c)) })),
    tokens: {
      output: s.output,
      claudeCacheReads: s.cacheRead,
      cacheWrites: s.cacheWrite,
      codexCachedInput: s.cachedInput,
      peakContext: peak,
      messages: s.messages,
      contextPoints: points,
    },
    reading: {
      wholeCharacters: reads ? wholeRead : null,
      rangeCharacters: reads ? rangeRead : null,
      largest: Object.entries(files)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8)
        .map(([path, characters]) => ({ path: short(path), characters })),
    },
    writing: {
      wholeCharacters: writes ? wholeWrite : null,
      editCharacters: writes ? edits : null,
      patchScripts: scripts,
    },
    adoption,
    failures: s.calls
      .filter((c) => c.error)
      .map((c) => short(`${c.name}: ${safeCommand(command(c)) || str(obj(c.input).file_path)}`))
      .slice(0, 5),
    failureCount: s.calls.filter((c) => c.error).length,
    skipped: s.skipped,
    limitations:
      'File character counts cover structured Read/Write/Edit tools only; shell and nested calls are not attributed. Failures require recorded error markers. Context is per-request input, not a measured resident context.',
  };
}
function print(r: ReturnType<typeof report>): string {
  const n = (v: number | null) => (v === null ? 'not recorded' : v.toLocaleString());
  const time = (v: number | null) => (v === null ? 'not recorded' : `${(v / 60000).toFixed(1)} min`);
  return [
    `${r.format} ${r.path}`,
    `Model: ${r.model || 'not recorded'} | ${r.start} → ${r.end} | span ${time(r.spanMs)}`,
    `Tools ${time(r.toolMs)} | model gaps ${time(r.modelGapMs)}. ${r.timingNote}`,
    `Shell time: ${
      Object.entries(r.shellMs)
        .map(([k, v]) => `${k} ${time(v)}`)
        .join(' | ') || 'not recorded'
    }`,
    'Longest commands:',
    ...Array.from({ length: 6 }, (_, i) => {
      const x = r.longest[i];
      return x ? `  ${time(x.ms)}  ${x.command}` : '  not recorded';
    }),
    `Tokens: output ${n(r.tokens.output)} | Claude cache read ${n(r.tokens.claudeCacheReads)} | cache write ${n(r.tokens.cacheWrites)} | Codex cached input ${n(r.tokens.codexCachedInput)}`,
    `Peak context ${n(r.tokens.peakContext)} | messages ${r.tokens.messages} | context points ${r.tokens.contextPoints.map((p) => `${p.percent}% ${n(p.context)}`).join(', ') || 'not recorded'}`,
    `Reads: whole ${n(r.reading.wholeCharacters)} chars | ranges ${n(r.reading.rangeCharacters)} chars`,
    `Largest reads: ${r.reading.largest.map((x) => `${x.path} (${n(x.characters)})`).join(', ') || 'not recorded'}`,
    `Writes: whole ${n(r.writing.wholeCharacters)} chars | edits ${n(r.writing.editCharacters)} chars | patch scripts ${r.writing.patchScripts}`,
    `Adoption: ${Object.entries(r.adoption)
      .map(([k, v]) => `${k} ${v}`)
      .join(' | ')}`,
    `Failures: ${r.failureCount}${r.failures.length ? ` | ${r.failures.join(' | ')}` : ''} | skipped lines ${r.skipped}`,
    r.limitations,
  ].join('\n');
}
try {
  const args = process.argv.slice(2),
    json = args.includes('--json');
  const a = args.filter((x) => x !== '--json');
  const files = inventory();
  if (!a.length) {
    const listing: Record<string, { path: string; size: number; spanMs: number | null; firstWords: string }[]> = {};
    for (const kind of ['claude', 'codex']) {
      listing[kind] = [];
      for (const f of files
        .filter((x) => (kind === 'codex' ? basename(x).startsWith('rollout-') : !basename(x).startsWith('rollout-')))
        .slice(0, 10)) {
        const s = load(f);
        listing[kind]!.push({
          path: f,
          size: statSync(f).size,
          spanMs: Number.isFinite(s.start) ? s.end - s.start : null,
          firstWords: short(s.first, 65),
        });
      }
    }
    if (json) console.log(JSON.stringify(listing, null, 2));
    else
      for (const [kind, entries] of Object.entries(listing)) {
        console.log(`${kind}:`);
        for (const e of entries)
          console.log(
            `${e.path} ${Math.round(e.size / 1024)} KB ${e.spanMs === null ? 'not recorded' : (e.spanMs / 60000).toFixed(1) + ' min'} ${e.firstWords}`,
          );
      }
  } else {
    let paths: string[];
    if (a[0] === '--latest') {
      const kind = a[1];
      if (kind !== 'claude' && kind !== 'codex') throw new Error('Use --latest claude or --latest codex');
      const f = files.find((x) =>
        kind === 'codex' ? basename(x).startsWith('rollout-') : !basename(x).startsWith('rollout-'),
      );
      if (!f) throw new Error('No logs found');
      paths = [f];
    } else if (a[0] === '--compare' && a.length === 3) paths = [select(a[1]!, files), select(a[2]!, files)];
    else if (a.length === 1) paths = [select(a[0]!, files)];
    else throw new Error('Usage: transcript [path|id|--latest claude|codex|--compare a b] [--json]');
    const reports = paths.map((p) => report(load(p)));
    if (json) console.log(JSON.stringify(reports.length === 1 ? reports[0] : reports, null, 2));
    else if (reports.length === 1) console.log(print(reports[0]!));
    else {
      const left = print(reports[0]!).split('\n'),
        right = print(reports[1]!).split('\n');
      for (let i = 0; i < Math.max(left.length, right.length); i++)
        console.log(`${(left[i] || '').padEnd(110)} | ${right[i] || ''}`);
    }
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}

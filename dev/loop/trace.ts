// `npm run loop -- trace <session|path> [--bot <name|path>] [--players N] [--json]`: one table keyed by loop-graph
// node comparing the prediction (`npm run loop -- run`), a bot run (.look/playthrough/<name>/session.jsonl) and a
// human session (the playtest upload format, read by dev/playtest/read.ts). Human marks map to nodes by each node's
// `reached` pattern; nothing new goes on the wire. Which beats rank as most confusing is a finding, not a target.
// A session that isn't local is fetched the way `npm run playtest -- <id>` fetches it (--offline: don't). Several ids,
// or `--since YYYY-MM-DD` (UTC), give one ranked table: confusion and wayfinding per node, with n.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import type { PlaySession } from '../../server/src/playdata.ts';
import { OUT, playdata, resolveSession } from '../playtest/fetch.ts';
import { parseSession, clock, num, str, type Ev, type Session } from '../playtest/read.ts';
import { NODES, node, proposeOrders, type LoopNode, type NodeId, type Reached } from './graph.ts';
import { playOrder } from './run.ts';

/** Where sessions live: this checkout's .look (where the playtest download lands) and the main checkout's. */
export function lookDirs() {
  const dirs = [path.resolve('.look'), path.dirname(OUT)];
  try {
    const common = execFileSync('git', ['rev-parse', '--git-common-dir'], { encoding: 'utf8' }).trim();
    dirs.push(path.resolve(path.dirname(path.resolve(common)), '.look'));
  } catch {
    /* not a git checkout: this one only */
  }
  return [...new Set(dirs)];
}
export function findSession(want: string): string | null {
  if (fs.existsSync(want)) return want;
  for (const dir of lookDirs()) {
    const d = path.join(dir, 'playtest');
    if (!fs.existsSync(d)) continue;
    const hit = fs.readdirSync(d).find((f) => f.endsWith('.jsonl') && f.startsWith(want));
    if (hit) return path.join(d, hit);
  }
  return null;
}
function findBot(want: string | undefined): string | null {
  if (want && fs.existsSync(want)) return want;
  const runs: { file: string; at: number }[] = [];
  for (const dir of lookDirs()) {
    const d = path.join(dir, 'playthrough');
    if (!fs.existsSync(d)) continue;
    for (const name of fs.readdirSync(d)) {
      const file = path.join(d, name, 'session.jsonl');
      if ((!want || name === want) && fs.existsSync(file)) runs.push({ file, at: fs.statSync(file).mtimeMs });
    }
  }
  return runs.sort((a, b) => b.at - a.at)[0]?.file ?? null;
}
export const read = (file: string): Session =>
  parseSession(path.basename(file, '.jsonl'), fs.readFileSync(file, 'utf8'));

/** Older builds' names for the same moments (the place-proto world's bot runs): read as today's. */
const ABILITY: Record<string, string> = {
  jump: 'second jump gained',
  hook: 'hook shot gained',
  glide: 'glider gained',
  axe: 'proper axe gained',
  pack: 'pack gained',
};
function current(e: Ev): Ev {
  const n = str(e.n);
  if (n === 'stretch laid' && str(e.id)) return { ...e, n: `stretch laid ${str(e.id)}` };
  const gained = ABILITY[str(e.what)];
  if (n === 'ability gained' && gained) return { ...e, n: gained };
  if (n === 'train unlocked') return { ...e, n: 'trains unlocked' };
  return e;
}
const marks = (s: Session) => s.events.filter((e) => e.k === 'm').map(current);
const matches = (e: Ev, r: Reached, name = r.mark) =>
  str(e.n) === name && Object.entries(r.data ?? {}).every(([k, v]) => String(e[k]) === String(v));
/** Seconds into the session each node was reached (its `reached` mark: the nth, or the last), or undefined. */
export function reachedTimes(s: Session) {
  const ms = marks(s);
  const out = new Map<NodeId, number>();
  for (const n of NODES) {
    const hits = ms.filter(
      (e) => matches(e, n.reached) || (n.reached.also ?? []).some((m) => matches(e, n.reached, m)),
    );
    // `also` marks are the same moment; count only the primary mark for an nth.
    const primary = hits.filter((e) => matches(e, n.reached));
    const pick =
      n.reached.nth === 'last'
        ? (primary.at(-1) ?? hits.at(-1))
        : (primary[(n.reached.nth ?? 1) - 1] ?? (n.reached.nth ? undefined : hits[0]));
    if (pick) out.set(n.id, pick.t);
  }
  return out;
}
const STATION_NODE: Record<string, NodeId> = { F: 'forge' };
/** Which node an event belongs to: a station-tagged mark by its station, else the time window it falls in. */
function nodeOf(e: Ev, windows: { id: NodeId; from: number; to: number }[]): NodeId | undefined {
  const station = str(e.station);
  if (station && str(e.material) === 'beam') return 'beam';
  if (station) return STATION_NODE[station] ?? (NODES.some((n) => n.id === station) ? (station as NodeId) : undefined);
  return windows.find((w) => e.t > w.from && e.t <= w.to)?.id;
}
export type HumanRow = {
  id: NodeId;
  at?: number;
  carries: number;
  walked: number;
  shown: number;
  pressed: number;
  refused: number;
  noReach: number;
  idle: number;
  confusion: number;
  rank?: number;
  /** The node this session reached just before this one, when both are in the session (not a window from the
   * session's start, nor the open tail), and the window's length in seconds. */
  after?: NodeId;
  seconds: number;
};
/** Per-node tallies for one session. Windows run from one reached node to the next; the tail goes to the first node
 * the session never reached. Confusion: presses with nothing in reach and refusals count 2, a prompt shown and not
 * pressed 0.5, and each 10 s idle 1 (a default; docs/agent-calls.md). */
export function humanRows(s: Session): HumanRow[] {
  const at = reachedTimes(s);
  const reached = NODES.filter((n) => at.has(n.id)).sort((a, b) => at.get(a.id)! - at.get(b.id)!);
  const windows = reached.map((n, i) => ({
    id: n.id,
    from: i ? at.get(reached[i - 1]!.id)! : -1,
    to: at.get(n.id)!,
    after: i ? reached[i - 1]!.id : undefined,
  }));
  const next = NODES.find((n) => !at.has(n.id) && !n.optional);
  if (next)
    windows.push({
      id: next.id,
      from: reached.length ? at.get(reached.at(-1)!.id)! : -1,
      to: Infinity,
      after: undefined,
    });
  const rows = new Map<NodeId, HumanRow>(
    NODES.map((n) => {
      const w = windows.find((x) => x.id === n.id);
      return [
        n.id,
        {
          id: n.id,
          at: at.get(n.id),
          carries: 0,
          walked: 0,
          shown: 0,
          pressed: 0,
          refused: 0,
          noReach: 0,
          idle: 0,
          confusion: 0,
          ...(w?.after && Number.isFinite(w.to) ? { after: w.after } : {}),
          seconds: w && w.from >= 0 && Number.isFinite(w.to) ? w.to - w.from : 0,
        },
      ];
    }),
  );
  const row = (e: Ev) => {
    const id = nodeOf(e, windows);
    return id ? rows.get(id) : undefined;
  };
  // A carry: a run of your own unloads at one station, under 3 s apart.
  let last: Ev | null = null;
  for (const e of marks(s)) {
    const n = str(e.n);
    if (/^(deposit|kiln filled|cradle rails|footing set)$/.test(n) && e.mine !== false) {
      const same = last && last.t > e.t - 3 && str(last.n) === n && str(last.station) === str(e.station);
      if (!same) {
        const r = row(e);
        if (r) r.carries++;
      }
      last = e;
    }
    if (/refused$/.test(n)) {
      const r = row(e);
      if (r) r.refused++;
    }
  }
  const samples = s.events.filter((e) => e.k === 'p');
  for (let i = 1; i < samples.length; i++) {
    const d = Math.hypot(num(samples[i]!.x) - num(samples[i - 1]!.x), num(samples[i]!.z) - num(samples[i - 1]!.z));
    const r = row(samples[i]!);
    if (r && d < 40) r.walked += d;
  }
  for (const e of s.events) {
    if (e.k === 'prompt') {
      const r = row(e);
      if (r) r.shown++;
    } else if (e.k === 'press') {
      const r = row(e);
      if (!r) continue;
      if (e.verb === 'nothing in reach') r.noReach++;
      else if (e.ran) r.pressed++;
      else r.refused++;
    } else if (e.k === 'idle') {
      const r = row(e);
      if (r) r.idle += num(e.s);
    }
  }
  for (const r of rows.values())
    r.confusion = r.noReach * 2 + r.refused * 2 + Math.max(0, r.shown - r.pressed) * 0.5 + r.idle / 10;
  const ranked = [...rows.values()].filter((r) => r.confusion > 0).sort((a, b) => b.confusion - a.confusion);
  ranked.forEach((r, i) => (r.rank = i + 1));
  return NODES.map((n) => rows.get(n.id)!);
}
export const playersIn = (s: Session) =>
  1 +
  Math.max(
    0,
    ...s.events.filter((e) => e.k === 'peers').map((e) => (str(e.names) ? str(e.names).split(',').length : 0)),
  );
/** Why a session is not the production rail loop (so it can't calibrate or rank anything), or null if it is: a bot,
 * a prototype room, an older world's mark names, or no node of the graph reached at all. */
export function notTheLoop(s: Session): string | null {
  if (s.meta.bot === true) return 'a bot';
  if (str(s.meta.room).startsWith('proto')) return 'a prototype room';
  const names = new Set(s.events.filter((e) => e.k === 'm').map((e) => str(e.n)));
  if (names.has('stretch laid') || names.has('ability gained') || names.has('train unlocked')) return 'an older world';
  if (!reachedTimes(s).size) return 'no loop node reached';
  return null;
}
const predictions = new Map<number, Map<NodeId, number>>();
/** The prediction's straight-line metres each player walks per node (`loop -- run`, canonical), by player count. */
export function predictedWalk(players: number) {
  let m = predictions.get(players);
  if (!m) {
    const run = playOrder(proposeOrders()[0]!.order, 'canonical', players);
    m = new Map(run.nodes.map((t) => [t.id, t.walked / players]));
    predictions.set(players, m);
  }
  return m;
}
/** Walking that counts toward a detour factor: the prediction walks at least this far for the segment. */
export const MIN_PREDICTED_M = 20;
/** Straight-line metres the prediction walks per player for the segment a row's window covers: the canonical nodes
 * after `row.after` up to the row's node, inclusive (an optional node the session skipped sits inside it). Undefined
 * when the window doesn't match a canonical segment: no node before it, `after` comes later in the canonical order,
 * a node between them was reached first, or the window is under 5 s (two marks at once). */
export function predictedSegment(row: HumanRow, rows: readonly HumanRow[], pred: ReadonlyMap<NodeId, number>) {
  if (!row.after || row.seconds < 5) return undefined;
  const order = proposeOrders()[0]!.order;
  const from = order.indexOf(row.after),
    to = order.indexOf(row.id);
  if (from < 0 || from >= to) return undefined;
  // Between the two: an optional node the session never reached was skipped inside the window (its walk is in the
  // prediction's path); any other was done at another time, so its walk isn't in this window.
  const reached = new Set(rows.filter((r) => r.at !== undefined).map((r) => r.id));
  const inside = order.slice(from + 1, to).filter((id) => node(id).optional && !reached.has(id));
  return [...inside, row.id].reduce((m, id) => m + (pred.get(id) ?? 0), 0);
}

/** Walked over predicted for a row's segment (the wayfinding signal; a detour factor in calibrate.ts), or undefined. */
export function wayfinding(row: HumanRow, rows: readonly HumanRow[], pred: ReadonlyMap<NodeId, number>) {
  const p = predictedSegment(row, rows, pred);
  return p !== undefined && p >= MIN_PREDICTED_M ? row.walked / p : undefined;
}

/** Every session file under the .look/playtest folders (this checkout's and the main checkout's), one per id. */
export function localSessions() {
  const byName = new Map<string, string>();
  for (const dir of lookDirs()) {
    const d = path.join(dir, 'playtest');
    if (!fs.existsSync(d)) continue;
    for (const f of fs.readdirSync(d)) if (f.endsWith('.jsonl') && !byName.has(f)) byName.set(f, path.join(d, f));
  }
  return [...byName.keys()].sort().map((f) => byName.get(f)!);
}

/** The session files to trace: each id local if it is, else downloaded through the playtest path (dev/playtest/
 * fetch.ts); `since` adds every person's session the server lists from that UTC date (local ones only offline). */
async function gather(wants: string[], since: string | undefined, offline: boolean) {
  const files: string[] = [];
  let server: ReturnType<typeof playdata> | null = null;
  let list: PlaySession[] | null = null;
  const online = async () => {
    server ??= playdata();
    list ??= await server.list();
    return { server, list };
  };
  const where = () =>
    lookDirs()
      .map((d) => path.join(d, 'playtest'))
      .join(' or ');
  for (const want of wants) {
    const local = findSession(want);
    if (local) files.push(local);
    else if (offline) throw new Error(`no session "${want}" under ${where()} (--offline: not fetched)`);
    else {
      const { server: s, list: l } = await online();
      const row = resolveSession(l, want);
      await s.download(row.id);
      files.push(path.join(OUT, `${row.id}.jsonl`));
    }
  }
  if (since) {
    const from = Date.parse(since);
    if (!Number.isFinite(from)) throw new Error(`--since: a date like 2026-11-09, not "${since}"`);
    if (offline) {
      for (const f of localSessions()) if (read(f).start >= from && !files.includes(f)) files.push(f);
    } else {
      const { server: s, list: l } = await online();
      for (const row of l.filter((r) => Date.parse(r.first) >= from && !r.meta?.bot).reverse()) {
        const local = findSession(row.id);
        if (!local) await s.download(row.id);
        const f = local ?? path.join(OUT, `${row.id}.jsonl`);
        if (!files.includes(f)) files.push(f);
      }
    }
  }
  return files;
}

export async function trace(args: string[]) {
  const value = (flag: string) => {
    const i = args.indexOf(flag);
    return i >= 0 ? args[i + 1] : undefined;
  };
  const positional = args.filter((a, i) => !a.startsWith('--') && !args[i - 1]?.startsWith('--'));
  const wants = positional.slice(1);
  const since = value('--since');
  if (!wants.length && !since)
    throw new Error('npm run loop -- trace <session id prefix | path to a .jsonl> [more...] [--since YYYY-MM-DD]');
  const files = await gather(wants, since, args.includes('--offline'));
  if (!files.length) throw new Error(`no sessions since ${since}`);
  if (files.length > 1 || since) return aggregate(files, args.includes('--json'));
  single(files[0]!, args, value);
}

/** One ranked table for many sessions: confusion and wayfinding per node, with n per node. */
function aggregate(files: string[], json: boolean) {
  const excluded: Record<string, number> = {};
  type Agg = {
    id: NodeId;
    n: number;
    reached: number;
    confusion: number;
    noReach: number;
    refused: number;
    ignored: number;
    idle: number;
    ways: number[];
    rank?: number;
  };
  const agg = new Map<NodeId, Agg>(
    NODES.map((n) => [
      n.id,
      { id: n.id, n: 0, reached: 0, confusion: 0, noReach: 0, refused: 0, ignored: 0, idle: 0, ways: [] },
    ]),
  );
  const used: string[] = [];
  for (const f of files) {
    const s = read(f);
    const why = notTheLoop(s);
    if (why) {
      excluded[why] = (excluded[why] ?? 0) + 1;
      continue;
    }
    used.push(s.id);
    const rows = humanRows(s);
    const pred = predictedWalk(playersIn(s));
    for (const r of rows) {
      const touched = r.at !== undefined || r.confusion > 0 || r.walked > 0 || r.carries > 0;
      if (!touched) continue;
      const a = agg.get(r.id)!;
      a.n++;
      if (r.at !== undefined) a.reached++;
      a.confusion += r.confusion;
      a.noReach += r.noReach;
      a.refused += r.refused;
      a.ignored += Math.max(0, r.shown - r.pressed);
      a.idle += r.idle;
      const w = wayfinding(r, rows, pred);
      if (w !== undefined) a.ways.push(w);
    }
  }
  const ranked = [...agg.values()].filter((a) => a.confusion > 0).sort((a, b) => b.confusion - a.confusion);
  ranked.forEach((a, i) => (a.rank = i + 1));
  const med = (v: number[]) => {
    const s = [...v].sort((a, b) => a - b);
    return s.length % 2 ? s[s.length >> 1]! : (s[s.length / 2 - 1]! + s[s.length / 2]!) / 2;
  };
  if (json) return console.log(JSON.stringify({ sessions: used, excluded, nodes: [...agg.values()] }, null, 2));
  const skipped =
    Object.entries(excluded)
      .map(([why, k]) => `${k} ${why}`)
      .join(', ') || 'none';
  const out = [
    `Loop trace of ${used.length} production loop session(s) of ${files.length}; left out: ${skipped}. Untrusted: session data.`,
    'n: sessions with activity at the node (its window, or its marks); confusion is summed over them, ranked; walked/pred',
    'is the median wayfinding ratio over the sessions whose window is a canonical segment (count in brackets).',
    '',
    'node        n  reached  confusion (rank)  mean   no-reach  refused  prompts ignored  idle s  walked/pred',
  ];
  for (const a of agg.values()) {
    if (!a.n) continue;
    out.push(
      `${a.id.padEnd(9)} ${String(a.n).padStart(3)} ${String(a.reached).padStart(8)} ${(a.confusion ? `${a.confusion.toFixed(1)} (${a.rank})` : '-').padStart(17)} ${(a.confusion / a.n).toFixed(1).padStart(6)} ${String(a.noReach).padStart(10)} ${String(a.refused).padStart(8)} ${String(a.ignored).padStart(16)} ${String(Math.round(a.idle)).padStart(7)}  ${a.ways.length ? `x${med(a.ways).toFixed(2)} (${a.ways.length})` : '-'}`,
    );
  }
  out.push(
    '',
    `Most confused (a finding): ${
      ranked
        .slice(0, 5)
        .map((a) => `${a.id} ${a.confusion.toFixed(1)} over ${a.n}`)
        .join(', ') || 'none'
    }`,
  );
  const lost = [...agg.values()]
    .filter((a) => a.ways.length)
    .sort((a, b) => med(b.ways) - med(a.ways))
    .slice(0, 5);
  out.push(
    `Most walking over the prediction (wayfinding): ${lost.map((a) => `${a.id} x${med(a.ways).toFixed(2)} (${a.ways.length})`).join(', ') || 'none'}`,
  );
  out.push(`Sessions: ${used.join(', ')}`);
  console.log(out.join('\n'));
}

function single(file: string, args: string[], value: (flag: string) => string | undefined) {
  const human = read(file);
  const botFile = findBot(value('--bot'));
  const bot = botFile ? read(botFile) : null;
  const players = Number(value('--players') ?? playersIn(human));
  const prediction = playOrder(proposeOrders()[0]!.order, 'canonical', players);
  const predicted = new Map(prediction.nodes.filter((t) => t.tick >= 0).map((t) => [t.id, t.tick / 10]));
  const wakeOf = (m: Map<NodeId, number>) => m.get('wake') ?? 0;
  const hAt = reachedTimes(human),
    bAt = bot ? reachedTimes(bot) : new Map<NodeId, number>();
  const rows = humanRows(human);
  const perPlayer = new Map(prediction.nodes.map((t) => [t.id, t.walked / players]));
  // Every column is time since that run's own wake, so arrival and loading don't count.
  const since = (m: Map<NodeId, number>, id: NodeId) => (m.has(id) ? m.get(id)! - wakeOf(m) : undefined);
  const table = NODES.map((n: LoopNode, k) => {
    const p = since(predicted, n.id),
      b = since(bAt, n.id),
      h = since(hAt, n.id);
    return {
      predicted: p,
      bot: b,
      human: h,
      delta: h !== undefined && p !== undefined ? h - p : undefined,
      wayfinding: wayfinding(rows[k]!, rows, perPlayer),
      ...rows[k]!,
    };
  });
  if (args.includes('--json'))
    return console.log(JSON.stringify({ human: file, bot: botFile, players, table }, null, 2));
  const t = (v: number | undefined) => (v === undefined ? '-' : clock(v));
  const d = (v: number | undefined) => (v === undefined ? '-' : `${v < 0 ? '-' : '+'}${clock(Math.abs(v))}`);
  const out = [
    `Loop trace. Human: ${file} (${players} player${players > 1 ? 's' : ''}). Bot: ${botFile ?? 'no bot run found (.look/playthrough/<name>/session.jsonl)'}.`,
    "Times are since each run's own wake. Predicted is `npm run loop -- run` (a lower bound). Human columns count the",
    'time from the node before it to this one; the tail goes to the first node never reached. Untrusted: session data.',
    'Walked/pred (wayfinding, apart from confusion): metres walked over the straight-line prediction per player for the',
    'same segment; "-" where the window is not a canonical segment or the prediction walks under 20 m.',
    '',
    'node      predicted     bot   human   human-pred  carries  walked m  walked/pred  prompts shown/presses  refused  no-reach  idle s  confusion (rank)',
  ];
  for (const r of table)
    out.push(
      `${r.id.padEnd(9)} ${t(r.predicted).padStart(9)} ${t(r.bot).padStart(7)} ${t(r.human).padStart(7)} ${d(r.delta).padStart(12)} ${String(r.carries).padStart(8)} ${String(Math.round(r.walked)).padStart(9)} ${(r.wayfinding === undefined ? '-' : `x${r.wayfinding.toFixed(2)}`).padStart(12)} ${`${r.shown}/${r.pressed}`.padStart(22)} ${String(r.refused).padStart(8)} ${String(r.noReach).padStart(9)} ${String(Math.round(r.idle)).padStart(7)}  ${r.confusion ? `${r.confusion.toFixed(1)} (${r.rank})` : '-'}`,
    );
  const top = [...table]
    .filter((r) => r.rank)
    .sort((a, b) => a.rank! - b.rank!)
    .slice(0, 5);
  out.push(
    '',
    `Most confused (a finding): ${top.map((r) => `${r.id} ${r.confusion.toFixed(1)}`).join(', ') || 'none'}`,
  );
  out.push(`For everything else in the session: npm run playtest.`);
  console.log(out.join('\n'));
}

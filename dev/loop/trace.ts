// `npm run loop -- trace <session|path> [--bot <name|path>] [--players N] [--json]`: one table keyed by loop-graph
// node comparing the prediction (`npm run loop -- run`), a bot run (.look/playthrough/<name>/session.jsonl) and a
// human session (the playtest upload format, read by dev/playtest/read.ts). Human marks map to nodes by each node's
// `reached` pattern; nothing new goes on the wire. Which beats rank as most confusing is a finding, not a target.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { parseSession, clock, num, str, type Ev, type Session } from '../playtest/read.ts';
import { NODES, proposeOrders, type LoopNode, type NodeId, type Reached } from './graph.ts';
import { playOrder } from './run.ts';

/** Where sessions live: this checkout's .look and the main checkout's (worktrees share it). */
function lookDirs() {
  const dirs = [path.resolve('.look')];
  try {
    const common = execFileSync('git', ['rev-parse', '--git-common-dir'], { encoding: 'utf8' }).trim();
    dirs.push(path.resolve(path.dirname(path.resolve(common)), '.look'));
  } catch {
    /* not a git checkout: this one only */
  }
  return [...new Set(dirs)];
}
function findSession(want: string): string | null {
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
const read = (file: string): Session => parseSession(path.basename(file, '.jsonl'), fs.readFileSync(file, 'utf8'));

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
};
/** Per-node tallies for one session. Windows run from one reached node to the next; the tail goes to the first node
 * the session never reached. Confusion: presses with nothing in reach and refusals count 2, a prompt shown and not
 * pressed 0.5, and each 10 s idle 1 (a default; docs/agent-calls.md). */
export function humanRows(s: Session): HumanRow[] {
  const at = reachedTimes(s);
  const reached = NODES.filter((n) => at.has(n.id)).sort((a, b) => at.get(a.id)! - at.get(b.id)!);
  const windows = reached.map((n, i) => ({ id: n.id, from: i ? at.get(reached[i - 1]!.id)! : -1, to: at.get(n.id)! }));
  const next = NODES.find((n) => !at.has(n.id) && !n.optional);
  if (next) windows.push({ id: next.id, from: reached.length ? at.get(reached.at(-1)!.id)! : -1, to: Infinity });
  const rows = new Map<NodeId, HumanRow>(
    NODES.map((n) => [
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
      },
    ]),
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
const playersIn = (s: Session) =>
  1 +
  Math.max(
    0,
    ...s.events.filter((e) => e.k === 'peers').map((e) => (str(e.names) ? str(e.names).split(',').length : 0)),
  );

export function trace(args: string[]) {
  const value = (flag: string) => {
    const i = args.indexOf(flag);
    return i >= 0 ? args[i + 1] : undefined;
  };
  const positional = args.filter((a, i) => !a.startsWith('--') && !args[i - 1]?.startsWith('--'));
  const want = positional[1];
  if (!want) throw new Error('npm run loop -- trace <session id prefix | path to a .jsonl>');
  const file = findSession(want);
  if (!file)
    throw new Error(
      `no session "${want}" under ${lookDirs()
        .map((d) => path.join(d, 'playtest'))
        .join(' or ')}`,
    );
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
    '',
    'node      predicted     bot   human   human-pred  carries  walked m  prompts shown/presses  refused  no-reach  idle s  confusion (rank)',
  ];
  for (const r of table)
    out.push(
      `${r.id.padEnd(9)} ${t(r.predicted).padStart(9)} ${t(r.bot).padStart(7)} ${t(r.human).padStart(7)} ${d(r.delta).padStart(12)} ${String(r.carries).padStart(8)} ${String(Math.round(r.walked)).padStart(9)} ${`${r.shown}/${r.pressed}`.padStart(22)} ${String(r.refused).padStart(8)} ${String(r.noReach).padStart(9)} ${String(Math.round(r.idle)).padStart(7)}  ${r.confusion ? `${r.confusion.toFixed(1)} (${r.rank})` : '-'}`,
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

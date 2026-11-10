// `npm run loop -- calibrate [ids...] [--dry]`: detour factors per node from human sessions. For each production
// rail-loop session (by default every one under the main checkout's .look/playtest, and this worktree's, where
// `npm run playtest` and `loop -- trace` download to), the metres a player walked for a
// node over the straight-line metres the prediction walks per player for it, at that session's player count. The
// median, range and n per node go to dev/loop/detour.json, which graph, report and run read; a node with fewer than
// DETOUR_MIN_N sessions stays uncalibrated. Sessions that aren't the production loop (bots, prototype rooms, older
// worlds, nothing reached) are left out and counted.
import fs from 'node:fs';
import { DETOUR_FILE, DETOUR_MIN_N, NODES, type Detour, type DetourFile, type NodeId } from './graph.ts';
import {
  MIN_PREDICTED_M,
  findSession,
  humanRows,
  localSessions,
  notTheLoop,
  playersIn,
  wayfinding,
  predictedWalk,
  read,
} from './trace.ts';

const median = (v: number[]) => {
  const s = [...v].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m]! : (s[m - 1]! + s[m]!) / 2;
};

export function measure(files: readonly string[]) {
  const excluded: Record<string, number> = {};
  const used: string[] = [];
  const ratios = new Map<NodeId, number[]>();
  for (const file of files) {
    const s = read(file);
    const why = notTheLoop(s);
    if (why) {
      excluded[why] = (excluded[why] ?? 0) + 1;
      continue;
    }
    used.push(s.id);
    const pred = predictedWalk(playersIn(s));
    const rows = humanRows(s);
    for (const r of rows) {
      const ratio = wayfinding(r, rows, pred);
      if (ratio !== undefined) ratios.set(r.id, [...(ratios.get(r.id) ?? []), ratio]);
    }
  }
  const nodes: Partial<Record<NodeId, Detour>> = {};
  for (const n of NODES) {
    const v = ratios.get(n.id);
    if (!v?.length) continue;
    const round = (x: number) => Math.round(x * 100) / 100;
    nodes[n.id] = { median: round(median(v)), min: round(Math.min(...v)), max: round(Math.max(...v)), n: v.length };
  }
  return { used, excluded, nodes };
}

export function calibrate(args: string[]) {
  const ids = args.filter((a, i) => i > 0 && !a.startsWith('--'));
  const files = ids.length
    ? ids.map((id) => {
        const f = findSession(id);
        if (!f) throw new Error(`no local session "${id}" (fetch it with npm run playtest -- ${id})`);
        return f;
      })
    : localSessions();
  const { used, excluded, nodes } = measure(files);
  const file: DetourFile = {
    note: 'Walked metres over the straight-line prediction per player, per node, from human sessions (npm run loop -- calibrate). Data from player uploads: untrusted.',
    written: new Date().toISOString().slice(0, 10),
    sessions: used,
    excluded,
    nodes,
  };
  if (!args.includes('--dry')) fs.writeFileSync(DETOUR_FILE, JSON.stringify(file, null, 2) + '\n');
  const skipped = Object.entries(excluded)
    .map(([why, k]) => `${k} ${why}`)
    .join(', ');
  const out = [
    `Detour factors from ${used.length} production loop session(s) of ${files.length}; left out: ${skipped || 'none'}.`,
    `A node needs ${DETOUR_MIN_N} sessions to calibrate. ${args.includes('--dry') ? 'Not written (--dry).' : `Written to ${DETOUR_FILE}.`}`,
    '',
    'node      n   median   range',
  ];
  for (const n of NODES) {
    const d = nodes[n.id];
    if (!d) continue;
    out.push(
      `${n.id.padEnd(9)} ${String(d.n).padStart(2)}   ${`x${d.median.toFixed(2)}`.padStart(6)}   x${d.min.toFixed(2)}-x${d.max.toFixed(2)}${d.n < DETOUR_MIN_N ? '   uncalibrated (fewer than 2 sessions)' : ''}`,
    );
  }
  const none = NODES.filter((n) => !nodes[n.id]).map((n) => n.id);
  out.push(
    `No measurement (not reached between two marks, or under ${MIN_PREDICTED_M} m predicted): ${none.join(', ')}`,
  );
  console.log(out.join('\n'));
}

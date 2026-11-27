// Whole-route comparison against the campaign outline's area allowances.
import { defaultSettings } from '../economy/ring-sim.ts';
import type { NodeId } from './graph.ts';

type Played = { nodes: readonly { id: NodeId; tick: number }[] };
const AREAS: readonly { area: number; label: string; ends: NodeId; allowanceMin: number }[] = [
  { area: 1, label: 'Home', ends: 'pier', allowanceMin: 36 },
  { area: 2, label: 'Split-rock Works', ends: 'crossing', allowanceMin: 36 },
  { area: 3, label: 'Ring Island, builds 1 and 2', ends: 'install', allowanceMin: 36 },
  { area: 4, label: 'High Gorge', ends: 'pick', allowanceMin: 72 },
  { area: 5, label: 'Bell Rock and the bay shortcut', ends: 'bay-2', allowanceMin: 30 },
  { area: 6, label: 'Canopy Town', ends: 'cloth', allowanceMin: 42 },
  { area: 7, label: 'Sea cave, Saltpan, Port Quay', ends: 'cave-3', allowanceMin: 48 },
  { area: 8, label: 'The White Wall line', ends: 'wall-6', allowanceMin: 48 },
  { area: 9, label: 'Lantern Notch, the causeway, the Original Island', ends: 'arrive', allowanceMin: 18 },
];

function wholeRoute(runs: readonly Played[]) {
  const reached = (run: Played, id: NodeId) => run.nodes.find((x) => x.id === id)!.tick / 10;
  const durations = runs.map((run) => {
    const finishes = AREAS.map(({ area, ends }) => ({ area, at: reached(run, ends) })).sort((a, b) => a.at - b.at);
    return new Map(finishes.map(({ area, at }, i) => [area, at - (finishes[i - 1]?.at ?? 0)]));
  });
  const rows = AREAS.map((a) => ({
    area: a.area,
    label: a.label,
    standIn: false,
    allowanceMin: a.allowanceMin,
    seconds: durations.map((duration) => duration.get(a.area)!),
  }));
  return { rows, total: runs.map((run) => reached(run, 'arrive')), nodes: [] };
}

const TARGET_MIN = Number(defaultSettings().targetHours) * 60;
const hm = (seconds: number) => {
  const m = Math.round(seconds / 60);
  return `${Math.floor(m / 60)}:${String(m % 60).padStart(2, '0')}`;
};
const min = (seconds: number) => String(Math.round(seconds / 60));

/** The table after the built node timings. Calibrated runs use walking detours from human sessions. */
export function wholeRouteLines(players: readonly number[], runs: readonly Played[], calibrated: readonly Played[]) {
  const data = wholeRoute(runs);
  const cols = (seconds: readonly number[], f = min) => seconds.map((x) => f(x).padStart(7)).join('');
  const line = (label: string, seconds: readonly number[], f = min) => `     ${label.padEnd(51)} ${cols(seconds, f)}`;
  const lines = [
    '',
    `Whole route to the ending, played through the host rules. Minutes; target ${TARGET_MIN}.`,
    `  #  ${'area'.padEnd(51)} ${players.map((n) => `${n}p`.padStart(7)).join('')}  allowance`,
  ];
  for (const row of data.rows)
    lines.push(`  ${row.area}  ${row.label.padEnd(51)} ${cols(row.seconds)} ${String(row.allowanceMin).padStart(10)}`);
  const allowance = data.rows.reduce((a, r) => a + r.allowanceMin, 0);
  lines.push(
    `${line('total, minutes', data.total)} ${String(allowance).padStart(10)}`,
    line('total, h:mm', data.total, hm),
    line(`share of the ${TARGET_MIN}-minute target`, data.total, (t) => `${Math.round((t / 60 / TARGET_MIN) * 100)}%`),
  );
  if (calibrated.length === runs.length)
    lines.push(line('total with human walking detours, h:mm', wholeRoute(calibrated).total, hm));
  return { lines, data };
}
